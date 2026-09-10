# Orgni Teams bot

Everything for the Teams app is implemented here. What remains is **registration**
(Azure + Teams admin) and setting the resulting IDs as environment variables.

## What's built

| Piece | File |
|---|---|
| Bot Framework adapter (CloudAdapter) | `adapter.ts` |
| Conversation handler (`@Orgni` mentions, Adaptive Card approvals) | `bot.ts` |
| Manifest + installable `.zip` package generator | `manifest.ts` |
| Icons (generated, no design tool needed) | `assets/`, `../../scripts/make-teams-icons.mjs` |
| Routes: `/api/teams/messages`, `/status`, `/manifest.json`, `/app-package.zip`, `/link` | `../routes/teams.ts` |
| Request engine (capability + approval gates, context, activity log) | `../product/engine.ts` |

The engine's reply text comes from an `IntelligenceProvider` (`engine.ts`). The
default is deterministic and needs no API key. Swap it via
`setIntelligenceProvider(...)` at boot to use a real model — that is the only
seam that changes.

## Environment variables

| Var | Purpose |
|---|---|
| `PUBLIC_BASE_URL` | Public origin of this API, e.g. `https://api.orgni.com`. Used in the manifest. |
| `MICROSOFT_APP_ID` | Azure Bot / Entra app (client) id. |
| `MICROSOFT_APP_PASSWORD` | Client secret for that app. |
| `MICROSOFT_APP_TYPE` | `MultiTenant` (default), `SingleTenant`, or `UserAssignedMSI`. |
| `MICROSOFT_APP_TENANT_ID` | Entra tenant id — only for `SingleTenant` / `UserAssignedMSI`. |
| `TEAMS_APP_ID` | GUID for the Teams app itself (from the manifest). Deep links use it. |
| `TEAMS_DEFAULT_ORGNI_TENANT` | Single-org shortcut: every Teams message maps to this Orgni tenant id. |
| `DATABASE_URL` | Optional. Without it, product state is in-memory (fine for a demo). |

## Registration steps

1. **Azure Bot** — create an *Azure Bot* resource (multi-tenant is simplest).
   Record the *Microsoft App ID* and create a *client secret*.
2. **Env** — set `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`, `MICROSOFT_APP_TYPE`,
   `PUBLIC_BASE_URL` (and `MICROSOFT_APP_TENANT_ID` if single-tenant). Redeploy.
3. **Messaging endpoint** — in the Azure Bot → *Configuration*, set it to
   `${PUBLIC_BASE_URL}/api/teams/messages`. Add the **Microsoft Teams** channel.
4. **Teams app id** — generate a GUID, set `TEAMS_APP_ID`, redeploy.
5. **Package** — `GET /api/teams/app-package.zip` (or Settings → Teams app →
   *Download Teams app package*). It contains `manifest.json` + icons, generated
   for this deployment.
6. **Upload** — Teams admin center → *Teams apps* → *Manage apps* → *Upload*, or
   sideload in the Teams client (*Apps* → *Manage your apps* → *Upload an app*).
7. **Routing** — set `TEAMS_DEFAULT_ORGNI_TENANT`, or per-org call
   `POST /api/teams/link { aadTenantId }` (Settings → Teams app → *Link*).
8. **Test** — add Orgni to a chat/channel and mention `@Orgni`.

## Testing without Teams

`POST /api/product/simulate { "text": "...", "requestedBy": "..." }` runs the
exact engine path the bot uses. The web app exposes this at
Settings → Teams app → *Test Orgni*.

For the real bot loop locally, point the [Bot Framework Emulator](https://aka.ms/bot-framework-emulator)
at `http://localhost:5001/api/teams/messages` (leave app id/password blank).
