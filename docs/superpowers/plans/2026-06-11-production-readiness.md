# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArsaBil'i Coolify/VPS'e güvenle deploy edilebilir hale getirmek: health endpoint, rate limiting, security header'lar, Sentry, Playwright smoke e2e, CI ve sıfır lint ihlali.

**Architecture:** Yaklaşım A (pragmatik tek-VPS). Tek Next.js container + aynı sunucuda PostgreSQL. Rate limiting in-memory (tek dosyada soyutlanır), backup Coolify'ın yerleşik özelliğiyle, migration'lar mevcut entrypoint'teki `prisma migrate deploy` ile. Spec: `docs/superpowers/specs/2026-06-11-production-readiness-design.md`.

**Tech Stack:** Next.js 16 (standalone), Prisma 5 + PostgreSQL 16, NextAuth v4, @sentry/nextjs, @playwright/test, GitHub Actions, Docker/Coolify.

**ÖN KOŞUL:** `feature/aurora-redesign` branch'i kullanıcı tarafından main'e merge edilmiş olmalı. Bu plan main'den açılan yeni branch'te uygulanır.

---

## Dosya Haritası

| Dosya | Sorumluluk |
|---|---|
| `src/app/api/health/route.ts` (yeni) | DB ping + durum JSON'u; Docker/Coolify healthcheck hedefi |
| `src/lib/rate-limit.ts` (yeni) | In-memory sliding window limiter + IP helper + limit sabitleri |
| `src/lib/__tests__/rate-limit.test.ts` (yeni) | Limiter unit testleri |
| `src/app/api/health/__tests__/route.test.ts` (yeni) | Health endpoint testleri |
| `src/lib/auth.ts` (değişir) | authorize() içinde login rate limit |
| `src/app/api/auth/register/route.ts` (değişir) | Register rate limit |
| `src/app/api/upload/route.ts` (değişir) | Upload rate limit |
| `src/app/api/messages/route.ts`, `src/app/api/offers/route.ts` (değişir) | Yazma rate limit |
| `next.config.mjs` (değişir) | headers(), Sentry sarmalaması, bayrak temizliği |
| `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` (yeni) | Sentry init |
| `Dockerfile` (değişir) | non-root user + HEALTHCHECK |
| `docker-compose.prod.yml` (yeni) | app + postgres prod kompozisyonu |
| `.env.example` (genişler) | Tüm prod değişkenleri |
| `docs/DEPLOYMENT.md` (yeni) | Coolify kurulum, backup/restore, rollback |
| `playwright.config.ts`, `e2e/*` (yeni) | Smoke e2e |
| `jest.config.js` (değişir) | e2e klasörünü jest'ten dışla |
| `.github/workflows/ci.yml` (yeni) | lint+tsc+jest+e2e gate |

---

## Task 1: Branch Hazırlığı

**Files:** yok (git işlemi)

- [ ] **Step 1: Aurora merge'ünü doğrula**

```powershell
git checkout main
git log --oneline -1
```
Beklenen: en üstteki commit aurora redesign merge'ü (veya aurora commit'leri main'de). Değilse DUR ve kullanıcıya sor — bu planın ön koşulu.

- [ ] **Step 2: Yeni branch aç**

```powershell
git checkout -b feature/production-readiness
```

---

## Task 2: Health Endpoint

**Files:**
- Create: `src/app/api/health/route.ts`
- Test: `src/app/api/health/__tests__/route.test.ts`

- [ ] **Step 1: Failing test yaz**

