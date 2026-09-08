"""
Invoice field extraction.

Extracts only what the invoice states. Payment status in particular is taken
solely from an explicit marking on the document ("PAID", "OUTSTANDING"); an
invoice that says nothing about its status yields no status field, so the
tokenizer cannot assert a settlement that the document never claimed.
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


def _amount(text: str, pages: list[dict], labels: list[str], conf: float, section: str):
    patterns = [rf"{label}[^\S\n]*[:\-]?[^\S\n]*{_MONEY}" for label in labels]
    return find(
        text, patterns, pages,
        confidence=conf, section=section, group=3, transform=parse_amount,
    )


def _currency(text: str, pages: list[dict]) -> Field | None:
    direct = find(
        text,
        [r"\bcurrency[^\S\n]*[:\-]?[^\S\n]*([A-Z]{3})\b"],
        pages,
        confidence=0.9,
        section="header",
        transform=normalise_currency,
    )
    if direct:
        return direct
    # Fall back to the symbol or code used on the total line.
    for pattern, group in (
        (r"\b(?:total|amount\s+due)\b[^\n]*?\b([A-Z]{3})\b", 1),
        (r"\b(?:total|amount\s+due)\b[^\n]*?([R$€£¥])", 1),
    ):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            code = normalise_currency(match.group(group))
            if code:
                start, end = match.span(group)
                return Field(
                    value=code,
                    confidence=0.72,
                    method=RULE_MATCH,
                    page=page_for_offset(pages, start),
                    section="totals",
                    raw=match.group(group),
                    span=(start, end),
                )
    return None


def _line_items(text: str, pages: list[dict]) -> list[dict[str, Field]]:
    """
    Parse simple `description  qty  unit  total` rows.

    Deliberately conservative: only rows matching the tabular shape are taken.
    Complex or multi-line layouts are left to the ML path rather than guessed.
    """
    items: list[dict[str, Field]] = []
    row = re.compile(
        r"^[^\S\n]*(?P<desc>[A-Za-z][^\n]{2,60}?)\s{2,}"
        r"(?P<qty>\d+(?:\.\d+)?)\s{2,}"
        r"(?:[R$€£¥]\s*)?(?P<unit>[\d,\.]+)\s{2,}"
        r"(?:[R$€£¥]\s*)?(?P<total>[\d,\.]+)[^\S\n]*$",
        re.MULTILINE,
    )
    for match in row.finditer(text):
        qty = parse_amount(match.group("qty"))
        unit = parse_amount(match.group("unit"))
        total = parse_amount(match.group("total"))
        if qty is None or unit is None or total is None:
            continue
        page = page_for_offset(pages, match.start())
        items.append(
            {
                "description": Field(
                    match.group("desc").strip(), 0.75, RULE_MATCH,
                    page, "line_items", match.group("desc").strip(),
                    match.span("desc"),
                ),
                "quantity": Field(qty, 0.8, RULE_MATCH, page, "line_items",
                                  match.group("qty"), match.span("qty")),
                "unitPrice": Field(unit, 0.8, RULE_MATCH, page, "line_items",
                                   match.group("unit"), match.span("unit")),
                "totalPrice": Field(total, 0.8, RULE_MATCH, page, "line_items",
                                    match.group("total"), match.span("total")),
            }
        )
    return items


# Lines that are document headings, not entity names — never used as a vendor.
_HEADING_RE = re.compile(
    r"^(?:tax\s+)?invoice$|^statement$|^proof\s+of\s+payment$|^receipt$|"
    r"^remittance(?:\s+advice)?$|^credit\s+note$",
    re.IGNORECASE,
)
# A letterhead line should look like an organisation name.
_ENTITY_HINT_RE = re.compile(
    r"\((?:Pty|Proprietary)\)|(?:\bLtd\b|\bCC\b|\bInc\b|\bLLC\b|\bLimited\b|\bPLC\b)",
    re.IGNORECASE,
)


def _letterhead_vendor(text: str, pages: list[dict]) -> Field | None:
    """
    When no explicit vendor label exists, treat the letterhead (the first
    entity-looking line, e.g. `ABC Logistics (Pty) Ltd`) as a low-confidence
    vendor candidate. Skips document-type headings. Always paired with a warning
    by the caller so nothing is asserted silently.
    """
    offset = 0
    for line in text.split("\n"):
        stripped = line.strip()
        start = text.find(stripped, offset) if stripped else offset
        offset = start + len(stripped)
        if not stripped or _HEADING_RE.match(stripped):
            continue
        if len(stripped) < 2 or len(stripped) > 80:
            continue
        if not _ENTITY_HINT_RE.search(stripped):
            # Only infer when the line clearly names a company, to avoid picking
            # up addresses or free text.
            continue
        return Field(
            value=stripped, confidence=0.55, method=RULE_MATCH,
            page=page_for_offset(pages, start), section="parties",
            raw=stripped, span=(start, start + len(stripped)),
        )
    return None


def extract_invoice(text: str, pages: list[dict]) -> ExtractionOutcome:
    out = ExtractionOutcome()

    out.add("invoiceNumber", find(
        text,
        [r"\binvoice\s*(?:no\.?|number|#)[^\S\n]*[:\-]?[^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})",
         r"\binvoice[^\S\n]*[:\-][^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})"],
        pages, confidence=0.92, section="header",
        transform=clean_reference, field="invoiceNumber", reject_log=out.warnings,
    ))

    out.add("invoiceDate", find(
        text,
        [r"\b(?:invoice\s+date|date\s+issued|issue\s+date)[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})",
         r"\bdate[^\S\n]*[:\-][^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
        pages, confidence=0.88, section="header", transform=normalise_date,
        field="invoiceDate", reject_log=out.warnings,
    ))

    out.add("dueDate", find(
        text,
        [r"\b(?:due\s+date|payment\s+due|due\s+by)[^\S\n]*[:\-]?[^\S\n]*([0-9A-Za-z ,/\.\-]{6,20})"],
        pages, confidence=0.88, section="header", transform=normalise_date,
        field="dueDate", reject_log=out.warnings,
    ))

    # Vendor: try an explicit label (value on the same line OR the next line);
    # fall back to the letterhead (first entity-looking line) with a warning so
    # the inference is flagged for review rather than asserted silently.
    vendor = find(
        text,
        [
            r"\b(?:from|supplier|vendor|issued\s+by)[^\S\n]*[:\-][^\S\n]*([^\n]{2,80})",
            r"\b(?:from|supplier|vendor|issued\s+by)[^\S\n]*[:\-]?[^\S\n]*\n[^\S\n]*([^\n]{2,80})",
        ],
        pages, confidence=0.8, section="parties",
    )
    if vendor is None:
        vendor = _letterhead_vendor(text, pages)
        if vendor is not None:
            out.warnings.append(
                "vendor_name_inferred_from_letterhead: no explicit vendor label; "
                "used the document letterhead - verify before use"
            )
    out.add("vendorName", vendor)
    out.add("vendorVatNumber", find(
        text,
        [r"\bvat\s*(?:no\.?|number|reg)?[^\S\n]*[:\-]?[^\S\n]*([A-Z0-9]{8,15})"],
        pages, confidence=0.85, section="parties",
    ))
    out.add("buyerName", find(
        text,
        [
            r"\b(?:bill\s+to|customer|client|sold\s+to)[^\S\n]*[:\-][^\S\n]*([^\n]{2,80})",
            r"\b(?:bill\s+to|customer|client|sold\s+to)[^\S\n]*[:\-]?[^\S\n]*\n[^\S\n]*([^\n]{2,80})",
        ],
        pages, confidence=0.8, section="parties",
    ))

    out.add("subtotal", _amount(text, pages, [r"\bsub[\-\s]?total\b"], 0.88, "totals"))
    out.add("taxAmount", _amount(
        text, pages, [r"\bvat\b", r"\btax\b", r"\bsales\s+tax\b"], 0.85, "totals"))
    out.add("totalAmount", _amount(
        text, pages,
        [r"\b(?:total\s+due|amount\s+due|grand\s+total|total)\b"], 0.9, "totals"))

    out.add("currency", _currency(text, pages))
    out.add("paymentTerms", find(
        text,
        [r"\b(?:payment\s+terms|terms)[^\S\n]*[:\-][^\S\n]*([^\n]{2,60})"],
        pages, confidence=0.8, section="terms",
    ))
    out.add("purchaseOrderRef", find(
        text,
        [r"\b(?:purchase\s+order|p\.?o\.?)\s*(?:no\.?|number|#)?\b[^\S\n]*[:#\-]?[^\S\n]*([A-Z0-9][A-Z0-9\-/]{2,})"],
        pages, confidence=0.85, section="header",
        transform=clean_reference,
    ))

    # Status only when the document says so explicitly.
    status = find(
        text,
        [r"\b(?:status)[^\S\n]*[:\-][^\S\n]*(paid|unpaid|outstanding|overdue|settled|partially\s+paid)\b",
         r"\b(PAID\s+IN\s+FULL|PAID|UNPAID|OUTSTANDING|OVERDUE)\b"],
        pages, confidence=0.85, section="status",
    )
    if status is not None:
        status.value = str(status.value).strip().upper().replace(" ", "_")
        out.fields["documentStatus"] = status
    else:
        out.missing.append("documentStatus")
        out.warnings.append(
            "invoice_status_not_stated: no payment status asserted from this document"
        )

    out.line_items = _line_items(text, pages)
    if not out.line_items:
        out.warnings.append("no_line_items_parsed")

    if "totalAmount" not in out.fields:
        out.warnings.append("missing_critical_field: totalAmount")
    if "currency" not in out.fields:
        out.warnings.append("missing_critical_field: currency")

    return out
