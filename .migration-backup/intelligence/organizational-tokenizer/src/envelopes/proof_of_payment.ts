/**
 * Orgni Organizational Tokenizer — Proof of Payment Extraction Envelope
 * schema_version: "0.1.0"
 *
 * Describes the normalized output of the document-processing pipeline
 * for a proof of payment (bank confirmation, remittance advice, receipt, etc.).
 */

import type { ExtractionEnvelopeBase, FieldExtraction } from "./types.js";

export type PaymentMethod =
  | "EFT"
  | "SWIFT"
  | "CASH"
  | "CHEQUE"
  | "CARD"
  | "MOBILE_MONEY"
  | "CRYPTO"
  | "OTHER";

export interface ProofOfPaymentExtraction extends ExtractionEnvelopeBase {
  documentType: "PROOF_OF_PAYMENT";

  // ── Identifiers ──────────────────────────────────────────────────────────
  /** Bank or payment processor reference number. */
  referenceNumber?: FieldExtraction;
  paymentDate: FieldExtraction;

  // ── Parties ──────────────────────────────────────────────────────────────
  payerName?: FieldExtraction;
  /** Payer account number or IBAN (masked acceptable). */
  payerAccountRef?: FieldExtraction;

  payeeName?: FieldExtraction;
  /** Payee account number or IBAN (masked acceptable). */
  payeeAccountRef?: FieldExtraction;

  // ── Financials ───────────────────────────────────────────────────────────
  amount: FieldExtraction<number>;
  currency: FieldExtraction;
  paymentMethod?: FieldExtraction<PaymentMethod>;

  // ── Links ────────────────────────────────────────────────────────────────
  /** Invoice number this payment settles, if stated on the document. */
  invoiceRef?: FieldExtraction;
  /** Bank transaction reference, if distinct from referenceNumber. */
  bankRef?: FieldExtraction;

  notes?: FieldExtraction;
}
