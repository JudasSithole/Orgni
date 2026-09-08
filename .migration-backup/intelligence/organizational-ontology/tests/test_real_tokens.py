"""
Integration: real tokenizer output → real ontology.

These tests run the ACTUAL TypeScript `tokenizeDocument` (via `run_tokenizer.ts`)
on real extraction envelopes and feed its genuine OrganizationalToken[] straight
into the ontology. No hand-built Python token wrapper is used (§10). If Node is
unavailable the tests fail loudly rather than skipping, because a green run that
never exercised the real tokenizer would be misleading.
"""
import json
import os
import shutil
import subprocess

import pytest

from ontology import map_tokens_to_facts

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
RUNNER = os.path.join(HERE, "run_tokenizer.ts")

NPX = shutil.which("npx")


def _tokenize(envelope: dict) -> list[dict]:
    """Invoke the real tokenizer and return its tokens."""
    if NPX is None:
        pytest.fail("npx/node is required to run the real tokenizer integration test")
    proc = subprocess.run(
        [NPX, "tsx", RUNNER],
        input=json.dumps(envelope),
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    if proc.returncode != 0:
        pytest.fail(f"tokenizer runner failed: {proc.stderr[-800:]}")
    return json.loads(proc.stdout)


def _field(value, conf=0.9, method="RULE_MATCH"):
    return {"value": value, "confidence": conf, "method": method}


def _base(document_type: str, **fields) -> dict:
    env = {
        "extractionId": "src_int",
        "tenantId": "tenant_olyxee",
        "documentRef": "chk-int",
        "checksum": "chk-int",
        "mimeType": "application/pdf",
        "observedAt": "2024-03-15T00:00:00Z",
        "schemaVersion": "0.1.0",
        "extractionStatus": "COMPLETE",
        "documentType": document_type,
    }
    env.update(fields)
    return env


INVOICE = _base(
    "INVOICE",
    invoiceNumber=_field("INV-2024-0912"),
    invoiceDate=_field("2024-03-15"),
    vendorName=_field("Olyxee AI (Pty) Ltd"),
    buyerName=_field("Clover Retail Group"),
    totalAmount=_field(13225),
    currency=_field("ZAR"),
    lineItems=[],
)

POP = _base(
    "PROOF_OF_PAYMENT",
    referenceNumber=_field("TXN-88213"),
    paymentDate=_field("2024-04-02"),
    payerName=_field("Clover Retail Group"),
    payeeName=_field("Olyxee AI (Pty) Ltd"),
    amount=_field(13225),
    currency=_field("ZAR"),
    paymentMethod=_field("EFT"),
    invoiceRef=_field("INV-2024-0912"),
)

CONTRACT = _base(
    "CONTRACT",
    contractType=_field("SERVICE_AGREEMENT"),
    effectiveDate=_field("2024-01-01"),
    title=_field("SERVICE AGREEMENT"),
    parties=[
        {"name": _field("Olyxee AI (Pty) Ltd"), "role": _field("PARTY_A")},
        {"name": _field("Clover Retail Group"), "role": _field("PARTY_B")},
    ],
    contractValue=_field(250000),
    currency=_field("ZAR"),
    signedDate=_field("2024-01-05"),
)


def test_invoice_real_tokens_to_facts():
    tokens = _tokenize(INVOICE)
    assert len(tokens) > 0
    result = map_tokens_to_facts(tokens)
    assert result.schema_version == "0.1.0"
    assert result.tenant_id == "tenant_olyxee"
    types = {f.fact_type for f in result.facts}
    assert "INVOICE_ISSUED" in types
    # Every fact keeps provenance + evidence back to the token/source.
    for fact in result.facts:
        assert fact.provenance.token_id
        assert len(fact.provenance.source_refs) > 0
        assert 0.0 <= fact.confidence <= 1.0


def test_pop_real_tokens_do_not_settle_invoice():
    tokens = _tokenize(POP)
    result = map_tokens_to_facts(tokens)
    # The settlement fact must remain pending/asserted, never an OBSERVED closure.
    settlement = [f for f in result.facts if f.fact_type == "PAYMENT_SETTLEMENT"]
    assert settlement, "expected a payment settlement fact"
    for f in settlement:
        assert f.epistemic_status != "OBSERVED"
        status = (f.scalar_value or {}).get("status", "")
        assert "PENDING" in str(status).upper() or f.epistemic_status == "ASSERTED"


def test_contract_real_tokens_to_facts_and_relationship():
    tokens = _tokenize(CONTRACT)
    result = map_tokens_to_facts(tokens)
    # Counterparty relation is a permitted predicate and must survive.
    preds = {r.predicate for r in result.relationships}
    assert "CONTRACT_COUNTERPARTY" in preds
    parties = {e.name for e in result.entities}
    assert "Olyxee AI (Pty) Ltd" in parties
    assert "Clover Retail Group" in parties


def test_full_chain_produces_reviewable_result():
    """The Phase 1 objective: tokens → validated, reviewable facts."""
    tokens = _tokenize(INVOICE)
    result = map_tokens_to_facts(tokens)
    payload = result.to_dict()
    # A reviewer-facing payload with the expected top-level shape.
    for key in ("entities", "relationships", "facts", "conflicts", "warnings", "schema_version"):
        assert key in payload
    assert payload["schema_version"] == "0.1.0"
