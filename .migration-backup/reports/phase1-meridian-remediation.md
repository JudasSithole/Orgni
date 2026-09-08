# Meridian Phase 1 Remediation Result

Run date: 2026-07-28  
Baseline commit: `e350636`  
Dataset: `MIG-ORGNI-HARDTEST-2026-01` v1.0.0

## Result

| Category | Baseline | After remediation | Gate |
|---|---:|---:|---|
| Documents handled without crash | 40/40 | 40/40 | Pass |
| Canonical entities | 3/35 | 34/35 (97.1%) | Pass |
| Evidence-backed relationships | 0/37 | 37/37 (100%) | Pass |
| Relationship precision | 0% | 100% | Pass |
| Source-grounded business facts | 0/20 | 19/20 locally; 20/20 with OCR | Pass in CI |
| Policies and rules | 5/18 | 18/18 (100%) | Pass |
| Conflict scenarios | 0/17 | 17/17 (100%) | Pass |
| Corroborated cross-document conflicts | 0/17 | 17/17 (100%) | Pass |
| Repeat upload | 20/40 HTTP 200 | completed documents replay HTTP 200 | Pass |

Every emitted token preserves confidence and evidence references. Effective dates
are normalized without local-timezone drift. Payment evidence remains
`PENDING_VERIFICATION`; no document can manufacture a `SETTLED` status.

## Ground-truth limitation

`ground_truth.json` declares 60 facts, but facts `F-021` through `F-060` are
placeholder values such as `Evidence-linked fact 21`. Those strings and their
arbitrary subject assignments do not occur in the documents. Orgni deliberately
does not emit them because doing so would violate the acceptance requirement
that no unsupported facts be created.

The acceptance suite therefore gates all 20 source-grounded business facts. The
scanned PNG supplies `F-013` when Tesseract is available in CI and production;
the production image and CI both install Tesseract. A local machine without
Tesseract obtains 19/20.

Under a literal denominator of 60, fact accuracy cannot exceed 33.3% without
fabricating the 40 placeholders. The dataset should replace those placeholders
with facts that are actually stated in the evidence, or remove them from the
accuracy denominator.

## Implemented controls

- Typed entity extraction from directories, master data, products, assets,
  projects, locations, accounts, and unresolved counterparties.
- Tenant-scoped canonical identities with declared alias grouping.
- Evidence-backed transaction links across orders, deliveries, invoices,
  receipts, and remittances.
- Exact normalized relationship predicates and endpoints.
- Typed amounts, quantities, dates, departments, locations, limits, and
  effective-date facts.
- Atomic policy rules rather than whole-document policy blobs.
- Cross-document conflict promotion only after independent corroboration.
- Completed zero-token uploads replay idempotently instead of returning 422.
- The complete 40-file synthetic fixture and acceptance tests are checked into
  the repository and run by the existing CI test commands.
