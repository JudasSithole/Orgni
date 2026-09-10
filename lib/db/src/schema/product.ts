/**
 * Orgni product state — the organisation-facing configuration an administrator
 * sets up (organisation profile, connections, capabilities, approval policies,
 * permissions, Teams integration) and the activity log of what Orgni has done.
 *
 * This is distinct from the document-ingestion tables: it's the "control
 * centre" data. Everything is tenant-scoped. The API server keeps an in-memory
 * copy when DATABASE_URL is unset; these tables are the durable form.
 */
import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const organisations = pgTable("organisations", {
  /** One organisation per tenant — tenant id is the primary key. */
  tenantId: text("tenant_id").primaryKey(),
  name: text("name").notNull(),
  workEmail: text("work_email").notNull(),
  website: text("website").notNull().default(""),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  /** AAD/Entra tenant id of the linked Microsoft 365 org (for Teams routing). */
  teamsAadTenantId: text("teams_aad_tenant_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const connections = pgTable(
  "connections",
  {
    id: text("id").notNull(),
    tenantId: text("tenant_id").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** "connected" | "not_connected" | "error" */
    status: text("status").notNull().default("not_connected"),
    /** "mock" | "live" */
    mode: text("mode").notNull().default("mock"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    services: jsonb("services").notNull().default([]),
    permissions: jsonb("permissions").notNull().default([]),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.key] }),
    index("connections_tenant_idx").on(t.tenantId),
  ],
);

export const capabilities = pgTable(
  "capabilities",
  {
    tenantId: text("tenant_id").notNull(),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] })],
);

export const approvalPolicies = pgTable(
  "approval_policies",
  {
    tenantId: text("tenant_id").notNull(),
    key: text("key").notNull(),
    /** "none" | "ask_first" | "always" */
    level: text("level").notNull().default("ask_first"),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] })],
);

export const permissionsState = pgTable("permissions_state", {
  tenantId: text("tenant_id").primaryKey(),
  /** [{ key, label, level, kind }] */
  access: jsonb("access").notNull().default([]),
  audience: text("audience").notNull().default("all_employees"),
});

export const teamsIntegration = pgTable("teams_integration", {
  tenantId: text("tenant_id").primaryKey(),
  /** "not_installed" | "installing" | "installed" */
  state: text("state").notNull().default("not_installed"),
  /** "mock" | "live" */
  mode: text("mode").notNull().default("mock"),
  installedAt: timestamp("installed_at", { withTimezone: true }),
  /** Teams conversation reference for proactive messages, when known. */
  serviceUrl: text("service_url"),
  conversationRef: jsonb("conversation_ref"),
});

export const orgniActions = pgTable(
  "orgni_actions",
  {
    id: text("id").notNull(),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    /** "completed" | "awaiting_approval" | "rejected" | "in_progress" */
    status: text("status").notNull().default("in_progress"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    requestedBy: text("requested_by"),
    capability: text("capability").notNull(),
    understood: text("understood").notNull().default(""),
    sourcesUsed: jsonb("sources_used").notNull().default([]),
    actionsPerformed: jsonb("actions_performed").notNull().default([]),
    reason: text("reason").notNull().default(""),
    result: text("result").notNull().default(""),
    /** { kind, fields:[{label,value}] } when status === awaiting_approval */
    approval: jsonb("approval"),
    /** Teams conversation reference so a decision can be posted back. */
    conversationRef: jsonb("conversation_ref"),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    index("orgni_actions_tenant_idx").on(t.tenantId),
  ],
);

export const members = pgTable(
  "members",
  {
    tenantId: text("tenant_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    /** "owner" | "admin" | "member" */
    role: text("role").notNull().default("member"),
    /** "invited" | "active" */
    status: text("status").notNull().default("invited"),
    /** Small data: URL for the avatar, or null. */
    avatar: text("avatar"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.email] }),
    index("members_tenant_idx").on(t.tenantId),
  ],
);

export type MemberRow = typeof members.$inferSelect;
export type OrganisationRow = typeof organisations.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
export type CapabilityRow = typeof capabilities.$inferSelect;
export type ApprovalPolicyRow = typeof approvalPolicies.$inferSelect;
export type PermissionsStateRow = typeof permissionsState.$inferSelect;
export type TeamsIntegrationRow = typeof teamsIntegration.$inferSelect;
export type OrgniActionRow = typeof orgniActions.$inferSelect;
