import { createHash } from "node:crypto";
import type { PrincipalRule, SignalEnvelope } from "@workspace/contracts";

/**
 * Ingestion boundary — converts incoming source material into immutable
 * signal envelopes (ported from services/ingestion-service).
 *
 * Responsibilities: checksums, SignalEnvelope creation, content references
 * and source ACL preservation. It does NOT parse documents, score integrity,
 * resolve entities, or mutate organizational state.
 */

export interface CreateSignalInput {
  signalId: string;
  tenantId: string;
  sourceSystem: string;
  sourceObjectId: string;
  mimeType: string;
  contentRef: string;
  content: Uint8Array | string;
  observedAt?: string;
  occurredAt?: string;
  actorHint?: string;
  metadata?: Record<string, unknown>;
  sourceAcl?: PrincipalRule[];
  sourceVersion?: string;
}

export function checksum(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createSignalEnvelope(input: CreateSignalInput): SignalEnvelope {
  return {
    signalId: input.signalId,
    tenantId: input.tenantId,
    sourceSystem: input.sourceSystem,
    sourceObjectId: input.sourceObjectId,
    sourceVersion: input.sourceVersion,
    observedAt: input.observedAt ?? new Date().toISOString(),
    occurredAt: input.occurredAt,
    actorHint: input.actorHint,
    mimeType: input.mimeType,
    contentRef: input.contentRef,
    checksum: checksum(input.content),
    metadata: input.metadata ?? {},
    sourceAcl: input.sourceAcl ?? [],
  };
}
