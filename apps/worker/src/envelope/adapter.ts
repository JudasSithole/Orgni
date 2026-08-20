/**
 * Envelope → tokenizer extraction adapter.
 *
 * The tokenizer owns its input contract (`InvoiceExtraction`,
 * `ProofOfPaymentExtraction`, `ContractExtraction`) and we do not reshape it to
 * suit this pipeline. This module is the single translation point from the
 * service-boundary envelope (snake_case, generic field bag) to those types.
 *
 * Required-but-missing fields are the interesting case. The tokenizer marks
 * e.g. `totalAmount` as required, but Document Intelligence legitimately cannot
 * always find it. Rather than invent a zero — which would tokenize as an
 * observed amount of nothing — the adapter refuses to build the extraction and
 * reports why. The caller records a controlled failure instead.
 */

import type {
  ContractExtraction,
  DocumentExtraction,
  InvoiceExtraction,
  ProofOfPaymentExtraction,
} from "@workspace/organizational-tokenizer";

import type { EnvelopeField, NormalizedEnvelope } from "./types.js";

export interface AdaptResult {
  ok: boolean;
  extraction?: DocumentExtraction;
  errors: string[];
  warnings: string[];
}

function isField(value: unknown): value is EnvelopeField<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "confidence" in value &&
    "method" in value
  );
}

function field<T>(
  fields: Record<string, unknown>,
  name: string,
  kind: "string" | "number",
): EnvelopeField<T> | undefined {
  const raw = fields[name];
  if (!isField(raw) || typeof raw.value !== kind) return undefined;
  return raw as EnvelopeField<T>;
}

const str = (f: Record<string, unknown>, n: string) =>
  field<string>(f, n, "string");
const num = (f: Record<string, unknown>, n: string) =>
  field<number>(f, n, "number");

/** Collect indexed fields such as party1Name, party2Name, … in order. */
function indexed(
  fields: Record<string, unknown>,
  prefix: string,
  suffix = "",
): EnvelopeField<string>[] {
  const pattern = new RegExp(`^${prefix}(\\d+)${suffix}$`);
  return Object.keys(fields)
    .map((key) => ({ key, match: pattern.exec(key) }))
    .filter(
      (entry): entry is { key: string; match: RegExpExecArray } =>
        entry.match !== null,
    )
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((entry) => str(fields, entry.key))
    .filter((value): value is EnvelopeField<string> => value !== undefined);
}

function base(envelope: NormalizedEnvelope) {
  return {
    extractionId: envelope.source_id,
    tenantId: envelope.metadata.tenant_id,
    documentRef: envelope.metadata.checksum,
    mimeType: envelope.metadata.mime_type,
    checksum: envelope.metadata.checksum,
    observedAt: new Date().toISOString(),
    schemaVersion: "0.1.0" as const,
    extractionStatus: envelope.extraction_status ?? "PARTIAL",
  };
}

// ── Invoice ───────────────────────────────────────────────────────────────────

function adaptInvoice(envelope: NormalizedEnvelope): AdaptResult {
  const f = envelope.extracted_fields;
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = {
    invoiceNumber: str(f, "invoiceNumber"),
    invoiceDate: str(f, "invoiceDate"),
    vendorName: str(f, "vendorName"),
    totalAmount: num(f, "totalAmount"),
    currency: str(f, "currency"),
  };
  for (const [name, value] of Object.entries(required)) {
    if (value === undefined)
      errors.push(`invoice is missing required field: ${name}`);
  }
  if (errors.length > 0) return { ok: false, errors, warnings };

  const currency = required.currency!;
  const rawItems = Array.isArray(f["lineItems"]) ? f["lineItems"] : [];
  const lineItems = rawItems.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    const description = str(row, "description");
    const quantity = num(row, "quantity");
    const unitPrice = num(row, "unitPrice");
    const totalPrice = num(row, "totalPrice");
    if (!description || !quantity || !unitPrice || !totalPrice) {
      warnings.push("line item dropped: incomplete fields");
      return [];
    }
    return [{ description, quantity, unitPrice, totalPrice, currency }];
  });

  const extraction: InvoiceExtraction = {
    ...base(envelope),
    documentType: "INVOICE",
    invoiceNumber: required.invoiceNumber!,
    invoiceDate: required.invoiceDate!,
    vendorName: required.vendorName!,
    totalAmount: required.totalAmount!,
    currency,
    lineItems,
    ...(str(f, "buyerName") && { buyerName: str(f, "buyerName")! }),
    ...(str(f, "dueDate") && { dueDate: str(f, "dueDate")! }),
    ...(str(f, "vendorVatNumber") && {
      vendorVatNumber: str(f, "vendorVatNumber")!,
    }),
    ...(num(f, "subtotal") && { subtotal: num(f, "subtotal")! }),
    ...(num(f, "taxAmount") && { taxAmount: num(f, "taxAmount")! }),
    ...(str(f, "paymentTerms") && { paymentTerms: str(f, "paymentTerms")! }),
    ...(str(f, "purchaseOrderRef") && {
      purchaseOrderRef: str(f, "purchaseOrderRef")!,
    }),
  };

  return { ok: true, extraction, errors, warnings };
}

