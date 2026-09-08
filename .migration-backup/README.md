# Orgni

Orgni is Olyxee’s organizational intelligence platform.

![Uploading image.png…]()

It turns business documents into structured, traceable, and queryable organizational context that applications, workflows, and AI systems can use.

Orgni processes documents such as invoices, proofs of payment, and contracts. It extracts relevant information, validates the results, generates organizational tokens, and stores the resulting facts as part of a reusable organizational model.

## What Orgni does

Orgni converts business documents into structured organizational facts.

For example, an invoice can produce:

* The organizations involved
* The invoice amount
* The issue date
* The payment obligation
* The line items
* The source evidence
* Warnings for missing information

Orgni does not invent facts that are not supported by the source document.

If an invoice does not state whether it has been paid, Orgni will not mark it as paid.

## Repository

This repository is a production-oriented modular monorepo built with:

* pnpm
* Turborepo
* TypeScript
* Python
* PostgreSQL
* Redis
* Docker
* Azure Container Apps

The platform is divided into two main parts:

* TypeScript control plane for APIs, orchestration, contracts, workers, and persistence
* Python intelligence plane for OCR, classification, extraction, and ontology processing

Both parts use one canonical organizational contract.

## Where each part runs

Two halves, two clouds. The **frontend deploys to Vercel**; the **backend deploys
to Azure**. Nothing else moves between them except the API URL.

| Part | Path | What it is | Deploys to |
|------|------|-----------|------------|
| Marketing site + console | `apps/web` | React + Vite SPA | **Vercel** (`vercel.json`) |
| API | `apps/api` | Express — the only public backend entry point | **Azure** Container Apps (`orgni-api`) |
| Worker | `apps/worker` | Pipeline orchestration (runs the tokenizer) | **Azure** Container Apps (`orgni-worker`) |
| Document Intelligence | `intelligence/document-intelligence` | Python — OCR, classification, extraction | **Azure** Container Apps (internal) |
| Ontology | `intelligence/organizational-ontology` | Python — tokens → validated facts | **Azure** Container Apps (internal) |
| Tokenizer | `intelligence/organizational-tokenizer` | TypeScript **library** — bundled into the worker/API, not its own service | ships inside **Azure** worker/API |
| Postgres + Redis | — | Managed data stores | **Azure** (Flexible Server + Cache) |

* **Frontend → Vercel:** builds `apps/web`, set `VITE_API_URL` to the API's URL.
  See [`docs/deployment/vercel.md`](docs/deployment/vercel.md).
* **Backend → Azure:** one command or one click provisions all four services
  plus Postgres and Redis. See [`infrastructure/azure/README.md`](infrastructure/azure/README.md).

## Ownership & boundaries

To keep the repo safe and easy to reason about, each part has a clear owner:

| Area | Owner | May change |
|------|-------|-----------|
| `apps/web` (frontend) | Frontend / **Replit** | `apps/web/**` only |
| Everything else (backend, infra, shared, docs) | Backend team | the rest of the repo |

**Replit is scoped to the frontend only.** It may change `apps/web/**` and must
never touch the backend (`apps/api`, `apps/worker`, `intelligence/`),
`infrastructure/`, `.github/`, `packages/`, `lib/`, or the root config — and must
never restructure/flatten the repo or reintroduce `artifacts/`,
`.migration-backup/`, or `attached_assets/`. The full rules the Replit Agent
follows are in [`replit.md`](replit.md).

**All changes land via pull request** — no direct pushes to `main`. `main` is the
whole team's source of truth, so a frontend tool must never rewrite it wholesale.
(Enforce this with a GitHub branch-protection rule on `main`: require PRs, block
force-pushes.)

## Repository structure

