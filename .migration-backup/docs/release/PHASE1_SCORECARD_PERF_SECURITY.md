# Orgni Phase 1 — Extraction Scorecard, Performance, Security Findings

`main` @ `b4f1456`. Combines deliverables 7–9.

## 7. Extraction-quality scorecard

**Status: NOT MEASURABLE.** No versioned golden dataset (the required ≥10
invoices, ≥10 proofs of payment, ≥10 contracts, with digital+scanned, missing
fields, low-quality scans, multi-page, tables, conflicting values) exists on
`main`. The repo contains only a few functional fixtures (plain text + a couple
of sample images). Reporting accuracy numbers off that would be dishonest.

| Metric | Threshold | Invoice | PoP | Contract |
|--------|----------:|:-------:|:---:|:--------:|
| Classification accuracy | ≥95% | n/a | n/a | n/a |
| Field precision | ≥90% | n/a | n/a | n/a |
| Field recall | ≥85% | n/a | n/a | n/a |
| Exact-match accuracy | — | n/a | n/a | n/a |
| Normalized-value accuracy | — | n/a | n/a | n/a |
| Evidence-location accuracy | ≥90% | n/a | n/a | n/a |
| Table-extraction accuracy | — | n/a | n/a | n/a |
| Unsupported-inference rate | ≤1% | n/a | n/a | n/a |
| OCR failure rate | — | n/a | n/a | n/a |
| Avg confidence (correct) | — | n/a | n/a | n/a |
| Avg confidence (incorrect) | — | n/a | n/a | n/a |

What *is* verified (functional, not statistical): on the existing fixtures the
extractor attaches value + confidence (0–1) + method + evidence location per
field, warns on absence, and never fabricates missing values. This demonstrates
the mechanism is correct; it does **not** establish pilot-grade accuracy.

Prerequisite: build the versioned golden dataset with a ground-truth key and an
automated scorer before any accuracy claim.

## 8. Performance report

**Status: NOT MEASURED end-to-end.** There is no deployable full system (no
persistence, no queue, no ontology, no UI), so §14 targets — upload latency, queue
wait, total time-to-reviewable-result, memory/CPU, DB latency, concurrency, cost
per document — cannot be measured against reality.

| Target | Value | Result |
|--------|-------|--------|
| API p95 (excl. processing) < 500 ms | — | not measured |
| Tokenizer p95 < 250 ms | — | not benchmarked |
| Ontology p95 < 500 ms | — | n/a (no ontology) |
| Digital doc < 30 s | — | not measured on deployed system |
| Scanned doc < 90 s | — | not measured |
| No data loss on worker restart | — | fails by construction (no persistence) |
| No uncontrolled queue growth | — | n/a (no queue) |

Recommendation: defer performance gating until the full system exists; then
measure on staging with representative documents before pilot.

## 9. Security findings

| Area | Finding | Severity |
|------|---------|----------|
| Committed secrets | None found (scan clean; `.env.example` are placeholders) | ✅ |
| Log redaction | Implemented; unit test proves party names/amounts do not reach logs | ✅ |
| Authentication | **Absent** — no auth layer anywhere | 🔴 |
| Tenant isolation | **Structurally absent** — tenant is an unauthenticated `X-Tenant-Id` header; no enforcement | 🔴 |
| Confirmed cross-tenant data exposure | **No** — because no data is stored and no real tenants exist (not because isolation works) | — |
| Role model (Viewer…Owner) | Absent | 🟠 |
| Upload/review/admin authorization | Absent | 🟠 |
| Dependency / container vuln scanning | Not configured (no CodeQL/Dependabot/Trivy) | 🟠 |
| CORS production allowlist | Env-based CORS present in `apps/api`; not verified for a document flow origin set | 🟡 |
| Security headers | Not confirmed (no helmet/equivalent seen) | 🟡 |
| Malicious filename / MIME spoof / path traversal | Upload is in-memory and forwarded; MIME allowlist enforced; not adversarially tested | 🟡 |
| Prompt/script injection in documents | Not tested (no LLM in the Phase 1 `/v1/analyze` path; rule-based) | 🟡 |

No confirmed cross-tenant exposure (which would be an automatic NO-GO on its own),
but tenant isolation must be **built and tested** before any multi-tenant pilot.
The NO-GO here is driven by the missing-functionality blockers, not by a proven
data leak.
