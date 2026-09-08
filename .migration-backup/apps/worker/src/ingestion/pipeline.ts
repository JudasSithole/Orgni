/**
 * Orgni ingestion pipeline.
 *
 * Owns everything between "bytes arrived" and "Document Intelligence has an
 * answer": validation, checksums, stable identity, duplicate detection, state
 * transitions and bounded retries.
 *
 * Two properties matter most here. First, one bad document must never stop the
 * others — every failure is caught and recorded as a FAILED record, so batch
 * processing continues. Second, logs carry identifiers and never document
 * content, because the documents are invoices and contracts.
 */

import { createHash, randomUUID } from "node:crypto";
import type { PrincipalRule } from "@workspace/contracts";

import type { NormalizedEnvelope } from "../envelope/types.js";

export type IngestionState = "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "text/xml",
  "text/html",
  "application/json",
  "application/xml",
  "application/rtf",
  "text/rtf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export interface IngestionLimits {
  /** Maximum accepted document size. Default 20 MB. */
  maxBytes: number;
  /** Attempts per document for recoverable failures. Default 3. */
  maxAttempts: number;
  /** Base delay for retry backoff, in milliseconds. Default 50. */
  retryBaseMs: number;
}

export const DEFAULT_LIMITS: IngestionLimits = {
  maxBytes: 20 * 1024 * 1024,
  maxAttempts: 3,
  retryBaseMs: 50,
};

export interface IngestionInput {
  /** Reuse an existing source identity when retrying a failed document. */
  sourceId?: string;
  filename: string;
  mimeType: string;
  content: Uint8Array | string;
  tenantId: string;
  /** Access rules carried from the source system through to the tokens. */
  sourceAcl?: PrincipalRule[];
  uploadedAt?: string;
}

export interface IngestionRecord {
  sourceId: string;
  state: IngestionState;
  checksum: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  tenantId: string;
  sourceType: "UPLOAD";
  sourceAcl: PrincipalRule[];
  uploadedAt: string;
  attempts: number;
  duplicateOf?: string;
  envelope?: NormalizedEnvelope;
  warnings: string[];
  errors: string[];
}

/** Minimal log surface so this module stays testable without a logger. */
export interface PipelineLogger {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
}

const noopLogger: PipelineLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Document Intelligence call; injected so the pipeline stays transport-agnostic. */
export type DocumentIntelligence = (
  record: IngestionRecord,
  content: Uint8Array | string,
) => Promise<NormalizedEnvelope>;

/**
 * Records seen so far, keyed by checksum, for duplicate detection.
 * Swappable for a persistent store; the pipeline only needs these two methods.
 */
export interface SeenStore {
  get(checksum: string): string | undefined;
  set(checksum: string, sourceId: string): void;
}

export function createMemorySeenStore(): SeenStore {
  const seen = new Map<string, string>();
  return {
    get: (checksum) => seen.get(checksum),
    set: (checksum, sourceId) => {
      seen.set(checksum, sourceId);
    },
  };
}

