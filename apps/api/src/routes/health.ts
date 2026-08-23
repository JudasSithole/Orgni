import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { version } from "../../package.json";
import { config } from "../lib/config";
import { createDb } from "@workspace/db/connect";

const router: IRouter = Router();

// Lazy, optional — same pattern as documents.ts/keys.ts/model.ts.
// The API must still start and run correctly with no DATABASE_URL configured.
const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

/** Legacy health check (kept for Replit deployment health probes). */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Liveness: process is up and serving requests. */
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function checkPostgres(): Promise<boolean> {
  if (!store) return true; // not configured — not a required dependency
  try {
    await store.pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function checkHttpHealth(baseUrl: string | undefined): Promise<boolean> {
  if (!baseUrl) return true; // not configured — not a required dependency
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Readiness: required dependencies are reachable and the service can take
 * traffic. Redis is intentionally not checked here — it is not currently
 * wired into the API (no client library imported); adding a Redis check
 * would be checking a dependency that does not yet exist. This will be
 * added when the durable queue work lands.
 */
router.get("/health/ready", async (_req, res) => {
  const [database, documentIntelligence, ontology] = await Promise.all([
    checkPostgres(),
    checkHttpHealth(config.DOCUMENT_INTELLIGENCE_URL),
    checkHttpHealth(config.ONTOLOGY_URL),
  ]);

  const checks = { database, documentIntelligence, ontology };
  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    checks,
  });
});

/** Build/version metadata for deploy verification. No secrets. */
router.get("/version", (_req, res) => {
  res.json({
    name: "orgni-api",
    version: config.APP_VERSION ?? version,
    gitSha: config.GIT_SHA ?? null,
    nodeEnv: config.NODE_ENV,
  });
});

export default router;