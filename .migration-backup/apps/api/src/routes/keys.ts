/**
 * API-key management (tenant-scoped, session-authenticated).
 *
 * Lets a signed-in user mint, list and revoke API keys that external systems —
 * AI agents, back-end services — use to call the Orgni API on the tenant's
 * behalf. The plaintext key is returned exactly once, at creation.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { createDb } from "@workspace/db/connect";
import { config } from "../lib/config";
import { generateApiKey } from "../lib/api-keys";

const router: IRouter = Router();
const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

function tenantId(req: Request): string | null {
  return req.principal?.tenantId ?? null;
}

function publicKey(row: {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revoked: row.revokedAt != null,
  };
}

/** POST /api/keys — mint a key. Returns the plaintext ONCE. */
router.post("/keys", async (req: Request, res: Response) => {
  if (!store)
    return void res.status(503).json({ error: "persistence_unavailable" });
  const tid = tenantId(req);
  if (!tid) return void res.status(400).json({ error: "missing_tenant" });

  const name = String(req.body?.name ?? "").trim();
  if (!name) return void res.status(400).json({ error: "name_required" });

  const { key, keyHash, keyPrefix } = generateApiKey();
  const row = await store.repository.createApiKey({
    tenantId: tid,
    name,
    keyPrefix,
    keyHash,
    createdBy: req.principal?.sub ?? "unknown",
  });
  // `key` is the only time the plaintext is ever returned.
  res.status(201).json({ ...publicKey(row), key });
});

/** GET /api/keys — list keys (never the secret). */
router.get("/keys", async (req: Request, res: Response) => {
  if (!store)
    return void res.status(503).json({ error: "persistence_unavailable" });
  const tid = tenantId(req);
  if (!tid) return void res.status(400).json({ error: "missing_tenant" });
  const rows = await store.repository.listApiKeys(tid);
  res.json({ keys: rows.map(publicKey) });
});

/** DELETE /api/keys/:id — revoke a key. */
router.delete("/keys/:id", async (req: Request, res: Response) => {
  if (!store)
    return void res.status(503).json({ error: "persistence_unavailable" });
  const tid = tenantId(req);
  if (!tid) return void res.status(400).json({ error: "missing_tenant" });
  const ok = await store.repository.revokeApiKey(
    tid,
    req.params["id"] as string,
  );
  if (!ok) return void res.status(404).json({ error: "not_found" });
  res.status(200).json({ ok: true });
});

export default router;
