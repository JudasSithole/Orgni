/**
 * Dev-mode session auth.
 *
 * Issues and verifies HMAC-signed tokens (a compact `<body>.<sig>` where body is
 * base64url JSON). This is deliberately the same shape a real OIDC JWT would
 * take, so `authenticate()` is the single seam that Entra External ID replaces
 * in production — nothing downstream changes when it does.
 *
 * It is NOT a substitute for a real IdP: there is no user store or password
 * check. Anyone can mint a session for any org locally. That is fine for local
 * development and is gated so it can be tightened per environment.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPrincipal {
  sub: string; // subject — the user's email
  tenantId: string; // organization the user belongs to
  roles: string[];
  iat: number; // issued-at (epoch seconds)
  exp: number; // expiry (epoch seconds)
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Derive a stable tenant id from an organization name (local convention). */
export function tenantIdFromOrg(org: string): string {
  const slug = org
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tenant_${slug || "default"}`;
}

export function issueToken(
  input: { email: string; tenantId: string; roles?: string[] },
  secret: string,
  ttlSeconds = 60 * 60 * 8,
): { token: string; principal: SessionPrincipal } {
  const now = Math.floor(Date.now() / 1000);
  const principal: SessionPrincipal = {
    sub: input.email,
    tenantId: input.tenantId,
    roles: input.roles ?? ["Owner"],
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = b64url(JSON.stringify(principal));
  return { token: `${body}.${sign(body, secret)}`, principal };
}

/** Verify a token; returns the principal or null (bad signature / expired / malformed). */
export function verifyToken(
  token: string,
  secret: string,
): SessionPrincipal | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];

  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const principal = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPrincipal;
    if (
      typeof principal.tenantId !== "string" ||
      typeof principal.sub !== "string" ||
      typeof principal.exp !== "number"
    ) {
      return null;
    }
    if (principal.exp < Math.floor(Date.now() / 1000)) return null;
    return principal;
  } catch {
    return null;
  }
}
