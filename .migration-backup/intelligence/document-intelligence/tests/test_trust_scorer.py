"""
Unit tests for integrity.trust_scorer.

Covers each score component, the verdict thresholds, the hard caps (validation
issues, high drift, missing OCR/drift data) and how they combine in score().

Tests named *_characterization pin current behaviour that looks unintended.
They are documented in the PR so a future change to it is a conscious decision.
"""
import pytest

from integrity.trust_scorer import (
    MISSING_DATA_SCORE,
    THRESHOLDS,
    WEIGHTS,
    _classify,
    _score_drift,
    _score_extraction,
    _score_ocr,
    _score_validation,
    score,
)


def _ocr(conf=100):
    return {"pages": [{"page": 1, "ocr_confidence": conf}]}


def _run(**overrides):
    """score() with every component perfect, unless overridden."""
    data = {
        "ocr_data": _ocr(),
        "extraction_data": {"completeness_score": 1.0},
        "validation_data": {"integrity_score": 1.0},
        "drift_data": {"drift_detected": False, "overall_similarity": 1.0},
    }
    data.update(overrides)
    return score("DOC-1", **data)


# ---- constants ------------------------------------------------------------

def test_weights_sum_to_one():
    assert sum(WEIGHTS.values()) == pytest.approx(1.0)


def test_thresholds_are_descending_and_end_at_zero():
    values = [t[0] for t in THRESHOLDS]
    assert values == sorted(values, reverse=True)
    assert values[-1] == 0.0


# ---- _score_ocr -----------------------------------------------------------

@pytest.mark.parametrize("ocr", [None, {}])
def test_ocr_absent(ocr):
    value, factors = _score_ocr(ocr)
    assert value == MISSING_DATA_SCORE
    assert factors[0].startswith("ocr_data_absent")


@pytest.mark.parametrize(
    "ocr",
    [
        {"pages": []},
        {"pages": [{"page": 1}]},
        {"pages": [{"ocr_confidence": None}]},
        {"other": 1},
    ],
)
def test_ocr_confidence_unavailable(ocr):
    value, factors = _score_ocr(ocr)
    assert value == MISSING_DATA_SCORE
    assert factors[0].startswith("ocr_confidence_unavailable")


def test_ocr_averages_pages_and_skips_missing_confidence():
    ocr = {"pages": [{"ocr_confidence": 80}, {"ocr_confidence": None}, {"ocr_confidence": 60}, {"page": 4}]}
    value, factors = _score_ocr(ocr)
    assert value == pytest.approx(0.7)
    assert factors == ["ocr_moderate_confidence: avg 70.0%"]


@pytest.mark.parametrize(
    "conf, factor_prefix",
    [
        (49.9, "ocr_low_confidence"),
        (50, "ocr_moderate_confidence"),
        (74.9, "ocr_moderate_confidence"),
        (75, None),
        (100, None),
    ],
)
def test_ocr_confidence_boundaries(conf, factor_prefix):
    value, factors = _score_ocr(_ocr(conf))
    assert value == pytest.approx(conf / 100)
    if factor_prefix is None:
        assert factors == []
    else:
        assert factors[0].startswith(factor_prefix)


def test_ocr_zero_confidence_is_a_real_value_not_missing():
    value, factors = _score_ocr(_ocr(0))
    assert value == 0.0
    assert factors == ["ocr_low_confidence: avg 0.0%"]


def test_ocr_fractional_scale_is_treated_as_near_zero_characterization():
    # The scorer assumes 0-100. A 0-1 confidence (0.95) is read as 0.95% and
    # scored ~0.0095, and there is no range validation.
    value, factors = _score_ocr(_ocr(0.95))
    assert value == pytest.approx(0.0095)
    assert factors[0].startswith("ocr_low_confidence")


# ---- _score_extraction ----------------------------------------------------

@pytest.mark.parametrize("ext", [None, {}])
def test_extraction_absent(ext):
    value, factors = _score_extraction(ext)
    assert value == MISSING_DATA_SCORE
    assert factors[0].startswith("extraction_data_absent")


def test_extraction_uses_completeness_score():
    assert _score_extraction({"completeness_score": 0.8}) == (0.8, [])


def test_extraction_defaults_completeness_to_half():
    assert _score_extraction({"missing_fields": []}) == (0.5, [])


