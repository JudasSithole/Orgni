/**
 * Document-pipeline repository.
 *
 * The one place that reads/writes sources, tokens, and facts. Every method takes
 * an explicit tenantId and scopes its query by it — callers cannot accidentally
 * cross tenants. Writes for one document are wrapped in a transaction so a
 * source and its tokens/facts land together or not at all.
 */
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";
import {
  facts,
  reviews,
  sources,
  tokens,
  type FactRow,
  type IngestionState,
  type ReviewRow,
  type SourceRow,
  type TokenRow,
} from "./schema/documents";
import { apiKeys, type ApiKeyRow } from "./schema/api-keys";
import { isNull } from "drizzle-orm";

export type Database = NodePgDatabase<typeof schema>;

export interface PersistDocumentInput {
  source: {
    sourceId: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    checksum: string;
    byteSize: number;
    state: IngestionState;
    documentType?: string | null;
    confidence?: number | null;
    sourceAcl?: unknown[];
    warnings?: string[];
    errors?: string[];
    duplicateOf?: string | null;
    uploadedAt: Date;
  };
  tokens: Array<Record<string, unknown>>;
  facts?: { schemaVersion: string; result: Record<string, unknown> } | null;
}

export interface StoredDocument {
  source: SourceRow;
  tokens: TokenRow[];
  facts: FactRow | null;
  reviews: ReviewRow[];
}

