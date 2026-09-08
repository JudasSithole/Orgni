/**
 * Normalized extraction envelope — schema_version 0.1.0.
 *
 * This is the contract Document Intelligence produces and the ingestion
 * pipeline consumes. It mirrors `intelligence/document-intelligence/envelope/builder.py`
 * exactly; the two must be changed together.
 *
 * Field names are snake_case because the envelope crosses a service boundary
 * and is emitted by the Python service. The tokenizer's own extraction types
 * are camelCase — `adapter.ts` is the single place that translates.
 */

export const ENVELOPE_SCHEMA_VERSION = "0.1.0" as const;

export type EnvelopeDocumentType =
  "INVOICE" | "PROOF_OF_PAYMENT" | "CONTRACT" | "UNKNOWN";

export type EnvelopeExtractionStatus =
  "COMPLETE" | "PARTIAL" | "LOW_CONFIDENCE";

export type ConfidenceMethod =
  "OCR_EXTRACTION" | "RULE_MATCH" | "ML_MODEL" | "MANUAL" | "INFERRED";

/** A single extracted value with its confidence and provenance. */
export interface EnvelopeField<T = unknown> {
  value: T;
  confidence: number;
  method: ConfidenceMethod;
  page?: number;
  section?: string;
  raw?: string;
}

export interface EnvelopeEvidenceLocation {
  field: string;
  type: "TEXT_SPAN" | "BBOX" | "TABLE_CELL" | "IMAGE_REGION";
  page?: number;
  start?: number;
  end?: number;
  excerpt?: string;
  bbox?: [number, number, number, number];
}

export interface EnvelopeTable {
  name: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface EnvelopeMetadata {
  filename: string;
  mime_type: string;
  checksum: string;
  tenant_id: string;
}

export interface NormalizedEnvelope {
  source_id: string;
  source_type: "UPLOAD";
  document_type: EnvelopeDocumentType;
  content: {
    text: string;
    language: string;
  };
  extracted_fields: Record<string, unknown>;
  tables: EnvelopeTable[];
  metadata: EnvelopeMetadata;
  evidence_locations: EnvelopeEvidenceLocation[];
  confidence: number;
  warnings: string[];
  schema_version: typeof ENVELOPE_SCHEMA_VERSION;
  /** Completeness signal; absent on older producers, defaulted on validation. */
  extraction_status?: EnvelopeExtractionStatus;
}
