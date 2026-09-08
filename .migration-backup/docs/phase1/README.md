# Orgni Phase 1 — Document → Organizational Tokens

Phase 1 turns an uploaded Invoice, Proof of Payment or Contract into
evidence-backed `OrganizationalToken[]`.

```
POST /api/documents             apps/api/src/routes/documents.ts
  → ingestion pipeline            apps/worker/src/ingestion/pipeline.ts
  → Document Intelligence         intelligence/document-intelligence (Python)
  → normalized envelope v0.1.0    apps/worker/src/envelope/types.ts
  → envelope validation           apps/worker/src/envelope/validate.ts
  → extraction adapter            apps/worker/src/envelope/adapter.ts
  → real tokenizeDocument         intelligence/organizational-tokenizer
  → OrganizationalToken[]         packages/contracts
```

Phase 1 **stops at the tokens**. Ontology mapping, entity resolution,
cross-document identity, graph storage and reasoning are explicitly out of scope.

## Ontology handoff interface

The Organizational Ontology consumes exactly this, from
`apps/worker/src/phase1/index.ts`:

```ts
interface TokenizationResult {
  sourceId: string;
  schemaVersion: "0.1.0";
  tokens: OrganizationalToken[];
  warnings: string[];
}
```

Obtain it with `processDocument(...)` followed by `toHandoff(result)`.

## Running the flow

```bash
# 1. Install (pnpm only — a preinstall guard blocks npm/yarn)
pnpm install

# 2. Document Intelligence dependencies (OCR needs the Tesseract binary)
pip install -r intelligence/document-intelligence/requirements.txt

# 3. Run Document Intelligence
cd intelligence/document-intelligence && uvicorn main:app --port 8000

# 4. Run the API, pointing it at Document Intelligence
DOCUMENT_INTELLIGENCE_URL=http://127.0.0.1:8000 \
  pnpm --filter @workspace/api run dev
```

### Upload a document

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "X-Tenant-Id: tenant_olyxee" \
  -F "file=@invoice.pdf"
```

Response is the ontology handoff plus pipeline detail:

```json
{
  "sourceId": "src_…",
  "schemaVersion": "0.1.0",
  "tokens": [ /* OrganizationalToken[] */ ],
  "warnings": [],
  "state": "COMPLETED",
  "documentType": "INVOICE",
  "errors": []
}
```

- `200` — processed (tokens may be empty for an `UNKNOWN` document, with warnings).
- `422` — controlled failure (unsupported type, unreadable): `state: "FAILED"`, no tokens.
- `400` — missing `X-Tenant-Id` header or missing `file`.
- `503` — `DOCUMENT_INTELLIGENCE_URL` not configured.

> Auth is not wired yet (§15), so the tenant comes from the `X-Tenant-Id`
> header. `resolveTenantId` in the route is the single seam to replace with the
> authenticated principal once Entra External ID lands.

### Or drive the pipeline directly (no HTTP)

```ts
import { createDocumentIntelligenceClient, processDocument, toHandoff }
  from "@workspace/worker/pipeline";

const documentIntelligence = createDocumentIntelligenceClient({
  baseUrl: "http://127.0.0.1:8000",
});

const result = await processDocument(
  {
    filename: "invoice.pdf",
    mimeType: "application/pdf",
    content: bytes,
    tenantId: "tenant_olyxee",
    sourceAcl: [{ principalId: "group_finance", principalType: "GROUP", effect: "ALLOW", actions: ["READ"] }],
  },
  documentIntelligence,
);