def test_extraction_critical_missing_lowers_score_per_field():
    value, factors = _score_extraction({"completeness_score": 0.9, "critical_missing": ["total", "vendor"]})
    assert value == pytest.approx(0.6)  # 0.9 - 2 * 0.15
    assert factors == ["extraction_critical_fields_missing: ['total', 'vendor']"]


def test_extraction_critical_penalty_floors_at_zero():
    value, _ = _score_extraction({"completeness_score": 0.2, "critical_missing": ["a", "b", "c"]})
    assert value == 0.0


def test_extraction_non_critical_missing_only_adds_factor():
    value, factors = _score_extraction({"completeness_score": 0.8, "missing_fields": ["dueDate"]})
    assert value == 0.8
    assert factors == ["extraction_fields_missing: ['dueDate']"]


def test_extraction_critical_takes_precedence_over_missing_fields():
    _, factors = _score_extraction(
        {"completeness_score": 0.9, "critical_missing": ["total"], "missing_fields": ["dueDate"]}
    )
    assert len(factors) == 1
    assert factors[0].startswith("extraction_critical_fields_missing")


# ---- _score_validation ----------------------------------------------------

@pytest.mark.parametrize("val", [None, {}])
def test_validation_absent(val):
    value, factors = _score_validation(val)
    assert value == MISSING_DATA_SCORE
    assert factors[0].startswith("validation_data_absent")


def test_validation_defaults_integrity_score_when_key_missing():
    assert _score_validation({"issues": [], "warnings": []}) == (MISSING_DATA_SCORE, [])


def test_validation_issue_caps_component_at_040():
    val = {"integrity_score": 0.9, "issues": [{"rule": "R1", "message": "total mismatch"}]}
    value, factors = _score_validation(val)
    assert value == 0.4
    assert factors[0].startswith("validation_critical: R1")
    assert "total mismatch" in factors[0]


def test_validation_issue_does_not_raise_a_lower_score():
    value, _ = _score_validation({"integrity_score": 0.2, "issues": [{"rule": "R1"}]})
    assert value == 0.2


def test_validation_warning_adds_factor_without_cap():
    value, factors = _score_validation({"integrity_score": 0.8, "warnings": [{"rule": "W1"}]})
    assert value == 0.8
    assert factors == ["validation_warning: W1"]


# ---- _score_drift ---------------------------------------------------------

@pytest.mark.parametrize("drift", [None, {}])
def test_drift_absent(drift):
    value, factors = _score_drift(drift)
    assert value == MISSING_DATA_SCORE
    assert factors[0].startswith("drift_data_absent")


@pytest.mark.parametrize(
    "similarity, expected",
    [(0.0, 0.7), (1.0, 1.0), (None, 0.94)],  # None -> default similarity 0.8
)
def test_drift_not_detected_scales_with_similarity(similarity, expected):
    drift = {"drift_detected": False}
    if similarity is not None:
        drift["overall_similarity"] = similarity
    value, factors = _score_drift(drift)
    assert value == pytest.approx(expected)
    assert factors == []


@pytest.mark.parametrize(
    "severity, similarity, expected",
    [
        ("high", 0.2, 0.06),         # 0.0 * 0.7 + 0.2 * 0.3
        ("medium", 0.5, 0.43),       # 0.4 * 0.7 + 0.5 * 0.3
        ("low", 0.9, 0.795),         # 0.75 * 0.7 + 0.9 * 0.3
        ("none", 1.0, 1.0),          # 1.0 * 0.7 + 1.0 * 0.3
        ("unrecognised", 0.5, 0.5),  # unknown severity falls back to 0.5
    ],
)
def test_drift_detected_uses_severity_penalty(severity, similarity, expected):
    drift = {"drift_detected": True, "severity": severity, "overall_similarity": similarity}
    value, _ = _score_drift(drift)
    assert value == pytest.approx(expected)


def test_drift_detected_defaults_to_medium_severity_and_half_similarity():
    value, _ = _score_drift({"drift_detected": True})
    assert value == pytest.approx(0.43)


def test_drift_signals_become_risk_factors():
    drift = {
        "drift_detected": True,
        "severity": "high",
        "drift_signals": [
            {"detector": "numeric", "severity": "high", "message": "total changed"},
            {"detector": "entity", "message": "vendor changed"},
        ],
    }
    _, factors = _score_drift(drift)
    assert factors == [
        "drift_numeric: [HIGH] total changed",
        "drift_entity: [?] vendor changed",
    ]


def test_drift_signals_ignored_when_drift_not_detected():
    drift = {"drift_detected": False, "drift_signals": [{"detector": "x", "severity": "high"}]}
    assert _score_drift(drift)[1] == []


