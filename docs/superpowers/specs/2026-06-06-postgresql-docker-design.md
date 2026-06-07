# ArsaBil — PostgreSQL + Docker Altyapı Tasarımı

**Tarih:** 2026-06-06  
**Kapsam:** SQLite → PostgreSQL geçişi, local Docker ortamı, Coolify production deployment  
**Yaklaşım:** Docker Compose Dev + Coolify Prod (Yaklaşım 2)

---

## Hedef

- Local geliştirmede tek komutla (`docker compose up`) tam PostgreSQL ortamı
- Production'da Coolify built-in PostgreSQL servisi
- Her iki ortamda aynı Prisma schema ve migration dosyaları
- `db push` yerine versiyonlu `migrate dev` / `migrate deploy` akışı

---

## Mimari

### Local Geliştirme
```
docker compose -f docker-compose.dev.yml up -d
    → PostgreSQL container (localhost:5432)

npm run dev
    → Next.js (localhost:3000)
    → Prisma → DATABASE_URL → PostgreSQL
```

### Production (Coolify)
```
Coolify PostgreSQL Servisi
    → DATABASE_URL env var (Coolify inject eder)

Coolify App Servisi (Dockerfile ile build)
    → prisma migrate deploy (container başlamadan önce)
    → node server.js
```

---

## Değişecek Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `prisma/schema.prisma` | Güncelleme | `provider = "postgresql"` |
| `docker-compose.dev.yml` | Yeni | Local PostgreSQL container |
| `Dockerfile` | Yeni | Multi-stage production build |
| `.env.local` | Yeni (gitignored) | Local bağlantı bilgileri |
| `.env.example` | Güncelleme | PostgreSQL URL formatı |
| `.gitignore` | Güncelleme | `.env.local` ve `dev.db` ekle |
| `package.json` | Güncelleme | Migration scriptleri |
| `next.config.mjs` | Güncelleme | `output: "standalone"` |

---

## Detaylı Konfigürasyonlar

### `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### `docker-compose.dev.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: arsabil_dev
      POSTGRES_USER: arsabil
      POSTGRES_PASSWORD: arsabil_dev_pass
    ports:
      - "5432:5432"
    volumes:
      - arsabil_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arsabil"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  arsabil_pgdata:
```

### `.env.local` (gitignored)
```env
DATABASE_URL="postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev"
NEXTAUTH_SECRET=local-dev-secret-change-in-prod
NEXTAUTH_URL=http://localhost:3000
```

### `.env.example`
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/arsabil"
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### `Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### `package.json` scriptleri
```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "dev:db": "docker compose -f docker-compose.dev.yml up -d",
    "dev:db:stop": "docker compose -f docker-compose.dev.yml down",
    "dev:migrate": "prisma migrate dev",
    "build": "next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

### `next.config.mjs`
```js
const nextConfig = {
  output: "standalone",  // Dockerfile'daki standalone copy için gerekli
  // ... mevcut ayarlar
};
```

---

## Migration Stratejisi

### `db push` → `migrate dev` Geçişi

Mevcut `dev.db`'de anlamlı production verisi yok. Sıfırdan başlıyoruz:

```bash
# 1. PostgreSQL container'ı başlat
npm run dev:db

# 2. İlk migration'ı oluştur
npx prisma migrate dev --name init

# 3. Migration dosyaları prisma/migrations/ altında oluşur
# Bu dosyalar git'e commit edilir
```

### Production'da Otomatik Migration
`CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]`

`migrate deploy` idempotent'tir: zaten uygulanmış migration'ları atlar, sadece yenilerini çalıştırır. Her deployment'ta güvenle çalışır.

---

## Coolify Kurulum Adımları (Panel)

1. **PostgreSQL Servisi Ekle**
   - Coolify → New Resource → PostgreSQL
   - DB adı: `arsabil`, kullanıcı: `arsabil`
   - Güçlü bir şifre belirle

2. **App Servisi Ekle**
   - Coolify → New Resource → Application → Git repo
   - Build pack: `Dockerfile`
   - Branch: `main`

3. **Environment Variables (App Servisinde)**
   ```
   DATABASE_URL=postgresql://arsabil:SIFRE@postgres-servis-adi:5432/arsabil
   NEXTAUTH_SECRET=<random-32-char-string>
   NEXTAUTH_URL=https://arsabil.domain.com
   ```

4. **Deploy**
   - İlk deploy'da `prisma migrate deploy` otomatik çalışır
   - Tablolar oluşur, uygulama başlar

---

## Geliştirici Onboarding (README güncellemesi)

```bash
# Yeni başlayan geliştirici için:
git clone <repo>
cd arsabil
npm install
cp .env.example .env.local   # Düzenle (local için değerler zaten doğru)
npm run dev:db                # PostgreSQL container başlat
npx prisma migrate dev        # Tabloları oluştur
npm run dev                   # Uygulamayı başlat
```

---

## Kapsam Dışı

- pgAdmin veya DB yönetim arayüzü (Prisma Studio yeterli: `npx prisma studio`)
- Otomatik yedekleme (Coolify'ın built-in yedekleme özelliği kullanılacak)
- CI/CD pipeline (sonraki fazda değerlendirilebilir)
- Staging ortamı
