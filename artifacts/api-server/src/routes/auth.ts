/**
 * Credential authentication: registration, sign-in, and password recovery.
 *
 * Accounts live in the `accounts` table and each one owns a freshly minted
 * tenant, so two people who pick the same organisation name never share data.
 * Passwords are scrypt hashes (see lib/passwords) and never leave this process.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDb } from "@workspace/db/connect";
import {
  accounts,
  emailVerifications,
  members as membersTable,
  organisations,
  passwordResets,
} from "@workspace/db/schema";
import { authSecret, config } from "../lib/config";
import { issueToken } from "../lib/auth";
import { authenticate, SESSION_COOKIE, readCookie } from "../lib/authenticate";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { emailConfigured, sendPasswordReset, sendVerificationEmail } from "../lib/email";
import { logger } from "../lib/logger";
import {
  credentialPolicy,
  enforce,
  recordOutcome,
  recoveryPolicy,
  signupPolicy,
} from "../lib/throttle";
import { verifyIdToken, oidcToPrincipal } from "../lib/oidc";

const store = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;
const router: IRouter = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MAX_PASSWORD = 128;
const MIN_PASSWORD = 12;
const MAX_ORGANIZATION = 120;
const RESET_TTL_MINUTES = 30;
const RESET_TTL_MS = RESET_TTL_MINUTES * 60_000;
const VERIFY_TTL_MINUTES = 24 * 60;
const VERIFY_TTL_MS = VERIFY_TTL_MINUTES * 60_000;

/** Verified against when no account matches, so timing does not reveal existence. */
const DECOY_HASH = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;

let warnedAboutVerification = false;

/**
 * Whether an address must be proven before it can receive a session.
 *
 * Gated on email being configured, so local and preview environments still
 * work without Resend. In production an unconfigured seam is a mistake, so it
 * is logged loudly rather than silently downgrading to unverified sign-ups.
 */
function verificationRequired(): boolean {
  const configured = emailConfigured();
  if (!configured && config.NODE_ENV === "production" && !warnedAboutVerification) {
    warnedAboutVerification = true;
    logger.error(
      {},
      "email is not configured — registration will NOT require verification. Set RESEND_API_KEY and EMAIL_FROM",
    );
  }
  return configured;
}

/** The emailed token is never stored; only its digest is, so a dump cannot be replayed. */
function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Passwords are used verbatim — trimming would silently change the credential. */
function readPassword(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL && EMAIL_RE.test(email);
}

function invalid(res: Response, error: string): void {
  res.status(400).json({ error });
}

function unavailable(res: Response): void {
  res.status(503).json({ error: "persistence_unavailable" });
}

function isUniqueViolation(error: unknown): boolean {
  const cause = error as { code?: string; cause?: { code?: string } };
  return cause?.code === "23505" || cause?.cause?.code === "23505";
}

function session(email: string, tenantId: string, organization: string) {
  const { token, principal } = issueToken({ email, tenantId, roles: ["Owner"] }, authSecret);
  return { token, principal: { email, tenantId, organization, roles: principal.roles } };
}

function sendSession(
  res: Response,
  email: string,
  tenantId: string,
  organization: string,
): void {
  const result = session(email, tenantId, organization);
  const secure = config.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`,
  );
  res.json({ principal: result.principal });
}

async function organizationName(tenantId: string): Promise<string | null> {
  const [org] = await store!.db
    .select()
    .from(organisations)
    .where(eq(organisations.tenantId, tenantId));
  return org?.name ?? null;
}

/**
 * Mint a verification token and email the link. Single-use, 24h, and a new
 * request voids any outstanding link for the address.
 */
async function issueVerification(email: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await store!.db.transaction(async (tx) => {
    await tx.delete(emailVerifications).where(eq(emailVerifications.email, email));
    await tx.insert(emailVerifications).values({
      tokenHash: tokenDigest(token),
      email,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });
  });
  const base = (config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  if (!base) {
    logger.warn({}, "verification requested without APP_BASE_URL — no link sent");
    return;
  }
  await sendVerificationEmail({
    to: email,
    verifyUrl: `${base}/verify-email?token=${token}`,
    expiresInMinutes: VERIFY_TTL_MINUTES,
  });
}

/**
 * POST /api/auth/register — create the account, its tenant, and its first owner.
 *
 * Returns 202 with no session when the address still needs verifying, so an
 * unproven address never reaches the onboarding steps.
 */
router.post("/auth/register", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(signupPolicy, "signup", req, res)) return;
  if (!store) return unavailable(res);

  const email = readText(req.body?.email).toLowerCase();
  const organization = readText(req.body?.organization);
  const password = readPassword(req.body?.password);
  if (!validEmail(email)) return invalid(res, "invalid_email");
  if (!organization || organization.length > MAX_ORGANIZATION) {
    return invalid(res, "invalid_organization");
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return invalid(res, "invalid_password");
  }
  if (password !== req.body?.confirmPassword) return invalid(res, "password_mismatch");

  const tenantId = `tenant_${randomUUID()}`;
  const mustVerify = verificationRequired();
  try {
    const passwordHash = await hashPassword(password);
    await store.db.transaction(async (tx) => {
      await tx.insert(organisations).values({ tenantId, name: organization, workEmail: email });
      await tx.insert(accounts).values({
        email,
        tenantId,
        passwordHash,
        // No email configured means the address cannot be proven, so stamp it
        // rather than locking every future sign-in out of its own account.
        emailVerifiedAt: mustVerify ? null : new Date(),
      });
      // Without this the new workspace has no members at all, so the member
      // list and Teams user matching would start empty for its own owner.
      await tx
        .insert(membersTable)
        .values({ tenantId, email, role: "owner", status: "active" });
    });
    if (mustVerify) await issueVerification(email);
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "account_exists" });
      return;
    }
    logger.error({ err: error }, "registration failed");
    return unavailable(res);
  }
  recordOutcome(signupPolicy, "signup", req, "success");
  if (mustVerify) {
    res.status(202).json({ pendingVerification: true, email });
    return;
  }
  const result = session(email, tenantId, organization);
  const secure = config.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`,
  );
  res.status(201).json({ principal: result.principal });
});

