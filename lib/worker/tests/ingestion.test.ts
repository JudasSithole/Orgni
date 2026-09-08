import { describe, expect, it, vi } from "vitest";
import type { PrincipalRule } from "@workspace/contracts";

import {
  checksumOf,
  createMemorySeenStore,
  ingestBatch,
  ingestDocument,
  isRecoverable,
  isSupportedMimeType,
  type DocumentIntelligence,
  type IngestionInput,
} from "../src/ingestion/pipeline.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

function envelopeFor(sourceId: string, tenantId: string): NormalizedEnvelope {
  return {
    source_id: sourceId,
    source_type: "UPLOAD",
    document_type: "UNKNOWN",
    content: { text: "x", language: "en" },
    extracted_fields: {},
    tables: [],
    metadata: {
      filename: "f.txt",
      mime_type: "text/plain",
      checksum: "c",
      tenant_id: tenantId,
    },
    evidence_locations: [],
    confidence: 0,
    warnings: [],
    schema_version: "0.1.0",
  };
}

const ok: DocumentIntelligence = async (record) =>
  envelopeFor(record.sourceId, record.tenantId);

function input(overrides: Partial<IngestionInput> = {}): IngestionInput {
  return {
    filename: "invoice.txt",
    mimeType: "text/plain",
    content: "TAX INVOICE",
    tenantId: "tenant_olyxee",
    ...overrides,
  };
}

describe("ingestion — validation", () => {
  it("accepts the supported types and rejects others", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true);
    expect(isSupportedMimeType("image/png")).toBe(true);
    expect(isSupportedMimeType("image/jpeg")).toBe(true);
    expect(isSupportedMimeType("text/plain")).toBe(true);
    expect(isSupportedMimeType("text/csv")).toBe(true);
    expect(isSupportedMimeType("application/json")).toBe(true);
    expect(
      isSupportedMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(
      isSupportedMimeType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
    expect(isSupportedMimeType("application/zip")).toBe(false);
  });

  it("reuses a source id when retrying a failed document", async () => {
    const record = await ingestDocument(input({ sourceId: "src_retry" }), ok);

    expect(record.sourceId).toBe("src_retry");
    expect(record.state).toBe("COMPLETED");
  });

  it("fails an unsupported type without calling document intelligence", async () => {
    const di = vi.fn(ok);
    const record = await ingestDocument(
      input({ mimeType: "application/zip" }),
      di,
    );

    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("unsupported_mime_type");
    expect(di).not.toHaveBeenCalled();
  });

  it("fails an empty document", async () => {
    const record = await ingestDocument(input({ content: "" }), ok);
    expect(record.state).toBe("FAILED");
    expect(record.errors).toContain("empty_document");
  });

  it("enforces the configured size limit", async () => {
    const record = await ingestDocument(
      input({ content: "x".repeat(500) }),
      ok,
      {
        limits: { maxBytes: 100 },
      },
    );
    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("document_too_large");
  });
});

describe("ingestion — identity and checksums", () => {
  it("computes a stable sha256 checksum", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.checksum).toBe(checksumOf("TAX INVOICE"));
    expect(record.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates a unique source_id per submission", async () => {
    const a = await ingestDocument(input(), ok);
    const b = await ingestDocument(input(), ok);
    expect(a.sourceId).not.toBe(b.sourceId);
    expect(a.sourceId).toMatch(/^src_/);
  });

  it("records filename, mime type, size, upload time and source type", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.filename).toBe("invoice.txt");
    expect(record.mimeType).toBe("text/plain");
    expect(record.byteSize).toBe(11);
    expect(record.sourceType).toBe("UPLOAD");
    expect(Date.parse(record.uploadedAt)).not.toBeNaN();
  });
});

describe("ingestion — duplicate handling", () => {
  it("flags a repeat checksum as a duplicate and skips reprocessing", async () => {
    const seen = createMemorySeenStore();
    const di = vi.fn(ok);

    const first = await ingestDocument(input(), di, { seen });
    const second = await ingestDocument(input(), di, { seen });

    expect(first.duplicateOf).toBeUndefined();
    expect(second.duplicateOf).toBe(first.sourceId);
    expect(second.warnings.join()).toContain("duplicate_of");
    expect(di).toHaveBeenCalledTimes(1);
  });

  it("treats different content as distinct documents", async () => {
    const seen = createMemorySeenStore();
    const first = await ingestDocument(input(), ok, { seen });
    const second = await ingestDocument(input({ content: "OTHER" }), ok, {
      seen,
    });
    expect(second.duplicateOf).toBeUndefined();
    expect(second.checksum).not.toBe(first.checksum);
  });
});

