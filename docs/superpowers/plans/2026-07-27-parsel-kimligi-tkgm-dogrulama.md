# Parsel Kimliği ve TKGM Doğrulama — Implementasyon Planı (T0 + T1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Her yeni ilan gerçek bir koordinat taşısın, koordinattan TKGM parsel kaydı çekilip ilana snapshot olarak yazılsın, ilan detayında parsel kimliği ve gerçek sınır gösterilsin, harita uydurma koordinat üretmeyi bıraksın.

**Architecture:** Kayıt anında sunucu tarafı doğrulama (canlı proxy değil). TKGM'ye yalnızca `/api/parcel/lookup` (önizleme) ve `POST/PATCH /api/listings` (kalıcı snapshot) üzerinden gidilir; tarayıcı TKGM ile hiç konuşmaz. İş mantığı üç saf modüle çıkarılır (`lib/tkgm/parcel`, `lib/listing/areaComparison`, `lib/listing/listingCoords`), böylece Leaflet'e ve ağa dokunmadan test edilebilir.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma + PostgreSQL, Leaflet (dinamik import), Jest + ts-jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-27-parsel-kimligi-tkgm-dogrulama-design.md`

## Global Constraints

Her task'ın gereksinimleri bu bölümü kapsar.

- **TKGM taban URL:** `https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api` — nokta sorgusu `/parsel/{lat}/{lon}`.
- **Timeout: 8000 ms.** Aşıldığında `unavailable`.
- **Rate limit: kullanıcı başına dakikada 20** lookup (`RATE_LIMITS.PARCEL_LOOKUP`).
- **Alan parse'ı hem `"830.00"` hem `"830,00"` formatını doğru okumak zorundadır.** `parseFloat` tek başına YASAK — `parseFloat("1.240,50")` → `1.24` verir.
- **TKGM'den gelen il/ilçe/mahalle adları olduğu gibi saklanır.** Türkçeleştirme/normalizasyon yapılmaz.
- **İstemciden gelen parsel alanları (`adaNo`, `parselNo`, `parcelAreaSqm`, `parcelGeometry`, `parcelVerifiedAt`, `parcelLookupStatus`, `neighborhood`, `parcelQuality`) sunucuda YOK SAYILIR.** Snapshot'ı yalnızca sunucu yazar.
- **Hiçbir TKGM hatası ilan yayınlamayı engellemez.** Yalnızca eksik pin (koordinat) engeller.
- **Alan karşılaştırma eşikleri:** `diffPct < 1` → `match`, `1 ≤ d < 5` → `minor`, `d ≥ 5` → `mismatch`, taraflardan biri `null` veya resmi alan `0` → `unknown`.
- **PostGIS kurulmaz.** Poligon `Json?` olarak saklanır.
- **Yeni Prisma alanlarının hepsi nullable.** Mevcut kayıtlar bozulmaz.
- **Dokunma hedefi kuralı (proje konvansiyonu):** `min-height: 44px` gibi dokunma hedefi kuralları YALNIZCA `@media (max-width: 768px)` bloğunun içine yazılır. Media query dışına konursa masaüstü birkaç piksel büyür — bu projede daha önce üç kez regresyon üretti.
- **Test komutu:** worktree içinden `npx jest --no-coverage`. (Ana checkout'ta `npx jest --no-coverage --roots "<rootDir>/src"` gerekir — worktree kopyalarındaki testler toplanıp sahte hata vermesin diye.)
- **Baseline:** `main` = `dce07b1`, tsc 0, jest 385/385.

---

### Task 1: TKGM istemcisi

**Files:**
- Create: `src/lib/tkgm/parcel.ts`
- Test: `src/lib/tkgm/parcel.test.ts`

**Interfaces:**
- Consumes: yok (ilk task).
- Produces:
  ```ts
  export type GeoJSONPolygon = { type: 'Polygon'; coordinates: number[][][] }
  export type ParcelInfo = {
    il: string; ilce: string; mahalle: string
    adaNo: string; parselNo: string
    areaSqm: number; quality: string
    geometry: GeoJSONPolygon
  }
  export type ParcelLookupResult =
    | { ok: true; parcel: ParcelInfo }
    | { ok: false; reason: 'not_found' | 'unavailable' }
  export function parseTkgmArea(raw: unknown): number | null
  export function fetchParcelByPoint(lat: number, lng: number): Promise<ParcelLookupResult>
  ```

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/lib/tkgm/parcel.test.ts`:

```ts
import { parseTkgmArea, fetchParcelByPoint } from './parcel'

const TEKIRDAG_RESPONSE = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781], [27.58368, 41.16795], [27.58319, 41.16813], [27.58308, 41.16804], [27.58337, 41.16781]]] },
    properties: {
        ilAd: 'Tekirdağ', ilceAd: 'Muratli', mahalleAd: 'Kirkkepenekli',
        adaNo: '0', parselNo: '1871', alan: '830.00', nitelik: 'Arsa',
    },
}

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
    }) as unknown as typeof fetch
}

describe('parseTkgmArea — iki ondalık formatı da desteklenmeli', () => {
    it('noktalı ondalığı okur (koordinat endpoint formatı)', () => {
        expect(parseTkgmArea('830.00')).toBe(830)
    })

    it('virgüllü ondalığı okur (ada/parsel endpoint formatı)', () => {
        expect(parseTkgmArea('830,00')).toBe(830)
    })

    it('binlik ayracı + virgüllü ondalığı okur — parseFloat burada 1.24 verirdi', () => {
        expect(parseTkgmArea('1.240,50')).toBe(1240.5)
    })

    it('binlik ayracı + noktalı ondalığı okur', () => {
        expect(parseTkgmArea('1,240.50')).toBe(1240.5)
    })

    it('ayraçsız tam sayıyı okur', () => {
        expect(parseTkgmArea('830')).toBe(830)
    })

    it('yalnızca binlik ayracı olan değeri tam sayı okur', () => {
        expect(parseTkgmArea('1.240')).toBe(1240)
    })

    it('sayı tipini olduğu gibi döner', () => {
        expect(parseTkgmArea(830.5)).toBe(830.5)
    })

    it('geçersiz girdilerde null döner', () => {
        expect(parseTkgmArea('abc')).toBeNull()
        expect(parseTkgmArea('')).toBeNull()
        expect(parseTkgmArea(null)).toBeNull()
        expect(parseTkgmArea(undefined)).toBeNull()
        expect(parseTkgmArea({})).toBeNull()
    })
})

describe('fetchParcelByPoint', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('200 cevabını ParcelInfo olarak normalize eder', async () => {
        mockFetchOnce(200, TEKIRDAG_RESPONSE)
        const res = await fetchParcelByPoint(41.167877, 27.583458)
        expect(res.ok).toBe(true)
        if (!res.ok) throw new Error('beklenmedik')
        expect(res.parcel.adaNo).toBe('0')
        expect(res.parcel.parselNo).toBe('1871')
        expect(res.parcel.areaSqm).toBe(830)
        expect(res.parcel.quality).toBe('Arsa')
        expect(res.parcel.mahalle).toBe('Kirkkepenekli')
        expect(res.parcel.geometry.type).toBe('Polygon')
    })

    it('TKGM adlarını olduğu gibi bırakır — Türkçeleştirme yapmaz', async () => {
        mockFetchOnce(200, TEKIRDAG_RESPONSE)
        const res = await fetchParcelByPoint(41.167877, 27.583458)
        if (!res.ok) throw new Error('beklenmedik')
        expect(res.parcel.ilce).toBe('Muratli')
        expect(res.parcel.mahalle).not.toBe('Kırkkepenekli')
    })

    it('404 → not_found', async () => {
        mockFetchOnce(404, { Message: 'Parsel Bulunamadı' })
        const res = await fetchParcelByPoint(41.0082, 28.9784)
        expect(res).toEqual({ ok: false, reason: 'not_found' })
    })

    it('500 → unavailable', async () => {
        mockFetchOnce(500, {})
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('ağ hatası → unavailable', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('geometry içermeyen cevap → unavailable', async () => {
        mockFetchOnce(200, { type: 'Feature', properties: TEKIRDAG_RESPONSE.properties })
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('alan okunamayan cevap → unavailable', async () => {
        mockFetchOnce(200, { ...TEKIRDAG_RESPONSE, properties: { ...TEKIRDAG_RESPONSE.properties, alan: 'abc' } })
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/lib/tkgm/parcel.test.ts`
Expected: FAIL — `Cannot find module './parcel'`

- [ ] **Step 3: Implementasyonu yaz**

`src/lib/tkgm/parcel.ts`:

