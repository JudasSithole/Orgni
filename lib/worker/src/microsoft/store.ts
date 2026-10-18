/**
 * Drizzle-backed SyncStore implementation.
 *
 * Reads/writes the `microsoft_sync_tokens` and `microsoft_sync_cursors` tables
 * (see lib/db/src/schema/microsoft.ts). The encryption key is injected by the
 * caller — the store itself never touches it, so the store stays testable with
 * a fake db.
 *
 * Persistence is optional: when no DATABASE_URL is configured the worker has
 * no db, and this store is simply never constructed. The sync job is wired
 * defensively — a missing store means "no tenants connected", not a crash.
 */

import type { TokenEnvelope } from "./tokens";
import type { SyncCursor, SyncStore, SyncRunResult } from "./sync";

// drizzle-orm and @workspace/db/schema are lazily imported at runtime so the
// module loads in environments that don't install them (e.g. tests).
export interface SyncStoreDeps {
  db: any;
  driveId?: string;
}

/** Drizzle-backed SyncStore. Lazily loads drizzle-orm so the module imports
 * cleanly in environments (tests) that don't install it. */
async function loadDrizzleStore(deps: SyncStoreDeps): Promise<SyncStore> {
  // @ts-ignore - drizzle-orm is a runtime-only dep of @workspace/db, loaded lazily
  const drizzle = await import("drizzle-orm");
  // @ts-ignore - @workspace/db/schema is loaded lazily at runtime
  const schema = await import("@workspace/db/schema");
  const eq = (drizzle as any).eq as (col: any, val: any) => any;
  const { microsoftSyncCursors, microsoftSyncTokens } = schema as {
    microsoftSyncCursors: any;
    microsoftSyncTokens: any;
  };
  const { db, driveId } = deps;
  return {
    async getCursor(tenantId) {
      const [row] = await db.db
        .select()
        .from(microsoftSyncCursors)
        .where(eq(microsoftSyncCursors.tenantId, tenantId));
      if (!row) return null;
      return {
        deltaLink: row.deltaLink ?? "",
        tokenFingerprint: row.tokenFingerprint ?? "",
        updatedAt: row.updatedAt.toISOString(),
      };
    },
    async saveCursor(tenantId, cursor) {
      await db.db
        .insert(microsoftSyncCursors)
        .values({
          tenantId,
          driveId: driveId ?? null,
          deltaLink: cursor.deltaLink || null,
          tokenFingerprint: cursor.tokenFingerprint || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: microsoftSyncCursors.tenantId,
          set: {
            driveId: driveId ?? null,
            deltaLink: cursor.deltaLink || null,
            tokenFingerprint: cursor.tokenFingerprint || null,
            updatedAt: new Date(),
          },
        });
    },
    async getTokenEnvelope(tenantId) {
      const [row] = await db.db
        .select()
        .from(microsoftSyncTokens)
        .where(eq(microsoftSyncTokens.tenantId, tenantId));
      if (!row) return null;
      return (row.envelope as TokenEnvelope) ?? null;
    },
    async saveTokenEnvelope(tenantId, envelope) {
      await db.db
        .insert(microsoftSyncTokens)
        .values({
          tenantId,
          envelope: envelope as unknown as Record<string, unknown>,
          keyId: envelope.keyId ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: microsoftSyncTokens.tenantId,
          set: {
            envelope: envelope as unknown as Record<string, unknown>,
            keyId: envelope.keyId ?? null,
            updatedAt: new Date(),
          },
        });
    },
    async markSyncStarted(tenantId) {
      await db.db
        .update(microsoftSyncCursors)
        .set({ updatedAt: new Date() })
        .where(eq(microsoftSyncCursors.tenantId, tenantId));
    },
    async markSyncComplete(tenantId, _result) {
      await db.db
        .update(microsoftSyncCursors)
        .set({ updatedAt: new Date() })
        .where(eq(microsoftSyncCursors.tenantId, tenantId));
    },
  };
}

export async function createSyncStore(deps: SyncStoreDeps): Promise<SyncStore> {
  return loadDrizzleStore(deps);
}

/** In-memory SyncStore for tests — no Postgres needed. */
export function createMemorySyncStore(): SyncStore & {
  envelopes: Map<string, TokenEnvelope>;
  cursors: Map<string, SyncCursor>;
} {
  const envelopes = new Map<string, TokenEnvelope>();
  const cursors = new Map<string, SyncCursor>();
  return {
    envelopes,
    cursors,
    async getCursor(t) {
      return cursors.get(t) ?? null;
    },
    async saveCursor(t, c) {
      cursors.set(t, c);
    },
    async getTokenEnvelope(t) {
      return envelopes.get(t) ?? null;
    },
    async saveTokenEnvelope(t, e) {
      envelopes.set(t, e);
    },
    async markSyncStarted(t) {
      // no-op in memory; tests assert call counts separately if needed
    },
    async markSyncComplete(t, _r) {
      // no-op in memory
    },
  };
}