`src/app/api/health/__tests__/route.test.ts`:
```ts
const queryRawMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}))

import { GET } from '../route'

describe('GET /api/health', () => {
    beforeEach(() => queryRawMock.mockReset())

    it('DB erişilebilirse 200 ve status ok döner', async () => {
        queryRawMock.mockResolvedValue([{ '?column?': 1 }])
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.status).toBe('ok')
        expect(body.db).toBe('ok')
        expect(typeof body.uptimeSec).toBe('number')
    })

    it('DB hatasında 503 ve degraded döner', async () => {
        queryRawMock.mockRejectedValue(new Error('connrefused'))
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(503)
        expect(body.status).toBe('degraded')
        expect(body.db).toBe('fail')
    })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL doğrula**

```powershell
npx jest src/app/api/health --no-coverage
```
Beklenen: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Endpoint'i yaz**

`src/app/api/health/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const startedAt = Date.now()

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json({
            status: 'ok',
            db: 'ok',
            uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        })
    } catch {
        return NextResponse.json({ status: 'degraded', db: 'fail' }, { status: 503 })
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

```powershell
npx jest src/app/api/health --no-coverage
```
Beklenen: 2 passed. Sonra tüm suite: `npx jest --no-coverage` → hepsi yeşil.

NOT: `/api/health` middleware matcher'ında YOK (`src/middleware.ts` kontrol et) — auth gerektirmemeli; matcher'a EKLEME.

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/health
git commit -m "feat(ops): /api/health endpoint - DB ping + uptime"
```

---

## Task 3: Rate Limit Kütüphanesi

**Files:**
- Create: `src/lib/rate-limit.ts`
- Test: `src/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Failing testleri yaz**

`src/lib/__tests__/rate-limit.test.ts`:
```ts
import { checkRateLimit, resetRateLimits, getClientIp, RATE_LIMITS } from '../rate-limit'

describe('checkRateLimit', () => {
    beforeEach(() => resetRateLimits())

    it('limit dolana kadar izin verir, sonra reddeder', () => {
        const opts = { limit: 3, windowMs: 60_000 }
        const now = 1_000_000
        expect(checkRateLimit('k', opts, now).ok).toBe(true)
        expect(checkRateLimit('k', opts, now + 1).ok).toBe(true)
        expect(checkRateLimit('k', opts, now + 2).ok).toBe(true)
        const denied = checkRateLimit('k', opts, now + 3)
        expect(denied.ok).toBe(false)
        expect(denied.retryAfterSec).toBeGreaterThan(0)
        expect(denied.retryAfterSec).toBeLessThanOrEqual(60)
    })

    it('pencere kayınca eski denemeler düşer', () => {
        const opts = { limit: 2, windowMs: 60_000 }
        const now = 1_000_000
        checkRateLimit('k', opts, now)
        checkRateLimit('k', opts, now + 1)
        expect(checkRateLimit('k', opts, now + 2).ok).toBe(false)
        // 61 sn sonra ilk iki deneme pencere dışı
        expect(checkRateLimit('k', opts, now + 61_000).ok).toBe(true)
    })

    it('farklı anahtarlar birbirini etkilemez', () => {
        const opts = { limit: 1, windowMs: 60_000 }
        expect(checkRateLimit('a', opts, 0).ok).toBe(true)
        expect(checkRateLimit('b', opts, 0).ok).toBe(true)
        expect(checkRateLimit('a', opts, 1).ok).toBe(false)
    })
})

describe('getClientIp', () => {
    it('x-forwarded-for ilk IP alınır', () => {
        const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })
        expect(getClientIp(req)).toBe('1.2.3.4')
    })
    it('header yoksa unknown döner', () => {
        expect(getClientIp(new Request('http://x'))).toBe('unknown')
    })
})

describe('RATE_LIMITS', () => {
    it('spec degerleri', () => {
        expect(RATE_LIMITS.LOGIN).toEqual({ limit: 5, windowMs: 60_000 })
        expect(RATE_LIMITS.REGISTER).toEqual({ limit: 3, windowMs: 3_600_000 })
        expect(RATE_LIMITS.UPLOAD).toEqual({ limit: 10, windowMs: 3_600_000 })
        expect(RATE_LIMITS.WRITE).toEqual({ limit: 30, windowMs: 60_000 })
    })
})
```

- [ ] **Step 2: FAIL doğrula**

```powershell
npx jest src/lib/__tests__/rate-limit --no-coverage
```
Beklenen: FAIL — modül yok.

- [ ] **Step 3: Kütüphaneyi yaz**

`src/lib/rate-limit.ts`:
```ts
/**
 * In-memory sliding-window rate limiter.
 * TEK INSTANCE varsayımı: yatay ölçeklemede Redis tabanlı implementasyonla
 * değiştirilmeli — arayüz (checkRateLimit) sabit kalacak şekilde tasarlandı.
 */

export type RateLimitOptions = { limit: number; windowMs: number }
export type RateLimitResult = { ok: boolean; retryAfterSec?: number }

const MAX_KEYS = 10_000
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, opts: RateLimitOptions, now: number = Date.now()): RateLimitResult {
    const windowStart = now - opts.windowMs
    const recent = (buckets.get(key) ?? []).filter(t => t > windowStart)

    if (recent.length >= opts.limit) {
        buckets.set(key, recent)
        const oldestExpiry = recent[0] + opts.windowMs
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldestExpiry - now) / 1000)) }
    }

    recent.push(now)
    if (!buckets.has(key) && buckets.size >= MAX_KEYS) {
        // bellek üst sınırı: en eski eklenen anahtarı düşür
        const oldestKey = buckets.keys().next().value
        if (oldestKey !== undefined) buckets.delete(oldestKey)
    }
    buckets.set(key, recent)
    return { ok: true }
}

export function resetRateLimits(): void {
    buckets.clear()
}

export function getClientIp(req: Request): string {
    const fwd = req.headers.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    return req.headers.get('x-real-ip') ?? 'unknown'
}

export const RATE_LIMITS = {
    LOGIN:    { limit: 5,  windowMs: 60_000 },     // IP başına 5/dk
    REGISTER: { limit: 3,  windowMs: 3_600_000 },  // IP başına 3/saat
    UPLOAD:   { limit: 10, windowMs: 3_600_000 },  // kullanıcı başına 10/saat
    WRITE:    { limit: 30, windowMs: 60_000 },     // kullanıcı başına 30/dk (mesaj+teklif)
} as const
```

- [ ] **Step 4: PASS doğrula**

```powershell
npx jest src/lib/__tests__/rate-limit --no-coverage
```
Beklenen: hepsi yeşil.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat(security): in-memory sliding window rate limiter"
```

---

## Task 4: Rate Limit Entegrasyonu

**Files:**
- Modify: `src/lib/auth.ts` (authorize)
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/upload/route.ts` (POST)
- Modify: `src/app/api/messages/route.ts` (POST)
- Modify: `src/app/api/offers/route.ts` (POST)

- [ ] **Step 1: Login limiti — `src/lib/auth.ts`**

Import ekle:
```ts
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
```

`authorize(credentials)` imzasını `authorize(credentials, req)` yap ve fonksiyonun EN BAŞINA (boş alan kontrolünden önce) ekle:
```ts
            async authorize(credentials, req) {
                const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
                const ip = headers["x-forwarded-for"]?.split(",")[0]?.trim()
                    || headers["x-real-ip"]
                    || "unknown";
                const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN);
                if (!rl.ok) {
                    throw new Error("Çok fazla giriş denemesi. Lütfen 1 dakika sonra tekrar deneyin.");
                }
                // ... mevcut gövde aynen devam ...
```
NOT: NextAuth v4'te `req.headers` düz obje olarak gelir (Headers instance değil) — bu yüzden `getClientIp` burada KULLANILMAZ.

- [ ] **Step 2: Register limiti — `src/app/api/auth/register/route.ts`**

Import ekle:
```ts
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
```

`POST` gövdesinin başına, `try` bloğundan ÖNCE ekle:
```ts
export async function POST(req: Request) {
    const rl = checkRateLimit(`register:${getClientIp(req)}`, RATE_LIMITS.REGISTER);
    if (!rl.ok) {
        return NextResponse.json(
            { message: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
        );
    }
    try {
        // ... mevcut gövde aynen ...
```

- [ ] **Step 3: Upload limiti — `src/app/api/upload/route.ts`**

Import ekle: `import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'`

`POST` içinde session kontrolünün HEMEN ARDINA ekle:
```ts
    const rl = checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.UPLOAD)
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Yükleme limiti aşıldı. Lütfen daha sonra tekrar deneyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
        )
    }
```

- [ ] **Step 4: Mesaj limiti — `src/app/api/messages/route.ts`**

Import ekle: `import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'`

`POST` içinde `const senderId = session.user.id as string` satırının HEMEN ARDINA ekle:
```ts
    const rl = checkRateLimit(`write:${senderId}`, RATE_LIMITS.WRITE)
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
        )
    }
```

- [ ] **Step 5: Teklif limiti — `src/app/api/offers/route.ts`**

Import ekle: `import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";`

`POST` içinde session kontrolünün (`if (!session || !session.user)` bloğu) HEMEN ARDINA ekle:
```ts
        const rl = checkRateLimit(`write:${session.user.id}`, RATE_LIMITS.WRITE);
        if (!rl.ok) {
            return NextResponse.json(
                { message: "Çok hızlı işlem yapıyorsunuz. Lütfen biraz bekleyin." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
            );
        }
```
NOT: mesaj ve teklif AYNI `write:` anahtarını paylaşır — spec gereği toplam 30/dk.

- [ ] **Step 6: Derleme + test doğrula**

```powershell
npx tsc --noEmit
npx jest --no-coverage
```
Beklenen: 0 hata, tüm testler yeşil.

- [ ] **Step 7: Manuel duman testi**

```powershell
npm run dev:db
npm run dev:next
```
Ayrı terminalde 4 kez üst üste hatalı kayıt isteği at (4.: 429 beklenir):
```powershell
1..4 | ForEach-Object { (Invoke-WebRequest -Uri http://localhost:3000/api/auth/register -Method POST -Body '{"name":"t","email":"t@t.t","password":"x"}' -ContentType "application/json" -SkipHttpErrorCheck).StatusCode }
```
Beklenen çıktı: `400 400 400 429` (3 deneme limiti; ilk üçü validasyon/duplicate hatası, dördüncüsü rate limit).

- [ ] **Step 8: Commit**

```powershell
git add src/lib/auth.ts src/app/api/auth/register/route.ts src/app/api/upload/route.ts src/app/api/messages/route.ts src/app/api/offers/route.ts
git commit -m "feat(security): login/register/upload/mesaj/teklif rate limit"
```

---

## Task 5: Security Header'lar + TypeScript Bayrağı

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: headers() ekle ve ignoreBuildErrors'u kaldır**

`next.config.mjs` — `typescript` bloğunu tamamen SİL (tsc temiz), `eslint.ignoreDuringBuilds` ŞİMDİLİK KALIR (Task 15'te kalkacak), `headers()` ekle:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
        ],
    },
    eslint: {
        // Task 15 (lint temizliği) tamamlanınca bu blok silinecek
        ignoreDuringBuilds: true,
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                    {
                        key: 'Content-Security-Policy-Report-Only',
                        value: "default-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.ingest.sentry.io https://*.sentry.io; font-src 'self' data:; frame-ancestors 'none'",
                    },
                ],
            },
        ]
    },
};

