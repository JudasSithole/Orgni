"""
Orgni Organizational Ontology — FastAPI service.

Exposes the Phase 1 ontology as an internal HTTP endpoint so the API/worker can
turn a document's OrganizationalToken[] into reviewable organizational facts.

    POST /v1/facts   body: { "tokens": OrganizationalToken[] }
      -> OntologyResult { entities, relationships, facts, conflicts, warnings,
                          rejected, schema_version, tenant_id }

Malformed tokens (failing the canonical schema) return HTTP 422 with the list of
problems, so nothing invalid is silently mapped.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ontology import map_tokens_to_facts, ONTOLOGY_SCHEMA_VERSION
from token_validation import TokenValidationError

app = FastAPI(
    title="Orgni Organizational Ontology",
    description="Maps OrganizationalToken[] into reviewable organizational facts. Part of the Orgni platform by Olyxee.",
    version="0.1.0",
)


class FactsRequest(BaseModel):
    tokens: list[dict[str, Any]]


@app.get("/health")
def health():
    return {"status": "ok", "service": "orgni-ontology", "schema_version": ONTOLOGY_SCHEMA_VERSION}


@app.get("/health/ready")
def ready():
    return {"status": "ok", "checks": {}}


@app.post("/v1/facts", response_class=JSONResponse)
def facts(request: FactsRequest):
    try:
        result = map_tokens_to_facts(request.tokens)
    except TokenValidationError as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "invalid_tokens", "detail": exc.errors},
        )
    return result.to_dict()
