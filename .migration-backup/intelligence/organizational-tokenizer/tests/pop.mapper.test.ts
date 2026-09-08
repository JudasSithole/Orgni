import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapProofOfPaymentToTokens } from "../src/mappings/proof_of_payment.mapper.js";
import type { ProofOfPaymentExtraction } from "../src/envelopes/proof_of_payment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

const clean = loadFixture<ProofOfPaymentExtraction>("pop.clean.json");

describe("mapProofOfPaymentToTokens — complete PoP with invoiceRef", () => {
  const tokens = mapProofOfPaymentToTokens(clean);

  it("emits 3 tokens when invoiceRef is present (payment, settlement, relation)", () => {
    expect(tokens).toHaveLength(3);
  });

  it("emits a payer→payee PAID relation", () => {
    const rel = tokens.find((t) => t.tokenKind === "RELATION");
    expect(rel).toBeDefined();
    expect(rel!.predicate).toBe("PAID");
    expect(rel!.subjectId).toBe(clean.payerName!.value);
    expect(rel!.objectId).toBe(clean.payeeName!.value);
  });

  it("PAYMENT_SETTLEMENT targets tracking states securely without blindly forcing a SETTLED status", () => {
    const t = tokens.find((t) => t.eventType === "PAYMENT_SETTLEMENT");
    expect(t!.tokenKind).toBe("STATE");
    expect((t!.scalarValue as Record<string, unknown>)["status"]).toBe("PENDING_VERIFICATION");
    expect((t!.scalarValue as Record<string, unknown>)["invoiceRef"]).toBe("INV-2026-0042");
    // A settlement derived from a mere invoice reference must be INFERRED, never
    // ASSERTED/OBSERVED — a payment reference must not assert a settled invoice.
    expect(t!.epistemicStatus).toBe("INFERRED");
    expect(t!.epistemicStatus).not.toBe("ASSERTED");
  });

  it("all tokens have valid sourceRefs with precise page or section locators", () => {
    tokens.forEach((t) => {
      expect(t.sourceRefs[0].sourceSystem).toBe("orgni.document-service");
      expect(t.sourceRefs[0].locator).toBeDefined();
    });
  });
});

describe("mapProofOfPaymentToTokens — PoP WITHOUT invoiceRef", () => {
  const tokens = mapProofOfPaymentToTokens({ ...clean, extractionId: "ext_pop_002", invoiceRef: undefined });

  it("emits 2 tokens when invoiceRef is absent (payment + relation, no settlement)", () => {
    expect(tokens).toHaveLength(2);
    expect(tokens.find((t) => t.eventType === "PAYMENT_SETTLEMENT")).toBeUndefined();
  });
});
