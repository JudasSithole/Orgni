# Orgni — production readiness

This document lists what must be configured or built before the Orgni product
experience (onboarding + control centre + Teams bot) is production‑ready.

The code contains **no fabricated data**. Every screen shows real data from the
backend or a clear empty state. Where an integration isn't built yet, the UI
says so and the connection is marked `mode: "mock"`.

---

## TL;DR checklist

| Area | Env / action | Status without it |
|---|---|---|
| **Database** | `DATABASE_URL` + run migrations | Product state is in‑memory (lost on restart) |
| **Auth** | Replace the dev login with real OIDC | **No authentication in production** (dev login is 404‑gated) |
| **Session signing** | `SESSION_SECRET` (≥32 chars) | API refuses to start in production |
| **CORS** | `CORS_ORIGINS` | Cross‑origin requests blocked (same‑origin only) |
| **Public URL** | `PUBLIC_BASE_URL` | Teams manifest / email links fall back to request origin |
| **LLM** | `ANTHROPIC_API_KEY` (+ `ORGNI_MODEL`) | Engine uses deterministic template replies |
| **Teams bot** | `MICROSOFT_APP_ID/PASSWORD/TYPE`, `TEAMS_APP_ID`, Azure Bot registration | `@Orgni` in Teams doesn't work |
| **Message routing** | `TEAMS_DEFAULT_ORGNI_TENANT` **or** per‑org tenant link | Bot can't map a Teams tenant to an Orgni org |
| **Email (invites)** | `RESEND_API_KEY` + `EMAIL_FROM` | Member invites are added but no email is sent |
| **Knowledge ingestion** | `DOCUMENT_INTELLIGENCE_URL`, `ONTOLOGY_URL` | File upload + the Knowledge map stay empty |
| **Microsoft 365 sync** | OAuth + Microsoft Graph (not built) | "Connect Microsoft" is a guided demo, nothing syncs |
| **Other connectors** | Salesforce / SAP / Xero / Google (not built) | Same — demo connect flow only |

---

## 1. Database

The product/control‑centre state (organisation, connections, capabilities,
approval policies, permissions, members, Teams integration, activity log) is
persisted per tenant.

- **Without `DATABASE_URL`** the API server keeps it in an in‑memory `Map` — fine
  for local dev, **lost on every restart**, not shared across instances.
- **With `DATABASE_URL`** it uses Postgres via Drizzle.

```bash
export DATABASE_URL="postgres://user:pass@host:5432/orgni"
pnpm --filter @workspace/db run migrate      # applies migrations 0000–0002
```

Migrations live in `lib/db/migrations/`. `0001_product_state` and `0002_members`
create the product tables. Redeploy the API server after `DATABASE_URL` is set —
it auto‑detects Postgres at boot (`src/product/store.ts`).

---

## 2. Authentication — the biggest gap

`POST /api/auth/login` is a **dev‑only** endpoint: email + organisation, **no
password**, HMAC‑signed session. It returns `404` when `NODE_ENV=production`, so
**there is currently no way to authenticate in production.**

Before going live you must:

1. Wire a real identity provider. The code is built for **Microsoft Entra
   External ID** (OIDC) — the comments in `artifacts/api-server/src/lib/auth.ts`
   and `authenticate.ts` mark the single seam (`verifyToken` /
   `req.principal`). Downstream code only reads `req.principal` (`{ sub,
   tenantId, roles }`), so nothing else changes.
2. Map the IdP tenant/domain to an Orgni `tenantId` (today: `tenantIdFromOrg()`).
3. Replace the web app's `/login` page (`artifacts/orgni/src/pages/login.tsx`) —
   it currently renders the dev email/org form.
4. Set `SESSION_SECRET` (≥32 chars) — the API **throws on boot** in production
   without it.

Until then, run with `NODE_ENV=development` behind your own gateway, or finish
the OIDC integration.

---

## 3. API server config

| Var | Purpose |
|---|---|
| `NODE_ENV=production` | Enables prod behaviour (real CORS, disables dev endpoints) |
| `SESSION_SECRET` | Signs sessions. Required in production. |
| `DATABASE_URL` | Postgres. See §1. |
| `CORS_ORIGINS` | Comma‑separated allowed origins, e.g. `https://app.orgni.com` (wildcards ok: `https://*.orgni.com`). Unset = same‑origin only. |
| `PUBLIC_BASE_URL` | Public origin of the API, e.g. `https://api.orgni.com`. Used in the Teams manifest. |
| `LOG_LEVEL` | pino level (default `info`). |
| `MAX_UPLOAD_BYTES` | Document upload cap (default 20 MB). |

**Dev‑only endpoints (404 in production):** `POST /api/auth/login`,
`POST /api/product/reset`.

---

## 4. Intelligence (the Orgni engine)

`processRequest()` (`artifacts/api-server/src/product/engine.ts`) parses intent,
enforces the tenant's **capability** and **approval** settings, gathers context
from the model API, then asks an `IntelligenceProvider` for the reply text.

