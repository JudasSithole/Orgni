"""
Orgni Document Intelligence — Document Classifier.

Classifies a document as INVOICE, PROOF_OF_PAYMENT, CONTRACT or UNKNOWN using
weighted keyword/pattern evidence. Deliberately conservative: when no type
scores above the threshold, the result is UNKNOWN with a warning rather than a
guess. Downstream stages must never receive an invented classification.
"""
from __future__ import annotations

import re
from typing import Any, Literal

DocumentType = Literal["INVOICE", "PROOF_OF_PAYMENT", "CONTRACT", "UNKNOWN"]

# Minimum weighted score before we are willing to name a type at all.
MIN_SCORE = 3.0
# A type must beat the runner-up by this much, otherwise the document is
# ambiguous and we report UNKNOWN rather than pick arbitrarily.
MIN_MARGIN = 1.5

# (compiled pattern, weight). Strong signals are phrases that rarely appear
# outside their document type; weak signals are supporting vocabulary.
_SIGNALS: dict[str, list[tuple[str, float]]] = {
    "INVOICE": [
        (r"\btax\s+invoice\b", 4.0),
        (r"\binvoice\s*(?:no|number|#)\b", 3.5),
        (r"\binvoice\b", 2.0),
        (r"\bbill\s+to\b", 1.5),
        (r"\bamount\s+due\b", 1.5),
        (r"\bdue\s+date\b", 1.0),
        (r"\bsubtotal\b", 1.0),
        (r"\bpurchase\s+order\b", 1.0),
        (r"\bvat\b|\bsales\s+tax\b", 0.5),
    ],
    "PROOF_OF_PAYMENT": [
        (r"\bproof\s+of\s+payment\b", 5.0),
        (r"\bpayment\s+confirmation\b", 4.0),
        (r"\bremittance\s+advice\b", 4.0),
        (r"\bpayment\s+receipt\b", 3.5),
        (r"\btransaction\s+(?:ref|reference|id)\b", 2.5),
        (r"\bpayment\s+reference\b", 2.5),
        (r"\bpaid\s+(?:on|to)\b", 1.5),
        (r"\beft\b|\bwire\s+transfer\b", 1.5),
        (r"\bamount\s+paid\b", 1.5),
    ],
    "CONTRACT": [
        (r"\bthis\s+agreement\b", 4.0),
        (r"\bservice\s+agreement\b|\bmaster\s+agreement\b", 4.0),
        (r"\bterms\s+and\s+conditions\b", 2.5),
        (r"\bbetween\b.{0,80}\band\b.{0,80}\bparty\b", 2.5),
        (r"\bhereby\s+agree\b|\bshall\s+be\s+bound\b", 2.5),
        (r"\beffective\s+date\b", 2.0),
        (r"\btermination\b", 1.5),
        (r"\bobligations?\b", 1.5),
        (r"\bin\s+witness\s+whereof\b", 2.0),
        (r"\bsigned\s+by\b|\bsignature\b", 1.0),
    ],
}

_COMPILED: dict[str, list[tuple[re.Pattern[str], float]]] = {
    doc_type: [(re.compile(p, re.IGNORECASE), w) for p, w in signals]
    for doc_type, signals in _SIGNALS.items()
}


def _score(text: str) -> dict[str, dict[str, Any]]:
    """Score each candidate type, keeping the matches that produced the score."""
    results: dict[str, dict[str, Any]] = {}
    for doc_type, patterns in _COMPILED.items():
        total = 0.0
        matches: list[dict[str, Any]] = []
        for pattern, weight in patterns:
            found = pattern.search(text)
            if found:
                total += weight
                matches.append(
                    {
                        "pattern": pattern.pattern,
                        "weight": weight,
                        "span": [found.start(), found.end()],
                        "excerpt": text[found.start() : found.end()][:120],
                    }
                )
        results[doc_type] = {"score": round(total, 2), "matches": matches}
    return results


def classify(text: str) -> dict[str, Any]:
    """
    Classify document text.

    Returns a dict with:
      document_type: INVOICE | PROOF_OF_PAYMENT | CONTRACT | UNKNOWN
      confidence:    0.0-1.0
      scores:        per-type weighted scores (audit trail)
      evidence:      matches supporting the chosen type
      warnings:      why a decision was withheld, when applicable
    """
    warnings: list[str] = []

    if not text or not text.strip():
        return {
            "document_type": "UNKNOWN",
            "confidence": 0.0,
            "scores": {},
            "evidence": [],
            "warnings": ["empty_document_text"],
        }

    scored = _score(text)
    ranked = sorted(scored.items(), key=lambda kv: kv[1]["score"], reverse=True)
    best_type, best = ranked[0]
    runner_up = ranked[1][1]["score"] if len(ranked) > 1 else 0.0

    if best["score"] < MIN_SCORE:
        warnings.append(
            f"classification_below_threshold: best={best_type} "
            f"score={best['score']} min={MIN_SCORE}"
        )
        return {
            "document_type": "UNKNOWN",
            "confidence": 0.0,
            "scores": {k: v["score"] for k, v in scored.items()},
            "evidence": [],
            "warnings": warnings,
        }

    margin = best["score"] - runner_up
    if margin < MIN_MARGIN:
        warnings.append(
            f"classification_ambiguous: {best_type}={best['score']} "
            f"runner_up={runner_up} margin={round(margin, 2)}"
        )
        return {
            "document_type": "UNKNOWN",
            "confidence": 0.0,
            "scores": {k: v["score"] for k, v in scored.items()},
            "evidence": [],
            "warnings": warnings,
        }

    # Confidence grows with score and margin but is capped below 1.0: pattern
    # matching is evidence, never certainty.
    confidence = min(0.95, 0.5 + (best["score"] / 20.0) + (margin / 20.0))

    return {
        "document_type": best_type,
        "confidence": round(confidence, 3),
        "scores": {k: v["score"] for k, v in scored.items()},
        "evidence": best["matches"],
        "warnings": warnings,
    }
