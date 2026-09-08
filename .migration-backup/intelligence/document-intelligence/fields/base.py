"""
Orgni Document Intelligence — field extraction primitives.

Core rule for every extractor built on this module: a field that cannot be
located in the source is simply absent. Nothing is guessed, defaulted or
back-filled, because a fabricated value would flow into an OrganizationalToken
and become indistinguishable from observed fact.

Every extracted field carries a value, a confidence, the method used, and an
evidence location (page + character span + verbatim excerpt) so the token it
produces can be traced back to the exact text that justified it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field as dc_field
from datetime import datetime
from typing import Any, Iterable

# Extraction methods, mirroring ConfidenceMethod in the tokenizer envelope.
RULE_MATCH = "RULE_MATCH"
OCR_EXTRACTION = "OCR_EXTRACTION"
INFERRED = "INFERRED"

# Confidence below this is reported but flagged; the pipeline marks the whole
# extraction LOW_CONFIDENCE so downstream consumers can gate on it.
LOW_CONFIDENCE_THRESHOLD = 0.55


@dataclass
class Field:
    """A single extracted value plus its provenance."""

    value: Any
    confidence: float
    method: str
    page: int | None = None
    section: str | None = None
    raw: str | None = None
    span: tuple[int, int] | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "value": self.value,
            "confidence": round(self.confidence, 3),
            "method": self.method,
        }
        if self.page is not None:
            out["page"] = self.page
        if self.section is not None:
            out["section"] = self.section
        if self.raw is not None:
            out["raw"] = self.raw
        return out

    def evidence(self, field_name: str) -> dict[str, Any] | None:
        """Evidence location for this field, or None when not locatable."""
        if self.span is None:
            return None
        return {
            "field": field_name,
            "type": "TEXT_SPAN",
            "page": self.page,
            "start": self.span[0],
            "end": self.span[1],
            "excerpt": (self.raw or "")[:200],
        }


@dataclass
class ExtractionOutcome:
    """Result of extracting one document type."""

    fields: dict[str, Field] = dc_field(default_factory=dict)
    line_items: list[dict[str, Field]] = dc_field(default_factory=list)
    warnings: list[str] = dc_field(default_factory=list)
    missing: list[str] = dc_field(default_factory=list)

    def add(self, name: str, value: Field | None) -> None:
        if value is None:
            self.missing.append(name)
        else:
            self.fields[name] = value

    def evidence_locations(self) -> list[dict[str, Any]]:
        found = []
        for name, f in self.fields.items():
            ev = f.evidence(name)
            if ev is not None:
                found.append(ev)
        return found

    def mean_confidence(self) -> float:
        if not self.fields:
            return 0.0
        return sum(f.confidence for f in self.fields.values()) / len(self.fields)


# ── Locating helpers ──────────────────────────────────────────────────────────

def page_for_offset(pages: list[dict], offset: int) -> int | None:
    """Map a character offset in the joined text back to its source page."""
    cursor = 0
    for p in pages:
        text = p.get("text") or ""
        end = cursor + len(text)
        if offset < end:
            return p.get("page")
        # +1 accounts for the newline joining pages.
        cursor = end + 1
    return pages[-1].get("page") if pages else None


def find(
    text: str,
    patterns: Iterable[str],
    pages: list[dict],
    *,
    confidence: float,
    section: str | None = None,
    group: int = 1,
    transform=None,
    field: str | None = None,
    reject_log: list[str] | None = None,
) -> Field | None:
    """
    Return the first pattern match as a Field, or None when nothing matches.

    `transform` normalizes the captured string (e.g. to a date or float); if it
    returns None the match is rejected, because a value we cannot parse is not
    a value we are willing to assert. When a labelled value is matched but
    rejected by the transform, a clear reason is appended to `reject_log` (the
    document's warnings) so it surfaces in Data Quality instead of vanishing.
    """
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if not match:
            continue
        try:
            raw = match.group(group)
        except IndexError:  # pattern has no such capture group
            continue
        if raw is None:
            continue
        raw = raw.strip()
        if not raw:
            continue

        value: Any = raw
        conf = confidence
        if transform is not None:
            value = transform(raw)
            if value is None:
                # Matched the label but the value failed validation — reject it
                # and record why, for Data Quality review.
                if reject_log is not None:
                    reject_log.append(
                        f"rejected_value: {field or section or 'field'} — "
                        f"'{raw[:40]}' failed validation and was not used"
                    )
                continue

        start, end = match.span(group)
        return Field(
            value=value,
            confidence=conf,
            method=RULE_MATCH,
            page=page_for_offset(pages, start),
            section=section,
            raw=raw,
            span=(start, end),
        )
    return None


# ── Normalizers ───────────────────────────────────────────────────────────────

_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d %B %Y",
    "%d %b %Y", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d", "%d.%m.%Y",
]


def normalise_date(raw: str) -> str | None:
    """
    Normalize a date to ISO-8601 (date only), or None if unparseable or
    implausible. Impossible dates (e.g. 2024-13-45) fail parsing; a plausibility
    window (1970..current year + 30) rejects OCR noise such as year "0203".
    """
    cleaned = raw.strip().replace(",", ", ").replace("  ", " ")
    cleaned = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", cleaned, flags=re.IGNORECASE)
    for fmt in _DATE_FORMATS:
        try:
            parsed = datetime.strptime(cleaned.strip(), fmt).date()
        except ValueError:
            continue
        if 1970 <= parsed.year <= datetime.now().year + 30:
            return parsed.isoformat()
        return None  # parsed but implausible → reject rather than assert
    return None


def parse_amount(raw: str) -> float | None:
    """
    Parse a monetary amount, tolerating thousands separators; None if invalid or
    implausible. Rejects malformed input, non-finite values, and magnitudes above
    1e12 (OCR noise or a mis-joined number is not a real monetary amount).
    """
    cleaned = re.sub(r"[^\d,.\-]", "", raw)
    if not cleaned or cleaned in {"-", ".", ",", "-.", "-,"}:
        return None
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        if re.search(r",\d{2}$", cleaned):
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        value = round(float(cleaned), 2)
    except (ValueError, OverflowError):
        return None
    if value != value or abs(value) == float("inf"):  # NaN / inf
        return None
    if abs(value) > 1e12:
        return None
    return value


_CURRENCY_SYMBOLS = {
    "R": "ZAR", "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY",
}

# ISO-4217 codes we accept. A 3-letter uppercase token that is not in this set
# (e.g. "DUE", "TAX", "SUB", "VAT") is NOT a currency and must be rejected —
# accepting it would assert a false currency fact.
_CURRENCY_CODES = {
    "ZAR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR",
    "NGN", "KES", "GHS", "BWP", "NAD", "ZMW", "MUR", "AED", "SAR", "SGD",
    "HKD", "NZD", "SEK", "NOK", "DKK", "BRL", "MXN", "TRY", "RUB",
}


_PLACEHOLDER_VALUES = {
    "n/a", "na", "none", "null", "nil", "tbd", "tba", "xxx", "xxxx",
    "-", "--", "...", "pending", "unknown",
}
# Label words that must never survive as a *value* (a captured label fragment).
_LABEL_WORDS = {
    "reference", "erence", "invoice", "number", "no", "ref", "payment",
    "receipt", "proof", "contract", "agreement", "order",
}


def clean_reference(raw: str) -> str | None:
    """
    Validate an identifier / reference value (invoice number, payment reference,
    PO number, …). Rejects the junk that must never become organisational
    context: label fragments (e.g. "erence" from "Reference"), placeholders,
    values equal to a field label, and tokens with no digit — real references
    and document numbers virtually always contain at least one digit.
    Returns the cleaned value, or None to reject it.
    """
    token = raw.strip().strip(".,;:")
    if not token or len(token) < 3:
        return None
    low = token.lower()
    if low in _PLACEHOLDER_VALUES or low in _LABEL_WORDS:
        return None
    # A reference/number without any digit is almost certainly a label fragment
    # ("erence") or free text, not an identifier.
    if not any(c.isdigit() for c in token):
        return None
    return token


def normalise_currency(raw: str) -> str | None:
    """Normalize a currency symbol or code to an ISO-4217 code, or None."""
    token = raw.strip().upper()
    if token in _CURRENCY_SYMBOLS:
        return _CURRENCY_SYMBOLS[token]
    if token in _CURRENCY_CODES:
        return token
    symbol = raw.strip()
    return _CURRENCY_SYMBOLS.get(symbol)