```ts
/**
 * TKGM (Tapu ve Kadastro Genel Müdürlüğü) parsel sorgu istemcisi.
 * Yalnızca sunucu tarafından çağrılır — tarayıcıdan TKGM'ye gidilmez
 * (CORS, kullanıcı IP'sinin devlet servisine açılmaması, rate limit kontrolü).
 */

const TKGM_BASE = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api'
const TIMEOUT_MS = 8000

export type GeoJSONPolygon = { type: 'Polygon'; coordinates: number[][][] }

export type ParcelInfo = {
    il: string
    ilce: string
    mahalle: string
    adaNo: string
    parselNo: string
    areaSqm: number
    quality: string
    geometry: GeoJSONPolygon
}

export type ParcelLookupResult =
    | { ok: true; parcel: ParcelInfo }
    | { ok: false; reason: 'not_found' | 'unavailable' }

/**
 * TKGM'nin `alan` alanı endpoint'e göre farklı serialize ediliyor:
 * koordinat sorgusu "830.00" (noktalı), ada/parsel sorgusu "830,00" (virgüllü).
 * parseFloat tek başına yetmez: parseFloat("1.240,50") === 1.24.
 *
 * Kural: son ayraçtan sonra 3 hane varsa o ayraç binliktir (ondalık yok),
 * aksi halde son ayraç ondalık ayracıdır ve öncekiler binliktir.
 * Gözlemlenen TKGM formatı her zaman 2 ondalık hane kullanıyor.
 */
export function parseTkgmArea(raw: unknown): number | null {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
    if (typeof raw !== 'string') return null

    const s = raw.trim()
    if (!/^\d[\d.,]*$/.test(s)) return null

    const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
    let normalized: string
    if (lastSep === -1) {
        normalized = s
    } else if (s.length - lastSep - 1 === 3) {
        normalized = s.replace(/[.,]/g, '')
    } else {
        normalized = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1)
    }

    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
}

function toParcelInfo(json: unknown): ParcelInfo | null {
    if (!json || typeof json !== 'object') return null
    const feature = json as Record<string, unknown>
    const props = feature.properties as Record<string, unknown> | undefined
    const geometry = feature.geometry as GeoJSONPolygon | undefined

    if (!props) return null
    if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) return null

    const areaSqm = parseTkgmArea(props.alan)
    if (areaSqm === null) return null

    return {
        il: String(props.ilAd ?? ''),
        ilce: String(props.ilceAd ?? ''),
        mahalle: String(props.mahalleAd ?? ''),
        adaNo: String(props.adaNo ?? ''),
        parselNo: String(props.parselNo ?? ''),
        areaSqm,
        quality: String(props.nitelik ?? ''),
        geometry,
    }
}

export async function fetchParcelByPoint(lat: number, lng: number): Promise<ParcelLookupResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(`${TKGM_BASE}/parsel/${lat}/${lng}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
        if (res.status === 404) return { ok: false, reason: 'not_found' }
        if (!res.ok) return { ok: false, reason: 'unavailable' }

        const parcel = toParcelInfo(await res.json())
        return parcel ? { ok: true, parcel } : { ok: false, reason: 'unavailable' }
    } catch {
        return { ok: false, reason: 'unavailable' }
    } finally {
        clearTimeout(timer)
    }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/lib/tkgm/parcel.test.ts`
Expected: PASS — 15 test

- [ ] **Step 5: Commit**

```bash
git add src/lib/tkgm/parcel.ts src/lib/tkgm/parcel.test.ts
git commit -m "feat(tkgm): parsel sorgu istemcisi — iki ondalik formatini da tolere eden alan parse"
```

---

### Task 2: Alan karşılaştırma yardımcısı

**Files:**
- Create: `src/lib/listing/areaComparison.ts`
- Test: `src/lib/listing/areaComparison.test.ts`

**Interfaces:**
- Consumes: yok (saf modül).
- Produces:
  ```ts
  export type AreaComparisonStatus = 'match' | 'minor' | 'mismatch' | 'unknown'
  export type AreaComparison = { status: AreaComparisonStatus; diffPct: number | null }
  export function compareArea(declaredSqm: number | null | undefined, officialSqm: number | null | undefined): AreaComparison
  ```

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/lib/listing/areaComparison.test.ts`:

```ts
import { compareArea } from './areaComparison'

describe('compareArea', () => {
    it('birebir aynı alan → match', () => {
        expect(compareArea(830, 830)).toEqual({ status: 'match', diffPct: 0 })
    })

    it('%1 altı fark → match', () => {
        const r = compareArea(834, 830)
        expect(r.status).toBe('match')
        expect(r.diffPct).toBeCloseTo(0.4819, 3)
    })

    it('%1 ile %5 arası fark → minor', () => {
        const r = compareArea(855, 830)
        expect(r.status).toBe('minor')
        expect(r.diffPct).toBeCloseTo(3.012, 2)
    })

    it('tam %5 fark → mismatch (eşik dahil)', () => {
        expect(compareArea(1050, 1000).status).toBe('mismatch')
    })

    it('%5 üstü fark → mismatch', () => {
        const r = compareArea(830, 1240)
        expect(r.status).toBe('mismatch')
        expect(r.diffPct).toBeCloseTo(33.06, 1)
    })

    it('beyan resmi alandan küçük de olsa mutlak fark alınır', () => {
        expect(compareArea(1240, 830).status).toBe('mismatch')
    })

    it('beyan yoksa → unknown', () => {
        expect(compareArea(null, 830)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('resmi alan yoksa → unknown', () => {
        expect(compareArea(830, null)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('resmi alan sıfırsa → unknown (sıfıra bölme)', () => {
        expect(compareArea(830, 0)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('undefined girdiler → unknown', () => {
        expect(compareArea(undefined, undefined)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('NaN girdiler → unknown', () => {
        expect(compareArea(NaN, 830)).toEqual({ status: 'unknown', diffPct: null })
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/lib/listing/areaComparison.test.ts`
Expected: FAIL — `Cannot find module './areaComparison'`

- [ ] **Step 3: Implementasyonu yaz**

`src/lib/listing/areaComparison.ts`:

```ts
/**
 * İlan sahibinin beyan ettiği alan ile TKGM'deki resmi alanı karşılaştırır.
 * Fark hükme değil şeffaflığa çevrilir: hisseli tapuda fark meşrudur.
 */

export type AreaComparisonStatus = 'match' | 'minor' | 'mismatch' | 'unknown'

export type AreaComparison = {
    status: AreaComparisonStatus
    diffPct: number | null
}

const UNKNOWN: AreaComparison = { status: 'unknown', diffPct: null }

export function compareArea(
    declaredSqm: number | null | undefined,
    officialSqm: number | null | undefined,
): AreaComparison {
    if (declaredSqm == null || officialSqm == null) return UNKNOWN
    if (!Number.isFinite(declaredSqm) || !Number.isFinite(officialSqm)) return UNKNOWN
    if (officialSqm === 0) return UNKNOWN

    const diffPct = (Math.abs(declaredSqm - officialSqm) / officialSqm) * 100

    if (diffPct < 1) return { status: 'match', diffPct }
    if (diffPct < 5) return { status: 'minor', diffPct }
    return { status: 'mismatch', diffPct }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/lib/listing/areaComparison.test.ts`
Expected: PASS — 11 test

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing/areaComparison.ts src/lib/listing/areaComparison.test.ts
git commit -m "feat(listing): beyan-tapu alan karsilastirma yardimcisi"
```

---

### Task 3: Prisma şeması + rate limit tanımı

**Files:**
- Modify: `prisma/schema.prisma` (`model Listing`)
- Modify: `src/lib/rate-limit.ts` (`RATE_LIMITS`)
- Test: `src/lib/rate-limit.test.ts` yoksa oluşturma — mevcut `RATE_LIMITS` testsiz bir sabit tablosudur, yeni girdi de öyle kalır.

**Interfaces:**
- Consumes: yok.
- Produces: `RATE_LIMITS.PARCEL_LOOKUP` (`{ limit: 20, windowMs: 60_000 }`) ve Prisma `Listing` üzerinde 10 yeni nullable alan.

**ÖN KOŞUL:** Docker Desktop ve `arsabil_postgres_dev` konteyneri ayakta olmalı. Değilse önce başlat: `docker start arsabil_postgres_dev`.

- [ ] **Step 1: Prisma şemasına alanları ekle**

`prisma/schema.prisma`, `model Listing` içinde `photos` satırının ALTINA, `createdAt` satırının ÜSTÜNE ekle:

```prisma
  lat                 Float?
  lng                 Float?
  neighborhood        String?
  adaNo               String?
  parselNo            String?
  parcelAreaSqm       Float?
  parcelQuality       String?
  parcelGeometry      Json?
  parcelVerifiedAt    DateTime?
  parcelLookupStatus  String?
```

- [ ] **Step 2: Rate limit girdisini ekle**

`src/lib/rate-limit.ts` içinde `RATE_LIMITS` nesnesine, `PASSWORD_RESET` satırının ALTINA ekle:

```ts
    PARCEL_LOOKUP: { limit: 20, windowMs: 60_000 }, // kullanıcı başına 20/dk (TKGM'yi yormamak için)
