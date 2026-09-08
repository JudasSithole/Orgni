import { describe, expect, it } from "vitest";

import { validateEnvelope } from "../src/envelope/validate.js";
import { adaptEnvelope } from "../src/envelope/adapter.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

function baseEnvelope(
  overrides: Partial<NormalizedEnvelope> = {},
): NormalizedEnvelope {
  return {
    source_id: "src_1",
    source_type: "UPLOAD",
    document_type: "INVOICE",
    content: { text: "TAX INVOICE", language: "en" },
    extracted_fields: {},
    tables: [],
    metadata: {
      filename: "invoice.txt",
      mime_type: "text/plain",
      checksum: "abc123",
      tenant_id: "tenant_olyxee",
    },
    evidence_locations: [],
    confidence: 0.9,
    warnings: [],
    schema_version: "0.1.0",
    ...overrides,
  };
}

const f = (value: unknown, confidence = 0.9) => ({
  value,
  confidence,
  method: "RULE_MATCH" as const,
  page: 1,
});

describe("envelope schema validation", () => {
  it("accepts a well-formed envelope", () => {
    expect(validateEnvelope(baseEnvelope()).valid).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(validateEnvelope(null).valid).toBe(false);
    expect(validateEnvelope("envelope").valid).toBe(false);
  });

  it("rejects a wrong schema version", () => {
    const result = validateEnvelope(
      baseEnvelope({ schema_version: "0.2.0" as never }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain("schema_version");
  });

  it("rejects an unknown document type", () => {
    const result = validateEnvelope(
      baseEnvelope({ document_type: "RECEIPT" as never }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain("document_type");
  });

  it("requires every metadata field", () => {
    const result = validateEnvelope(
      baseEnvelope({
        metadata: {
          filename: "",
          mime_type: "text/plain",
          checksum: "abc",
          tenant_id: "t",
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain("metadata.filename");
  });

  it("requires tenant_id, which carries the access boundary", () => {
    const result = validateEnvelope(
      baseEnvelope({
        metadata: {
          filename: "f.txt",
          mime_type: "text/plain",
          checksum: "abc",
          tenant_id: "",
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain("metadata.tenant_id");
  });

  it("rejects a confidence outside 0..1", () => {
    expect(validateEnvelope(baseEnvelope({ confidence: 1.5 })).valid).toBe(
      false,
    );
    expect(validateEnvelope(baseEnvelope({ confidence: -0.1 })).valid).toBe(
      false,
    );
    expect(
      validateEnvelope(baseEnvelope({ confidence: Number.NaN })).valid,
    ).toBe(false);
  });

  it("routes an UNKNOWN document through generic evidence tokenization", () => {
    const result = validateEnvelope(baseEnvelope({ document_type: "UNKNOWN" }));
    expect(result.valid).toBe(true);
    expect(result.warnings.join()).toContain("generic evidence tokenization");
  });
});

describe("envelope → extraction adapter", () => {
  const invoiceFields = {
    invoiceNumber: f("INV-1"),
    invoiceDate: f("2024-03-15"),
    vendorName: f("Olyxee AI (Pty) Ltd"),
    buyerName: f("Clover Retail Group"),
    totalAmount: f(13225),
    currency: f("ZAR"),
  };

  it("builds an invoice extraction from complete fields", () => {
    const result = adaptEnvelope(
      baseEnvelope({ extracted_fields: invoiceFields }),
    );
    expect(result.ok).toBe(true);
    expect(result.extraction?.documentType).toBe("INVOICE");
  });

  it("refuses to fabricate a missing required amount", () => {
    const { totalAmount, ...withoutTotal } = invoiceFields;
    const result = adaptEnvelope(
      baseEnvelope({ extracted_fields: withoutTotal }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain("totalAmount");
    expect(result.extraction).toBeUndefined();
  });

  it("accepts an invoice without inventing a missing buyer", () => {
    const { buyerName, ...withoutBuyer } = invoiceFields;
    const result = adaptEnvelope(
      baseEnvelope({ extracted_fields: withoutBuyer }),
    );

    expect(result.ok).toBe(true);
    expect(
      (result.extraction as { buyerName?: unknown }).buyerName,
    ).toBeUndefined();
  });

  it("drops incomplete line items rather than guessing values", () => {
    const result = adaptEnvelope(
      baseEnvelope({
        extracted_fields: {
          ...invoiceFields,
          lineItems: [{ description: f("Consulting"), quantity: f(2) }],
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.warnings.join()).toContain("line item dropped");
  });

  it("refuses to tokenize an UNKNOWN document", () => {
    const result = adaptEnvelope(baseEnvelope({ document_type: "UNKNOWN" }));
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain("UNKNOWN");
  });

  it("warns that a referenced invoice on a payment is not a settlement", () => {
    const result = adaptEnvelope(
      baseEnvelope({
        document_type: "PROOF_OF_PAYMENT",
        extracted_fields: {
          paymentReference: f("TXN-1"),
          paymentDate: f("2024-04-02"),
          payerName: f("Clover Retail Group"),
          payeeName: f("Olyxee AI (Pty) Ltd"),
          amount: f(13225),
          currency: f("ZAR"),
          paymentMethod: f("EFT"),
          referencedInvoiceNumber: f("INV-1"),
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.warnings.join()).toContain("settlement is not asserted");
  });

  it("accepts observed payment facts without inventing missing parties", () => {
    const result = adaptEnvelope(
      baseEnvelope({
        document_type: "PROOF_OF_PAYMENT",
        extracted_fields: {
          paymentDate: f("2024-04-02"),
          amount: f(13225),
          currency: f("ZAR"),
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(
      (result.extraction as { payerName?: unknown }).payerName,
    ).toBeUndefined();
    expect(
      (result.extraction as { payeeName?: unknown }).payeeName,
    ).toBeUndefined();
  });

  it("does not assert execution for a contract without signature evidence", () => {
    const result = adaptEnvelope(
      baseEnvelope({
        document_type: "CONTRACT",
        extracted_fields: {
          contractTitle: f("SERVICE AGREEMENT"),
          effectiveDate: f("2024-01-01"),
          party1Name: f("Alpha Holdings Ltd"),
          party2Name: f("Beta Trading Ltd"),
          executionStatus: f("UNSIGNED"),
          signedDate: f("2024-01-01"),
        },
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.warnings.join()).toContain("not evidenced as executed");
    // signedDate must not be carried through for an unsigned agreement.
    expect(
      (result.extraction as { signedDate?: unknown }).signedDate,
    ).toBeUndefined();
  });

  it("requires two parties before building a contract extraction", () => {
    const result = adaptEnvelope(
      baseEnvelope({
        document_type: "CONTRACT",
        extracted_fields: {
          contractTitle: f("SERVICE AGREEMENT"),
          effectiveDate: f("2024-01-01"),
          party1Name: f("Alpha Holdings Ltd"),
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain("two parties");
  });
});
