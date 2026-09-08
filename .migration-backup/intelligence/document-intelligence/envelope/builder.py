"""
Orgni Document Intelligence — normalized envelope builder (schema_version 0.1.0).

This is the contract between Document Intelligence and the ingestion pipeline.
The envelope carries only what the document supports: every field records its
own confidence and evidence location, absent values are simply not present, and
anything the pipeline could not determine is reported through `warnings` rather
than filled in with a plausible-looking default.

Unsupported or unreadable documents produce a well-formed envelope with
document_type UNKNOWN and explanatory warnings — never an exception.
"""
from __future__ import annotations

import re
from typing import Any

from classification.classifier import classify
from fields import (
    ExtractionOutcome,
    extract_contract,
    extract_invoice,
    extract_proof_of_payment,
)

SCHEMA_VERSION = "0.1.0"

# Confidence at or below this marks the extraction LOW_CONFIDENCE so consumers
# can route the document to review instead of trusting it silently.
LOW_CONFIDENCE_THRESHOLD = 0.55

_EXTRACTORS = {
    "INVOICE": extract_invoice,
    "PROOF_OF_PAYMENT": extract_proof_of_payment,
    "CONTRACT": extract_contract,
}


def _join_pages(pages: list[dict]) -> str:
    return "\n".join((p.get("text") or "") for p in pages)


def _detect_language(text: str) -> str:
    """
    Very small heuristic language hint.

    Only distinguishes English from 'und' (undetermined); we would rather
    report 'und' than assert a language we have not actually detected.
    """
    sample = text.lower()
    english_markers = (
        " the ", " and ", " of ", " to ", " for ", " invoice ", " payment ",
        " agreement ", " total ", " date ",
    )
    hits = sum(1 for marker in english_markers if marker in sample)
    return "en" if hits >= 3 else "und"


def _extraction_status(confidence: float, outcome: ExtractionOutcome) -> str:
    if confidence <= LOW_CONFIDENCE_THRESHOLD:
        return "LOW_CONFIDENCE"
    if outcome.missing:
        return "PARTIAL"
    return "COMPLETE"


def _serialise_fields(outcome: ExtractionOutcome) -> dict[str, Any]:
    fields = {name: f.to_dict() for name, f in outcome.fields.items()}
    if outcome.line_items:
        fields["lineItems"] = [
            {key: value.to_dict() for key, value in item.items()}
            for item in outcome.line_items
        ]
    return fields


def _tables(outcome: ExtractionOutcome) -> list[dict[str, Any]]:
    """Line items are the only tabular structure Phase 1 emits."""
    if not outcome.line_items:
        return []
    return [
        {
            "name": "lineItems",
            "rowCount": len(outcome.line_items),
            "columns": ["description", "quantity", "unitPrice", "totalPrice"],
            "rows": [
                {key: value.value for key, value in item.items()}
                for item in outcome.line_items
            ],
        }
    ]


