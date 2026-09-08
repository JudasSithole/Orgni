"""
Typed organizational facts — the ontology's output (schema_version 0.1.0).

These are the reviewable facts a user sees. Every fact carries its provenance
(the token it came from), evidence references, confidence, epistemic status, and
temporal fields where the token provided them. Nothing is invented: a field the
token did not supply stays absent/None.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

FactKind = Literal["EVENT", "STATE", "POLICY"]
EntityType = Literal[
    "ORGANIZATION",
    "PARTY",
    "PERSON",
    "DEPARTMENT",
    "LOCATION",
    "PROJECT",
    "PRODUCT",
    "ASSET",
    "ACCOUNT",
    "RECORD",
    "UNKNOWN",
]
EpistemicStatus = Literal[
    "OBSERVED", "ASSERTED", "INFERRED", "PREDICTED", "DISPUTED"
]


class Provenance(BaseModel):
    """Where a fact came from. Always populated — no fact without provenance."""

    token_id: str
    token_kind: str
    source_refs: list[dict[str, Any]] = Field(default_factory=list)


class OntologyEntity(BaseModel):
    """
    An organizational entity as named by a single document.

    entity_id is deterministic within its source (tenant + type + normalized
    name + source_object_id). It deliberately includes the source so that the
    same name in two different documents produces two distinct entities — Phase
    1 performs NO cross-document entity resolution.
    """

    entity_id: str
    tenant_id: str
    entity_type: EntityType
    name: str
    canonical_id: Optional[str] = None
    aliases: list[str] = Field(default_factory=list)
    alias_key: Optional[str] = None
    confidence: float
    provenance: Provenance


class OntologyRelationship(BaseModel):
    subject_ref: str
    predicate: str
    object_ref: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    confidence: float
    epistemic_status: EpistemicStatus
    provenance: Provenance


class OntologyFact(BaseModel):
    """An event, state, or policy fact derived from a token."""

    fact_id: str
    tenant_id: str
    fact_kind: FactKind
    fact_type: str
    subject: Optional[str] = None
    object: Optional[str] = None
    scalar_value: Any = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    transaction_time: str
    confidence: float
    epistemic_status: EpistemicStatus
    provenance: Provenance


class OntologyConflict(BaseModel):
    """
    A preserved contradiction. Conflicting claims are never discarded or
    auto-resolved; both sides are kept with their provenance for human review.
    """

    conflict_type: str
    subject: Optional[str] = None
    predicate: Optional[str] = None
    fact_ids: list[str] = Field(default_factory=list)
    detail: str


class OntologyResult(BaseModel):
    tenant_id: Optional[str] = None
    schema_version: Literal["0.1.0"] = "0.1.0"
    entities: list[OntologyEntity] = Field(default_factory=list)
    relationships: list[OntologyRelationship] = Field(default_factory=list)
    facts: list[OntologyFact] = Field(default_factory=list)
    conflicts: list[OntologyConflict] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    rejected: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")
