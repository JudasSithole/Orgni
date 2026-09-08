# Orgni Document Intelligence — production image (Azure Container Apps ready)
# Build from the repo root:
#   docker build -f infrastructure/docker/document-intelligence.Dockerfile -t orgni-document-intelligence .

FROM python:3.12-slim AS runtime

# Tesseract is the only local processing dependency; everything else is pure
# Python. poppler-utils backs pdfplumber's page rendering for scanned PDFs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

COPY intelligence/document-intelligence/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY intelligence/document-intelligence/ ./

# Uploads are written to a writable scratch dir; the service is otherwise
# stateless, so replicas can run side by side.
ENV UPLOAD_DIR=/tmp/orgni-uploads
RUN mkdir -p /tmp/orgni-uploads && chown -R nobody:nogroup /tmp/orgni-uploads

EXPOSE 8000
USER nobody

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,os,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",8000)}/health').status==200 else 1)"

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
