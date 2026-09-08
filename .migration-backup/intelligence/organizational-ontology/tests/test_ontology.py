"""
Ontology unit tests. Token dicts here conform to the canonical
OrganizationalToken schema (packages/contracts/schemas). The real-tokenizer
integration lives in test_real_tokens.py.
"""
import copy

import pytest

from ontology import map_tokens_to_facts, ONTOLOGY_SCHEMA_VERSION
from token_validation import validate_tokens, TokenValidationError


def _token(**overrides):
    base = {
        "tokenId": "tok_1",
        "tenantId": "tenant_olyxee",
        "tokenKind": "EVENT",
        "eventType": "INVOICE_ISSUED",
        "subjectId": "Olyxee AI (Pty) Ltd",
        "objectId": "Clover Retail Group",
        "validTime": {"from": "2024-03-15"},
        "transactionTime": "2026-07-23T00:00:00Z",
        "scalarValue": {"invoiceNumber": "INV-1", "totalAmount": 13225},
        "sourceRefs": [
            {
                "evidenceId": "ev_1",
                "sourceSystem": "orgni.document-intelligence",
                "sourceObjectId": "checksum-abc",
                "locator": {"page": 1, "section": "header"},
            }
        ],
        "confidence": 0.9,
        "epistemicStatus": "OBSERVED",
        "visibility": [],
        "actionScope": ["finance"],
        "retentionClass": "financial",
    }
    base.update(overrides)
    return base


def test_schema_version_is_phase1():
    assert ONTOLOGY_SCHEMA_VERSION == "0.1.0"
    result = map_tokens_to_facts([_token()])
    assert result.schema_version == "0.1.0"


def test_event_maps_to_fact_with_full_provenance():
    result = map_tokens_to_facts([_token()])
    assert len(result.facts) == 1
    fact = result.facts[0]
    assert fact.fact_kind == "EVENT"
    assert fact.fact_type == "INVOICE_ISSUED"
    assert fact.epistemic_status == "OBSERVED"
    assert 0.0 <= fact.confidence <= 1.0
    assert fact.valid_from == "2024-03-15"
    assert fact.transaction_time
    assert fact.provenance.token_id == "tok_1"
    assert len(fact.provenance.source_refs) == 1


def test_named_parties_become_entities():
    result = map_tokens_to_facts([_token()])
    names = {e.name for e in result.entities}
    assert "Olyxee AI (Pty) Ltd" in names
    assert "Clover Retail Group" in names


def test_invalid_relation_predicate_is_rejected_not_accepted():
    tok = _token(
        tokenId="tok_rel",
        tokenKind="RELATION",
        predicate="SECRETLY_CONTROLS",
        eventType=None,
    )
    del tok["eventType"]
    result = map_tokens_to_facts([tok])
    assert result.relationships == []
    assert any("not permitted" in r for r in result.rejected)


def test_valid_relation_predicate_is_kept():
    tok = _token(
        tokenId="tok_rel",
        tokenKind="RELATION",
        predicate="CONTRACT_COUNTERPARTY",
        eventType=None,
    )
    del tok["eventType"]
    result = map_tokens_to_facts([tok])
    assert len(result.relationships) == 1
    assert result.relationships[0].predicate == "CONTRACT_COUNTERPARTY"


def test_relation_missing_subject_or_object_is_rejected():
    tok = _token(
        tokenId="tok_rel",
        tokenKind="RELATION",
        predicate="CONTRACT_COUNTERPARTY",
    )
    del tok["objectId"]
    del tok["eventType"]
    result = map_tokens_to_facts([tok])
    assert result.relationships == []
    assert any("missing subject or object" in r for r in result.rejected)


def test_unknown_values_remain_unknown():
    tok = _token(tokenId="tok_x")
    del tok["subjectId"]
    del tok["objectId"]
    result = map_tokens_to_facts([tok])
    assert result.facts[0].subject is None
    assert result.facts[0].object is None


def test_conflicting_claims_are_preserved_not_resolved():
    a = _token(
        tokenId="tok_a",
        tokenKind="STATE",
        eventType="INVOICE_OBLIGATION",
        scalarValue={"status": "OUTSTANDING"},
    )
    b = _token(
        tokenId="tok_b",
        tokenKind="STATE",
        eventType="INVOICE_OBLIGATION",
        scalarValue={"status": "PAID"},
    )
    result = map_tokens_to_facts([a, b])
    # Both facts kept.
    assert len(result.facts) == 2
    # And the contradiction is surfaced, not silently merged/overwritten.
    assert len(result.conflicts) == 1
    assert result.conflicts[0].conflict_type == "CONTRADICTORY_CLAIM"
    assert set(result.conflicts[0].fact_ids) == {"fact_tok_a", "fact_tok_b"}


def test_no_cross_document_entity_resolution():
    # Same party name, two different source documents -> two distinct entities.
    doc1 = _token(tokenId="tok_d1")
    doc2 = _token(tokenId="tok_d2")
    doc2 = copy.deepcopy(doc2)
    doc2["sourceRefs"][0]["sourceObjectId"] = "checksum-different"
    result = map_tokens_to_facts([doc1, doc2])
    olyxee = [e for e in result.entities if e.name == "Olyxee AI (Pty) Ltd"]
    assert len(olyxee) == 2, "entities must not be merged across documents in Phase 1"
    assert olyxee[0].entity_id != olyxee[1].entity_id


def test_duplicate_token_is_deduplicated():
    tok = _token(tokenId="tok_dup")
    result = map_tokens_to_facts([tok, copy.deepcopy(tok)])
    assert len(result.facts) == 1


def test_malformed_token_is_rejected_before_mapping():
    bad = _token(confidence=5)  # out of [0,1]
    with pytest.raises(TokenValidationError):
        map_tokens_to_facts([bad])


def test_missing_required_field_is_rejected():
    bad = _token()
    del bad["tenantId"]
    with pytest.raises(TokenValidationError):
        validate_tokens([bad])


def test_epistemic_status_is_preserved_for_settlement_state():
    # A payment settlement token arrives ASSERTED / pending — the ontology must
    # preserve that epistemic status, never upgrade it to OBSERVED/settled.
    tok = _token(
        tokenId="tok_pay",
        tokenKind="STATE",
        eventType="PAYMENT_SETTLEMENT",
        epistemicStatus="ASSERTED",
        scalarValue={"status": "PENDING_VERIFICATION"},
    )
    result = map_tokens_to_facts([tok])
    fact = result.facts[0]
    assert fact.epistemic_status == "ASSERTED"
    assert fact.scalar_value.get("status") == "PENDING_VERIFICATION"
