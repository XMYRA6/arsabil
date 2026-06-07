# PostgreSQL + Docker Altyapı Geçişi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SQLite'tan PostgreSQL'e geçiş; local'de `docker compose up` ile tam ortam, production'da Coolify ile deployment.

**Architecture:** Local geliştirmede `docker-compose.dev.yml` ile PostgreSQL container ayağa kalkar, Next.js ayrıca `npm run dev` ile başlar ve `localhost:5432`'ye bağlanır. Production'da Coolify'ın built-in PostgreSQL servisi `DATABASE_URL` env var'ını inject eder, Dockerfile multi-stage build ile standalone Next.js image üretir, container başlarken `prisma migrate deploy` çalışır.

**Tech Stack:** PostgreSQL 16-alpine, Docker Compose, Prisma 5.22 (migrate), Next.js standalone output, Coolify

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `.gitignore` | Güncelleme | `dev.db` ekle |
| `.env.example` | Yeni | PostgreSQL URL formatı — commit edilir |
| `.env.local` | Yeni (gitignored) | Local bağlantı bilgileri — commit edilmez |
| `prisma/schema.prisma` | Güncelleme | `provider = "postgresql"` |
| `docker-compose.dev.yml` | Yeni | Local PostgreSQL container |
| `Dockerfile` | Yeni | Multi-stage production build |
| `next.config.mjs` | Güncelleme | `output: "standalone"` ekle |
| `package.json` | Güncelleme | `dev:db`, `dev:db:stop`, `dev:migrate` scriptleri |

---

## Task 1: .gitignore ve Environment Dosyaları

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `.env.local`

- [ ] **Adım 1: .gitignore'a dev.db ekle**

`.gitignore` dosyasının sonuna ekle:

```
# SQLite dev database (artık kullanılmıyor)
dev.db
dev.db-journal
```

- [ ] **Adım 2: .env.example oluştur**

`arsabil-main/.env.example` dosyasını yarat:

```env
# Veritabanı — PostgreSQL bağlantı URL'i
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/arsabil"

# NextAuth
NEXTAUTH_SECRET=your-32-char-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Adım 3: .env.local oluştur (local dev için)**

`arsabil-main/.env.local` dosyasını yarat:

```env
DATABASE_URL="postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev"
NEXTAUTH_SECRET=local-dev-secret-do-not-use-in-production
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Adım 4: .env.local'ın gitignored olduğunu doğrula**

Mevcut `.gitignore`'da `.env*` satırı var — `.env.local` zaten kapsanıyor. Kontrol et:

```bash
# Çalıştır:
git check-ignore -v .env.local
# Beklenen çıktı:
# .gitignore:33:.env*    .env.local
```

- [ ] **Adım 5: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: add postgresql env template and gitignore dev.db"
```

---

## Task 2: next.config.mjs — Standalone Output

**Files:**
- Modify: `next.config.mjs`

Standalone output, Dockerfile'ın builder aşamasında üretilen `.next/standalone` klasörünün runner aşamasına kopyalanmasını sağlar. Olmadan `COPY --from=builder /app/.next/standalone ./` başarısız olur.

- [ ] **Adım 1: next.config.mjs'i güncelle**

`next.config.mjs` dosyasını tam olarak şu hale getir:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
```

- [ ] **Adım 2: Build'in hâlâ çalıştığını doğrula**

```bash
# Çalıştır (DATABASE_URL henüz gerekli değil — sadece build kontrol):
npm run build
# Beklenen: Build başarılı, ".next/standalone" klasörü oluştu
ls .next/standalone
# Beklenen: server.js dosyası görünür
```

- [ ] **Adım 3: Commit**

```bash
git add next.config.mjs
git commit -m "chore: enable next.js standalone output for docker"
```

---

## Task 3: Prisma Schema — PostgreSQL Provider

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Adım 1: Provider'ı güncelle**

`prisma/schema.prisma` dosyasında `datasource db` bloğunu değiştir:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(Sadece `provider = "sqlite"` → `provider = "postgresql"` değişiyor, başka hiçbir şey değişmiyor.)

- [ ] **Adım 2: Schema formatını doğrula**

