"""
Orgni Organizational Ontology (Phase 1).

Consumes the tokenizer's actual OrganizationalToken[] and maps them into typed,
validated, evidence-backed organizational facts that a user can review.

Phase 1 scope only. This package does NOT perform cross-document entity
resolution, graph construction, timeline reconstruction, or reasoning — those
are Phase 2. Entities are scoped to their source document; identical names in
different documents are never silently merged.
"""

from ontology import map_tokens_to_facts, ONTOLOGY_SCHEMA_VERSION
from models import (
    OntologyResult,
    OntologyEntity,
    OntologyRelationship,
    OntologyFact,
    OntologyConflict,
)
from token_validation import validate_tokens, TokenValidationError

__all__ = [
    "map_tokens_to_facts",
    "ONTOLOGY_SCHEMA_VERSION",
    "OntologyResult",
    "OntologyEntity",
    "OntologyRelationship",
    "OntologyFact",
    "OntologyConflict",
    "validate_tokens",
    "TokenValidationError",
]
