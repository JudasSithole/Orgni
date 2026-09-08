/**
 * Orgni Organizational Tokenizer — Invoice Extraction Envelope
 * schema_version: "0.1.0"
 *
 * Describes the normalized output of the document-processing pipeline
 * for an invoice document. All fields the tokenizer needs are here;
 * raw bytes and OCR output are NOT passed through.
 */

import type { ExtractionEnvelopeBase, FieldExtraction } from "./types.js";

export interface InvoiceLineItem {
  description: FieldExtraction;
  quantity: FieldExtraction<number>;
  unitPrice: FieldExtraction<number>;
  totalPrice: FieldExtraction<number>;
  /** Currency for this line (may differ from invoice currency in multi-currency invoices). */
  currency: FieldExtraction;
}

export interface InvoiceExtraction extends ExtractionEnvelopeBase {
  documentType: "INVOICE";

  // ── Identifiers ──────────────────────────────────────────────────────────
  invoiceNumber: FieldExtraction;
  invoiceDate: FieldExtraction;
  dueDate?: FieldExtraction;

  // ── Parties ──────────────────────────────────────────────────────────────
  vendorName: FieldExtraction;
  /** Internal or registration ID of the vendor, if extractable. */
  vendorId?: FieldExtraction;
  vendorAddress?: FieldExtraction;
  vendorVatNumber?: FieldExtraction;

  buyerName?: FieldExtraction;
  /** Internal or registration ID of the buyer, if extractable. */
  buyerId?: FieldExtraction;
  buyerAddress?: FieldExtraction;

  // ── Financials ───────────────────────────────────────────────────────────
  subtotal?: FieldExtraction<number>;
  taxAmount?: FieldExtraction<number>;
  taxRate?: FieldExtraction<number>;
  totalAmount: FieldExtraction<number>;
  currency: FieldExtraction;

  // ── Line items ───────────────────────────────────────────────────────────
  lineItems: InvoiceLineItem[];

  // ── Optional metadata ────────────────────────────────────────────────────
  paymentTerms?: FieldExtraction;
  purchaseOrderRef?: FieldExtraction;
  notes?: FieldExtraction;
}
