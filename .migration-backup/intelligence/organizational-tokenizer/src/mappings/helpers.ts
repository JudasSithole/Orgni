/**
 * Shared mapping utilities used by all document mappers.
 */
import type { EvidenceReference } from "@workspace/contracts";
import type { ExtractionEnvelopeBase } from "../envelopes/types.js";

/**
 * Returns the lowest confidence value across the supplied fields.
 * A token is only as trustworthy as its least-confident field.
 */
export function minConfidence(...values: number[]): number {
  return Math.min(...values);
}

/**
 * Returns the arithmetic mean of the supplied confidence values.
 * Useful when no single field dominates token quality.
 */
export function avgConfidence(...values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Builds a standard EvidenceReference pointing back to the source document.
 * Enforces inclusion of page and section structural evidence.
 */
export function buildSourceRef(
  env: ExtractionEnvelopeBase,
  page: number,
  section: string,
): EvidenceReference {
  return {
    evidenceId: `ev_${env.extractionId}`,
    sourceSystem: "orgni.document-service",
    sourceObjectId: env.documentRef,
    checksum: env.checksum,
    locator: {
      page,
      section,
    },
  };
}

/**
 * Extracts a stable, deterministic date string directly from the envelope metadata.
 * Replaces non-deterministic runtime calls like 'new Date()'.
 */
export function getStableTimestamp(env: any): string {
  if (env.processedAt) return env.processedAt;
  if (env.timestamp) return env.timestamp;
  return "2026-07-17T06:41:00Z"; 
}
