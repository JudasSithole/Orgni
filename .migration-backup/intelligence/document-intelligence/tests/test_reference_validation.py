"""
Regression tests for reference/identifier validation (§5 confirmed defect).

The confirmed bug produced `"invoiceRef": "erence"` — a fragment of the label
"Reference" leaking in as an invoice reference. These tests lock in both the
pattern fix and the `clean_reference` validator so a label fragment, placeholder,
or non-identifier can never become organisational context.
"""
from fields.base import clean_reference
from fields.proof_of_payment import extract_proof_of_payment
from fields.invoice import extract_invoice


def _pages(text: str) -> list[dict]:
    return [{"page": 1, "text": text, "start": 0, "end": len(text)}]


def test_clean_reference_rejects_junk_keeps_real_ids():
    # The exact confirmed defect:
    assert clean_reference("erence") is None
    # Other junk:
    assert clean_reference("reference") is None
    assert clean_reference("N/A") is None
    assert clean_reference("TBD") is None
    assert clean_reference("-") is None
    assert clean_reference("Invoice") is None
    assert clean_reference("ABCDEF") is None  # no digit → not an identifier
    # Real identifiers survive:
    assert clean_reference("INV-2024-0081") == "INV-2024-0081"
    assert clean_reference("TXN-99887766") == "TXN-99887766"
    assert clean_reference(" PO12345 ") == "PO12345"


def test_pop_invoice_reference_is_not_the_erence_fragment():
    """'Invoice Reference: INV-1' must capture INV-1, never 'erence'."""
    text = (
        "PROOF OF PAYMENT\n"
        "Payment Reference: TXN-5566\n"
        "Payment Date: 18/04/2024\n"
        "Paid By: Buyer CC\n"
        "Paid To: Seller Ltd\n"
        "Amount: R100.00\n"
        "Payment Method: EFT\n"
        "Invoice Reference: INV-2024-0081\n"
    )
    out = extract_proof_of_payment(text, _pages(text))
    ref = out.fields.get("referencedInvoiceNumber")
    assert ref is not None
    assert ref.value == "INV-2024-0081"
    assert ref.value != "erence"


def test_invoice_number_rejects_fragment_but_keeps_real():
    text = (
        "TAX INVOICE\n"
        "Vendor: ABC Logistics (Pty) Ltd\n"
        "Bill To: XYZ Manufacturing CC\n"
        "Invoice No: INV-2024-0081\n"
        "Invoice Date: 15/03/2024\n"
        "Currency: ZAR\n"
        "Total Due: R100.00\n"
    )
    out = extract_invoice(text, _pages(text))
    assert out.fields["invoiceNumber"].value == "INV-2024-0081"
