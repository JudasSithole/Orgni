/**
 * Product-state store.
 *
 * Two implementations behind one interface:
 *  - InMemoryProductStore  — default; per-tenant state in a Map. Survives for
 *    the life of the process. Used when DATABASE_URL is unset.
 *  - DrizzleProductStore   — durable; reads/writes the `product` tables.
 *
 * Route handlers do read-modify-write on the whole `OrgniState` for a tenant,
 * so the interface is intentionally just get/put.
 */
import { and, eq } from "drizzle-orm";
import { createDb, type DbHandle } from "@workspace/db/connect";
import {
  organisations,
  connections as connectionsTable,
  capabilities as capabilitiesTable,
  approvalPolicies as approvalsTable,
  permissionsState as permissionsTable,
  teamsIntegration as teamsTable,
  orgniActions as actionsTable,
  members as membersTable,
} from "@workspace/db/schema";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import {
  defaultApprovals,
  defaultCapabilities,
  defaultIntelligence,
  defaultPermissions,
} from "./defaults";
import type { Capability, OrgniAction, OrgniState } from "./types";

export interface ProductStore {
  /** Full state for a tenant, seeded with defaults if it doesn't exist yet. */
  getState(tenantId: string): Promise<OrgniState>;
  /** Replace the tenant's state. */
  putState(tenantId: string, state: OrgniState): Promise<void>;
  /** Every tenant id that has product state — used for Teams routing lookups. */
  listTenantIds(): Promise<string[]>;
  readonly durable: boolean;
}

export function emptyState(): OrgniState {
  return {
    organisation: null,
    connections: [],
    capabilities: defaultCapabilities(),
    approvals: defaultApprovals(),
    permissions: defaultPermissions(),
    teams: { state: "not_installed", mode: "mock", installedAt: null },
    activity: [],
    intelligence: defaultIntelligence(),
    members: [],
  };
}

/** Merge stored capability toggles onto the current default definitions. */
export function mergeCapabilities(stored: { key: string; enabled: boolean }[]): Capability[] {
  const byKey = new Map(stored.map((c) => [c.key, c.enabled]));
  return defaultCapabilities().map((c) =>
    byKey.has(c.key) ? { ...c, enabled: byKey.get(c.key)! } : c,
  );
}

/* ------------------------------------------------------------------ */
/* In-memory                                                          */
/* ------------------------------------------------------------------ */

class InMemoryProductStore implements ProductStore {
  readonly durable = false;
  private readonly map = new Map<string, OrgniState>();

  async getState(tenantId: string): Promise<OrgniState> {
    const existing = this.map.get(tenantId);
    if (existing) return structuredClone(existing);
    const seeded = emptyState();
    this.map.set(tenantId, seeded);
    return structuredClone(seeded);
  }

  async putState(tenantId: string, state: OrgniState): Promise<void> {
    this.map.set(tenantId, structuredClone(state));
  }

  async listTenantIds(): Promise<string[]> {
    return [...this.map.keys()];
  }
}

/* ------------------------------------------------------------------ */
/* Drizzle / Postgres                                                 */
/* ------------------------------------------------------------------ */

class DrizzleProductStore implements ProductStore {
  readonly durable = true;
  constructor(private readonly handle: DbHandle) {}