export default nextConfig;
```

- [ ] **Step 2: Build doğrula**

```powershell
npx tsc --noEmit
npm run build
```
Beklenen: ikisi de hatasız. Build kırılırsa `ignoreBuildErrors` gizli hata saklıyordu demektir — hataları DÜZELT, bayrağı geri koyma.

- [ ] **Step 3: Header'ları doğrula**

```powershell
npm run dev:next
```
Ayrı terminalde:
```powershell
(Invoke-WebRequest http://localhost:3000/api/health).Headers['X-Frame-Options']
```
Beklenen: `DENY`.

- [ ] **Step 4: Commit**

```powershell
git add next.config.mjs
git commit -m "feat(security): HSTS/XFO/CSP-RO header'lari + ignoreBuildErrors kaldirildi"
```

---

## Task 6: Sentry

**Files:**
- Create: `instrumentation.ts` (repo kökü değil — `src/instrumentation.ts`, çünkü proje `src/` dizini kullanıyor)
- Create: `src/instrumentation-client.ts`
- Create: `sentry.server.config.ts`, `sentry.edge.config.ts` (repo kökü)
- Modify: `next.config.mjs`, `.env.example`

NOT: @sentry/nextjs'in major sürümüne göre dosya adları/hook isimleri değişebilir. Aşağıdaki yapı v9/v10 içindir. Kurulumdan sonra `npx @sentry/wizard` ÇALIŞTIRMA (interaktif); dosyaları elle oluştur. API farklıysa resmi Next.js kurulum dokümanındaki karşılığını kullan ama şu davranışları koru: DSN env'den + DSN boşken devre dışı, trace %10, PII kapalı, NEXT_NOT_FOUND/NEXT_REDIRECT filtreli.

- [ ] **Step 1: Paketi kur**

```powershell
npm install @sentry/nextjs
```

- [ ] **Step 2: Server/edge config**

`sentry.server.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
})
```

`sentry.edge.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: 0.1,
})
```

- [ ] **Step 3: Instrumentation**

`src/instrumentation.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config')
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config')
    }
}

