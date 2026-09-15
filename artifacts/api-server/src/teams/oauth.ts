/**
 * Microsoft admin-consent "Connect" flow.
 *
 * Uses the v2.0 admin-consent endpoint, which needs only the app's client id
 * (reuses MICROSOFT_APP_ID — the same Entra app registration as the bot) and a
 * registered redirect URI. No client secret is exchanged in this leg: an
 * Entra admin signs in, approves the app for their tenant, and Microsoft
 * redirects back with that tenant's id in the query string. That tenant id is
 * the only thing we trust — never a value the client could supply directly.
 *
 * `state` binds the callback to the Orgni admin who started the flow (HMAC,
 * short-lived) so a forged callback can't link a Microsoft tenant to the
 * wrong Orgni organisation.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config, authSecret } from "../lib/config";

const STATE_TTL_SECONDS = 15 * 60;

interface ConnectState {
  tenantId: string; // Orgni tenant id
  email: string; // admin who started the flow
  nonce: string;
  exp: number;
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

function sign(body: string): string {
  return createHmac("sha256", authSecret).update(body).digest("base64url");
}

export function createConnectState(tenantId: string, email: string): string {
  const state: ConnectState = {
    tenantId,
    email,
    nonce: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(state));
  return `${body}.${sign(body)}`;
}

export function verifyConnectState(token: string): ConnectState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ConnectState;
    if (state.exp < Math.floor(Date.now() / 1000)) return null;
    if (!state.tenantId || !state.email) return null;
    return state;
  } catch {
    return null;
  }
}

/** True once MICROSOFT_APP_ID is set — the "Connect" button needs it. */
export function connectFlowConfigured(): boolean {
  return Boolean(config.MICROSOFT_APP_ID);
}

/** Build the Microsoft v2.0 admin-consent URL an Orgni admin is sent to. */
export function buildAdminConsentUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: config.MICROSOFT_APP_ID ?? "",
    redirect_uri: redirectUri,
    state,
    scope: "https://graph.microsoft.com/.default",
  });
  return `https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params.toString()}`;
}
