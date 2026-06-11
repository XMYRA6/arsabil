# ArsaBil — Production Readiness (Canlıya Çıkış) Tasarım Dokümanı

**Tarih:** 2026-06-11
**Durum:** Onaylandı (Yaklaşım A — Pragmatik tek-VPS)
**Hedef ortam:** Coolify / kendi VPS (Docker), PostgreSQL aynı sunucuda

---

## 0. Sıralama & Branch Stratejisi

- **Ön koşul:** `feature/aurora-redesign` branch'i kullanıcı tarafından görsel test edilip `main`'e merge edilir.
- Bu faz, merge sonrası `main`'den açılan **`feature/production-readiness`** branch'inde yapılır.
- Gerekçe: lint temizliği ve e2e altyapısı çok dosyaya dokunur; aurora ile paralel gitmek conflict üretir.

---

## 1. Kapsam

| # | İş kalemi | Özet |
|---|-----------|------|
| 1 | Deploy paketi | compose.prod, health endpoint, Dockerfile sertleştirme, env şablonu, backup prosedürü |
| 2 | Sentry | Hata takibi client+server, source map upload |
| 3 | Rate limiting + güvenlik | In-memory limiter, security header'lar, build bayrakları |
| 4 | Playwright e2e | 3 kritik akış (smoke), test DB + seed |
| 5 | CI | GitHub Actions: lint + tsc + jest + e2e |
| 6 | Lint temizliği | ~250 ihlal sıfırlanır, junk kopya silinir, lint gate |

**Kapsam dışı:** Redis, staging ortamı, pg_dump sidecar/S3 offsite backup, kapsamlı e2e suite (10+ senaryo), CSP enforce modu, load testing. Bunlar trafik/ölçek gerektirdiğinde ayrı faz olur.

---

## 2. Deploy Paketi (Coolify)

### 2.1 Mevcut durum
`Dockerfile` zaten var: node:20-alpine, standalone output, entrypoint'te `prisma migrate deploy && node server.js`. `.dockerignore` ve `.env.example` mevcut. `docker-compose.prod.yml` ve health endpoint YOK.

### 2.2 Dockerfile iyileştirmeleri
- Runner stage'de **non-root kullanıcı**: `USER node` (öncesinde dosya sahiplikleri `--chown=node:node` ile kopyalanır).
- **HEALTHCHECK** direktifi: `wget -qO- http://localhost:3000/api/health || exit 1`, interval 30s, start-period 40s.
- Mevcut `prisma migrate deploy` entrypoint'i korunur (deploy'da migration otomatik).

### 2.3 docker-compose.prod.yml
```yaml
services:
  app:
    build: .
    restart: unless-stopped
    ports: ["3000:3000"]
    env_file: .env.production
    depends_on:
      postgres: { condition: service_healthy }
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment: POSTGRES_DB/USER/PASSWORD (env'den)
    volumes: [arsabil_pgdata_prod:/var/lib/postgresql/data]
    healthcheck: pg_isready
    # Dış port AÇILMAZ — sadece internal network
```
Coolify'da tek "Docker Compose" resource olarak kurulur; SSL/domain Coolify (Traefik + Let's Encrypt) tarafından yönetilir.

