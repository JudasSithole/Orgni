# Local development

## Prerequisites

- Node.js 24+, pnpm 10 (`corepack enable`)
- Docker (optional — only for the containerised stack)

## Install & run

```bash
pnpm install

# Frontend (marketing site)
pnpm --filter @workspace/web run dev

# API
pnpm --filter @workspace/api run dev

# Worker
pnpm --filter @workspace/worker run dev
```

On Replit, the web and API services run as managed workflows; don't start
them manually there.

## Quality gates

```bash
pnpm run typecheck   # TypeScript, all packages
pnpm run lint        # prettier check
pnpm run test        # all package tests
pnpm run build       # typecheck + build everything
```

## Full platform via Docker

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Brings up API (:8080), worker, PostgreSQL (:5432) and Redis (:6379).

## Environment

Each app has a `.env.example` documenting its configuration. Environment is
validated at boot by `@workspace/config` — services fail fast on bad config.
