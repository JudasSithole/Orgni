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
| **Auth** | `DATABASE_URL` (accounts table) | Registration and sign‑in return `503` — no accounts can be created |
| **Session signing** | `SESSION_SECRET` (≥32 chars) | API refuses to start in production |
| **Rate limiting** | `TRUST_PROXY_HOPS` (default `1`) | All clients share one throttle bucket if the real client IP is hidden behind a proxy |
| **CORS** | `CORS_ORIGINS` | Cross‑origin requests blocked (same‑origin only) |
| **Public URL** | `PUBLIC_BASE_URL` | Teams manifest / email links fall back to request origin |
| **LLM** | `ANTHROPIC_API_KEY` (+ `ORGNI_MODEL`) | Engine uses deterministic template replies |
| **Teams bot** | `MICROSOFT_APP_ID/PASSWORD/TYPE`, `TEAMS_APP_ID`, Azure Bot registration | `@Orgni` in Teams doesn't work |
| **Teams tenant linking** | Redirect URI `${PUBLIC_BASE_URL}/api/teams/connect/callback` on the app registration | "Connect Microsoft Teams" button stays disabled; orgs must use the manual tenant‑id fallback |
| **Email (invites + password reset)** | `RESEND_API_KEY` + `EMAIL_FROM` + `APP_BASE_URL` | Invites and reset links are recorded as "not configured — skipped"; **nobody can recover a lost password** |
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

Migrations live in `lib/db/migrations/`: `0001_product_state` and
`0002_members` create the product tables, `0003_microsoft_identity` creates
the Microsoft tenant/identity/conversation/audit tables, and
`0004_orgni_actions_source` adds activity‑source tracking. Redeploy the API
server after `DATABASE_URL` is set — it auto‑detects Postgres at boot
(`src/product/store.ts`, `src/product/microsoft-identity.ts`).

---

## 2. Authentication

Credential auth is live in every environment. `POST /api/auth/register` creates an
account, a fresh tenant, and the registrant as its first Owner;
`POST /api/auth/login` exchanges email + password for an HMAC-signed session.
Passwords are scrypt hashes (N=32768, per-account salt) and never stored in the
clear. Sign-in does the same verification work for unknown addresses, so response
time does not reveal whether an account exists.

`POST /api/auth/password-reset/request` emails a single-use link
(`POST /api/auth/password-reset/confirm` spends it). It answers `202` for every
address, known or not, so it cannot be used to enumerate users. Only the SHA-256
of the token is stored, links expire after 30 minutes, and requesting a new one
voids the old.

**Email is the hard dependency here.** Without `RESEND_API_KEY` + `EMAIL_FROM` +
`APP_BASE_URL` the request still returns `202`, but no link is sent and a user who
forgets their password has no way back in. This is the most important env var pair
in the file.

Rate limiting is per client IP and only counts *failures* (20 per 15 min on
sign-in and reset; sign-up is charged on success, 10/hour), so a shared office
egress is never throttled for signing in successfully. Counters are in-process:
behind multiple replicas, add a shared gateway limit as well.

Before going live you should still:

