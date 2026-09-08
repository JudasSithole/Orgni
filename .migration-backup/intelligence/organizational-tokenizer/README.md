# Organizational Tokenizer

Despite the name, this is **not** an ML/NLP tokenizer and hosts no models. It
converts canonical events and document extractions into `OrganizationalToken[]`.

**Status:** live in the workspace as `@workspace/organizational-tokenizer`.
Types come from `@workspace/contracts`.

## Responsibilities

- Preserve tenant, evidence, confidence, epistemic status, visibility and retention.
- Create deterministic tokens from canonical events.
- Map document extractions (invoice, proof of payment, contract) to tokens.
- Validate tokens before emitting them.

## Non-responsibilities

- Parse source files or run OCR.
- Extract fields or run ML inference.
- Resolve entity identity or match across documents.
- Mutate state.
- Invent missing facts.

## Two surfaces

**Canonical events** — the original entry point:

```ts
import { tokenizeCanonicalEvent, tokenizeCanonicalEvents } from "@workspace/organizational-tokenizer";

const token = tokenizeCanonicalEvent(event);
```

**Documents** — used by the Phase 1 pipeline:

```ts
import { tokenizeDocument } from "@workspace/organizational-tokenizer";

// InvoiceExtraction | ProofOfPaymentExtraction | ContractExtraction
const result = tokenizeDocument(extraction);
// → { tokens, tokenCount, valid, errors, warnings, ... }
```

`tokenizeDocument` dispatches on `documentType`, runs the matching mapper, then
returns only tokens that pass validation. It throws on an unsupported
`documentType`; callers are expected to handle that as a controlled failure.

## Input contract

Producers must supply the envelopes in `src/envelopes/` at `schemaVersion
"0.1.0"`. Each field is a `FieldExtraction` carrying `value`, `confidence`,
`method` and optional `page` / `section` / `raw`. Absent optional fields must be
omitted, never defaulted — the tokenizer treats what it receives as observed.

In Phase 1 these envelopes are produced by `intelligence/document-intelligence` and
adapted in `apps/worker/src/envelope/adapter.ts`. See
[`docs/phase1/README.md`](../../docs/phase1/README.md).

## Tokens produced

| Document | Tokens |
|----------|--------|
| Invoice | `INVOICE_ISSUED` (EVENT), `INVOICE_OBLIGATION` (STATE), `INVOICE_LINE_ITEMS` (EVENT) |
| Proof of payment | `PAYMENT_MADE` (EVENT), `PAYMENT_SETTLEMENT` (STATE) |
| Contract | `CONTRACT_EXECUTED` (EVENT), `CONTRACT_COUNTERPARTY` (RELATION), plus optional policy tokens |

Two behaviours are deliberate and should not be "fixed" without a contract change:

- `PAYMENT_SETTLEMENT` carries `status: "PENDING_VERIFICATION"` and
  `epistemicStatus: "ASSERTED"`. A proof of payment evidences that a payment was
  reported; it does not close an invoice. Reconciliation belongs to the ontology.
- `CONTRACT_EXECUTED` is only emitted when `signedDate` is present, so an
  unsigned agreement can never tokenize as executed.

## Known limitations

- `ContractExtraction` has no obligations field, so contract obligations cannot
  be tokenized. The Phase 1 pipeline extracts them into the envelope with
  evidence and warns that they were not tokenized. Adding an obligations token
  kind is a contract change for a later phase.
- Line items are tokenized as a single `INVOICE_LINE_ITEMS` event rather than
  one token per line.

## Testing

```bash
pnpm --filter @workspace/organizational-tokenizer test   # 16 tests
```
