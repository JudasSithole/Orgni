/**
 * Unit tests for potential business-duplicate detection (item 6).
 */
import { describe, expect, it } from "vitest";

import {
  invoiceBusinessKey,
  findPotentialDuplicate,
} from "../src/lib/duplicate.js";

function invoiceTokens(overrides: {
  invoiceNumber?: string;
  vendor?: string;
  amount?: number;
  currency?: string;
}) {
  return [
    {
      eventType: "INVOICE_ISSUED",
      subjectId: overrides.vendor ?? "ABC Logistics (Pty) Ltd",
      scalarValue: {
        invoiceNumber: overrides.invoiceNumber ?? "INV-2024-0081",
        totalAmount: overrides.amount ?? 15000,
        currency: overrides.currency ?? "ZAR",
      },
    },
  ];
}

describe("invoiceBusinessKey", () => {
  it("builds a stable key from number + supplier + amount + currency", () => {
    const a = invoiceBusinessKey(invoiceTokens({}));
    const b = invoiceBusinessKey(
      invoiceTokens({ vendor: "abc logistics (pty) ltd" }),
    );
    expect(a).not.toBeNull();
    expect(a).toBe(b); // case/space-insensitive
  });

  it("returns null for a non-invoice or when key fields are missing", () => {
    expect(invoiceBusinessKey([{ eventType: "PAYMENT_MADE" }])).toBeNull();
    expect(
      invoiceBusinessKey([{ eventType: "INVOICE_ISSUED", scalarValue: {} }]),
    ).toBeNull();
  });
});

describe("findPotentialDuplicate", () => {
  it("flags a different source with the same business key", () => {
    const newTokens = invoiceTokens({});
    const existing = [
      { sourceId: "src_old", tokens: invoiceTokens({}) },
      {
        sourceId: "src_other",
        tokens: invoiceTokens({ invoiceNumber: "INV-9" }),
      },
    ];
    const dup = findPotentialDuplicate(newTokens, existing, "src_new");
    expect(dup?.sourceId).toBe("src_old");
  });

  it("does not flag itself or genuinely different invoices", () => {
    const newTokens = invoiceTokens({});
    const existing = [
      { sourceId: "src_new", tokens: invoiceTokens({}) }, // self
      { sourceId: "src_x", tokens: invoiceTokens({ amount: 999 }) },
    ];
    expect(findPotentialDuplicate(newTokens, existing, "src_new")).toBeNull();
  });
});
