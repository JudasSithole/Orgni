# Orgni API server — production image

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

# Copy workspace and installed dependencies from Linux build stage
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/artifacts ./artifacts
COPY --from=build /repo/lib ./lib
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /repo/artifacts/api-server

EXPOSE 8080
USER node

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
