"""
Orgni Docs — FastAPI Endpoint Tests

Fix 7 — tests for /run endpoint
Fix 8 — real PDF and image upload tests
Fix 9 — unsupported file types, oversized files, OCR failure, broken financial math

Run from repo root: python -m pytest tests/test_api.py -v
"""
import sys, os, io, shutil
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_files")
requires_tesseract = pytest.mark.skipif(
    shutil.which("tesseract") is None,
    reason="Tesseract is required for real-image OCR integration tests",
)


# ── Health check ──────────────────────────────────────────────────────────────

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "orgni-docs"


# ── Fix 8: real image upload test ─────────────────────────────────────────────

@requires_tesseract
def test_run_with_real_invoice_image():
    """Upload a real PNG invoice and verify the pipeline runs end-to-end."""
    path = os.path.join(SAMPLE_DIR, "sample_invoice.png")
    with open(path, "rb") as f:
        response = client.post(
            "/run",
            files={"file": ("sample_invoice.png", f, "image/png")}
        )
    assert response.status_code == 200
    body = response.json()
    print(f"\nClean invoice verdict: {body['verdict']}, trust: {body['trust_score']}")

    assert "document_id" in body
    assert "verdict" in body
    assert body["verdict"] in ("APPROVED", "REVIEW", "BLOCKED")
    assert "trust_score" in body
    assert "stage_outputs" in body
    assert "extraction" in body["stage_outputs"]
    assert "field_sources" in body["stage_outputs"]["extraction"]


# ── Fix 9: broken financial math ──────────────────────────────────────────────

@requires_tesseract
def test_run_with_corrupted_invoice_math():
    """Upload an invoice with mismatched totals — must not be APPROVED."""
    path = os.path.join(SAMPLE_DIR, "sample_invoice_corrupted.png")
    with open(path, "rb") as f:
        response = client.post(
            "/run",
            files={"file": ("sample_invoice_corrupted.png", f, "image/png")}
        )
    assert response.status_code == 200
    body = response.json()
    print(f"\nCorrupted invoice verdict: {body['verdict']}, trust: {body['trust_score']}")

    assert body["verdict"] in ("REVIEW", "BLOCKED"), (
        f"Corrupted math should never be APPROVED, got {body['verdict']}"
    )
    validation = body["stage_outputs"]["validation"]
    assert not validation["passed"]
    rule_names = [i["rule"] for i in validation["issues"]]
    assert "math_subtotal_plus_vat" in rule_names


# ── Fix 9: unsupported file type ──────────────────────────────────────────────

def test_run_with_unsupported_file_type():
    fake_file = io.BytesIO(b"not a real document")
    response = client.post(
        "/run",
        files={"file": ("notes.txt", fake_file, "text/plain")}
    )
    assert response.status_code == 415


def test_run_with_unsupported_extension_but_valid_mimetype():
    """Content-type spoofing — extension check must also catch this."""
    fake_file = io.BytesIO(b"%PDF-fake-content")
    response = client.post(
        "/run",
        files={"file": ("document.exe", fake_file, "application/pdf")}
    )
    assert response.status_code == 415


# ── Fix 9: oversized file ─────────────────────────────────────────────────────

def test_run_with_oversized_file():
    """File larger than MAX_FILE_SIZE_BYTES (20MB) must be rejected."""
    oversized = io.BytesIO(b"0" * (21 * 1024 * 1024))  # 21MB
    response = client.post(
        "/run",
        files={"file": ("huge.pdf", oversized, "application/pdf")}
    )
    assert response.status_code == 413


# ── Fix 9: empty file ──────────────────────────────────────────────────────────

def test_run_with_empty_file():
    empty = io.BytesIO(b"")
    response = client.post(
        "/run",
        files={"file": ("empty.pdf", empty, "application/pdf")}
    )
    assert response.status_code == 400


# ── Fix 9: OCR failure on corrupted/unreadable file ───────────────────────────

def test_run_with_corrupted_pdf_bytes():
    """A file claiming to be a PDF but with garbage bytes should fail gracefully, not crash."""
    garbage = io.BytesIO(b"this is not a valid pdf structure at all" * 50)
    response = client.post(
        "/run",
        files={"file": ("broken.pdf", garbage, "application/pdf")}
    )
    # Should not 500 — pipeline must catch the OCR failure and return a structured result
    assert response.status_code in (200, 422), (
        f"Pipeline must handle OCR failure gracefully, got {response.status_code}"
    )
    if response.status_code == 200:
        body = response.json()
        assert body.get("error") or body.get("verdict") == "BLOCKED"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