```text
apps/
  web/
    Marketing and product interface
    React + Vite
    Deployment: Vercel or Azure Static Web Apps

  api/
    Main Orgni API
    Express + TypeScript
    Deployment: Azure Container Apps

  worker/
    Background processing and pipeline orchestration
    Handles ingestion, retries, and async processing
    Deployment: Azure Container Apps

intelligence/
  document-intelligence/
    OCR, document classification, and field extraction
    Python + FastAPI

  organizational-tokenizer/
    Converts normalized extractions into OrganizationalToken[]
    TypeScript

  organizational-ontology/
    Validates and enriches organizational relationships
    Python + FastAPI

packages/
  contracts/
    Canonical shared contracts
    The only authoritative OrganizationalToken definition

  ui/
    Shared frontend components
    Based on shadcn/ui

  auth/
    Shared authentication types and permission logic

  config/
    Validated environment configuration using Zod

  observability/
    Structured logging using Pino

  testing/
    Shared fixtures, mocks, and test utilities

lib/
  api-spec/
    OpenAPI specification
    Source of truth for the public API

  api-client-react/
    Generated React Query client

  api-zod/
    Generated Zod validators

  db/
    PostgreSQL schema and migrations using Drizzle ORM

infrastructure/
  docker/
    Dockerfiles and Docker Compose configuration

  azure/
    Azure Container Apps deployment documentation

  scripts/
    Build, migration, and deployment scripts

docs/
  Architecture, API, deployment, and Phase 1 documentation

.migration-backup/
  Archived files from the original repository
```

## Architecture baseline

The main technology and architecture decisions are documented in:

* [`ORGNI_TECHNOLOGY_STACK.md`](ORGNI_TECHNOLOGY_STACK.md)
* [`docs/architecture/stack-compliance.md`](docs/architecture/stack-compliance.md)

These documents define:

* The TypeScript control plane
* The Python intelligence plane
* The canonical organizational contracts
* Current architecture compliance
* Remaining implementation gaps

## Phase 1 document pipeline

Phase 1 supports:

* Invoices
* Proofs of payment
* Contracts

The processing flow is:

```text
Document upload
    ↓
Ingestion
    ↓
Document Intelligence
    ↓
Normalized extraction envelope v0.1.0
    ↓
Contract validation
    ↓
Organizational Tokenizer
    ↓
OrganizationalToken[]
    ↓
Organizational Ontology
    ↓
Organizational facts and relationships
    ↓
Persistent organizational context
```

Each generated fact must retain enough evidence to trace it back to the original document.

Full Phase 1 documentation is available at:

[`docs/phase1/README.md`](docs/phase1/README.md)

## Verified invoice pipeline

The document pipeline has been tested with a real sample invoice.

The following services were used:

* Document Intelligence on port `8000`
* Organizational Ontology on port `8100`
* Orgni API on port `8080`

The invoice returned:

```text
Upload:        invoice.txt
HTTP status:   200
Document type: INVOICE

Tokens:
- INVOICE_ISSUED
- INVOICE_OBLIGATION
- INVOICE_LINE_ITEMS

Entities:
- Olyxee AI (Pty) Ltd
- Clover Retail Group

Facts:
- INVOICE_ISSUED: OBSERVED
- INVOICE_OBLIGATION: ASSERTED
- INVOICE_LINE_ITEMS: OBSERVED

Warning:
- invoice_status_not_stated
```

The warning confirms that Orgni did not create a payment status because the invoice did not state one.

## Requirements

Install the following before running Orgni locally:

* Node.js
* Corepack
* pnpm 10
* Docker
* Docker Compose
* Python 3
* PostgreSQL and Redis only if running without Docker

Enable pnpm:

```bash
corepack enable
```

Install workspace dependencies:

```bash
pnpm install
```

## Run the full platform with Docker

Docker is the recommended way to run Orgni locally.

```bash
docker compose \
  -f infrastructure/docker/docker-compose.yml \
  up --build
```

This starts:

* PostgreSQL
* Redis
* Database migrations
* Document Intelligence
* Organizational Ontology
* Orgni API
* Background worker
* Web application

