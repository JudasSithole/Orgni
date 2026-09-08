/**
 * HTTP client for the Python Document Intelligence service.
 *
 * The service owns text extraction, OCR, classification and field extraction;
 * this module only moves bytes across the boundary and returns the envelope it
 * produces. Transport failures are thrown so the ingestion pipeline's retry
 * logic can decide whether they are recoverable.
 */

import type { NormalizedEnvelope } from "../envelope/types.js";
import type {
  DocumentIntelligence,
  IngestionRecord,
} from "../ingestion/pipeline.js";

export interface DocumentIntelligenceConfig {
  /** Base URL of the document service, e.g. http://127.0.0.1:8000 */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
}

export function createDocumentIntelligenceClient(
  config: DocumentIntelligenceConfig,
): DocumentIntelligence {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? 30_000;

  return async function callDocumentIntelligence(
    record: IngestionRecord,
    content: Uint8Array | string,
  ): Promise<NormalizedEnvelope> {
    const body = new FormData();
    // Copy into a plain ArrayBuffer: a Uint8Array may be backed by a
    // SharedArrayBuffer, which Blob does not accept.
    const source =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    const bytes = new Uint8Array(source.byteLength);
    bytes.set(source);
    body.append(
      "file",
      new Blob([bytes], { type: record.mimeType }),
      record.filename,
    );
    body.append("source_id", record.sourceId);
    body.append("tenant_id", record.tenantId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/analyze`, {
        method: "POST",
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        // Status is included so the pipeline's recoverability check can see
        // 502/503/429 and retry, while 4xx fails fast.
        throw new Error(
          `document intelligence returned ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as NormalizedEnvelope;
    } finally {
      clearTimeout(timer);
    }
  };
}
