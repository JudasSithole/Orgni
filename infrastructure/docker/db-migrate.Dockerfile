# Orgni DB migrator — one-shot image for applying Drizzle migrations from inside Azure
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
RUN apk add --no-cache postgresql-client
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
COPY infrastructure/docker/migrate-entrypoint.sh /migrate-entrypoint.sh
RUN chmod +x /migrate-entrypoint.sh
CMD ["/migrate-entrypoint.sh"]