# ---- _classify (thresholds) -----------------------------------------------

@pytest.mark.parametrize(
    "value, level, verdict",
    [
        (1.0, "trusted", "APPROVED"),
        (0.85, "trusted", "APPROVED"),
        (0.8499, "low", "APPROVED"),
        (0.70, "low", "APPROVED"),
        (0.6999, "medium", "REVIEW"),
        (0.45, "medium", "REVIEW"),
        (0.4499, "high", "BLOCKED"),
        (0.25, "high", "BLOCKED"),
        (0.2499, "critical", "BLOCKED"),
        (0.0, "critical", "BLOCKED"),
    ],
)
def test_classify_threshold_boundaries(value, level, verdict):
    got_level, got_verdict, recommendation = _classify(value)
    assert (got_level, got_verdict) == (level, verdict)
    assert recommendation


def test_classify_negative_score_falls_through_to_critical():
    level, verdict, recommendation = _classify(-0.1)
    assert (level, verdict) == ("critical", "BLOCKED")
    assert "severely compromised" in recommendation


# ---- score(): overall behaviour -------------------------------------------

def test_all_clean_components_are_trusted():
    out = _run()
    assert out["document_id"] == "DOC-1"
    assert out["trust_score"] == 1.0
    assert out["risk_level"] == "trusted"
    assert out["verdict"] == "APPROVED"
    assert out["risk_factors"] == []
    assert out["weights"] == WEIGHTS
    assert out["components_available"] == ["ocr", "extraction", "validation", "drift"]
    assert out["score_breakdown"] == {
        "ocr": 1.0, "extraction": 1.0, "validation": 1.0, "drift": 1.0, "weighted_total": 1.0,
    }


def test_no_data_at_all_is_review_not_approved():
    out = score("DOC-2")
    assert out["trust_score"] == 0.45
    assert out["verdict"] == "REVIEW"
    assert out["components_available"] == []
    assert len(out["risk_factors"]) == 4


def test_components_are_weighted():
    out = _run(
        ocr_data=_ocr(80),                                   # 0.8
        extraction_data={"completeness_score": 0.6},
        validation_data={"integrity_score": 0.9},
        drift_data={"drift_detected": False, "overall_similarity": 1.0},
    )
    expected = 0.15 * 0.8 + 0.20 * 0.6 + 0.35 * 0.9 + 0.30 * 1.0
    assert out["trust_score"] == pytest.approx(expected, abs=1e-4)


def test_risk_factors_are_ordered_ocr_extraction_validation_drift():
    out = _run(
        ocr_data=_ocr(40),
        extraction_data={"completeness_score": 0.9, "missing_fields": ["dueDate"]},
        validation_data={"integrity_score": 0.9, "warnings": [{"rule": "W1"}]},
        drift_data={
            "drift_detected": True, "severity": "low", "overall_similarity": 0.9,
            "drift_signals": [{"detector": "numeric", "severity": "low", "message": "m"}],
        },
    )
    prefixes = [f.split(":")[0] for f in out["risk_factors"]]
    assert prefixes == [
        "ocr_low_confidence", "extraction_fields_missing", "validation_warning", "drift_numeric",
    ]


def test_score_is_clamped_to_zero_and_one():
    high = _run(ocr_data=_ocr(200))  # component 2.0 -> raw 1.15
    assert high["trust_score"] == 1.0

    low = score(
        "DOC-3",
        ocr_data=_ocr(0),
        extraction_data={"completeness_score": 0.0},
        validation_data={"integrity_score": -5},
        drift_data={"drift_detected": True, "severity": "high", "overall_similarity": 0.0},
    )
    assert low["trust_score"] == 0.0
    assert (low["risk_level"], low["verdict"]) == ("critical", "BLOCKED")


def test_high_risk_level_end_to_end():
    out = score(
        "DOC-4",
        ocr_data=_ocr(60),
        extraction_data={"completeness_score": 0.5},
        validation_data={"integrity_score": 0.4, "issues": [{"rule": "R1", "message": "m"}]},
        drift_data={"drift_detected": True, "severity": "high", "overall_similarity": 0.5},
    )
    assert out["trust_score"] == pytest.approx(0.375)
    assert (out["risk_level"], out["verdict"]) == ("high", "BLOCKED")