```bash
npx prisma@5.22.0 format
# Beklenen: Schema formatted successfully.
```

- [ ] **Adım 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "chore: switch prisma provider from sqlite to postgresql"
```

---

## Task 4: docker-compose.dev.yml

**Files:**
- Create: `docker-compose.dev.yml`

- [ ] **Adım 1: docker-compose.dev.yml oluştur**

`arsabil-main/docker-compose.dev.yml` dosyasını yarat:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: arsabil_postgres_dev
    environment:
      POSTGRES_DB: arsabil_dev
      POSTGRES_USER: arsabil
      POSTGRES_PASSWORD: arsabil_dev_pass
    ports:
      - "5432:5432"
    volumes:
      - arsabil_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arsabil -d arsabil_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  arsabil_pgdata:
    name: arsabil_pgdata
```

- [ ] **Adım 2: Container'ı başlat ve health check'i doğrula**

```bash
docker compose -f docker-compose.dev.yml up -d
# Beklenen: Container başlar

docker compose -f docker-compose.dev.yml ps
# Beklenen: arsabil_postgres_dev   Up (healthy)

# ~10 saniye bekle, sonra:
docker exec arsabil_postgres_dev pg_isready -U arsabil -d arsabil_dev
# Beklenen: localhost:5432 - accepting connections
```

- [ ] **Adım 3: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "feat: add docker compose for local postgresql development"
```

---

## Task 5: package.json Scriptleri

**Files:**
- Modify: `package.json`

- [ ] **Adım 1: Scripts bloğunu güncelle**

`package.json`'daki `"scripts"` bloğunu şu hale getir:

```json
"scripts": {
  "postinstall": "npx prisma@5.22.0 generate",
  "dev": "concurrently \"next dev --webpack\" \"prisma studio\"",
  "dev:next": "next dev --webpack",
  "dev:db": "docker compose -f docker-compose.dev.yml up -d",
  "dev:db:stop": "docker compose -f docker-compose.dev.yml down",
  "dev:migrate": "prisma migrate dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

- [ ] **Adım 2: Script'lerin çalıştığını doğrula**

```bash
npm run dev:db:stop
# Beklenen: Container durur

npm run dev:db
# Beklenen: Container tekrar başlar
```

- [ ] **Adım 3: Commit**

```bash
git add package.json
git commit -m "chore: add dev:db and dev:migrate npm scripts"
```

---

## Task 6: İlk Migration Oluştur

**Files:**
- Create: `prisma/migrations/` (Prisma otomatik oluşturur)

Bu adım PostgreSQL container'ının çalışıyor olmasını gerektirir (Task 4'ten). `.env.local`'daki `DATABASE_URL` kullanılır.

- [ ] **Adım 1: Migration oluştur**

```bash
npx prisma@5.22.0 migrate dev --name init
# Beklenen çıktı:
# Applying migration `20260606000000_init`
# The following migration(s) have been applied:
# migrations/
#   └─ 20260606000000_init/
#     └─ migration.sql
# ✔ Generated Prisma Client
```

- [ ] **Adım 2: Tabloların oluştuğunu doğrula**

```bash
docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "\dt"
# Beklenen: Tüm tablolar listesi görünür
# User, Account, Session, VerificationToken, Report,
# Message, GlobalSettings, ProfitLevel, RiskLevel,
# Listing, Offer, Project, Scenario
```

- [ ] **Adım 3: Seed — GlobalSettings başlangıç kaydı**

GlobalSettings tablosu tek satır bekliyor (`@id @default("settings")`). Uygulama başlarken bu kayıt yoksa `/api/settings` endpoint'i hata verir. Ekle:

```bash
docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "
INSERT INTO \"GlobalSettings\" (id, \"excavationLowPercent\", \"excavationMediumPercent\", \"qualityStandard\", \"qualityMedium\", \"qualityLux\", \"defaultUnitPrice\", \"createdAt\", \"updatedAt\")
VALUES ('settings', 0.01, 0.02, 1.0, 1.2, 1.4, 12000, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"
# Beklenen: INSERT 0 1
```

- [ ] **Adım 4: Seed — ProfitLevel ve RiskLevel başlangıç kayıtları**

