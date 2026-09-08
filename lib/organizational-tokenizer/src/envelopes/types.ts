/**
 * Orgni Organizational Tokenizer — Input Envelope Base Types
 * schema_version: "0.1.0"
 *
 * Defines the normalized extraction envelope contract that the document-processing
 * pipeline (Teams 3 & 4) must produce before handing off to this tokenizer.
 *
 * Tokenizer responsibilities:
 *   ✅ Accept this envelope and emit OrganizationalTokens
 *
 * NOT tokenizer responsibilities:
 *   ❌ OCR / file parsing
 *   ❌ Field extraction / ML inference
 *   ❌ Entity resolution
 *   ❌ State mutation
 */

export type DocumentType = "INVOICE" | "PROOF_OF_PAYMENT" | "CONTRACT";

export type ExtractionStatus = "COMPLETE" | "PARTIAL" | "LOW_CONFIDENCE";

/**
 * The method used to extract a given field value.
 * Informs confidence scoring downstream.
 */
export type ConfidenceMethod =
    | "OCR_EXTRACTION"
    | "RULE_MATCH"
    | "ML_MODEL"
    | "MANUAL"
    | "INFERRED";

/**
 * A single extracted field with its value, confidence, and provenance.
 * T defaults to string for text fields; use FieldExtraction<number> etc. for typed fields.
 */
export interface FieldExtraction<T = string> {
    /** The normalized, cleaned value ready for tokenization. */
    value: T;
    /** Extraction confidence: 0 (no confidence) → 1 (certain). */
    confidence: number;
    /** How this field was extracted. */
    method: ConfidenceMethod;
    /** Source page in the document, if applicable. */
    page?: number;
    /** Section label (e.g. "header", "line_items") within the document. */
    section?: string;
    /** Raw, pre-normalization text from the source for audit purposes. */
    raw?: string;
}

/**
 * Base envelope shared by all document extraction types.
 * Every document the tokenizer receives must conform to this base.
 */
export interface ExtractionEnvelopeBase {
    /** Unique ID for this extraction run — assigned by the document-processing pipeline. */
    extractionId: string;
    /** The organization / tenant this document belongs to. */
    tenantId: string;
    /** Stable content-addressed reference to the source document in object storage. */
    documentRef: string;
    /** MIME type of the source document, e.g. "application/pdf". */
    mimeType: string;
    /** SHA-256 checksum of the source document bytes. */
    checksum: string;
    /** ISO-8601 timestamp of when the pipeline received this document. */
    observedAt: string;
    /** Version of the extraction schema this envelope conforms to. */
    schemaVersion: "0.1.0";
    /** Overall extraction completeness signal from the upstream pipeline. */
    extractionStatus: ExtractionStatus;
    /** Discriminant used by the tokenizer dispatcher. */
    documentType: DocumentType;
}