- **Default:** `TemplateIntelligenceProvider` — deterministic, no API calls,
  grounded in the gathered context. Safe but not clever.
- **Real model:** set `ANTHROPIC_API_KEY`. At boot the server swaps in
  `createAnthropicProvider()` (`intelligence-anthropic.ts`), which calls the
  Anthropic Messages API. Model defaults to `claude-opus-5`; override with
  `ORGNI_MODEL` (e.g. `claude-sonnet-5` or `claude-haiku-4-5` for cost).

The provider only ever writes the reply body — capability/approval gating and
the activity log stay in the engine, so the model can't bypass policy.

**To use a different provider** (OpenAI, a private model, Bedrock/Vertex): add a
module implementing `IntelligenceProvider` and call `setIntelligenceProvider()`
in `src/index.ts`. That's the only change.

---

## 5. Microsoft Teams bot

Fully implemented; needs **registration only**. Full walkthrough:
`artifacts/api-server/src/teams/README.md`.

1. Create an **Azure Bot** resource + Entra app registration. Record the app
   (client) id and create a client secret.
2. Set on the API server:
   `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`, `MICROSOFT_APP_TYPE`
   (`MultiTenant` / `SingleTenant`), `MICROSOFT_APP_TENANT_ID` (single‑tenant
   only), `PUBLIC_BASE_URL`.
3. In the Azure Bot → Configuration, set the **Messaging endpoint** to
   `${PUBLIC_BASE_URL}/api/teams/messages` and add the **Microsoft Teams**
   channel.
4. Generate a GUID for the Teams app itself, set `TEAMS_APP_ID`.
5. Download the app package: **Settings → Teams app → Download Teams app
   package** (or `GET /api/teams/app-package.zip`). Upload it in Teams admin
   center → *Manage apps*, or sideload it in the Teams client.
6. **Message routing** — the bot must map an incoming Teams (AAD) tenant to an
   Orgni tenant:
   - Single‑org deployment: set `TEAMS_DEFAULT_ORGNI_TENANT` (e.g.
     `tenant_acme-inc`).
   - Multi‑org: each org links its Microsoft 365 tenant id via **Settings →
     Teams app → Link** (`POST /api/teams/link`).

---

## 6. Email (member invites)

Adding a member by work email (**Settings → Members**) whitelists that email for
the workspace. To actually send the invite email:

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | [Resend](https://resend.com) API key (HTTP API, no SDK). |
| `EMAIL_FROM` | Verified sender, e.g. `Orgni <no-reply@orgni.com>`. |
| `APP_BASE_URL` | Web app origin for the "Open Orgni" link (falls back to `PUBLIC_BASE_URL`). |

Without these, `sendMemberInvite()` (`artifacts/api-server/src/lib/email.ts`) is
a logged no‑op. To use SMTP/SES/SendGrid instead, replace the `send()` function
in that file — it's the only place email is sent.

---

## 7. Knowledge ingestion

The Knowledge map and the engine's context both come from the document pipeline
+ ontology:

| Var | Purpose |
|---|---|
| `DOCUMENT_INTELLIGENCE_URL` | Python Document Intelligence service (`intelligence/document-intelligence`). Required for `POST /api/documents` (file upload). |
| `ONTOLOGY_URL` | Python Organizational Ontology service. When set, uploads become reviewable entities/relationships that feed the Knowledge map. |

Without both, file upload returns `503`, and **Knowledge stays empty** (the
screen shows its empty state — no placeholder counts).

---

## 8. Connections — not yet real

The connection catalogue (Microsoft 365, Salesforce, SAP, Xero, Google
Workspace, Custom API) has a working connect/disconnect flow, but **no real
integration**. Connected records are `mode: "mock"` and the UI says so
("guided demo integration").

To make Microsoft 365 real:
1. OAuth 2.0 authorization‑code flow against Entra (delegated + app permissions
   for Graph: Mail, Calendars, Files, Team messages).
2. Token storage per tenant (encrypted).
3. A sync/ingestion job that pushes SharePoint/OneDrive/Outlook content through
   the Document Intelligence pipeline.
4. Wire the engine's `send_emails` / `schedule_meetings` / `update_systems`
   actions to Graph calls (currently they only produce approval cards).

The `Connection` domain object and the connect flow are structured for this —
replace the mock in `POST /api/product/connections`.

---

## 9. What was removed for production

- All demo/seed data: `DEMO_KNOWLEDGE_*`, `DEMO_ACTIVITY`, fabricated onboarding
  discovery counts, the hard‑coded knowledge graph.
- The "showing example data" notices.
- Simulated network delays in the web app.
- The fake "learning" timer — the Knowledge state now reflects real document
  processing status from the model API.

Remaining mock, clearly labelled in the UI and above: connection sync, Teams
install `mode`, and (without `ANTHROPIC_API_KEY`) the engine reply text.