// ── Proof of payment ──────────────────────────────────────────────────────────

/** Map extractor method names onto the tokenizer's PaymentMethod union. */
const PAYMENT_METHODS: Record<
  string,
  NonNullable<ProofOfPaymentExtraction["paymentMethod"]>["value"]
> = {
  EFT: "EFT",
  WIRE: "SWIFT",
  SWIFT: "SWIFT",
  CARD: "CARD",
  CASH: "CASH",
  CHEQUE: "CHEQUE",
  DEBIT_ORDER: "OTHER",
};

function adaptProofOfPayment(envelope: NormalizedEnvelope): AdaptResult {
  const f = envelope.extracted_fields;
  const errors: string[] = [];
  const warnings: string[] = [];

  const required = {
    paymentDate: str(f, "paymentDate"),
    amount: num(f, "amount"),
    currency: str(f, "currency"),
  };
  for (const [name, value] of Object.entries(required)) {
    if (value === undefined) {
      errors.push(`proof of payment is missing required field: ${name}`);
    }
  }

  if (errors.length > 0) return { ok: false, errors, warnings };

  const rawMethod = str(f, "paymentMethod");
  const paymentMethod: ProofOfPaymentExtraction["paymentMethod"] = rawMethod
    ? {
        ...rawMethod,
        value: PAYMENT_METHODS[rawMethod.value] ?? "OTHER",
      }
    : undefined;

  // Carried as a reference only. Whether it settles that invoice is an
  // ontology question, and Phase 1 deliberately does not answer it.
  const invoiceRef = str(f, "referencedInvoiceNumber");
  if (invoiceRef) {
    warnings.push(
      "referenced invoice recorded as a reference only; settlement is not asserted",
    );
  }

  const extraction: ProofOfPaymentExtraction = {
    ...base(envelope),
    documentType: "PROOF_OF_PAYMENT",
    paymentDate: required.paymentDate!,
    amount: required.amount!,
    currency: required.currency!,
    ...(str(f, "paymentReference") && {
      referenceNumber: str(f, "paymentReference")!,
    }),
    ...(str(f, "payerName") && { payerName: str(f, "payerName")! }),
    ...(str(f, "payeeName") && { payeeName: str(f, "payeeName")! }),
    ...(paymentMethod && { paymentMethod }),
    ...(invoiceRef && { invoiceRef }),
    ...(str(f, "proofReference") && { bankRef: str(f, "proofReference")! }),
  };

  return { ok: true, extraction, errors, warnings };
}

// ── Contract ──────────────────────────────────────────────────────────────────

/**
 * Derive the tokenizer's ContractType from the document title.
 *
 * This is a classification of text we did observe, not an invented fact, so it
 * is marked INFERRED with modest confidence and falls back to OTHER.
 */
function contractType(
  title: EnvelopeField<string> | undefined,
): ContractExtraction["contractType"] {
  const text = (title?.value ?? "").toUpperCase();
  const value =
    text.includes("NON-DISCLOSURE") ||
    text.includes("NONDISCLOSURE") ||
    text.includes("NDA")
      ? "NDA"
      : text.includes("EMPLOYMENT")
        ? "EMPLOYMENT"
        : text.includes("SERVICE") ||
            text.includes("MASTER") ||
            text.includes("SUPPLY")
          ? "SERVICE_AGREEMENT"
          : "OTHER";

  return {
    value,
    confidence: title ? 0.7 : 0.3,
    method: "INFERRED",
    ...(title?.page !== undefined && { page: title.page }),
    section: "header",
    ...(title?.value !== undefined && { raw: title.value }),
  };
}

