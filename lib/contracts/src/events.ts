import type {
  CanonicalEvent,
  EpistemicStatus,
  EvidenceReference,
} from "./schemas.js";
import { clampConfidence } from "./schemas.js";

export const EVENT_SCHEMA_VERSION = "orgni.canonical-event.v1";

export const DocumentEventTypes = {
  Received: "DocumentReceived",
  Parsed: "DocumentParsed",
  IntegrityEvaluated: "DocumentIntegrityEvaluated",
  Approved: "DocumentApproved",
  FlaggedForReview: "DocumentFlaggedForReview",
  Blocked: "DocumentBlocked",
  FieldExtracted: "FieldExtracted",
  ValidationIssueDetected: "ValidationIssueDetected",
} as const;

export interface BuildEventInput {
  eventId: string;
  tenantId: string;
  eventType: string;
  subjectId?: string;
  objectId?: string;
  occurredAt?: string;
  transactionTime?: string;
  payload?: Record<string, unknown>;
  sourceRefs?: EvidenceReference[];
  confidence?: number;
  epistemicStatus?: EpistemicStatus;
  extractorVersion?: string;
}

export function buildCanonicalEvent(input: BuildEventInput): CanonicalEvent {
  return {
    eventId: input.eventId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    subjectId: input.subjectId,
    objectId: input.objectId,
    occurredAt: input.occurredAt,
    transactionTime: input.transactionTime ?? new Date().toISOString(),
    payload: input.payload ?? {},
    sourceRefs: input.sourceRefs ?? [],
    confidence: clampConfidence(input.confidence ?? 1),
    epistemicStatus: input.epistemicStatus ?? "OBSERVED",
    schemaVersion: EVENT_SCHEMA_VERSION,
    extractorVersion: input.extractorVersion,
  };
}