def test_weighted_total_reports_capped_score_not_raw_characterization():
    # "weighted_total" equals the capped trust_score, so the breakdown
    # components do not add up to it when a hard cap applied.
    out = _run(validation_data={"integrity_score": 1.0, "issues": [{"rule": "R1"}]})
    b = out["score_breakdown"]
    raw = sum(WEIGHTS[k] * b[k] for k in WEIGHTS)
    assert b["weighted_total"] == out["trust_score"] == 0.64
    assert raw > b["weighted_total"]


# ---- score(): hard caps ---------------------------------------------------

def test_validation_issue_caps_trust_at_064():
    out = _run(validation_data={"integrity_score": 1.0, "issues": [{"rule": "R1", "message": "m"}]})
    assert out["trust_score"] == 0.64  # raw 0.79 without the cap
    assert out["verdict"] == "REVIEW"
    assert out["risk_factors"][0].startswith("validation_critical")


def test_high_drift_caps_trust_at_064():
    drift = {"drift_detected": True, "severity": "high", "overall_similarity": 1.0}
    out = _run(drift_data=drift)
    assert out["trust_score"] == 0.64  # raw 0.79 without the cap
    assert out["verdict"] == "REVIEW"


def test_medium_drift_is_not_hard_capped():
    drift = {"drift_detected": True, "severity": "medium", "overall_similarity": 1.0}
    out = _run(drift_data=drift)
    assert out["trust_score"] == pytest.approx(0.874)
    assert out["verdict"] == "APPROVED"


def test_high_severity_cap_applies_even_if_drift_not_detected_characterization():
    # _score_drift ignores severity when drift_detected is False (component 1.0),
    # but the hard cap only checks severity == "high". The two disagree.
    drift = {"drift_detected": False, "severity": "high", "overall_similarity": 1.0}
    out = _run(drift_data=drift)
    assert out["score_breakdown"]["drift"] == 1.0
    assert out["trust_score"] == 0.64


def test_caps_never_raise_a_lower_score():
    out = _run(
        ocr_data=None,
        validation_data={"integrity_score": 0.2, "issues": [{"rule": "R1"}]},
    )
    assert out["trust_score"] < 0.64


def test_validation_cap_wins_over_higher_missing_data_cap():
    out = _run(ocr_data=None, validation_data={"integrity_score": 1.0, "issues": [{"rule": "R1"}]})
    assert out["trust_score"] == 0.64  # min(raw, 0.64, 0.69)


# ---- score(): missing-data cap (Fix 6) ------------------------------------

def test_missing_ocr_caps_at_review():
    out = _run(ocr_data=None)
    assert out["trust_score"] == 0.69  # raw 0.9175 without the cap
    assert (out["risk_level"], out["verdict"]) == ("medium", "REVIEW")
    assert "ocr" not in out["components_available"]


def test_missing_drift_caps_at_review():
    out = _run(drift_data=None)
    assert out["trust_score"] == 0.69  # raw 0.835 without the cap
    assert out["verdict"] == "REVIEW"


def test_missing_ocr_and_drift_caps_at_review():
    out = _run(ocr_data=None, drift_data=None)
    assert out["trust_score"] == 0.69
    assert out["verdict"] == "REVIEW"


@pytest.mark.parametrize(
    "missing, expected_trust, expected_level",
    [
        ({"extraction_data": None}, 0.89, "trusted"),
        ({"validation_data": None}, 0.8075, "low"),
    ],
)
def test_missing_extraction_or_validation_can_still_be_approved_characterization(
    missing, expected_trust, expected_level
):
    # The Fix 6 cap only looks at OCR and drift, so a document with no
    # validation (or no extraction) data at all can still be APPROVED.
    out = _run(**missing)
    assert out["trust_score"] == pytest.approx(expected_trust)
    assert out["risk_level"] == expected_level
    assert out["verdict"] == "APPROVED"


@pytest.mark.parametrize(
    "empty, expected_trust",
    [
        ({"ocr_data": {}}, 0.9175),
        ({"ocr_data": {"pages": [{"page": 1}]}}, 0.9175),
        ({"drift_data": {}}, 0.835),
    ],
)
def test_empty_or_confidence_less_data_bypasses_missing_data_cap_characterization(
    empty, expected_trust
):
    # The component treats these inputs as "absent" (0.45) but the cap checks
    # `is None`, so they are never capped and can be APPROVED, despite the
    # "weak evidence routes to REVIEW, never straight to APPROVED" intent.
    out = _run(**empty)
    assert out["trust_score"] == pytest.approx(expected_trust)
    assert out["verdict"] == "APPROVED"
