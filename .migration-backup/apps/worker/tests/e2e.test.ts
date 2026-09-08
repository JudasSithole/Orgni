/**
 * End-to-end Phase 1 tests.
 *
 * Every case runs the genuine chain:
 *   fixture → ingestion → real Document Intelligence (Python) → normalized
 *   envelope v0.1.0 → validation → real tokenizeDocument → OrganizationalToken[]
 *
 * Nothing in this file is mocked. If Python is unavailable the suite fails
 * loudly rather than silently skipping, because a green run that never
 * exercised the pipeline would be worse than a red one.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { OrganizationalToken } from "@workspace/contracts";

import { processDocument, toHandoff } from "../src/phase1/index.js";
import {
  documentIntelligenceAvailable,
  realDocumentIntelligence,
} from "./helpers/document-intelligence.js";
import {
  CONTRACT_SIGNED,
  CONTRACT_UNSIGNED,
  EMPTY,
  INVOICE,
  INVOICE_MISSING_FIELDS,
  LOW_CONFIDENCE,
  PROOF_OF_PAYMENT,
  UNREADABLE,
} from "./fixtures/documents.js";

const TENANT = "tenant_olyxee";

function run(filename: string, content: string, mimeType = "text/plain") {
  return processDocument(
    {
      filename,
      mimeType,
      content,
      tenantId: TENANT,
      sourceAcl: [
        {
          principalId: "group_finance",
          principalType: "GROUP",
          effect: "ALLOW",
          actions: ["READ"],
        },
      ],
    },
    realDocumentIntelligence,
    { limits: { maxAttempts: 1 } },
  );
}

beforeAll(() => {
  if (!documentIntelligenceAvailable) {
    throw new Error(
      "Python is required to run the end-to-end tests against the real " +
        "Document Intelligence service (intelligence/document-intelligence).",
    );
  }
});

describe("E2E — invoice", () => {
  it("produces evidence-backed tokens through the real tokenizer", async () => {
    const result = await run("invoice.txt", INVOICE);

    expect(result.state).toBe("COMPLETED");
    expect(result.documentType).toBe("INVOICE");
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.schemaVersion).toBe("0.1.0");
  });

  it("preserves tenant, provenance, confidence and epistemic status", async () => {
    const { tokens } = await run("invoice.txt", INVOICE);

    for (const token of tokens) {
      expect(token.tenantId).toBe(TENANT);
      expect(token.transactionTime).toBeTruthy();
      expect(token.confidence).toBeGreaterThan(0);
      expect(token.confidence).toBeLessThanOrEqual(1);
      expect(token.epistemicStatus).toBeTruthy();
      expect(token.sourceRefs.length).toBeGreaterThan(0);
      for (const ref of token.sourceRefs) {
        expect(ref.sourceSystem).toBeTruthy();
        expect(ref.sourceObjectId).toBeTruthy();
      }
    }
  });

  it("emits tokens covering the invoice issue, parties and amount", async () => {
    const { tokens } = await run("invoice.txt", INVOICE);
    const serialised = JSON.stringify(tokens);

    expect(
      tokens.some((t: OrganizationalToken) => t.tokenKind === "EVENT"),
    ).toBe(true);
    expect(serialised).toContain("Olyxee AI (Pty) Ltd");
    expect(serialised).toContain("13225");
  });

  it("does not assert a payment status the invoice never stated", async () => {
    const result = await run("invoice.txt", INVOICE);
    const serialised = JSON.stringify(result.tokens).toUpperCase();

    expect(result.warnings.join()).toContain("invoice_status_not_stated");
    expect(serialised).not.toContain("PAID");
    expect(serialised).not.toContain("SETTLED");
  });
});

describe("E2E — proof of payment", () => {
  it("produces payment tokens through the real tokenizer", async () => {
    const result = await run("pop.txt", PROOF_OF_PAYMENT);

    expect(result.state).toBe("COMPLETED");
    expect(result.documentType).toBe("PROOF_OF_PAYMENT");
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it("records payer, payee, amount and reference", async () => {
    const { tokens } = await run("pop.txt", PROOF_OF_PAYMENT);
    const serialised = JSON.stringify(tokens);

    expect(serialised).toContain("Clover Retail Group");
    expect(serialised).toContain("Olyxee AI (Pty) Ltd");
    expect(serialised).toContain("13225");
    expect(serialised).toContain("TXN-88213");
  });

  it("never claims the referenced invoice is settled", async () => {
    const result = await run("pop.txt", PROOF_OF_PAYMENT);

    expect(result.warnings.join()).toContain("settlement is not asserted");

    const settlementClaims = result.tokens.filter((token) => {
      const type = (token.eventType ?? "").toUpperCase();
      return type.includes("SETTLED") || type.includes("INVOICE_PAID");
    });
    expect(settlementClaims).toHaveLength(0);
  });

  it("preserves evidence references on payment tokens", async () => {
    const { tokens } = await run("pop.txt", PROOF_OF_PAYMENT);
    for (const token of tokens) {
      expect(token.sourceRefs.length).toBeGreaterThan(0);
    }
  });
});

describe("E2E — contract", () => {
  it("produces agreement tokens through the real tokenizer", async () => {
    const result = await run("contract.txt", CONTRACT_SIGNED);

    expect(result.state).toBe("COMPLETED");
    expect(result.documentType).toBe("CONTRACT");
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it("records parties, effective date and value", async () => {
    const { tokens } = await run("contract.txt", CONTRACT_SIGNED);
    const serialised = JSON.stringify(tokens);

    expect(serialised).toContain("Olyxee AI (Pty) Ltd");
    expect(serialised).toContain("2024-01-01");
    expect(serialised).toContain("250000");
  });

  it("does not mark an unsigned contract as executed", async () => {
    const result = await run("contract-draft.txt", CONTRACT_UNSIGNED);

    expect(result.warnings.join()).toContain("not evidenced as executed");

    const executionClaims = result.tokens.filter((token) => {
      const type = (token.eventType ?? "").toUpperCase();
      return type.includes("EXECUTED") || type.includes("SIGNED");
    });
    expect(executionClaims).toHaveLength(0);
  });
});

describe("E2E — controlled failure", () => {
  it("returns UNKNOWN with warnings for an unclassifiable document", async () => {
    const result = await run("noise.txt", UNREADABLE);

    expect(result.state).toBe("COMPLETED");
    expect(result.documentType).toBe("UNKNOWN");
    expect(result.tokens).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("fails an empty document without reaching document intelligence", async () => {
    const result = await run("empty.txt", EMPTY);

    expect(result.state).toBe("FAILED");
    expect(result.tokens).toHaveLength(0);
    expect(result.errors).toContain("empty_document");
  });

  it("fails an unsupported file type in a controlled way", async () => {
    const result = await run("archive.zip", "PKbinary", "application/zip");

    expect(result.state).toBe("FAILED");
    expect(result.errors.join()).toContain("unsupported_mime_type");
    expect(result.tokens).toHaveLength(0);
  });

  it("produces no tokens when required fields are missing", async () => {
    const result = await run("partial.txt", INVOICE_MISSING_FIELDS);

    expect(result.state).toBe("COMPLETED");
    expect(result.tokens).toHaveLength(0);
    expect(result.errors.join()).toMatch(/missing required field|UNKNOWN/);
  });

  it("flags a low-confidence extraction rather than trusting it", async () => {
    const result = await run("weak.txt", LOW_CONFIDENCE);

    expect(result.warnings.length).toBeGreaterThan(0);
    if (result.documentType === "UNKNOWN") {
      expect(result.tokens).toHaveLength(0);
    }
  });
});

describe("E2E — ontology handoff", () => {
  it("exposes exactly the documented handoff shape", async () => {
    const handoff = toHandoff(await run("invoice.txt", INVOICE));

    expect(Object.keys(handoff).sort()).toEqual([
      "schemaVersion",
      "sourceId",
      "tokens",
      "warnings",
    ]);
    expect(handoff.schemaVersion).toBe("0.1.0");
    expect(handoff.sourceId).toMatch(/^src_/);
    expect(Array.isArray(handoff.tokens)).toBe(true);
    expect(Array.isArray(handoff.warnings)).toBe(true);
  });

  it("carries the tenant on every handed-off token", async () => {
    const handoff = toHandoff(await run("contract.txt", CONTRACT_SIGNED));
    for (const token of handoff.tokens) {
      expect(token.tenantId).toBe(TENANT);
    }
  });
});
