# Deploy Orgni to Azure

A runbook for deploying the Orgni backend to **Azure Container Apps**. There are
two ways — pick one:

- **A. One-click** from GitHub Actions (recommended for repeat deploys)
- **B. One command** from your laptop (`deploy.sh`)

Both do the same thing and are **idempotent** — safe to re-run to ship a new build.

What gets deployed:

| Service | Azure Container App | Ingress | Port |
|---------|--------------------|---------|------|
| API | `orgni-api` | external | 8080 |
| Worker | `orgni-worker` | none | — |
| Document Intelligence | `orgni-document-intelligence` | internal | 8000 |
| Ontology | `orgni-ontology` | internal | 8100 |

Plus **Azure Database for PostgreSQL** (Flexible Server) and **Azure Cache for
Redis**, and an **Azure Container Registry** for the images.

> **Where's the tokenizer?** The organizational **tokenizer**
> (`intelligence/organizational-tokenizer`) is a TypeScript *library*, not its
> own service — it's bundled into `orgni-worker` (and the API), which run the
> pipeline `document-intelligence → tokenizer → ontology`. So the deployable
> Azure units are exactly the four above; the tokenizer ships inside them.

This is a **self-contained backend** — the four services above deploy and scale
as one group, independent of the frontend. `orgni-api` is the only public entry
point; the two Python services are internal-only (reachable by the API inside
the Container Apps environment, never from the internet). The API serves both
the document pipeline (`/api/documents`) and the console's read-only
organizational-model views (`/api/model/*`) — both come from the same
`orgni-api` image, so there is nothing extra to configure or deploy for them.

The frontend is hosted separately (Vercel / Azure Static Web Apps) and is **not**
part of this deploy. It only needs `VITE_API_URL` pointed at the API URL this
produces; the console then reads `/api/documents` and `/api/model/*` from it.

---

## Prerequisites (once)

- An Azure subscription and the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az login`).
- Permission to create resource groups, Container Apps, PostgreSQL, Redis, and a Container Registry.
- Node 24 + pnpm (only for the schema migration step; the CLI/Actions handle the rest).

---

## Option A — one-click from GitHub Actions

### A1. One-time: let GitHub log into Azure without a password (OIDC)

```bash
# Create an app registration and a service principal
az ad app create --display-name orgni-deployer
APP_ID=$(az ad app list --display-name orgni-deployer --query "[0].appId" -o tsv)
az ad sp create --id "$APP_ID"

# Give it access to your subscription
SUB=$(az account show --query id -o tsv)
az role assignment create --assignee "$APP_ID" --role Contributor --scope "/subscriptions/$SUB"

# Federate it to this repo's Actions (branch: main)
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:OlyxeeAI/Orgni:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$SUB"
```

### A2. One-time: add GitHub secrets

In **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | from A1 |
| `AZURE_TENANT_ID` | from A1 |
| `AZURE_SUBSCRIPTION_ID` | from A1 |
| `PG_ADMIN_PASSWORD` | a strong PostgreSQL password |
| `AUTH_SECRET` | a random string (signs login sessions) — e.g. `openssl rand -hex 32` |

Optional **Variables** (defaults in brackets): `AZURE_RESOURCE_GROUP` (`orgni-rg`),
`AZURE_LOCATION` (`westeurope`), `AZURE_ACR_NAME` (`orgniacr`), `WEB_ORIGIN`
(your frontend URL, for CORS).

### A3. Deploy

**Actions tab → "Deploy to Azure" → Run workflow.** It provisions everything,
builds the images, runs the migration, deploys all four services, and smoke-tests
the API. The run log prints the API URL at the end.

---

## Option B — one command from your laptop

```bash
az login
RESOURCE_GROUP=orgni-rg LOCATION=westeurope ACR_NAME=orgniacr \
PG_ADMIN_PASSWORD='<strong-password>' \
AUTH_SECRET="$(openssl rand -hex 32)" \
WEB_ORIGIN='https://your-frontend-url' \
  bash infrastructure/azure/deploy.sh
```

It prints the API URL and a health-check command when done.

---

## After deploying

1. **Point the frontend at the API.** Set `VITE_API_URL=https://<orgni-api-fqdn>`
   in the frontend's build/hosting config and redeploy it.
2. **Allow the frontend origin.** Set the `WEB_ORIGIN` variable (Option A) or env
   (Option B) to the frontend URL so the API's CORS lets it through.
3. **Verify** end-to-end:
   ```bash
   API=https://<orgni-api-fqdn>
   curl $API/api/health
   # log in:
   TOKEN=$(curl -s -X POST $API/api/auth/login -H 'content-type: application/json' \
     -d '{"email":"you@org.com","organization":"Your Org"}' | jq -r .token)
   # upload a document (runs the full pipeline → persisted facts):
   curl -X POST $API/api/documents -H "authorization: Bearer $TOKEN" -F "file=@invoice.pdf"
   # confirm the console's model views are served (drives the /app pages):
   curl $API/api/model/overview -H "authorization: Bearer $TOKEN"
   ```
   `/api/model/overview` returning JSON (counts of sources, entities, facts…)
   confirms the API, database, and console read-path are all wired. A 401 means
   the token/`AUTH_SECRET` is wrong; a 503 means `DATABASE_URL` isn't reaching
   Postgres.

---

## Notes & hardening

- **Re-deploying a new build:** just run the workflow (or `deploy.sh`) again — it
  updates the container images in place. Roll back by re-running an older commit.
- **PostgreSQL access:** for a quick pilot the script enables public access with
  a firewall rule for Azure services + the deployer's IP, and runs the migration
  over SSL. To harden, switch Postgres to private networking and run the
  migration as a Container Apps job inside the environment.
- **Secrets** (`DATABASE_URL`, `AUTH_SECRET`, Redis key) are stored as Container
  App secrets, never in the image or git. For production, source them from Azure
  Key Vault.
- **Not yet automated here:** autoscale rules, custom domains/TLS on the API, and
  Key Vault wiring — add per your environment. See `../../DEPLOYMENT.md` for the
  full architecture.
