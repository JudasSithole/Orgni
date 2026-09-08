---
name: Backend service bundling
description: Why api and worker esbuild-bundle everything, and the pino plugin dependency gotcha
---

**Rule:** `apps/api` and `apps/worker` build with esbuild (`build.mjs`, bundle → `dist/index.mjs`) including all workspace packages, because `packages/*` and `lib/*` export raw `.ts` entrypoints — a tsc-only build plus `pnpm deploy` yields node_modules containing TypeScript that Node can't run in production containers.

**How to apply:** any new backend service should copy the api/worker `build.mjs` pattern. `esbuild-plugin-pino` resolves `pino`, `pino-pretty`, and `thread-stream` from the service's own package, so declare all three as direct deps even if logging comes via `@workspace/observability`.

Docker images (`infrastructure/docker/*.Dockerfile`) copy only `dist/` — no node_modules needed at runtime. CI smoke-runs both images in `.github/workflows/docker-validation.yml`.
