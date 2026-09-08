"""Real-format extraction coverage for the 40-document Meridian corpus."""

from __future__ import annotations

import hashlib
import json
import mimetypes
from pathlib import Path

from document_text import extract_document_text
from envelope.builder import analyze_document


REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE = REPO_ROOT / "apps" / "worker" / "tests" / "fixtures" / "meridian"
DOCUMENTS = FIXTURE / "documents"


def test_all_meridian_documents_produce_normalized_envelopes():
    manifest = json.loads((FIXTURE / "manifest.json").read_text(encoding="utf-8"))
    files = sorted(DOCUMENTS.iterdir())
    assert len(files) == 40
    assert len(manifest["files"]) == 40

    envelopes = []
    for index, path in enumerate(files):
        contents = path.read_bytes()
        extension = path.suffix.lower()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        text = None
        file_path = str(path)
        if extension in {
            ".csv", ".txt", ".xml", ".json", ".html", ".rtf",
            ".docx", ".xlsx", ".pptx",
        }:
            text = extract_document_text(contents, extension)
            file_path = None

        envelope = analyze_document(
            source_id=f"src_meridian_{index:02d}",
            file_path=file_path,
            content_type=content_type,
            filename=path.name,
            checksum=hashlib.sha256(contents).hexdigest(),
            tenant_id="tenant_meridian_ci",
            text=text,
        )
        envelopes.append(envelope)

    assert len(envelopes) == 40
    assert all(envelope["schema_version"] == "0.1.0" for envelope in envelopes)
    assert all(envelope["source_id"].startswith("src_meridian_") for envelope in envelopes)
    # OCR availability can affect the scanned PNG locally; the other 39 files
    # must always yield text from their real source formats.
    assert sum(bool(envelope["content"]["text"].strip()) for envelope in envelopes) >= 39
