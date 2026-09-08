import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapInvoiceToTokens } from "../src/mappings/invoice.mapper.js";
import { tokenizeDocument } from "../src/tokenizer/document.tokenizer.js";
import type { InvoiceExtraction } from "../src/envelopes/invoice.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

const clean = loadFixture<InvoiceExtraction>("invoice.clean.json");
const partial = loadFixture<InvoiceExtraction>("invoice.partial.json");

describe("mapInvoiceToTokens — clean invoice", () => {
  const tokens = mapInvoiceToTokens(clean);

  it("emits 4 tokens for a complete invoice with line items (incl. billing relation)", () => {
    expect(tokens).toHaveLength(4);
  });

  it("emits a vendor→buyer BILLED relation", () => {
    const rel = tokens.find((t) => t.tokenKind === "RELATION");
    expect(rel).toBeDefined();
    expect(rel!.predicate).toBe("BILLED");
    expect(rel!.subjectId).toBe(clean.vendorName.value);
    expect(rel!.objectId).toBe(clean.buyerName!.value);
  });

  it("correctly models invoice obligation with outstanding status mapping capabilities", () => {
    const obligationToken = tokens.find((t) => t.eventType === "INVOICE_OBLIGATION");
    expect(obligationToken).toBeDefined();
    expect(["OUTSTANDING", "OVERDUE"]).toContain((obligationToken!.scalarValue as any).status);
  });

  it("includes page and section source evidence on tokens", () => {
    tokens.forEach((t) => {
      expect(t.sourceRefs[0].locator).toBeDefined();
      expect(typeof t.sourceRefs[0].locator?.page).toBe("number");
      expect(typeof t.sourceRefs[0].locator?.section).toBe("string");
    });
  });
});

describe("Main Dispatcher Routing & Validation Failures Infrastructure", () => {
  it("successfully passes structural inputs via the tokenizer dispatcher", () => {
    const response = tokenizeDocument(clean);
    expect(response.valid).toBe(true);
    expect(response.documentType).toBe("INVOICE");
    expect(response.tokens.length).toBeGreaterThan(0);
  });

  it("gracefully flags and strips corrupted tokens from the main valid results list", () => {
    const corruptedPayload: any = {
      ...clean,
      tenantId: "", // Deliberate failure scenario to prompt structural validation errors
    };
    const response = tokenizeDocument(corruptedPayload);
    expect(response.tokens).toHaveLength(0); // Ensures invalid items are strictly discarded
  });
});
