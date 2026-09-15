/**
 * Microsoft identity — the tables that make Teams tenant isolation a backend
 * guarantee rather than a prompt-level convention.
 *
 * Resolution chain: Microsoft tenant id → `microsoftConnections` (unique) →
 * Orgni tenant id → `externalIdentities` (unique per Microsoft tenant+user) →
 * Orgni member. Every retrieval the engine does is scoped by the resolved
 * Orgni tenant id — never by email domain, never by client-supplied org id.
 */
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * One row per connected Microsoft 365 tenant. `microsoftTenantId` is UNIQUE —
 * a Microsoft tenant can be linked to exactly one Orgni organisation. This is
 * the hard isolation boundary: resolving it is the only way a Teams message
 * reaches an Orgni tenant id.
 */
export const microsoftConnections = pgTable(
  "microsoft_connections",
  {
    id: text("id").primaryKey(),
    /** Orgni tenant id (organisations.tenant_id). */
    tenantId: text("orgni_tenant_id").notNull(),
    microsoftTenantId: text("microsoft_tenant_id").notNull(),
    /** "connected" | "disconnected" */
    status: text("status").notNull().default("connected"),
    /** Email of the admin who completed the connect flow. */
    installedBy: text("installed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("microsoft_connections_ms_tenant_uidx").on(t.microsoftTenantId),
    index("microsoft_connections_tenant_idx").on(t.tenantId),
  ],
);

/**
 * Maps a Microsoft/Entra user (scoped to their Microsoft tenant) to an Orgni
 * member. Looked up on every Teams message so a reply only ever uses the
 * permissions of a real, resolved Orgni user — never an assumed one.
 */
export const externalIdentities = pgTable(
  "external_identities",
  {
    id: text("id").primaryKey(),
    tenantId: text("orgni_tenant_id").notNull(),
    provider: text("provider").notNull().default("microsoft"),
    microsoftTenantId: text("microsoft_tenant_id").notNull(),
    entraObjectId: text("entra_object_id").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("external_identities_ms_user_uidx").on(
      t.provider,
      t.microsoftTenantId,
      t.entraObjectId,
    ),
    index("external_identities_tenant_idx").on(t.tenantId),
  ],
);

/**
 * Teams conversations Orgni has seen — audit trail plus what's needed to post
 * a proactive message later (approvals resolved from the web, etc.).
 */
export const teamsConversations = pgTable(
  "teams_conversations",
  {
    tenantId: text("orgni_tenant_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    microsoftTenantId: text("microsoft_tenant_id"),
    /** "personal" | "channel" | "groupChat" */
    conversationType: text("conversation_type"),
    teamId: text("team_id"),
    channelId: text("channel_id"),
    serviceUrl: text("service_url"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.conversationId] }),
    index("teams_conversations_tenant_idx").on(t.tenantId),
  ],
);

/**
 * Idempotency guard — Bot Framework can redeliver an activity. Insert before
 * processing; a conflict means "already handled, skip".
 */
export const processedTeamsActivities = pgTable(
  "processed_teams_activities",
  {
    microsoftTenantId: text("microsoft_tenant_id").notNull(),
    activityId: text("activity_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.microsoftTenantId, t.activityId] })],
);

/**
 * Audit log for every Teams request Orgni resolved — kept distinct from
 * `orgniActions` (the product activity feed) because it must record identity
 * resolution and outcome even when the engine never runs (unlinked tenant,
 * unauthorized user, malformed request).
 */
export const teamsAuditLog = pgTable(
  "teams_audit_log",
  {
    id: text("id").primaryKey(),
    /** Null when the Microsoft tenant didn't resolve to an Orgni org. */
    tenantId: text("orgni_tenant_id"),
    microsoftTenantId: text("microsoft_tenant_id"),
    entraObjectId: text("entra_object_id"),
    conversationId: text("conversation_id"),
    activityId: text("activity_id"),
    question: text("question"),
    /** "answered" | "denied_unlinked_tenant" | "denied_unauthorized" | "error" */
    outcome: text("outcome").notNull(),
    /** Ids of sources/facts used to ground the reply, when applicable. */
    sourcesUsed: jsonb("sources_used").notNull().default([]),
    orgniActionId: text("orgni_action_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("teams_audit_log_tenant_idx").on(t.tenantId)],
);

export type MicrosoftConnectionRow = typeof microsoftConnections.$inferSelect;
export type ExternalIdentityRow = typeof externalIdentities.$inferSelect;
export type TeamsConversationRow = typeof teamsConversations.$inferSelect;
export type TeamsAuditLogRow = typeof teamsAuditLog.$inferSelect;
