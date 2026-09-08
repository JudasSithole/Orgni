#!/usr/bin/env bash
# Build all production Docker images from the repo root.
set -euo pipefail
cd "$(dirname "$0")/../.."

TAG="${1:-local}"

docker build -f infrastructure/docker/api.Dockerfile -t "orgni-api:${TAG}" .
docker build -f infrastructure/docker/worker.Dockerfile -t "orgni-worker:${TAG}" .

echo "Built orgni-api:${TAG} and orgni-worker:${TAG}"
