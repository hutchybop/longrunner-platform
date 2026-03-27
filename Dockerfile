# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.14.0
FROM node:${NODE_VERSION}-bookworm-slim AS base

ARG PNPM_VERSION=10.33.0
ARG NPM_VERSION=11.9.0

ENV NODE_ENV=production

RUN corepack enable \
  && npm install -g "npm@${NPM_VERSION}" \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

FROM base AS deps

COPY . .

RUN pnpm install --frozen-lockfile --prod

FROM base AS runtime

WORKDIR /app

COPY --from=deps --chown=node:node /app /app

EXPOSE 3000 3001 3002 3003 3004

USER node

CMD ["sh", "-lc", "pnpm -r --parallel --stream run --if-present start"]
