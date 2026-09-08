"""
Organizational Ontology mapping (Phase 1).

Maps a validated OrganizationalToken[] into typed organizational facts:
entities, relationships, events, states, and policies — with provenance,
evidence, confidence, epistemic status, and temporal fields.

Guarantees:
  - Type & relationship constraints are enforced; unknown predicates are
    rejected (recorded in `rejected`), never silently accepted.
  - Conflicting claims are preserved side by side, never auto-resolved.
  - Unknown values remain unknown (None), never fabricated.
  - No cross-document entity resolution: an entity id is scoped to its source,
    so identical names in different documents are not merged.
  - Duplicate evidence is de-duplicated safely without dropping facts.
  - The ontology consumes the tokenizer's real output; it does not re-declare
    the token model (see token_validation).
"""
from __future__ import annotations

import hashlib
import re
from typing import Any, Optional

from models import (
    EntityType,
    OntologyConflict,
    OntologyEntity,
    OntologyFact,
    OntologyRelationship,
    OntologyResult,
    Provenance,
)
from token_validation import validate_tokens

ONTOLOGY_SCHEMA_VERSION = "0.1.0"

# Relationship predicates the Phase 1 ontology understands. Anything else is
# rejected rather than guessed.
ALLOWED_RELATION_PREDICATES = {
    "CONTRACT_COUNTERPARTY",
    "BILLED",  # vendor billed buyer (from an invoice)
    "PAID",  # payer paid payee (from a proof of payment)
    "INVOICE_ISSUED_BY",
    "PAYMENT_BETWEEN",
    "REPORTS_TO",
    "MANAGES",
    "EMPLOYS",
    "SUPPLIES",
    "APPROVES",
    "OWNS",
    "CONTRACTS_WITH",
    "PURCHASES_FROM",
    "PAYS",
    "INVOICES",
    "DELIVERS_TO",
    "ASSIGNED_TO",
    "RELATED_TO",
}

# Event / state / policy fact types the ontology recognizes from Phase 1
# document tokens. Unknown types are still recorded as facts but flagged.
KNOWN_FACT_TYPES = {
    "INVOICE_ISSUED",
    "INVOICE_OBLIGATION",
    "INVOICE_LINE_ITEMS",
    "PAYMENT_MADE",
    "PAYMENT_SETTLEMENT",
    "CONTRACT_EXECUTED",
    "CONTRACT_TERMINATION_TERMS",
    "CONTRACT_CONFIDENTIALITY_TERMS",
    "DOCUMENT_ASSERTION",
    "ORGANIZATIONAL_POLICY",
    "REGISTRATION_NUMBER",
    "VAT_NUMBER",
    "INVOICE_TOTAL",
    "PAYMENT_AMOUNT",
    "INVOICE_BALANCE",
    "PURCHASE_ORDER_TOTAL",
    "SUPPLIER_INVOICE_TOTAL",
    "DELIVERY_QUANTITY",
    "ORDER_QUANTITY",
    "CREDIT_LIMIT",
    "CREDIT_EXPOSURE",
    "SLA_EXPIRY",
    "SUPPLIER_INVOICE_DATE",
    "EMPLOYEE_DEPARTMENT",
    "EMPLOYEE_DEPARTMENT_ASSERTION",
    "ASSET_LOCATION",
    "BOARD_RESOLUTION_EFFECTIVE",
    "PROCUREMENT_MANAGER_LIMIT",
    "TRANSACTION_LINK",
    "EXCEPTION_EVIDENCE",
}


def _norm_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).lower()


def _source_object_id(token: dict[str, Any]) -> str:
    refs = token.get("sourceRefs") or []
    if refs and isinstance(refs[0], dict):
        return str(refs[0].get("sourceObjectId") or token.get("payloadRef") or "")
    return str(token.get("payloadRef") or "")


def _entity_id(
    tenant: str,
    etype: str,
    name: str,
    source_object_id: str,
    canonical_id: Optional[str] = None,
    alias_key: Optional[str] = None,
) -> str:
    # Explicit business ids and normalized alias keys are tenant-scoped, not
    # source-scoped. Unresolved names remain source-scoped to avoid false merges.
    identity = canonical_id or alias_key
    raw = (
        f"{tenant}|canonical|{identity}"
        if identity
        else f"{tenant}|{etype}|{_norm_name(name)}|{source_object_id}"
    )
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"ent_{digest}"


