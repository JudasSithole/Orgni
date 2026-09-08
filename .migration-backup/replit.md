# Replit scope & rules — READ FIRST

**Replit is responsible for the FRONTEND ONLY.**

This repository is a monorepo. The frontend is one small part of it; the rest is
a production backend that Replit must never touch. Twice already, an automated
change flattened the repo and deleted the backend. These rules exist to prevent
that from happening again.

## ✅ Replit MAY change (frontend only)

- `apps/web/**` — the React + Vite marketing site and console. This is the
  **only** directory Replit owns.

That's it. All frontend work — landing pages, the console UI, styling, routing —
happens inside `apps/web`.

## ⛔ Replit must NEVER touch, move, or delete

- `apps/api/**`, `apps/worker/**` — the backend control plane (TypeScript).
- `intelligence/**` — the Python services and tokenizer (document-intelligence,
  organizational-ontology, organizational-tokenizer).
- `infrastructure/**` — Docker, Azure deploy scripts and runbook.
- `.github/**` — CI and deployment workflows.
- `packages/**`, `lib/**` — shared code and contracts.
- `docs/**` — documentation.
- Root config: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
  `turbo.json`, `tsconfig*.json`, `vercel.json`, `.github/`.

## ⛔ Never do these

- **Never restructure or flatten the repo.** Do not move `apps/web` to the root
  or to `artifacts/`. Keep the exact directory layout below.
- **Never recreate** `artifacts/`, `.migration-backup/`, or `attached_assets/`.
  These are deleted on purpose and must stay gone.
- **Never push directly to `main`.** Open a pull request from a branch. `main`
  is the source of truth for the whole team, not just the frontend.
- If a change seems to require editing anything outside `apps/web`, **stop and
  open an issue** instead. The backend team makes those changes.

## The canonical structure (do not change)

```
apps/            web (Replit's scope) · api · worker
intelligence/    document-intelligence · organizational-ontology · organizational-tokenizer
infrastructure/  docker · azure · scripts
packages/  lib/  shared code + contracts
docs/            documentation
.github/         CI + deploy workflows
```

## How the frontend fits

- The frontend talks to the backend **only** over HTTP, using `VITE_API_URL`
  (the deployed API's URL). It never imports backend code directly.
- Auth: `POST /api/auth/login` returns a bearer token; the console sends it on
  every call. Data comes from `/api/documents` and `/api/model/*`.

## Running the frontend

```bash
pnpm install
pnpm --filter @workspace/web run dev   # serves apps/web on http://localhost:5000
```

Build (what Vercel runs): `pnpm --filter @workspace/web run build`.

## Deployment (for context — not Replit's job)

- **Frontend → Vercel** (this is the only deploy the frontend cares about).
- **Backend → Azure** (see `infrastructure/azure/README.md`). Replit does not
  deploy or modify the backend.