The first build may take longer because the Document Intelligence image includes OCR dependencies.

## Test the document pipeline

After the Docker services are running, open another terminal.

### Upload a document

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "X-Tenant-Id: tenant_demo" \
  -F "file=@invoice.pdf"
```

### List documents

```bash
curl http://localhost:8080/api/documents \
  -H "X-Tenant-Id: tenant_demo"
```

### Retrieve a document

```bash
curl http://localhost:8080/api/documents/<sourceId> \
  -H "X-Tenant-Id: tenant_demo"
```

Replace `<sourceId>` with the ID returned by the upload request.

The response should contain:

* Document metadata
* Extracted entities
* Organizational tokens
* Organizational facts
* Evidence
* Warnings
* Processing status

## Run services without Docker

The stack can also run directly on the local machine.

This is useful when developing one service or when Docker builds are slow.

### Start Document Intelligence

```bash
pip install -r intelligence/document-intelligence/requirements.txt

cd intelligence/document-intelligence
uvicorn main:app --port 8000
```

### Start Organizational Ontology

Open another terminal:

```bash
cd intelligence/organizational-ontology
uvicorn main:app --port 8100
```

### Build the API

Open another terminal from the repository root:

```bash
pnpm --filter @workspace/api run build
```

### Start the API on Linux or macOS

```bash
DOCUMENT_INTELLIGENCE_URL=http://127.0.0.1:8000 \
ONTOLOGY_URL=http://127.0.0.1:8100 \
PORT=8080 \
node --enable-source-maps apps/api/dist/index.mjs
```

### Start the API on Windows PowerShell

```powershell
$env:DOCUMENT_INTELLIGENCE_URL="http://127.0.0.1:8000"
$env:ONTOLOGY_URL="http://127.0.0.1:8100"
$env:PORT="8080"

node --enable-source-maps apps/api/dist/index.mjs
```

Without a database connection, the generated facts are returned in the response but are not persisted.

To enable persistence, provide a valid `DATABASE_URL`.

## Upload a text invoice

```bash
curl -X POST http://127.0.0.1:8080/api/documents \
  -H "X-Tenant-Id: tenant_demo" \
  -F "file=@invoice.txt;type=text/plain"
```

## Local development

Run individual TypeScript services:

```bash
pnpm --filter @workspace/web run dev
pnpm --filter @workspace/api run dev
pnpm --filter @workspace/worker run dev
```

Default local addresses:

| Service                 | Address                            |
| ----------------------- | ---------------------------------- |
| Web                     | `http://localhost:5173`            |
| API                     | `http://localhost:8080`            |
| Document Intelligence   | `http://localhost:8000`            |
| Organizational Ontology | `http://localhost:8100`            |
| API health              | `http://localhost:8080/api/health` |

## Windows note

The current API development script may use the Bash `export` command.

This can fail in Windows Command Prompt.

If this command fails:

```bash
pnpm --filter @workspace/api run dev
```

Build and run the API directly:

```bash
pnpm --filter @workspace/api run build
node --enable-source-maps apps/api/dist/index.mjs
```

Use PowerShell to set the required environment variables before starting the API.

Windows curl may also fail when using Git Bash paths such as:

```text
/tmp/invoice.txt
```

Use a relative path instead:

```bash
-F "file=@invoice.txt"
```

## Root commands

| Command                 | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `pnpm run dev`          | Run development tasks through Turborepo |
| `pnpm run build`        | Type-check and build the workspace      |
| `pnpm run typecheck`    | Run TypeScript checks                   |
| `pnpm run lint`         | Run formatting and lint checks          |
| `pnpm run test`         | Run all tests                           |
| `pnpm run docker:build` | Build production Docker images          |

## Deployment

Orgni application and intelligence services run on Azure Container Apps.

The web application can run on Vercel or Azure Static Web Apps.

