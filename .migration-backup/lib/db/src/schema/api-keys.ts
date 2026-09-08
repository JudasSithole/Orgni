/**
 * API keys — long-lived credentials that let external systems (AI agents,
 * back-end services) call the Orgni API on behalf of a tenant.
 *
 * The secret itself is never stored: only a SHA-256 hash and a short display
 * prefix. The full key is shown to the creator exactly once, at creation time.
 */
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    /** Human label, e.g. "Support agent (prod)". */
    name: text("name").notNull(),
    /** First chars of the key for display, e.g. "orgni_sk_ab12". Never the full key. */
    keyPrefix: text("key_prefix").notNull(),
    /** SHA-256 of the full key. The secret is never persisted in the clear. */
    keyHash: text("key_hash").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Set when revoked; a revoked key never authenticates. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("api_keys_tenant_idx").on(table.tenantId),
    index("api_keys_hash_idx").on(table.keyHash),
  ],
);

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
