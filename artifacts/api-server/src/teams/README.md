# Orgni Teams bot

Everything for the Teams app is implemented here. What remains is **one-time
Microsoft registration** (Azure + Entra, done once by Olyxee) — after that,
every Orgni customer connects their own Microsoft tenant from
Settings → Integrations → Microsoft Teams, no code or redeploy involved.

## What's built

| Piece | File |
|---|---|
| Bot Framework adapter (CloudAdapter) | `adapter.ts` |
| Conversation handler (`@Orgni` mentions, Adaptive Card approvals) | `bot.ts` |
| Admin-consent "Connect" OAuth flow (state signing + URL building) | `oauth.ts` |
| Manifest + installable `.zip` package generator | `manifest.ts` |
| Icons (generated, no design tool needed) | `assets/`, `../../scripts/make-teams-icons.mjs` |
| Routes: messages, status, manifest, package, connect/disconnect/link | `../routes/teams.ts` |
| Tenant ↔ organisation identity resolution, audit log, idempotency | `../product/microsoft-identity.ts` |
| Request engine (capability + approval gates, context, activity log) | `../product/engine.ts` |

The engine's reply text comes from an `IntelligenceProvider` (`engine.ts`). The
default is deterministic and needs no API key. Setting `ANTHROPIC_API_KEY`
switches it to a real model — that is the only seam that changes.

## How identity resolution works

Every inbound Teams activity goes through the same chain before Orgni ever
touches business data — see `bot.ts` for the implementation:

```
Microsoft tenant id (from the activity)
  → microsoft_connections (unique per Microsoft tenant)   [product/microsoft-identity.ts]
  → Orgni tenant id
  → external_identities (per Microsoft tenant + Entra object id)
  → Orgni member (existing, or auto-provisioned if the org's audience allows it)
  → engine.processRequest(tenantId, ...)                  [product/engine.ts]
```

An unresolved Microsoft tenant or user is **denied**, never guessed — there is
no environment-variable or config fallback that maps Teams traffic to an
organisation. `microsoft-teams.test.ts` covers this (unlinked tenant denied,
no cross-tenant bleed, no cross-tenant auto-provisioning).

## Environment variables

| Var | Purpose |
|---|---|
| `PUBLIC_BASE_URL` | Public origin of this API, e.g. `https://api.orgni.com`. Used in the manifest, the bot's messaging endpoint, and the OAuth redirect URI. |
| `APP_BASE_URL` | Public origin of the web app (falls back to `PUBLIC_BASE_URL`). Where the Connect flow redirects back to after Microsoft. |
| `MICROSOFT_APP_ID` | Azure Bot / Entra app (client) id. Also reused as the OAuth client id for the "Connect" flow — no separate registration needed. |
| `MICROSOFT_APP_PASSWORD` | Client secret for that app registration. Only used for the bot's own auth, not the Connect flow. |
| `MICROSOFT_APP_TYPE` | `MultiTenant` (default), `SingleTenant`, or `UserAssignedMSI`. |
| `MICROSOFT_APP_TENANT_ID` | Entra tenant id — only for `SingleTenant` / `UserAssignedMSI`. |
| `TEAMS_APP_ID` | GUID for the Teams app itself (from the manifest). Deep links use it. |
| `DATABASE_URL` | Optional. Without it, product state and Microsoft tenant/identity links are in-memory (lost on restart). |

See `docs/MICROSOFT_TEAMS_SETUP.md` for exactly where each Microsoft value
comes from, and `../../.env.example` for the full server env var list.

## Registration steps (once, by whoever owns the Olyxee Azure/Entra account)

1. **Azure Bot** — create an *Azure Bot* resource (multi-tenant is simplest).
   Record the *Microsoft App ID* and create a *client secret*.
2. **Redirect URI** — on that same app registration (Entra ID → App
   registrations → the bot's app → *Authentication*), add a **Web** platform
   redirect URI: `${PUBLIC_BASE_URL}/api/teams/connect/callback`. This is what
   lets customers use the one-click "Connect Microsoft Teams" button instead
   of pasting a tenant id.
3. **Env** — set `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`,
   `MICROSOFT_APP_TYPE`, `PUBLIC_BASE_URL`, `APP_BASE_URL` (and
   `MICROSOFT_APP_TENANT_ID` if single-tenant). Redeploy.
4. **Messaging endpoint** — in the Azure Bot → *Configuration*, set it to
   `${PUBLIC_BASE_URL}/api/teams/messages`. Add the **Microsoft Teams** channel.
5. **Teams app id** — generate a GUID, set `TEAMS_APP_ID`, redeploy.
6. **Done.** From here every customer self-serves: Settings → Integrations →
   Microsoft Teams → *Connect Microsoft Teams* → Microsoft admin-consent
   → tenant linked → download the generated app package → upload/sideload it
   in their own Teams tenant.

Full step-by-step with screenserver-free instructions (what to click, what to
paste where) is in `docs/MICROSOFT_TEAMS_SETUP.md`.

## Testing without Teams

`POST /api/product/simulate { "text": "...", "requestedBy": "..." }` runs the
exact engine path the bot uses, with no Microsoft identity resolution at all.
The web app exposes this at Settings → Integrations → Microsoft Teams →
*Manage* → *Ask Orgni*.

To exercise the real identity-resolution path locally without a full Azure Bot
registration, use the manual fallback: `POST /api/teams/link { microsoftTenantId }`
(authenticated, same uniqueness guarantee as Connect) links any tenant id to
your dev org, then POST a simulated activity to `/api/teams/messages` with that
same id in `channelData.tenant.id`. Outbound replies will fail without a real
`serviceUrl`-reachable channel (see "Known limitation" below) — that's expected
for a local unit-level check; use the Bot Framework Emulator (below) to see an
actual reply.

For the real bot loop locally, point the [Bot Framework Emulator](https://aka.ms/bot-framework-emulator)
at `http://localhost:5001/api/teams/messages` (leave app id/password blank for
anonymous mode, or fill them in to test real auth).

### Known limitation

Sending a raw simulated activity via curl/Postman (rather than the Bot
Framework Emulator or a real Teams client) will resolve tenant/user identity
and auto-provision correctly, but the bot's reply (`context.sendActivity`)
will fail, because Bot Framework's connector client tries to authenticate
against whatever `serviceUrl` the activity claims — which only the Emulator or
real Teams actually serve. This is a transport-layer requirement, not a bug in
identity resolution; `microsoft-teams.test.ts` covers resolution and
provisioning directly without needing a live channel.
