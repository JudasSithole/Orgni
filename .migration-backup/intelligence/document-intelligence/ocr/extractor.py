"""
Orgni Docs — OCR Module — Document text extraction.
Supports PDF (pdfplumber + tesseract fallback) and images (tesseract).
"""
import time
import hashlib
import platform
from typing import Any

import pytesseract
import pdfplumber
from PIL import Image, ImageFilter, ImageOps

from config import get_tesseract_cmd

_cmd = get_tesseract_cmd()
if _cmd:
    pytesseract.pytesseract.tesseract_cmd = _cmd


class DocumentExtractionError(Exception):
    def __init__(self, message: str, doc_id: str, stage: str):
        super().__init__(message)
        self.doc_id = doc_id
        self.stage = stage
        self.message = message

    def to_dict(self) -> dict:
        return {"error": True, "doc_id": self.doc_id, "stage": self.stage, "message": self.message}


def _normalise_image(img: Image.Image) -> Image.Image:
    img = img.convert("L")
    img = ImageOps.autocontrast(img, cutoff=1)
    img = img.filter(ImageFilter.MedianFilter(size=3))
    w, h = img.size
    if w < 1000 or h < 1000:
        scale = max(1000 / w, 1000 / h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img


def _compute_confidence(data: dict) -> dict:
    values = [int(c) for c in data.get("conf", []) if str(c).lstrip("-").isdigit() and int(c) >= 0]
    if not values:
        return {"avg": None, "min": None, "max": None, "low_confidence_words": 0}
    return {
        "avg": round(sum(values) / len(values), 2),
        "min": min(values),
        "max": max(values),
        "low_confidence_words": sum(1 for v in values if v < 60),
    }


def _checksum(text: str) -> str:
    import hashlib
    return hashlib.md5(text.encode()).hexdigest()


def extract(doc_id: str, file_path: str, content_type: str) -> dict[str, Any]:
    try:
        start = time.time()
        if content_type == "application/pdf":
            pages = _extract_pdf(doc_id, file_path)
        else:
            pages = _extract_image(doc_id, file_path)

        return {
            "document_id": doc_id,
            "source_file": file_path,
            "content_type": content_type,
            "page_count": len(pages),
            "total_characters": sum(len(p["text"]) for p in pages),
            "processing_ms": round((time.time() - start) * 1000, 1),
            "ocr_engine": "pdfplumber + tesseract-fallback" if content_type == "application/pdf" else "tesseract",
            "environment": platform.system(),
            "pages": pages,
            "error": False,
        }
    except DocumentExtractionError as e:
        return e.to_dict()
    except Exception as e:
        return {"error": True, "doc_id": doc_id, "stage": "ocr", "message": str(e)}


def _extract_pdf(doc_id: str, file_path: str) -> list[dict]:
    try:
        pdf = pdfplumber.open(file_path)
    except Exception as e:
        raise DocumentExtractionError(f"Cannot open PDF: {e}", doc_id, "pdf_open")

    pages = []
    with pdf:
        for i, page in enumerate(pdf.pages, start=1):
            t = time.time()
            fallback_used = False
            parser = "pdfplumber"
            confidence_stats = None

            try:
                text = page.extract_text() or ""
                if not text.strip():
                    fallback_used = True
                    parser = "tesseract"
                    img = _normalise_image(page.to_image(resolution=200).original)
                    text = pytesseract.image_to_string(img)
                    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                    confidence_stats = _compute_confidence(data)
            except Exception:
                text = ""
                parser = "failed"

            pages.append({
                "page": i,
                "text": text.strip(),
                "char_count": len(text.strip()),
                "ocr_confidence": confidence_stats["avg"] if confidence_stats else None,
                "confidence_detail": confidence_stats,
                "fallback_used": fallback_used,
                "parser": parser,
                "processing_ms": round((time.time() - t) * 1000, 1),
                "checksum": _checksum(text.strip()),
            })
    return pages


def _extract_image(doc_id: str, file_path: str) -> list[dict]:
    try:
        raw = Image.open(file_path)
    except Exception as e:
        raise DocumentExtractionError(f"Cannot open image: {e}", doc_id, "image_open")

    t = time.time()
    img = _normalise_image(raw)
    text = pytesseract.image_to_string(img)
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    confidence_stats = _compute_confidence(data)

    return [{
        "page": 1,
        "text": text.strip(),
        "char_count": len(text.strip()),
        "ocr_confidence": confidence_stats["avg"],
        "confidence_detail": confidence_stats,
        "fallback_used": False,
        "parser": "tesseract",
        "processing_ms": round((time.time() - t) * 1000, 1),
        "checksum": _checksum(text.strip()),
    }]
