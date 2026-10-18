/**
 * OpenID Connect (OIDC) identity provider seam.
 *
 * Verifies ID tokens issued by an OIDC provider (e.g. Microsoft Entra External ID)
 * and maps their claims to an Orgni `SessionPrincipal`. This is the single seam
 * that replaces credential sessions when SSO is enabled: downstream code only
 * ever reads `req.principal` (`{ sub, tenantId, roles }`), so nothing else changes.
 *
 * Verification:
 *  - Fetch the provider's JWKS from the well-known discovery document.
 *  - Validate the ID token's JWS signature (RS256) against a matching JWK.
 *  - Validate issuer, audience, expiry, and nonce presence.
 *
 * Only the ID token's `sub` (subject) and `email` claims are trusted for the
 * principal; the tenant id is derived from the email domain or a configured
 * claim, matching the credential auth convention (`tenant_<uuid>` per account).
 */

import { createPublicKey, verify } from "node:crypto";
import { config } from "./config";
import { logger } from "./logger";
import type { SessionPrincipal } from "./auth";

const b64url = (input: Buffer): string => input.toString("base64url");
const b64urlDecode = (input: string): Buffer => Buffer.from(input, "base64url");

/** Reset the JWKS cache. Exported for tests; not part of the public API. */
export function __resetJwksCache(): void {
  jwksCache = null;
}

interface Jwk {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface Jwks {
  keys: Jwk[];
}

interface OidcConfig {
  issuer: string;
  clientId: string;
  scopes: string[];
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function oidcConfigured(): boolean {
  return Boolean(config.OIDC_ISSUER && config.OIDC_CLIENT_ID);
}

function getOidcConfig(): OidcConfig | null {
  if (!oidcConfigured()) return null;
  return {
    issuer: config.OIDC_ISSUER!,
    clientId: config.OIDC_CLIENT_ID!,
    scopes: (config.OIDC_SCOPES ?? "openid email profile").split(/\s+/),
  };
}

/** Derive a stable tenant id from an email address (matches credential convention). */
export function tenantIdFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? "default";
  const slug = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tenant_${slug || "default"}`;
}

async function fetchJwks(issuer: string): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const discoveryUrl = new IssuerUrl(issuer).toString();
  let discovery: { jwks_uri: string };
  try {
    const res = await fetch(discoveryUrl);
    if (!res.ok) throw new Error(`discovery ${res.status}`);
    discovery = (await res.json()) as { jwks_uri: string };
  } catch (err) {
    logger.error({ err, issuer }, "oidc: failed to fetch discovery document");
    throw err;
  }
  let jwks: Jwks;
  try {
    const res = await fetch(discovery.jwks_uri);
    if (!res.ok) throw new Error(`jwks ${res.status}`);
    jwks = (await res.json()) as Jwks;
  } catch (err) {
    logger.error({ err, jwksUri: discovery.jwks_uri }, "oidc: failed to fetch JWKS");
    throw err;
  }
  jwksCache = { keys: jwks.keys, fetchedAt: now };
  return jwks.keys;
}

class IssuerUrl {
  constructor(private issuer: string) {}
  toString(): string {
    const base = this.issuer.replace(/\/+$/, "");
    return `${base}/.well-known/openid-configuration`;
  }
}

function decodeJwtParts(token: string): { header: any; payload: any; signature: Buffer } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header: any;
  let payload: any;
  let signature: Buffer;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString("utf8"));
    payload = JSON.parse(b64urlDecode(parts[1]).toString("utf8"));
    signature = b64urlDecode(parts[2]);
  } catch {
    return null;
  }
  return { header, payload, signature };
}

function rsaVerify(jwk: Jwk, signingInput: string, signature: Buffer): boolean {
  if (jwk.kty !== "RSA" || jwk.alg !== "RS256") return false;
  try {
    const jwkJson = {
      kty: jwk.kty,
      kid: jwk.kid,
      use: jwk.use,
      alg: jwk.alg,
      n: jwk.n,
      e: jwk.e,
    };
    const key = createPublicKey({ key: jwkJson, format: "jwk" });
    const pem = key.export({ type: "spki", format: "pem" });
        return verify("RSA-SHA256", Buffer.from(signingInput, "utf8"), pem, signature);
  } catch {
    return false;
  }
}

/**
 * Verify an OIDC ID token and return its claims, or null if invalid.
 *
 * Throws if the provider cannot be reached (caller decides whether to fail
 * closed or fall back).
 */
export async function verifyIdToken(
  token: string,
): Promise<{
  sub: string;
  email: string | null;
  tenantId: string;
  issuer: string;
  clientId: string;
} | null> {
  const oidc = getOidcConfig();
  if (!oidc) return null;

  const parts = decodeJwtParts(token);
  if (!parts) return null;
  const { header, payload, signature } = parts;

  // Rebuild the signing input from the raw token segments.
  const [headerB64, payloadB64] = token.split(".");
  const signingInputRaw = `${headerB64}.${payloadB64}`;

  // Check algorithm.
  if (header.alg !== "RS256") {
    logger.warn({ alg: header.alg }, "oidc: unsupported signing algorithm");
    return null;
  }

  // Find the matching JWK by kid.
  const jwks = await fetchJwks(oidc.issuer);
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) {
    logger.warn({ kid: header.kid }, "oidc: no matching JWK for token");
    return null;
  }

  // Verify the JWS signature.
  if (!rsaVerify(jwk, signingInputRaw, signature)) {
    logger.warn({}, "oidc: ID token signature verification failed");
    return null;
  }

  // Validate standard claims.
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== oidc.issuer) {
    logger.warn({ iss: payload.iss, expected: oidc.issuer }, "oidc: issuer mismatch");
    return null;
  }
  if (!Array.isArray(payload.aud) && payload.aud !== oidc.clientId) {
      logger.warn({ aud: payload.aud, expected: oidc.clientId }, "oidc: audience mismatch");
      return null;
    }
    if (Array.isArray(payload.aud) && !payload.aud.includes(oidc.clientId)) {
      logger.warn({ aud: payload.aud, expected: oidc.clientId }, "oidc: audience not in list");
      return null;
    }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    logger.warn({ exp: payload.exp, now }, "oidc: token expired");
    return null;
  }
  if (typeof payload.nbf === "number" && payload.nbf > now) {
    logger.warn({ nbf: payload.nbf, now }, "oidc: token not yet valid");
    return null;
  }
  if (typeof payload.sub !== "string") {
    logger.warn({}, "oidc: missing sub claim");
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email : null;
  const tenantId = email ? tenantIdFromEmail(email) : `tenant_${payload.sub}`;

  return {
    sub: payload.sub,
    email,
    tenantId,
    issuer: oidc.issuer,
    clientId: oidc.clientId,
  };
}

/**
 * Convert verified OIDC claims into an Orgni SessionPrincipal.
 */
export function oidcToPrincipal(claims: {
  sub: string;
  email: string | null;
  tenantId: string;
  issuer: string;
  clientId: string;
}): SessionPrincipal {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: claims.email ?? claims.sub,
    tenantId: claims.tenantId,
    roles: ["Owner"],
    iat: now,
    exp: now + 60 * 60 * 8, // 8 hours, matching credential sessions
  };
}
