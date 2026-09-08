import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import type { PrincipalRule } from "@workspace/contracts";
import {
  checksumOf,
  createDocumentIntelligenceClient,
  processDocument,
  toHandoff,
  type DocumentIntelligence,
} from "@workspace/worker/pipeline";
import { createDb } from "@workspace/db/connect";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { createOntologyClient } from "../lib/ontology-client";
import { findPotentialDuplicate } from "../lib/duplicate";

const router: IRouter = Router();

// Persistence is optional: when DATABASE_URL is set, sources/tokens/facts are
// stored and retrievable; when not, the endpoint still returns results inline
// (nothing is persisted). This keeps the service runnable without a database.
const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

// Files are held in memory and streamed straight to Document Intelligence; the
// API never writes uploads to disk (§16 — stateless, no local document store).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES },
});

// Built once. When DOCUMENT_INTELLIGENCE_URL is unset the endpoint reports 503
// rather than pretending to work.
const documentIntelligence: DocumentIntelligence | null =
  config.DOCUMENT_INTELLIGENCE_URL
    ? createDocumentIntelligenceClient({
        baseUrl: config.DOCUMENT_INTELLIGENCE_URL,
      })
    : null;

// Optional: when configured, tokens are mapped into reviewable facts. When not,
// the endpoint still returns tokens (facts: null) rather than failing.
const ontology = config.ONTOLOGY_URL
  ? createOntologyClient({ baseUrl: config.ONTOLOGY_URL })
  : null;

/**
 * The caller's tenant, from the authenticated session (set by `authenticate`).
 * All document routes are mounted behind that middleware, so `req.principal` is
 * always present here.
 */
function resolveTenantId(req: Request): string | null {
  return req.principal?.tenantId ?? null;
}

/**
 * POST /api/documents
 *
 * Upload one document (multipart field `file`) and receive the ontology
 * handoff: `{ sourceId, schemaVersion, tokens, warnings }`. Controlled failures
 * (unsupported type, unreadable, missing fields) return 200 with an empty token
 * list and warnings — the document was handled, it just produced no tokens.
 */
router.post(
  "/documents",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!documentIntelligence) {
      res.status(503).json({
        error: "document_intelligence_unavailable",
        message: "DOCUMENT_INTELLIGENCE_URL is not configured.",
      });
      return;
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: "missing_tenant",
        message: "An X-Tenant-Id header is required.",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: "missing_file",
        message: "Attach a document as multipart field 'file'.",
      });
      return;
    }

    // Idempotency: the same bytes re-uploaded by the same tenant returns the
    // already-stored result instead of reprocessing or colliding on write.
    const checksum = checksumOf(new Uint8Array(file.buffer));
    const existing = store
      ? await store.repository.findSourceByChecksum(tenantId, checksum)
      : null;
    if (store && existing?.state === "COMPLETED") {
      const doc = await store.repository.getDocument(
        tenantId,
        existing.sourceId,
      );
      const needsOntologyRetry =
        ontology !== null &&
        (doc?.tokens.length ?? 0) > 0 &&
        doc?.facts === null;

      if (!needsOntologyRetry) {
        res.status(200).json({
          sourceId: existing.sourceId,
          schemaVersion: "0.1.0",
          tokens: doc?.tokens.map((t) => t.token) ?? [],
          warnings: [`idempotent_replay: existing source ${existing.sourceId}`],
          facts: doc?.facts?.result ?? null,
          state: existing.state,
          documentType: existing.documentType,
          errors: [],
        });
        return;
      }
    }

    // A source ACL could be derived from the authenticated principal later; for
    // now default to tenant-scoped read.
    const sourceAcl: PrincipalRule[] = [
      {
        principalId: tenantId,
        principalType: "GROUP",
        effect: "ALLOW",
        actions: ["READ"],
      },
    ];

    try {
      const result = await processDocument(
        {
          sourceId: existing?.sourceId,
          filename: file.originalname,
          mimeType: file.mimetype,
          content: new Uint8Array(file.buffer),
          tenantId,
          sourceAcl,
        },
        documentIntelligence,
      );

      // Identifiers and outcome only — never document content or field values.
      logger.info(
        {
          sourceId: result.sourceId,
          tenantId,
          documentType: result.documentType,
          state: result.state,
          tokenCount: result.tokens.length,
        },
        "document processed",
      );

      // Map tokens → reviewable facts when the ontology is configured and there
      // are tokens. An ontology failure degrades to tokens-only with a warning
      // rather than failing the whole request.
      let facts: unknown = null;
      const handoff = toHandoff(result);
      if (ontology && handoff.tokens.length > 0) {
        try {
          facts = await ontology.toFacts(handoff.tokens);
        } catch (ontErr) {
          handoff.warnings.push(
            `ontology_unavailable: ${ontErr instanceof Error ? ontErr.message : "error"}`,
          );
          logger.warn(
            { sourceId: result.sourceId, tenantId },
            "ontology mapping failed; returning tokens only",
          );
        }
      }

      // Potential business-duplicate check (item 6): a different file carrying
      // the same invoice number + supplier + amount + currency is FLAGGED for
      // review, never merged. Exact duplicates are already handled by checksum
      // dedup above. A failure here must not block the upload.
      if (store) {
        try {
          const existing = await store.repository.listTenantTokens(tenantId);
          const bySource = new Map<string, Array<Record<string, unknown>>>();
          for (const row of existing) {
            const arr = bySource.get(row.sourceId) ?? [];
            arr.push(row.token);
            bySource.set(row.sourceId, arr);
          }
          const grouped = [...bySource.entries()].map(([sourceId, tokens]) => ({
            sourceId,
            tokens,
          }));
          const dup = findPotentialDuplicate(
            handoff.tokens as unknown as Array<Record<string, unknown>>,
            grouped,
            result.sourceId,
          );
          if (dup) {
            handoff.warnings.push(
              `potential_duplicate: review required — same invoice number, ` +
                `supplier and amount as source ${dup.sourceId} (not merged)`,
            );
          }
        } catch {
          // Non-fatal: duplicate detection is advisory.
        }
      }

      // Persist the outcome so it survives the request and can be reviewed.
      // A storage failure must not lose the result the caller already has, so
      // it degrades to a warning rather than a 5xx.
      if (store && !result.record.duplicateOf) {
        try {
          const factsResult = facts as { schema_version?: string } | null;
          await store.repository.persistDocument({
            source: {
              sourceId: result.sourceId,
              tenantId,
              filename: file.originalname,
              mimeType: file.mimetype,
              checksum: result.record.checksum,
              byteSize: result.record.byteSize,
              state: result.state,
              documentType:
                result.documentType === "UNPROCESSED"
                  ? null
                  : result.documentType,
              confidence: result.record.envelope?.confidence ?? null,
              sourceAcl,
              warnings: handoff.warnings,
              errors: result.errors,
              uploadedAt: new Date(result.record.uploadedAt),
            },
            tokens: handoff.tokens as unknown as Array<Record<string, unknown>>,
            facts: factsResult
              ? {
                  schemaVersion: factsResult.schema_version ?? "0.1.0",
                  result: factsResult as Record<string, unknown>,
                }
              : null,
          });
        } catch (persistErr) {
          handoff.warnings.push(
            `persistence_unavailable: ${persistErr instanceof Error ? persistErr.message : "error"}`,
          );
          logger.error(
            { sourceId: result.sourceId, tenantId },
            "failed to persist document result",
          );
        }
      }

      const status = result.state === "FAILED" ? 422 : 200;
      res.status(status).json({
        ...handoff,
        facts,
        state: result.state,
        documentType: result.documentType,
        errors: result.errors,
      });
    } catch (err) {
      logger.error(
        { tenantId, error: err instanceof Error ? err.name : "unknown" },
        "document processing crashed",
      );
      res.status(502).json({
        error: "processing_failed",
        message: "The document could not be processed.",
      });
    }
  },
);

