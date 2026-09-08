# API documentation

The HTTP API is contract-first: `lib/api-spec/openapi.yaml` is the source of
truth. After editing the spec, regenerate clients and validators:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Generated outputs:

- `lib/api-client-react` — React Query hooks used by frontends
- `lib/api-zod` — zod schemas used by the API for validation

## Operational endpoints

| Endpoint            | Purpose                              |
| ------------------- | ------------------------------------ |
| `GET /api/health`       | Liveness — process is up          |
| `GET /api/health/ready` | Readiness — dependencies reachable|
| `GET /api/version`      | Version + git SHA for deploy verification |
| `GET /api/healthz`      | Legacy health check (Replit deploy probe) |
