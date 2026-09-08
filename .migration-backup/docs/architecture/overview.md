# Architecture overview

Orgni is a modular monorepo — one repository, one backend application, no
microservices (yet).

```text
apps/
  web/      Marketing site (React + Vite) → deployed to Vercel
  api/      Main backend API (Express)    → Azure Container Apps
  worker/   Background/async processing   → Azure Container Apps
packages/
  contracts/      Shared domain types (schemas + canonical events)
  ui/             Shared frontend components (shadcn-based)
  auth/           Shared auth types & permission evaluation
  config/         Validated environment configuration (zod)
  observability/  Structured logging (pino)
  testing/        Shared test fixtures/utilities
lib/
  api-spec/           OpenAPI contract (source of truth for the HTTP API)
  api-client-react/   Generated React Query client
  api-zod/            Generated zod schemas
  db/                 Drizzle ORM + PostgreSQL access
infrastructure/
  docker/    Dockerfiles + docker-compose (API, worker, Postgres, Redis)
  azure/     Azure Container Apps deployment notes
  scripts/   Build/deploy scripts
```

## Principles

- **One modular backend.** `apps/api` is the only HTTP API. `apps/worker`
  shares packages with it but owns long-running work. Both are stateless —
  all state lives in PostgreSQL (and Redis for queues later).
- **Contract-first HTTP.** Endpoints are declared in `lib/api-spec/openapi.yaml`;
  clients and validators are generated (`pnpm --filter @workspace/api-spec run codegen`).
- **Shared code goes in packages.** Apps never import from each other.

## Legacy / unported code

`.migration-backup/` contains the original pre-restructure repo, including the
product dashboard (`apps/product`) and the Python document-service. These are
archived, not built; they will be ported into `apps/` and `apps/worker`
incrementally.

## Health & operations

The API exposes `GET /api/health` (liveness), `GET /api/health/ready`
(readiness) and `GET /api/version` (build metadata).
