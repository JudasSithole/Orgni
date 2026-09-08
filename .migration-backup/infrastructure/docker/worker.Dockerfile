# Orgni worker — production image (Azure Container Apps ready)
# Build from the repo root:
#   docker build -f infrastructure/docker/worker.Dockerfile -t orgni-worker .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY intelligence ./intelligence
COPY lib ./lib
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/worker run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# esbuild bundles all deps (incl. workspace packages) into dist
COPY --from=build /repo/apps/worker/dist ./dist
COPY --from=build /repo/apps/worker/package.json ./package.json
USER node
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
