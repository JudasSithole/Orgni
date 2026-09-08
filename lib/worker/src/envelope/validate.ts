/**
 * Envelope validation — the gate between Document Intelligence and the tokenizer.
 *
 * Nothing reaches `tokenizeDocument` without passing through here. The tokenizer
 * trusts its input contract, so a malformed envelope must be rejected as a
 * controlled failure rather than tokenized into misleading state.
 */

import {
  ENVELOPE_SCHEMA_VERSION,
  type EnvelopeDocumentType,
  type NormalizedEnvelope,
} from "./types.js";

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const DOCUMENT_TYPES: readonly EnvelopeDocumentType[] = [
  "INVOICE",
  "PROOF_OF_PAYMENT",
  "CONTRACT",
  "UNKNOWN",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateEnvelope(input: unknown): EnvelopeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ["envelope is not an object"], warnings };
  }

  const envelope = input as Partial<NormalizedEnvelope>;

  if (envelope.schema_version !== ENVELOPE_SCHEMA_VERSION) {
    errors.push(
      `schema_version must be "${ENVELOPE_SCHEMA_VERSION}", received ` +
        `${JSON.stringify(envelope.schema_version)}`,
    );
  }

  if (
    typeof envelope.source_id !== "string" ||
    envelope.source_id.length === 0
  ) {
    errors.push("source_id must be a non-empty string");
  }

  if (envelope.source_type !== "UPLOAD") {
    errors.push(
      `source_type must be "UPLOAD", received ${JSON.stringify(envelope.source_type)}`,
    );
  }

  if (
    typeof envelope.document_type !== "string" ||
    !DOCUMENT_TYPES.includes(envelope.document_type as EnvelopeDocumentType)
  ) {
    errors.push(
      `document_type must be one of ${DOCUMENT_TYPES.join(" | ")}, received ` +
        `${JSON.stringify(envelope.document_type)}`,
    );
  }

  if (
    !isRecord(envelope.content) ||
    typeof envelope.content["text"] !== "string"
  ) {
    errors.push("content.text must be a string");
  }

  if (!isRecord(envelope.extracted_fields)) {
    errors.push("extracted_fields must be an object");
  }

  if (!Array.isArray(envelope.tables)) {
    errors.push("tables must be an array");
  }

  if (!Array.isArray(envelope.evidence_locations)) {
    errors.push("evidence_locations must be an array");
  }

  if (!Array.isArray(envelope.warnings)) {
    errors.push("warnings must be an array");
  }

  if (
    typeof envelope.confidence !== "number" ||
    Number.isNaN(envelope.confidence) ||
    envelope.confidence < 0 ||
    envelope.confidence > 1
  ) {
    errors.push("confidence must be a number between 0 and 1");
  }

  const metadata = envelope.metadata;
  if (!isRecord(metadata)) {
    errors.push("metadata must be an object");
  } else {
    for (const key of [
      "filename",
      "mime_type",
      "checksum",
      "tenant_id",
    ] as const) {
      if (
        typeof metadata[key] !== "string" ||
        (metadata[key] as string).length === 0
      ) {
        errors.push(`metadata.${key} must be a non-empty string`);
      }
    }
  }

  // Structurally valid but not tokenizable — surfaced as a warning so the
  // caller can record the document without attempting tokenization.
  if (envelope.document_type === "UNKNOWN" && errors.length === 0) {
    warnings.push(
      "document_type is UNKNOWN; using generic evidence tokenization",
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Type guard form, for use after a successful validation. */
export function assertEnvelope(
  input: unknown,
): asserts input is NormalizedEnvelope {
  const result = validateEnvelope(input);
  if (!result.valid) {
    throw new Error(`Invalid envelope: ${result.errors.join("; ")}`);
  }
}
