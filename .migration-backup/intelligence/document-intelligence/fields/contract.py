"""
Contract field extraction.

Scope is deliberately narrow: common commercial-agreement shapes only, as
Phase 1 does not attempt to support every contract structure.

Execution status is only ever asserted from explicit signature evidence. An
agreement that has not been signed is reported as unsigned, never as executed,
because "this contract is in force" is exactly the kind of claim that must not
be manufactured from a template.
"""
from __future__ import annotations

import re
from typing import Any

from .base import (
    ExtractionOutcome,
    Field,
    RULE_MATCH,
    find,
    normalise_currency,
    normalise_date,
    page_for_offset,
    parse_amount,
)

_MONEY = r"([A-Z]{3}\s*)?([R$€£¥]\s*)?([\d][\d,\. ]*\d|\d)"

# Obligation cues — modal language that signals a duty owed by a party.
_OBLIGATION = re.compile(
    r"^[^\S\n]*(?:\d+(?:\.\d+)*[\.\)]?\s*)?"
    r"(?P<text>(?:the\s+)?(?:supplier|provider|customer|client|contractor|vendor|"
    r"company|party|licensee|licensor)\b[^\n]{0,200}?\b(?:shall|must|will|agrees\s+to|"
    r"undertakes\s+to|is\s+responsible\s+for)\b[^\n]{5,200})",
    re.IGNORECASE | re.MULTILINE,
)

_SIGNATURE_EVIDENCE = [
    r"\bin\s+witness\s+whereof\b",
    r"\bsigned\s+by[^\S\n]*[:\-]?[^\S\n]*\S",
    r"\bsignature[^\S\n]*[:\-][^\S\n]*\S",
    r"\b(?:duly\s+)?executed\s+(?:on|as\s+of)\b",
    r"/s/\s*\w",
]

_UNSIGNED_EVIDENCE = [
    r"\bunsigned\b",
    r"\bdraft\b",
    r"\bnot\s+(?:yet\s+)?(?:signed|executed)\b",
    r"\bsignature[^\S\n]*[:\-][^\S\n]*_{3,}",
    r"\bsigned\s+by[^\S\n]*[:\-][^\S\n]*_{3,}",
]


def _parties(text: str, pages: list[dict]) -> list[Field]:
    """Extract named parties from the standard `between X and Y` preamble."""
    parties: list[Field] = []
    preamble = re.search(
        r"\bbetween\b[^\S\n]*(?P<a>[^\n,;]{2,80}?)\s*(?:\([^)]*\))?\s*\band\b"
        r"[^\S\n]*(?P<b>[^\n,;]{2,80})",
        text,
        re.IGNORECASE,
    )
    if preamble:
        for group in ("a", "b"):
            raw = preamble.group(group).strip(" .,")
            if not raw:
                continue
            parties.append(
                Field(
                    value=raw,
                    confidence=0.82,
                    method=RULE_MATCH,
                    page=page_for_offset(pages, preamble.start(group)),
                    section="parties",
                    raw=raw,
                    span=preamble.span(group),
                )
            )
    return parties


def _obligations(text: str, pages: list[dict]) -> list[Field]:
    seen: set[str] = set()
    found: list[Field] = []
    for match in _OBLIGATION.finditer(text):
        clause = " ".join(match.group("text").split())
        key = clause.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(
            Field(
                value=clause,
                confidence=0.72,
                method=RULE_MATCH,
                page=page_for_offset(pages, match.start("text")),
                section="obligations",
                raw=clause,
                span=match.span("text"),
            )
        )
        if len(found) >= 20:  # bound the output; this is not a full clause parser
            break
    return found


def _execution_status(text: str, pages: list[dict]) -> tuple[Field | None, list[str]]:
    """
    Determine execution status from explicit evidence only.

    Returns (status_field, warnings). Unsigned markers win over signature cues,
    because a blank signature block on a template is stronger evidence of
    non-execution than the presence of the word "signature".
    """
    warnings: list[str] = []

    for pattern in _UNSIGNED_EVIDENCE:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            warnings.append(
                "contract_not_executed: unsigned/draft markers present; "
                "execution is not asserted"
            )
            return (
                Field(
                    value="UNSIGNED",
                    confidence=0.8,
                    method=RULE_MATCH,
                    page=page_for_offset(pages, match.start()),
                    section="execution",
                    raw=match.group(0),
                    span=match.span(),
                ),
                warnings,
            )

    for pattern in _SIGNATURE_EVIDENCE:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return (
                Field(
                    value="EXECUTED",
                    confidence=0.78,
                    method=RULE_MATCH,
                    page=page_for_offset(pages, match.start()),
                    section="execution",
                    raw=match.group(0),
                    span=match.span(),
                ),
                warnings,
            )

    warnings.append(
        "contract_execution_unknown: no signature evidence found; "
        "contract is not treated as executed"
    )
    return None, warnings