const handoff = toHandoff(result); // → the ontology
```

## Testing

```bash
pnpm run typecheck                                  # whole workspace
pnpm --filter @workspace/organizational-tokenizer test   # 16 tokenizer tests
pnpm --filter @workspace/worker test                # 53 pipeline tests
pnpm run test                                       # everything
```

The end-to-end tests run the **real** chain: fixture → ingestion → real Python
Document Intelligence → envelope → real `tokenizeDocument` → tokens. Nothing is
mocked. They require `python` on PATH and fail loudly if it is missing, rather
than skipping — a green run that never exercised the pipeline would be worse
than a red one.

Current results: **74 tests passing** (16 tokenizer + 53 pipeline + 5 API).

| Suite | Covers |
|-------|--------|
| `apps/worker/tests/ingestion.test.ts` | validation, checksums, identity, duplicates, state machine, retries, failure isolation, access metadata, log redaction |
| `apps/worker/tests/envelope.test.ts` | envelope schema validation, adapter behaviour, refusal to fabricate |
| `apps/worker/tests/e2e.test.ts` | all three document types end to end, controlled failures, handoff shape |
| `apps/api/tests/documents.test.ts` | the `POST /api/documents` endpoint end to end (real pipeline + tokenizer, stubbed Python) |
| `intelligence/organizational-tokenizer/tests/` | the tokenizer's own mapper contracts |

## Supported inputs

PDF, PNG/JPEG scans, and plain text. Anything else — and any unreadable file —
returns a controlled failure with warnings, never an exception.

## What the pipeline refuses to do

These are enforced by construction and covered by tests:

- **No fabricated values.** A field that cannot be located is absent. A value
  that cannot be parsed is rejected rather than stored wrong. When a required
  field is missing the adapter refuses to build an extraction instead of
  defaulting (e.g. it will not invent a zero invoice total).
- **A proof of payment never settles an invoice.** A referenced invoice number
  is recorded as a reference, with an explicit warning that settlement is not
  asserted. That reconciliation is the ontology's job.
- **An unsigned contract is never executed.** `CONTRACT_EXECUTED` is only
  emitted when the document carries signature evidence *and* an execution date.
  Draft/unsigned markers win over the mere presence of the word "signature".
- **No guessed document type.** Classification withholds a decision (UNKNOWN +
  warning) when the best score is below threshold or too close to the runner-up.

## Assumptions

- Text fixtures are a first-class Phase 1 input, so the full flow is testable
  in CI without OCR binaries.
- Evidence locations are recorded as page + character span + verbatim excerpt.
  The envelope's `evidence_locations` also allows bounding boxes and table
  cells; the text-span form is what the current extractors emit.
- `tenant_id` and `sourceAcl` are carried from ingestion through to every token.

## Known limitations

- **Contract obligations are extracted but not tokenized.** The tokenizer's
  `ContractExtraction` has no obligations field, and Phase 1 must not change the
  token contract to fit new code. Obligation clauses are present in the envelope
  (`obligation1`, `obligation2`, …) with evidence and are available to the
  ontology; a warning states the count that was not tokenized. Adding an
  obligations token kind is a tokenizer change for a later phase.
- **Field extraction is rule-based.** The extractors handle common commercial
  layouts. Unusual invoice or contract structures will extract partially and be
  reported as `PARTIAL` rather than failing.
- **Line-item parsing expects tabular rows.** Multi-line or heavily styled line
  items are skipped rather than guessed.
- **Duplicate detection is in-memory** (`createMemorySeenStore`). The `SeenStore`
  interface is the seam for a persistent store; nothing else needs to change.
- **A signed contract with no stated date** yields no `CONTRACT_EXECUTED` token,
  because the tokenizer requires `signedDate`. A warning records this.
- OCR quality caps overall confidence; low OCR confidence is surfaced as a
  warning rather than silently trusted.

## Sample output

One per document type, in [`samples/`](samples/), each containing the envelope
and the resulting handoff:

| Document | Tokens produced |
|----------|-----------------|
| [Invoice](samples/invoice.json) | `INVOICE_ISSUED` (EVENT), `INVOICE_OBLIGATION` (STATE), `INVOICE_LINE_ITEMS` (EVENT) |
| [Proof of payment](samples/proof-of-payment.json) | `PAYMENT_MADE` (EVENT), `PAYMENT_SETTLEMENT` (STATE, `PENDING_VERIFICATION`) |
| [Contract](samples/contract.json) | `CONTRACT_EXECUTED` (EVENT), `CONTRACT_COUNTERPARTY` (RELATION) |

Note the proof-of-payment settlement token carries
`status: "PENDING_VERIFICATION"` and `epistemicStatus: "ASSERTED"` — it records
that a payment was *reported*, not that an invoice is closed.
