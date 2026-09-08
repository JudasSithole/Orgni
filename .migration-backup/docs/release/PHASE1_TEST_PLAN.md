# Orgni Phase 1 — Release Readiness Test Plan

## Objective

Decide GO / CONDITIONAL GO / NO-GO for launching Phase 1 (V0.1) to a controlled
pilot. The bar: a **real** document must pass through the **complete** system —
`upload → ingestion → document intelligence → NormalizedDocumentEnvelope v0.1.0 →
tokenizer → OrganizationalToken[] → ontology → reviewable facts` — safely, with
evidence, tenant isolation, failure survival, and a reviewable result.

## Method (evidence-first)

Documentation, PR descriptions, and isolated unit tests are **not** accepted as
proof. Every claim is checked against the code on `main` and against commands run
in a pristine clone.

- **Source of truth:** fresh shallow clone of `origin/main` @ `b4f1456`.
- **Environment:** Node 24, pnpm 10.32.1, Python 3.13, Windows; cross-checked
  against project GitHub Actions CI (Linux).
- **Cleanroom:** the assessment runs in a clone, not the local working tree, so
  untracked leftovers cannot inflate the result.

## Scope

In scope (Phase 1): the three document types (Invoice, Proof of Payment, general
Contract), the full pipeline through to reviewable ontology facts, plus tenancy,
security, reliability, observability, and deployment readiness.

Out of scope (Phase 2, per brief): cross-document entity resolution, graph
construction, timeline reconstruction, advanced reasoning.

## Gates (mapped to the brief)

| # | Gate | Section |
|---|---|---|
| A | Architecture components present & connected | §3 |
| B | Build / static checks pass | §4 |
| C | Canonical contract (envelope + token) validated | §5 |
| D | Ingestion pipeline behaviours | §6 |
| E | Document Intelligence extraction correctness | §7 |
| F | Extraction-quality thresholds on a golden dataset | §8 |
| G | Tokenizer correctness + business safeguards | §9 |
| H | Ontology consumes real tokens, produces facts | §10 |
| I | Real end-to-end (persist→queue→…→review→display) | §11 |
| J | Auth, tenancy, security | §12 |
| K | Reliability / failure survival | §13 |
| L | Performance targets | §14 |
| M | Observability / correlation tracing | §15 |
| N | Deployment readiness / staging smoke test | §16 |
| O | Pilot-launch operational readiness | §17 |

## Automatic NO-GO triggers (§18)

Complete pipeline does not run; a supported type cannot be processed; ontology
does not consume real tokenizer output; duplicate canonical token schemas; critical
tests fail; tenant isolation fails; documents/credentials in logs; fabricated
information; payment references creating settlement claims; unsigned contracts marked
executed; failed jobs lose data; production containers cannot build; no staging;
no review path; critical claims without evidence; unresolved critical/high vulns.

## Deliverables

`PHASE1_TEST_PLAN.md` (this), `PHASE1_TEST_RESULTS.md`,
`PHASE1_LAUNCH_CHECKLIST.md`, `PHASE1_KNOWN_LIMITATIONS.md`,
`PHASE1_RISK_REGISTER.md`, `phase1-test-results.json`, and the final decision.
