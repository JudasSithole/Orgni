"""
Orgni Docs — Extraction Module
Structured field extraction from OCR text.
Regex first, LLM fallback for missing fields.
"""
import re
import json
from datetime import datetime
from typing import Any

from schemas.document import DOCUMENT_FIELDS, CRITICAL_FIELDS
from config import LLM_MODEL, LLM_MAX_TOKENS

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%Y-%m-%d", "%Y/%m/%d",
    "%d %B %Y", "%d %b %Y",
    "%B %d, %Y", "%b %d, %Y",
]

PATTERNS = {
    "invoice_number": [
        r"invoice\s*(?:no|number|#)[:\s]*([A-Z0-9\-/]+)",
        r"\binv[:\s#-]*([A-Z0-9\-/]+)",
    ],
    "date": [
        r"invoice\s*date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(?<!\w)date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
    ],
    "due_date": [
        r"due\s*(?:date|by)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"payment\s*due[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
    ],
    "supplier": [
        r"(?:from|supplier|vendor|billed?\s*by)[:\s]+([A-Za-z0-9 &,.()\-]+?)(?:\n|$)",
    ],
    "client": [
        r"(?:bill\s*to|client|customer)[:\s]*\n([A-Za-z0-9 &,.()\-]+)",
        r"(?:to)[:\s]+([A-Za-z0-9 &,.()\-]+?)(?:\n|ltd|pty|cc)",
    ],
    "vat_number": [r"vat\s*reg\s*(?:no|number)?[:\s]*(\d{10})"],
}

AMOUNT_PATTERNS = {
    "invoice_total": [
        r"total\s*due[:\s]*r?\s*([\d\s,]+\.?\d*)",
        r"amount\s*due[:\s]*r?\s*([\d\s,]+\.?\d*)",
        r"grand\s*total[:\s]*r?\s*([\d\s,]+\.?\d*)",
    ],
    "vat": [
        r"vat\s*\(\d+%\)[:\s]*r?\s*([\d\s,]+\.?\d*)",
        r"(?<!\w)vat[:\s]+r?\s*([\d\s,]+\.?\d*)",
    ],
    "subtotal": [
        r"sub\s*total[:\s]*r?\s*([\d\s,]+\.?\d*)",
        r"amount\s*(?:excl|before)\s*(?:vat|tax)[:\s]*r?\s*([\d\s,]+\.?\d*)",
    ],
}


def normalise_date(raw: str) -> str | None:
    if not raw:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw.strip()


def _parse_amount(raw: str) -> float | None:
    cleaned = raw.replace(" ", "").replace("\u00a0", "")
    if "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")
    elif "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(",", "")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def _regex_extract(text: str) -> tuple[dict, dict]:
    results, confidence = {}, {}
    for field, patterns in PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if m:
                val = m.group(1).strip()
                if field in ("date", "due_date"):
                    val = normalise_date(val) or val
                results[field] = val
                confidence[field] = 1.0
                break
    for field, patterns in AMOUNT_PATTERNS.items():
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                parsed = _parse_amount(m.group(1))
                if parsed is not None:
                    results[field] = parsed
                    confidence[field] = 1.0
                    break
    return results, confidence


def _validate_llm_schema(parsed: dict, allowed_fields: list[str]) -> tuple[dict, list[str]]:
    """
    Fix 4 — strict schema validation after LLM extraction.
    Rejects any field not in the approved schema and any wrong-typed value.
    Returns (clean_fields, rejected_field_names).
    """
    clean = {}
    rejected = []

    for key, value in parsed.items():
        if key not in allowed_fields:
            rejected.append(f"{key} (not an approved field)")
            continue
        if value is None:
            continue

        if key in CRITICAL_FIELDS:
            if not isinstance(value, (int, float)):
                rejected.append(f"{key} (expected number, got {type(value).__name__})")
                continue
            clean[key] = round(float(value), 2)
        elif key in ("date", "due_date"):
            normalised = normalise_date(str(value))
            if not normalised or not re.match(r"\d{4}-\d{2}-\d{2}", normalised):
                rejected.append(f"{key} (invalid date format: {value})")
                continue
            clean[key] = normalised
        else:
            if not isinstance(value, str) or len(value.strip()) == 0:
                rejected.append(f"{key} (expected non-empty string)")
                continue
            clean[key] = value.strip()

    return clean, rejected


def _llm_extract(text: str, missing: list[str]) -> tuple[dict, dict, str | None]:
    """LLM fallback for fields regex missed. Model name comes from config (fix 3)."""
    if not missing:
        return {}, {}, None
    try:
        import anthropic
        client = anthropic.Anthropic()
    except ImportError:
        return {}, {}, "anthropic package not installed — LLM fallback unavailable"
    except Exception as e:
        return {}, {}, f"anthropic client init failed: {e}"

    prompt = f"""Extract ONLY these fields from the document: {', '.join(missing)}

Rules:
- Return ONLY valid JSON, no markdown.
- Monetary amounts as numbers (e.g. 15000.00).
- Dates in YYYY-MM-DD format only.
- Null if not found.
- Only return fields from this list: {', '.join(missing)}

Document:
\"\"\"{text[:3000]}\"\"\"

JSON only:"""

    try:
        msg = client.messages.create(
            model=LLM_MODEL,
            max_tokens=LLM_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", msg.content[0].text.strip(), flags=re.MULTILINE)
        parsed = json.loads(raw)

        # Fix 4: strict schema validation before accepting LLM output
        clean, rejected = _validate_llm_schema(parsed, missing)

        error = None
        if rejected:
            error = f"LLM returned {len(rejected)} invalid field(s), rejected: {rejected}"

        conf = {k: 0.75 for k in clean}
        return clean, conf, error

    except json.JSONDecodeError as e:
        return {}, {}, f"LLM returned invalid JSON: {e}"
    except Exception as e:
        return {}, {}, f"LLM extraction failed: {e}"


def extract(doc_id: str, pages: list[dict]) -> dict[str, Any]:
    full_text = "\n".join(p["text"] for p in pages)
    regex_results, regex_conf = _regex_extract(full_text)
    missing = [f for f in DOCUMENT_FIELDS if f not in regex_results]
    llm_results, llm_conf, llm_error = _llm_extract(full_text, missing)

    merged = {**llm_results, **regex_results}
    merged_conf = {**llm_conf, **regex_conf}

    extracted = {k: v for k, v in merged.items() if k in DOCUMENT_FIELDS and v is not None}

    # Fix 10: clear field source audit — regex, ocr, llm, or not_found
    source_map = {}
    for f in DOCUMENT_FIELDS:
        if f in regex_results:
            source_map[f] = "regex"
        elif f in llm_results and llm_results.get(f) is not None:
            source_map[f] = "llm"
        else:
            source_map[f] = "not_found"

    missing_fields = [f for f in DOCUMENT_FIELDS if source_map[f] == "not_found"]

    return {
        "document_id": doc_id,
        "extracted_fields": extracted,
        "field_sources": source_map,
        "field_confidence": {k: merged_conf.get(k, 0.0) for k in extracted},
        "missing_fields": missing_fields,
        "critical_missing": [f for f in missing_fields if f in CRITICAL_FIELDS],
        "completeness_score": round(len(extracted) / len(DOCUMENT_FIELDS), 2),
        "raw_text_length": len(full_text),
        "llm_error": llm_error,
    }
