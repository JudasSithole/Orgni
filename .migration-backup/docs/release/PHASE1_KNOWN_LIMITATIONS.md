# Orgni Phase 1 — Known Limitations

As of `main` @ `b4f1456`. These are the honest boundaries of what exists today.

## What works

- The **pipeline core** is real and integrated: `POST /api/documents` →
  ingestion (validation, sha256, dedup, state machine, bounded retries, failure
  isolation) → Python Document Intelligence (OCR, classification, field
  extraction with evidence) → `NormalizedDocumentEnvelope v0.1.0` → real
  `tokenizeDocument` → `OrganizationalToken[]`.
- Covered by CI on Linux: 74 TypeScript tests + 11 pytest.
- One canonical `OrganizationalToken` (`packages/contracts`); no duplicate.
- Epistemic safeguards enforced and tested: no fabrication of missing values, a
  proof of payment does not settle an invoice, an unsigned/draft contract is not
  executed, document content is kept out of logs.

## What is missing or partial

1. **No Organizational Ontology.** The pipeline ends at tokens. There are no
   "reviewable organizational facts," which the Phase 1 objective requires.
2. **No persistence.** Sources, envelopes, tokens, and facts are not stored.
   A processed result exists only in the HTTP response.
3. **No queue.** `apps/worker` is a heartbeat loop; it does not process
   documents. The pipeline runs synchronously inside the API request. No DLQ.
4. **No storage adapter.** Uploaded bytes are held in memory and forwarded; the
   original is never persisted for later review or reprocessing.
5. **No authentication / tenant isolation.** Tenant identity is an unauthenticated
   `X-Tenant-Id` header. There is no role model and no enforcement.
6. **No product web UI.** `apps/web` is the marketing site. There is no upload or
   review interface, and none of the reviewer actions (view fields/evidence/
   confidence/warnings/tokens/facts, correct/reject, reprocess, export) exist.
7. **No staging / CD.** Only `ci.yml`. `infrastructure/azure` is a README, not IaC.
8. **Contracts are TypeScript-only.** The Python envelope is hand-maintained to
   match; there is no generated JSON Schema/Pydantic and no cross-language
   serialization test. They agree today but nothing structurally prevents drift.
9. **No extraction-quality dataset.** No versioned golden set exists, so no
   accuracy figure (classification, precision/recall, evidence-location) can be
   trusted or claimed.
10. **Extraction is rule-based.** Common commercial layouts only; unusual
    structures extract partially (`PARTIAL`). Line-item parsing expects tabular
    rows; complex tables are skipped, not guessed.
11. **OCR is Tesseract-primary.** The stack baseline wants Azure AI Document
    Intelligence primary with Tesseract as fallback; not integrated.
12. **Build/lint hygiene.** `pnpm run build` (turbo) fails from a clean clone
    (missing root `packageManager`); `pnpm run lint` reports 138 Prettier issues.
13. **Legacy model id.** The document-service `/run` path defaults to an
    end-of-life model id (unused by the Phase 1 `/v1/analyze` path).
14. **`.migration-backup/` is still committed** on `main` (not a runtime
    dependency, but should be removed).

## Deliberate design choices (not defects)

- Plain-text fixtures are a supported input so the flow is CI-testable without
  OCR binaries.
- The proof-of-payment settlement token is emitted as `PENDING_VERIFICATION` /
  `ASSERTED` by design.
- Contract obligations are extracted with evidence into the envelope but not
  tokenized (the tokenizer's contract has no obligations field).
