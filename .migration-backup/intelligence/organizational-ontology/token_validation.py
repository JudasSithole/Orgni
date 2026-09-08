"""
Validate incoming OrganizationalToken[] against the single canonical schema.

The ontology consumes the tokenizer's *actual* output. It does not declare its
own token model — it validates the token dicts against
`packages/contracts/schemas/organizational-token.schema.json`, the one
machine-readable authority that the TypeScript `OrganizationalToken` interface
also mirrors. This is what keeps a second, divergent token definition from
existing (an automatic release blocker).
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

try:
    from jsonschema import Draft7Validator
except ImportError as exc:  # pragma: no cover - dependency guard
    raise ImportError(
        "jsonschema is required for token validation. "
        "Install with: pip install -r requirements.txt"
    ) from exc


class TokenValidationError(ValueError):
    """Raised when a token does not conform to the canonical schema."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def _default_schema_path() -> str:
    # Resolve the canonical schema across layouts: the monorepo checkout (module
    # at intelligence/organizational-ontology) and the container image (module
    # copied to /app, schema copied to /app/packages/...). An explicit
    # ORGNI_TOKEN_SCHEMA env var overrides everything.
    rel = os.path.join(
        "packages", "contracts", "schemas", "organizational-token.schema.json"
    )
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.environ.get("ORGNI_TOKEN_SCHEMA", ""),
        os.path.join(os.path.abspath(os.path.join(here, "..", "..")), rel),  # repo
        os.path.join(here, rel),  # container: schema copied under the app root
        os.path.join(os.sep, rel),  # absolute /packages/... fallback
    ]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate):
            return candidate
    # Fall back to the repo-relative path so the error names a sensible location.
    return candidates[1]


@lru_cache(maxsize=4)
def _load_validator(schema_path: str) -> Draft7Validator:
    with open(schema_path, "r", encoding="utf-8") as handle:
        schema = json.load(handle)
    return Draft7Validator(schema)


def validate_tokens(
    tokens: list[dict[str, Any]],
    *,
    schema_path: str | None = None,
) -> list[dict[str, Any]]:
    """
    Validate every token against the canonical schema.

    Returns the tokens unchanged on success. Raises TokenValidationError listing
    every problem on failure, so a malformed token can never be silently mapped
    into a fact.
    """
    validator = _load_validator(schema_path or _default_schema_path())
    errors: list[str] = []
    for index, token in enumerate(tokens):
        for err in validator.iter_errors(token):
            location = ".".join(str(p) for p in err.absolute_path) or "<root>"
            errors.append(f"token[{index}].{location}: {err.message}")
    if errors:
        raise TokenValidationError(errors)
    return tokens
