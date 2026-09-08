"""
Orgni Docs Schemas — shared data models used across the pipeline.
All pipeline stages produce and consume these structures.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any


# ── OCR ───────────────────────────────────────────────────────────────────────

@dataclass
class OCRPage:
    page: int
    text: str
    char_count: int
    ocr_confidence: float | None
    confidence_detail: dict | None
    fallback_used: bool
    parser: str
    processing_ms: float
    checksum: str

    def to_dict(self) -> dict:
        return self.__dict__.copy()


@dataclass
class OCRResult:
    document_id: str
    source_file: str
    content_type: str
    page_count: int
    total_characters: int
    processing_ms: float
    ocr_engine: str
    environment: str
    pages: list[OCRPage]
    error: bool = False
    error_message: str | None = None

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        d["pages"] = [p.to_dict() for p in self.pages]
        return d


# ── Extraction ────────────────────────────────────────────────────────────────

# Approved document fields — strict schema
DOCUMENT_FIELDS = [
    "invoice_number", "date", "due_date",
    "supplier", "client", "vat_number",
    "invoice_total", "vat", "subtotal",
]

CRITICAL_FIELDS = {"invoice_total", "vat", "subtotal"}
RECOMMENDED_FIELDS = {"invoice_number", "date", "supplier", "client"}

# Field source types (fix 10 — clear audit trail)
FIELD_SOURCES = {"regex", "ocr", "llm", "not_found"}


@dataclass
class ExtractionResult:
    document_id: str
    extracted_fields: dict[str, Any]
    field_sources: dict[str, str]
    field_confidence: dict[str, float]
    missing_fields: list[str]
    critical_missing: list[str]
    completeness_score: float
    raw_text_length: int
    llm_error: str | None = None

    def to_dict(self) -> dict:
        return self.__dict__.copy()


# ── Validation ────────────────────────────────────────────────────────────────

@dataclass
class ValidationIssue:
    rule: str
    severity: str
    message: str
    field: str | None = None
    expected: Any = None
    actual: Any = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class ValidationResult:
    document_id: str
    passed: bool
    integrity_score: float
    total_checks: int
    critical_count: int
    warning_count: int
    issues: list[ValidationIssue]
    warnings: list[ValidationIssue]

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        d["issues"] = [i.to_dict() for i in self.issues]
        d["warnings"] = [w.to_dict() for w in self.warnings]
        return d


# ── Pipeline result ───────────────────────────────────────────────────────────

@dataclass
class PipelineResult:
    document_id: str
    run_id: str
    verdict: str          # "APPROVED" | "REVIEW" | "BLOCKED"
    trust_score: float
    risk_level: str
    approved: bool
    recommendation: str
    total_processing_ms: float
    timestamp: str
    integrity_flags: list[str]
    ocr: dict
    extraction: dict
    validation: dict
    stage_timings: dict[str, float]

    def to_dict(self) -> dict:
        return self.__dict__.copy()
