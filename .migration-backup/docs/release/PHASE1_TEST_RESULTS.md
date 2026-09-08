# Orgni Phase 1 — Release Readiness Test Results

> Final launch decision and evidence. Read `PHASE1_TEST_PLAN.md` for scope and
> method, `PHASE1_KNOWN_LIMITATIONS.md` and `PHASE1_RISK_REGISTER.md` for detail.

---

## Update (feature/phase1-ontology-and-fixes)

Since the original NO-GO, two blockers have been genuinely closed on the working
branch (real code + tests, not claims):

- **Organizational Ontology built and wired.** `intelligence/organizational-ontology`
  consumes the tokenizer's real `OrganizationalToken[]`, validates them against
  the single canonical schema (`packages/contracts/schemas/organizational-token.schema.json`),
  and produces reviewable facts (entities, relationships, events/states/policies,
  conflicts) with provenance/evidence/confidence/epistemic status. 17 pytest
  tests incl. 4 that run the **real** tokenizer → real ontology. The API now
  returns `facts` alongside `tokens` (`ONTOLOGY_URL`); 6 API tests green.
- **Build blocker fixed** — root `packageManager`/`engines` added; `turbo run build` works.

Remaining critical blockers (still NO-GO for pilot): persistence, queue/DLQ,
authentication + tenant isolation, web review UI, staging/CD. These need cloud
resources and larger builds and cannot be honestly completed in a code session.
The overall decision below is unchanged until those close.

---

## Final decision

```
Decision:        NO-GO  (core pipeline now reaches reviewable facts; infra/security
                 blockers remain — see "Update" above)

Scope tested:    Phase 1 document → token → (ontology) → reviewable facts pipeline,
                 for Invoice, Proof of Payment, Contract.
Commit SHA:      b4f1456f94538a2603ae2f869dedb1c04e4fab5e  (origin/main)
Environment:     Fresh shallow clone of main; Node 24 / pnpm 10.32.1 / Python 3.13
                 on Windows. Cross-checked against project CI (GitHub Actions, Linux).

Passing checks:  - pnpm run typecheck ...................... PASS (all packages)
                 - Single canonical OrganizationalToken ... PASS (packages/contracts only)
                 - No production dependency on .migration-backup ... PASS
                 - No committed secrets ................... PASS (scan clean)
                 - Pipeline core (upload→ingestion→doc-intel→envelope→tokenizer→tokens)
                   builds per-package (esbuild) and passes in CI:
                   74 TS tests + 11 pytest (Linux CI, prior verified runs)
                 - Epistemic safeguards enforced & tested (PoP non-settlement,
                   unsigned-contract non-execution, no fabrication, log redaction)
                 - Docker image definitions present for api / worker / document-intelligence

Failing checks:  - pnpm run build ......................... FAIL (turbo: missing
                   `packageManager` field in root package.json)
                 - pnpm run lint .......................... FAIL (138 files, Prettier)
                 - pnpm run test (local) .................. FAIL (Windows: stripped
                   rollup native binary; passes in Linux CI)
                 - python -m pytest (local) ............... FAIL to collect (deps not
                   installed; requires pip install -r requirements.txt)

Critical blockers (each an automatic NO-GO per §18):
                 1. Complete pipeline does not run — it stops at OrganizationalToken[].
                    There is NO Organizational Ontology on main and NO "reviewable
                    organizational facts" stage.
                 2. Ontology does not consume tokenizer output — ontology is absent.
                 3. No review path for uncertain results — apps/web is the marketing
                    site; there is no upload/review UI and nothing is persisted to review.
                 4. No staging environment / no CD — only ci.yml exists; no deploy
                    pipeline, no IaC (infrastructure/azure is a README).
                 5. Tenant isolation cannot be enforced — there is no authentication;
                    tenant is read from an unauthenticated X-Tenant-Id header.

Extraction metrics: NOT MEASURABLE. No versioned golden dataset (≥10 per type) exists.
                 Claiming production-level accuracy would be dishonest. See scorecard below.

Security findings: No committed secrets; log redaction implemented and tested. But
                 auth is absent, so every §12 cross-tenant control is untestable/unmet.
                 No dependency vulnerability scan (CodeQL/Trivy/Dependabot) configured.

Performance results: NOT MEASURED end-to-end (no deployable full system, no queue,
                 no persistence). Tokenizer/ontology micro-latency not benchmarked.

Non-critical limitations: build/lint/test-command hygiene, contract generation
                 (TS-only, no JSON Schema/Pydantic), model EOL id in legacy path.

Required fixes:  See "Required fixes" section below and PHASE1_RISK_REGISTER.md.

Recommended pilot limits: None — do not pilot. Re-gate after the five blockers close.

Evidence:        Command logs and code inspection recorded throughout this document.
```

---

## 1. Architecture verification (§3)

Inspected on `main` @ `b4f1456` (tracked files only; untracked local leftovers excluded).