function adaptContract(envelope: NormalizedEnvelope): AdaptResult {
  const f = envelope.extracted_fields;
  const errors: string[] = [];
  const warnings: string[] = [];

  const title = str(f, "contractTitle");
  const effectiveDate = str(f, "effectiveDate");
  const partyFields = indexed(f, "party", "Name");

  if (!effectiveDate)
    errors.push("contract is missing required field: effectiveDate");
  if (partyFields.length < 2)
    errors.push("contract requires at least two parties");
  if (errors.length > 0) return { ok: false, errors, warnings };

  const parties: ContractExtraction["parties"] = partyFields.map(
    (party, index) => ({
      name: party,
      role: {
        value: index === 0 ? "PARTY_A" : "PARTY_B",
        confidence: 0.6,
        method: "INFERRED" as const,
        section: "parties",
      },
    }),
  );

  // `signedDate` is the tokenizer's only execution signal. We set it solely
  // from explicit signature evidence, so an unsigned or draft agreement can
  // never tokenize as executed.
  const execution = str(f, "executionStatus");
  const signedDate =
    execution?.value === "EXECUTED" ? str(f, "signedDate") : undefined;
  if (execution?.value !== "EXECUTED") {
    warnings.push(
      "contract is not evidenced as executed; no execution date asserted",
    );
  }

  // Obligations are now tokenized (CONTRACT_OBLIGATION policies). Absent any,
  // record a warning so the reviewer knows none were parsed.
  const obligations = indexed(f, "obligation");
  if (obligations.length === 0) {
    warnings.push("no contract obligations were parsed from this document");
  }

  // Normalize execution status to the tokenizer's enum. EXECUTED only survives
  // from explicit signature evidence; otherwise NOT_EXECUTED (never guessed).
  const executionStatus: ContractExtraction["executionStatus"] =
    execution?.value === "EXECUTED"
      ? {
          value: "EXECUTED",
          confidence: execution.confidence,
          method: execution.method,
          section: execution.section,
        }
      : {
          value: "NOT_EXECUTED",
          confidence: 0.6,
          method: "INFERRED" as const,
          section: "execution",
        };

  const extraction: ContractExtraction = {
    documentType: "CONTRACT",
    extractionId: envelope.source_id,
    tenantId: envelope.metadata.tenant_id,
    documentRef: envelope.metadata.checksum,
    checksum: envelope.metadata.checksum,
    contractType: contractType(title),
    effectiveDate: effectiveDate!,
    parties,
    executionStatus,
    ...(title && { title }),
    ...(str(f, "contractReference") && {
      reference: str(f, "contractReference")!,
    }),
    ...(str(f, "expirationDate") && { expiryDate: str(f, "expirationDate")! }),
    ...(num(f, "contractValue") && { contractValue: num(f, "contractValue")! }),
    ...(str(f, "currency") && { currency: str(f, "currency")! }),
    ...(str(f, "paymentTerms") && { paymentTerms: str(f, "paymentTerms")! }),
    ...(obligations.length > 0 && { obligations }),
    ...(signedDate && { signedDate }),
  };

  return { ok: true, extraction, errors, warnings };
}

/**
 * Translate a validated envelope into the tokenizer's extraction contract.
 * UNKNOWN documents are rejected: there is no honest extraction to build.
 */
export function adaptEnvelope(envelope: NormalizedEnvelope): AdaptResult {
  switch (envelope.document_type) {
    case "INVOICE":
      return adaptInvoice(envelope);
    case "PROOF_OF_PAYMENT":
      return adaptProofOfPayment(envelope);
    case "CONTRACT":
      return adaptContract(envelope);
    default:
      return {
        ok: false,
        errors: [`cannot tokenize document_type ${envelope.document_type}`],
        warnings: [],
      };
  }
}
