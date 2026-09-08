"""
Regression tests for value validation (Phase 1 item 2).

Covers date and monetary validation and the rejection reason routed to Data
Quality (the document warnings) when a labelled value fails validation.
"""
from fields.base import normalise_date, parse_amount
from fields.invoice import extract_invoice


def _pages(text: str) -> list[dict]:
    return [{"page": 1, "text": text, "start": 0, "end": len(text)}]


def test_normalise_date_rejects_impossible_and_implausible():
    assert normalise_date("15/03/2024") == "2024-03-15"
    assert normalise_date("2024-03-15") == "2024-03-15"
    # Impossible calendar dates:
    assert normalise_date("45/13/2024") is None
    assert normalise_date("2024-13-45") is None
    # Implausible years (OCR noise / out of window):
    assert normalise_date("01/01/1850") is None
    assert normalise_date("01/01/2200") is None


def test_parse_amount_rejects_malformed_and_impossible():
    assert parse_amount("R15,000.00") == 15000.0
    assert parse_amount("1,956.52") == 1956.52
    assert parse_amount("abc") is None
    assert parse_amount("") is None
    assert parse_amount("-") is None
    # Implausible magnitude (mis-joined digits / OCR noise):
    assert parse_amount("99999999999999999") is None


def test_impossible_due_date_is_rejected_and_reported_to_data_quality():
    text = (
        "TAX INVOICE\n"
        "Vendor: ABC Logistics (Pty) Ltd\n"
        "Bill To: XYZ Manufacturing CC\n"
        "Invoice No: INV-2024-0081\n"
        "Invoice Date: 15/03/2024\n"
        "Due Date: 45/13/2024\n"       # impossible
        "Currency: ZAR\n"
        "Total Due: R100.00\n"
    )
    out = extract_invoice(text, _pages(text))
    # The bad due date must NOT become a field...
    assert "dueDate" not in out.fields
    # ...and it must surface in Data Quality with a clear reason.
    assert any("rejected_value: dueDate" in w for w in out.warnings)
    # The valid invoice date is still extracted.
    assert out.fields["invoiceDate"].value == "2024-03-15"