export const onRequestError = Sentry.captureRequestError
```

`src/instrumentation-client.ts`:
```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
        const msg = String((hint?.originalException as Error | undefined)?.message ?? '')
        if (msg.includes('NEXT_NOT_FOUND') || msg.includes('NEXT_REDIRECT')) return null
        return event
    },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
```

- [ ] **Step 4: next.config.mjs sarmala**

En üste: `import { withSentryConfig } from '@sentry/nextjs'`
En altta `export default nextConfig;` yerine:
```js
export default withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
```

- [ ] **Step 5: .env.example'a ekle**

```bash
# Sentry (boş bırakılırsa Sentry tamamen devre dışı)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=  # yalnız CI/build'de source map upload için
```

- [ ] **Step 6: Doğrula**

```powershell
npx tsc --noEmit
npm run build
npx jest --no-coverage
```
Beklenen: hepsi temiz (DSN boş → Sentry pasif, davranış değişikliği yok).

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json next.config.mjs sentry.server.config.ts sentry.edge.config.ts src/instrumentation.ts src/instrumentation-client.ts .env.example
git commit -m "feat(ops): Sentry entegrasyonu - DSN bos ise pasif, trace %10, PII kapali"
```

---

## Task 7: Dockerfile Sertleştirme + docker-compose.prod.yml

**Files:**
- Modify: `Dockerfile` (runner stage)
- Create: `docker-compose.prod.yml`
- Modify: `.env.example`

- [ ] **Step 1: Dockerfile runner stage'ini güncelle**

Runner stage'i şu hale getir (deps/builder stage'leri AYNEN kalır):
```dockerfile
# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma CLI migration için gerekli (standalone output içinde gelmiyor)
RUN npm install -g prisma@5.22.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
```
NOT: alpine'da busybox `wget` mevcut, ek paket gerekmez. `USER node`, global prisma kurulumundan SONRA gelmeli.

- [ ] **Step 2: docker-compose.prod.yml oluştur**

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env.production
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-arsabil}
      POSTGRES_USER: ${POSTGRES_USER:-arsabil}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD .env dosyasinda zorunlu}
    volumes:
      - arsabil_pgdata_prod:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-arsabil} -d ${POSTGRES_DB:-arsabil}"]
      interval: 5s
      timeout: 5s
      retries: 10
    # Dış port bilinçli olarak AÇILMADI — DB yalnız internal network'ten erişilir

volumes:
  arsabil_pgdata_prod:
    name: arsabil_pgdata_prod
```

- [ ] **Step 3: .env.example'ı tamamla**

Mevcut içeriğe ekle (Sentry bloğu Task 6'da eklendi):
```bash
# Postgres container (docker-compose.prod.yml)
POSTGRES_DB=arsabil
POSTGRES_USER=arsabil
POSTGRES_PASSWORD=  # zorunlu - guclu bir sifre uret

# Cloudinary (ilan fotograflari)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Resend (e-posta bildirimleri)
RESEND_API_KEY=
```
`.gitignore`'da `.env.production`'ın kapsandığını doğrula (genelde `.env*` kalıbı vardır; yoksa ekle).

- [ ] **Step 4: Lokal compose doğrulaması**

`.env.production` oluştur (lokal deneme değerleriyle: `DATABASE_URL=postgresql://arsabil:test123@postgres:5432/arsabil`, `POSTGRES_PASSWORD=test123`, `NEXTAUTH_URL=http://localhost:3000`, `NEXTAUTH_SECRET=lokal-test-sirri-32-karakter-uzun`), sonra:
```powershell
docker compose -f docker-compose.prod.yml up --build -d
Start-Sleep -Seconds 45
Invoke-WebRequest http://localhost:3000/api/health | Select-Object -ExpandProperty Content
docker compose -f docker-compose.prod.yml down
```
Beklenen: `{"status":"ok","db":"ok",...}`. NOT: dev postgres (5432) çalışıyorsa önce `npm run dev:db:stop`.

- [ ] **Step 5: Commit**

```powershell
git add Dockerfile docker-compose.prod.yml .env.example .gitignore
git commit -m "feat(ops): non-root container + HEALTHCHECK + docker-compose.prod.yml"
```

---

## Task 8: DEPLOYMENT.md

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Dokümanı yaz**

`docs/DEPLOYMENT.md` şu bölümleri İÇERMELİ (her biri çalıştırılabilir komutlarla):