```bash
docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "
INSERT INTO \"ProfitLevel\" (id, label, value, \"sortOrder\", \"isDefault\", \"createdAt\", \"updatedAt\") VALUES
  ('profit-1', 'Düşük', 1.15, 0, false, NOW(), NOW()),
  ('profit-2', 'Orta',  1.30, 1, true,  NOW(), NOW()),
  ('profit-3', 'Yüksek',1.50, 2, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO \"RiskLevel\" (id, label, value, \"sortOrder\", \"isDefault\", \"createdAt\", \"updatedAt\") VALUES
  ('risk-0', 'Risksiz', 0,  0, true,  NOW(), NOW()),
  ('risk-1', 'Düşük',   5,  1, false, NOW(), NOW()),
  ('risk-2', 'Orta',    10, 2, false, NOW(), NOW()),
  ('risk-3', 'Yüksek',  15, 3, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"
# Beklenen: INSERT 0 3 ve INSERT 0 4
```

- [ ] **Adım 5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat: add initial postgresql migration (init)"
```

---

## Task 7: Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Adım 1: Dockerfile oluştur**

`arsabil-main/Dockerfile` dosyasını yarat:

```dockerfile
# ---- Bağımlılıklar ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma@5.22.0 generate
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma CLI migration için gerekli (standalone output içinde gelmiyor)
RUN npm install -g prisma@5.22.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
```

- [ ] **Adım 2: .dockerignore oluştur**

`arsabil-main/.dockerignore` dosyasını yarat (build context'i küçülmesi için):

```
node_modules
.next
.git
*.md
dev.db
.env.local
docs
```

- [ ] **Adım 3: Docker image build'ini test et**

```bash
docker build -t arsabil:test .
# Beklenen: Successfully built <image_id>
# Not: Build birkaç dakika sürebilir (npm ci + next build)
```

- [ ] **Adım 4: Image boyutunu kontrol et**

```bash
docker images arsabil:test
# Beklenen: ~300-500 MB arası (standalone sayesinde küçük)
```

- [ ] **Adım 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add multi-stage dockerfile for production"
```

---

## Task 8: Local Geliştirme Doğrulaması

Container çalışıyor olmalı (Task 4), migration yapılmış olmalı (Task 6), `.env.local` mevcut olmalı.

- [ ] **Adım 1: Uygulamayı başlat**

```bash
npm run dev
# Beklenen: Next.js localhost:3000'de başlar
# Prisma Studio localhost:5555'de açılır
```

- [ ] **Adım 2: Veritabanı bağlantısını doğrula**

Tarayıcıda `http://localhost:3000/api/settings` adresine git.

```json
// Beklenen yanıt:
{
  "excavationLowPercent": 0.01,
  "excavationMediumPercent": 0.02,
  "defaultUnitPrice": 12000
}
```

- [ ] **Adım 3: Hesap makinesini doğrula**

