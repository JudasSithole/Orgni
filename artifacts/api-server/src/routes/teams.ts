/**
 * Teams endpoints.
 *
 *  - POST /api/teams/messages       bot messaging endpoint (Bot Framework auth)
 *  - GET  /api/teams/status         is the bot configured? (web app)
 *  - GET  /api/teams/manifest.json  generated manifest
 *  - GET  /api/teams/app-package.zip installable Teams app package
 *  - POST /api/teams/link           link this org to its Microsoft 365 tenant
 *
 * The messaging endpoint is public (it authenticates inbound Bot Framework
 * JWTs itself). Everything else is tenant-scoped and mounted behind `authenticate`.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { teamsAdapter, teamsConfigured } from "../teams/adapter";
import { orgniBot } from "../teams/bot";
import { buildAppPackage, buildManifest, resolveBaseUrl } from "../teams/manifest";
import { getProductStore } from "../product/store";

/** Public: the bot messaging endpoint. Mount BEFORE `authenticate`. */
export const teamsPublicRouter: IRouter = Router();

teamsPublicRouter.post("/teams/messages", async (req: Request, res: Response) => {
  try {
    await teamsAdapter.process(req, res, (context) => orgniBot.run(context));
  } catch (err) {
    logger.error({ err }, "teams: adapter.process failed");
    if (!res.headersSent) res.status(500).json({ error: "bot_error" });
  }
});

/** Authenticated: status, manifest, package, link. */
export const teamsRouter: IRouter = Router();

teamsRouter.get("/teams/status", (req: Request, res: Response) => {
  res.json({
    configured: teamsConfigured(),
    botId: config.MICROSOFT_APP_ID ?? null,
    teamsAppId: config.TEAMS_APP_ID ?? null,
    appType: config.MICROSOFT_APP_TYPE,
    messagingEndpoint: `${resolveBaseUrl(originOf(req))}/api/teams/messages`,
    packageUrl: "/api/teams/app-package.zip",
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

/** POST /api/teams/link — { aadTenantId } records the M365 tenant for routing. */
teamsRouter.post("/teams/link", async (req: Request, res: Response) => {
  const tid = req.principal?.tenantId;
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const aadTenantId = String(req.body?.aadTenantId ?? "").trim();
  if (!aadTenantId) {
    res.status(400).json({ error: "aad_tenant_required" });
    return;
  }
  const store = getProductStore();
  const state = await store.getState(tid);
  if (!state.organisation) {
    res.status(409).json({ error: "no_organisation" });
    return;
  }
  state.organisation.teamsAadTenantId = aadTenantId;
  await store.putState(tid, state);
  res.json({ ok: true });
});

function originOf(req: Request): string | undefined {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return host ? `${proto}://${host}` : undefined;
}
