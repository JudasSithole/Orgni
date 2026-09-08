# Orgni Organizational Ontology — production image (Azure Container Apps ready)
# Build from the repo root:
#   docker build -f infrastructure/docker/organizational-ontology.Dockerfile -t orgni-ontology .

FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8100

WORKDIR /app

COPY intelligence/organizational-ontology/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt fastapi uvicorn[standard]

COPY intelligence/organizational-ontology/ ./
# The ontology validates tokens against the canonical schema in packages/contracts.
COPY packages/contracts/schemas/ /app/packages/contracts/schemas/

EXPOSE 8100
USER nobody

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,os,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",8100)}/health').status==200 else 1)"

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8100}"]
