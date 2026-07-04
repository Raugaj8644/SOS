# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9 --quiet

# Copy workspace manifests FIRST (api + shared only)
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Override workspace to ONLY include api + shared (strip web/mobile)
RUN printf 'packages:\n  - packages/shared\n  - apps/api\n' > pnpm-workspace.yaml

# Install (no lockfile = resolves only api+shared deps)
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared (tiny, ~4 files)
RUN pnpm --filter @cerp/shared build

# Build API
RUN pnpm --filter @cerp/api build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@9 --quiet

# Copy workspace config (api+shared only)
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install production deps only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
