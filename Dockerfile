# syntax=docker/dockerfile:1

# Builds contracts, API and interface once, then keeps only what each runtime image needs.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# The API: one process, data under /data (database, backups, activity log).
FROM node:24-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5002 \
    TRUST_PROXY=1 \
    DB_PATH=/data/database.sqlite \
    BACKUP_DIR=/data/backups \
    AUDIT_LOG_PATH=/data/admin-audit.jsonl
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 5002
CMD ["node", "backend/dist/index.js"]

# The web entry: Caddy serves the built interface and forwards /api to the API, with HTTPS and HTTP/2.
FROM caddy:2 AS web
COPY --from=build /app/frontend/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
