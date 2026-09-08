# Orgni Phase 1 — Risk Register

Severity: 🔴 critical (launch blocker) · 🟠 high · 🟡 medium · 🟢 low
As of `main` @ `b4f1456`.

| ID | Risk | Sev | Evidence | Mitigation |
|----|------|-----|----------|------------|
| R1 | Complete pipeline does not run — no ontology, no reviewable facts | 🔴 | No ontology package on main; pipeline ends at `OrganizationalToken[]` | Build the Python ontology (§5.2) consuming real tokens |
| R2 | No review path for uncertain results | 🔴 | `apps/web` is marketing; no upload/review UI; nothing persisted | Build upload + review UI backed by persistence |
| R3 | Tenant isolation structurally absent | 🔴 | No auth; tenant from `X-Tenant-Id` header | Entra External ID + enforce tenant on every read/write/job/blob/export |
| R4 | No persistence — results are ephemeral | 🔴 | No DB writes of sources/tokens/facts | PostgreSQL for records; Blob for bytes |
| R5 | No queue/DLQ — a crash loses the in-flight document | 🔴 | Worker is a heartbeat; pipeline is synchronous in-request | Redis/BullMQ with DLQ + idempotency |
| R6 | No staging / CD | 🔴 | Only `ci.yml`; azure = README | Stand up staging + deploy pipeline + smoke test |
| R7 | `pnpm run build` fails from clean clone | 🟠 | turbo: missing `packageManager` | Add `packageManager` to root package.json |
| R8 | No extraction-quality dataset or dashboard | 🟠 | Only functional fixtures | Build ≥30-doc versioned golden set + scorecard |
| R9 | Contracts TS-only; hand-synced Python envelope can drift | 🟠 | No generated JSON Schema/Pydantic; no round-trip test | Generate TS+Zod+Pydantic from one JSON Schema |
| R10 | No dependency/container vuln scanning | 🟠 | No CodeQL/Dependabot/Trivy | Add security scans to CI |
| R11 | No correlation-ID tracing or pipeline metrics/alerts | 🟡 | Logs carry sourceId/tenantId only; no metrics | Add correlation ID + stage metrics + alerts |
| R12 | 138 Prettier lint failures | 🟡 | `pnpm run lint` exit 1 | `pnpm lint --write`, then gate |
| R13 | EOL model id in legacy `/run` path | 🟡 | `config.py` default model | Update model id / route to model gateway |
| R14 | Tesseract-primary OCR (baseline wants Azure DI primary) | 🟡 | `ocr/extractor.py` | Integrate Azure AI Document Intelligence |
| R15 | `.migration-backup/` committed on main | 🟢 | Present in tree; no runtime import | `git rm -r .migration-backup` |
| R16 | Local test/pytest need environment setup | 🟢 | rollup win32 binary stripped; Python deps | Document env requirements; rely on CI |

**Blockers R1–R6 must all close before a re-gate.** No pilot with any open 🔴.
