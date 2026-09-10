/**
 * Orgni product domain model.
 *
 * These types describe the *product* experience an administrator sets up and
 * manages — distinct from the low-level ingestion/model API in `@/lib/api`.
 * The shapes are deliberately UI-shaped and provider-agnostic so a real backend
 * can replace the mock service without the screens changing.
 */

export type ConnectionStatus = "connected" | "not_connected" | "error";

/** How a connection was established. `mock` means the UI flow ran but no real
 *  integration exists yet — surfaced honestly in the UI, never as "production". */
export type ConnectionMode = "mock" | "live";

export interface Organisation {
  /** Present on locally-created orgs; server-backed orgs are keyed by tenant. */
  id?: string;
  name: string;
  workEmail: string;
  website: string;
  createdAt: string;
  /** Onboarding progress — the last completed step index (0 = nothing done). */
  onboardingStep: number;
  onboardingComplete: boolean;
  /** AAD/Entra tenant id of the linked Microsoft 365 org (Teams routing). */
  teamsAadTenantId?: string | null;
}

export interface ConnectionCapabilitySummary {
  /** e.g. "Teams", "Outlook", "Calendar" */
  label: string;
  /** plain-language description of what Orgni can see/do */
  access: string;
}

export interface Connection {
  id: string;
  /** Catalogue key, e.g. "microsoft-365" */
  key: string;
  name: string;
  description: string;
  status: ConnectionStatus;
  mode: ConnectionMode;
  connectedAt: string | null;
  /** Sub-services this connection covers (Teams, Outlook, …). */
  services: ConnectionCapabilitySummary[];
  /** Human-readable permission lines, shown behind "View permissions". */
  permissions: string[];
}

export type KnowledgeCategory =
  | "people"
  | "customers"
  | "suppliers"
  | "projects"
  | "policies"
  | "documents"
  | "processes";

export interface KnowledgeSummary {
  /** Count per category. */
  counts: Record<KnowledgeCategory, number>;
  /** ISO timestamp of the last time Orgni updated its understanding. */
  lastUpdatedAt: string | null;
  /** "idle" before any data, "learning" while processing, "ready" afterwards. */
  state: "idle" | "learning" | "ready";
  /** Files/records the org has added. */
  sources: KnowledgeSource[];
  /** The map, built from the model API. Empty until real data exists. */
  graph: {
    nodes: { id: string; label: string; category: KnowledgeCategory; detail: string }[];
    edges: { source: string; target: string; label: string }[];
  };
}

export interface KnowledgeSource {
  id: string;
  name: string;
  kind: "file" | "connection";
  addedAt: string;
  /** "processing" | "understood" | "failed" */
  state: "processing" | "understood" | "failed";
  origin: string;
}

export interface KnowledgeObject {
  id: string;
  category: KnowledgeCategory;
  name: string;
  subtitle?: string;
  related: { label: string; value: string }[];
}

export type CapabilityKey =
  | "answer_questions"
  | "find_documents"
  | "prepare_work"
  | "schedule_meetings"
  | "draft_emails"
  | "send_emails"
  | "update_systems"
  | "financial_actions";

export interface Capability {
  key: CapabilityKey;
  label: string;
  description: string;
  enabled: boolean;
  /** Advanced capabilities stay collapsed by default. */
  advanced: boolean;
}

export type ApprovalLevel = "none" | "ask_first" | "always";

export type ApprovalCategoryKey =
  | "read_information"
  | "prepare_documents"
  | "schedule_meetings"
  | "send_external_email"
  | "change_records"
  | "financial_actions";

export interface ApprovalPolicy {
  key: ApprovalCategoryKey;
  label: string;
  description: string;
  level: ApprovalLevel;
}

export type AudienceScope =
  | "all_employees"
  | "specific_departments"
  | "specific_teams"
  | "specific_users";

export interface PermissionsState {
  /** Information-access + action rows, keyed by a stable id. */
  access: { key: string; label: string; level: ApprovalLevel; kind: "info" | "action" }[];
  audience: AudienceScope;
}

export type TeamsInstallState = "not_installed" | "installing" | "installed";

export interface TeamsIntegration {
  state: TeamsInstallState;
  mode: ConnectionMode;
  installedAt: string | null;
}

export type ActivityStatus =
  | "completed"
  | "awaiting_approval"
  | "rejected"
  | "in_progress";

export interface OrgniAction {
  id: string;
  /** Short human summary, e.g. "Prepared the Transnet meeting brief". */
  title: string;
  status: ActivityStatus;
  at: string;
  requestedBy: string | null;
  /** Which capability this exercised. */
  capability: CapabilityKey;
  /** Plain-language detail for the drawer. */
  understood: string;
  sourcesUsed: string[];
  actionsPerformed: string[];
  reason: string;
  result: string;
  /** Present when status === "awaiting_approval". */
  approval?: {
    kind: "email" | "record_update" | "financial";
    fields: { label: string; value: string }[];
  };
}

export interface IntelligenceSettings {
  mode: "automatic";
  label: string;
  /** Advanced, future options — surfaced but disabled. */
  advancedProviders: string[];
}

export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "invited" | "active";

export interface Member {
  email: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  /** Small data: URL, resized client-side. */
  avatar: string | null;
  addedAt: string;
}

export interface OrgniState {
  organisation: Organisation | null;
  connections: Connection[];
  knowledge: KnowledgeSummary;
  capabilities: Capability[];
  approvals: ApprovalPolicy[];
  permissions: PermissionsState;
  teams: TeamsIntegration;
  activity: OrgniAction[];
  intelligence: IntelligenceSettings;
  members: Member[];
}
