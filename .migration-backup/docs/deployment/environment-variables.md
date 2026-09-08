# Environment-variable matrix

All backend variables are validated at boot by `@workspace/config`
(`packages/config`) — services fail fast with a readable error. Frontend
variables are build-time only; Vite exposes only the `VITE_` prefix to the
browser, so backend variables can never leak into the bundle.

Never commit real values. Each app ships a `.env.example`.

## `apps/web` (Vercel, build-time only)

| Variable        | Required | Default              | Purpose                      |
| --------------- | -------- | -------------------- | ---------------------------- |
| `VITE_SITE_URL` | no       | `https://orgni.com`  | Canonical URL for SEO tags   |
| `BASE_PATH`     | no       | `/`                  | Sub-path hosting only        |

No secrets; the site is static and makes no API calls today. Add `VITE_API_URL`
when it starts talking to the API (different values per Vercel environment).

## `apps/api` (Azure Container Apps)

| Variable       | Required           | Default       | Purpose                                        |
| -------------- | ------------------ | ------------- | ---------------------------------------------- |
| `NODE_ENV`     | yes (prod)         | `development` | `production` in Azure                          |
| `PORT`         | yes                | `8080`        | Must equal ingress `targetPort` (not injected) |
| `CORS_ORIGINS` | for browser access | *(same-origin only)* | Comma list; wildcards ok (`https://*.vercel.app`) |
| `LOG_LEVEL`    | no                 | `info`        | pino level                                     |
| `DATABASE_URL` | when persistence lands | —         | Postgres (Container App secret)                |
| `APP_VERSION`  | no                 | package version | Shown by `GET /api/version`                  |
| `GIT_SHA`      | recommended        | —             | Shown by `GET /api/version`                    |
| `AZURE_STORAGE_CONNECTION_STRING` | future | —        | Blob storage for uploads (stateless container) |
| `AZURE_STORAGE_CONTAINER` | future      | —             | Blob container name                            |

## `apps/worker` (Azure Container Apps, no ingress)

| Variable                  | Required     | Default | Purpose                        |
| ------------------------- | ------------ | ------- | ------------------------------ |
| `NODE_ENV`                | yes (prod)   | `development` | —                        |
| `WORKER_POLL_INTERVAL_MS` | no           | `5000`  | Job-loop polling interval      |
| `DATABASE_URL`            | when wired   | —       | Postgres                       |
| `REDIS_URL`               | when queues land | —   | Persistent job queues          |
| `GIT_SHA`                 | recommended  | —       | Release traceability           |

## Replit development

`PORT` is injected per workflow by the platform; `SESSION_SECRET` exists as a
Replit secret (not currently consumed by any app). No `.env` files are needed
on Replit.
