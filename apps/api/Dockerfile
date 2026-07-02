# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json         ./packages/shared/package.json
COPY apps/api/package.json                ./apps/api/package.json

# Install deps (ignore devDependencies in prod stage)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api        ./apps/api

# Build shared package then API
RUN pnpm --filter @cerp/shared build
RUN pnpm --filter api build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json        ./apps/api/package.json
RUN corepack enable && corepack prepare pnpm@latest --activate \
 && pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/apps/api/dist        ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Non-root user for security
RUN addgroup -S cerp && adduser -S cerp -G cerp
USER cerp

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
