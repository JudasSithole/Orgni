"""
Proof-of-payment field extraction.

A proof of payment is evidence that a payment was *reported*, not proof that
any particular invoice is settled. Even when the document references an invoice
number, that reference is captured as a reference only. Reconciling a payment
against an invoice is an ontology concern and is deliberately out of scope here.
"""
from __future__ import annotations

import re
from typing import Any

from .base import (
    ExtractionOutcome,
    Field,
    RULE_MATCH,
    clean_reference,
    find,
    normalise_currency,
    normalise_date,
    page_for_offset,
    parse_amount,
)

_MONEY = r"([A-Z]{3}\s*)?([R$€£¥]\s*)?([\d][\d,\. ]*\d|\d)"

_METHODS = {
    "EFT": r"\beft\b|\belectronic\s+funds?\s+transfer\b",
    "WIRE": r"\bwire\s+transfer\b|\bswift\b",
    "CARD": r"\b(?:credit|debit)\s+card\b|\bcard\s+payment\b",
    "CASH": r"\bcash\s+payment\b|\bpaid\s+in\s+cash\b",
    "CHEQUE": r"\bcheque\b|\bcheck\s+no\b",
    "DEBIT_ORDER": r"\bdebit\s+order\b|\bdirect\s+debit\b",
}


def _payment_method(text: str, pages: list[dict]) -> Field | None:
    for method, pattern in _METHODS.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return Field(
                value=method,
                confidence=0.85,
                method=RULE_MATCH,
                page=page_for_offset(pages, match.start()),
                section="payment",
                raw=match.group(0),
                span=match.span(),
            )
    return None


def extract_proof_of_payment(text: str, pages: list[dict]) -> ExtractionOutcome:
    out = ExtractionOutcome()

    out.add("paymentReference", find(
        text,
        # Longest alternatives first: "reference" must win over "ref", or the
        # trailing "erence" gets captured as the value.
        [r"\b(?:payment\s+reference|transaction\s+(?:reference|ref|id)|reference\s+(?:no\.?|number))"
         r"[^\S\n]*[:\-]+[^\S\n]*([A-Z0-9][A-Z0-9\-/]{3,})",
         r"\bref(?:erence)?\b[^\S\n]*[:\-]+[^\S\n]*([A-Z0-9][A-Z0-9\-/]{3,})"],
        pages, confidence=0.9, section="payment",
        transform=clean_reference,
    ))

    out.add("paymentDate", find(
        text,
        [r"\b(?:payment\s+date|date\s+paid|paid\s+on|value\s+date|transaction\s+date)"
         r"[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})",
         r"\bdate[^\S\n]*[:\-][^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
        pages, confidence=0.88, section="payment", transform=normalise_date,
    ))

    out.add("payerName", find(
        text,
        [r"\b(?:payer|paid\s+by|from\s+account\s+name|account\s+holder|debtor)"
         r"[^\S\n]*[:\-][^\S\n]*([^\n]{2,80})"],
        pages, confidence=0.82, section="parties",
    ))
    out.add("payeeName", find(
        text,
        [r"\b(?:payee|paid\s+to|beneficiary|recipient|creditor)"
         r"[^\S\n]*[:\-][^\S\n]*([^\n]{2,80})"],
        pages, confidence=0.82, section="parties",
    ))

    out.add("amount", find(
        text,
        [rf"\b(?:amount\s+paid|payment\s+amount|amount|total\s+paid)\b[^\S\n]*[:\-]?[^\S\n]*{_MONEY}"],
        pages, confidence=0.9, section="payment", group=3, transform=parse_amount,
    ))
    out.add("currency", find(
        text,
        [r"\bcurrency[^\S\n]*[:\-]?[^\S\n]*([A-Z]{3})\b",
         r"\b(?:amount\s+paid|amount)\b[^\n]*?\b([A-Z]{3})\b",
         r"\b(?:amount\s+paid|amount)\b[^\n]*?([R$€£¥])"],
        pages, confidence=0.82, section="payment", transform=normalise_currency,
    ))

    out.add("paymentMethod", _payment_method(text, pages))
    out.add("bankName", find(
        text,
        [r"\b(?:bank|institution|provider)[^\S\n]*[:\-][^\S\n]*([^\n]{2,60})"],
        pages, confidence=0.8, section="payment",
    ))

    # Captured as a *reference*; it does not settle anything on its own.
    # NOTE: the label alternative is `ref(?:erence)?` (not bare `ref`) so that
    # "Invoice Reference: INV-1" consumes the whole word "Reference" as the label
    # and captures "INV-1" — a bare `ref` matched inside "Reference" and captured
    # the fragment "erence" as the invoice reference. `clean_reference` rejects
    # any such fragment as a second line of defence.
    out.add("referencedInvoiceNumber", find(
        text,
        [r"\b(?:invoice|inv)\s*(?:no\.?|number|#|ref(?:erence)?)?\b[^\S\n]*[:#\-]?[^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})",
         r"\bin\s+payment\s+of\s+(?:invoice\s*)?([A-Z0-9][A-Z0-9\-/]{2,})"],
        pages, confidence=0.78, section="reference",
        transform=clean_reference,
    ))

    status = find(
        text,
        [r"\b(?:transaction\s+status|status)[^\S\n]*[:\-][^\S\n]*"
         r"(successful|success|completed|cleared|settled|pending|failed|reversed|declined)\b",
         r"\b(SUCCESSFUL|COMPLETED|CLEARED|PENDING|FAILED|REVERSED|DECLINED)\b"],
        pages, confidence=0.85, section="status",
    )
    if status is not None:
        status.value = str(status.value).strip().upper()
        out.fields["transactionStatus"] = status
    else:
        out.missing.append("transactionStatus")
        out.warnings.append(
            "payment_status_not_stated: payment reported but no explicit transaction status"
        )

    out.add("proofReference", find(
        text,
        [r"\b(?:proof\s+(?:no\.?|reference)|receipt\s*(?:no\.?|number|#))"
         r"[^\S\n]*[:\-]?[^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})"],
        pages, confidence=0.8, section="reference",
        transform=clean_reference,
    ))

    if "referencedInvoiceNumber" in out.fields:
        out.warnings.append(
            "invoice_reference_is_not_settlement: referenced invoice captured as a "
            "reference only; settlement is not asserted"
        )
    if "amount" not in out.fields:
        out.warnings.append("missing_critical_field: amount")

    return out
