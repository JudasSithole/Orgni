#!/usr/bin/env bash
#
# One-shot Azure deploy for the Orgni backend (idempotent — safe to re-run).
#
# Provisions (if missing) and deploys:
#   - Azure Container Registry
#   - Container Apps environment (+ Log Analytics)
#   - Azure Database for PostgreSQL (Flexible Server)  ← DATABASE_URL
#   - Azure Cache for Redis                            ← REDIS_URL
#   - 4 Container Apps: api (external), worker, document-intelligence (internal),
#     ontology (internal)
#   - Runs the DB schema migration
#
# Usage (from the repo root, after `az login`):
#   RESOURCE_GROUP=orgni-rg LOCATION=westeurope ACR_NAME=orgniacr \
#   PG_ADMIN_PASSWORD='<strong-pass>' AUTH_SECRET='<random-secret>' \
#   WEB_ORIGIN='https://your-frontend.azurestaticapps.net' \
#     bash infrastructure/azure/deploy.sh
#
# The GitHub Actions workflow (.github/workflows/deploy-azure.yml) calls this
# after logging in with OIDC, so Nkosiyethu can also deploy from the Actions tab.
set -euo pipefail

# ── Config (override via environment) ────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-orgni-rg}"
LOCATION="${LOCATION:-westeurope}"
ACR_NAME="${ACR_NAME:-orgniacr}"
ENV_NAME="${ENV_NAME:-orgni-env}"
PG_NAME="${PG_NAME:-orgni-pg}"
PG_ADMIN="${PG_ADMIN:-orgni}"
PG_DB="${PG_DB:-orgni}"
REDIS_NAME="${REDIS_NAME:-orgni-redis}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

: "${PG_ADMIN_PASSWORD:?set PG_ADMIN_PASSWORD to a strong password}"
: "${AUTH_SECRET:?set AUTH_SECRET to a random string (signs session tokens)}"
WEB_ORIGIN="${WEB_ORIGIN:-}"   # frontend origin for CORS; optional

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null 2>&1 || true
az extension add --name containerapp --upgrade --yes >/dev/null 2>&1 || true

# ── 1. Resource group + registry + environment ───────────────────────────────
log "Resource group: $RESOURCE_GROUP ($LOCATION)"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none

log "Container registry: $ACR_NAME"
exists az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" \
  || az acr create -n "$ACR_NAME" -g "$RESOURCE_GROUP" --sku Basic --admin-enabled true -o none

log "Container Apps environment: $ENV_NAME"
exists az containerapp env show -n "$ENV_NAME" -g "$RESOURCE_GROUP" \
  || az containerapp env create -n "$ENV_NAME" -g "$RESOURCE_GROUP" -l "$LOCATION" -o none

# ── 2. Data stores ───────────────────────────────────────────────────────────
log "PostgreSQL: $PG_NAME"
if ! exists az postgres flexible-server show -n "$PG_NAME" -g "$RESOURCE_GROUP"; then
  az postgres flexible-server create -n "$PG_NAME" -g "$RESOURCE_GROUP" -l "$LOCATION" \
    --admin-user "$PG_ADMIN" --admin-password "$PG_ADMIN_PASSWORD" \
    --tier Burstable --sku-name Standard_B1ms --version 16 \
    --public-access 0.0.0.0 --yes -o none
fi

# Create the application database if it does not already exist.
if ! exists az postgres flexible-server db show \
  -g "$RESOURCE_GROUP" \
  --server-name "$PG_NAME" \
  --name "$PG_DB"; then
  az postgres flexible-server db create \
    -g "$RESOURCE_GROUP" \
    --server-name "$PG_NAME" \
    --name "$PG_DB" \
    -o none
fi
# ── Database networking: internal-alpha exception, not final architecture ────
# Public access + firewall rules is accepted ONLY for internal alpha (Stage 1).
# Must move to private networking (VNet integration) before Stage 2 external
# customer onboarding. Tracked in the Risk Register.
#
# Allow Azure services (Container Apps) to reach Postgres.
az postgres flexible-server firewall-rule create -n "$PG_NAME" -g "$RESOURCE_GROUP" \
  --rule-name AllowAzure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none 2>/dev/null || true

# Allow the machine running this script (for the migration step).
# The previous deployer rule is removed first so stale IPs don't accumulate
# across every deploy run.
az postgres flexible-server firewall-rule delete -n "$PG_NAME" -g "$RESOURCE_GROUP" \
  --rule-name deployer --yes -o none 2>/dev/null || true
MY_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo '')"
if [ -n "$MY_IP" ]; then
  az postgres flexible-server firewall-rule create -n "$PG_NAME" -g "$RESOURCE_GROUP" \
    --rule-name deployer --start-ip-address "$MY_IP" --end-ip-address "$MY_IP" -o none 2>/dev/null || true
fi
PG_HOST="${PG_NAME}.postgres.database.azure.com"
DATABASE_URL="postgres://${PG_ADMIN}:${PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${PG_DB}?sslmode=require"

log "Redis: $REDIS_NAME"
if ! exists az redis show -n "$REDIS_NAME" -g "$RESOURCE_GROUP"; then
  az redis create -n "$REDIS_NAME" -g "$RESOURCE_GROUP" -l "$LOCATION" --sku Basic --vm-size c0 -o none
