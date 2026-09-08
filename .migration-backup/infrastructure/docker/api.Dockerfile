# Orgni API — production image (Azure Container Apps ready)
# Build from the repo root:
#   docker build -f infrastructure/docker/api.Dockerfile -t orgni-api .

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
RUN pnpm --filter @workspace/api run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# esbuild bundles all deps into dist, so only the bundle is needed at runtime
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
EXPOSE 8080
USER node
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
