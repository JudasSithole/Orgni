# Orgni — Deployment Guide

How to host Orgni on **Azure**. The Phase 1 document pipeline is five services
plus two managed data stores.

| Component | Source | Runtime | Azure target |
|-----------|--------|---------|--------------|
| Marketing site | `apps/web` | Static SPA (Vite) | **Vercel** *(or Azure Static Web Apps)* |
| Backend API | `apps/api` | Node/Express (esbuild bundle) | **Azure Container Apps** |
| Background worker | `apps/worker` | Node service (esbuild bundle) | **Azure Container Apps** |
| Document Intelligence | `intelligence/document-intelligence` | Python/FastAPI (OCR) | **Azure Container Apps** |
| Organizational Ontology | `intelligence/organizational-ontology` | Python/FastAPI | **Azure Container Apps** |
| Database | `lib/db` (Drizzle) | PostgreSQL | **Azure Database for PostgreSQL — Flexible Server** |
| Cache / queue | — | Redis | **Azure Cache for Redis** |

The request path in production:

```
Browser ─▶ API (external ingress)
             ├─▶ Document Intelligence (internal)
             ├─▶ Organizational Ontology (internal)
             └─▶ PostgreSQL (persist sources / tokens / facts)
Worker ────▶ Redis + PostgreSQL (async processing)
```

Only the API (and the web app) need **external** ingress. Document Intelligence
and Ontology use **internal** ingress and are reached by the API over the
Container Apps environment's private network.

---

## 1. Prerequisites

- **Node.js 24 LTS** and **pnpm 10** (`corepack enable && corepack prepare pnpm@10 --activate`)
- **Docker** (to build the container images)
- **Azure CLI** (`az login`) with permission to create Container Apps, Azure
  Database for PostgreSQL, Azure Cache for Redis, and an Azure Container Registry
- A **Vercel** account if the web app is hosted there

> The repo enforces a 1-day npm `minimumReleaseAge` and a `preinstall` guard that
> blocks npm/yarn — build agents must use pnpm.

---

## 2. Build & push the container images

All four images build from the **repo root** (they need the workspace):

```bash
docker build -f infrastructure/docker/api.Dockerfile                     -t orgni-api .
docker build -f infrastructure/docker/worker.Dockerfile                  -t orgni-worker .
docker build -f infrastructure/docker/document-intelligence.Dockerfile   -t orgni-document-intelligence .
docker build -f infrastructure/docker/organizational-ontology.Dockerfile -t orgni-ontology .
```

CI builds all four on every push (`.github/workflows/ci.yml`, "Build images").

Push to your Azure Container Registry (ACR):

```bash
az acr login --name <registry>
for img in orgni-api orgni-worker orgni-document-intelligence orgni-ontology; do
  docker tag  $img <registry>.azurecr.io/$img:latest
  docker push <registry>.azurecr.io/$img:latest
done
```

Full step-by-step `az` commands (registry, environment, each app, probes,
migrations, rollback): [`infrastructure/azure/README.md`](infrastructure/azure/README.md).

---

## 3. Managed data stores

```bash
# PostgreSQL (Flexible Server)
az postgres flexible-server create -g <rg> -n orgni-pg \
  --admin-user orgni --admin-password '<strong-password>' \
  --tier Burstable --sku-name Standard_B1ms --version 16 --yes
# → DATABASE_URL=postgres://orgni:<password>@orgni-pg.postgres.database.azure.com:5432/orgni?sslmode=require

# Redis
az redis create -g <rg> -n orgni-redis --sku Basic --vm-size c0
# → REDIS_URL=rediss://:<key>@orgni-redis.redis.cache.windows.net:6380
```

**Run the schema migration** against the managed database once it exists (from a
machine that can reach it, or a one-off Container Apps job):

```bash
DATABASE_URL='postgres://orgni:<password>@orgni-pg.postgres.database.azure.com:5432/orgni?sslmode=require' \
  pnpm --filter @workspace/db run migrate
```

---

## 4. Environment variables

Node services validate config at boot via `@workspace/config` and **fail fast**
on bad values. Store secrets as Container Apps secrets / Key Vault references —
never in the image or git. Full matrix: [`docs/deployment/environment-variables.md`](docs/deployment/environment-variables.md).

