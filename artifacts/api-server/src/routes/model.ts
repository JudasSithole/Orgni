/**
 * Organizational-model views (read-only, tenant-scoped).
 *
 * These endpoints back the console's model pages. Each one loads the tenant's
 * persisted sources/facts/reviews and returns an aggregated view (see
 * `../lib/model`). They require persistence: without a database there is no
 * organizational model to read, so they report 503 rather than inventing one.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { createDb } from "@workspace/db/connect";
import { config } from "../lib/config";
import {
  buildActivity,
  buildEntities,
  buildEntityDetail,
  buildExceptions,
  buildFacts,
  buildOverview,
  buildRelationships,
  type ModelInput,
} from "../lib/model";

const router: IRouter = Router();

const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

function tenantId(req: Request): string | null {
  return req.principal?.tenantId ?? null;
}

/** Load the tenant's model rows, or send the right error and return null. */
async function loadInput(
  req: Request,
  res: Response,
): Promise<ModelInput | null> {
  if (!store) {
    res.status(503).json({ error: "persistence_unavailable" });
    return null;
  }
  const tid = tenantId(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return null;
  }
  return store.repository.loadTenantModel(tid);
}

router.get("/model/overview", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json(buildOverview(input));
});

router.get("/model/entities", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json({ entities: buildEntities(input) });
});

router.get("/model/entities/:key", async (req, res) => {
  const input = await loadInput(req, res);
  if (!input) return;
  const detail = buildEntityDetail(input, req.params["key"] as string);
  if (!detail) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(detail);
});

router.get("/model/relationships", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json({ relationships: buildRelationships(input) });
});

router.get("/model/facts", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json({ facts: buildFacts(input) });
});

router.get("/model/exceptions", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json(buildExceptions(input));
});

router.get("/model/activity", async (req, res) => {
  const input = await loadInput(req, res);
  if (input) res.json({ events: buildActivity(input) });
});

export default router;