fi
REDIS_KEY="$(az redis list-keys -n "$REDIS_NAME" -g "$RESOURCE_GROUP" --query primaryKey -o tsv)"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_NAME}.redis.cache.windows.net:6380"

# ── 3. Build & push images (in ACR — no local Docker needed) ─────────────────
ACR_LOGIN="$(az acr show -n "$ACR_NAME" --query loginServer -o tsv)"
build() {
  local name="$1" dockerfile="$2"
  log "Build image: orgni-$name:$IMAGE_TAG"
  az acr build -r "$ACR_NAME" -t "orgni-$name:$IMAGE_TAG" -f "$dockerfile" . -o none
}
build api                     infrastructure/docker/api.Dockerfile
build worker                  infrastructure/docker/worker.Dockerfile
build document-intelligence   infrastructure/docker/document-intelligence.Dockerfile
build ontology                infrastructure/docker/organizational-ontology.Dockerfile

# ── 4. Database migration ────────────────────────────────────────────────────
log "Applying database schema"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run migrate

# ── 5. Deploy the internal Python services first ─────────────────────────────
ACR_PASS="$(az acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)"
ACR_USER="$(az acr credential show -n "$ACR_NAME" --query username -o tsv)"

deploy_internal() {
  local name="$1" port="$2"
  log "Deploy internal app: orgni-$name (:$port)"
  if exists az containerapp show -n "orgni-$name" -g "$RESOURCE_GROUP"; then
    az containerapp update -n "orgni-$name" -g "$RESOURCE_GROUP" \
      --image "$ACR_LOGIN/orgni-$name:$IMAGE_TAG" -o none
  else
    az containerapp create -n "orgni-$name" -g "$RESOURCE_GROUP" --environment "$ENV_NAME" \
      --image "$ACR_LOGIN/orgni-$name:$IMAGE_TAG" \
      --registry-server "$ACR_LOGIN" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
      --target-port "$port" --ingress internal \
      --env-vars "PORT=$port" -o none
  fi
}
deploy_internal document-intelligence 8000
deploy_internal ontology 8100

DI_FQDN="$(az containerapp show -n orgni-document-intelligence -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
ONTO_FQDN="$(az containerapp show -n orgni-ontology -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"

# ── 6. Deploy the worker and API ─────────────────────────────────────────────
log "Deploy worker: orgni-worker"
if exists az containerapp show -n orgni-worker -g "$RESOURCE_GROUP"; then
  az containerapp update -n orgni-worker -g "$RESOURCE_GROUP" \
    --image "$ACR_LOGIN/orgni-worker:$IMAGE_TAG" \
    --set-env-vars "NODE_ENV=production" "DATABASE_URL=secretref:database-url" "REDIS_URL=secretref:redis-url" -o none
else
  az containerapp create -n orgni-worker -g "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --image "$ACR_LOGIN/orgni-worker:$IMAGE_TAG" \
    --registry-server "$ACR_LOGIN" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
    --secrets "database-url=$DATABASE_URL" "redis-url=$REDIS_URL" \
    --env-vars "NODE_ENV=production" "DATABASE_URL=secretref:database-url" "REDIS_URL=secretref:redis-url" -o none
fi

log "Deploy API: orgni-api (external :8080)"
API_ENV=(
  "PORT=8080" "NODE_ENV=production"
  "DATABASE_URL=secretref:database-url"
  "AUTH_SECRET=secretref:auth-secret"
  "DOCUMENT_INTELLIGENCE_URL=https://$DI_FQDN"
  "ONTOLOGY_URL=https://$ONTO_FQDN"
  "GIT_SHA=$IMAGE_TAG"
)
[ -n "$WEB_ORIGIN" ] && API_ENV+=("CORS_ORIGINS=$WEB_ORIGIN")

if exists az containerapp show -n orgni-api -g "$RESOURCE_GROUP"; then
  az containerapp secret set -n orgni-api -g "$RESOURCE_GROUP" \
    --secrets "database-url=$DATABASE_URL" "auth-secret=$AUTH_SECRET" -o none
  az containerapp update -n orgni-api -g "$RESOURCE_GROUP" \
    --image "$ACR_LOGIN/orgni-api:$IMAGE_TAG" --set-env-vars "${API_ENV[@]}" -o none
else
  az containerapp create -n orgni-api -g "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --image "$ACR_LOGIN/orgni-api:$IMAGE_TAG" \
    --registry-server "$ACR_LOGIN" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
    --target-port 8080 --ingress external \
    --secrets "database-url=$DATABASE_URL" "auth-secret=$AUTH_SECRET" \
    --env-vars "${API_ENV[@]}" -o none
fi

# ── 7. Done ──────────────────────────────────────────────────────────────────
API_FQDN="$(az containerapp show -n orgni-api -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
log "Deployed. API: https://$API_FQDN"
echo "  Health : https://$API_FQDN/api/health"
echo "  Set your frontend's VITE_API_URL to: https://$API_FQDN"
echo "  Smoke test:"
echo "    curl https://$API_FQDN/api/health"