/**
 * POST /api/auth/verify-email — spend a verification token.
 *
 * Returns a session on success so the user lands directly in onboarding
 * rather than being sent back to the sign-in form they just completed.
 */
router.post("/auth/verify-email", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(credentialPolicy, "credentials", req, res)) return;
  if (!store) return unavailable(res);

  const token = readText(req.body?.token);
  if (!token || token.length > MAX_PASSWORD) return invalid(res, "invalid_token");

  try {
    const [row] = await store.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenDigest(token)));
    const [account] =
      row && row.expiresAt.getTime() > Date.now()
        ? await store.db
            .select()
            .from(accounts)
            .where(eq(accounts.email, row.email))
        : [];
    const name = account ? await organizationName(account.tenantId) : null;
    if (!account || !name) {
      recordOutcome(credentialPolicy, "credentials", req, "failure");
      return invalid(res, "invalid_token");
    }

    await store.db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(accounts.email, account.email));
      await tx.delete(emailVerifications).where(eq(emailVerifications.email, account.email));
    });
    recordOutcome(credentialPolicy, "credentials", req, "success");
    sendSession(res, account.email, account.tenantId, name);
  } catch (error) {
    logger.error({ err: error }, "email verification failed");
    return unavailable(res);
  }
});

/**
 * POST /api/auth/verify-email/resend — send another verification link.
 *
 * Answers 202 whatever the address is, so it cannot be used to discover who is
 * registered, and only resends when the account is genuinely unverified.
 */
router.post("/auth/verify-email/resend", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(recoveryPolicy, "recovery", req, res)) return;

  const email = readText(req.body?.email).toLowerCase();
  if (store && validEmail(email) && emailConfigured()) {
    try {
      const [account] = await store.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, email));
      if (account && !account.emailVerifiedAt) await issueVerification(email);
    } catch (error) {
      logger.error({ err: error }, "verification resend failed");
    }
  }
  res.status(202).json({ accepted: true });
});

/** POST /api/auth/login — exchange credentials for a session. */
router.post("/auth/login", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(credentialPolicy, "credentials", req, res)) return;
  if (!store) return unavailable(res);

  const email = readText(req.body?.email).toLowerCase();
  const password = readPassword(req.body?.password);
  if (!validEmail(email)) return invalid(res, "invalid_email");
  if (!password || password.length > MAX_PASSWORD) return invalid(res, "invalid_password");

  try {
    const [account] = await store.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email));
    // Spend the same work on an unknown address so response time is not a signal.
    const valid = await verifyPassword(password, account?.passwordHash ?? DECOY_HASH);
    const name = account ? await organizationName(account.tenantId) : null;
    if (!account || !valid || !name) {
      recordOutcome(credentialPolicy, "credentials", req, "failure");
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    // The password is correct but the address was never proven. Refuse rather
    // than issue a session, so there is no half-access state to work around.
    if (verificationRequired() && !account.emailVerifiedAt) {
      res.status(403).json({ error: "email_unverified" });
      return;
    }
    recordOutcome(credentialPolicy, "credentials", req, "success");
    sendSession(res, email, account.tenantId, name);
  } catch (error) {
    logger.error({ err: error }, "login failed");
    return unavailable(res);
  }
});

/**
 * POST /api/auth/password-reset/request — email a single-use reset link.
 *
 * Always answers 202 with the same body, whether or not the address has an
 * account, so this cannot be used to discover who is registered. Delivery
 * failures are logged rather than surfaced for the same reason.
 */
