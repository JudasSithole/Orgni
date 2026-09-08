/**
 * Persistence integration tests — run against a REAL Postgres.
 *
 * Set DATABASE_URL to a Postgres the schema has been migrated to
 * (`pnpm --filter @workspace/db run migrate`). When it is unset the suite
 * fails loudly rather than passing vacuously, because a persistence layer that
 * was never exercised against a database proves nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../src/connect";
import { sources } from "../src/schema/documents";

const DATABASE_URL = process.env["DATABASE_URL"];

let handle: DbHandle;

const TENANT_A = "tenant_a";
const TENANT_B = "tenant_b";

function token(id: string, tenantId: string): Record<string, unknown> {
  return {
    tokenId: id,
    tenantId,
    tokenKind: "EVENT",
    eventType: "INVOICE_ISSUED",
    transactionTime: "2026-07-24T00:00:00Z",
    sourceRefs: [
      { evidenceId: "ev", sourceSystem: "test", sourceObjectId: "chk" },
    ],
    confidence: 0.9,
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["finance"],
    retentionClass: "financial",
  };
}

function source(sourceId: string, tenantId: string, checksum: string) {
  return {
    sourceId,
    tenantId,
    filename: "invoice.pdf",
    mimeType: "application/pdf",
    checksum,
    byteSize: 1234,
    state: "COMPLETED" as const,
    documentType: "INVOICE",
    confidence: 0.88,
    sourceAcl: [],
    warnings: [],
    errors: [],
    uploadedAt: new Date("2026-07-24T00:00:00Z"),
  };
}

beforeAll(() => {
  if (!DATABASE_URL) return;
  handle = createDb(DATABASE_URL);
});

afterAll(async () => {
  await handle?.close();
});

beforeEach(async () => {
  if (!handle) return;
  // Cascades to tokens/facts/reviews.
  await handle.db.delete(sources);
});

describe.skipIf(!DATABASE_URL)("repository — persistence", () => {
  it("persists a source with its tokens and facts, then retrieves them", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A), token("tok_2", TENANT_A)],
      facts: {
        schemaVersion: "0.1.0",
        result: { facts: [{ x: 1 }], schema_version: "0.1.0" },
      },
    });

    const doc = await handle.repository.getDocument(TENANT_A, "src_1");
    expect(doc).not.toBeNull();
    expect(doc!.source.documentType).toBe("INVOICE");
    expect(doc!.tokens).toHaveLength(2);
    expect(doc!.facts?.result).toMatchObject({ schema_version: "0.1.0" });
  });

  it("is idempotent by checksum (dedup lookup finds the prior source)", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_dup"),
      tokens: [token("tok_1", TENANT_A)],
      facts: null,
    });
    const found = await handle.repository.findSourceByChecksum(
      TENANT_A,
      "chk_dup",
    );
    expect(found?.sourceId).toBe("src_1");
    // A different tenant with the same checksum is a different, unseen document.
    const foundOther = await handle.repository.findSourceByChecksum(
      TENANT_B,
      "chk_dup",
    );
    expect(foundOther).toBeNull();
  });

  it("replaces tokens/facts on reprocess (no duplication)", async () => {
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A), token("tok_2", TENANT_A)],
      facts: null,
    });
    // Reprocess: same source, fewer tokens.
    await handle.repository.persistDocument({
      source: source("src_1", TENANT_A, "chk_1"),
      tokens: [token("tok_1", TENANT_A)],
      facts: { schemaVersion: "0.1.0", result: { schema_version: "0.1.0" } },
    });
    const doc = await handle.repository.getDocument(TENANT_A, "src_1");
    expect(doc!.tokens).toHaveLength(1);
    expect(doc!.facts).not.toBeNull();
  });
});

describe.skipIf(!DATABASE_URL)("repository — tenant isolation", () => {
  it("never returns another tenant's document", async () => {
    await handle.repository.persistDocument({
      source: source("src_secret", TENANT_A, "chk_a"),
      tokens: [token("tok_1", TENANT_A)],
      facts: null,
    });
    // Tenant B asks for tenant A's source id → nothing.
    const leaked = await handle.repository.getDocument(TENANT_B, "src_secret");
    expect(leaked).toBeNull();
    // And it is absent from tenant B's list.
    const list = await handle.repository.listSources(TENANT_B);
    expect(list.find((s) => s.sourceId === "src_secret")).toBeUndefined();
  });

  it("scopes listSources to the tenant", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    await handle.repository.persistDocument({
      source: source("src_b", TENANT_B, "chk_b"),
      tokens: [],
      facts: null,
    });
    const listA = await handle.repository.listSources(TENANT_A);
    expect(listA.map((s) => s.sourceId)).toEqual(["src_a"]);
  });

  it("rejects a review on a source the tenant does not own", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    await expect(
      handle.repository.addReview({
        tenantId: TENANT_B,
        sourceId: "src_a",
        fieldPath: "totalAmount",
        action: "REJECT",
        reviewer: "mallory",
      }),
    ).rejects.toThrow();
  });

  it("records a correction for the owning tenant", async () => {
    await handle.repository.persistDocument({
      source: source("src_a", TENANT_A, "chk_a"),
      tokens: [],
      facts: null,
    });
    const review = await handle.repository.addReview({
      tenantId: TENANT_A,
      sourceId: "src_a",
      fieldPath: "totalAmount",
      action: "CORRECT",
      correctedValue: 999,
      reviewer: "alice",
    });
    expect(review.action).toBe("CORRECT");
    const doc = await handle.repository.getDocument(TENANT_A, "src_a");
    expect(doc!.reviews).toHaveLength(1);
  });
});
