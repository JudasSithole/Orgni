# Orgni Phase 1 — Launch Checklist

Legend: ✅ done · ⚠️ partial · ❌ missing · — not applicable yet

## Functional gates (§18)

- [ ] ❌ Complete pipeline runs end to end (stops at tokens; no ontology/facts)
- [x] ✅ Invoice processed to tokens
- [x] ✅ Proof of Payment processed to tokens
- [x] ✅ Contract processed to tokens
- [ ] ❌ Ontology consumes real tokenizer output (ontology absent)
- [x] ✅ Single canonical `OrganizationalToken` (no duplicate on main)
- [ ] ❌ Review path for uncertain results (no UI, no persistence)
- [ ] ❌ Failed jobs recover without data loss (no queue/DLQ/persistence)
- [ ] ⚠️ Production containers build (Dockerfiles build in CI; `pnpm run build` broken)
- [ ] ❌ Staging environment exists

## Data-integrity & safety

- [x] ✅ Missing information not fabricated (enforced + unit-tested)
- [x] ✅ Payment reference does not settle an invoice (enforced + tested)
- [x] ✅ Unsigned contract not marked executed (enforced + tested)
- [x] ✅ Critical extraction values carry evidence references (in envelope + tokens)
- [ ] ❌ Validated on a golden dataset (no dataset exists)

## Security & tenancy (§12)

- [x] ✅ No committed secrets
- [x] ✅ Log redaction (no document content in logs)
- [ ] ❌ Authentication (none)
- [ ] ❌ Tenant isolation enforced (tenant is an unauthenticated header)
- [ ] ❌ Role model (Viewer/Reviewer/Contributor/Admin/Owner)
- [ ] ❌ Dependency vulnerability scanning (CodeQL/Dependabot/Trivy)
- [ ] ⚠️ CORS production allowlist / security headers (env-based CORS only)

## Persistence & infrastructure (§3, §16)

- [ ] ❌ PostgreSQL persistence of sources/tokens/facts
- [ ] ❌ Blob Storage (or equivalent) for original bytes
- [ ] ❌ Redis/BullMQ queue + DLQ
- [ ] ⚠️ Dockerfiles (api/worker/document-intelligence present; build in CI)
- [ ] ❌ IaC / Key Vault / probes wired (azure = README only)
- [ ] ❌ DB migrations applied in a deploy
- [ ] ❌ Rollback + backup/recovery procedure
- [ ] ❌ Domain + TLS + monitoring alerts + cost limits + retention

## Observability (§15)

- [x] ✅ Health / readiness / version endpoints
- [x] ✅ Structured logs (pino)
- [ ] ❌ Single correlation ID across all stages
- [ ] ❌ Queue-depth / retry / DLQ / extraction-quality metrics + alerts

## Build/CI hygiene (§4)

- [x] ✅ `pnpm run typecheck`
- [ ] ❌ `pnpm run lint` (138 Prettier failures)
- [ ] ❌ `pnpm run build` (missing `packageManager` for turbo)
- [x] ✅ CI test suite green on Linux (74 TS + 11 pytest, prior verified)
- [ ] ⚠️ `pnpm run test` / `pytest` locally (environment setup required)

## Pilot operational readiness (§17)

- [ ] ❌ Pilot scope, consent & data-processing terms, POPIA privacy notice
- [ ] ❌ Retention/deletion process, support contact, incident owner
- [ ] ❌ Manual review process, feedback form, onboarding guide
- [x] ✅ Known-limitations document (`PHASE1_KNOWN_LIMITATIONS.md`)
- [ ] ❌ Rollback/shutdown procedure, extraction-quality dashboard, daily review

**Gate result: NO-GO.** Do not onboard pilot organizations.