router.post("/auth/password-reset/request", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(recoveryPolicy, "recovery", req, res)) return;

  const email = readText(req.body?.email).toLowerCase();
  if (store && validEmail(email)) {
    try {
      const [account] = await store.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, email));
      if (account) {
        const token = randomBytes(32).toString("hex");
        await store.db.transaction(async (tx) => {
          // One live link per address; requesting a new one voids the old.
          await tx.delete(passwordResets).where(eq(passwordResets.email, email));
          await tx.insert(passwordResets).values({
            tokenHash: tokenDigest(token),
            email,
            expiresAt: new Date(Date.now() + RESET_TTL_MS),
          });
        });
        const base = (config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
        if (base) {
          await sendPasswordReset({
            to: email,
            resetUrl: `${base}/reset-password?token=${token}`,
            expiresInMinutes: RESET_TTL_MINUTES,
          });
        } else {
          logger.warn({}, "password reset requested without APP_BASE_URL — no link sent");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "password reset request failed");
    }
  }
  res.status(202).json({ accepted: true });
});

/**
 * POST /api/auth/password-reset/confirm — spend a reset token on a new password.
 *
 * Returns a session on success so the user lands in the workspace rather than
 * being bounced back to the sign-in form they just failed.
 */
router.post("/auth/password-reset/confirm", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!enforce(credentialPolicy, "credentials", req, res)) return;
  if (!store) return unavailable(res);

  const token = readText(req.body?.token);
  const password = readPassword(req.body?.password);
  if (!token || token.length > MAX_PASSWORD) return invalid(res, "invalid_token");
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return invalid(res, "invalid_password");
  }

  try {
    const [row] = await store.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenDigest(token)));
    const [account] =
      row && row.expiresAt.getTime() > Date.now()
        ? await store.db.select().from(accounts).where(eq(accounts.email, row.email))
        : [];
    const name = account ? await organizationName(account.tenantId) : null;
    if (!account || !name) {
      recordOutcome(credentialPolicy, "credentials", req, "failure");
      return invalid(res, "invalid_token");
    }

    const passwordHash = await hashPassword(password);
    await store.db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.email, account.email));
      // Spending the token invalidates every other outstanding link.
      await tx.delete(passwordResets).where(eq(passwordResets.email, account.email));
    });
    recordOutcome(credentialPolicy, "credentials", req, "success");
    sendSession(res, account.email, account.tenantId, name);
  } catch (error) {
    logger.error({ err: error }, "password reset confirmation failed");
    return unavailable(res);
  }
});

/** GET /api/auth/me — who the current session belongs to. */
router.get("/auth/me", authenticate, (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const p = req.principal!;
  res.json({ email: p.sub, tenantId: p.tenantId, roles: p.roles });
});

/** POST /api/auth/logout — expire the browser session cookie. */
router.post("/auth/logout", (_req: Request, res: Response) => {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
  res.status(204).end();
});

/**
 * GET /api/auth/oidc/start — redirect the user to the OIDC provider's
 * authorization endpoint. Sets a state cookie to bind the callback.
 */
router.get("/auth/oidc/start", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!config.OIDC_ISSUER || !config.OIDC_CLIENT_ID) {
    res.status(503).json({ error: "oidc_not_configured" });
    return;
  }
  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const scopes = (config.OIDC_SCOPES ?? "openid email profile").split(/\s+/);
  const params = new URLSearchParams({
    client_id: config.OIDC_CLIENT_ID,
    response_type: "id_token",
    scope: scopes.join(" "),
    redirect_uri: `${config.PUBLIC_BASE_URL ?? ""}/api/auth/oidc/callback`,
    state,
    nonce,
  });
  res.setHeader(
    "Set-Cookie",
    `orgni_oidc_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
  );
  res.setHeader(
    "Set-Cookie",
    `orgni_oidc_nonce=${nonce}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
  );
  res.redirect(`${config.OIDC_ISSUER.replace(/\/+$/, "")}/authorize?${params}`);
});

/**
 * GET /api/auth/oidc/callback — receive the ID token from the provider,
 * verify it, and issue an Orgni session cookie.
 */
router.get("/auth/oidc/callback", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!config.OIDC_ISSUER || !config.OIDC_CLIENT_ID) {
    res.status(503).json({ error: "oidc_not_configured" });
    return;
  }

  const idToken = readText(req.query?.id_token);
  const state = readText(req.query?.state);
  const nonce = readText(req.query?.nonce);

  const cookieState = readCookie(req.header("cookie"), "orgni_oidc_state");
  const cookieNonce = readCookie(req.header("cookie"), "orgni_oidc_nonce");
  if (!state || !cookieState || state !== cookieState) {
    res.status(400).json({ error: "oidc_invalid_state" });
    return;
  }
  if (!nonce || !cookieNonce || nonce !== cookieNonce) {
    res.status(400).json({ error: "oidc_invalid_nonce" });
    return;
  }

  const claims = await verifyIdToken(idToken);
  if (!claims) {
    res.status(401).json({ error: "oidc_invalid_token" });
    return;
  }

  const principal = oidcToPrincipal(claims);
  const { token } = issueToken(
    { email: claims.email ?? claims.sub, tenantId: principal.tenantId, roles: principal.roles },
    authSecret,
  );
  const secure = config.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`,
  );
  // Clear the OIDC state cookies.
  res.setHeader(
    "Set-Cookie",
    `orgni_oidc_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
  res.setHeader(
    "Set-Cookie",
    `orgni_oidc_nonce=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
  res.json({ principal });
});

export default router;