1. Wire a real identity provider. The code ships an **OIDC/SSO** seam built for
   **Microsoft Entra External ID**: `GET /auth/oidc/start` kicks off the
   authorization-code flow (state + nonce in `HttpOnly` cookies), and
   `GET /auth/oidc/callback` verifies the returned ID token (RS256 signature via
   JWKS fetched from the provider's `.well-known/openid-configuration`, plus
   issuer/audience/expiry/nbf checks) and issues the session cookie. The
   verification module is `artifacts/api-server/src/lib/oidc.ts`; it is wired
   into `authenticate.ts` as a fourth bearer-token path (after API key, before
   session token). Set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`,
   and `OIDC_SCOPES` in the environment to enable it — omit `OIDC_ISSUER` and
   the routes return `503 oidc_not_configured`. Downstream code only reads
   `req.principal` (`{ sub, tenantId, roles }`), so nothing else changes.
2. Verify `TRUST_PROXY_HOPS` matches your real hop count. Wrong in either
   direction and the limiter either throttles everyone together or trusts
   spoofed `X-Forwarded-For`.

Sessions are held in an `HttpOnly`, `SameSite=Lax` cookie (`orgni_session`)
set by the API on sign-in, verification, and password-reset confirmation. The
cookie is not readable by page script, so it cannot be stolen by XSS. The web
console keeps only the principal (email, tenant, roles) in `localStorage` to
render the UI; the actual token lives in the cookie and is sent automatically
on same-origin requests. API/service clients still authenticate via
`Authorization: Bearer` session tokens or API keys.

### Email verification

Registration requires the address to be confirmed before it receives a session.
`POST /api/auth/register` returns **202 with no session** and emails a
single-use link; `POST /api/auth/verify-email` spends it, stamps
`accounts.email_verified_at`, and returns a session so the user lands directly
in onboarding. `POST /api/auth/verify-email/resend` re-sends the link and
answers `202` for every address, so it cannot be used to enumerate users.

**This makes email a hard dependency of signup, not just of recovery.** If
`RESEND_API_KEY` and `EMAIL_FROM` are both set, verification is enforced. If
they are not, verification is skipped and the account is stamped verified, so
local and preview environments still work — but production logs a loud error
saying verification is off. Treat that log line as a launch blocker.

Existing accounts are backfilled as verified by migration `0007`, so switching
this on does not lock anyone out.

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
| `TRUST_PROXY_HOPS` | Reverse-proxy hops in front of the API (default `1`). Sets the hop count Express uses to resolve `req.ip`, which the credential rate limiting keys on. |
| `APP_BASE_URL` | Web app origin, used to build password-reset links. Falls back to `PUBLIC_BASE_URL`. |
| `OIDC_ISSUER` | Identity-provider issuer URL, e.g. `https://login.microsoftonline.com/<tenant>/v2.0`. Enables SSO; unset = no OIDC routes (they 503). |
| `OIDC_CLIENT_ID` | RP client ID registered with the provider. |
| `OIDC_CLIENT_SECRET` | RP client secret. |
| `OIDC_SCOPES` | Space-separated scopes (default `openid email profile`). |

**Dev‑only endpoints (404 in production):** `POST /api/product/reset`.

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

Fully implemented; needs **one‑time registration by whoever owns the Olyxee
Azure/Entra account**, done once for all customers. Full walkthrough with
exact click‑paths: [`MICROSOFT_TEAMS_SETUP.md`](MICROSOFT_TEAMS_SETUP.md).
Architecture and local-dev notes: `artifacts/api-server/src/teams/README.md`.

1. Create an **Azure Bot** resource + Entra app registration. Record the app
   (client) id and create a client secret.
2. On that same app registration, add a **Web** redirect URI:
   `${PUBLIC_BASE_URL}/api/teams/connect/callback` — this is what powers the
   one‑click "Connect Microsoft Teams" button every customer uses.
3. Set on the API server:
   `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`, `MICROSOFT_APP_TYPE`
   (`MultiTenant` / `SingleTenant`), `MICROSOFT_APP_TENANT_ID` (single‑tenant
   only), `PUBLIC_BASE_URL`, `APP_BASE_URL`.
4. In the Azure Bot → Configuration, set the **Messaging endpoint** to
   `${PUBLIC_BASE_URL}/api/teams/messages` and add the **Microsoft Teams**
   channel.
5. Generate a GUID for the Teams app itself, set `TEAMS_APP_ID`.
6. **Per‑organisation, self‑serve from here** — each Orgni customer admin goes
   to **Settings → Integrations → Microsoft Teams → Connect Microsoft Teams**,
   approves Microsoft's admin‑consent prompt, and Orgni links their Microsoft
   tenant automatically (`POST /api/teams/connect/start` →
   `GET /api/teams/connect/callback`). They then download the generated app
   package from that same screen and upload/sideload it into their Teams
   tenant. No env var or redeploy per customer — tenant→organisation mapping
   is stored in the `microsoft_connections` table, one row per customer,
   unique per Microsoft tenant id. A manual fallback (`POST /api/teams/link`)
   exists for local dev or if the OAuth app isn't registered yet.

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
