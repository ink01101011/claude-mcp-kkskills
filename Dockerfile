# syntax=docker/dockerfile:1.6
#
# kkskills-mcp — containerised HTTP transport.
#
# Multi-stage build:
#   1. build     — install all deps, compile TypeScript → dist/
#   2. prod-deps — clean install of production-only modules
#   3. runtime   — minimal image: node + dist/ + prod node_modules + skills/
#
# Build:   docker build -t kkskills-mcp:latest .
# Run:     docker run --rm -p 3030:3030 kkskills-mcp:latest
# Health:  curl http://127.0.0.1:3030/healthz

# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /build

# Install ALL deps (incl. devDependencies for tsc)
COPY mcp-server/package.json mcp-server/package-lock.json ./
RUN npm ci

# Copy sources and build
COPY mcp-server/tsconfig.json ./
COPY mcp-server/src ./src
RUN npm run build

# ─── Stage 2: production-only dependencies ───────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /build
COPY mcp-server/package.json mcp-server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Bring in compiled JS + production deps + package.json (needed for "type": "module")
COPY --from=build     /build/dist          ./dist
COPY --from=prod-deps /build/node_modules  ./node_modules
COPY --from=build     /build/package.json  ./package.json

# Ship the skills baked into the image. Mount over with a volume to iterate
# without rebuilding (see docker-compose.yml).
COPY skills ./skills

# Sensible HTTP defaults — override at runtime via -e or compose env.
ENV KKSKILLS_TRANSPORT=http \
    KKSKILLS_HOST=0.0.0.0 \
    KKSKILLS_PORT=3030 \
    KKSKILLS_ROOT=/app/skills \
    NODE_ENV=production

EXPOSE 3030

# Alpine ships BusyBox wget — used for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3030/healthz || exit 1

# Run as the unprivileged `node` user provided by the official image.
USER node

CMD ["node", "dist/index.js"]