```markdown
# ArsaBil Deployment (Coolify / VPS)

## 1. Ön Koşullar
- VPS'te Coolify kurulu, domain DNS'i sunucuya yönlenmiş
- GitHub repo bağlantısı (veya tarball deploy)

## 2. Coolify Kurulumu
1. Coolify > New Resource > Docker Compose, repo + `docker-compose.prod.yml` seç
2. Environment Variables: `.env.example`'daki TÜM değişkenleri doldur
   - `DATABASE_URL=postgresql://arsabil:<sifre>@postgres:5432/arsabil` (host = compose servis adı `postgres`)
   - `NEXTAUTH_URL=https://<domain>` — yanlışsa login KIRILIR
   - `NEXTAUTH_SECRET` üret: `openssl rand -base64 32`
3. Domain + SSL: Coolify otomatik (Traefik + Let's Encrypt)
4. Health check URL: `/api/health`
5. Deploy — entrypoint `prisma migrate deploy` migration'ları otomatik uygular

## 3. SSE Doğrulaması
Deploy sonrası iki hesapla mesajlaşmayı canlıda test et. Mesaj anlık düşmüyorsa
Traefik buffering'i kontrol et (Coolify varsayılanı SSE ile uyumludur).

## 4. Backup
- Coolify > Database > Scheduled Backups: günlük, 7 gün saklama
- Manuel backup: `docker exec <pg-container> pg_dump -U arsabil -Fc arsabil > arsabil_$(date +%F).dump`

## 5. Restore
1. Uygulamayı durdur (Coolify > Stop)
2. `docker exec -i <pg-container> pg_restore -U arsabil -d arsabil --clean --if-exists < dosya.dump`
3. `docker exec <app-container> prisma migrate status` — migration durumu temiz olmalı
4. Uygulamayı başlat

## 6. Rollback
- Coolify > Deployments > önceki imaja "Redeploy"
- Migration geri alınamaz (Prisma down migration üretmez) — şema değişikliği içeren
  rollback'te restore (bölüm 5) kullanılır. Bu yüzden deploy ÖNCESİ manuel backup al.

## 7. Rate Limit Notu
Limitler in-memory'dir: container restart'ında sıfırlanır, tek instance varsayar.
Yatay ölçeklemede `src/lib/rate-limit.ts` Redis'e taşınmalı.
```

Bu iskeleti gerçek doküman olarak yaz — başlıkları kopyala, komutları aynen kullan, Coolify menü adımlarını kendi sözcüklerinle netleştir.

- [ ] **Step 2: Commit**

```powershell
git add docs/DEPLOYMENT.md
git commit -m "docs(ops): Coolify deployment, backup/restore ve rollback rehberi"
```

---

## Task 9: Playwright Altyapısı

**Files:**
- Create: `playwright.config.ts`, `e2e/global-setup.ts`
- Modify: `jest.config.js` (e2e dışlama), `package.json` (script), `.gitignore`

- [ ] **Step 1: Paket kur**

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Jest'i e2e'den izole et**

`jest.config.js` içine ekle (config objesine):
```js
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
```
Doğrula: `npx jest --listTests` çıktısında `e2e/` altında dosya OLMAMALI (şu an zaten yok ama guard şimdi girer).

- [ ] **Step 3: Test veritabanı oluştur**

```powershell
npm run dev:db
docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -c "CREATE DATABASE arsabil_test;"
```
Beklenen: `CREATE DATABASE` (zaten varsa hata — sorun değil).

- [ ] **Step 4: playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test'

const E2E_DB = process.env.E2E_DATABASE_URL
    ?? 'postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_test'

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    timeout: 60_000,
    fullyParallel: false,   // testler ortak DB durumu kullanır, sıralı koşar
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
    },
    webServer: {
        // Smoke testler dev server'a karşı koşar: `next start` standalone output ile
        // çalışmaz, standalone server.js ise static asset kopyalama gerektirir.
        command: 'npm run dev:next',
        url: 'http://localhost:3000/api/health',
        timeout: 180_000,
        reuseExistingServer: false,
        env: {
            DATABASE_URL: E2E_DB,
            NEXTAUTH_URL: 'http://localhost:3000',
            NEXTAUTH_SECRET: 'e2e-test-secret-min-32-karakter-uzunlugunda',
        },
    },
})
```

- [ ] **Step 5: e2e/global-setup.ts**

ÖNCE `prisma/schema.prisma`'daki model adlarını oku; aşağıdaki `deleteMany` zinciri FK bağımlılık sırasına göredir — şemada olmayan model varsa satırını çıkar, eksik varsa ekle:
```ts
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const E2E_DB = process.env.E2E_DATABASE_URL
    ?? 'postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_test'

export default async function globalSetup() {
    execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: E2E_DB },
        stdio: 'inherit',
    })

    const prisma = new PrismaClient({ datasources: { db: { url: E2E_DB } } })
    try {
        // FK sırası: önce child tablolar
        await prisma.message.deleteMany()
        await prisma.offer.deleteMany()
        await prisma.favorite.deleteMany()
        await prisma.notification.deleteMany()
        await prisma.listing.deleteMany()
        await prisma.report.deleteMany()
        await prisma.user.deleteMany()

        const password = await bcrypt.hash('Test1234!', 10)
        await prisma.user.createMany({
            data: [
                { email: 'admin@e2e.test', name: 'E2E Admin',   password, role: 'ADMIN' },
                { email: 'user1@e2e.test', name: 'E2E UserBir', password, role: 'USER' },
                { email: 'user2@e2e.test', name: 'E2E UserIki', password, role: 'USER' },
            ],
        })
    } finally {
        await prisma.$disconnect()
    }
}
```

- [ ] **Step 6: package.json script + .gitignore**

`scripts`'e ekle: `"test:e2e": "playwright test"`.
`.gitignore`'a ekle: `test-results/`, `playwright-report/`.

- [ ] **Step 7: Boş suite ile altyapıyı doğrula**

```powershell
npm run test:e2e
```
Beklenen: "no tests found" hatası DEĞİL — global setup koşar (migrate + seed), sonra "No tests found" benzeri mesajla biter. Migrate/seed hatası varsa burada çöz (test DB bağlantısı, model adları).

- [ ] **Step 8: Commit**

```powershell
git add playwright.config.ts e2e/global-setup.ts jest.config.js package.json package-lock.json .gitignore
git commit -m "test(e2e): Playwright altyapisi - test DB, seed, jest izolasyonu"
```

---

## Task 10: E2E — Kayıt → Login → Hesaplama

**Files:**
- Create: `e2e/auth-hesapla.spec.ts`

- [ ] **Step 1: Form alanlarını keşfet**

`src/app/register/page.tsx` (yoksa kayıt formunun yaşadığı sayfayı bul: `Grep "api/auth/register" src/app`), `src/app/login/page.tsx` ve `src/app/hesapla/page.tsx`'i OKU. Aşağıdaki testteki `getByLabel/getByPlaceholder/getByRole` seçicilerini gerçek label/placeholder/buton metinlerine göre AYARLA. Bu keşif adımı atlanamaz.

- [ ] **Step 2: Testi yaz**

`e2e/auth-hesapla.spec.ts` (seçicileri Step 1'e göre düzelt):
```ts
import { test, expect } from '@playwright/test'

const EMAIL = `yeni-${Date.now()}@e2e.test`

test('kayit -> login -> hesaplama akisi', async ({ page }) => {
    // Kayıt
    await page.goto('/register')
    await page.getByPlaceholder(/ad/i).fill('E2E Yeni Kullanici')
    await page.getByPlaceholder(/posta|mail/i).fill(EMAIL)
    await page.getByPlaceholder(/şifre|sifre/i).fill('Test1234!')
    await page.getByRole('button', { name: /kayıt|kaydol/i }).click()

    // Login (kayıt otomatik login yapmıyorsa)
    await page.goto('/login')
    await page.getByPlaceholder(/posta|mail/i).fill(EMAIL)
    await page.getByPlaceholder(/şifre|sifre/i).fill('Test1234!')
    await page.getByRole('button', { name: /giriş/i }).click()
    await page.waitForURL(/dashboard|hesapla|\/$/)

    // Hesaplama
    await page.goto('/hesapla')
    // Form alanlarını gerçek sayfaya göre doldur (arsa alanı, fiyat vb.)
    // ve hesapla butonuna bas:
    await page.getByRole('button', { name: /hesapla/i }).click()

    // Sonuç: fizibilite skoru paneli görünür
    await expect(page.getByText(/fizibilite|skor|puan/i).first()).toBeVisible({ timeout: 15_000 })
})
```

- [ ] **Step 3: Koş ve yeşile çek**

```powershell
npx playwright test e2e/auth-hesapla.spec.ts
```
Kırmızıysa: `npx playwright test --debug` ile seçicileri düzelt. Hesapla formu district-price verisi istiyorsa global-setup'a ilgili modelden 1 seed kaydı ekle (model adını `prisma/schema.prisma`'dan al) ve bunu commit mesajında belirt.

- [ ] **Step 4: Commit**

```powershell
git add e2e/auth-hesapla.spec.ts e2e/global-setup.ts
git commit -m "test(e2e): kayit-login-hesaplama smoke akisi"
```

---

## Task 11: E2E — İlan Yaşam Döngüsü

**Files:**
- Create: `e2e/ilan-yasam-dongusu.spec.ts`

- [ ] **Step 1: Wizard ve admin akışını keşfet**

`src/app/listings/new/page.tsx` (wizard adımları), `src/app/admin` (onay butonu) ve marketplace kartını OKU; seçicileri gerçek metinlere göre ayarla. Fotoğraf adımı ATLANIR (Cloudinary'ye gerçek istek yok — "Atla"/"İleri" yolu kullanılır).

- [ ] **Step 2: Testi yaz**

`e2e/ilan-yasam-dongusu.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test'

const BASLIK = `E2E Arsa ${Date.now()}`

async function login(page: Page, email: string) {
    await page.goto('/login')
    await page.getByPlaceholder(/posta|mail/i).fill(email)
    await page.getByPlaceholder(/şifre|sifre/i).fill('Test1234!')
    await page.getByRole('button', { name: /giriş/i }).click()
    await page.waitForURL(/dashboard|\/$/)
}

test('ilan olustur -> admin onayla -> marketplace gorunur', async ({ page }) => {
    // user1 ilan oluşturur (wizard, fotoğrafsız)
    await login(page, 'user1@e2e.test')
    await page.goto('/listings/new')
    // Adım 1-5: gerçek wizard alanlarına göre doldur (il/ilçe, m², fiyat, başlık=BASLIK)
    // her adımda "İleri", son adımda "Yayınla"
    await page.getByRole('button', { name: /yayınla/i }).click()
    await expect(page.getByText(/başarı|yayında|onay/i).first()).toBeVisible({ timeout: 15_000 })

    // admin onaylar
    await page.context().clearCookies()
    await login(page, 'admin@e2e.test')
    await page.goto('/admin/listings')
    const row = page.getByText(BASLIK).first()
    await expect(row).toBeVisible()
    // BASLIK satırındaki onay butonuna bas (gerçek buton metnine göre ayarla)
    await page.getByRole('button', { name: /onayla/i }).first().click()

    // marketplace'te görünür
    await page.context().clearCookies()
    await login(page, 'user2@e2e.test')
    await page.goto('/marketplace')
    await expect(page.getByText(BASLIK).first()).toBeVisible({ timeout: 15_000 })
})
```

- [ ] **Step 3: Koş ve yeşile çek**

```powershell
npx playwright test e2e/ilan-yasam-dongusu.spec.ts
```

- [ ] **Step 4: Commit**

```powershell
git add e2e/ilan-yasam-dongusu.spec.ts
git commit -m "test(e2e): ilan olusturma-onay-marketplace yasam dongusu"
```

---

## Task 12: E2E — Mesajlaşma

**Files:**
- Create: `e2e/mesajlasma.spec.ts`

- [ ] **Step 1: Inbox akışını keşfet**

`src/app/inbox/page.tsx`'i OKU: yeni konuşma nasıl başlar (profil sayfasından "Mesaj Gönder" butonu mu, inbox içinden mi)? Seçicileri ayarla.

- [ ] **Step 2: Testi yaz**

`e2e/mesajlasma.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test'

const MESAJ = `E2E selam ${Date.now()}`

async function login(page: Page, email: string) {
    await page.goto('/login')
    await page.getByPlaceholder(/posta|mail/i).fill(email)
    await page.getByPlaceholder(/şifre|sifre/i).fill('Test1234!')
    await page.getByRole('button', { name: /giriş/i }).click()
    await page.waitForURL(/dashboard|\/$/)
}

test('user1 mesaj gonderir, user2 inboxta gorur', async ({ page, request }) => {
    await login(page, 'user1@e2e.test')

    // Mesajı API üzerinden gönder (UI'da yeni konuşma başlatma akışı
    // ilan/profil bağlamı gerektiriyor; smoke hedefi iletim + görüntüleme)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    // user2'nin id'si gerekiyor: profil arama yerine seed'de bilinen email ile
    // /api/user/profile benzeri uçtan alın YA DA global-setup'ta sabit id ile seed edin.
    // En basit yol: global-setup'ta user.createMany yerine create ile sabit id'ler:
    // { id: 'e2e-user-2', email: 'user2@e2e.test', ... }
    const res = await request.post('/api/messages', {
        headers: { cookie: cookieHeader },
        data: { receiverId: 'e2e-user-2', content: MESAJ },
    })
    expect(res.status()).toBe(201)

    // user2 inbox'ta görür
    await page.context().clearCookies()
    await login(page, 'user2@e2e.test')
    await page.goto('/inbox')
    await expect(page.getByText('E2E UserBir').first()).toBeVisible()
    await page.getByText('E2E UserBir').first().click()
    await expect(page.getByText(MESAJ)).toBeVisible({ timeout: 15_000 })
})
```
NOT: Bu test için `e2e/global-setup.ts`'te kullanıcılar sabit id ile seed edilmeli — `createMany` çağrısını üç ayrı `create`'e çevir ve `id: 'e2e-admin' | 'e2e-user-1' | 'e2e-user-2'` ver.

- [ ] **Step 3: global-setup'ı sabit id'lerle güncelle**

```ts
        const password = await bcrypt.hash('Test1234!', 10)
        await prisma.user.create({ data: { id: 'e2e-admin',  email: 'admin@e2e.test', name: 'E2E Admin',   password, role: 'ADMIN' } })
        await prisma.user.create({ data: { id: 'e2e-user-1', email: 'user1@e2e.test', name: 'E2E UserBir', password, role: 'USER' } })
        await prisma.user.create({ data: { id: 'e2e-user-2', email: 'user2@e2e.test', name: 'E2E UserIki', password, role: 'USER' } })
```

- [ ] **Step 4: Tüm e2e suite'i koş**

```powershell
npm run test:e2e
```
Beklenen: 3/3 yeşil.

- [ ] **Step 5: Commit**

```powershell
git add e2e/mesajlasma.spec.ts e2e/global-setup.ts
git commit -m "test(e2e): mesajlasma smoke akisi + sabit seed idleri"
```

---

## Task 13: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Workflow'u yaz**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: arsabil_test
          POSTGRES_USER: arsabil
          POSTGRES_PASSWORD: arsabil_dev_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U arsabil"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint .
      - run: npx jest --silent
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          E2E_DATABASE_URL: postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```
NOT: `npx eslint .` adımı Task 15 bitmeden kırmızı kalır — bu BİLİNÇLİ (lint gate'in amacı bu). Repo'da GitHub remote yoksa workflow hazır durur; aktivasyon kullanıcının remote eklemesiyle olur.

- [ ] **Step 2: Workflow YAML'ını doğrula**

```powershell
npx --yes yaml-lint .github/workflows/ci.yml
```
(yaml-lint yoksa: dosyayı `node -e "const yaml=require('js-yaml');yaml.load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log('OK')"` ile doğrula — js-yaml playwright bağımlılıklarından gelir; o da yoksa GitHub'a push'ta doğrulanır.)

- [ ] **Step 3: Commit**

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: lint + tsc + jest + playwright pipeline"
```

---

## Task 14: Junk Kopya Temizliği + Lint Envanteri

**Files:**
- Delete: `arsabil-main/` (iç içe junk kopya — varsa)

- [ ] **Step 1: Junk kopyayı bul ve sil**

```powershell
Test-Path "arsabil-main"
```
`True` ise içine bak (`Get-ChildItem arsabil-main | Select-Object -First 5`) — projenin eski bir kopyası olduğunu DOĞRULA (içinde package.json/src olmalı, farklı/yeni bir şey OLMAMALI), sonra:
```powershell
Remove-Item -Recurse -Force arsabil-main
git rm -r --cached arsabil-main 2>$null
```
`False` ise bu adımı atla (daha önce temizlenmiş).

- [ ] **Step 2: Envanter çıkar**

```powershell
npx eslint . 2>&1 | Select-Object -Last 5
npx eslint . --format json --output-file lint-report.json
```
Son satırdaki toplam hata/uyarı sayısını not et. `lint-report.json`'u commit'leme (geçici çalışma dosyası).

- [ ] **Step 3: Kural bazında dağılımı çıkar**

```powershell
node -e "const r=require('./lint-report.json');const c={};for(const f of r)for(const m of f.messages)c[m.ruleId]=(c[m.ruleId]||0)+1;console.table(Object.entries(c).sort((a,b)=>b[1]-a[1]))"
```
Bu dağılım Task 15'teki düzeltme sırasını belirler (en kalabalık kural önce).

- [ ] **Step 4: Commit (junk silindiyse)**

```powershell
git add -A
git commit -m "chore: ic ice arsabil-main junk kopyasi silindi"
```

---

## Task 15: Lint Düzeltmeleri + Build Gate

**Files:** çok dosya (envantere göre)

Prensip: **kodu düzelt, kuralı gevşetme.** Satır bazlı `eslint-disable-next-line` yalnız gerçek istisnalara, gerekçe yorumuyla.

- [ ] **Step 1: Kural kural düzelt, kural başına commit**

Task 14 Step 3 dağılımındaki her kural için (en kalabalıktan başla):
1. `npx eslint . --rule-filter` yok — dosya listesini json rapordan al: `node -e "const r=require('./lint-report.json');for(const f of r)if(f.messages.some(m=>m.ruleId==='KURAL'))console.log(f.filePath)"`
2. Tipik düzeltmeler:
   - `@typescript-eslint/no-unused-vars`: kullanılmayan import/değişken SİL (altçizgi prefix'leme değil)
   - `@typescript-eslint/no-explicit-any`: gerçek tipi yaz; Prisma sonuçları için `Prisma.XGetPayload` veya model tipleri; session için modül augmentation yerine mevcut `as string` kalıbı korunabilir ama `as any` yerine somut tip tercih et
   - `react/no-unescaped-entities`: `'` → `&apos;`, `"` → `&quot;`
   - `react-hooks/exhaustive-deps`: bağımlılığı ekle; eklemek davranış bozuyorsa `eslint-disable-next-line react-hooks/exhaustive-deps` + tek satır gerekçe
3. Her kural grubundan sonra: `npx tsc --noEmit && npx jest --no-coverage` yeşil olmalı (davranış değişmediğinin kanıtı), sonra:
```powershell
git add -A
git commit -m "chore(lint): <kural-adi> ihlalleri duzeltildi (<N> adet)"
```

- [ ] **Step 2: Sıfırı doğrula**

```powershell
npx eslint .
```
Beklenen: çıktı YOK (0 hata, 0 uyarı). `Remove-Item lint-report.json`.

- [ ] **Step 3: Build gate'i aç**

`next.config.mjs`'ten `eslint: { ignoreDuringBuilds: true }` bloğunu SİL, sonra:
```powershell
npm run build
```
Beklenen: build temiz geçer.

- [ ] **Step 4: Commit**

```powershell
git add next.config.mjs
git commit -m "chore(lint): ignoreDuringBuilds kaldirildi - lint artik build gate"
```

---

## Task 16: Final Doğrulama

- [ ] **Step 1: Tam suite**

```powershell
npx tsc --noEmit
npx eslint .
npx jest --no-coverage
npm run test:e2e
npm run build
```
Beklenen: hepsi temiz; jest'te mevcut 60 + yeni testler (health 2, rate-limit ~6).

- [ ] **Step 2: Compose duman testi**

Task 7 Step 4'teki compose doğrulamasını son kodla tekrarla: `/api/health` 200 + `{"status":"ok"}`.

- [ ] **Step 3: Spec kapanış kontrolü**

`docs/superpowers/specs/2026-06-11-production-readiness-design.md` bölüm 9'daki tamamlama kriterlerini tek tek işaretle. Eksik varsa kapat.

- [ ] **Step 4: Kullanıcıya rapor**

Branch'i push/merge ETME — kullanıcı Coolify'da gerçek deploy'u kendisi yapacak (DEPLOYMENT.md ile). Sentry DSN, domain ve env değerleri kullanıcıdan.