```

- [ ] **Step 3: Migration üret ve uygula**

Run: `npx prisma migrate dev --name parcel_identity`
Expected: `Your database is now in sync with your schema.` — yeni migration klasörü `prisma/migrations/` altında oluşur.

- [ ] **Step 4: Prisma client'ın yeni alanları tanıdığını doğrula**

Run: `npx tsc --noEmit`
Expected: 0 hata.

- [ ] **Step 5: Mevcut test paketinin bozulmadığını doğrula**

Run: `npx jest --no-coverage`
Expected: PASS — Task 1 ve 2'nin eklediği 26 testle birlikte 411/411.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/rate-limit.ts
git commit -m "feat(db): Listing'e parsel kimligi alanlari + PARCEL_LOOKUP rate limit"
```

---

### Task 4: `/api/parcel/lookup` proxy endpoint'i

**Files:**
- Create: `src/app/api/parcel/lookup/route.ts`
- Test: `src/app/api/parcel/lookup/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchParcelByPoint` (Task 1), `RATE_LIMITS.PARCEL_LOOKUP` (Task 3).
- Produces: `GET /api/parcel/lookup?lat=&lng=` →
  - 200 `{ status: 'verified', parcel: ParcelInfo }`
  - 200 `{ status: 'not_found' }` | `{ status: 'unavailable' }`
  - 400 geçersiz koordinat · 401 oturumsuz · 429 limit aşımı

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/app/api/parcel/lookup/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const fetchParcelMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByPoint: (...args: unknown[]) => fetchParcelMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    RATE_LIMITS: { PARCEL_LOOKUP: { limit: 20, windowMs: 60000 } },
}))

import { GET } from '../route'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781]]] },
}

function req(qs: string) {
    return new Request(`http://localhost/api/parcel/lookup?${qs}`)
}

describe('GET /api/parcel/lookup', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchParcelMock.mockReset().mockResolvedValue({ ok: true, parcel: PARCEL })
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa 401 döner ve TKGM hiç çağrılmaz', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(401)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('rate limit aşılırsa 429 döner ve TKGM hiç çağrılmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('rate limit anahtarı kullanıcı başınadır', async () => {
        await GET(req('lat=41.16&lng=27.58'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel:u1')
    })

    it('koordinat sayı değilse 400 döner', async () => {
        const res = await GET(req('lat=abc&lng=27.58'))
        expect(res.status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('koordinat Türkiye sınırları dışındaysa 400 döner', async () => {
        const res = await GET(req('lat=51.5&lng=-0.12'))
        expect(res.status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('başarılı sorguda parsel döner', async () => {
        const res = await GET(req('lat=41.167877&lng=27.583458'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('verified')
        expect(body.parcel.parselNo).toBe('1871')
        expect(fetchParcelMock).toHaveBeenCalledWith(41.167877, 27.583458)
    })

    it('parsel bulunamazsa 200 + not_found döner (hata değil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('not_found')
    })

    it('TKGM erişilemezse 200 + unavailable döner (hata değil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/app/api/parcel`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implementasyonu yaz**

`src/app/api/parcel/lookup/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { fetchParcelByPoint } from '@/lib/tkgm/parcel'

/** Türkiye kaba sınırlayıcı kutusu — TKGM'ye anlamsız koordinat göndermemek için. */
const TR_BOUNDS = { minLat: 35, maxLat: 43, minLng: 25, maxLng: 45 }

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined
    if (!userId) {
        return NextResponse.json({ message: 'Giriş yapmanız gerekiyor.' }, { status: 401 })
    }

    const rl = checkRateLimit(`parcel:${userId}`, RATE_LIMITS.PARCEL_LOOKUP)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla parsel sorgusu yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))

    const valid =
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= TR_BOUNDS.minLat && lat <= TR_BOUNDS.maxLat &&
        lng >= TR_BOUNDS.minLng && lng <= TR_BOUNDS.maxLng

    if (!valid) {
        return NextResponse.json({ message: 'Geçersiz koordinat.' }, { status: 400 })
    }

    const result = await fetchParcelByPoint(lat, lng)
    if (result.ok) {
        return NextResponse.json({ status: 'verified', parcel: result.parcel })
    }
    return NextResponse.json({ status: result.reason })
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/app/api/parcel`
Expected: PASS — 8 test

- [ ] **Step 5: Commit**

```bash
git add src/app/api/parcel
git commit -m "feat(api): parsel lookup proxy — auth + rate limit + TR sinir kontrolu"
```

---

### Task 5: ParcelPicker bileşeni

**Files:**
- Create: `src/components/listing-wizard/ParcelPicker.tsx`
- Create: `src/components/listing-wizard/ParcelPicker.module.css`
- Test: `src/components/listing-wizard/ParcelPicker.test.tsx`

**Interfaces:**
- Consumes: `GET /api/parcel/lookup` (Task 4), `ParcelInfo` (Task 1).
- Produces:
  ```ts
  export type ParcelPickerValue = {
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    status: 'idle' | 'verified' | 'not_found' | 'unavailable'
  }
  export function ParcelPicker(props: {
    value: ParcelPickerValue
    onChange: (patch: Partial<ParcelPickerValue>) => void
  }): JSX.Element
  ```

**NOT — Leaflet ve test sınırı:** Harita `useEffect` içinde dinamik `import('leaflet')` ile yüklenir (`MapView.tsx`'teki mevcut desen). jsdom'da bu import çözülmediğinden harita yüzeyi testte render edilmez; testler **buton, durum mesajları ve sonuç kartı** üzerinden çalışır. Bu kasıtlıdır — Leaflet'i jsdom'da test etmek kırılgandır ve korunacak davranış harita değil, akıştır.

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/components/listing-wizard/ParcelPicker.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ParcelPicker, ParcelPickerValue } from './ParcelPicker'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon' as const, coordinates: [[[27.58337, 41.16781]]] },
}

const EMPTY: ParcelPickerValue = { lat: null, lng: null, parcel: null, status: 'idle' }
const PINNED: ParcelPickerValue = { lat: 41.167877, lng: 27.583458, parcel: null, status: 'idle' }

function mockLookup(body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch
}

describe('ParcelPicker', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('pin atılmadan doğrula butonu devre dışıdır', () => {
        render(<ParcelPicker value={EMPTY} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Parseli Doğrula/i })).toBeDisabled()
    })

    it('pin atılınca doğrula butonu etkinleşir ve koordinat gösterilir', () => {
        render(<ParcelPicker value={PINNED} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Parseli Doğrula/i })).toBeEnabled()
        expect(screen.getByText(/41\.167877/)).toBeInTheDocument()
    })

    it('doğrulama başarılıysa parsel kartı gösterilir ve onChange çağrılır', async () => {
        mockLookup({ status: 'verified', parcel: PARCEL })
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: PARCEL, status: 'verified' })
        })
    })

    it('doğrulanmış değerde parsel kimliği ve resmi alan görünür', () => {
        render(<ParcelPicker value={{ ...PINNED, parcel: PARCEL, status: 'verified' }} onChange={jest.fn()} />)
        expect(screen.getByText(/Ada 0/)).toBeInTheDocument()
        expect(screen.getByText(/Parsel 1871/)).toBeInTheDocument()
        expect(screen.getByText(/Kirkkepenekli/)).toBeInTheDocument()
        expect(screen.getByText(/830 m²/)).toBeInTheDocument()
    })

    it('parsel bulunamazsa yönlendirici uyarı gösterir', async () => {
        mockLookup({ status: 'not_found' })
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'not_found' })
        })
    })

    it('not_found durumunda kullanıcıya pini taşıması söylenir', () => {
        render(<ParcelPicker value={{ ...PINNED, status: 'not_found' }} onChange={jest.fn()} />)
        expect(screen.getByText(/parselin içine taşıyın/i)).toBeInTheDocument()
    })

    it('unavailable durumunda ilanın yine yayınlanabileceği söylenir', () => {
        render(<ParcelPicker value={{ ...PINNED, status: 'unavailable' }} onChange={jest.fn()} />)
        expect(screen.getByText(/doğrulanmadan yayınlanabilir/i)).toBeInTheDocument()
    })

    it('ağ hatasında unavailable durumuna düşer', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'unavailable' })
        })
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/components/listing-wizard/ParcelPicker.test.tsx`
Expected: FAIL — `Cannot find module './ParcelPicker'`

- [ ] **Step 3: CSS modülünü yaz**

`src/components/listing-wizard/ParcelPicker.module.css`:

```css
.wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.mapBox {
    width: 100%;
    height: 280px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--input-bg);
}

.hint {
    font-size: 0.8rem;
    color: var(--label-color);
}

.coordRow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--label-color);
}

.verifyBtn {
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    background: var(--brand-gradient);
    color: #fff;
    font-weight: 800;
    font-size: 0.85rem;
    cursor: pointer;
}

.verifyBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.resultCard {
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--green-rgb), 0.35);
    background: rgba(var(--green-rgb), 0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.resultTitle {
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--card-title);
}

.resultMeta {
    font-size: 0.8rem;
    color: var(--label-color);
}

.warnCard {
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(var(--orange-rgb), 0.35);
    background: rgba(var(--orange-rgb), 0.07);
    font-size: 0.82rem;
    color: var(--label-color);
}

