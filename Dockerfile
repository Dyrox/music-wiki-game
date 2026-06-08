# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_BASE_PATH=/musicwiki/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
ENV WEB_DIST_DIR=/app/web-dist

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN pnpm install --prod --filter server --frozen-lockfile && pnpm store prune

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web-dist

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
