# Microsoft Teams setup

Everything Orgni-side is built and tested. What's left is registering one
Microsoft Entra app + Azure Bot resource — a one-time action, done once for
**all** Orgni customers, not per customer. After this is done, every customer
connects their own Microsoft org themselves from Settings → Integrations →
Microsoft Teams — no further engineering work or per-customer config.

---

## Information required from Lethabo

Everything below is done in the **Olyxee** Microsoft/Azure account (the one
Orgni's Teams app is registered under — not any customer's account). Five
manual steps, five values to hand back.

| # | Where | What to do | What to copy back | Goes in env var |
|---|---|---|---|---|
| 1 | [Azure Portal](https://portal.azure.com) → **Azure Bot** → Create | Create a new Azure Bot resource. Choose **Multi Tenant** as the type (lets any customer's Microsoft org use it — this is what makes per-customer self-serve possible). | The **Microsoft App ID** shown after creation | `MICROSOFT_APP_ID` |
| 2 | Same Azure Bot resource → **Configuration** → *Manage* (next to Microsoft App ID) → **Certificates & secrets** → **New client secret** | Create a client secret. Copy its **value** immediately — Azure only shows it once. | The secret **value** (not the secret ID) | `MICROSOFT_APP_PASSWORD` |
| 3 | Same app registration → **Authentication** → **Add a platform** → **Web** | Add a redirect URI: `https://<your-api-domain>/api/teams/connect/callback` (the real `PUBLIC_BASE_URL` you're deploying with). This is what lets a customer admin click "Connect Microsoft Teams" and have it just work, instead of pasting IDs manually. | Nothing — just confirm it was saved | (no env var; must match `PUBLIC_BASE_URL` below) |
| 4 | Azure Bot resource → **Configuration** | Set **Messaging endpoint** to `https://<your-api-domain>/api/teams/messages`. Under **Channels**, add the **Microsoft Teams** channel. | Nothing to copy | — |
| 5 | Anywhere (e.g. [uuidgenerator.net](https://www.uuidgenerator.net/) or `pwsh -c '[guid]::NewGuid()'`) | Generate one random GUID for the Teams app itself (this is separate from the App ID above — it identifies the Teams app listing, not the bot). | The generated GUID | `TEAMS_APP_ID` |

Also confirm the two URLs the deployment will run at:

| Value | Example | Goes in env var |
|---|---|---|
| Public URL of the API server | `https://api.orgni.com` | `PUBLIC_BASE_URL` |
| Public URL of the web app | `https://app.orgni.com` | `APP_BASE_URL` |

That's it — **5 values** (`MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`,
`TEAMS_APP_ID`, `PUBLIC_BASE_URL`, `APP_BASE_URL`) plus the redirect URI and
messaging endpoint configured in the Azure portal. Nothing else is needed —
no per-customer registration, no Microsoft Graph API permissions beyond the
default `.default` admin-consent scope, no additional app registrations.

Once those are set as environment variables on the API server and it's
redeployed, hand it back and every Orgni customer can self-serve the rest from
their own Settings page.

---

## Why this is safe: what each customer actually consents to

The admin-consent flow (`GET /api/teams/connect/start` →
`https://login.microsoftonline.com/organizations/v2.0/adminconsent`) asks the
*customer's* Entra admin to approve the Olyxee Teams app for their org. It
uses the same `MICROSOFT_APP_ID` from step 1 — no per-customer app
registration. Microsoft redirects back with that customer's Microsoft tenant
id, which Orgni links to their Orgni organisation in a database table with a
uniqueness constraint: one Microsoft tenant can never map to two Orgni orgs,
and a forged callback can't hijack the link because the round trip is
protected by a signed, short-lived state token. See
[`artifacts/api-server/src/teams/README.md`](artifacts/api-server/src/teams/README.md#how-identity-resolution-works)
for the full resolution chain and
[`artifacts/api-server/tests/microsoft-teams.test.ts`](artifacts/api-server/tests/microsoft-teams.test.ts)
for the isolation tests.

---

## What happens after registration (per customer, self-serve, no engineering)

1. Customer admin opens **Settings → Integrations → Microsoft Teams** in
   Orgni, clicks **Connect Microsoft Teams**.
2. They're sent to Microsoft's admin-consent screen for their own
   organisation, sign in, approve.
3. Microsoft redirects back; Orgni links their Microsoft tenant id to their
   Orgni organisation (rejecting the attempt with a clear error if that
   Microsoft tenant is already linked to a *different* Orgni org).
4. The Settings page now shows **Connected** with the org name, who connected
   it, and a **Manage** panel with the Teams app package to download.
5. The admin uploads that package to their Teams admin center (or sideloads it
   for testing) — this step is inherent to how Teams app installation works
   and can't be skipped by any app, Orgni included.
6. Employees mention `@Orgni <question>` in any chat, channel, or DM with the
   app installed. First-time users are auto-provisioned as Orgni members if
   the org's audience setting is "all employees"; otherwise an admin adds them
   under Settings → Members first.

## Local development

See [`artifacts/api-server/src/teams/README.md`](artifacts/api-server/src/teams/README.md)
for running the API server locally, linking a test tenant via the
`POST /api/teams/link` fallback, and using the Bot Framework Emulator to see
real bot replies (a raw curl/Postman test can exercise identity resolution and
auto-provisioning, but the bot's *reply* requires a real channel — the
Emulator or Teams itself — because Bot Framework authenticates outbound calls
against the activity's `serviceUrl`).

## Everything else is already built

- Tenant → organisation → user resolution, with no fallback that guesses an
  organisation (unlinked tenant or unrecognised user is denied, not assumed).
- Auto-provisioning policy respecting each org's audience setting
  (all employees / specific users / specific departments / specific teams).
- `@Orgni` mention parsing, natural language only — no slash commands to learn.
- Every question is routed through Orgni's existing engine
  (`processRequest`), scoped to the resolved organisation only — there is no
  separate "Teams intelligence."
- Adaptive Card approvals for actions that need sign-off, reusing the existing
  approval/capability system — no Teams-specific policy engine.
- Full audit trail (`teams_audit_log`): Orgni org, Microsoft tenant, Entra
  user, conversation, question, sources used, outcome, timestamp — for every
  attempt, including denied ones.
- Idempotent message handling (safe against Bot Framework redelivery).
- 18 automated tests covering tenant isolation, identity resolution, denial
  paths, mention parsing, and auto-provisioning policy — see
  `artifacts/api-server/tests/microsoft-teams.test.ts`.
