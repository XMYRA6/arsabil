# ---- Bağımlılıklar ----
FROM node:20-alpine AS deps
WORKDIR /app
# INSECURE_BUILD=1: YALNIZ TLS-intercepting proxy arkasindaki lokal build'ler icin
# (orn. gelistirici makinesi). Production/Coolify build'inde KULLANMA.
ARG INSECURE_BUILD=0
COPY package*.json ./
# --ignore-scripts: postinstall'daki prisma generate'i burada atla (builder stage'de ayri yapilir)
RUN if [ "$INSECURE_BUILD" = "1" ]; then npm config set strict-ssl false; fi \
    && npm ci --ignore-scripts

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
ARG INSECURE_BUILD=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Alpine OpenSSL 3.x icin schema engine: npm paketi yalnizca linux-musl (OpenSSL 1.1.x) icerir.
# Engine hash @prisma/engines-version paketinden pinlenmistir (5.22.0).
RUN if [ "$INSECURE_BUILD" = "1" ]; then export NODE_TLS_REJECT_UNAUTHORIZED=0 WGET_FLAGS=--no-check-certificate; fi; \
    npx prisma@5.22.0 generate \
    && ENGINES_HASH=605197351a3c8bdd595af2d2a9bc3025bca48ea2 \
    && wget -q $WGET_FLAGS \
      "https://binaries.prisma.sh/all_commits/${ENGINES_HASH}/linux-musl-openssl-3.0.x/schema-engine.gz" \
      -O /tmp/schema-engine.gz \
    && gunzip -c /tmp/schema-engine.gz > node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x \
    && chmod +x node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x \
    && rm /tmp/schema-engine.gz \
    && npx next build --webpack

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma engine binary yollarini dogrudan belirt (platform auto-detection atla)
# Alpine 3.23 libssl.so.3 iceriyor ancak openssl CLI binary yok → auto-detection basarisiz
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
# Prisma CLI telemetri/surum kontrolu disari cikmasin (runtime'da dis ag gerekmez)
ENV CHECKPOINT_DISABLE=1

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI (migrate deploy icin) - global install yerine local paket kullan
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma

# Source map'ler imaja girmesin (TS kaynagi geri cikarilabilir)
RUN find .next -name '*.js.map' -delete

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
