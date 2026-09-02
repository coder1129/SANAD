# =====================================================
# Stage 1: install every dependency (build needs devDependencies)
# =====================================================
FROM node:22-alpine AS deps

WORKDIR /app

# openssl is required by Prisma's query engine; the toolchain builds argon2.
RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# =====================================================
# Stage 2: compile TypeScript to dist/
# =====================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npm run build

# =====================================================
# Stage 3: production dependencies only
# =====================================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json ./
COPY prisma ./prisma

# Scripts stay enabled so argon2 resolves its native binding, then the Prisma
# client is generated against the production dependency tree.
RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# =====================================================
# Stage 4: runtime
# =====================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs package.json ./
COPY --chown=nestjs:nodejs scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --chown=nestjs:nodejs scripts/preflight.cjs ./scripts/preflight.cjs

# Local-disk fallback for uploads. Production validation requires R2/S3
# credentials, so this stays empty there; mount a volume if you opt out.
RUN mkdir -p /app/uploads && \
    chmod 0555 /app/scripts/docker-entrypoint.sh && \
    chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