def build_envelope(
    *,
    source_id: str,
    pages: list[dict],
    filename: str,
    mime_type: str,
    checksum: str,
    tenant_id: str,
    source_type: str = "UPLOAD",
    ocr_warnings: list[str] | None = None,
    ocr_confidence: float | None = None,
) -> dict[str, Any]:
    """Build the normalized envelope from OCR/text-extraction pages."""
    warnings: list[str] = list(ocr_warnings or [])
    text = _join_pages(pages)

    classification = classify(text)
    document_type = classification["document_type"]
    warnings.extend(classification["warnings"])

    if document_type == "UNKNOWN":
        return {
            "source_id": source_id,
            "source_type": source_type,
            "document_type": "UNKNOWN",
            "content": {"text": text, "language": _detect_language(text)},
            "extracted_fields": {},
            "tables": [],
            "metadata": {
                "filename": filename,
                "mime_type": mime_type,
                "checksum": checksum,
                "tenant_id": tenant_id,
            },
            "evidence_locations": [],
            "confidence": 0.0,
            "warnings": warnings or ["document_type_unknown"],
            "schema_version": SCHEMA_VERSION,
            "extraction_status": "LOW_CONFIDENCE",
        }

    outcome = _EXTRACTORS[document_type](text, pages)
    warnings.extend(outcome.warnings)
    if outcome.missing:
        warnings.append("fields_not_found: " + ", ".join(sorted(outcome.missing)))

    # Overall confidence blends how sure we are of the type with how well the
    # fields extracted, then is capped by OCR quality when OCR was involved.
    field_confidence = outcome.mean_confidence()
    confidence = round((classification["confidence"] * 0.4) + (field_confidence * 0.6), 3)
    if ocr_confidence is not None:
        confidence = round(min(confidence, ocr_confidence), 3)
        if ocr_confidence <= LOW_CONFIDENCE_THRESHOLD:
            warnings.append(f"low_ocr_confidence: {round(ocr_confidence, 3)}")

    if confidence <= LOW_CONFIDENCE_THRESHOLD:
        warnings.append(f"low_extraction_confidence: {confidence}")

    return {
        "source_id": source_id,
        "source_type": source_type,
        "document_type": document_type,
        "content": {"text": text, "language": _detect_language(text)},
        "extracted_fields": _serialise_fields(outcome),
        "tables": _tables(outcome),
        "metadata": {
            "filename": filename,
            "mime_type": mime_type,
            "checksum": checksum,
            "tenant_id": tenant_id,
        },
        "evidence_locations": outcome.evidence_locations(),
        "confidence": confidence,
        "warnings": warnings,
        "schema_version": SCHEMA_VERSION,
        "extraction_status": _extraction_status(confidence, outcome),
    }


def analyze_document(
    *,
    source_id: str,
    file_path: str | None,
    content_type: str,
    filename: str,
    checksum: str,
    tenant_id: str,
    text: str | None = None,
) -> dict[str, Any]:
    """
    Full Document Intelligence entry point: text/OCR extraction then envelope.

    `text` short-circuits OCR for plain-text sources and test fixtures. Any
    failure in text extraction is converted into an UNKNOWN envelope with
    warnings, so a single bad document can never raise into the caller.
    """
    ocr_warnings: list[str] = []
    ocr_confidence: float | None = None

    if text is not None:
        pages = [{"page": 1, "text": text}]
    else:
        try:
            from ocr.extractor import extract as ocr_extract

            result = ocr_extract(source_id, file_path, content_type)
            if result.get("error"):
                return _unreadable(
                    source_id, filename, content_type, checksum, tenant_id,
                    [f"text_extraction_failed: {result.get('message', 'unknown error')}"],
                )
            pages = result.get("pages") or []
            confidences = [
                p["ocr_confidence"] for p in pages
                if p.get("ocr_confidence") is not None
            ]
            if confidences:
                # OCR reports 0-100; the envelope works in 0-1.
                ocr_confidence = min(1.0, (sum(confidences) / len(confidences)) / 100.0)
            if any(p.get("fallback_used") for p in pages):
                ocr_warnings.append("ocr_fallback_used")
        except Exception as exc:  # noqa: BLE001 - controlled failure boundary
            return _unreadable(
                source_id, filename, content_type, checksum, tenant_id,
                [f"text_extraction_error: {type(exc).__name__}"],
            )

    if not pages or not _join_pages(pages).strip():
        return _unreadable(
            source_id, filename, content_type, checksum, tenant_id,
            ["no_text_extracted"],
        )

    return build_envelope(
        source_id=source_id,
        pages=pages,
        filename=filename,
        mime_type=content_type,
        checksum=checksum,
        tenant_id=tenant_id,
        ocr_warnings=ocr_warnings,
        ocr_confidence=ocr_confidence,
    )


def _unreadable(
    source_id: str,
    filename: str,
    mime_type: str,
    checksum: str,
    tenant_id: str,
    warnings: list[str],
) -> dict[str, Any]:
    """A well-formed envelope describing a document we could not read."""
    return {
        "source_id": source_id,
        "source_type": "UPLOAD",
        "document_type": "UNKNOWN",
        "content": {"text": "", "language": "und"},
        "extracted_fields": {},
        "tables": [],
        "metadata": {
            "filename": filename,
            "mime_type": mime_type,
            "checksum": checksum,
            "tenant_id": tenant_id,
        },
        "evidence_locations": [],
        "confidence": 0.0,
        "warnings": warnings,
        "schema_version": SCHEMA_VERSION,
        "extraction_status": "LOW_CONFIDENCE",
    }
