# Organizational Ontology (Phase 1)

Maps the tokenizer's real `OrganizationalToken[]` into typed, validated,
evidence-backed **organizational facts** a user can review. This is the final
stage of the Phase 1 pipeline:

```
… → tokenizer → OrganizationalToken[] → ORGANIZATIONAL ONTOLOGY → reviewable facts
```

Python 3.12 (Pydantic + jsonschema), deployed as an internal service.

## What it produces

`map_tokens_to_facts(tokens)` → `OntologyResult`:

- `entities` — organizations/parties named by a document (source-scoped)
- `relationships` — typed, directional, temporal links (permitted predicates only)
- `facts` — events, states, policies with provenance, evidence, confidence,
  epistemic status, and temporal fields
- `conflicts` — contradictory claims, preserved (never auto-resolved)
- `warnings`, `rejected` — anything not mapped, with the reason
- `schema_version` = `0.1.0`

## Guarantees (enforced + tested)

- **One canonical token.** The ontology does not re-declare `OrganizationalToken`.
  It validates incoming tokens against the single authority,
  [`packages/contracts/schemas/organizational-token.schema.json`](../../packages/contracts/schemas/organizational-token.schema.json),
  which the TypeScript interface also mirrors. A malformed token is rejected
  (HTTP 422 / `TokenValidationError`), never mapped.
- **No fabrication.** A value the token did not supply stays `None`.
- **Conflicts preserved.** Two contradictory claims about the same subject are
  both kept and surfaced as a `CONTRADICTORY_CLAIM`, not merged or overwritten.
- **Epistemic status preserved.** A payment settlement that arrived `ASSERTED` /
  `PENDING_VERIFICATION` stays that way; the ontology never upgrades it to a
  settled/observed claim.
- **No cross-document entity resolution (Phase 2).** Entity ids are source-scoped,
  so the same name in two documents produces two distinct entities.
- **Invalid relationships rejected.** Only permitted predicates survive.

## Interfaces

Library:

```python
from ontology import map_tokens_to_facts
result = map_tokens_to_facts(tokens)   # tokens: list[dict] (real tokenizer output)
```

Service:

```
POST /v1/facts   { "tokens": OrganizationalToken[] }  -> OntologyResult
GET  /health · GET /health/ready
```

The API wires this in: when `ONTOLOGY_URL` is set, `POST /api/documents` returns
`facts` alongside `tokens`; when unset, it returns tokens only (facts: null).

## Testing

```bash
pip install -r requirements.txt
python -m pytest -q          # 17 tests
```

`tests/test_ontology.py` covers constraints, conflict preservation, unknowns,
no-cross-document-merge, dedup, and schema rejection. `tests/test_real_tokens.py`
runs the **real** TypeScript tokenizer (via `run_tokenizer.ts`) and feeds its
genuine tokens into the ontology — no hand-built token wrapper.
