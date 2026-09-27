"""
Unit tests for classification.classifier.

Covers per-type classification, the MIN_SCORE threshold, the MIN_MARGIN
ambiguity rule, the confidence formula and the evidence/audit output.

Tests named *_characterization pin current behaviour that looks unintended.
They are documented in the PR so a future change to it is a conscious decision.
"""
import pytest

from classification.classifier import MIN_MARGIN, MIN_SCORE, classify

TYPES = {"INVOICE", "PROOF_OF_PAYMENT", "CONTRACT"}

INVOICE_TEXT = (
    "TAX INVOICE\n"
    "Invoice No: INV-2024-0081\n"
    "Bill To: XYZ Manufacturing CC\n"
    "Amount Due: R100.00\n"
    "Due Date: 15/04/2024\n"
)  # 4.0 + 3.5 + 2.0 + 1.5 + 1.5 + 1.0 = 13.5

POP_TEXT = (
    "PROOF OF PAYMENT\n"
    "Payment Reference: TXN-5566\n"
    "Paid To: Seller Ltd\n"
    "Amount Paid: R100.00\n"
    "Payment Method: EFT\n"
)

CONTRACT_TEXT = (
    "SERVICE AGREEMENT\n"
    "This agreement is made between Acme and Beta, each a party.\n"
    "Terms and Conditions apply. Effective Date: 01/01/2024.\n"
    "Signed by both parties.\n"
)


# ---- normal cases ---------------------------------------------------------

@pytest.mark.parametrize(
    "text, expected",
    [
        (INVOICE_TEXT, "INVOICE"),
        (POP_TEXT, "PROOF_OF_PAYMENT"),
        (CONTRACT_TEXT, "CONTRACT"),
    ],
)
def test_clear_document_is_classified(text, expected):
    out = classify(text)
    assert out["document_type"] == expected
    assert out["confidence"] > 0.5
    assert out["warnings"] == []
    assert out["evidence"]
    assert set(out["scores"]) == TYPES
    assert out["scores"][expected] >= MIN_SCORE


def test_score_is_sum_of_matched_weights():
    out = classify(INVOICE_TEXT)
    assert out["scores"] == {"INVOICE": 13.5, "PROOF_OF_PAYMENT": 0.0, "CONTRACT": 0.0}


def test_matching_is_case_insensitive():
    expected = classify(INVOICE_TEXT)["scores"]
    assert classify(INVOICE_TEXT.lower())["scores"] == expected
    assert classify(INVOICE_TEXT.upper())["scores"] == expected


def test_repeated_keyword_is_counted_once():
    # Each pattern uses search(), so spamming a keyword cannot inflate the score.
    out = classify("invoice " * 20)
    assert out["scores"]["INVOICE"] == 2.0
    assert out["document_type"] == "UNKNOWN"


# ---- empty input ----------------------------------------------------------

@pytest.mark.parametrize("text", ["", "   \n\t  ", None])
def test_empty_text_is_unknown(text):
    out = classify(text)
    assert out == {
        "document_type": "UNKNOWN",
        "confidence": 0.0,
        "scores": {},
        "evidence": [],
        "warnings": ["empty_document_text"],
    }


# ---- MIN_SCORE threshold --------------------------------------------------

def test_score_exactly_at_min_score_is_accepted():
    out = classify("Bill To: XYZ\nAmount Due: R100.00")  # 1.5 + 1.5
    assert out["scores"]["INVOICE"] == MIN_SCORE
    assert out["document_type"] == "INVOICE"
    assert out["confidence"] == 0.8  # 0.5 + 3/20 + 3/20


def test_score_just_below_min_score_is_unknown():
    out = classify("Bill To: XYZ\nDue Date: 15/04/2024")  # 1.5 + 1.0 = 2.5
    assert out["scores"]["INVOICE"] == 2.5
    assert out["document_type"] == "UNKNOWN"
    assert out["confidence"] == 0.0
    assert out["evidence"] == []
    assert out["warnings"][0].startswith("classification_below_threshold")


