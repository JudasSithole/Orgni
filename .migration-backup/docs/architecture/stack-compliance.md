# Technology Stack Compliance

Audit of the repository against [`ORGNI_TECHNOLOGY_STACK.md`](../../ORGNI_TECHNOLOGY_STACK.md)
(architecture version 0.1, authoritative engineering baseline).

Scope: Phase 1 modules. Phases 2–9 are not yet started, so their modules are
listed as not-yet-built rather than non-compliant.

Last audited against the state of `feature/phase1-document-pipeline`.

---

## 1. Architecture principles (§1)

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Evidence first | ✅ | Every field carries confidence + evidence location; every token carries `sourceRefs`. Enforced by E2E assertions. |
| 2 | One canonical contract | ⚠️ | `packages/contracts` is the sole `OrganizationalToken` in this branch, but it publishes **TypeScript only** — no Zod, JSON Schema, Pydantic or OpenAPI components yet (see §3 gap below). |
| 3 | Events preserve history | ⛔ | No event store yet (Phase 2, §6.4). Tokens are returned in-process, not persisted. |
| 4 | Unknown remains unknown | ✅ | Missing fields are absent, not defaulted; unparseable values rejected; classification withholds a decision below threshold. |
| 5 | Conflicts preserved | ➖ | Phase 2 concern (conflict engine, §7.3). |
| 6 | Human control | ➖ | Phase 7 concern. No external actions exist. |
| 7 | Tenant isolation | ⚠️ | `tenantId` flows ingestion → envelope → every token, and envelope validation rejects a blank tenant. But there is no persistence layer yet, so no row-level enforcement. |
| 8 | Modular monolith first | ✅ | Packages with clear boundaries; only Document Intelligence is a separate process, as §5.4 prescribes. |
| 9 | Contract-first integration | ⛔ | `lib/api-spec` exists but the document pipeline has no OpenAPI definition; no CloudEvents/AsyncAPI. |
| 10 | Provider abstraction | ⚠️ | Document Intelligence is injected into ingestion via a `DocumentIntelligence` port (swappable). OCR provider is **not** behind an interface. |

## 2. Language and contract boundary (§3)

| Rule | Status | Notes |
|------|--------|-------|
| TypeScript control plane (web, API, jobs) | ✅ | `apps/web`, `apps/api`, `apps/worker` are all TypeScript. |
| Python intelligence plane (document intelligence, ontology) | ✅ | `intelligence/document-intelligence` is Python 3.12 + FastAPI. |
| Tokenizer is TypeScript in `apps/worker` (§5.1) | ✅ | `intelligence/organizational-tokenizer`, imported and executed by the worker. |
| **No module may define a second `OrganizationalToken`** | ✅ *in this branch* | Only `packages/contracts/src/schemas.ts`. **PR #4 violates this** by adding `packages/contracts/tokens.py` with an incompatible 5-field model — see the open reconciliation on PRs #4/#5. |
| `packages/contracts` publishes TS types | ✅ | `schemas.ts`, `events.ts`. |
| …Zod validators | ⛔ | Not generated. |
| …JSON Schema | ⛔ | Not generated. **This is the blocker for cross-language contract parity.** |
| …Python Pydantic models | ⛔ | Not generated. The Python service currently uses hand-written dataclasses, so the envelope contract is duplicated by hand across the boundary. |
| …OpenAPI components | ⛔ | Not generated. |
| …CloudEvents / AsyncAPI | ⛔ | Not defined. |

**Highest-priority gap.** §3 requires TypeScript and Python models to be
*generated from the same versioned JSON Schemas*. Today `apps/worker/src/envelope/types.ts`
and `intelligence/document-intelligence/envelope/builder.py` describe the same
envelope in two hand-maintained places. They agree now and are covered by E2E
tests, but nothing structurally prevents drift.

## 3. Repository structure (§4)

| Canonical | Status |
|-----------|--------|
| `apps/web`, `apps/api`, `apps/worker` | ✅ |
| `apps/admin` | ➖ not yet built |
| `intelligence/document-intelligence` | ✅ relocated from `services/document-service` |
| `intelligence/organizational-tokenizer` | ✅ relocated from `packages/organizational-tokenizer` |
| `intelligence/organizational-ontology` | ⛔ exists on PR #4 as `packages/orgni-ontology` + a duplicate root `orgni-ontology/` — both non-canonical locations |
| other `intelligence/*` modules | ➖ Phases 2–6 |
| `platform/*` | ➖ Phases 2–7 |
| `packages/contracts,auth,config,observability,testing,ui` | ✅ |
| `packages/events` | ⛔ missing (canonical requires it) |
| `lib/*` | ✅ exact match |
| `infrastructure/azure,docker` | ✅ |
| `infrastructure/monitoring` | ⛔ missing |
| `services/` | ✅ removed — not part of the canonical structure |