`.env.production` sunucuda `.env.example`'dan kopyalanıp doldurulur; git'e GİRMEZ (`.gitignore`'da olduğu doğrulanır). Coolify kullanılıyorsa env değişkenleri Coolify UI'dan da verilebilir — DEPLOYMENT.md iki yolu da anlatır.

### 2.4 Health endpoint — `src/app/api/health/route.ts`
- `GET /api/health` → `prisma.$queryRaw\`SELECT 1\`` + `{ status: "ok", db: "ok", uptime }` (200) veya `{ status: "degraded", db: "fail" }` (503).
- Auth gerektirmez; middleware matcher'ına EKLENMEZ.
- Kullanım: Docker HEALTHCHECK + Coolify health URL.

### 2.5 Env şablonu
`.env.example` prod değişkenleriyle tamamlanır: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (yalnız CI/build). Her değişkenin yanına tek satır açıklama.

### 2.6 Backup & restore
- **Backup:** Coolify'ın yerleşik zamanlanmış database backup özelliği (günlük, 7 gün saklama önerisi).
- **Restore prosedürü** `docs/DEPLOYMENT.md`'ye yazılır: backup dosyasından `pg_restore`/`psql` adımları, migration durumu kontrolü (`prisma migrate status`).
- `docs/DEPLOYMENT.md` ayrıca: Coolify kurulum adımları, env değişkenleri, ilk deploy, rollback (önceki imaja dön + gerekirse migration geri alma notu).

---

## 3. Sentry

- Paket: `@sentry/nextjs`. Dosyalar: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.mjs`'e `withSentryConfig` sarmalaması.
- DSN: `NEXT_PUBLIC_SENTRY_DSN` env — boşsa Sentry tamamen devre dışı (lokal geliştirme etkilenmez).
- `tracesSampleRate: 0.1`; `sendDefaultPii: false`.
- Filtreleme: `NEXT_NOT_FOUND`, `NEXT_REDIRECT` ve abort hataları `beforeSend`'de elenir.
- Source map upload: yalnız production build'de, `SENTRY_AUTH_TOKEN` varsa (CI'da secret).

---

## 4. Rate Limiting + Güvenlik

### 4.1 `src/lib/rate-limit.ts`
- In-memory **sliding window** sayaç; `Map<string, timestamps[]>` + periyodik temizlik (LRU benzeri üst sınır: 10k anahtar).
- Arayüz: `checkRateLimit(key: string, opts: { limit: number; windowMs: number }): { ok: boolean; retryAfterSec?: number }`.
- Tek instance varsayımı dokümante edilir; ileride Redis'e geçiş yalnız bu dosyayı değiştirir.
- Aşımda route handler `429` + `Retry-After` header döner.

### 4.2 Uygulama noktaları (route handler içinde)
| Uç | Anahtar | Limit |
|----|---------|-------|
| Login (`/api/auth/...` credential callback öncesi sarmalayıcı veya custom login route) | IP | 5/dk |
| Register (`/api/register`) | IP | 3/saat |
| Upload (`/api/upload`) | userId | 10/saat |
| Mesaj + teklif POST | userId | 30/dk |

- NextAuth middleware'ine DOKUNULMAZ; login limiti NextAuth `authorize` içinde `checkRateLimit` çağrısıyla uygulanır.
- IP tespiti: `x-forwarded-for` ilk değer (Coolify/Traefik arkasında doğru), yoksa `x-real-ip`.

### 4.3 Security header'lar (`next.config.mjs` → `headers()`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` (Leaflet konum izni için self)
- `Content-Security-Policy-Report-Only`: temel politika — enforce ayrı fazda.

### 4.4 Build bayrakları
- `typescript.ignoreBuildErrors` → **hemen kaldırılır** (tsc temiz).
- `eslint.ignoreDuringBuilds` → lint temizliği (bölüm 6) bittikten sonra kaldırılır.

---

## 5. Playwright E2E (Smoke)

### 5.1 Akışlar (3 test dosyası)
1. **auth-hesapla:** kayıt → login → /hesapla'da form doldur → sonuç paneli + fizibilite skoru görünür.
2. **ilan-yasam-dongusu:** kullanıcı wizard ile ilan oluşturur (PENDING) → admin login → onaylar → marketplace'te kart görünür.
3. **mesajlasma:** kullanıcı A, kullanıcı B'ye mesaj gönderir → B'nin inbox'ında görünür (SSE veya sayfa yenileme toleransı ile).

### 5.2 Altyapı
- `playwright.config.ts`: chromium-only, `baseURL: http://localhost:3000`, `webServer` ile production build (`next build && next start`) otomatik başlatılır.
- **Test DB:** `arsabil_test` (aynı dev Postgres container'ında ikinci database). `DATABASE_URL` test env'den.
- `e2e/global-setup.ts`: migrate + seed (1 admin, 2 user, 1 district price kaydı). Her koşuda DB sıfırlanır (truncate).
- Script: `npm run test:e2e`. Jest'ten tamamen ayrı (`e2e/` klasörü, jest config'e dahil edilmez).
- Cloudinary/Resend: e2e'de gerçek çağrı YAPILMAZ — fotoğrafsız ilan akışı kullanılır, e-posta fire-and-forget olduğundan engel değil.

---

## 6. CI — GitHub Actions

- `.github/workflows/ci.yml`: push (main) + pull_request tetikleyici.
- Adımlar: checkout → node 20 + npm ci → `npx tsc --noEmit` → `npx eslint .` → `npx jest --silent` → Playwright (postgres:16 service container + `npx playwright install chromium`).
- Sentry source map upload CI'da yalnız main push'ta (`SENTRY_AUTH_TOKEN` secret tanımlıysa).
- Repo GitHub'da değilse workflow dosyası hazırlanır, aktivasyon kullanıcının remote eklemesine bırakılır.

---

## 7. Lint Temizliği

1. `arsabil-main/arsabil-main` iç içe junk kopya **silinir** (varsa).
2. `npx eslint .` ile envanter çıkarılır; ihlaller kategori kategori düzeltilir (unused vars, `any`, unescaped entities, hooks deps...).
3. Prensip: **kodu düzelt, kuralı gevşetme.** Yalnız bilinçli istisnalar satır bazlı `eslint-disable-next-line` + gerekçe yorumu alır.
4. Sıfır ihlale ulaşınca `next.config.mjs`'ten `ignoreDuringBuilds` kaldırılır; CI'da lint gate zaten aktif.

---

## 8. Dosya Haritası (yeni/değişen)

```
Dockerfile                          (değişir: USER node, HEALTHCHECK)
docker-compose.prod.yml             (yeni)
.env.example                        (genişler)
next.config.mjs                     (headers(), withSentryConfig, bayraklar)
sentry.client.config.ts             (yeni)
sentry.server.config.ts             (yeni)
sentry.edge.config.ts               (yeni)
playwright.config.ts                (yeni)
e2e/global-setup.ts                 (yeni)
e2e/auth-hesapla.spec.ts            (yeni)
e2e/ilan-yasam-dongusu.spec.ts      (yeni)
e2e/mesajlasma.spec.ts              (yeni)
.github/workflows/ci.yml            (yeni)
docs/DEPLOYMENT.md                  (yeni)
src/app/api/health/route.ts         (yeni)
src/lib/rate-limit.ts               (yeni)
src/lib/auth.ts                     (değişir: authorize'da rate limit)
src/app/api/register/route.ts       (değişir: rate limit)
src/app/api/upload/route.ts         (değişir: rate limit)
src/app/api/messages|offers POST    (değişir: rate limit)
+ lint düzeltmeleri (çok dosya)
```

---

## 9. Test Stratejisi

- `src/lib/rate-limit.ts` → jest unit testleri (pencere kayması, limit aşımı, temizlik).
- Health endpoint → jest/route testi (DB mock).
- Geri kalanı e2e smoke + mevcut 60 jest testi koruması.
- Tamamlama kriteri: `tsc` 0 hata, `eslint` 0 ihlal, jest hepsi yeşil, 3 e2e akışı lokalde yeşil, `docker compose -f docker-compose.prod.yml up` ile uygulama lokalde ayağa kalkıp `/api/health` 200 dönüyor.

---

## 10. Riskler & Notlar

- **SSE mesajlaşma:** tek container + Traefik'te çalışır; proxy buffering kapalı olmalı (Coolify/Traefik varsayılanı uygun, DEPLOYMENT.md'de doğrulama adımı).
- **In-memory rate limit** container restart'ında sıfırlanır — kabul edilen trade-off (Yaklaşım A).
- **CSP** report-only başlar; inline style'lar (styled-jsx/CSS modules inline'ları) enforce'u şimdilik engeller.
- **`prisma migrate deploy` entrypoint'te:** migration kırılırsa container ayağa kalkmaz — bu istenen davranış (yarım şemayla servis vermek yerine fail-fast); rollback prosedürü DEPLOYMENT.md'de.