def test_text_without_signals_is_unknown():
    out = classify("The quick brown fox jumps over the lazy dog.")
    assert out["document_type"] == "UNKNOWN"
    assert out["scores"] == {"INVOICE": 0.0, "PROOF_OF_PAYMENT": 0.0, "CONTRACT": 0.0}
    assert out["warnings"][0].startswith("classification_below_threshold")


def test_no_signal_warning_names_invoice_characterization():
    # With all scores at 0.0 the sort is stable, so INVOICE is reported as
    # "best" even though nothing matched. Misleading in the audit trail.
    out = classify("The quick brown fox jumps over the lazy dog.")
    assert "best=INVOICE score=0.0" in out["warnings"][0]


# ---- MIN_MARGIN / near-tie ------------------------------------------------

def test_margin_exactly_at_min_margin_is_accepted():
    # INVOICE 4.0 + 2.0 = 6.0, PROOF_OF_PAYMENT 1.5 * 3 = 4.5 -> margin 1.5
    text = "TAX INVOICE\nPaid on 01/04/2024 by EFT\nAmount paid: R10.00"
    out = classify(text)
    assert out["scores"]["INVOICE"] - out["scores"]["PROOF_OF_PAYMENT"] == MIN_MARGIN
    assert out["document_type"] == "INVOICE"
    assert out["confidence"] == 0.875  # 0.5 + 6/20 + 1.5/20


def test_margin_just_below_min_margin_is_ambiguous():
    # INVOICE 6.0 vs PROOF_OF_PAYMENT 5.0 -> margin 1.0
    out = classify("TAX INVOICE\nPROOF OF PAYMENT")
    assert out["scores"]["INVOICE"] == 6.0
    assert out["scores"]["PROOF_OF_PAYMENT"] == 5.0
    assert out["document_type"] == "UNKNOWN"
    assert out["confidence"] == 0.0
    assert out["evidence"] == []
    assert out["warnings"][0].startswith("classification_ambiguous")


def test_exact_tie_is_ambiguous():
    # Both types score 4.0, each above MIN_SCORE, margin 0.
    out = classify("Payment confirmation.\nThis agreement.")
    assert out["scores"]["PROOF_OF_PAYMENT"] == 4.0
    assert out["scores"]["CONTRACT"] == 4.0
    assert out["document_type"] == "UNKNOWN"
    assert "margin=0.0" in out["warnings"][0]


def test_unknown_result_keeps_scores_for_audit():
    out = classify("Payment confirmation.\nThis agreement.")
    assert set(out["scores"]) == TYPES


# ---- confidence -----------------------------------------------------------

def test_confidence_is_capped_at_095():
    out = classify(INVOICE_TEXT)  # 0.5 + 13.5/20 + 13.5/20 = 1.85 before cap
    assert out["confidence"] == 0.95


# ---- evidence -------------------------------------------------------------

def test_evidence_only_contains_chosen_type_and_matches_text():
    out = classify(INVOICE_TEXT)
    assert len(out["evidence"]) == 6
    for item in out["evidence"]:
        start, end = item["span"]
        assert item["excerpt"] == INVOICE_TEXT[start:end]
        assert item["weight"] > 0


def test_evidence_excerpt_is_truncated_to_120_chars():
    # The "between ... and ... party" pattern can match well over 120 characters.
    text = "This agreement. between " + "x" * 70 + " and " + "y" * 70 + " party"
    out = classify(text)
    assert out["document_type"] == "CONTRACT"
    long_match = next(e for e in out["evidence"] if "between" in e["pattern"])
    assert long_match["span"][1] - long_match["span"][0] > 120
    assert len(long_match["excerpt"]) == 120


# ---- pattern edge cases ---------------------------------------------------

def test_invoice_hash_number_matches_without_space():
    out = classify("Invoice #123")
    assert out["scores"]["INVOICE"] == 5.5  # 3.5 + 2.0


def test_invoice_hash_with_space_is_missed_characterization():
    # "\binvoice\s*(?:no|number|#)\b" needs a word character after "#", so the
    # common header "Invoice # 123" only earns the weak 2.0 "invoice" signal.
    out = classify("Invoice # 123")
    assert out["scores"]["INVOICE"] == 2.0
    assert out["document_type"] == "UNKNOWN"