describe("ingestion — state machine", () => {
  it("reaches COMPLETED on success", async () => {
    const record = await ingestDocument(input(), ok);
    expect(record.state).toBe("COMPLETED");
    expect(record.envelope).toBeDefined();
  });

  it("reaches FAILED when document intelligence keeps failing", async () => {
    const record = await ingestDocument(
      input(),
      async () => {
        throw new Error("boom");
      },
      { limits: { maxAttempts: 1 } },
    );
    expect(record.state).toBe("FAILED");
    expect(record.errors[0]).toContain("document_intelligence_failed");
  });
});

describe("ingestion — retries", () => {
  it("classifies transient transport errors as recoverable", () => {
    expect(isRecoverable(new Error("ECONNREFUSED"))).toBe(true);
    expect(isRecoverable(new Error("service returned 503"))).toBe(true);
    expect(isRecoverable(new Error("request timeout"))).toBe(true);
    expect(isRecoverable(new Error("unsupported file"))).toBe(false);
  });

  it("retries a recoverable failure up to the bound and then succeeds", async () => {
    let calls = 0;
    const flaky: DocumentIntelligence = async (record) => {
      calls += 1;
      if (calls < 3) throw new Error("ECONNRESET");
      return envelopeFor(record.sourceId, record.tenantId);
    };

    const record = await ingestDocument(input(), flaky, {
      limits: { maxAttempts: 3, retryBaseMs: 1 },
    });

    expect(record.state).toBe("COMPLETED");
    expect(record.attempts).toBe(3);
  });

  it("does not retry a non-recoverable failure", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new Error("malformed document");
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(1);
  });

  it("stops after maxAttempts for a persistently recoverable failure", async () => {
    let calls = 0;
    const record = await ingestDocument(
      input(),
      async () => {
        calls += 1;
        throw new Error("ETIMEDOUT");
      },
      { limits: { maxAttempts: 3, retryBaseMs: 1 } },
    );

    expect(record.state).toBe("FAILED");
    expect(calls).toBe(3);
  });
});

describe("ingestion — failure isolation", () => {
  it("keeps processing the batch when one document fails", async () => {
    const di: DocumentIntelligence = async (record) => {
      if (record.filename === "bad.txt") throw new Error("malformed document");
      return envelopeFor(record.sourceId, record.tenantId);
    };

    const records = await ingestBatch(
      [
        input({ filename: "a.txt", content: "A" }),
        input({ filename: "bad.txt", content: "B" }),
        input({ filename: "c.txt", content: "C" }),
      ],
      di,
      { limits: { maxAttempts: 1 } },
    );

    expect(records).toHaveLength(3);
    expect(records.map((r) => r.state)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPLETED",
    ]);
  });

  it("keeps processing when one document is an unsupported type", async () => {
    const records = await ingestBatch(
      [
        input({ content: "A" }),
        input({ content: "B", mimeType: "application/zip" }),
        input({ content: "C" }),
      ],
      ok,
    );
    expect(records.map((r) => r.state)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPLETED",
    ]);
  });
});

describe("ingestion — security and access metadata", () => {
  it("propagates tenant id and source ACL onto the record", async () => {
    const acl: PrincipalRule[] = [
      {
        principalId: "group_finance",
        principalType: "GROUP",
        effect: "ALLOW",
        actions: ["READ"],
      },
    ];

    const record = await ingestDocument(
      input({ tenantId: "tenant_acme", sourceAcl: acl }),
      ok,
    );

    expect(record.tenantId).toBe("tenant_acme");
    expect(record.sourceAcl).toEqual(acl);
  });

  it("passes the tenant through to document intelligence", async () => {
    const seenTenants: string[] = [];
    await ingestDocument(input({ tenantId: "tenant_xyz" }), async (record) => {
      seenTenants.push(record.tenantId);
      return envelopeFor(record.sourceId, record.tenantId);
    });
    expect(seenTenants).toEqual(["tenant_xyz"]);
  });

  it("never writes document content into the logs", async () => {
    const entries: Record<string, unknown>[] = [];
    const logger = {
      info: (payload: Record<string, unknown>) => entries.push(payload),
      warn: (payload: Record<string, unknown>) => entries.push(payload),
      error: (payload: Record<string, unknown>) => entries.push(payload),
    };

    const secret = "TAX INVOICE for Clover Retail Group totalling 13225.00";
    await ingestDocument(input({ content: secret }), ok, { logger });

    const serialised = JSON.stringify(entries);
    expect(serialised).not.toContain("Clover Retail Group");
    expect(serialised).not.toContain("13225.00");
    // Identifiers are still present for traceability.
    expect(serialised).toContain("sourceId");
  });
});
