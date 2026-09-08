"""
Orgni Docs — Validation Module — Constraint validation engine.
Checks mathematical consistency, field formats, relationships, and value sanity.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Any
import re

VAT_RATE = 0.15
TOLERANCE = 0.10
MAX_SANE_AMOUNT = 50_000_000

REQUIRED_FIELDS = ["invoice_total"]
RECOMMENDED_FIELDS = ["vat", "subtotal", "date", "invoice_number", "supplier"]

DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%d %B %Y", "%d %b %Y",
]


@dataclass
class ValidationIssue:
    rule: str
    passed: bool
    severity: str
    message: str
    field: str | None = None
    expected: Any = None
    actual: Any = None

    def to_dict(self) -> dict:
        d = {k: v for k, v in self.__dict__.items() if v is not None}
        return d


def _parse_date(value: str) -> datetime | None:
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(str(value).strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def _check_required(fields: dict) -> list[ValidationIssue]:
    results = []
    for f in REQUIRED_FIELDS:
        passed = f in fields and fields[f] is not None
        results.append(ValidationIssue(
            rule="required_field", passed=passed,
            severity="critical" if not passed else "info",
            message=f"Required field '{f}' {'present' if passed else 'missing'}",
            field=f,
        ))
    return results


def _check_recommended(fields: dict) -> list[ValidationIssue]:
    results = []
    for f in RECOMMENDED_FIELDS:
        if f not in fields or fields[f] is None:
            results.append(ValidationIssue(
                rule="recommended_field", passed=False, severity="warning",
                message=f"Recommended field '{f}' missing", field=f,
            ))
    return results


def _check_math(fields: dict) -> list[ValidationIssue]:
    results = []
    total = fields.get("invoice_total")
    vat = fields.get("vat")
    subtotal = fields.get("subtotal")

    if total is None:
        return results

    if subtotal is not None and vat is not None:
        expected = round(subtotal + vat, 2)
        diff = abs(total - expected)
        passed = diff <= TOLERANCE
        results.append(ValidationIssue(
            rule="math_subtotal_plus_vat", passed=passed,
            severity="critical" if not passed else "info",
            message=f"Total matches subtotal + VAT" if passed else
                    f"Total mismatch: {subtotal} + {vat} = {expected}, got {total} (diff R{diff:.2f})",
            field="invoice_total", expected=expected, actual=total,
        ))

        expected_vat = round(subtotal * VAT_RATE, 2)
        diff_vat = abs(vat - expected_vat)
        passed_vat = diff_vat <= TOLERANCE
        results.append(ValidationIssue(
            rule="math_vat_rate", passed=passed_vat,
            severity="warning" if not passed_vat else "info",
            message=f"VAT valid at 15%" if passed_vat else
                    f"VAT rate inconsistency: expected R{expected_vat}, got R{vat}",
            field="vat", expected=expected_vat, actual=vat,
        ))
    return results


def _check_formats(fields: dict) -> list[ValidationIssue]:
    results = []
    inv = fields.get("invoice_number")
    if inv:
        valid = bool(re.search(r'\d', str(inv)))
        results.append(ValidationIssue(
            rule="format_invoice_number", passed=valid,
            severity="warning" if not valid else "info",
            message=f"Invoice number {'valid' if valid else 'contains no digits — may be corrupt'}",
            field="invoice_number",
        ))
    vat_num = fields.get("vat_number")
    if vat_num:
        valid = bool(re.fullmatch(r'\d{10}', str(vat_num)))
        results.append(ValidationIssue(
            rule="format_vat_number", passed=valid,
            severity="warning" if not valid else "info",
            message=f"VAT reg number {'valid (10 digits)' if valid else 'not 10 digits (SARS standard)'}",
            field="vat_number",
        ))
    date_val = fields.get("date")
    if date_val:
        parsed = _parse_date(str(date_val))
        results.append(ValidationIssue(
            rule="format_date", passed=parsed is not None,
            severity="warning" if parsed is None else "info",
            message=f"Invoice date {'parseable' if parsed else f'unparseable: {date_val}'}",
            field="date",
        ))
    return results


def _check_date_relationships(fields: dict) -> list[ValidationIssue]:
    date_val = fields.get("date")
    due_val = fields.get("due_date")
    if not date_val or not due_val:
        return []
    inv_dt = _parse_date(str(date_val))
    due_dt = _parse_date(str(due_val))
    if inv_dt and due_dt:
        passed = due_dt >= inv_dt
        return [ValidationIssue(
            rule="relationship_due_after_invoice", passed=passed,
            severity="critical" if not passed else "info",
            message=f"Due date ({due_val}) {'after' if passed else 'BEFORE'} invoice date ({date_val})",
            field="due_date", expected=f">= {date_val}", actual=due_val,
        )]
    return []


def _check_sanity(fields: dict) -> list[ValidationIssue]:
    results = []
    for f in ("invoice_total", "vat", "subtotal"):
        val = fields.get(f)
        if val is None:
            continue
        if val < 0:
            results.append(ValidationIssue(
                rule="sanity_negative_amount", passed=False, severity="critical",
                message=f"'{f}' is negative (R{val})", field=f, actual=val,
            ))
        elif f == "invoice_total" and val == 0:
            results.append(ValidationIssue(
                rule="sanity_zero_total", passed=False, severity="warning",
                message="Invoice total is R0.00 — likely extraction error", field=f, actual=val,
            ))
        elif val > MAX_SANE_AMOUNT:
            results.append(ValidationIssue(
                rule="sanity_max_amount", passed=False, severity="warning",
                message=f"'{f}' R{val:,.2f} exceeds sanity cap", field=f, actual=val,
            ))
        else:
            results.append(ValidationIssue(
                rule="sanity_amount_range", passed=True, severity="info",
                message=f"'{f}' R{val:,.2f} within sane range", field=f,
            ))
    return results


def validate(doc_id: str, extracted_fields: dict) -> dict:
    all_results: list[ValidationIssue] = []
    all_results += _check_required(extracted_fields)
    all_results += _check_recommended(extracted_fields)
    all_results += _check_math(extracted_fields)
    all_results += _check_formats(extracted_fields)
    all_results += _check_date_relationships(extracted_fields)
    all_results += _check_sanity(extracted_fields)

    issues   = [r for r in all_results if not r.passed and r.severity == "critical"]
    warnings = [r for r in all_results if not r.passed and r.severity == "warning"]
    passed   = [r for r in all_results if r.passed]

    total = len(all_results)
    return {
        "document_id": doc_id,
        "passed": len(issues) == 0,
        "integrity_score": round(len(passed) / total, 2) if total else 0.0,
        "total_checks": total,
        "critical_count": len(issues),
        "warning_count": len(warnings),
        "issues": [i.to_dict() for i in issues],
        "warnings": [w.to_dict() for w in warnings],
    }
