"""
Orgni Docs — Global Configuration

All environment-based settings live here.
No other module should hardcode paths, model names, or keys.
"""
import os
import platform


def get_tesseract_cmd() -> str | None:
    env_path = os.environ.get("TESSERACT_CMD")
    if env_path:
        return env_path
    if platform.system() == "Windows":
        default = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(default):
            return default
    return None


# Anthropic / LLM configuration (fix 3 — never hardcode model name)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-4-20250514")
LLM_MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "500"))

# Storage
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://orgni:orgni@localhost:5432/orgni_docs")

# Upload limits
MAX_FILE_SIZE_BYTES = int(os.environ.get("MAX_FILE_SIZE_BYTES", 20 * 1024 * 1024))  # 20MB

# Legacy /run integrity pipeline: OCR-based, so binary document formats only.
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

# Phase 1 /v1/analyze accepts common business-document formats in addition to
# scanned PDFs and images. Modern Office files are extracted from their
# XML-based containers before entering the same analysis pipeline.
TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".htm"}
OFFICE_EXTENSIONS = {".docx", ".xlsx", ".pptx", ".rtf"}
ANALYZE_CONTENT_TYPES = ALLOWED_CONTENT_TYPES | {
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/tab-separated-values",
    "application/json",
    "application/xml",
    "text/xml",
    "text/html",
    "application/rtf",
    "text/rtf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
ANALYZE_EXTENSIONS = ALLOWED_EXTENSIONS | TEXT_EXTENSIONS | OFFICE_EXTENSIONS
