export type PrincipalEffect = "ALLOW" | "DENY";
export type TokenKind =
  "EVENT" | "ENTITY" | "RELATION" | "STATE" | "POLICY" | "QUERY" | "ACTION";
export type EpistemicStatus =
  "OBSERVED" | "ASSERTED" | "INFERRED" | "PREDICTED" | "DISPUTED";

export interface PrincipalRule {
  principalId: string;
  principalType: "USER" | "GROUP" | "ROLE" | "SERVICE" | "PUBLIC";
  effect: PrincipalEffect;
  actions: string[];
  conditions?: Record<string, unknown>;
}

export interface EvidenceReference {
  evidenceId: string;
  signalId?: string;
  sourceSystem: string;
  sourceObjectId: string;
  locator?: {
    page?: number;
    section?: string;
    range?: string;
    path?: string;
  };
  checksum?: string;
  excerpt?: string;
}

export interface SignalEnvelope {
  signalId: string;
  tenantId: string;
  sourceSystem: string;
  sourceObjectId: string;
  sourceVersion?: string;
  observedAt: string;
  occurredAt?: string;
  actorHint?: string;
  mimeType: string;
  contentRef: string;
  checksum: string;
  metadata: Record<string, unknown>;
  sourceAcl: PrincipalRule[];
}

export interface OrganizationalToken {
  tokenId: string;
  tenantId: string;
  tokenKind: TokenKind;
  eventType?: string;
  subjectId?: string;
  predicate?: string;
  objectId?: string;
  scalarValue?: unknown;
  validTime?: {
    from: string;
    to?: string;
  };
  transactionTime: string;
  sourceRefs: EvidenceReference[];
  confidence: number;
  epistemicStatus: EpistemicStatus;
  visibility: PrincipalRule[];
  actionScope: string[];
  retentionClass: string;
  payloadRef?: string;
  embeddingRef?: string;
}

export interface CanonicalEvent {
  eventId: string;
  tenantId: string;
  eventType: string;
  subjectId?: string;
  objectId?: string;
  occurredAt?: string;
  transactionTime: string;
  payload: Record<string, unknown>;
  sourceRefs: EvidenceReference[];
  confidence: number;
  epistemicStatus: EpistemicStatus;
  schemaVersion: string;
  extractorVersion?: string;
}

export interface Entity {
  entityId: string;
  tenantId: string;
  entityType: string;
  name?: string;
  aliases: string[];
  attributes: Record<string, unknown>;
  sourceRefs: EvidenceReference[];
  confidence: number;
  schemaVersion: string;
}

export interface Relation {
  relationId: string;
  tenantId: string;
  subjectId: string;
  predicate: string;
  objectId: string;
  attributes: Record<string, unknown>;
  sourceRefs: EvidenceReference[];
  confidence: number;
  schemaVersion: string;
}

export interface StateTransition {
  transitionId: string;
  tenantId: string;
  fromVersion: number;
  toVersion: number;
  eventIds: string[];
  createdAt: string;
  summary: string;
}

export interface StateSnapshot {
  snapshotId: string;
  tenantId: string;
  stateVersion: number;
  createdAt: string;
  eventWatermark: string;
  state: Record<string, unknown>;
  conflicts: Conflict[];
}

export interface Conflict {
  conflictId: string;
  tenantId: string;
  conflictType: string;
  subjectId?: string;
  eventIds: string[];
  evidence: EvidenceReference[];
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

export interface Episode {
  episodeId: string;
  tenantId: string;
  title: string;
  eventIds: string[];
  evidence: EvidenceReference[];
  startedAt?: string;
  endedAt?: string;
  summary: string;
  confidence: number;
}

export interface ContextResponse {
  queryId: string;
  tenantId: string;
  stateVersion: number;
  answer?: string;
  stateSlice: Record<string, unknown>;
  evidence: EvidenceReference[];
  inferences: Array<Record<string, unknown>>;
  conflicts: Conflict[];
  confidence: number;
  limitations: string[];
  authorizedActions: Array<Record<string, unknown>>;
}

export interface ActionRequest {
  actionRequestId: string;
  tenantId: string;
  actionType: string;
  requestedBy: string;
  requestedAt: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  evidence: EvidenceReference[];
  status:
    | "REQUESTED"
    | "AUTHORIZED"
    | "REJECTED"
    | "REQUIRES_APPROVAL"
    | "EXECUTED"
    | "FAILED";
}

export function isCanonicalEvent(value: unknown): value is CanonicalEvent {
  const candidate = value as CanonicalEvent;
  return Boolean(
    candidate &&
    typeof candidate.eventId === "string" &&
    typeof candidate.tenantId === "string" &&
    typeof candidate.eventType === "string" &&
    typeof candidate.transactionTime === "string" &&
    typeof candidate.schemaVersion === "string" &&
    typeof candidate.confidence === "number" &&
    Array.isArray(candidate.sourceRefs),
  );
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
