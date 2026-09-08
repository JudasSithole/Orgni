# Orgni Phase 1 Meridian Hard-Test Scorecard

Run date: 2026-07-28  
Dataset: `MIG-ORGNI-HARDTEST-2026-01` v1.0.0  
Tenant: `tenant_meridian-phase1-acceptance-20260728-a`  
Verdict: **FAIL - Phase 1 is not complete**

## Executive scorecard

| Category | Expected | Detected raw | Correct | Missed | Incorrect | Recall / accuracy | Precision | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Documents, first pass | 40 | 40 | 40 | 0 | 0 | 100.0% | 100.0% | Pass |
| Entities | 35 | 23 unique | 3 | 32 | 20 | 8.6% | 13.0% | Fail |
| Relationships | 37 | 3 | 0 | 37 | 3 | 0.0% | 0.0% | Fail |
| Facts | 60 | 44 | 0 strict | 60 | 44 | 0.0% | 0.0% | Fail |
| Policies / rules | 18 | 17 | 5 | 13 | 12 | 27.8% | 29.4% | Fail |
| Conflicts / exceptions | 17 | 5 | 0 | 17 | 5 | 0.0% | 0.0% | Fail |

Phase 1 requires at least 90% entity, fact, and relationship accuracy, at least
95% relationship precision, and detection of every critical conflict. None of
those acceptance thresholds were met.

## Method

- Entities were matched by normalized exact name or declared ground-truth alias.
- Relationships required the correct predicate, resolvable ground-truth
  endpoints, and source evidence.
- Facts required the expected type, subject, value, and supporting document.
- Policies required the supporting document and a conservative semantic rule
  match. Five rules met the threshold: `POL-05`, `POL-07`, `POL-09`, `POL-10`,
  and `POL-16`.
- Conflicts required the expected cross-document scenario and supporting
  evidence. Generic same-document `CONTRADICTORY_CLAIM` records were not counted.
- Raw detections are not treated as correct merely because their count is near
  the expected count.

## Findings

### Document processing

The first pass returned HTTP 200 and `COMPLETED` for all 40 files. It produced
47 tokens from 20 files; the other 20 completed with zero tokens. Classification
or extraction failed to recognize many central document types, including
invoices, spreadsheets, ledger exports, asset records, JSON reports, text
reports, and the scanned invoice.

The second pass reused the same tenant and identical bytes:

- 20 token-producing documents returned HTTP 200.
- 20 zero-token documents returned HTTP 422.
- All 40 retained the same source IDs.
- The 20 successful responses were semantically identical after canonical JSON
  key ordering.

The corpus therefore does not satisfy repeat-processing determinism or
idempotency.

### Entities and aliases

Correctly recognized ground-truth entities:

- `ORG-MIG-001` - Meridian Industrial Group
- `ORG-APEX-001` - Apex Retail Holdings Ltd
- `ORG-VFS-001` - Vector Freight Solutions CC

Twenty unsupported entity strings were created, including filenames, partial
legal suffixes, prefixed master-data rows, policy sentence fragments, and
contract headings. Supplier alias resolution fails: aliases such as United
Steelworks / USW were not resolved to their canonical supplier.

### Relationships and operational chain

No ground-truth relationship was reproduced. The three generated relationships
were false positives inferred from policy prose:

- an `APPROVES` relation from a credit-limit sentence to "an exception"
- an `INVOICES` relation from "Supplier" to "must quote a valid PO"
- an `INVOICES` relation from "Collections" to an overdue-invoice clause

Orders, deliveries, invoices, and payments were not linked into the required
operational chain.

### Facts and payment safety

The 44 raw facts consist primarily of 25 generic `DOCUMENT_ASSERTION` facts and
17 `ORGANIZATIONAL_POLICY` facts. None strictly matched a ground-truth fact's
type, subject, value, and support.

The remittance did produce a ZAR 90,000 `PAYMENT_MADE` observation, but it had
no subject and did not match the expected `PAYMENT_AMOUNT` fact for
`RA-2026-0714`. The derived payment state was
`PENDING_VERIFICATION`, not `SETTLED`; this correctly avoids an unsupported
settlement claim.

### Conflicts and review

All 17 expected conflicts were missed. The five generated conflicts are false
positives caused by treating multiple policy clauses in one document as
contradictory claims. None represents a ground-truth cross-document exception.

The run emitted 131 warnings, and the inferred payment settlement was marked
`PENDING_VERIFICATION`. Uncertainty is surfaced, but the signal is too broad to
replace correct conflict detection.

### Evidence and temporal metadata

- 47/47 tokens contain confidence, source references, and transaction time.
- 44/44 projected facts retain non-empty provenance.
- 2/47 tokens and 2/44 facts contain effective dates.
- 46 tokens are `OBSERVED`; one is `INFERRED`.

Evidence and confidence plumbing works for emitted tokens, but effective dates
are missing from most results that require temporal interpretation.

## Automated test baseline

| Suite | Result |
|---|---|
| JavaScript/TypeScript workspace | 99 passed, 9 skipped |
| Document intelligence Python | 24 passed, 2 skipped |
| Ontology Python | 17 passed |

No automated suite failed. The skips remain a coverage gap, and the passing
implementation tests do not compensate for the failed corpus-level acceptance
criteria.

## Required remediation

1. Add reliable extraction and classification for all supplied PDF, DOCX, XLSX,
   CSV, XML, JSON, HTML, TXT, PPTX, and image documents.
2. Replace sentence-fragment entity extraction with typed entity resolution and
   canonical alias matching.
3. Extract typed business facts with identifiers, values, units, dates, and
   source support.
4. Build evidence-backed relationship extraction across documents, including
   the complete order-to-payment chain.
5. Evaluate conflicts across sources and effective dates instead of comparing
   unrelated clauses within one document.
6. Make zero-token completed sources replay successfully and identically.
7. Add this 40-file pack as a repeatable acceptance fixture with hard CI gates.

