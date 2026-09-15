/**
 * Microsoft identity resolution — the backend enforcement of tenant isolation.
 *
 * Two implementations behind one interface, mirroring `./store.ts`:
 *  - InMemoryMicrosoftIdentityStore  — default; process-lifetime, for local dev
 *  - DrizzleMicrosoftIdentityStore   — durable; the `microsoft_connections`,
 *    `external_identities`, `teams_conversations`, `processed_teams_activities`
 *    and `teams_audit_log` tables.
 *
 * `resolveOrgTenant(microsoftTenantId)` is the single choke point every Teams
 * message must pass through before any Orgni data is touched. A Microsoft
 * tenant maps to at most one Orgni tenant — enforced by a unique index in
 * Postgres, and by construction in the in-memory map.
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createDb, type DbHandle } from "@workspace/db/connect";
import {
  microsoftConnections,
  externalIdentities,
  teamsConversations,
  processedTeamsActivities,
  teamsAuditLog,
} from "@workspace/db/schema";
import { config } from "../lib/config";
import { logger } from "../lib/logger";

export interface MicrosoftConnection {
  id: string;
  tenantId: string;
  microsoftTenantId: string;
  status: "connected" | "disconnected";
  installedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIdentity {
  tenantId: string;
  microsoftTenantId: string;
  entraObjectId: string;
  email: string | null;
  displayName: string | null;
}

export interface ConversationInfo {
  tenantId: string;
  conversationId: string;
  microsoftTenantId?: string | null;
  conversationType?: string | null;
  teamId?: string | null;
  channelId?: string | null;
  serviceUrl?: string | null;
}

export type TeamsAuditOutcome =
  | "answered"
  | "awaiting_approval"
  | "denied_unlinked_tenant"
  | "denied_unauthorized"
  | "denied_capability"
  | "duplicate"
  | "error";

export interface TeamsAuditEntry {
  tenantId: string | null;
  microsoftTenantId?: string | null;
  entraObjectId?: string | null;
  conversationId?: string | null;
  activityId?: string | null;
  question?: string | null;
  outcome: TeamsAuditOutcome;
  sourcesUsed?: string[];
  orgniActionId?: string | null;
}

export type LinkResult =
  | { ok: true; connection: MicrosoftConnection }
  | { ok: false; error: "linked_to_other_org"; linkedTenantId: string }
  | { ok: false; error: "no_organisation" };

export interface MicrosoftIdentityStore {
  /** The critical isolation lookup: Microsoft tenant → Orgni tenant, or null. */
  resolveOrgTenant(microsoftTenantId: string): Promise<string | null>;
  getConnection(orgniTenantId: string): Promise<MicrosoftConnection | null>;
  linkTenant(input: {
    orgniTenantId: string;
    microsoftTenantId: string;
    installedBy: string | null;
  }): Promise<LinkResult>;
  unlink(orgniTenantId: string): Promise<void>;

  resolveIdentity(
    microsoftTenantId: string,
    entraObjectId: string,
  ): Promise<ExternalIdentity | null>;
  upsertIdentity(identity: ExternalIdentity): Promise<void>;

  recordConversation(info: ConversationInfo): Promise<void>;

  /** Returns true the first time this (tenant, activity) pair is seen. */
  markProcessed(microsoftTenantId: string, activityId: string): Promise<boolean>;

  logAudit(entry: TeamsAuditEntry): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* In-memory                                                          */
/* ------------------------------------------------------------------ */

class InMemoryMicrosoftIdentityStore implements MicrosoftIdentityStore {
  private readonly connectionsByMsTenant = new Map<string, MicrosoftConnection>();
  private readonly connectionsByOrgTenant = new Map<string, MicrosoftConnection>();
  private readonly identities = new Map<string, ExternalIdentity>();
  private readonly processed = new Set<string>();
  private readonly auditLog: (TeamsAuditEntry & { at: string })[] = [];

  async resolveOrgTenant(microsoftTenantId: string): Promise<string | null> {
    const c = this.connectionsByMsTenant.get(microsoftTenantId);
    return c && c.status === "connected" ? c.tenantId : null;
  }

  async getConnection(orgniTenantId: string): Promise<MicrosoftConnection | null> {
    return this.connectionsByOrgTenant.get(orgniTenantId) ?? null;
  }

