/**
 * Orgni product domain — server side.
 *
 * Mirrors the web app's `@/lib/orgni/types`. The API is the source of truth;
 * the web app and the Teams bot both read/write this shape.
 */

export type ApprovalLevel = "none" | "ask_first" | "always";

export interface Organisation {
  tenantId: string;
  name: string;
  workEmail: string;
  website: string;
  onboardingStep: number;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface ConnectionService {
  label: string;
  access: string;
}

export interface Connection {
  id: string;
  key: string;
  name: string;
  description: string;
  status: "connected" | "not_connected" | "error";
  mode: "mock" | "live";
  connectedAt: string | null;
  services: ConnectionService[];
  permissions: string[];
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
  advanced: boolean;
}

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
  access: {
    key: string;
    label: string;
    level: ApprovalLevel;
    kind: "info" | "action";
  }[];
  audience: AudienceScope;
}

export type TeamsInstallState = "not_installed" | "installing" | "installed";

export interface TeamsIntegration {
  state: TeamsInstallState;
  mode: "mock" | "live";
  installedAt: string | null;
}

export type ActivityStatus =
  | "completed"
  | "awaiting_approval"
  | "rejected"
  | "in_progress";

export interface OrgniAction {
  id: string;
  title: string;
  status: ActivityStatus;
  at: string;
  requestedBy: string | null;
  capability: CapabilityKey;
  understood: string;
  sourcesUsed: string[];
  actionsPerformed: string[];
  reason: string;
  result: string;
  approval?: {
    kind: "email" | "record_update" | "financial";
    fields: { label: string; value: string }[];
  };
  /** Where the request came from. */
  source?: "web" | "microsoft_teams";
  /** Bot Framework conversation reference, when the request came from Teams. */
  conversationRef?: unknown;
}

export interface IntelligenceSettings {
  mode: "automatic";
  label: string;
  advancedProviders: string[];
}

export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "invited" | "active";

export interface Member {
  email: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  /** Small data: URL (resized client-side). Optional. */
  avatar: string | null;
  addedAt: string;
}

export interface OrgniState {
  organisation: Organisation | null;
  connections: Connection[];
  capabilities: Capability[];
  approvals: ApprovalPolicy[];
  permissions: PermissionsState;
  teams: TeamsIntegration;
  activity: OrgniAction[];
  intelligence: IntelligenceSettings;
  members: Member[];
}
