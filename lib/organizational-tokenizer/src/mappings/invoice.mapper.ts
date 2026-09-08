/**
 * Orgni Organizational Tokenizer — Invoice Mapper
 * schema_version: "0.1.0"
 */
import type { OrganizationalToken } from "@workspace/contracts";
import { clampConfidence } from "@workspace/contracts";
import type { InvoiceExtraction } from "../envelopes/invoice.js";
import {
  minConfidence,
  avgConfidence,
  buildSourceRef,
  getStableTimestamp,
} from "./helpers.js";

export function mapInvoiceToTokens(
  env: InvoiceExtraction,
): OrganizationalToken[] {
  const stableNow = getStableTimestamp(env);
  const tokens: OrganizationalToken[] = [];

  // ── Token 1: INVOICE_ISSUED ──────────────────────────────────────────────
  tokens.push({
    tokenId: `tok_${env.extractionId}_invoice_issued`,
    tenantId: env.tenantId,
    tokenKind: "EVENT",
    eventType: "INVOICE_ISSUED",
    subjectId: env.vendorName.value,
    ...(env.buyerName && { objectId: env.buyerName.value }),
    validTime: { from: env.invoiceDate.value },
    transactionTime: stableNow,
    scalarValue: {
      invoiceNumber: env.invoiceNumber.value,
      totalAmount: env.totalAmount.value,
      currency: env.currency.value,
      ...(env.dueDate ? { dueDate: env.dueDate.value } : {}),
      ...(env.purchaseOrderRef
        ? { purchaseOrderRef: env.purchaseOrderRef.value }
        : {}),
      ...(env.vendorVatNumber
        ? { vendorVatNumber: env.vendorVatNumber.value }
        : {}),
      ...(env.paymentTerms ? { paymentTerms: env.paymentTerms.value } : {}),
    },
    sourceRefs: [buildSourceRef(env, 1, "header")],
    confidence: clampConfidence(
      minConfidence(
        env.invoiceNumber.confidence,
        env.vendorName.confidence,
        ...(env.buyerName ? [env.buyerName.confidence] : []),
        env.totalAmount.confidence,
      ),
    ),
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["finance", "accounts-payable"],
    retentionClass: "financial",
    payloadRef: env.documentRef,
  });

  // ── Token 2: INVOICE_OBLIGATION ──────────────────────────────────────────
  // Calculate if the outstanding obligation has past its due date bounds
  let obligationStatus = "OUTSTANDING";
  if (env.dueDate?.value) {
    const referenceTime = Date.parse(stableNow);
    const dueTime = Date.parse(env.dueDate.value);
    if (!isNaN(referenceTime) && !isNaN(dueTime) && referenceTime > dueTime) {
      obligationStatus = "OVERDUE";
    }
  }

  tokens.push({
    tokenId: `tok_${env.extractionId}_invoice_obligation`,
    tenantId: env.tenantId,
    tokenKind: "STATE",
    eventType: "INVOICE_OBLIGATION",
    ...(env.buyerName && { subjectId: env.buyerName.value }),
    objectId: env.vendorName.value,
    validTime: { from: env.invoiceDate.value }, // Removed the terminal '.to' date bound to allow continuity past deadlines
    transactionTime: stableNow,
    scalarValue: {
      amount: env.totalAmount.value,
      currency: env.currency.value,
      invoiceNumber: env.invoiceNumber.value,
      status: obligationStatus,
      ...(env.subtotal ? { subtotal: env.subtotal.value } : {}),
      ...(env.taxAmount ? { taxAmount: env.taxAmount.value } : {}),
      ...(env.taxRate ? { taxRate: env.taxRate.value } : {}),
    },
    sourceRefs: [buildSourceRef(env, 1, "summary")],
    confidence: clampConfidence(
      minConfidence(env.totalAmount.confidence, env.currency.confidence),
    ),
    epistemicStatus: "ASSERTED",
    visibility: [],
    actionScope: ["finance", "accounts-payable"],
    retentionClass: "financial",
    payloadRef: env.documentRef,
  });

  // ── Token 3: INVOICE_LINE_ITEMS ──────────────────────────────────────────
  if (env.lineItems && env.lineItems.length > 0) {
    const lineConfidences = env.lineItems.map((li) =>
      minConfidence(li.description.confidence, li.totalPrice.confidence),
    );
    tokens.push({
      tokenId: `tok_${env.extractionId}_invoice_line_items`,
      tenantId: env.tenantId,
      tokenKind: "EVENT",
      eventType: "INVOICE_LINE_ITEMS",
      subjectId: env.vendorName.value,
      ...(env.buyerName && { objectId: env.buyerName.value }),
      transactionTime: stableNow,
      scalarValue: {
        invoiceNumber: env.invoiceNumber.value,
        count: env.lineItems.length,
        items: env.lineItems.map((li) => ({
          description: li.description.value,
          quantity: li.quantity.value,
          unitPrice: li.unitPrice.value,
          totalPrice: li.totalPrice.value,
          currency: li.currency.value,
        })),
      },
      sourceRefs: [buildSourceRef(env, 1, "line-items-table")],
      confidence: clampConfidence(avgConfidence(...lineConfidences)),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["finance"],
      retentionClass: "financial",
      payloadRef: env.documentRef,
    });
  }

  // ── Relation: vendor BILLED buyer ────────────────────────────────────────
  // Both parties are named on the invoice — sufficient identity evidence for a
  // billing relationship. Emitted only when a buyer is present.
  if (env.buyerName) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_invoice_billing`,
      tenantId: env.tenantId,
      tokenKind: "RELATION",
      subjectId: env.vendorName.value,
      predicate: "BILLED",
      objectId: env.buyerName.value,
      validTime: { from: env.invoiceDate.value },
      transactionTime: stableNow,
      scalarValue: {
        invoiceNumber: env.invoiceNumber.value,
        amount: env.totalAmount.value,
        currency: env.currency.value,
      },
      sourceRefs: [buildSourceRef(env, 1, "parties")],
      confidence: clampConfidence(
        minConfidence(env.vendorName.confidence, env.buyerName.confidence),
      ),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["finance", "accounts-payable"],
      retentionClass: "financial",
      payloadRef: env.documentRef,
    });
  }

  return tokens;
}