| Required component | Present on main? | Evidence |
|---|---|---|
| Web upload & review interface | ❌ NO | `apps/web` is the marketing site (`developers`, `thesis`, landing pages). `git ls-tree apps/web/src` has no upload/review/document/token UI. |
| Main API | ⚠️ PARTIAL | `apps/api` exists; only `POST /api/documents` + health routes. Runs the pipeline **synchronously in-process**. |
| Background worker | ⚠️ STUB | `apps/worker/src/jobs/loop.ts` is a heartbeat: *"No persistent job sources are wired yet."* Does not process documents. |
| PostgreSQL persistence | ❌ NO | No source/token/fact writes in `apps/api` or `apps/worker`. Tokens are returned, never stored. `lib/db` schema exists but is unused by the pipeline. |
| Blob Storage / storage adapter | ❌ NO | Uploads held in memory and forwarded; never persisted. |
| Redis / BullMQ | ❌ NO | No `bullmq`/`ioredis` import anywhere. `REDIS_URL` is only referenced in config/env. |
| Ingestion pipeline | ✅ YES | `apps/worker/src/ingestion/pipeline.ts` — validation, sha256, dedup, RECEIVED/PROCESSING/COMPLETED/FAILED, bounded retries, failure isolation. |
| Document Intelligence | ✅ YES | `intelligence/document-intelligence` (Python/FastAPI): OCR, classification, extraction, evidence, envelope v0.1.0. |
| Organizational Tokenizer | ✅ YES | `intelligence/organizational-tokenizer` (TS), real `tokenizeDocument`. |
| Organizational Ontology | ❌ NO | **Absent on main.** No tracked ontology package. (Existed on closed, unmerged PR #4.) |
| Canonical contracts | ✅ YES | `packages/contracts` — single `OrganizationalToken` (TS). |
| Authentication & tenant isolation | ❌ NO | No auth middleware. Tenant from unauthenticated `X-Tenant-Id` header. |
| Observability | ⚠️ PARTIAL | pino structured logs + health/ready/version endpoints. No correlation-ID trace across stages, no metrics/alerts. |
| CI/CD | ⚠️ CI-ONLY | `.github/workflows/ci.yml` (typecheck/test/docker). **No CD / no staging.** |
| Production deployment config | ⚠️ PARTIAL | Dockerfiles + compose exist; `infrastructure/azure` is a README only. No IaC/Bicep, no Key Vault wiring. |

Contract-authority checks:
- `packages/contracts` is the sole authority — **PASS**.
- Single authoritative `OrganizationalToken` — **PASS** (only `packages/contracts/src/schemas.ts`; the `document-intelligence/fields/base.py` hit is a code comment, not a model).
- TS/Python **generated** schemas — **FAIL** (contracts is TS-only; the Python envelope is hand-maintained).
- Ontology consumes tokenizer output — **N/A** (no ontology).
- Web/API/worker/intelligence connected — **FAIL** (web disconnected; worker not in the runtime path; API calls doc-intel + tokenizer synchronously).
- Production code depends on `.migration-backup` — **PASS (no dependency)**, though `.migration-backup/` is still committed on main.

## 2. Build & static checks (§4)

All commands run in a pristine clone of `main` @ `b4f1456`.

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | ✅ exit 0 | 3m24s. |
| `pnpm run typecheck` | ✅ exit 0 | All packages `Done`. |
| `pnpm run lint` | ❌ exit 1 | *"Code style issues found in 138 files."* Pre-existing Prettier debt incl. generated code. |
| `pnpm run build` | ❌ exit 1 | `turbo run build` → *"Missing `devEngines.packageManager` or legacy `packageManager` field in package.json."* The documented top-level build is broken from a clean clone. |
| `pnpm run test` | ❌ exit 1 (local) | Windows: *"Cannot find module @rollup/rollup-win32-x64-msvc"* — the win32 rollup binary is stripped by `pnpm-workspace.yaml` overrides. Passes in Linux CI (74 tests). Environment-specific, not a code defect. |
| `python -m pytest` | ❌ exit 2 (local) | Collection `ImportError` (`from main import app`) — Python deps not installed. Requires `pip install -r requirements.txt`. Passes in Linux CI (11 tests). |

> Not run (no target on main): DB migrations, generated OpenAPI client refresh for
> the document flow, generated JSON Schema, generated Pydantic — none of these exist
> for the Phase 1 contract. No dependency/container vulnerability scan is configured.

## 3. Canonical contract (§5)

- `NormalizedDocumentEnvelope` v0.1.0 shape is implemented on both sides
  (`apps/worker/src/envelope/types.ts`, `.../validate.ts`; Python
  `intelligence/document-intelligence/envelope/builder.py`) and validated before
  tokenization. Negative-path validation (missing fields, bad version, bad
  confidence, unknown type, empty content) is covered by `apps/api` + worker tests.
- **Not satisfied:** cross-language *generated* parity, TS↔Python serialization
  round-trip tests, and backward-compat tests. The two envelopes are hand-kept in
  sync (agree today, no structural guard).
- `OrganizationalToken` is single and canonical. Tokenizer↔ontology model
  compatibility is **N/A** because the ontology is absent.

## 4. Extraction-quality scorecard (§8)

**NOT MEASURABLE — reported honestly rather than fabricated.**

No versioned golden dataset (the required ≥10 invoices, ≥10 PoPs, ≥10 contracts,
digital+scanned, missing-field, low-quality, multi-page, tables, conflicting) exists
in the repo. The only fixtures are a handful of plain-text and sample images used for
functional tests. Therefore:

| Metric | Threshold | Result |
|---|---|---|
| Document classification | ≥95% | **UNMEASURED** |
| Required-field precision | ≥90% | **UNMEASURED** |
| Required-field recall | ≥85% | **UNMEASURED** |
| Evidence-location accuracy | ≥90% | **UNMEASURED** |
| Unsupported-inference rate | ≤1% | Design enforces "no fabrication" (tested on fixtures); rate **not quantified** on a dataset |
| Controlled processing completion | ≥95% | **UNMEASURED** at volume |
| Critical false claims | 0 | Safeguards enforced & unit-tested; **not validated on a dataset** |

No accuracy claim can be made. Building this dataset is a launch prerequisite.

## 5. End-to-end (§11)

The **partial** chain runs and is CI-tested: `upload → ingestion → document
intelligence → envelope → real tokenizer → OrganizationalToken[]` for invoice, PoP,
contract, plus controlled failures (unsupported, empty, missing-field) and duplicate
handling. Verified via `apps/api/tests/documents.test.ts` (real pipeline + tokenizer,
Python stubbed) and `apps/worker/tests/e2e.test.ts` (real Python + real tokenizer).

The **required** chain does NOT run: there is no *persist source*, *queue job*,
*ontology*, *persist results*, *retrieve through API for review*, or *display in web
app*. None of the §11 reviewer actions (see status, open source, view fields/evidence/
confidence/warnings/tokens/facts, correct/reject, reprocess, export) are possible —
there is no persistence and no review UI.

## 6. Security (§12)

- **No committed secrets** (scan clean); `.env.example` files are placeholders.
- **Log redaction** implemented and asserted (ingestion test proves party names /
  amounts do not reach logs).
- **Every cross-tenant control is unmet/untestable**: there is no authentication, so
  roles, cross-tenant source/job/blob/export isolation, and upload/review/admin
  authorization cannot exist. Tenant identity is an unauthenticated header a caller
  sets freely. This is not a confirmed *exposure* of real customer data (no data is
  stored and no tenants exist), but tenant isolation is **structurally absent** and
  must be built before any multi-tenant pilot.
- No CORS production allowlist verified for the document flow; no security-header
  middleware confirmed; no dependency vulnerability scanning configured.

## 7. Reliability, performance, observability (§13–§15)

- **Reliability:** ingestion has bounded retries and failure isolation (unit-tested).
  But with no queue, no DLQ, and no persistence, the §13 scenarios (worker restart,
  duplicate delivery, retry exhaustion, dead-letter recovery, no data loss) are
  **not applicable / not satisfied** — a crash loses the in-flight request entirely.
- **Performance:** not measured; there is no deployable full system to measure.
- **Observability:** health/ready/version endpoints exist; structured logs exist.
  No single correlation ID traces a document across stages; no queue-depth / retry /
  dead-letter / extraction-quality metrics; no alerts.

## Required fixes (to reach a re-gate)

Blocking (must exist before any pilot):
1. Implement the Organizational Ontology (Python, per §5.2), consuming the real
   `OrganizationalToken[]`, producing reviewable facts.
2. Add persistence: sources, envelopes, tokens, facts in PostgreSQL; original bytes
   in Blob Storage (or equivalent).
3. Add the queue path (Redis/BullMQ) so the worker actually processes jobs, with DLQ
   and idempotency; retire the synchronous in-request pipeline for large docs.
4. Add authentication (Entra External ID) and enforce tenant isolation on every read/
   write/job/blob/export.
5. Build the web upload + review experience (status, fields, evidence, confidence,
   warnings, tokens, facts, correct/reject, reprocess, export).
6. Stand up a staging environment + CD; a real staging smoke test for all three types.

Non-blocking (fix opportunistically):
7. Add root `packageManager` field so `pnpm run build` (turbo) works from a clean clone.
8. `pnpm lint --write` to clear the 138-file Prettier debt, then gate on it.
9. Generate contracts (JSON Schema → TS + Zod + Pydantic) from one source; add
   cross-language serialization tests.
10. Replace the EOL model id in the legacy document-service `/run` path.
11. Build the versioned golden dataset and an extraction-quality dashboard.
12. Configure CodeQL / Dependabot / Trivy.
13. Remove `.migration-backup/` from `main`.
