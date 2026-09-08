"""
Orgni Docs — Integrity Module: Trust Scoring
Aggregates OCR, extraction, validation and drift signals into a trust score.

Fix 5/6 — stricter scoring: missing OCR confidence or missing drift data
is now treated as a real risk signal, not near-safe. Weak evidence routes
to REVIEW, never straight to APPROVED.
"""
from __future__ import annotations

WEIGHTS = {"ocr": 0.15, "extraction": 0.20, "validation": 0.35, "drift": 0.30}

THRESHOLDS = [
    (0.85, "trusted",  "APPROVED", "Output approved. All integrity checks passed."),
    (0.70, "low",      "APPROVED", "Output approved. Minor signals detected — monitor."),
    (0.45, "medium",   "REVIEW",   "Output requires human review before use."),
    (0.25, "high",     "BLOCKED",  "Output blocked. Significant integrity failures detected."),
    (0.00, "critical", "BLOCKED",  "Output blocked. Pipeline integrity severely compromised."),
]

DRIFT_PENALTY = {"high": 0.0, "medium": 0.40, "low": 0.75, "none": 1.0}

# Fix 5: missing-data penalty is now meaningfully below "trusted" range
MISSING_DATA_SCORE = 0.45


def _score_ocr(ocr: dict | None) -> tuple[float, list[str]]:
    if not ocr:
        return MISSING_DATA_SCORE, ["ocr_data_absent: treated as unverified, not safe"]
    pages = ocr.get("pages", [])
    confs = [p["ocr_confidence"] for p in pages if p.get("ocr_confidence") is not None]
    if not confs:
        # Fix 5: missing confidence is a real risk signal, not near-safe
        return MISSING_DATA_SCORE, ["ocr_confidence_unavailable: treated as unverified, not safe"]
    avg = sum(confs) / len(confs)
    factors = []
    if avg < 50:
        factors.append(f"ocr_low_confidence: avg {avg:.1f}%")
    elif avg < 75:
        factors.append(f"ocr_moderate_confidence: avg {avg:.1f}%")
    return round(avg / 100.0, 4), factors


def _score_extraction(ext: dict | None) -> tuple[float, list[str]]:
    if not ext:
        return MISSING_DATA_SCORE, ["extraction_data_absent: treated as unverified"]
    score = ext.get("completeness_score", 0.5)
    critical = ext.get("critical_missing", [])
    factors = []
    if critical:
        score = max(0.0, score - len(critical) * 0.15)
        factors.append(f"extraction_critical_fields_missing: {critical}")
    elif ext.get("missing_fields"):
        factors.append(f"extraction_fields_missing: {ext['missing_fields']}")
    return round(score, 4), factors


def _score_validation(val: dict | None) -> tuple[float, list[str]]:
    if not val:
        return MISSING_DATA_SCORE, ["validation_data_absent: treated as unverified"]
    score = float(val.get("integrity_score", MISSING_DATA_SCORE))
    factors = []
    for issue in val.get("issues", []):
        factors.append(f"validation_critical: {issue.get('rule')} — {issue.get('message','')}")
    for w in val.get("warnings", []):
        factors.append(f"validation_warning: {w.get('rule')}")
    if val.get("issues"):
        score = min(score, 0.40)
    return round(score, 4), factors


def _score_drift(drift: dict | None) -> tuple[float, list[str]]:
    if not drift:
        # Fix 5: missing drift data is a real risk signal, not near-safe
        return MISSING_DATA_SCORE, ["drift_data_absent: semantic integrity unverified, treated as risk"]
    if not drift.get("drift_detected"):
        sim = drift.get("overall_similarity", 0.8)
        return round(min(1.0, 0.7 + sim * 0.3), 4), []
    severity = drift.get("severity", "medium")
    sim = drift.get("overall_similarity", 0.5)
    score = round(DRIFT_PENALTY.get(severity, 0.5) * 0.7 + sim * 0.3, 4)
    factors = [
        f"drift_{s.get('detector')}: [{s.get('severity','?').upper()}] {s.get('message','')}"
        for s in drift.get("drift_signals", [])
    ]
    return score, factors


def _classify(score: float) -> tuple[str, str, str]:
    for threshold, level, verdict, rec in THRESHOLDS:
        if score >= threshold:
            return level, verdict, rec
    return "critical", "BLOCKED", "Output blocked. Pipeline integrity severely compromised."


def score(
    document_id: str,
    ocr_data: dict | None = None,
    extraction_data: dict | None = None,
    validation_data: dict | None = None,
    drift_data: dict | None = None,
) -> dict:
    ocr_s, ocr_f     = _score_ocr(ocr_data)
    ext_s, ext_f     = _score_extraction(extraction_data)
    val_s, val_f     = _score_validation(validation_data)
    drift_s, drift_f = _score_drift(drift_data)

    raw = (
        WEIGHTS["ocr"]        * ocr_s +
        WEIGHTS["extraction"] * ext_s +
        WEIGHTS["validation"] * val_s +
        WEIGHTS["drift"]      * drift_s
    )
    trust = round(min(1.0, max(0.0, raw)), 4)

    # Hard caps — critical validation failure or high drift can never be APPROVED
    if validation_data and validation_data.get("issues"):
        trust = min(trust, 0.64)
    if drift_data and drift_data.get("severity") == "high":
        trust = min(trust, 0.64)

    # Fix 6: weak evidence (missing OCR or missing drift data) caps at REVIEW,
    # never APPROVED — even if other components look clean
    missing_data_components = sum([
        ocr_data is None,
        drift_data is None,
    ])
    if missing_data_components > 0:
        trust = min(trust, 0.69)  # just under the 0.70 APPROVED threshold

    risk_level, verdict, recommendation = _classify(trust)

    return {
        "document_id": document_id,
        "trust_score": trust,
        "risk_level": risk_level,
        "verdict": verdict,
        "recommendation": recommendation,
        "score_breakdown": {
            "ocr": ocr_s, "extraction": ext_s,
            "validation": val_s, "drift": drift_s,
            "weighted_total": trust,
        },
        "weights": WEIGHTS,
        "risk_factors": ocr_f + ext_f + val_f + drift_f,
        "components_available": [
            k for k, v in [
                ("ocr", ocr_data), ("extraction", extraction_data),
                ("validation", validation_data), ("drift", drift_data)
            ] if v is not None
        ],
    }
