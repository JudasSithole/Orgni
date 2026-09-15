/**
 * Teams endpoints.
 *
 *  - POST /api/teams/messages           bot messaging endpoint (Bot Framework auth)
 *  - GET  /api/teams/status             connection status (web app)
 *  - GET  /api/teams/manifest.json      generated manifest
 *  - GET  /api/teams/app-package.zip    installable Teams app package
 *  - POST /api/teams/connect/start      begin the admin-consent "Connect" flow
 *  - GET  /api/teams/connect/callback   Microsoft redirects here after consent
 *  - POST /api/teams/disconnect         unlink the connected Microsoft tenant
 *  - POST /api/teams/link               manual fallback: paste a Microsoft tenant id
 *
 * The messaging endpoint and the OAuth callback are public — Bot Framework and
 * Microsoft's login service call them directly, with their own verification
 * (inbound JWT validation, and the signed `state` round-trip, respectively).
 * Everything else is tenant-scoped and mounted behind `authenticate`.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { teamsAdapter, teamsConfigured } from "../teams/adapter";
import { orgniBot } from "../teams/bot";
import { buildAppPackage, buildManifest, resolveBaseUrl } from "../teams/manifest";
import {
  buildAdminConsentUrl,
  connectFlowConfigured,
  createConnectState,
  verifyConnectState,
} from "../teams/oauth";
import { getProductStore } from "../product/store";
import { getMicrosoftIdentityStore } from "../product/microsoft-identity";

/** Public: the bot messaging endpoint + OAuth callback. Mount BEFORE `authenticate`. */
export const teamsPublicRouter: IRouter = Router();

teamsPublicRouter.post("/teams/messages", async (req: Request, res: Response) => {
  try {
    await teamsAdapter.process(req, res, (context) => orgniBot.run(context));
  } catch (err) {
    logger.error({ err }, "teams: adapter.process failed");
    if (!res.headersSent) res.status(500).json({ error: "bot_error" });
  }
});

/**
 * Microsoft redirects the admin's browser here after they approve (or
 * decline) the admin-consent prompt. `tenant` in the query string is the
 * Microsoft tenant id — supplied by Microsoft, not the client, so it's the
 * one value in this whole flow we can trust outright. `state` is ours; it
 * proves the callback belongs to the Orgni admin who started the flow.
 */
teamsPublicRouter.get("/teams/connect/callback", async (req: Request, res: Response) => {
  const appUrl = (config.APP_BASE_URL ?? config.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const settingsUrl = `${appUrl}/app/settings/teams`;

  const stateToken = String(req.query.state ?? "");
  const state = verifyConnectState(stateToken);
  if (!state) {
    logger.warn("teams connect: invalid or expired state");
    res.redirect(`${settingsUrl}?teams_error=invalid_state`);
    return;
  }

  const adminConsent = req.query.admin_consent;
  const microsoftTenantId = String(req.query.tenant ?? "");
  if (adminConsent !== "True" || !microsoftTenantId) {
    res.redirect(`${settingsUrl}?teams_error=consent_declined`);
    return;
  }

  const result = await getMicrosoftIdentityStore().linkTenant({
    orgniTenantId: state.tenantId,
    microsoftTenantId,
    installedBy: state.email,
  });

  if (!result.ok) {
    logger.warn({ error: result.error }, "teams connect: link failed");
    res.redirect(`${settingsUrl}?teams_error=${result.error}`);
    return;
  }

  res.redirect(`${settingsUrl}?teams_connected=1`);
});

/** Authenticated: status, manifest, package, connect/disconnect. */
export const teamsRouter: IRouter = Router();

teamsRouter.get("/teams/status", async (req: Request, res: Response) => {
  const tid = req.principal?.tenantId;
  const connection = tid ? await getMicrosoftIdentityStore().getConnection(tid) : null;
  res.json({
    // Bot registration — required for @Orgni to work at all.
    configured: teamsConfigured(),
    botId: config.MICROSOFT_APP_ID ?? null,
    teamsAppId: config.TEAMS_APP_ID ?? null,
    appType: config.MICROSOFT_APP_TYPE,
    messagingEndpoint: `${resolveBaseUrl(originOf(req))}/api/teams/messages`,
    packageUrl: "/api/teams/app-package.zip",
    // Per-organisation connection — whether this Orgni org is linked.
    connectAvailable: connectFlowConfigured(),
    connection:
      connection && connection.status === "connected"
        ? {
            microsoftTenantId: connection.microsoftTenantId,
            connectedBy: connection.installedBy,
            connectedAt: connection.createdAt,
          }
        : null,
  });
});

teamsRouter.get("/teams/manifest.json", (req: Request, res: Response) => {
  res.json(buildManifest(resolveBaseUrl(originOf(req))));
});

teamsRouter.get("/teams/app-package.zip", (req: Request, res: Response) => {
  const zip = buildAppPackage(resolveBaseUrl(originOf(req)));
  res.setHeader("content-type", "application/zip");
  res.setHeader("content-disposition", 'attachment; filename="orgni-teams-app.zip"');
  res.send(zip);
});

/** POST /api/teams/connect/start — returns the Microsoft admin-consent URL. */
teamsRouter.post("/teams/connect/start", (req: Request, res: Response) => {
  const tid = req.principal?.tenantId;
  const email = req.principal?.sub;
  if (!tid || !email) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  if (!connectFlowConfigured()) {
    res.status(503).json({ error: "not_configured" });
    return;
  }
  const baseUrl = resolveBaseUrl(originOf(req));
  const redirectUri = `${baseUrl}/api/teams/connect/callback`;
  const state = createConnectState(tid, email);
  res.json({ url: buildAdminConsentUrl(state, redirectUri) });
});

/** POST /api/teams/disconnect — unlink the connected Microsoft tenant. */
teamsRouter.post("/teams/disconnect", async (req: Request, res: Response) => {
  const tid = req.principal?.tenantId;
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  await getMicrosoftIdentityStore().unlink(tid);
  res.json({ ok: true });
});

/**
 * POST /api/teams/link — manual fallback for local development or when the
 * admin-consent flow isn't configured yet: paste the Microsoft tenant id
 * directly. Uses the same unique-per-Microsoft-tenant guarantee as /connect.
 */
teamsRouter.post("/teams/link", async (req: Request, res: Response) => {
  const tid = req.principal?.tenantId;
  const email = req.principal?.sub ?? null;
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const microsoftTenantId = String(req.body?.aadTenantId ?? req.body?.microsoftTenantId ?? "").trim();
  if (!microsoftTenantId) {
    res.status(400).json({ error: "tenant_id_required" });
    return;
  }
  const store = getProductStore();
  const state = await store.getState(tid);
  if (!state.organisation) {
    res.status(409).json({ error: "no_organisation" });
    return;
  }
  const result = await getMicrosoftIdentityStore().linkTenant({
    orgniTenantId: tid,
    microsoftTenantId,
    installedBy: email,
  });
  if (!result.ok) {
    res.status(409).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});

function originOf(req: Request): string | undefined {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return host ? `${proto}://${host}` : undefined;
}