## 4. Phase 1 modules

### 5.1 Organizational Tokenizer

| Requirement | Status |
|-------------|--------|
| TypeScript package executed by `apps/worker` | ✅ |
| Stack: TypeScript, Zod, canonical contracts, Vitest | ⚠️ TypeScript + contracts + Vitest ✅; **Zod not used** (hand-written validator in `validators/token.validator.ts`) |
| Input `NormalizedDocumentEnvelope` v0.1.0 | ⚠️ correct version and shape, but the type is named `NormalizedEnvelope` — rename for contract parity |
| Output versioned `OrganizationalToken[]` | ✅ events, states, relations. **Policies not emitted** for contracts. |
| Deterministic IDs, provenance, confidence, evidence refs, epistemic status | ✅ asserted in E2E tests |
| No OCR logic | ✅ |
| Compiled into worker, not deployed independently | ✅ |

### 5.2 Organizational Ontology

⛔ **Not in this branch.** Exists on PR #4. Per §5.2 it must be a Python package
consuming *the exact canonical* `OrganizationalToken[]` with **generated** token
contracts — PR #4 currently defines its own token model instead.

### 5.3 Ingestion Pipeline

| Requirement | Status |
|-------------|--------|
| TypeScript API and background worker | ✅ `POST /api/documents` in `apps/api` drives the worker pipeline; worker owns processing per §5.3 |
| SHA-256 integrity | ✅ |
| Idempotency | ✅ checksum-based duplicate detection |
| MIME validation | ✅ |
| Bounded retries | ✅ recoverable-only, with backoff |
| Tenant isolation | ✅ carried end-to-end |
| Malware scanning | ⛔ |
| Dead-letter handling | ⛔ failures become `FAILED` records; no DLQ |
| BullMQ + Redis | ⛔ synchronous in-process today |
| PostgreSQL metadata/state | ⛔ in-memory `SeenStore` |
| Azure Blob Storage for original bytes | ⛔ bytes are not persisted |

### 5.4 Document Intelligence

| Requirement | Status |
|-------------|--------|
| Python 3.12, FastAPI | ✅ |
| Pydantic | ⛔ uses dataclasses; Pydantic required for generated-contract parity |
| Azure AI Document Intelligence (primary) | ⛔ not integrated |
| PyMuPDF, OpenCV | ⛔ uses `pdfplumber` instead |
| Tesseract **fallback** | ⚠️ present, but currently the **primary** OCR path |
| Azure OpenAI via model gateway | ⛔ legacy path calls Anthropic directly, and its default model is **past end-of-life** |
| Output `NormalizedDocumentEnvelope` v0.1.0 | ✅ (naming as above) |
| Invoice / PoP / Contract only | ✅ |
| Missing values not inferred | ✅ |
| Payment does not settle an invoice | ✅ enforced + tested |
| Unsigned contracts not executed | ✅ enforced + tested |
| Storage in PostgreSQL / Blob | ⛔ nothing persisted |

## 5. Cross-cutting

| Area | Status |
|------|--------|
| §16 no document content in logs | ✅ enforced and asserted by test |
| §16 MIME inspection, file limits | ✅ |
| §16 malware scanning, archive protection | ⛔ |
| §17 correlation ID on every operation | ⛔ logs carry `sourceId` + `tenantId`, not a correlation ID or stage name |
| §15 Entra External ID auth | ⛔ no authentication anywhere |
| §18 Vitest / Pytest | ✅ |
| §18 Hypothesis, Testcontainers, Playwright, k6, Schemathesis | ⛔ |
| §18 cross-language contract fixtures | ⛔ — follows from the missing JSON Schema |
| §16 CodeQL, Dependabot, Trivy | ⛔ not configured |
| §19 deployment topology | ✅ for the three built components |

## 6. Recommended order

1. **Resolve the duplicate `OrganizationalToken`** (PR #4 vs #5). §3 forbids the
   second definition, so this blocks everything downstream.
2. **Generate contracts from JSON Schema** — emit TS, Zod and Pydantic from one
   source in `packages/contracts`. This is the structural fix that makes the
   TypeScript/Python boundary safe, and it is a §3 requirement.
3. **Add the API upload endpoint** so Phase 1's user-facing objective is met.
4. **Persist** source metadata/state in PostgreSQL and bytes in Blob Storage.
5. **BullMQ + Redis + DLQ** for the ingestion job path.
6. Rename `NormalizedEnvelope` → `NormalizedDocumentEnvelope`; adopt Pydantic and Zod.
7. Azure AI Document Intelligence as primary OCR, Tesseract demoted to fallback.
8. Correlation IDs, malware scanning, security scanning, auth.