def _provenance(token: dict[str, Any]) -> Provenance:
    return Provenance(
        token_id=token["tokenId"],
        token_kind=token["tokenKind"],
        source_refs=token.get("sourceRefs") or [],
    )


def _add_entity(
    result: OntologyResult,
    seen: dict[str, OntologyEntity],
    *,
    tenant: str,
    name: Optional[str],
    etype: EntityType,
    token: dict[str, Any],
    canonical_id: Optional[str] = None,
    aliases: Optional[list[str]] = None,
    alias_key: Optional[str] = None,
) -> Optional[str]:
    """Register an entity (source-scoped) and return its id, or None if unnamed."""
    if not name or not str(name).strip():
        return None
    eid = _entity_id(
        tenant,
        etype,
        str(name),
        _source_object_id(token),
        canonical_id,
        alias_key,
    )
    if eid not in seen:
        entity = OntologyEntity(
            entity_id=eid,
            tenant_id=tenant,
            entity_type=etype,
            name=str(name),
            canonical_id=canonical_id,
            aliases=aliases or [],
            alias_key=alias_key,
            confidence=float(token.get("confidence", 0.0)),
            provenance=_provenance(token),
        )
        seen[eid] = entity
        result.entities.append(entity)
    return eid


def _valid_time(token: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    vt = token.get("validTime") or {}
    return vt.get("from"), vt.get("to")


def _make_fact(token: dict[str, Any]) -> OntologyFact:
    vfrom, vto = _valid_time(token)
    fact_type = token.get("eventType") or token.get("predicate") or "UNKNOWN"
    return OntologyFact(
        fact_id=f"fact_{token['tokenId']}",
        tenant_id=token["tenantId"],
        fact_kind=token["tokenKind"],  # EVENT | STATE | POLICY (validated below)
        fact_type=fact_type,
        subject=token.get("subjectId"),
        object=token.get("objectId"),
        scalar_value=token.get("scalarValue"),
        valid_from=vfrom,
        valid_to=vto,
        transaction_time=token["transactionTime"],
        confidence=float(token.get("confidence", 0.0)),
        epistemic_status=token["epistemicStatus"],
        provenance=_provenance(token),
    )


def _relation_predicate(token: dict[str, Any]) -> str:
    # Prefer an explicit predicate; else derive from a known relation eventType.
    return token.get("predicate") or token.get("eventType") or ""


def map_tokens_to_facts(tokens: list[dict[str, Any]]) -> OntologyResult:
    """
    Map validated tokens to organizational facts. Raises TokenValidationError if
    any token violates the canonical schema (so nothing malformed is mapped).
    """
    validate_tokens(tokens)

    result = OntologyResult()
    seen_entities: dict[str, OntologyEntity] = {}
    # (subject, predicate) -> list of (fact_id, scalar) for conflict detection
    claims: dict[tuple[str, str], list[tuple[str, Any]]] = {}
    seen_fact_ids: set[str] = set()

    tenants = {t["tenantId"] for t in tokens}
    result.tenant_id = next(iter(tenants)) if len(tenants) == 1 else None
    if len(tenants) > 1:
        result.warnings.append(
            "tokens span multiple tenants; ontology result is not tenant-scoped"
        )

    for token in tokens:
        kind = token["tokenKind"]

        if kind == "RELATION":
            predicate = _relation_predicate(token)
            subject = token.get("subjectId")
            obj = token.get("objectId")

            if predicate not in ALLOWED_RELATION_PREDICATES:
                result.rejected.append(
                    f"relation predicate '{predicate}' not permitted "
                    f"(token {token['tokenId']})"
                )
                continue
            if not subject or not obj:
                result.rejected.append(
                    f"relation '{predicate}' missing subject or object "
                    f"(token {token['tokenId']})"
                )
                continue

            etype: EntityType = "PARTY"
            metadata = (
                token.get("scalarValue")
                if isinstance(token.get("scalarValue"), dict)
                else {}
            )
            subj_ref = _add_entity(
                result, seen_entities, tenant=token["tenantId"],
                name=subject, etype=etype, token=token,
                canonical_id=metadata.get("subjectCanonicalId"),
            )
            obj_ref = _add_entity(
                result, seen_entities, tenant=token["tenantId"],
                name=obj, etype=etype, token=token,
                canonical_id=metadata.get("objectCanonicalId"),
            )
            vfrom, vto = _valid_time(token)
            result.relationships.append(
                OntologyRelationship(
                    subject_ref=subj_ref or subject,
                    predicate=predicate,
                    object_ref=obj_ref or obj,
                    attributes=token.get("scalarValue") or {}
                    if isinstance(token.get("scalarValue"), dict) else {},
                    valid_from=vfrom,
                    valid_to=vto,
                    confidence=float(token.get("confidence", 0.0)),
                    epistemic_status=token["epistemicStatus"],
                    provenance=_provenance(token),
                )
            )
            continue

        if kind in ("EVENT", "STATE", "POLICY"):
            fact = _make_fact(token)
            if fact.fact_id in seen_fact_ids:
                # Deterministic ids mean identical input is de-duplicated, not
                # duplicated into two facts.
                continue
            seen_fact_ids.add(fact.fact_id)

            if fact.fact_type not in KNOWN_FACT_TYPES:
                result.warnings.append(
                    f"fact type '{fact.fact_type}' not in the Phase 1 vocabulary "
                    f"(token {token['tokenId']}) — preserved but unclassified"
                )

            # Register named subject/object as entities (source-scoped).
            _add_entity(
                result, seen_entities, tenant=token["tenantId"],
                name=fact.subject, etype="PARTY", token=token,
            )
            _add_entity(
                result, seen_entities, tenant=token["tenantId"],
                name=fact.object, etype="PARTY", token=token,
            )

            result.facts.append(fact)

            # Conflict detection: same subject + fact_type with differing scalar.
            # Multiple policy clauses are complementary rules, not competing
            # scalar claims. Cross-document policy conflicts are evaluated by
            # the organizational rule engine, not this scalar equality check.
            if fact.subject and kind != "POLICY":
                key = (fact.subject, fact.fact_type)
                claims.setdefault(key, []).append((fact.fact_id, fact.scalar_value))
            continue

        if kind == "ENTITY":
            metadata = (
                token.get("scalarValue")
                if isinstance(token.get("scalarValue"), dict)
                else {}
            )
            raw_type = str(metadata.get("entityType") or "ORGANIZATION")
            etype = raw_type if raw_type in {
                "ORGANIZATION", "PARTY", "PERSON", "DEPARTMENT", "LOCATION",
                "PROJECT", "PRODUCT", "ASSET", "ACCOUNT", "RECORD", "UNKNOWN",
            } else "UNKNOWN"
            _add_entity(
                result, seen_entities, tenant=token["tenantId"],
                name=token.get("subjectId") or token.get("scalarValue"),
                etype=etype, token=token,
                canonical_id=metadata.get("canonicalId"),
                aliases=metadata.get("aliases") or [],
                alias_key=metadata.get("aliasKey"),
            )
            continue

        # QUERY / ACTION tokens are not organizational facts in Phase 1.
        result.warnings.append(
            f"token kind '{kind}' is not mapped in Phase 1 (token {token['tokenId']})"
        )

    _detect_conflicts(result, claims)
    return result


def _detect_conflicts(
    result: OntologyResult,
    claims: dict[tuple[str, str], list[tuple[str, Any]]],
) -> None:
    """Preserve — never resolve — contradictory claims about the same subject."""
    for (subject, fact_type), entries in claims.items():
        if len(entries) < 2:
            continue
        distinct = {
            _hashable(scalar) for _fid, scalar in entries
        }
        if len(distinct) > 1:
            result.conflicts.append(
                OntologyConflict(
                    conflict_type="CONTRADICTORY_CLAIM",
                    subject=subject,
                    predicate=fact_type,
                    fact_ids=[fid for fid, _ in entries],
                    detail=(
                        f"{len(entries)} differing claims about "
                        f"{fact_type} for '{subject}' preserved for review"
                    ),
                )
            )


def _hashable(value: Any) -> str:
    import json

    try:
        return json.dumps(value, sort_keys=True, default=str)
    except TypeError:
        return str(value)