/**
 * GET /api/documents — list the caller's processed documents (tenant-scoped).
 */
router.get("/documents", async (req: Request, res: Response) => {
  if (!store) {
    res.status(503).json({ error: "persistence_unavailable" });
    return;
  }
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const rows = await store.repository.listSources(tenantId);
  res.json({
    documents: rows.map((r) => ({
      sourceId: r.sourceId,
      filename: r.filename,
      documentType: r.documentType,
      state: r.state,
      confidence: r.confidence,
      uploadedAt: r.uploadedAt,
    })),
  });
});

/**
 * GET /api/documents/:sourceId — the full reviewable result: source, tokens,
 * facts, and any review actions. Strictly tenant-scoped: a document belonging
 * to another tenant returns 404, never its contents.
 */
router.get("/documents/:sourceId", async (req: Request, res: Response) => {
  if (!store) {
    res.status(503).json({ error: "persistence_unavailable" });
    return;
  }
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const doc = await store.repository.getDocument(
    tenantId,
    req.params["sourceId"] as string,
  );
  if (!doc) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    source: {
      sourceId: doc.source.sourceId,
      filename: doc.source.filename,
      documentType: doc.source.documentType,
      state: doc.source.state,
      confidence: doc.source.confidence,
      warnings: doc.source.warnings,
      errors: doc.source.errors,
      uploadedAt: doc.source.uploadedAt,
    },
    tokens: doc.tokens.map((t) => t.token),
    facts: doc.facts?.result ?? null,
    reviews: doc.reviews,
  });
});

/**
 * POST /api/documents/:sourceId/reviews — record a reviewer correction/reject.
 */
router.post(
  "/documents/:sourceId/reviews",
  async (req: Request, res: Response) => {
    if (!store) {
      res.status(503).json({ error: "persistence_unavailable" });
      return;
    }
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "missing_tenant" });
      return;
    }
    const { fieldPath, action, correctedValue, reviewer } = req.body ?? {};
    const validActions = ["CORRECT", "REJECT", "APPROVE"];
    if (!fieldPath || !validActions.includes(action)) {
      res.status(400).json({ error: "invalid_review" });
      return;
    }
    try {
      const review = await store.repository.addReview({
        tenantId,
        sourceId: req.params["sourceId"] as string,
        fieldPath,
        action,
        correctedValue,
        reviewer: reviewer ?? "unknown",
      });
      res.status(201).json(review);
    } catch {
      res.status(404).json({ error: "not_found" });
    }
  },
);

// Multer rejects oversize files with a specific code; translate to 413.
router.use(
  (err: unknown, _req: Request, res: Response, next: (e?: unknown) => void) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: "file_too_large",
        message: `Max upload size is ${config.MAX_UPLOAD_BYTES} bytes.`,
      });
      return;
    }
    next(err);
  },
);

export default router;