  async linkTenant(input: {
    orgniTenantId: string;
    microsoftTenantId: string;
    installedBy: string | null;
  }): Promise<LinkResult> {
    const existing = this.connectionsByMsTenant.get(input.microsoftTenantId);
    if (existing && existing.status === "connected" && existing.tenantId !== input.orgniTenantId) {
      return { ok: false, error: "linked_to_other_org", linkedTenantId: existing.tenantId };
    }
    const now = new Date().toISOString();
    const connection: MicrosoftConnection = {
      id: existing?.id ?? randomUUID(),
      tenantId: input.orgniTenantId,
      microsoftTenantId: input.microsoftTenantId,
      status: "connected",
      installedBy: input.installedBy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.connectionsByMsTenant.set(input.microsoftTenantId, connection);
    this.connectionsByOrgTenant.set(input.orgniTenantId, connection);
    return { ok: true, connection };
  }

  async unlink(orgniTenantId: string): Promise<void> {
    const c = this.connectionsByOrgTenant.get(orgniTenantId);
    if (!c) return;
    c.status = "disconnected";
    c.updatedAt = new Date().toISOString();
  }

  async resolveIdentity(
    microsoftTenantId: string,
    entraObjectId: string,
  ): Promise<ExternalIdentity | null> {
    return this.identities.get(`${microsoftTenantId}:${entraObjectId}`) ?? null;
  }

  async upsertIdentity(identity: ExternalIdentity): Promise<void> {
    this.identities.set(`${identity.microsoftTenantId}:${identity.entraObjectId}`, identity);
  }

  async recordConversation(_info: ConversationInfo): Promise<void> {
    // Best-effort in memory; nothing durable to do.
  }

  async markProcessed(microsoftTenantId: string, activityId: string): Promise<boolean> {
    const key = `${microsoftTenantId}:${activityId}`;
    if (this.processed.has(key)) return false;
    this.processed.add(key);
    // Bound memory use — activity ids are only needed for a short dedupe window.
    if (this.processed.size > 5000) {
      const first = this.processed.values().next().value;
      if (first) this.processed.delete(first);
    }
    return true;
  }

  async logAudit(entry: TeamsAuditEntry): Promise<void> {
    this.auditLog.push({ ...entry, at: new Date().toISOString() });
    if (this.auditLog.length > 1000) this.auditLog.shift();
    logger.info({ audit: entry }, "teams audit");
  }
}

/* ------------------------------------------------------------------ */
/* Drizzle / Postgres                                                 */
/* ------------------------------------------------------------------ */

function rowToConnection(r: typeof microsoftConnections.$inferSelect): MicrosoftConnection {
  return {
    id: r.id,
    tenantId: r.tenantId,
    microsoftTenantId: r.microsoftTenantId,
    status: r.status as "connected" | "disconnected",
    installedBy: r.installedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

class DrizzleMicrosoftIdentityStore implements MicrosoftIdentityStore {
  constructor(private readonly handle: DbHandle) {}

  async resolveOrgTenant(microsoftTenantId: string): Promise<string | null> {
    const rows = await this.handle.db
      .select()
      .from(microsoftConnections)
      .where(eq(microsoftConnections.microsoftTenantId, microsoftTenantId))
      .limit(1);
    const row = rows[0];
    return row && row.status === "connected" ? row.tenantId : null;
  }

  async getConnection(orgniTenantId: string): Promise<MicrosoftConnection | null> {
    const rows = await this.handle.db
      .select()
      .from(microsoftConnections)
      .where(eq(microsoftConnections.tenantId, orgniTenantId))
      .limit(1);
    return rows[0] ? rowToConnection(rows[0]) : null;
  }

  async linkTenant(input: {
    orgniTenantId: string;
    microsoftTenantId: string;
    installedBy: string | null;
  }): Promise<LinkResult> {
    const db = this.handle.db;
    const existingForMs = await db
      .select()
      .from(microsoftConnections)
      .where(eq(microsoftConnections.microsoftTenantId, input.microsoftTenantId))
      .limit(1);
    const other = existingForMs[0];
    if (other && other.status === "connected" && other.tenantId !== input.orgniTenantId) {
      return { ok: false, error: "linked_to_other_org", linkedTenantId: other.tenantId };
    }

    const existingForOrg = await db
      .select()
      .from(microsoftConnections)
      .where(eq(microsoftConnections.tenantId, input.orgniTenantId))
      .limit(1);

    if (existingForOrg[0]) {
      const [updated] = await db
        .update(microsoftConnections)
        .set({
          microsoftTenantId: input.microsoftTenantId,
          status: "connected",
          installedBy: input.installedBy,
          updatedAt: new Date(),
        })
        .where(eq(microsoftConnections.id, existingForOrg[0].id))
        .returning();
      return { ok: true, connection: rowToConnection(updated!) };
    }

    const [created] = await db
      .insert(microsoftConnections)
      .values({
        id: randomUUID(),
        tenantId: input.orgniTenantId,
        microsoftTenantId: input.microsoftTenantId,
        status: "connected",
        installedBy: input.installedBy,
      })
      .returning();
    return { ok: true, connection: rowToConnection(created!) };
  }

  async unlink(orgniTenantId: string): Promise<void> {
    await this.handle.db
      .update(microsoftConnections)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(eq(microsoftConnections.tenantId, orgniTenantId));
  }

  async resolveIdentity(
    microsoftTenantId: string,
    entraObjectId: string,
  ): Promise<ExternalIdentity | null> {
    const rows = await this.handle.db
      .select()
      .from(externalIdentities)
      .where(
        and(
          eq(externalIdentities.microsoftTenantId, microsoftTenantId),
          eq(externalIdentities.entraObjectId, entraObjectId),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      tenantId: r.tenantId,
      microsoftTenantId: r.microsoftTenantId,
      entraObjectId: r.entraObjectId,
      email: r.email,
      displayName: r.displayName,
    };
  }

  async upsertIdentity(identity: ExternalIdentity): Promise<void> {
    const db = this.handle.db;
    const existing = await db
      .select({ id: externalIdentities.id })
      .from(externalIdentities)
      .where(
        and(
          eq(externalIdentities.microsoftTenantId, identity.microsoftTenantId),
          eq(externalIdentities.entraObjectId, identity.entraObjectId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(externalIdentities)
        .set({
          tenantId: identity.tenantId,
          email: identity.email,
          displayName: identity.displayName,
          updatedAt: new Date(),
        })
        .where(eq(externalIdentities.id, existing[0].id));
    } else {
      await db.insert(externalIdentities).values({
        id: randomUUID(),
        tenantId: identity.tenantId,
        provider: "microsoft",
        microsoftTenantId: identity.microsoftTenantId,
        entraObjectId: identity.entraObjectId,
        email: identity.email,
        displayName: identity.displayName,
      });
    }
  }

  async recordConversation(info: ConversationInfo): Promise<void> {
    await this.handle.db
      .insert(teamsConversations)
      .values({
        tenantId: info.tenantId,
        conversationId: info.conversationId,
        microsoftTenantId: info.microsoftTenantId ?? null,
        conversationType: info.conversationType ?? null,
        teamId: info.teamId ?? null,
        channelId: info.channelId ?? null,
        serviceUrl: info.serviceUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [teamsConversations.tenantId, teamsConversations.conversationId],
        set: {
          serviceUrl: info.serviceUrl ?? null,
          lastActivityAt: new Date(),
        },
      });
  }

  async markProcessed(microsoftTenantId: string, activityId: string): Promise<boolean> {
    try {
      await this.handle.db
        .insert(processedTeamsActivities)
        .values({ microsoftTenantId, activityId });
      return true;
    } catch {
      // Unique-constraint violation — already processed.
      return false;
    }
  }

  async logAudit(entry: TeamsAuditEntry): Promise<void> {
    await this.handle.db.insert(teamsAuditLog).values({
      id: randomUUID(),
      tenantId: entry.tenantId,
      microsoftTenantId: entry.microsoftTenantId ?? null,
      entraObjectId: entry.entraObjectId ?? null,
      conversationId: entry.conversationId ?? null,
      activityId: entry.activityId ?? null,
      question: entry.question ?? null,
      outcome: entry.outcome,
      sourcesUsed: entry.sourcesUsed ?? [],
      orgniActionId: entry.orgniActionId ?? null,
    });
  }
}

/* ------------------------------------------------------------------ */

let singleton: MicrosoftIdentityStore | null = null;

export function getMicrosoftIdentityStore(): MicrosoftIdentityStore {
  if (singleton) return singleton;
  if (config.DATABASE_URL) {
    try {
      const handle = createDb(config.DATABASE_URL);
      singleton = new DrizzleMicrosoftIdentityStore(handle);
      logger.info("microsoft identity store: postgres");
    } catch (err) {
      logger.error({ err }, "microsoft identity store: postgres init failed, using memory");
      singleton = new InMemoryMicrosoftIdentityStore();
    }
  } else {
    singleton = new InMemoryMicrosoftIdentityStore();
    logger.info("microsoft identity store: in-memory (set DATABASE_URL to persist)");
  }
  return singleton;
}

/** Test hook. */
export function __resetMicrosoftIdentityStore() {
  singleton = null;
}