def extract_contract(text: str, pages: list[dict]) -> ExtractionOutcome:
    out = ExtractionOutcome()

    out.add("contractTitle", find(
        text,
        [r"^[^\S\n]*((?:[A-Z][A-Za-z]*\s+){0,4}(?:SERVICE|MASTER|SUPPLY|LICENCE|LICENSE|"
         r"EMPLOYMENT|CONSULTING|NON[\-\s]?DISCLOSURE)\s+AGREEMENT)[^\S\n]*$",
         r"\b(?:agreement\s+title|title)[^\S\n]*[:\-][^\S\n]*([^\n]{2,80})",
         r"^[^\S\n]*((?:[A-Z][A-Za-z]*\s+){0,4}AGREEMENT)[^\S\n]*$"],
        pages, confidence=0.85, section="header",
    ))
    out.add("contractReference", find(
        text,
        [r"\b(?:contract|agreement)\s*(?:no\.?|number|ref(?:erence)?|#)"
         r"[^\S\n]*[:\-]?[^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})"],
        pages, confidence=0.88, section="header",
    ))

    parties = _parties(text, pages)
    for index, party in enumerate(parties):
        out.fields[f"party{index + 1}Name"] = party
    if len(parties) < 2:
        out.warnings.append("contract_parties_incomplete: fewer than two parties identified")

    out.add("effectiveDate", find(
        text,
        [r"\b(?:effective\s+date|commencement\s+date|start\s+date|effective\s+(?:as\s+)?(?:on|from))"
         r"[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
        pages, confidence=0.88, section="term", transform=normalise_date,
    ))
    out.add("expirationDate", find(
        text,
        [r"\b(?:expiration\s+date|expiry\s+date|termination\s+date|end\s+date|expires\s+on)"
         r"[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
        pages, confidence=0.85, section="term", transform=normalise_date,
    ))

    out.add("contractValue", find(
        text,
        [rf"\b(?:contract\s+value|total\s+value|total\s+consideration|fees?\s+of|value)\b"
         rf"[^\S\n]*[:\-]?[^\S\n]*{_MONEY}"],
        pages, confidence=0.82, section="commercial", group=3, transform=parse_amount,
    ))
    out.add("currency", find(
        text,
        [r"\bcurrency[^\S\n]*[:\-]?[^\S\n]*([A-Z]{3})\b",
         r"\b(?:contract\s+value|total\s+value|value)\b[^\n]*?\b([A-Z]{3})\b",
         r"\b(?:contract\s+value|total\s+value|value)\b[^\n]*?([R$€£¥])"],
        pages, confidence=0.78, section="commercial", transform=normalise_currency,
    ))
    out.add("paymentTerms", find(
        text,
        [r"\b(?:payment\s+terms|payable\s+within)[^\S\n]*[:\-]?[^\S\n]*([^\n]{2,80})"],
        pages, confidence=0.78, section="commercial",
    ))

    obligations = _obligations(text, pages)
    for index, obligation in enumerate(obligations):
        out.fields[f"obligation{index + 1}"] = obligation
    if not obligations:
        out.warnings.append("no_obligations_parsed")

    status, status_warnings = _execution_status(text, pages)
    out.warnings.extend(status_warnings)
    if status is not None:
        out.fields["executionStatus"] = status
    else:
        out.missing.append("executionStatus")

    # A signing date is only meaningful once execution is evidenced. Extracting
    # it for an unsigned draft would hand downstream code a date it could
    # mistake for proof the agreement is in force.
    if status is not None and status.value == "EXECUTED":
        signed = find(
            text,
            [r"\b(?:executed\s+(?:on|as\s+of)|signed\s+on|dated)"
             r"[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})",
             r"\bsignature\s+date[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
            pages, confidence=0.85, section="execution", transform=normalise_date,
        )
        if signed is not None:
            out.fields["signedDate"] = signed
        else:
            out.warnings.append(
                "contract_signed_date_absent: execution evidenced but no date stated"
            )

    return out