`http://localhost:3000/hesapla` adresine git. Sayfa yüklendiğinde ve slider hareket ettirildiğinde hesaplama çalışmalı (DB bağlantısı gerekmez ama profit/risk API'leri çalışmalı).

- [ ] **Adım 4: Kayıt akışını doğrula**

`http://localhost:3000/register` adresine git, test kullanıcısı oluştur.

```bash
# Kullanıcının DB'ye kaydedildiğini doğrula:
docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "SELECT email, role FROM \"User\";"
# Beklenen: Test email'i görünür
```

---

## Task 9: README Güncellemesi

**Files:**
- Modify: `README.md`

- [ ] **Adım 1: Kurulum bölümünü güncelle**

README'deki `## ⚡ Kurulum` bölümünü şu hale getir:

```markdown
## ⚡ Kurulum

### Gereksinimler
- Node.js 20+
- Docker Desktop

### Adımlar

\```bash
# 1. Depo klonla
git clone <repo-url>
cd arsabil

# 2. Bağımlılıkları kur
npm install

# 3. Environment dosyasını oluştur
cp .env.example .env.local
# .env.local içindeki değerler local dev için hazır, değiştirme

# 4. PostgreSQL container'ını başlat
npm run dev:db

# 5. Tabloları oluştur (ilk kurulumda bir kez)
npx prisma migrate dev

# 6. Uygulamayı başlat
npm run dev
\```

Uygulama `http://localhost:3000` adresinde çalışır.
Prisma Studio `http://localhost:5555` adresinde çalışır.

### Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantı URL'i |
| `NEXTAUTH_SECRET` | JWT imzalama anahtarı (32+ karakter) |
| `NEXTAUTH_URL` | Uygulamanın tam URL'i |
```

- [ ] **Adım 2: Commit**

```bash
git add README.md
git commit -m "docs: update setup instructions for postgresql + docker"
```

---

## Task 10: Coolify Deployment Kontrol Listesi

Bu task **kod değişikliği içermez** — Coolify panelinde yapılacak adımları belgeler.

- [ ] **Adım 1: Coolify'da PostgreSQL servisi ekle**
  - Coolify → Resources → New → PostgreSQL
  - Database Name: `arsabil`
  - Username: `arsabil`
  - Güçlü bir şifre belirle ve kaydet
  - Servis adını not al (örn. `arsabil-postgres`)

- [ ] **Adım 2: Coolify'da uygulama servisi ekle**
  - Coolify → Resources → New → Application
  - Source: Git repository
  - Branch: `main`
  - Build Pack: `Dockerfile`
  - Publish Directory: boş bırak (standalone zaten server.js'i root'a koyar)

- [ ] **Adım 3: Environment variables ekle (uygulama servisinde)**

  ```
  DATABASE_URL=postgresql://arsabil:SIFRE@arsabil-postgres:5432/arsabil
  NEXTAUTH_SECRET=<openssl rand -base64 32 ile üret>
  NEXTAUTH_URL=https://arsabil.domain.com
  NODE_ENV=production
  ```

  **Not:** `DATABASE_URL`'deki host, Coolify'ın PostgreSQL servisine verdiği internal hostname olmalı (IP değil, servis adı).

- [ ] **Adım 4: İlk deploy**
  - Deploy butonuna bas
  - Coolify loglarında şunu gör: `Applying migration '..._init'`
  - Ardından: `✔ Database synchronized`
  - Son olarak: Next.js server başlar

- [ ] **Adım 5: Seed production DB (bir kez)**

  İlk deploy sonrası Coolify terminal'inden:

  ```bash
  npx prisma@5.22.0 db seed
  # Eğer seed script yoksa manuel olarak:
  node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  async function main() {
    await prisma.globalSettings.upsert({
      where: { id: 'settings' },
      create: { id: 'settings', excavationLowPercent: 0.01, excavationMediumPercent: 0.02, qualityStandard: 1.0, qualityMedium: 1.2, qualityLux: 1.4, defaultUnitPrice: 12000 },
      update: {},
    });
    await prisma.profitLevel.createMany({ data: [
      { id: 'profit-1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
      { id: 'profit-2', label: 'Orta',  value: 1.30, sortOrder: 1, isDefault: true  },
      { id: 'profit-3', label: 'Yüksek',value: 1.50, sortOrder: 2, isDefault: false },
    ], skipDuplicates: true });
    await prisma.riskLevel.createMany({ data: [
      { id: 'risk-0', label: 'Risksiz', value: 0,  sortOrder: 0, isDefault: true  },
      { id: 'risk-1', label: 'Düşük',   value: 5,  sortOrder: 1, isDefault: false },
      { id: 'risk-2', label: 'Orta',    value: 10, sortOrder: 2, isDefault: false },
      { id: 'risk-3', label: 'Yüksek',  value: 15, sortOrder: 3, isDefault: false },
    ], skipDuplicates: true });
    console.log('Seed tamamlandı');
  }
  main().finally(() => prisma.\$disconnect());
  "
  ```

---

## Geliştirici Hızlı Başvuru

```bash
# PostgreSQL başlat
npm run dev:db

# PostgreSQL durdur  
npm run dev:db:stop

# Yeni migration oluştur (schema değiştirdikten sonra)
npm run dev:migrate

# Prisma Studio (DB browser)
npx prisma studio

# Container log
docker logs arsabil_postgres_dev -f
```
