/**
 * Phase 1 document-pipeline persistence.
 *
 * Every row is tenant-scoped (`tenant_id` on every table) — the seam that makes
 * tenant isolation enforceable at the data layer. Sources are content-addressed
 * by SHA-256 checksum per tenant, so a re-upload of the same bytes is
 * idempotent rather than a duplicate.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** Ingestion state machine, mirrored from the worker pipeline. */
export type IngestionState = "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";

/**
 * One uploaded source document and its processing outcome.
 * `source_id` is the stable id the pipeline generates (src_...).
 */
export const sources = pgTable(
  "sources",
  {
    sourceId: text("source_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    state: text("state").$type<IngestionState>().notNull(),
    documentType: text("document_type"),
    confidence: doublePrecision("confidence"),
    /** Access-control rules carried from the source system. */
    sourceAcl: jsonb("source_acl").$type<unknown[]>().notNull().default([]),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    errors: jsonb("errors").$type<string[]>().notNull().default([]),
    /** Points at the source this one duplicates, when dedup hit. */
    duplicateOf: text("duplicate_of"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Same bytes uploaded again by the same tenant → idempotent, not duplicated.
    uniqueIndex("sources_tenant_checksum_uq").on(
      table.tenantId,
      table.checksum,
    ),
    index("sources_tenant_idx").on(table.tenantId),
  ],
);

/** Organizational tokens produced for a source. */
export const tokens = pgTable(
  "tokens",
  {
    tokenId: text("token_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.sourceId, { onDelete: "cascade" }),
    tokenKind: text("token_kind").notNull(),
    /** The full canonical OrganizationalToken, verbatim. */
    token: jsonb("token").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tokens_source_idx").on(table.sourceId),
    index("tokens_tenant_idx").on(table.tenantId),
  ],
);

/** The reviewable ontology result for a source (facts, entities, conflicts). */
export const facts = pgTable(
  "facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.sourceId, { onDelete: "cascade" }),
    schemaVersion: text("schema_version").notNull(),
    /** The full OntologyResult payload the reviewer sees. */
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One current fact-set per source; re-processing replaces it.
    uniqueIndex("facts_source_uq").on(table.sourceId),
    index("facts_tenant_idx").on(table.tenantId),
  ],
);

/**
 * Reviewer corrections / rejections of individual extracted fields.
 * Kept append-only so the review trail is auditable.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.sourceId, { onDelete: "cascade" }),
    fieldPath: text("field_path").notNull(),
    action: text("action").$type<"CORRECT" | "REJECT" | "APPROVE">().notNull(),
    correctedValue: jsonb("corrected_value"),
    reviewer: text("reviewer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("reviews_source_idx").on(table.sourceId)],
);

export type SourceRow = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;
export type TokenRow = typeof tokens.$inferSelect;
export type InsertToken = typeof tokens.$inferInsert;
export type FactRow = typeof facts.$inferSelect;
export type InsertFact = typeof facts.$inferInsert;
export type ReviewRow = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
