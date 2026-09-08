"""
Orgni Docs — Pipeline Runner
Executes the full end-to-end document integrity pipeline.

Stages:
  1. OCR          — extract text from document
  2. Extraction   — structured field extraction
  3. Validation   — constraint checks
  4. Trust Score  — aggregate integrity score
  5. Verdict      — APPROVED / REVIEW / BLOCKED
"""
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from ocr.extractor import extract as ocr_extract
from extraction.extractor import extract as structured_extract
from validation.engine import validate
from integrity.trust_scorer import score as trust_score


def run(document_id: str, file_path: str, content_type: str) -> dict[str, Any]:
    """Run the full Orgni Docs pipeline on a document."""
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    pipeline_start = time.time()
    timings = {}
    checkpoints = []

    # Stage 1: OCR
    t = time.time()
    ocr_result = ocr_extract(document_id, file_path, content_type)
    timings["ocr"] = round((time.time() - t) * 1000, 1)
    checkpoints.append(_checkpoint("ocr", document_id, ocr_result, timings["ocr"]))

    if ocr_result.get("error"):
        return _error_result(document_id, run_id, "ocr", ocr_result["message"])

    # Stage 2: Extraction
    t = time.time()
    extraction_result = structured_extract(document_id, ocr_result["pages"])
    timings["extraction"] = round((time.time() - t) * 1000, 1)
    checkpoints.append(_checkpoint("extraction", document_id, extraction_result, timings["extraction"]))

    # Stage 3: Validation
    t = time.time()
    validation_result = validate(document_id, extraction_result["extracted_fields"])
    timings["validation"] = round((time.time() - t) * 1000, 1)
    checkpoints.append(_checkpoint("validation", document_id, validation_result, timings["validation"]))

    # Stage 4: Trust Scoring
    t = time.time()
    trust_result = trust_score(
        document_id=document_id,
        ocr_data=ocr_result,
        extraction_data=extraction_result,
        validation_data=validation_result,
    )
    timings["trust_scoring"] = round((time.time() - t) * 1000, 1)
    checkpoints.append(_checkpoint("trust_scoring", document_id, trust_result, timings["trust_scoring"]))

    total_ms = round((time.time() - pipeline_start) * 1000, 1)

    flags = []
    for issue in validation_result.get("issues", []):
        flags.append(f"validation:{issue.get('rule')}")
    for w in validation_result.get("warnings", []):
        flags.append(f"validation_warning:{w.get('rule')}")
    for f in trust_result.get("risk_factors", []):
        if "critical" in f or "low_conf" in f or "absent" in f:
            flags.append(f.split(":")[0])

    return {
        "document_id": document_id,
        "run_id": run_id,
        "verdict": trust_result["verdict"],
        "trust_score": trust_result["trust_score"],
        "risk_level": trust_result["risk_level"],
        "approved": trust_result["verdict"] == "APPROVED",
        "recommendation": trust_result["recommendation"],
        "total_processing_ms": total_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "integrity_flags": list(dict.fromkeys(flags)),
        "stage_timings": timings,
        "checkpoints": checkpoints,
        "stage_outputs": {
            "ocr": {
                "page_count": ocr_result.get("page_count"),
                "total_characters": ocr_result.get("total_characters"),
                "ocr_engine": ocr_result.get("ocr_engine"),
            },
            "extraction": {
                "extracted_fields": extraction_result.get("extracted_fields"),
                "field_sources": extraction_result.get("field_sources"),
                "field_confidence": extraction_result.get("field_confidence"),
                "completeness_score": extraction_result.get("completeness_score"),
                "missing_fields": extraction_result.get("missing_fields"),
                "critical_missing": extraction_result.get("critical_missing"),
                "llm_error": extraction_result.get("llm_error"),
            },
            "validation": validation_result,
            "trust": trust_result,
        }
    }


def _checkpoint(stage: str, doc_id: str, result: dict, ms: float) -> dict:
    return {
        "pipeline_stage": stage,
        "document_id": doc_id,
        "processing_ms": ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "error" if result.get("error") else "ok",
    }


def _error_result(doc_id: str, run_id: str, stage: str, message: str) -> dict:
    return {
        "document_id": doc_id,
        "run_id": run_id,
        "verdict": "BLOCKED",
        "trust_score": 0.0,
        "risk_level": "critical",
        "approved": False,
        "recommendation": f"Pipeline blocked at {stage}: {message}",
        "total_processing_ms": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "integrity_flags": [f"pipeline_error:{stage}"],
        "error": True,
        "error_message": message,
    }