  async getState(tenantId: string): Promise<OrgniState> {
    const db = this.handle.db;
    const [org, conns, caps, apps, perms, teams, acts, mems] = await Promise.all([
      db.select().from(organisations).where(eq(organisations.tenantId, tenantId)).limit(1),
      db.select().from(connectionsTable).where(eq(connectionsTable.tenantId, tenantId)),
      db.select().from(capabilitiesTable).where(eq(capabilitiesTable.tenantId, tenantId)),
      db.select().from(approvalsTable).where(eq(approvalsTable.tenantId, tenantId)),
      db.select().from(permissionsTable).where(eq(permissionsTable.tenantId, tenantId)).limit(1),
      db.select().from(teamsTable).where(eq(teamsTable.tenantId, tenantId)).limit(1),
      db.select().from(actionsTable).where(eq(actionsTable.tenantId, tenantId)),
      db.select().from(membersTable).where(eq(membersTable.tenantId, tenantId)),
    ]);

    const base = emptyState();
    const organisation = org[0]
      ? {
          tenantId,
          name: org[0].name,
          workEmail: org[0].workEmail,
          website: org[0].website,
          onboardingStep: org[0].onboardingStep,
          onboardingComplete: org[0].onboardingComplete,
          createdAt: org[0].createdAt.toISOString(),
        }
      : null;

    const approvals = apps.length
      ? base.approvals.map((a) => {
          const row = apps.find((r) => r.key === a.key);
          return row ? { ...a, level: row.level as typeof a.level } : a;
        })
      : base.approvals;

    return {
      organisation,
      connections: conns.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        description: c.description,
        status: c.status as "connected" | "not_connected" | "error",
        mode: c.mode as "mock" | "live",
        connectedAt: c.connectedAt ? c.connectedAt.toISOString() : null,
        services: (c.services as { label: string; access: string }[]) ?? [],
        permissions: (c.permissions as string[]) ?? [],
      })),
      capabilities: caps.length ? mergeCapabilities(caps) : base.capabilities,
      approvals,
      permissions: perms[0]
        ? {
            access: (perms[0].access as OrgniState["permissions"]["access"]) ?? base.permissions.access,
            audience: perms[0].audience as OrgniState["permissions"]["audience"],
          }
        : base.permissions,
      teams: teams[0]
        ? {
            state: teams[0].state as OrgniState["teams"]["state"],
            mode: teams[0].mode as "mock" | "live",
            installedAt: teams[0].installedAt ? teams[0].installedAt.toISOString() : null,
          }
        : base.teams,
      activity: acts
        .map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status as OrgniAction["status"],
          at: a.at.toISOString(),
          requestedBy: a.requestedBy,
          capability: a.capability as OrgniAction["capability"],
          understood: a.understood,
          sourcesUsed: (a.sourcesUsed as string[]) ?? [],
          actionsPerformed: (a.actionsPerformed as string[]) ?? [],
          reason: a.reason,
          result: a.result,
          approval: (a.approval as OrgniAction["approval"]) ?? undefined,
          source: (a.source as OrgniAction["source"]) ?? "web",
          conversationRef: a.conversationRef ?? undefined,
        }))
        .sort((x, y) => y.at.localeCompare(x.at)),
      intelligence: base.intelligence,
      members: mems
        .map((m) => ({
          email: m.email,
          name: m.name,
          role: m.role as OrgniState["members"][number]["role"],
          status: m.status as OrgniState["members"][number]["status"],
          avatar: m.avatar,
          addedAt: m.addedAt.toISOString(),
        }))
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
    };
  }

  async putState(tenantId: string, state: OrgniState): Promise<void> {
    const db = this.handle.db;
    await db.transaction(async (tx) => {
      if (state.organisation) {
        const o = state.organisation;
        await tx
          .insert(organisations)
          .values({
            tenantId,
            name: o.name,
            workEmail: o.workEmail,
            website: o.website,
            onboardingStep: o.onboardingStep,
            onboardingComplete: o.onboardingComplete,
          })
          .onConflictDoUpdate({
            target: organisations.tenantId,
            set: {
              name: o.name,
              workEmail: o.workEmail,
              website: o.website,
              onboardingStep: o.onboardingStep,
              onboardingComplete: o.onboardingComplete,
              updatedAt: new Date(),
            },
          });
      }

      await tx.delete(connectionsTable).where(eq(connectionsTable.tenantId, tenantId));
      if (state.connections.length) {
        await tx.insert(connectionsTable).values(
          state.connections.map((c) => ({
            id: c.id,
            tenantId,
            key: c.key,
            name: c.name,
            description: c.description,
            status: c.status,
            mode: c.mode,
            connectedAt: c.connectedAt ? new Date(c.connectedAt) : null,
            services: c.services,
            permissions: c.permissions,
          })),
        );
      }

      await tx.delete(capabilitiesTable).where(eq(capabilitiesTable.tenantId, tenantId));
      await tx.insert(capabilitiesTable).values(
        state.capabilities.map((c) => ({ tenantId, key: c.key, enabled: c.enabled })),
      );

      await tx.delete(approvalsTable).where(eq(approvalsTable.tenantId, tenantId));
      await tx.insert(approvalsTable).values(
        state.approvals.map((a) => ({ tenantId, key: a.key, level: a.level })),
      );

      await tx
        .insert(permissionsTable)
        .values({
          tenantId,
          access: state.permissions.access,
          audience: state.permissions.audience,
        })
        .onConflictDoUpdate({
          target: permissionsTable.tenantId,
          set: { access: state.permissions.access, audience: state.permissions.audience },
        });

      await tx
        .insert(teamsTable)
        .values({
          tenantId,
          state: state.teams.state,
          mode: state.teams.mode,
          installedAt: state.teams.installedAt ? new Date(state.teams.installedAt) : null,
        })
        .onConflictDoUpdate({
          target: teamsTable.tenantId,
          set: {
            state: state.teams.state,
            mode: state.teams.mode,
            installedAt: state.teams.installedAt ? new Date(state.teams.installedAt) : null,
          },
        });

      await tx.delete(actionsTable).where(eq(actionsTable.tenantId, tenantId));
      if (state.activity.length) {
        await tx.insert(actionsTable).values(
          state.activity.map((a) => ({
            id: a.id,
            tenantId,
            title: a.title,
            status: a.status,
            at: new Date(a.at),
            requestedBy: a.requestedBy,
            capability: a.capability,
            understood: a.understood,
            sourcesUsed: a.sourcesUsed,
            actionsPerformed: a.actionsPerformed,
            reason: a.reason,
            result: a.result,
            approval: a.approval ?? null,
            source: a.source ?? "web",
            conversationRef: a.conversationRef ?? null,
          })),
        );
      }

      await tx.delete(membersTable).where(eq(membersTable.tenantId, tenantId));
      if (state.members.length) {
        await tx.insert(membersTable).values(
          state.members.map((m) => ({
            tenantId,
            email: m.email,
            name: m.name,
            role: m.role,
            status: m.status,
            avatar: m.avatar ?? null,
            addedAt: new Date(m.addedAt),
          })),
        );
      }
    });
  }

  async listTenantIds(): Promise<string[]> {
    const rows = await this.handle.db
      .select({ tenantId: organisations.tenantId })
      .from(organisations);
    return rows.map((r) => r.tenantId);
  }
}

/* ------------------------------------------------------------------ */

let singleton: ProductStore | null = null;

export function getProductStore(): ProductStore {
  if (singleton) return singleton;
  if (config.DATABASE_URL) {
    try {
      const handle = createDb(config.DATABASE_URL);
      singleton = new DrizzleProductStore(handle);
      logger.info("product store: postgres");
    } catch (err) {
      logger.error({ err }, "product store: postgres init failed, using memory");
      singleton = new InMemoryProductStore();
    }
  } else {
    singleton = new InMemoryProductStore();
    logger.info("product store: in-memory (set DATABASE_URL to persist)");
  }
  return singleton;
}

/** Test hook. */
export function __resetProductStore() {
  singleton = null;
}