@media (max-width: 768px) {
    .mapBox {
        height: 220px;
    }

    .verifyBtn {
        min-height: 44px;
        width: 100%;
    }
}
```

- [ ] **Step 4: Bileşeni yaz**

`src/components/listing-wizard/ParcelPicker.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker, Polygon } from 'leaflet'
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import styles from './ParcelPicker.module.css'

export type ParcelPickerStatus = 'idle' | 'verified' | 'not_found' | 'unavailable'

export type ParcelPickerValue = {
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    status: ParcelPickerStatus
}

interface Props {
    value: ParcelPickerValue
    onChange: (patch: Partial<ParcelPickerValue>) => void
}

const TURKEY_CENTER: [number, number] = [39.0, 35.0]

export function ParcelPicker({ value, onChange }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const markerRef = useRef<Marker | null>(null)
    const polygonRef = useRef<Polygon | null>(null)
    const [verifying, setVerifying] = useState(false)

    // onChange'i ref'te tut: harita effect'i bir kez çalışsın, her render'da yeniden kurulmasın
    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    /* Haritayı bir kez kur */
    useEffect(() => {
        let cancelled = false
        void (async () => {
            const L = await import('leaflet')
            if (cancelled || !containerRef.current || mapRef.current) return

            const map = L.map(containerRef.current).setView(
                value.lat != null && value.lng != null ? [value.lat, value.lng] : TURKEY_CENTER,
                value.lat != null ? 17 : 6,
            )
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(map)

            map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
                const { lat, lng } = e.latlng
                if (markerRef.current) map.removeLayer(markerRef.current)
                if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null }
                markerRef.current = L.marker([lat, lng]).addTo(map)
                onChangeRef.current({ lat, lng, parcel: null, status: 'idle' })
            })

            mapRef.current = map
        })()

        return () => {
            cancelled = true
            mapRef.current?.remove()
            mapRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- harita yalnızca bir kez kurulur
    }, [])

    /* Doğrulanan parselin sınırını çiz */
    useEffect(() => {
        const map = mapRef.current
        if (!map || !value.parcel) return
        let cancelled = false
        void (async () => {
            const L = await import('leaflet')
            if (cancelled || !mapRef.current) return
            if (polygonRef.current) map.removeLayer(polygonRef.current)
            // GeoJSON [lng, lat] → Leaflet [lat, lng]
            const ring = value.parcel!.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
            polygonRef.current = L.polygon(ring, { color: '#10b981', weight: 2, fillOpacity: 0.12 }).addTo(map)
            map.fitBounds(polygonRef.current.getBounds(), { padding: [24, 24] })
        })()
        return () => { cancelled = true }
    }, [value.parcel])

    const handleVerify = async () => {
        if (value.lat == null || value.lng == null) return
        setVerifying(true)
        try {
            const res = await fetch(`/api/parcel/lookup?lat=${value.lat}&lng=${value.lng}`)
            const data = await res.json()
            if (data.status === 'verified' && data.parcel) {
                onChange({ parcel: data.parcel, status: 'verified' })
            } else {
                onChange({ parcel: null, status: data.status === 'not_found' ? 'not_found' : 'unavailable' })
            }
        } catch {
            onChange({ parcel: null, status: 'unavailable' })
        } finally {
            setVerifying(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div ref={containerRef} className={styles.mapBox} data-testid="parcel-map" />

            <p className={styles.hint}>
                Arsanızın bulunduğu noktaya haritadan tıklayın. Konum, ilanın haritada doğru görünmesi için zorunludur.
            </p>

            <div className={styles.coordRow}>
                {value.lat != null && value.lng != null && (
                    <span>📍 {value.lat.toFixed(6)}, {value.lng.toFixed(6)}</span>
                )}
                <button
                    type="button"
                    className={styles.verifyBtn}
                    disabled={value.lat == null || verifying}
                    onClick={handleVerify}
                >
                    {verifying ? 'Sorgulanıyor…' : 'Parseli Doğrula'}
                </button>
            </div>

            {value.status === 'verified' && value.parcel && (
                <div className={styles.resultCard}>
                    <div className={styles.resultTitle}>
                        Ada {value.parcel.adaNo} · Parsel {value.parcel.parselNo}
                    </div>
                    <div className={styles.resultMeta}>
                        {value.parcel.mahalle} · {value.parcel.quality} · {value.parcel.areaSqm.toLocaleString('tr-TR')} m²
                    </div>
                    <div className={styles.resultMeta}>TKGM kaydıyla eşleşti.</div>
                </div>
            )}

            {value.status === 'not_found' && (
                <div className={styles.warnCard}>
                    Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın — yol, dere veya kadastro dışı
                    bir noktaya denk gelmiş olabilir. Doğrulamadan da devam edebilirsiniz.
                </div>
            )}

            {value.status === 'unavailable' && (
                <div className={styles.warnCard}>
                    TKGM servisi şu an yanıt vermiyor. İlanınız doğrulanmadan yayınlanabilir, daha sonra tekrar
                    deneyebilirsiniz.
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/components/listing-wizard/ParcelPicker.test.tsx`
Expected: PASS — 8 test

- [ ] **Step 6: Commit**

```bash
git add src/components/listing-wizard/ParcelPicker.tsx src/components/listing-wizard/ParcelPicker.module.css src/components/listing-wizard/ParcelPicker.test.tsx
git commit -m "feat(wizard): ParcelPicker — haritadan pin + TKGM dogrulama onizlemesi"
```

---

### Task 6: Wizard entegrasyonu ve adım geçiş kilidi

**Files:**
- Modify: `src/components/listing-wizard/types.ts`
- Modify: `src/components/listing-wizard/WizardStep1Location.tsx`
- Modify: `src/components/listing-wizard/WizardStep2Detail.tsx`
- Modify: `src/app/listings/new/page.tsx:37` (`canProceed`)
- Test: `src/components/listing-wizard/WizardStep1Location.test.tsx` (yeni)

**Interfaces:**
- Consumes: `ParcelPicker`, `ParcelPickerValue` (Task 5), `compareArea` (Task 2).
- Produces: `WizardFormData` üzerinde `lat`, `lng`, `parcel`, `parcelStatus` alanları.

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/components/listing-wizard/WizardStep1Location.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep1Location } from './WizardStep1Location'
import { emptyFormData } from './types'

jest.mock('./ParcelPicker', () => ({
    ParcelPicker: ({ value }: { value: { lat: number | null } }) => (
        <div data-testid="parcel-picker">{value.lat == null ? 'pin-yok' : 'pin-var'}</div>
    ),
}))

describe('WizardStep1Location', () => {
    it('ParcelPicker render edilir', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toBeInTheDocument()
    })

    it('mevcut il/ilçe/adres alanları korunur', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByText('İl *')).toBeInTheDocument()
        expect(screen.getByText('İlçe')).toBeInTheDocument()
        expect(screen.getByText('Tam Adres')).toBeInTheDocument()
    })

    it('koordinat yoksa ParcelPicker pin-yok durumunu alır', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toHaveTextContent('pin-yok')
    })

    it('koordinat varsa ParcelPicker pin-var durumunu alır', () => {
        render(<WizardStep1Location data={{ ...emptyFormData, lat: 41.16, lng: 27.58 }} onChange={jest.fn()} />)
        expect(screen.getByTestId('parcel-picker')).toHaveTextContent('pin-var')
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/components/listing-wizard/WizardStep1Location.test.tsx`
Expected: FAIL — `emptyFormData` üzerinde `lat` yok (TS hatası) / ParcelPicker render edilmiyor.

- [ ] **Step 3: `types.ts`'i genişlet**

`src/components/listing-wizard/types.ts` — dosyanın tamamını şununla değiştir:

```ts
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import type { ParcelPickerStatus } from './ParcelPicker'

export interface WizardFormData {
    city: string
    district: string
    address: string
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    parcelStatus: ParcelPickerStatus
    title: string
    landSizeSqm: string
    price: string
    zoning: string
    titleDeed: string
    description: string
    phone: string
    photos: { url: string; publicId: string }[]
    reportId: string
}

export const emptyFormData: WizardFormData = {
    city: '', district: '', address: '',
    lat: null, lng: null, parcel: null, parcelStatus: 'idle',
    title: '', landSizeSqm: '', price: '',
    zoning: '', titleDeed: '', description: '', phone: '',
    photos: [],
    reportId: '',
}
```

- [ ] **Step 4: `WizardStep1Location.tsx`'e ParcelPicker'ı ekle**

`src/components/listing-wizard/WizardStep1Location.tsx` — import satırlarına ekle:

```tsx
import { ParcelPicker } from './ParcelPicker'
```

Ve `Tam Adres` alanını içeren `<div className={styles.fieldGroup}>` bloğunun HEMEN ALTINA, kapanış `</div>` etiketinden ÖNCE ekle:

```tsx
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Parsel Konumu *</label>
        <ParcelPicker
          value={{ lat: data.lat, lng: data.lng, parcel: data.parcel, status: data.parcelStatus }}
          onChange={patch => onChange({
            ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
            ...(patch.lng !== undefined ? { lng: patch.lng } : {}),
            ...(patch.parcel !== undefined ? { parcel: patch.parcel } : {}),
            ...(patch.status !== undefined ? { parcelStatus: patch.status } : {}),
          })}
        />
      </div>
```

- [ ] **Step 5: Adım geçiş kilidini ekle**

`src/app/listings/new/page.tsx:37` satırını değiştir:

```ts
    if (step === 1) return !!form.city && form.lat != null && form.lng != null
```

- [ ] **Step 6: Adım 2'ye tapu alanı ipucunu ekle**

`src/components/listing-wizard/WizardStep2Detail.tsx` — import ekle:

```tsx
import { compareArea } from '@/lib/listing/areaComparison'
```

`landSizeSqm` input'unu içeren `fieldGroup`'un içinde, input'un HEMEN ALTINA ekle:

```tsx
        {data.parcel && (() => {
          const cmp = compareArea(data.landSizeSqm ? Number(data.landSizeSqm) : null, data.parcel.areaSqm)
          return (
            <p className={styles.hintText}>
              Tapu kaydı: {data.parcel.areaSqm.toLocaleString('tr-TR')} m²
              {cmp.status === 'mismatch' && cmp.diffPct !== null && (
                <strong> — beyanınızla %{cmp.diffPct.toFixed(1)} fark var. Hisseli tapuda bu normaldir; emin değilseniz kontrol edin.</strong>
              )}
            </p>
          )
        })()}
```

`src/components/listing-wizard/wizard.module.css` sonuna ekle:

```css
.hintText {
    margin-top: 6px;
    font-size: 0.78rem;
    color: var(--label-color);
    line-height: 1.5;
}
```

- [ ] **Step 7: Testleri çalıştır**

Run: `npx jest --no-coverage src/components/listing-wizard && npx tsc --noEmit`
Expected: PASS — 4 yeni test dahil tüm wizard testleri; tsc 0 hata.

- [ ] **Step 8: Commit**

```bash
git add src/components/listing-wizard src/app/listings/new/page.tsx
git commit -m "feat(wizard): parsel konumu adimi zorunlu hale getirildi + tapu alani ipucu"
```

---

### Task 7: Sunucu tarafı snapshot (POST + PATCH)

**Files:**
- Modify: `src/app/api/listings/route.ts` (POST gövde ayrıştırma + `create`)
- Modify: `src/app/api/listings/[id]/route.ts:57` (PATCH gövde ayrıştırma + `update`)
- Create: `src/lib/listing/parcelSnapshot.ts`
- Test: `src/lib/listing/parcelSnapshot.test.ts`
- Test: `src/app/api/listings/__tests__/route.parcel.test.ts`

**Interfaces:**
- Consumes: `fetchParcelByPoint` (Task 1).
- Produces:
  ```ts
  export type ParcelSnapshot = {
    neighborhood: string | null
    adaNo: string | null
    parselNo: string | null
    parcelAreaSqm: number | null
    parcelQuality: string | null
    parcelGeometry: unknown | null
    parcelVerifiedAt: Date | null
    parcelLookupStatus: string | null
  }
  export function buildParcelSnapshot(lat: number | null, lng: number | null): Promise<ParcelSnapshot>
  ```

- [ ] **Step 1: Failing test'i yaz — saf modül**

`src/lib/listing/parcelSnapshot.test.ts`:

```ts
const fetchParcelMock = jest.fn()
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByPoint: (...args: unknown[]) => fetchParcelMock(...args),
}))

import { buildParcelSnapshot } from './parcelSnapshot'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781]]] },
}

describe('buildParcelSnapshot', () => {
    beforeEach(() => { fetchParcelMock.mockReset() })

    it('koordinat yoksa TKGM çağrılmaz ve boş snapshot döner', async () => {
        const snap = await buildParcelSnapshot(null, null)
        expect(fetchParcelMock).not.toHaveBeenCalled()
        expect(snap.parcelLookupStatus).toBeNull()
        expect(snap.parcelVerifiedAt).toBeNull()
        expect(snap.adaNo).toBeNull()
    })

    it('doğrulanan parselin tüm alanlarını doldurur', async () => {
        fetchParcelMock.mockResolvedValue({ ok: true, parcel: PARCEL })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.adaNo).toBe('0')
        expect(snap.parselNo).toBe('1871')
        expect(snap.neighborhood).toBe('Kirkkepenekli')
        expect(snap.parcelAreaSqm).toBe(830)
        expect(snap.parcelQuality).toBe('Arsa')
        expect(snap.parcelGeometry).toEqual(PARCEL.geometry)
        expect(snap.parcelLookupStatus).toBe('verified')
        expect(snap.parcelVerifiedAt).toBeInstanceOf(Date)
    })

    it('parsel bulunamazsa durum kaydedilir ama alanlar boş kalır', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.parcelLookupStatus).toBe('not_found')
        expect(snap.parcelVerifiedAt).toBeNull()
        expect(snap.adaNo).toBeNull()
        expect(snap.parcelGeometry).toBeNull()
    })

    it('servis erişilemezse unavailable kaydedilir', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.parcelLookupStatus).toBe('unavailable')
        expect(snap.parcelVerifiedAt).toBeNull()
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/lib/listing/parcelSnapshot.test.ts`
Expected: FAIL — `Cannot find module './parcelSnapshot'`

- [ ] **Step 3: Saf modülü yaz**

`src/lib/listing/parcelSnapshot.ts`:

```ts
import { fetchParcelByPoint } from '@/lib/tkgm/parcel'

export type ParcelSnapshot = {
    neighborhood: string | null
    adaNo: string | null
    parselNo: string | null
    parcelAreaSqm: number | null
    parcelQuality: string | null
    parcelGeometry: unknown | null
    parcelVerifiedAt: Date | null
    parcelLookupStatus: string | null
}

const EMPTY: ParcelSnapshot = {
    neighborhood: null, adaNo: null, parselNo: null,
    parcelAreaSqm: null, parcelQuality: null, parcelGeometry: null,
    parcelVerifiedAt: null, parcelLookupStatus: null,
}

/**
 * Parsel snapshot'ını YALNIZCA sunucu üretir. İstemcinin gövdede gönderdiği
 * parsel alanları asla kullanılmaz — aksi halde "TKGM ile doğrulandı" rozeti
 * taklit edilebilir hale gelir.
 */
export async function buildParcelSnapshot(
    lat: number | null,
    lng: number | null,
): Promise<ParcelSnapshot> {
    if (lat == null || lng == null) return { ...EMPTY }

    const result = await fetchParcelByPoint(lat, lng)
    if (!result.ok) {
        return { ...EMPTY, parcelLookupStatus: result.reason }
    }

    const p = result.parcel
    return {
        neighborhood: p.mahalle,
        adaNo: p.adaNo,
        parselNo: p.parselNo,
        parcelAreaSqm: p.areaSqm,
        parcelQuality: p.quality,
        parcelGeometry: p.geometry,
        parcelVerifiedAt: new Date(),
        parcelLookupStatus: 'verified',
    }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/lib/listing/parcelSnapshot.test.ts`
Expected: PASS — 4 test

- [ ] **Step 5: POST güvenlik testini yaz**

`src/app/api/listings/__tests__/route.parcel.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const createMock = jest.fn()
const buildSnapshotMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        listing: {
            create: (...args: unknown[]) => createMock(...args),
            findUnique: jest.fn().mockResolvedValue(null),
        },
        report: { findFirst: jest.fn().mockResolvedValue(null) },
    },
}))
jest.mock('@/lib/plan', () => ({
    checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true }),
}))
jest.mock('@/lib/listing/parcelSnapshot', () => ({
    buildParcelSnapshot: (...args: unknown[]) => buildSnapshotMock(...args),
}))

import { POST } from '../route'

const VERIFIED_SNAPSHOT = {
    neighborhood: 'Kirkkepenekli', adaNo: '0', parselNo: '1871',
    parcelAreaSqm: 830, parcelQuality: 'Arsa',
    parcelGeometry: { type: 'Polygon', coordinates: [] },
    parcelVerifiedAt: new Date('2026-07-27T00:00:00Z'), parcelLookupStatus: 'verified',
}

function postReq(body: unknown) {
    return new Request('http://localhost/api/listings', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/listings — parsel snapshot', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        createMock.mockReset().mockResolvedValue({ id: 'l1' })
        buildSnapshotMock.mockReset().mockResolvedValue(VERIFIED_SNAPSHOT)
    })

    it('koordinatı kaydeder ve snapshot üretmek için TKGM sorgusunu tetikler', async () => {
        await POST(postReq({ city: 'Tekirdağ', lat: 41.167877, lng: 27.583458 }))
        expect(buildSnapshotMock).toHaveBeenCalledWith(41.167877, 27.583458)
        const data = createMock.mock.calls[0][0].data
        expect(data.lat).toBe(41.167877)
        expect(data.lng).toBe(27.583458)
        expect(data.adaNo).toBe('0')
        expect(data.parcelLookupStatus).toBe('verified')
    })

    it('GÜVENLİK: istemcinin gönderdiği sahte parsel alanları yok sayılır', async () => {
        buildSnapshotMock.mockResolvedValue({
            neighborhood: null, adaNo: null, parselNo: null,
            parcelAreaSqm: null, parcelQuality: null, parcelGeometry: null,
            parcelVerifiedAt: null, parcelLookupStatus: 'not_found',
        })

        await POST(postReq({
            city: 'Tekirdağ', lat: 41.167877, lng: 27.583458,
            adaNo: '999', parselNo: '12345', neighborhood: 'Sahte Mahalle',
            parcelAreaSqm: 99999, parcelQuality: 'Arsa',
            parcelGeometry: { type: 'Polygon', coordinates: [] },
            parcelVerifiedAt: '2020-01-01T00:00:00Z', parcelLookupStatus: 'verified',
        }))

        const data = createMock.mock.calls[0][0].data
        expect(data.adaNo).toBeNull()
        expect(data.parselNo).toBeNull()
        expect(data.neighborhood).toBeNull()
        expect(data.parcelAreaSqm).toBeNull()
        expect(data.parcelVerifiedAt).toBeNull()
        expect(data.parcelLookupStatus).toBe('not_found')
    })

    it('koordinat gönderilmezse lat/lng null kalır ve TKGM çağrılmaz için null geçilir', async () => {
        buildSnapshotMock.mockResolvedValue({
            neighborhood: null, adaNo: null, parselNo: null,
            parcelAreaSqm: null, parcelQuality: null, parcelGeometry: null,
            parcelVerifiedAt: null, parcelLookupStatus: null,
        })
        await POST(postReq({ city: 'Tekirdağ' }))
        expect(buildSnapshotMock).toHaveBeenCalledWith(null, null)
        const data = createMock.mock.calls[0][0].data
        expect(data.lat).toBeNull()
        expect(data.lng).toBeNull()
    })
})
```

**NOT:** `@/lib/plan` mock'undaki fonksiyon adı `checkPlanLimit` olarak gerçek koddan doğrulandı (`src/app/api/listings/route.ts:5`). Mock'un dönüş şekli (`{ allowed: true }`) implementasyon sırasında gerçek çağrı yerinden teyit edilmelidir; farklıysa yalnızca mock uyarlanır, testin iddiaları değişmez.

- [ ] **Step 6: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/app/api/listings/__tests__/route.parcel.test.ts`
Expected: FAIL — `data.lat` undefined (POST henüz koordinat okumuyor).

- [ ] **Step 7: POST'u güncelle**

`src/app/api/listings/route.ts` — import ekle:

```ts
import { buildParcelSnapshot } from '@/lib/listing/parcelSnapshot'
```

Gövde ayrıştırmasına `lat, lng` ekle (parsel alanları BİLEREK okunmuyor):

```ts
        const {
            reportId, city, district, notes,
            title, address, phone, description,
            price, landSizeSqm, zoning, titleDeed, photos,
            lat, lng,
        } = await req.json()
        // NOT: adaNo/parselNo/parcelAreaSqm/parcelGeometry/parcelVerifiedAt/
        // parcelLookupStatus/neighborhood/parcelQuality gövdeden OKUNMAZ —
        // snapshot'ı yalnızca sunucu üretir (rozet taklit edilemesin diye).
```

`prisma.listing.create` çağrısından ÖNCE ekle:

```ts
        const latNum = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null
        const lngNum = lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null
        const parcelSnapshot = await buildParcelSnapshot(latNum, lngNum)
```

`create`'in `data` nesnesinde `photos: photos || [],` satırının ALTINA ekle:

```ts
                lat: latNum,
                lng: lngNum,
                ...parcelSnapshot,
```

- [ ] **Step 8: PATCH'i güncelle**

`src/app/api/listings/[id]/route.ts` — import ekle:

```ts
import { buildParcelSnapshot } from '@/lib/listing/parcelSnapshot'
```

`:57` satırındaki gövde ayrıştırmasına `lat, lng` ekle, ardından `update` çağrısından ÖNCE:

```ts
        const latNum = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null
        const lngNum = lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null

        // Koordinat gönderildiyse snapshot yeniden üretilir; gönderilmediyse
        // mevcut snapshot'a dokunulmaz.
        const parcelFields = (latNum != null && lngNum != null)
            ? { lat: latNum, lng: lngNum, ...(await buildParcelSnapshot(latNum, lngNum)) }
            : {}
```

Ve `update`'in `data` nesnesinin SONUNA `...parcelFields,` ekle.

- [ ] **Step 9: Testleri çalıştır**

Run: `npx jest --no-coverage src/app/api/listings src/lib/listing && npx tsc --noEmit`
Expected: PASS — 3 yeni POST testi + 4 snapshot testi; tsc 0 hata.

- [ ] **Step 10: Commit**

```bash
git add src/lib/listing/parcelSnapshot.ts src/lib/listing/parcelSnapshot.test.ts src/app/api/listings
git commit -m "feat(api): parsel snapshot'i sunucuda uretilir — istemci verisi yok sayilir"
```

---

### Task 8: İlan detayı — mock alan bugu + parsel kimliği + alan karşılaştırma

**Files:**
- Modify: `src/app/listing/[id]/page.tsx` (`MOCK_LISTING`, "Parsel Detayları" bölümü)
- Modify: `src/app/listing/[id]/page.module.css`
- Test: `src/app/listing/[id]/listingDisplay.test.ts` (yeni)
- Create: `src/lib/listing/listingDisplay.ts`

**Interfaces:**
- Consumes: `compareArea` (Task 2).
- Produces:
  ```ts
  export function formatParcelIdentity(l: { adaNo?: string | null; parselNo?: string | null; neighborhood?: string | null }): string | null
  export function formatAreaCells(l: { landSizeSqm?: number | null; parcelAreaSqm?: number | null }): { declared: string; official: string | null; warning: string | null }
  ```

**BULUNAN GERÇEK BUG:** `src/app/listing/[id]/page.tsx:71` gerçek API cevabını `MOCK_LISTING` üzerine biniyor. API `landSizeSqm` döndürüyor ama sayfa `listing.m2` render ediyor — bu alan API'de yok, dolayısıyla **her ilanda mock'taki sabit `820` gösteriliyor**. Aynı şekilde `lat: 41.042, lng: 29.008` (Beşiktaş) mock'tan geliyor. Beyan/tapu karşılaştırması bu düzeltilmeden anlamsız olur.

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/lib/listing/listingDisplay.test.ts`:

```ts
import { formatParcelIdentity, formatAreaCells } from './listingDisplay'

describe('formatParcelIdentity', () => {
    it('ada/parsel/mahalle varsa okunur bir satır üretir', () => {
        expect(formatParcelIdentity({ adaNo: '0', parselNo: '1871', neighborhood: 'Kirkkepenekli' }))
            .toBe('Ada 0 · Parsel 1871 · Kirkkepenekli')
    })

    it('mahalle yoksa onu atlar', () => {
        expect(formatParcelIdentity({ adaNo: '12', parselNo: '5', neighborhood: null }))
            .toBe('Ada 12 · Parsel 5')
    })

    it('parsel numarası yoksa null döner', () => {
        expect(formatParcelIdentity({ adaNo: '0', parselNo: null, neighborhood: 'X' })).toBeNull()
    })

    it('hiç veri yoksa null döner', () => {
        expect(formatParcelIdentity({})).toBeNull()
    })
})

describe('formatAreaCells', () => {
    it('beyan yoksa tire gösterir — sabit 820 mock değeri ASLA görünmemeli', () => {
        const r = formatAreaCells({ landSizeSqm: null, parcelAreaSqm: null })
        expect(r.declared).toBe('—')
        expect(r.official).toBeNull()
        expect(r.warning).toBeNull()
    })

    it('beyanı Türkçe biçimde gösterir', () => {
        expect(formatAreaCells({ landSizeSqm: 1240, parcelAreaSqm: null }).declared).toBe('1.240 m²')
    })

    it('resmi alanı ayrı hücre olarak döner', () => {
        expect(formatAreaCells({ landSizeSqm: 830, parcelAreaSqm: 830 }).official).toBe('830 m²')
    })

    it('%5 altı farkta uyarı vermez', () => {
        expect(formatAreaCells({ landSizeSqm: 840, parcelAreaSqm: 830 }).warning).toBeNull()
    })

    it('%5 üstü farkta uyarı metni döner', () => {
        const r = formatAreaCells({ landSizeSqm: 1240, parcelAreaSqm: 830 })
        expect(r.warning).toMatch(/%49,4|%49\.4/)
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/lib/listing/listingDisplay.test.ts`
Expected: FAIL — `Cannot find module './listingDisplay'`

- [ ] **Step 3: Saf modülü yaz**

`src/lib/listing/listingDisplay.ts`:

```ts
import { compareArea } from './areaComparison'

const fmt = (n: number) => `${n.toLocaleString('tr-TR')} m²`

export function formatParcelIdentity(l: {
    adaNo?: string | null
    parselNo?: string | null
    neighborhood?: string | null
}): string | null {
    if (!l.parselNo) return null
    const parts = [`Ada ${l.adaNo ?? '—'}`, `Parsel ${l.parselNo}`]
    if (l.neighborhood) parts.push(l.neighborhood)
    return parts.join(' · ')
}

export function formatAreaCells(l: {
    landSizeSqm?: number | null
    parcelAreaSqm?: number | null
}): { declared: string; official: string | null; warning: string | null } {
    const declared = l.landSizeSqm != null ? fmt(l.landSizeSqm) : '—'
    const official = l.parcelAreaSqm != null ? fmt(l.parcelAreaSqm) : null

    const cmp = compareArea(l.landSizeSqm ?? null, l.parcelAreaSqm ?? null)
    const warning = cmp.status === 'mismatch' && cmp.diffPct !== null
        ? `Beyan ile tapu kaydı arasında %${cmp.diffPct.toFixed(1).replace('.', ',')} fark var. Hisseli tapuda bu normal olabilir.`
        : null

    return { declared, official, warning }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/lib/listing/listingDisplay.test.ts`
Expected: PASS — 10 test

- [ ] **Step 5: Mock alanları temizle**

`src/app/listing/[id]/page.tsx` — `MOCK_LISTING` nesnesinden şu üç satırı SİL:

```ts
    m2: 820,
    lat: 41.042,
    lng: 29.008,
```

Ve nesnenin sonuna, `user` satırının ÜSTÜNE ekle:

```ts
    landSizeSqm: null as number | null,
    lat: null as number | null,
    lng: null as number | null,
    adaNo: null as string | null,
    parselNo: null as string | null,
    neighborhood: null as string | null,
    parcelAreaSqm: null as number | null,
    parcelQuality: null as string | null,
    parcelVerifiedAt: null as string | null,
```

- [ ] **Step 6: "Parsel Detayları" bölümünü güncelle**

`src/app/listing/[id]/page.tsx` — import ekle:

```tsx
import { formatParcelIdentity, formatAreaCells } from '@/lib/listing/listingDisplay';
```

`['Alan', `${listing.m2} m²`],` satırını içeren dizi tanımının ÜSTÜNE ekle:

```tsx
                                const areaCells = formatAreaCells(listing);
                                const parcelId = formatParcelIdentity(listing);
```

`['Alan', `${listing.m2} m²`],` satırını şununla değiştir:

```tsx
                                        ['Alan (beyan)', areaCells.declared],
                                        ...(areaCells.official ? [['Alan (tapu · TKGM)', areaCells.official] as [string, string]] : []),
```

`detailGrid`'i saran bloğun HEMEN ÜSTÜNE ekle:

```tsx
                                {parcelId && (
                                    <div className={styles.parcelRow}>
                                        <span className={styles.parcelId}>{parcelId}</span>
                                        <span className={listing.parcelVerifiedAt ? styles.parcelBadgeOk : styles.parcelBadgeNo}>
                                            {listing.parcelVerifiedAt
                                                ? `TKGM ile doğrulandı · ${new Date(listing.parcelVerifiedAt).toLocaleDateString('tr-TR')}`
                                                : 'Doğrulanmadı'}
                                        </span>
                                    </div>
                                )}
```

`detailGrid`'i saran bloğun HEMEN ALTINA ekle:

```tsx
                                {areaCells.warning && (
                                    <div className={styles.areaWarning}>⚠️ {areaCells.warning}</div>
                                )}
```

- [ ] **Step 7: CSS ekle**

`src/app/listing/[id]/page.module.css` sonuna ekle (bu dosyada `pageStyles.scope.test.ts` adlı bir kapsam-guard testi var — yeni sınıflar `--seal-*` token'ı TANIMLAMADIĞI ve mobil media query'nin dışında kaldığı sürece guard'ı bozmaz; yine de Step 8'de o testin yeşil kaldığı doğrulanacak):

```css
.parcelRow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.parcelId {
    font-weight: 800;
    font-size: 0.88rem;
    color: var(--card-title);
}

.parcelBadgeOk {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--green);
    background: rgba(var(--green-rgb), 0.12);
}

.parcelBadgeNo {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--label-color);
    background: rgba(148, 163, 184, 0.16);
}

.areaWarning {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--label-color);
    background: rgba(var(--orange-rgb), 0.08);
    border: 1px solid rgba(var(--orange-rgb), 0.3);
}
```

- [ ] **Step 8: Doğrula**

Run: `npx jest --no-coverage src/lib/listing && npx tsc --noEmit`
Expected: PASS; tsc 0 hata.

- [ ] **Step 9: Commit**

```bash
git add src/lib/listing/listingDisplay.ts src/lib/listing/listingDisplay.test.ts "src/app/listing/[id]"
git commit -m "fix(listing): sabit 820 m2 mock bugu giderildi + parsel kimligi ve alan karsilastirmasi"
```

---

### Task 9: MapView — rastgele koordinat üretimini kaldır

**Files:**
- Create: `src/lib/listing/listingCoords.ts`
- Test: `src/lib/listing/listingCoords.test.ts`
- Modify: `src/components/marketplace/MapView.tsx:245-248` (rastgele koordinat fallback'i)
- Modify: `src/components/marketplace/MapView.tsx:649` (render kökü — bildirim)
- Modify: `src/components/marketplace/MapView.tsx` (ISTANBUL_COORDS kullanımı)

**Interfaces:**
- Consumes: yok (saf modül).
- Produces:
  ```ts
  export function splitListingsByCoords<T extends { lat?: number | null; lng?: number | null }>(
    listings: T[],
  ): { placed: (T & { lat: number; lng: number })[]; unplaced: T[] }
  ```

- [ ] **Step 1: Failing test'i yaz — yeni dosya**

`src/lib/listing/listingCoords.test.ts`:

```ts
import { splitListingsByCoords } from './listingCoords'

describe('splitListingsByCoords', () => {
    it('koordinatı olan ilanlar placed listesine düşer', () => {
        const { placed, unplaced } = splitListingsByCoords([{ id: 'a', lat: 41.1, lng: 27.5 }])
        expect(placed).toHaveLength(1)
        expect(unplaced).toHaveLength(0)
        expect(placed[0].lat).toBe(41.1)
    })

    it('koordinatsız ilan HARİTAYA KONMAZ — uydurma konum üretilmez', () => {
        const { placed, unplaced } = splitListingsByCoords([{ id: 'a' }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('lat var lng yoksa yerleştirilmez', () => {
        const { placed, unplaced } = splitListingsByCoords([{ id: 'a', lat: 41.1, lng: null }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('null koordinat yerleştirilmez', () => {
        const { placed } = splitListingsByCoords([{ id: 'a', lat: null, lng: null }])
        expect(placed).toHaveLength(0)
    })

    it('NaN koordinat yerleştirilmez', () => {
        const { placed } = splitListingsByCoords([{ id: 'a', lat: NaN, lng: 27.5 }])
        expect(placed).toHaveLength(0)
    })

    it('0,0 koordinatı geçerli sayılmaz (varsayılan/boş değer göstergesi)', () => {
        const { placed, unplaced } = splitListingsByCoords([{ id: 'a', lat: 0, lng: 0 }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('karışık listeyi ikiye ayırır ve sırayı korur', () => {
        const { placed, unplaced } = splitListingsByCoords([
            { id: 'a', lat: 41.1, lng: 27.5 },
            { id: 'b' },
            { id: 'c', lat: 39.9, lng: 32.8 },
        ])
        expect(placed.map(l => l.id)).toEqual(['a', 'c'])
        expect(unplaced.map(l => l.id)).toEqual(['b'])
    })

    it('boş liste boş sonuç verir', () => {
        expect(splitListingsByCoords([])).toEqual({ placed: [], unplaced: [] })
    })
})
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest --no-coverage src/lib/listing/listingCoords.test.ts`
Expected: FAIL — `Cannot find module './listingCoords'`

- [ ] **Step 3: Saf modülü yaz**

`src/lib/listing/listingCoords.ts`:

```ts
/**
 * İlanları haritaya konabilenler ve konamayanlar diye ayırır.
 *
 * NEDEN VAR: MapView eskiden koordinatı olmayan ilanı rastgele bir İstanbul
 * koordinatına yerleştiriyordu (`listing.lat ?? ISTANBUL_COORDS[...]`). Listing
 * şemasında lat/lng hiç olmadığı için harita tamamen uydurmaydı. Kural burada,
 * Leaflet'ten bağımsız ve test edilebilir biçimde tutulur.
 */

type WithCoords = { lat?: number | null; lng?: number | null }

export function splitListingsByCoords<T extends WithCoords>(
    listings: T[],
): { placed: (T & { lat: number; lng: number })[]; unplaced: T[] } {
    const placed: (T & { lat: number; lng: number })[] = []
    const unplaced: T[] = []

    for (const l of listings) {
        const { lat, lng } = l
        const valid =
            typeof lat === 'number' && Number.isFinite(lat) &&
            typeof lng === 'number' && Number.isFinite(lng) &&
            !(lat === 0 && lng === 0)

        if (valid) placed.push(l as T & { lat: number; lng: number })
        else unplaced.push(l)
    }

    return { placed, unplaced }
}
```

- [ ] **Step 4: Test'i çalıştır, geçtiğini gör**

Run: `npx jest --no-coverage src/lib/listing/listingCoords.test.ts`
Expected: PASS — 8 test

- [ ] **Step 5: MapView'ı güncelle**

`src/components/marketplace/MapView.tsx` — import ekle:

```ts
import { splitListingsByCoords } from '@/lib/listing/listingCoords';
```

`listings.forEach((listing, idx) => {` satırının ÜSTÜNE ekle:

```ts
            const { placed, unplaced } = splitListingsByCoords(listings);
            setUnplacedCount(unplaced.length);
```

`listings.forEach((listing, idx) => {` satırını şununla değiştir:

```ts
            placed.forEach((listing) => {
```

`:246-247` satırlarını (rastgele koordinat fallback'i) şununla değiştir:

```ts
                const lat = listing.lat;
                const lng = listing.lng;
```

`:248` satırındaki skor fallback'i de rastgele üretiyor; sabit bir varsayılana çevir:

```ts
                const score = listing.fizibiliteSkoru ?? 70;
```

Bileşenin state tanımlarının yanına ekle:

```ts
    const [unplacedCount, setUnplacedCount] = useState(0);
```

**DİKKAT — MapView'ın CSS modülü YOKTUR.** Dosyada hiç `import styles from …` satırı bulunmuyor; tüm stiller inline `style={{…}}` nesneleriyle yazılmış (`:103-114`, `:118-122` örnekleri). Yeni bir CSS modülü eklemek dosyanın kurulu desenini bozar — bildirim de inline stille yazılacak.

`:649`'daki render kökü (`return ( <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 400 }}>`) zaten `position: relative` olduğu için mutlak konumlandırma doğrudan çalışır. Bu kök `div`'in İÇİNE, ilk çocuğun HEMEN ÜSTÜNE ekle:

```tsx
            {unplacedCount > 0 && (
                <div style={{
                    position: 'absolute', left: 12, bottom: 12, zIndex: 500,
                    padding: '6px 12px', borderRadius: 999,
                    fontSize: '0.74rem', fontWeight: 600,
                    color: 'var(--label-color)',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    backdropFilter: 'blur(8px)',
                }}>
                    {unplacedCount} ilanın konumu belirtilmemiş, haritada gösterilmiyor.
                </div>
            )}
```

- [ ] **Step 6: `ISTANBUL_COORDS` artık kullanılmıyorsa sil**

Run: `grep -n "ISTANBUL_COORDS" src/components/marketplace/MapView.tsx`
Kalan kullanım yoksa sabit tanımını sil. Kullanımı varsa (örn. harita başlangıç merkezi) dokunma.

- [ ] **Step 7: Doğrula**

Run: `npx jest --no-coverage && npx tsc --noEmit && npx eslint src --ext .ts,.tsx`
Expected: jest PASS; tsc 0 hata; eslint bu plandan kaynaklanan yeni ihlal yok (5 hata/12 uyarı pre-existing'dir).

- [ ] **Step 8: Commit**

```bash
git add src/lib/listing/listingCoords.ts src/lib/listing/listingCoords.test.ts src/components/marketplace
git commit -m "fix(map): rastgele Istanbul koordinati uretimi kaldirildi — koordinatsiz ilan haritada gosterilmiyor"
```

---

### Task 10: Final doğrulama

**Files:** yok (doğrulama task'ı). Sorun bulunursa düzeltmeler ilgili dosyalarda yapılır.

**Interfaces:**
- Consumes: Task 1-9'un tamamı.
- Produces: yok.

- [ ] **Step 1: Tam komut paketini çalıştır**

```bash
npx tsc --noEmit
npx eslint src --ext .ts,.tsx
npx jest --no-coverage
npm run build
```

Expected: tsc 0 hata · eslint yeni ihlal yok · jest tüm testler yeşil (385 baseline + ~66 yeni ≈ 451) · build başarılı.

- [ ] **Step 2: Ortamı ayağa kaldır**

```bash
docker start arsabil_postgres_dev
npm run dev:next
```

- [ ] **Step 3: Canlı senaryo — doğrulanan parsel**

Playwright ile, giriş yapmış bir kullanıcıyla:
1. `/listings/new` aç
2. İl: Tekirdağ, İlçe: Muratlı
3. Haritada `41.167877, 27.583458` noktasına tıkla
4. "Parseli Doğrula" → **Ada 0 · Parsel 1871 · Kirkkepenekli · Arsa · 830 m²** kartının göründüğünü ve yeşil poligonun çizildiğini ekran görüntüsüyle doğrula
5. Adım 2'de m² alanına `1240` gir → tapu farkı uyarısının (%49,4) göründüğünü doğrula
6. İlanı yayınla
7. İlan detayında: parsel kimlik satırı + "TKGM ile doğrulandı" rozeti + "Alan (beyan) 1.240 m²" ve "Alan (tapu · TKGM) 830 m²" hücreleri + uyarı kutusu görünmeli

- [ ] **Step 4: Canlı senaryo — pin zorunluluğu**

`/listings/new` aç, sadece il seç, pin ATMA → "İleri" butonunun devre dışı kaldığını doğrula.

- [ ] **Step 5: Canlı senaryo — parsel bulunamayan nokta**

Haritada denize/İstanbul merkezine (`41.0082, 28.9784`) tıkla → "Parseli Doğrula" → "pini parselin içine taşıyın" uyarısı görünmeli, "İleri" butonu **etkin kalmalı** (doğrulama zorunlu değil).

- [ ] **Step 6: Canlı senaryo — harita bugunun kapandığı**

`/marketplace` aç, harita sekmesine geç → koordinatsız eski ilanların haritada **görünmediğini** ve "N ilanın konumu belirtilmemiş" notunun çıktığını doğrula.

- [ ] **Step 7: Görsel doğrulama — light ve dark tema**

Adım 3'ü hem light hem dark temada tekrarla. Parsel sonuç kartı, rozet ve uyarı kutusunun her iki temada da okunabilir olduğunu **`getComputedStyle` ile** kontrol et (yalnızca ekran görüntüsüne güvenme — bu projede daha önce yanıltmıştı).

- [ ] **Step 8: Mobil doğrulama**

390×844 görünümde `/listings/new` Adım 1'i aç: harita 220px yüksekliğe düşmeli, "Parseli Doğrula" butonu tam genişlik ve en az 44px yükseklikte olmalı, yatay taşma olmamalı.

- [ ] **Step 9: Bulguları raporla**

Bulunan her sorun için: dosya:satır, beklenen/gözlenen, düzeltme önerisi. Sorun yoksa commit gerekmez.

---

## Self-Review

**Spec kapsam kontrolü:**

| Spec bölümü | Karşılayan task |
|---|---|
| §3 TKGM servisi + §3.1 tuzaklar | Task 1 |
| §4 K1 kayıt anında doğrula | Task 7 |
| §4 K2 koordinat zorunlu | Task 6 (Step 5) |
| §4 K3 alan karşılaştırma | Task 2, 6 (Step 6), 8 |
| §4 K4 istemci verisine güvenme | Task 7 (Step 5 güvenlik testi) |
| §4 K6 PostGIS yok | Task 3 (`Json?`) |
| §5 veri modeli | Task 3 |
| §6 bileşenler | Task 1-9 (tablo birebir eşleşiyor) |
| §7 veri akışı | Task 5, 6, 7, 8 |
| §8 hata yönetimi | Task 1 (reason), 5 (mesajlar), 7 (status kaydı) |
| §9 test stratejisi | Her task'ın kendi testleri + Task 10 |
| §11 başarı ölçütü | Task 10 Step 3-6 |

**Kapsam dışı olduğu doğrulandı:** `/hesapla` entegrasyonu, ada/parsel ile sorgu, e-Plan katmanı, AFAD, mevcut ilanlara toplu koordinat atama, snapshot tazeleme — hiçbiri bu planda task almadı (spec §10 ile uyumlu).

**Tip tutarlılığı:** `ParcelInfo` (Task 1) → `ParcelPickerValue.parcel` (Task 5) → `WizardFormData.parcel` (Task 6) → `buildParcelSnapshot` çıktısı (Task 7) zinciri kontrol edildi. `ParcelPickerStatus` Task 5'te tanımlanıp Task 6'da import ediliyor. `compareArea` imzası Task 2, 6 ve 8'de aynı.

**Plan yazımı sırasında doğrulanan ve düzeltilen üç varsayım:**
1. `@/lib/plan` export'u `checkListingLimit` değil **`checkPlanLimit`** (`src/app/api/listings/route.ts:5`).
2. İlan detayının CSS modülü `listing.module.css` değil **`page.module.css`**; aynı klasörde `pageStyles.scope.test.ts` kapsam-guard testi var.
3. `MapView.tsx`'in **CSS modülü hiç yok** — tüm stiller inline. Task 9'daki bildirim de inline stille yazılıyor.

**Kalan risk:** Task 7 Step 5'teki `checkPlanLimit` mock'unun dönüş şekli (`{ allowed: true }`) gerçek çağrı yerinden teyit edilmeli.
