"""
Regression tests for extraction robustness (Phase 1 production-readiness §4.4).

These lock in two fixes:
  1. Realistic invoice layouts extract WITHOUT reformatting — labelled values on
     the next line, and a letterhead vendor with no explicit label.
  2. `normalise_currency` rejects non-currency 3-letter tokens ("DUE", "TAX", …)
     so the extractor never asserts a false currency.

The fixture is the repository's own `sample_files/sample_invoice.txt`, which
previously FAILED the required-field check and had to be hand-reformatted.
"""
import os

from fields.base import normalise_currency
from fields.invoice import extract_invoice

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_files")


def _pages(text: str) -> list[dict]:
    return [{"page": 1, "text": text, "start": 0, "end": len(text)}]


def test_normalise_currency_rejects_non_currency_tokens():
    assert normalise_currency("DUE") is None
    assert normalise_currency("TAX") is None
    assert normalise_currency("SUB") is None
    assert normalise_currency("ZAR") == "ZAR"
    assert normalise_currency("usd") == "USD"
    assert normalise_currency("R") == "ZAR"
    assert normalise_currency("$") == "USD"


def test_original_sample_invoice_completes_without_reformatting():
    """The repo's own sample invoice must extract all required fields as-is."""
    with open(os.path.join(SAMPLE_DIR, "sample_invoice.txt"), encoding="utf-8") as f:
        text = f.read()
    out = extract_invoice(text, _pages(text))
    fields = {k: v.value for k, v in out.fields.items()}

    for required in ("invoiceNumber", "invoiceDate", "vendorName", "buyerName",
                     "totalAmount", "currency"):
        assert required in out.fields, f"missing required field: {required}"

    # Vendor comes from the letterhead (no explicit label) — and is flagged.
    assert fields["vendorName"] == "ABC Logistics (Pty) Ltd"
    assert any("vendor_name_inferred_from_letterhead" in w for w in out.warnings)
    # Buyer value is on the line AFTER the "Bill To:" label.
    assert fields["buyerName"] == "XYZ Manufacturing CC"
    # Currency is the real code, never "DUE" from "Total Due".
    assert fields["currency"] == "ZAR"


def test_buyer_value_on_following_line():
    text = "Invoice No: INV-1\nInvoice Date: 01/01/2024\nBill To:\nAcme Widgets (Pty) Ltd\nTotal Due: R100.00\n"
    out = extract_invoice(text, _pages(text))
    assert out.fields["buyerName"].value == "Acme Widgets (Pty) Ltd"


def test_letterhead_vendor_skips_document_heading():
    """A 'TAX INVOICE' heading is never treated as the vendor."""
    text = "TAX INVOICE\nVendor: Real Supplier Ltd\nBill To: Buyer CC\nInvoice No: INV-9\nInvoice Date: 01/01/2024\nCurrency: ZAR\nTotal Due: R1.00\n"
    out = extract_invoice(text, _pages(text))
    assert out.fields["vendorName"].value == "Real Supplier Ltd"
    # explicit label present → no letterhead inference warning
    assert not any("letterhead" in w for w in out.warnings)
