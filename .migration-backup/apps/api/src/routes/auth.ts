import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../lib/config";
import { issueToken, tenantIdFromOrg } from "../lib/auth";
import { authenticate } from "../lib/authenticate";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/login
 *
 * Dev-mode login: no password (there is no user store yet). It establishes a
 * session for an email + organization and returns a signed token. In production
 * this endpoint is replaced by the OIDC redirect flow.
 */
router.post("/auth/login", (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim();
  const organization = String(req.body?.organization ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (!organization) {
    res.status(400).json({ error: "missing_organization" });
    return;
  }

  const tenantId = tenantIdFromOrg(organization);
  const { token, principal } = issueToken(
    { email, tenantId, roles: ["Owner"] },
    config.AUTH_SECRET,
  );

  res.json({
    token,
    principal: {
      email: principal.sub,
      tenantId: principal.tenantId,
      organization,
      roles: principal.roles,
    },
  });
});

/** GET /api/auth/me — who the current session belongs to. */
router.get("/auth/me", authenticate, (req: Request, res: Response) => {
  const p = req.principal!;
  res.json({ email: p.sub, tenantId: p.tenantId, roles: p.roles });
});

export default router;