| Component                              | Deployment target                             | Ingress  |
| -------------------------------------- | --------------------------------------------- | -------- |
| `apps/web`                             | Vercel or Azure Static Web Apps               | Public   |
| `apps/api`                             | Azure Container Apps                          | External |
| `apps/worker`                          | Azure Container Apps                          | None     |
| `intelligence/document-intelligence`   | Azure Container Apps                          | Internal |
| `intelligence/organizational-ontology` | Azure Container Apps                          | Internal |
| PostgreSQL                             | Azure Database for PostgreSQL Flexible Server | Private  |
| Redis                                  | Azure Managed Redis                           | Private  |

### Deploy the backend to Azure

The whole backend deploys with **one click** or **one command** — idempotent, so
re-running ships a new build:

* **One-click:** GitHub **Actions → "Deploy to Azure" → Run workflow** (after a
  one-time OIDC + secrets setup).
* **One command:** `bash infrastructure/azure/deploy.sh` (after `az login`).

Both provision the Container Apps environment, PostgreSQL, Redis, and the
registry; build the four images; run the DB migration; deploy all services; and
smoke-test the API. Step-by-step runbook (with the one-time setup):
[`infrastructure/azure/README.md`](infrastructure/azure/README.md).

Then point the frontend's `VITE_API_URL` at the API URL the deploy prints, and
set `WEB_ORIGIN` to the frontend URL so CORS allows it.

Deployment documentation:

* [`infrastructure/azure/README.md`](infrastructure/azure/README.md) — the deploy runbook
* [`DEPLOYMENT.md`](DEPLOYMENT.md) — full architecture and env reference

## Health endpoints

### API

```text
GET /api/health
GET /api/health/ready
GET /api/version
```

### Python services

```text
GET /health
```

The readiness endpoint should return success only when required dependencies are available.

## Architecture principles

### One canonical contract

`packages/contracts` is the only authoritative source for `OrganizationalToken` and related shared contracts.

### Evidence before inference

Facts must retain references to the source document and extraction result.

Orgni must not invent unsupported information.

### Tenant isolation

Every document, token, fact, workflow, and query must belong to a tenant.

The current API uses the `X-Tenant-Id` header to identify the tenant.

### Replaceable intelligence services

OCR, extraction, tokenizer, and ontology implementations can change without changing the public control plane contracts.

### Asynchronous processing

Long-running document operations should be handled by the worker.

The API should not remain blocked while large documents are processed.

### Contract-first development

API and service changes should begin with shared contracts or the OpenAPI specification.

### Observable by default

Every service should provide:

* Structured logs
* Health checks
* Processing status
* Error details
* Traceable document states

## Expected document behaviour

Orgni should behave carefully when processing documents.

Examples:

* An invoice without a payment status must not be marked as paid.
* A proof of payment confirms that a payment occurred, but it must not automatically settle an invoice without enough matching evidence.
* A draft contract must not be marked as executed.
* Missing information should produce a warning instead of an invented value.
* Every important fact should include source evidence.

## Phase 1 completion criteria

Phase 1 is complete when Orgni can:

* Accept supported business documents
* Store the uploaded source
* Classify the document
* Extract the required fields
* Produce a valid normalized envelope
* Validate the envelope
* Generate canonical organizational tokens
* Process tokens through the ontology
* Produce organizational facts and relationships
* Preserve evidence and traceability
* Store and retrieve the results
* Maintain tenant isolation
* Run locally with Docker
* Run in Azure
* Pass automated tests for invoices, proofs of payment, and contracts

## Documentation

* [Technology stack](ORGNI_TECHNOLOGY_STACK.md)
* [Phase 1 pipeline](docs/phase1/README.md)
* [Deployment guide](DEPLOYMENT.md)
* [Architecture overview](docs/architecture/overview.md)
* [Stack compliance](docs/architecture/stack-compliance.md)
* [Local development](docs/development/local-setup.md)
* [API and code generation](docs/api/README.md)
* [Azure deployment](infrastructure/azure/README.md)