**API** (`apps/api/.env.example`)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | yes | Container Apps does **not** inject it — set it and match ingress `targetPort`. |
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Azure Database for PostgreSQL. Unset ⇒ results are returned but **not persisted**. |
| `DOCUMENT_INTELLIGENCE_URL` | yes | Internal URL of the DI app, e.g. `https://orgni-document-intelligence.internal.<env>.azurecontainerapps.io`. Unset ⇒ upload returns 503. |
| `ONTOLOGY_URL` | yes | Internal URL of the ontology app. Unset ⇒ tokens only, no facts. |
| `CORS_ORIGINS` | for browser | Comma list, wildcards ok (`https://*.vercel.app`). Unset in prod = same-origin only. |
| `MAX_UPLOAD_BYTES` | no | Default 20 MB. |
| `LOG_LEVEL` / `GIT_SHA` | no | pino level; `GIT_SHA` surfaced by `GET /api/version`. |

**Worker** (`apps/worker/.env.example`): `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`,
`WORKER_POLL_INTERVAL_MS`, `GIT_SHA`.

**Document Intelligence** (`intelligence/document-intelligence/.env.example`):
`PORT` (8000), `UPLOAD_DIR` (writable scratch), `MAX_FILE_SIZE_BYTES`; optional
`ANTHROPIC_API_KEY` for the legacy LLM path.

**Ontology** (`intelligence/organizational-ontology/.env.example`): `PORT`
(8100). It loads the canonical token schema from the bundled
`packages/contracts/schemas/`; override with `ORGNI_TOKEN_SCHEMA` if needed.

---

## 5. Ingress, health & wiring

- **External ingress:** API only (and the web app). Point `targetPort` at the
  app's `PORT` (8080).
- **Internal ingress:** Document Intelligence (8000) and Ontology (8100). The API
  reaches them via `DOCUMENT_INTELLIGENCE_URL` / `ONTOLOGY_URL` (their internal
  FQDNs). They must **not** be publicly exposed.
- **Health probes** (wire as Container Apps liveness/readiness):
  - API: `GET /api/health`, `GET /api/health/ready`, `GET /api/version`
  - Document Intelligence: `GET /health`
  - Ontology: `GET /health`, `GET /health/ready`
- **Startup order:** run the DB migration before the API/worker start.

---

## 6. Verify a deployment

```bash
# 1. Liveness
curl https://<api-host>/api/health            # {"status":"ok"}
curl https://<api-host>/api/version           # name, version, gitSha

# 2. End-to-end: upload → facts, persisted
curl -X POST https://<api-host>/api/documents \
  -H "X-Tenant-Id: tenant_demo" -F "file=@invoice.pdf"
curl https://<api-host>/api/documents -H "X-Tenant-Id: tenant_demo"          # list
curl https://<api-host>/api/documents/<sourceId> -H "X-Tenant-Id: tenant_demo"  # tokens + facts
```

A 200 with `facts` populated, and the same `sourceId` retrievable afterwards,
confirms API → DI → ontology → PostgreSQL are all wired.

---

## 7. Local full-platform run (mirrors the Azure topology)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Boots Postgres + Redis + a one-shot migration + Document Intelligence + Ontology
+ API + worker + the web dev server, with the same env wiring as production.
Then run the §6 commands against `http://localhost:8080`.

---

## 8. Frontend → Vercel

`vercel.json` at the repo root: install `pnpm install`, build
`pnpm --filter @workspace/web run build`, output `apps/web/dist/public`, SPA
rewrites to `/index.html`. Deploy = push to the connected branch. To host the web
app on Azure instead, use Azure Static Web Apps against the same build output.

---

## 9. Gotchas

- **`PORT` on Container Apps must be set** — the Node servers exit without it.
- **DI/Ontology are internal** — never give them external ingress.
- **No `DATABASE_URL` ⇒ nothing is persisted** (results still return inline).
- **Run the migration** before the API serves traffic, or the persistence/review
  endpoints 500 on missing tables.
- **Stateless Node services** — never write to local disk in API/worker; state
  lives in PostgreSQL/Redis. The Python services use a writable scratch
  `UPLOAD_DIR` only.
- **Restart after env changes** — config is read once at boot.
- **Images build from the repo root** (they need the pnpm workspace / shared
  packages), not from each app directory.
