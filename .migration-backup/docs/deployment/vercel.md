# Deploying `apps/web` to Vercel

The marketing site is a static Vite SPA — no server runtime, no secrets.

## Option A (current setup): repo-root project

The root `vercel.json` drives everything. Vercel project settings:

| Setting          | Value                                     |
| ---------------- | ----------------------------------------- |
| Root Directory   | *(repo root)*                             |
| Install Command  | `pnpm install` (from `vercel.json`)       |
| Build Command    | `pnpm --filter @workspace/web run build`  |
| Output Directory | `apps/web/dist/public`                    |
| Framework Preset | Other / Vite                              |
| Node.js Version  | 24.x                                      |

Deploy = push to the connected branch. SPA rewrites to `/index.html` are in
`vercel.json`.

## Option B: project root set to `apps/web`

Vercel detects the pnpm workspace and installs from the repo root automatically.

| Setting          | Value                                          |
| ---------------- | ---------------------------------------------- |
| Root Directory   | `apps/web` (enable “Include files outside root directory”) |
| Install Command  | default (`pnpm install`, workspace-aware)      |
| Build Command    | `pnpm run build` (or `cd ../.. && pnpm --filter @workspace/web run build`) |
| Output Directory | `dist/public`                                  |
| Node.js Version  | 24.x                                           |

If you use Option B, move the `rewrites` from the root `vercel.json` into an
`apps/web/vercel.json`.

## Environment variables

None are required — the site is fully static. Optional build-time variables
(`apps/web/.env.example`):

| Variable        | Scope      | Purpose                                        |
| --------------- | ---------- | ---------------------------------------------- |
| `VITE_SITE_URL` | build-time | Canonical URL for SEO tags (defaults to `https://orgni.com`) |
| `BASE_PATH`     | build-time | Only when serving under a sub-path             |

Vite only exposes variables prefixed `VITE_` to the browser — never add
secrets with that prefix. The site currently makes **no API calls**; when it
does, add `VITE_API_URL` and set different values for Preview and Production
environments in Vercel (previews can point at a staging API).

## Preview deployments

Every PR gets a preview URL (`*.vercel.app`). If the frontend later calls the
Azure API, add `https://*.vercel.app` to the API's `CORS_ORIGINS` so previews
work (already documented in the API env example).

## Custom domain

Add the domain (e.g. `orgni.com`) under Vercel → Project → Settings → Domains
and point DNS (CNAME → `cname.vercel-dns.com`). Set `VITE_SITE_URL` to the
final domain so canonical/OG tags match.
