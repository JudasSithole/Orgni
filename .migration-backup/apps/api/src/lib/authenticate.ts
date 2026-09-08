/**
 * Authentication middleware — the single place a request's tenant is decided.
 *
 * Production: requires a valid signed session token (Authorization: Bearer).
 * Non-production: also accepts an `X-Tenant-Id` header as a convenience for
 * local scripts and tests, so `curl -H "X-Tenant-Id: ..."` keeps working.
 *
 * Downstream handlers read `req.principal` — never a raw header. When Entra
 * External ID lands, only `verifyToken` changes; this contract stays.
 */
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { verifyToken, type SessionPrincipal } from "./auth";
import { createDb } from "@workspace/db/connect";
import { hashApiKey, looksLikeApiKey } from "./api-keys";

// Lazy DB handle for API-key lookups. Session tokens never touch it.
const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: SessionPrincipal;
    }
  }
}

const isProd = config.NODE_ENV === "production";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    const bearer = header.slice(7).trim();

    // API key (agents / services): resolve to its tenant via the DB.
    if (looksLikeApiKey(bearer)) {
      if (!store) {
        res.status(503).json({ error: "persistence_unavailable" });
        return;
      }
      try {
        const key = await store.repository.findActiveApiKeyByHash(
          hashApiKey(bearer),
        );
        if (key) {
          req.principal = {
            sub: `apikey:${key.id}`,
            tenantId: key.tenantId,
            roles: ["Owner"],
            iat: 0,
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
          next();
          return;
        }
      } catch {
        /* fall through to 401 */
      }
      res.status(401).json({ error: "invalid_api_key" });
      return;
    }

    // Otherwise a signed session token.
    const principal = verifyToken(bearer, config.AUTH_SECRET);
    if (principal) {
      req.principal = principal;
      next();
      return;
    }
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  // Dev/test convenience only — never trusted in production.
  if (!isProd) {
    const tenant = req.header("x-tenant-id");
    if (tenant?.trim()) {
      req.principal = {
        sub: "dev@local",
        tenantId: tenant.trim(),
        roles: ["Owner"],
        iat: 0,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      next();
      return;
    }
  }

  res.status(401).json({ error: "unauthenticated" });
}
