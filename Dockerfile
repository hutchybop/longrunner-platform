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

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=5 \
  CMD node -e "const ports=[3000,3001,3002,3003,3004];Promise.all(ports.map((port)=>fetch('http://127.0.0.1:'+port+'/health').then((res)=>{if(!res.ok){throw new Error(String(port));}}))).then(()=>process.exit(0)).catch(()=>process.exit(1));"

USER node

CMD ["sh", "-lc", "pnpm -r --parallel --stream run --if-present start"]