export function checksumOf(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function byteLength(content: Uint8Array | string): number {
  return typeof content === "string"
    ? Buffer.byteLength(content, "utf8")
    : content.byteLength;
}

export function isSupportedMimeType(
  mimeType: string,
): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Errors worth retrying: transient transport/availability problems. */
export function isRecoverable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("429")
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface IngestOptions {
  limits?: Partial<IngestionLimits>;
  logger?: PipelineLogger;
  seen?: SeenStore;
}

/**
 * Ingest one document. Always resolves: failures are returned as a FAILED
 * record rather than thrown, so callers processing a batch keep going.
 */
export async function ingestDocument(
  input: IngestionInput,
  documentIntelligence: DocumentIntelligence,
  options: IngestOptions = {},
): Promise<IngestionRecord> {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const log = options.logger ?? noopLogger;
  const seen = options.seen;

  const checksum = checksumOf(input.content);
  const byteSize = byteLength(input.content);

  const record: IngestionRecord = {
    sourceId: input.sourceId ?? `src_${randomUUID()}`,
    state: "RECEIVED",
    checksum,
    filename: input.filename,
    mimeType: input.mimeType,
    byteSize,
    tenantId: input.tenantId,
    sourceType: "UPLOAD",
    sourceAcl: input.sourceAcl ?? [],
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
    attempts: 0,
    warnings: [],
    errors: [],
  };

  // Identifiers and sizes only — never filename contents or document text.
  log.info(
    {
      sourceId: record.sourceId,
      tenantId: record.tenantId,
      mimeType: record.mimeType,
      byteSize,
    },
    "document received",
  );

  // ── Validation ──────────────────────────────────────────────────────────
  if (!isSupportedMimeType(input.mimeType)) {
    record.state = "FAILED";
    record.errors.push(`unsupported_mime_type: ${input.mimeType}`);
    log.warn(
      { sourceId: record.sourceId, mimeType: input.mimeType },
      "unsupported type rejected",
    );
    return record;
  }

  if (byteSize === 0) {
    record.state = "FAILED";
    record.errors.push("empty_document");
    return record;
  }

  if (byteSize > limits.maxBytes) {
    record.state = "FAILED";
    record.errors.push(`document_too_large: ${byteSize} > ${limits.maxBytes}`);
    log.warn(
      { sourceId: record.sourceId, byteSize, maxBytes: limits.maxBytes },
      "oversize rejected",
    );
    return record;
  }

  // ── Duplicate detection ─────────────────────────────────────────────────
  const previous = seen?.get(checksum);
  if (previous) {
    record.state = "COMPLETED";
    record.duplicateOf = previous;
    record.warnings.push(`duplicate_of: ${previous}`);
    log.info(
      { sourceId: record.sourceId, duplicateOf: previous },
      "duplicate detected, skipping",
    );
    return record;
  }

  // ── Document Intelligence, with bounded retries ─────────────────────────
  record.state = "PROCESSING";

  let lastError: unknown;
  for (let attempt = 1; attempt <= limits.maxAttempts; attempt += 1) {
    record.attempts = attempt;
    try {
      const envelope = await documentIntelligence(record, input.content);
      record.envelope = envelope;
      record.warnings.push(...envelope.warnings);
      record.state = "COMPLETED";
      seen?.set(checksum, record.sourceId);
      log.info(
        {
          sourceId: record.sourceId,
          documentType: envelope.document_type,
          confidence: envelope.confidence,
          attempts: attempt,
        },
        "document intelligence completed",
      );
      return record;
    } catch (error) {
      lastError = error;
      const recoverable = isRecoverable(error);
      log.warn(
        {
          sourceId: record.sourceId,
          attempt,
          maxAttempts: limits.maxAttempts,
          recoverable,
          error: error instanceof Error ? error.name : "unknown",
        },
        "document intelligence attempt failed",
      );
      if (!recoverable || attempt === limits.maxAttempts) break;
      await delay(limits.retryBaseMs * 2 ** (attempt - 1));
    }
  }

  record.state = "FAILED";
  record.errors.push(
    `document_intelligence_failed: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
  log.error(
    { sourceId: record.sourceId, attempts: record.attempts },
    "document intelligence failed after retries",
  );
  return record;
}

/**
 * Ingest many documents, isolating failures.
 * A rejection in one document never affects the others.
 */
export async function ingestBatch(
  inputs: IngestionInput[],
  documentIntelligence: DocumentIntelligence,
  options: IngestOptions = {},
): Promise<IngestionRecord[]> {
  const seen = options.seen ?? createMemorySeenStore();
  const records: IngestionRecord[] = [];
  for (const input of inputs) {
    records.push(
      await ingestDocument(input, documentIntelligence, { ...options, seen }),
    );
  }
  return records;
}
