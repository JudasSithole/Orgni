# Deploying the API and worker to Azure Container Apps

Both services are single-file esbuild bundles in minimal Node 24 images.
No Kubernetes. The frontend is **not** deployed to Azure (see `vercel.md`).

## 1. Build & push images

```bash
az acr login -n orgniacr
TAG=$(git rev-parse --short HEAD)

docker build -f infrastructure/docker/api.Dockerfile    -t orgniacr.azurecr.io/orgni-api:$TAG .
docker build -f infrastructure/docker/worker.Dockerfile -t orgniacr.azurecr.io/orgni-worker:$TAG .
docker push orgniacr.azurecr.io/orgni-api:$TAG
docker push orgniacr.azurecr.io/orgni-worker:$TAG
```

CI (`.github/workflows/docker-validation.yml`) builds and smoke-runs both
images on every backend PR; it does **not** deploy.

## 2. One-time resources

```bash
az group create -n orgni-rg -l westeurope
az acr create -n orgniacr -g orgni-rg --sku Basic
az containerapp env create -n orgni-env -g orgni-rg -l westeurope
# Data services:
az postgres flexible-server create -g orgni-rg -n orgni-pg ...
az redis create -g orgni-rg -n orgni-redis --sku Basic --vm-size c0
az storage account create -g orgni-rg -n orgnistorage --sku Standard_LRS
```

## 3. API container app (external ingress)

```bash
az containerapp create -n orgni-api -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-api:$TAG \
  --ingress external --target-port 8080 \
  --secrets database-url=<pg-connection-string> \
  --env-vars PORT=8080 NODE_ENV=production LOG_LEVEL=info \
             DATABASE_URL=secretref:database-url \
             CORS_ORIGINS='https://app.orgni.olyxee.com,https://*.vercel.app' \
             GIT_SHA=$TAG
```

- `PORT` must be set explicitly and equal `--target-port` (Container Apps does
  not inject it; the server exits without it).
- Container command (already the image CMD): `node --enable-source-maps dist/index.mjs`
- Health probes: liveness `GET /api/health`, readiness `GET /api/health/ready`,
  startup `GET /api/health`. Verify a deploy with `GET /api/version`.

## 4. Worker container app (NO ingress)

```bash
az containerapp create -n orgni-worker -g orgni-rg --environment orgni-env \
  --image orgniacr.azurecr.io/orgni-worker:$TAG \
  --secrets database-url=<pg-connection-string> redis-url=<redis-connection-string> \
  --env-vars NODE_ENV=production LOG_LEVEL=info \
             DATABASE_URL=secretref:database-url REDIS_URL=secretref:redis-url \
             GIT_SHA=$TAG
```

Do **not** configure ingress — the worker exposes no routes. Its health is its
structured log heartbeat (`worker started`, loop ticks); once Redis queues land,
add queue-depth alerts instead.

## 5. Database migrations

Migrations are a controlled, separate step — never run automatically at boot:

```bash
DATABASE_URL=<prod-url> pnpm --filter @workspace/db run push   # Drizzle
```

Run from CI (manual approval) or a one-off Container Apps job before rolling
out a revision that needs the new schema.

## 6. Secrets & config

- All secrets go in Container App secrets (`--secrets` + `secretref:`) —
  never into images, code, or CI logs.
- Both services validate env at boot via `@workspace/config` and exit with a
  readable error when required config is missing.

## 7. Rollback

If a deployment introduces a regression or the new API revision fails its
health checks, roll back to the previous known-good Container Apps revision.

### 7.1 Identify the revisions

List the API revisions:

```bash
az containerapp revision list -n orgni-api -g orgni-rg -o table