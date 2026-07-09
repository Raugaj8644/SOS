# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9 --quiet

# Copy only api package manifests
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Override workspace to ONLY api — no web, no mobile, no shared
RUN printf 'packages:\n  - apps/api\n' > pnpm-workspace.yaml

# Install only api deps (no lockfile needed since workspace is trimmed)
RUN pnpm install --no-frozen-lockfile

# Copy api source
COPY apps/api ./apps/api

# Build with increased heap to prevent tsc OOM on NestJS decorator metadata
RUN NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @cerp/api build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@9 --quiet

# Copy trimmed workspace config
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY apps/api/package.json ./apps/api/

# Install production deps only
RUN pnpm install --prod --no-frozen-lockfile

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
