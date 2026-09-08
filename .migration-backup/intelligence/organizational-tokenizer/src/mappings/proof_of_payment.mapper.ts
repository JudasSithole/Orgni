/**
 * Orgni Organizational Tokenizer — Proof of Payment Mapper
 * schema_version: "0.1.0"
 */
import type { OrganizationalToken } from "@workspace/contracts";
import { clampConfidence } from "@workspace/contracts";
import type { ProofOfPaymentExtraction } from "../envelopes/proof_of_payment.js";
import {
  minConfidence,
  buildSourceRef,
  getStableTimestamp,
} from "./helpers.js";

export function mapProofOfPaymentToTokens(
  env: ProofOfPaymentExtraction,
): OrganizationalToken[] {
  const stableNow = getStableTimestamp(env);
  const tokens: OrganizationalToken[] = [];

  // ── Token 1: PAYMENT_MADE ────────────────────────────────────────────────
  tokens.push({
    tokenId: `tok_${env.extractionId}_payment_made`,
    tenantId: env.tenantId,
    tokenKind: "EVENT",
    eventType: "PAYMENT_MADE",
    ...(env.payerName && { subjectId: env.payerName.value }),
    ...(env.payeeName && { objectId: env.payeeName.value }),
    validTime: { from: env.paymentDate.value },
    transactionTime: stableNow,
    scalarValue: {
      ...(env.referenceNumber && {
        referenceNumber: env.referenceNumber.value,
      }),
      amount: env.amount.value,
      currency: env.currency.value,
      ...(env.paymentMethod && { method: env.paymentMethod.value }),
      ...(env.payerAccountRef
        ? { payerAccountRef: env.payerAccountRef.value }
        : {}),
      ...(env.payeeAccountRef
        ? { payeeAccountRef: env.payeeAccountRef.value }
        : {}),
      ...(env.invoiceRef ? { invoiceRef: env.invoiceRef.value } : {}),
      ...(env.bankRef ? { bankRef: env.bankRef.value } : {}),
    },
    sourceRefs: [buildSourceRef(env, 1, "payment-details")],
    confidence: clampConfidence(
      minConfidence(
        env.amount.confidence,
        env.paymentDate.confidence,
        ...(env.referenceNumber ? [env.referenceNumber.confidence] : []),
        ...(env.payerName ? [env.payerName.confidence] : []),
        ...(env.payeeName ? [env.payeeName.confidence] : []),
      ),
    ),
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["finance", "accounts-payable"],
    retentionClass: "financial",
    payloadRef: env.documentRef,
  });

  // ── Token 2: PAYMENT_SETTLEMENT ──────────────────────────────────────────
  if (env.invoiceRef) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_payment_settlement`,
      tenantId: env.tenantId,
      tokenKind: "STATE",
      eventType: "PAYMENT_SETTLEMENT",
      ...(env.payerName && { subjectId: env.payerName.value }),
      ...(env.payeeName && { objectId: env.payeeName.value }),
      validTime: { from: env.paymentDate.value },
      transactionTime: stableNow,
      scalarValue: {
        invoiceRef: env.invoiceRef.value,
        amount: env.amount.value,
        currency: env.currency.value,
        ...(env.paymentMethod && { method: env.paymentMethod.value }),
        status: "PENDING_VERIFICATION", // Replaced 'SETTLED' to accommodate partial or unverified remittance matching
      },
      sourceRefs: [buildSourceRef(env, 1, "metadata-matching")],
      confidence: clampConfidence(
        minConfidence(env.invoiceRef.confidence, env.amount.confidence),
      ),
      // INFERRED, not ASSERTED: this settlement link is derived from the payment
      // merely *referencing* an invoice, not from any explicit settlement
      // statement in the document. Combined with status PENDING_VERIFICATION,
      // this ensures a payment reference never asserts a settled invoice.
      epistemicStatus: "INFERRED",
      visibility: [],
      actionScope: ["finance", "accounts-payable"],
      retentionClass: "financial",
      payloadRef: env.documentRef,
    });
  }

  // ── Relation: payer PAID payee ───────────────────────────────────────────
  // Both parties named on the proof of payment — a payment relationship
  // between them. Emitted only when both are present.
  if (env.payerName && env.payeeName) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_payment_relation`,
      tenantId: env.tenantId,
      tokenKind: "RELATION",
      subjectId: env.payerName.value,
      predicate: "PAID",
      objectId: env.payeeName.value,
      validTime: { from: env.paymentDate.value },
      transactionTime: stableNow,
      scalarValue: {
        amount: env.amount.value,
        currency: env.currency.value,
        ...(env.invoiceRef ? { invoiceRef: env.invoiceRef.value } : {}),
      },
      sourceRefs: [buildSourceRef(env, 1, "payment-details")],
      confidence: clampConfidence(
        minConfidence(env.payerName.confidence, env.payeeName.confidence),
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
