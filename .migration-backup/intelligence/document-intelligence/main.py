"""
Orgni Docs — FastAPI Application
Document understanding, integrity, validation, and extraction pipeline.
Part of the Orgni platform by Olyxee.
"""
import hashlib
import os
import uuid
import zipfile
from xml.etree import ElementTree

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from config import (
    ALLOWED_CONTENT_TYPES,
    ALLOWED_EXTENSIONS,
    ANALYZE_CONTENT_TYPES,
    ANALYZE_EXTENSIONS,
    OFFICE_EXTENSIONS,
    TEXT_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    UPLOAD_DIR,
)
from document_text import extract_document_text
from envelope.builder import SCHEMA_VERSION, analyze_document
from pipeline.runner import run as run_pipeline

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Orgni Docs",
    description="Document understanding, integrity, validation, and extraction. Part of the Orgni platform by Olyxee.",
    version="1.1.0"
)


@app.get("/health")
def health():
    import platform
    return {
        "status": "ok",
        "service": "orgni-docs",
        "platform": "Orgni",
        "version": "1.1.0",
        "environment": platform.system(),
    }


@app.post("/run", response_class=JSONResponse)
async def run(file: UploadFile = File(...)):
    """Run the full Orgni Docs pipeline on an uploaded document."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported type: {file.content_type}")

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported extension: {ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 20MB.")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    save_path = os.path.join(UPLOAD_DIR, f"{doc_id}{ext}")
    with open(save_path, "wb") as f:
        f.write(contents)

    result = run_pipeline(doc_id, save_path, file.content_type)
    return result


@app.post("/v1/analyze", response_class=JSONResponse)
async def analyze(
    file: UploadFile = File(...),
    source_id: str = Form(...),
    tenant_id: str = Form(...),
):
    """
    Document Intelligence entry point for the Phase 1 pipeline.

    Always returns a normalized envelope (schema_version 0.1.0). Documents that
    are unsupported or unreadable come back as document_type UNKNOWN with
    warnings and HTTP 200 — the ingestion pipeline decides what to do about
    them, and one bad document must not surface as a transport error.
    """
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Max 20MB.")

    checksum = hashlib.sha256(contents).hexdigest()
    filename = file.filename or "unnamed"
    content_type = file.content_type or "application/octet-stream"
    ext = os.path.splitext(filename)[-1].lower()

    unsupported = (
        content_type not in ANALYZE_CONTENT_TYPES and ext not in ANALYZE_EXTENSIONS
    )
    if unsupported or len(contents) == 0:
        reason = "empty_file" if len(contents) == 0 else f"unsupported_type: {content_type}"
        return {
            "source_id": source_id,
            "source_type": "UPLOAD",
            "document_type": "UNKNOWN",
            "content": {"text": "", "language": "und"},
            "extracted_fields": {},
            "tables": [],
            "metadata": {
                "filename": filename,
                "mime_type": content_type,
                "checksum": checksum,
                "tenant_id": tenant_id,
            },
            "evidence_locations": [],
            "confidence": 0.0,
            "warnings": [reason],
            "schema_version": SCHEMA_VERSION,
            "extraction_status": "LOW_CONFIDENCE",
        }

    # Text and Office documents are normalized to text before analysis. PDF and
    # image files continue through the OCR path below.
    if ext in TEXT_EXTENSIONS or ext in OFFICE_EXTENSIONS:
        try:
            text = extract_document_text(contents, ext)
        except (ValueError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
            return {
                "source_id": source_id,
                "source_type": "UPLOAD",
                "document_type": "UNKNOWN",
                "content": {"text": "", "language": "und"},
                "extracted_fields": {},
                "tables": [],
                "metadata": {
                    "filename": filename,
                    "mime_type": content_type,
                    "checksum": checksum,
                    "tenant_id": tenant_id,
                },
                "evidence_locations": [],
                "confidence": 0.0,
                "warnings": [f"unreadable_document: {exc}"],
                "schema_version": SCHEMA_VERSION,
                "extraction_status": "LOW_CONFIDENCE",
            }
        return analyze_document(
            source_id=source_id,
            file_path=None,
            content_type=content_type,
            filename=filename,
            checksum=checksum,
            tenant_id=tenant_id,
            text=text,
        )

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    save_path = os.path.join(UPLOAD_DIR, f"{doc_id}{ext or '.bin'}")
    with open(save_path, "wb") as handle:
        handle.write(contents)

    return analyze_document(
        source_id=source_id,
        file_path=save_path,
        content_type=content_type,
        filename=filename,
        checksum=checksum,
        tenant_id=tenant_id,
    )
