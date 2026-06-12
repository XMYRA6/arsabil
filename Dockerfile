# ---- Bağımlılıklar ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# --ignore-scripts: postinstall'daki prisma generate'i burada atla (builder stage'de ayri yapilir)
# --strict-ssl=false: Docker Desktop TLS interception (Windows/corporate) bypass
RUN npm ci --ignore-scripts --strict-ssl=false

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NODE_TLS_REJECT_UNAUTHORIZED=0: binaries.prisma.sh icin TLS interception bypass
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma@5.22.0 generate
# schema-engine-linux-musl-openssl-3.0.x: Alpine 3.17+ OpenSSL 3.x icin schema engine indir
# (npm paketi yalnizca linux-musl [OpenSSL 1.1.x] versiyonunu icerir)
RUN ENGINES_HASH=605197351a3c8bdd595af2d2a9bc3025bca48ea2 && \
    wget -q --no-check-certificate \
      "https://binaries.prisma.sh/all_commits/${ENGINES_HASH}/linux-musl-openssl-3.0.x/schema-engine.gz" \
      -O /tmp/schema-engine.gz && \
    gunzip -c /tmp/schema-engine.gz > node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x && \
    chmod +x node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x && \
    rm /tmp/schema-engine.gz
# NODE_TLS_REJECT_UNAUTHORIZED=0: Google Fonts HTTPS + Prisma binaries TLS interception bypass
# --webpack: Turbopack yerine webpack kullan (Turbopack Rust HTTP clienti NODE_TLS'i yok sayar)
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx next build --webpack

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma engine binary yollarini dogrudan belirt (platform auto-detection atla)
# Alpine 3.23 libssl.so.3 iceriyor ancak openssl CLI binary yok → auto-detection basarisiz
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-linux-musl-openssl-3.0.x
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

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

CMD ["sh", "-c", "NODE_TLS_REJECT_UNAUTHORIZED=0 node node_modules/prisma/build/index.js migrate deploy && node server.js"]
