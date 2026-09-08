---
name: Replit artifact routing with apps/ layout
description: How the strict apps/web + apps/api layout coexists with Replit's preview router
---

The repo uses a production layout: code in `apps/web`, `apps/api`, `apps/worker`; packages in `packages/*`.

**Rule:** The Replit preview router (pid1 on :80) only routes artifacts whose `.replit-artifact/artifact.toml` sits under `artifacts/`. Registration and workflows accept arbitrary dirs, but routes silently return 404/"Backend Not Configured" ("no previewable artifacts").

**How to apply:** `artifacts/web/` and `artifacts/api/` are stub dirs containing ONLY `.replit-artifact/artifact.toml`; the toml run commands use `pnpm --filter @workspace/web|api` so they run code from `apps/`. Never move these tomls back into `apps/` and never put code in the stub dirs. Workflow names follow the toml location: `artifacts/web: web`, `artifacts/api: API Server`.

Also: when workflows are renamed/moved, old processes keep holding ports (EADDRINUSE) — kill stale `vite`/`dist/index.mjs` processes before restarting.

Edits to any artifact.toml must go through `verifyAndReplaceArtifactToml`; duplicate previewPath registrations (e.g. stale tomls in `.migration-backup`) block validation — that backup's `.replit-artifact` dirs were deleted for this reason.