export function createRepository(db: Database) {
  return {
    /**
     * Persist a processed document (source + tokens + facts) atomically.
     * Re-persisting the same source id replaces its tokens/facts, so a
     * reprocess is idempotent rather than additive.
     */
    async persistDocument(input: PersistDocumentInput): Promise<void> {
      await db.transaction(async (tx) => {
        await tx
          .insert(sources)
          .values({
            sourceId: input.source.sourceId,
            tenantId: input.source.tenantId,
            filename: input.source.filename,
            mimeType: input.source.mimeType,
            checksum: input.source.checksum,
            byteSize: input.source.byteSize,
            state: input.source.state,
            documentType: input.source.documentType ?? null,
            confidence: input.source.confidence ?? null,
            sourceAcl: input.source.sourceAcl ?? [],
            warnings: input.source.warnings ?? [],
            errors: input.source.errors ?? [],
            duplicateOf: input.source.duplicateOf ?? null,
            uploadedAt: input.source.uploadedAt,
          })
          .onConflictDoUpdate({
            target: sources.sourceId,
            set: {
              state: input.source.state,
              documentType: input.source.documentType ?? null,
              confidence: input.source.confidence ?? null,
              warnings: input.source.warnings ?? [],
              errors: input.source.errors ?? [],
            },
          });

        await tx
          .delete(tokens)
          .where(eq(tokens.sourceId, input.source.sourceId));
        if (input.tokens.length > 0) {
          await tx.insert(tokens).values(
            input.tokens.map((token) => ({
              tokenId: String(token["tokenId"]),
              tenantId: input.source.tenantId,
              sourceId: input.source.sourceId,
              tokenKind: String(token["tokenKind"]),
              token,
            })),
          );
        }

        await tx.delete(facts).where(eq(facts.sourceId, input.source.sourceId));
        if (input.facts) {
          await tx.insert(facts).values({
            tenantId: input.source.tenantId,
            sourceId: input.source.sourceId,
            schemaVersion: input.facts.schemaVersion,
            result: input.facts.result,
          });
        }
      });
    },

    /** Look up an existing source by checksum for idempotent dedup. */
    async findSourceByChecksum(
      tenantId: string,
      checksum: string,
    ): Promise<SourceRow | null> {
      const rows = await db
        .select()
        .from(sources)
        .where(
          and(eq(sources.tenantId, tenantId), eq(sources.checksum, checksum)),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    /** List a tenant's sources, newest first. Never returns other tenants' rows. */
    async listSources(tenantId: string, limit = 50): Promise<SourceRow[]> {
      return db
        .select()
        .from(sources)
        .where(eq(sources.tenantId, tenantId))
        .orderBy(desc(sources.createdAt))
        .limit(limit);
    },

    /**
     * Load everything needed to build the aggregated organizational-model views
     * for a tenant: all sources (newest first) plus their fact-sets and review
     * actions. Strictly tenant-scoped. The aggregation itself lives in the API
     * layer so this stays a plain data read.
     */
    async loadTenantModel(tenantId: string): Promise<{
      sources: SourceRow[];
      facts: FactRow[];
      reviews: ReviewRow[];
    }> {
      const [sourceRows, factRows, reviewRows] = await Promise.all([
        db
          .select()
          .from(sources)
          .where(eq(sources.tenantId, tenantId))
          .orderBy(desc(sources.createdAt)),
        db.select().from(facts).where(eq(facts.tenantId, tenantId)),
        db
          .select()
          .from(reviews)
          .where(eq(reviews.tenantId, tenantId))
          .orderBy(desc(reviews.createdAt)),
      ]);
      return { sources: sourceRows, facts: factRows, reviews: reviewRows };
    },

    /**
     * All of a tenant's persisted tokens (id + source + payload), for
     * cross-document checks such as potential business-duplicate detection.
     * Strictly tenant-scoped.
     */
    async listTenantTokens(
      tenantId: string,
    ): Promise<Array<{ sourceId: string; token: Record<string, unknown> }>> {
      return db
        .select({ sourceId: tokens.sourceId, token: tokens.token })
        .from(tokens)
        .where(eq(tokens.tenantId, tenantId));
    },

    /** Create an API key for a tenant. Stores only the hash + prefix. */
    async createApiKey(input: {
      tenantId: string;
      name: string;
      keyPrefix: string;
      keyHash: string;
      createdBy: string;
    }): Promise<ApiKeyRow> {
      const rows = await db.insert(apiKeys).values(input).returning();
      return rows[0]!;
    },

    /** List a tenant's API keys (never the secret). Newest first. */
    async listApiKeys(tenantId: string): Promise<ApiKeyRow[]> {
      return db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.tenantId, tenantId))
        .orderBy(desc(apiKeys.createdAt));
    },

    /** Revoke a tenant's key. No-op if it isn't theirs. */
    async revokeApiKey(tenantId: string, id: string): Promise<boolean> {
      const rows = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(apiKeys.tenantId, tenantId),
            eq(apiKeys.id, id),
            isNull(apiKeys.revokedAt),
          ),
        )
        .returning({ id: apiKeys.id });
      return rows.length > 0;
    },

    /** Resolve an active API key by its hash → tenant, for authentication. */
    async findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRow | null> {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);
      const key = rows[0];
      if (!key) return null;
      // Best-effort last-used stamp; never block auth on it.
      void db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch(() => {});
      return key;
    },

    /** Full stored document for review — strictly tenant-scoped. */
    async getDocument(
      tenantId: string,
      sourceId: string,
    ): Promise<StoredDocument | null> {
      const sourceRows = await db
        .select()
        .from(sources)
        .where(
          and(eq(sources.tenantId, tenantId), eq(sources.sourceId, sourceId)),
        )
        .limit(1);
      const source = sourceRows[0];
      if (!source) return null;

      const [tokenRows, factRows, reviewRows] = await Promise.all([
        db.select().from(tokens).where(eq(tokens.sourceId, sourceId)),
        db.select().from(facts).where(eq(facts.sourceId, sourceId)).limit(1),
        db.select().from(reviews).where(eq(reviews.sourceId, sourceId)),
      ]);

      return {
        source,
        tokens: tokenRows,
        facts: factRows[0] ?? null,
        reviews: reviewRows,
      };
    },

    /** Record a reviewer correction/rejection (append-only audit trail). */
    async addReview(input: {
      tenantId: string;
      sourceId: string;
      fieldPath: string;
      action: "CORRECT" | "REJECT" | "APPROVE";
      correctedValue?: unknown;
      reviewer: string;
    }): Promise<ReviewRow> {
      // Guard: the source must belong to the tenant.
      const owner = await db
        .select({ id: sources.sourceId })
        .from(sources)
        .where(
          and(
            eq(sources.tenantId, input.tenantId),
            eq(sources.sourceId, input.sourceId),
          ),
        )
        .limit(1);
      if (!owner[0]) {
        throw new Error("source not found for tenant");
      }
      const rows = await db
        .insert(reviews)
        .values({
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          fieldPath: input.fieldPath,
          action: input.action,
          correctedValue: input.correctedValue ?? null,
          reviewer: input.reviewer,
        })
        .returning();
      return rows[0]!;
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
