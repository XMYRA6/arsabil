# TKGM İdari Yapı Otomatik Tamamlama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ManualParcelEntryForm`'daki İl/İlçe/Mahalle serbest-metin alanlarını, TKGM'nin kendi
gerçek idari-yapı API'sinden (`idariYapi/ilListe`, `idariYapi/ilceListe/{ilId}`,
`idariYapi/mahalleListe/{ilceId}`) beslenen basamaklı otomatik-tamamlama alanlarına dönüştürmek
ve mahalle seçildiğinde TKGM'nin gerçek sınır poligonundan hesaplanan bir merkez noktayla
haritayı doğrudan oraya taşımak (Nominatim serbest-adres aramasını bu durumda devre dışı
bırakarak).

**Architecture:** Sunucu tarafında `src/lib/tkgm/idariYapi.ts` üç TKGM ucunu sarmalar ve
GeoJSON `properties`'i sade `{id,text}` listelerine indirger (mahalle için ayrıca poligondan
bir centroid hesaplar). Üç ince API route'u (`/api/tkgm/il`, `/api/tkgm/ilce`,
`/api/tkgm/mahalle`) bunları `parcel/lookup` ile aynı rate-limit desenine sararak istemciye
açar. İstemci tarafında yeni, paylaşılan bir `TkgmAutocompleteField` combobox bileşeni
İl/İlçe/Mahalle'nin üçünde de kullanılır; `ManualParcelEntryForm` bu üç alanı zincirler
(il seçilince ilçe listesi, ilçe seçilince mahalle listesi çekilir) ve "Sorgula" butonu artık
mahalle centroid'i varsa Nominatim'e hiç gitmeden doğrudan `onLocationFound` çağırır.

**Tech Stack:** Next.js 16 App Router (route handlers), React 19, TypeScript, Jest +
Testing Library, CSS Modules — hiçbir yeni bağımlılık eklenmiyor.

## Global Constraints

- TKGM yalnızca sunucudan çağrılır (`src/lib/tkgm/*` içinden) — istemci hiçbir zaman
  `cbsapi.tkgm.gov.tr`'ye doğrudan fetch atmaz. Mevcut `parcel.ts`'in üstündeki kural aynen
  geçerli.
- Yeni rate-limit eşikleri: `TKGM_IDARI_YAPI: { limit: 30, windowMs: 60_000 }` (kullanıcı
  başına), `TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60_000 }` (IP başına) —
  `src/lib/rate-limit.ts`'teki `RATE_LIMITS` sabitine eklenir, başka hiçbir eşik değişmez.
- Centroid hesaplaması alan-ağırlıklı gerçek bir centroid DEĞİL — Polygon/MultiPolygon'daki
  tüm köşe noktalarının basit aritmetik ortalaması (yaklaşık harita-merkezleme amaçlı,
  yeterli). Yeni bir geometri kütüphanesi (turf.js vb.) EKLENMEZ.
- `ManualParcelReference` tipinin şekli (`{ il, ilce, mahalle, ada, parsel }`, hepsi
  `string`) DEĞİŞMEZ — veritabanı/ilan şeması bu plandan etkilenmez.
- Türkçe büyük/küçük harf karşılaştırması HER YERDE `.toLocaleLowerCase('tr')` ile yapılır,
  düz `.toLowerCase()` kullanılmaz (İ/I/ı/i farkı — bilinen JS/Türkçe tuzağı).
- Her yeni/değişen dosya için TDD: önce başarısız test, sonra minimal implementasyon.

---

## Dosya Yapısı

```
src/lib/tkgm/
  parcel.ts                 (DEĞİŞİR — TKGM_BASE export edilir)
  idariYapi.ts               (YENİ — il/ilçe/mahalle fetch + centroid)
  idariYapi.test.ts          (YENİ)
src/lib/
  rate-limit.ts              (DEĞİŞİR — iki yeni RATE_LIMITS girdisi)
src/app/api/tkgm/
  il/route.ts                 (YENİ)
  il/__tests__/route.test.ts  (YENİ)
  ilce/route.ts                (YENİ)
  ilce/__tests__/route.test.ts (YENİ)
  mahalle/route.ts                (YENİ)
  mahalle/__tests__/route.test.ts (YENİ)
src/components/listing-wizard/
  TkgmAutocompleteField.tsx        (YENİ)
  TkgmAutocompleteField.module.css (YENİ)
  TkgmAutocompleteField.test.tsx   (YENİ)
  ManualParcelEntryForm.tsx        (DEĞİŞİR — tamamen yeniden yazılır)
  ManualParcelEntryForm.test.tsx   (DEĞİŞİR — tamamen yeniden yazılır)
  ManualParcelEntryForm.module.css (DEĞİŞMEZ — TkgmAutocompleteField kendi CSS'ini taşır)
```

---

### Task 1: `src/lib/tkgm/idariYapi.ts` — TKGM idari yapı istemcisi

**Files:**
- Modify: `src/lib/tkgm/parcel.ts` (satır 7: `const TKGM_BASE` → `export const TKGM_BASE`)
- Create: `src/lib/tkgm/idariYapi.ts`
- Test: `src/lib/tkgm/idariYapi.test.ts`

**Interfaces:**
- Produces: `IdariYapiItem = { id: number; text: string }`, `MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }`, `fetchIlListesi(): Promise<IdariYapiItem[]>`, `fetchIlceListesi(ilId: number): Promise<IdariYapiItem[]>`, `fetchMahalleListesi(ilceId: number): Promise<MahalleItem[]>` — Task 3/4/5 (route'lar) ve Task 7 (form, dolaylı olarak route üzerinden) bu isimleri/tipleri kullanır.

- [ ] **Step 1: `TKGM_BASE`'i `parcel.ts`'ten export et**

`src/lib/tkgm/parcel.ts` satır 7'yi değiştir:

```ts
export const TKGM_BASE = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api'
```

- [ ] **Step 2: Başarısız testi yaz**

`src/lib/tkgm/idariYapi.test.ts`:

```ts
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from './idariYapi'

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
    }) as unknown as typeof fetch
}

describe('fetchIlListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('feature.properties {id,text} listesini dondurur', async () => {
        mockFetchOnce(200, {
            features: [
                { properties: { id: 23, text: 'Adana' } },
                { properties: { id: 24, text: 'Adıyaman' } },
            ],
        })
        const result = await fetchIlListesi()
        expect(result).toEqual([{ id: 23, text: 'Adana' }, { id: 24, text: 'Adıyaman' }])
    })

    it('id sayi degilse veya text bossa ogeyi atlar', async () => {
        mockFetchOnce(200, {
            features: [
                { properties: { id: 23, text: 'Adana' } },
                { properties: { id: 'abc', text: 'Gecersiz' } },
                { properties: { id: 25, text: '' } },
            ],
        })
        const result = await fetchIlListesi()
        expect(result).toEqual([{ id: 23, text: 'Adana' }])
    })

    it('TKGM hata donerse bos dizi doner', async () => {
        mockFetchOnce(500, {})
        expect(await fetchIlListesi()).toEqual([])
    })

    it('ag hatasinda bos dizi doner', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        expect(await fetchIlListesi()).toEqual([])
    })

    it('dogru TKGM URLsini cagirir', async () => {
        mockFetchOnce(200, { features: [] })
        await fetchIlListesi()
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/ilListe')
    })
})

describe('fetchIlceListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('verilen ilId ile dogru URLyi cagirir', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 104, text: 'Aladağ' } }] })
        await fetchIlceListesi(23)
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/ilceListe/23')
    })

    it('ilce listesini dondurur', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 104, text: 'Aladağ' } }] })
        expect(await fetchIlceListesi(23)).toEqual([{ id: 104, text: 'Aladağ' }])
    })
})

describe('fetchMahalleListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('Polygon geometriden centroid hesaplar (kose ortalamasi)', async () => {
        mockFetchOnce(200, {
            features: [{
                properties: { id: 45478, text: 'Akpınar' },
                geometry: { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }],
        })
        const result = await fetchMahalleListesi(104)
        expect(result).toEqual([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
    })

    it('MultiPolygon geometrisinde TUM poligonlarin koseleri duzlestirilir', async () => {
        mockFetchOnce(200, {
            features: [{
                properties: { id: 1, text: 'Ada Mahallesi' },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [[[0, 0], [2, 0], [2, 2], [0, 2]]],
                        [[[10, 10], [12, 10], [12, 12], [10, 12]]],
                    ],
                },
            }],
        })
        const result = await fetchMahalleListesi(1)
        expect(result[0].centroid).toEqual({ lat: 6, lng: 6 })
    })

    it('geometri yoksa veya taninmiyorsa centroid null doner', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 2, text: 'Geometrisiz' } }] })
        const result = await fetchMahalleListesi(1)
        expect(result[0].centroid).toBeNull()
    })

    it('dogru TKGM URLsini cagirir', async () => {
        mockFetchOnce(200, { features: [] })
        await fetchMahalleListesi(104)
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/mahalleListe/104')
    })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/lib/tkgm/idariYapi.test.ts --no-coverage`
Expected: FAIL — `Cannot find module './idariYapi'`

- [ ] **Step 4: Implementasyonu yaz**

`src/lib/tkgm/idariYapi.ts`:

```ts
/**
 * TKGM idari yapi (il/ilce/mahalle) hiyerarsi istemcisi. parcel.ts gibi
 * yalnizca sunucudan cagrilir — istemci hicbir zaman TKGM'ye dogrudan
 * fetch atmaz (bkz. parcel.ts'in ustundeki gerekce: CORS acik olsa da
 * kullanici IP'sinin devlet servisine acilmamasi ve rate-limit kontrolu).
 */
import { TKGM_BASE } from './parcel'

const TIMEOUT_MS = 8000

export type IdariYapiItem = { id: number; text: string }
export type MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }

type GeoJSONFeature = {
    properties?: { id?: unknown; text?: unknown }
    geometry?: { type?: string; coordinates?: unknown }
}
type GeoJSONFeatureCollection = { features?: GeoJSONFeature[] }

function toIdariYapiItem(feature: GeoJSONFeature): IdariYapiItem | null {
    const props = feature.properties
    if (!props) return null
    const id = Number(props.id)
    const text = String(props.text ?? '')
    if (!Number.isFinite(id) || text === '') return null
    return { id, text }
}

/**
 * Polygon/MultiPolygon koordinatlarindaki TUM [lng,lat] koselerini
 * duzlestirip basit aritmetik ortalamasini alir. Alan-agirlikli gercek bir
 * centroid DEGIL — haritayi kabaca dogru mahalleye ortalamak icin yeterli
 * bir yaklasiklik (kullanici zaten pini haritada ince ayarliyor).
 */
function flattenCoordinates(coordinates: unknown, out: number[][]): void {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length === 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
        out.push(coordinates as number[])
        return
    }
    for (const item of coordinates) flattenCoordinates(item, out)
}

function computeCentroid(geometry: GeoJSONFeature['geometry']): { lat: number; lng: number } | null {
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null
    const points: number[][] = []
    flattenCoordinates(geometry.coordinates, points)
    if (points.length === 0) return null
    let sumLng = 0
    let sumLat = 0
    for (const [lng, lat] of points) {
        sumLng += lng
        sumLat += lat
    }
    return { lat: sumLat / points.length, lng: sumLng / points.length }
}

async function fetchFeatureCollection(url: string): Promise<GeoJSONFeature[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            next: { revalidate: 86400 },
        })
        if (!res.ok) return []
        const data = (await res.json()) as GeoJSONFeatureCollection
        return Array.isArray(data.features) ? data.features : []
    } catch {
        return []
    } finally {
        clearTimeout(timer)
    }
}

export async function fetchIlListesi(): Promise<IdariYapiItem[]> {
    const features = await fetchFeatureCollection(`${TKGM_BASE}/idariYapi/ilListe`)
    return features.map(toIdariYapiItem).filter((x): x is IdariYapiItem => x !== null)
}

export async function fetchIlceListesi(ilId: number): Promise<IdariYapiItem[]> {
    const features = await fetchFeatureCollection(`${TKGM_BASE}/idariYapi/ilceListe/${ilId}`)
    return features.map(toIdariYapiItem).filter((x): x is IdariYapiItem => x !== null)
}

export async function fetchMahalleListesi(ilceId: number): Promise<MahalleItem[]> {
    const features = await fetchFeatureCollection(`${TKGM_BASE}/idariYapi/mahalleListe/${ilceId}`)
    const result: MahalleItem[] = []
    for (const feature of features) {
        const item = toIdariYapiItem(feature)
        if (!item) continue
        result.push({ ...item, centroid: computeCentroid(feature.geometry) })
    }
    return result
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/lib/tkgm/idariYapi.test.ts --no-coverage`
Expected: PASS (12 test)

- [ ] **Step 6: `tsc` çalıştır**

Run: `npx tsc --noEmit`
Expected: hata yok (özellikle `parcel.ts`'i import eden başka dosyalarda `TKGM_BASE` çakışması olmadığını doğrula)

- [ ] **Step 7: Commit**

```bash
git add src/lib/tkgm/parcel.ts src/lib/tkgm/idariYapi.ts src/lib/tkgm/idariYapi.test.ts
git commit -m "feat(tkgm): il/ilce/mahalle idari yapi istemcisi ekle"
```

---

### Task 2: `src/lib/rate-limit.ts` — yeni rate-limit eşikleri

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Test: `src/lib/__tests__/rate-limit.test.ts`

**Interfaces:**
- Produces: `RATE_LIMITS.TKGM_IDARI_YAPI`, `RATE_LIMITS.TKGM_IDARI_YAPI_ANON` — Task 3/4/5 (route'lar) bunları import eder.

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/__tests__/rate-limit.test.ts`'teki `describe('RATE_LIMITS', ...)` bloğuna ekle:

```ts
    it('TKGM idari yapi esikleri', () => {
        expect(RATE_LIMITS.TKGM_IDARI_YAPI).toEqual({ limit: 30, windowMs: 60_000 })
        expect(RATE_LIMITS.TKGM_IDARI_YAPI_ANON).toEqual({ limit: 10, windowMs: 60_000 })
    })
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/lib/__tests__/rate-limit.test.ts --no-coverage`
Expected: FAIL — `RATE_LIMITS.TKGM_IDARI_YAPI` is `undefined`

- [ ] **Step 3: `RATE_LIMITS`'e ekle**

`src/lib/rate-limit.ts`'teki `RATE_LIMITS` sabitinin sonuna (`RISK_TILES` satırından sonra) ekle:

```ts
    TKGM_IDARI_YAPI: { limit: 30, windowMs: 60_000 },      // kullanici basina 30/dk (il/ilce/mahalle otomatik tamamlama)
    TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60_000 }, // IP basina 10/dk
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/lib/__tests__/rate-limit.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat(rate-limit): TKGM idari yapi esiklerini ekle"
```

---

### Task 3: `GET /api/tkgm/il` route

**Files:**
- Create: `src/app/api/tkgm/il/route.ts`
- Test: `src/app/api/tkgm/il/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchIlListesi` (Task 1), `checkRateLimit`/`RATE_LIMITS.TKGM_IDARI_YAPI`/`RATE_LIMITS.TKGM_IDARI_YAPI_ANON`/`getClientIp` (Task 2)
- Produces: `GET` route handler döndürür `{ iller: IdariYapiItem[] }` (200) veya `{ message }` (429) — Task 7 (form) bu route'u `fetch('/api/tkgm/il')` ile çağırır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/api/tkgm/il/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const fetchIlListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchIlListesi: (...args: unknown[]) => fetchIlListesiMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        TKGM_IDARI_YAPI: { limit: 30, windowMs: 60000 },
        TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60000 },
    },
}))

import { GET } from '../route'

function req() {
    return new Request('http://localhost/api/tkgm/il')
}

describe('GET /api/tkgm/il', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchIlListesiMock.mockReset().mockResolvedValue([{ id: 23, text: 'Adana' }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('il listesini doner', async () => {
        const res = await GET(req())
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.iller).toEqual([{ id: 23, text: 'Adana' }])
    })

    it('oturum yoksa anonim IP anahtariyla devam eder (401 degil)', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req())
        expect(res.status).toBe(200)
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('tkgm-idari:ip:203.0.113.7')
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req())
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('tkgm-idari:u1')
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req())
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchIlListesiMock).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/api/tkgm/il --no-coverage`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Route'u yaz**

`src/app/api/tkgm/il/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchIlListesi } from '@/lib/tkgm/idariYapi'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `tkgm-idari:${userId}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI
    } else {
        const ip = getClientIp(req)
        rlKey = `tkgm-idari:ip:${ip}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla istek yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const iller = await fetchIlListesi()
    return NextResponse.json({ iller })
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/api/tkgm/il --no-coverage`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tkgm/il
git commit -m "feat(api): GET /api/tkgm/il route ekle"
```

---

### Task 4: `GET /api/tkgm/ilce` route

**Files:**
- Create: `src/app/api/tkgm/ilce/route.ts`
- Test: `src/app/api/tkgm/ilce/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchIlceListesi` (Task 1), rate-limit yardımcıları (Task 2)
- Produces: `GET` route handler döndürür `{ ilceler: IdariYapiItem[] }` (200), `{message}` (400 geçersiz `ilId` / 429) — Task 7 `fetch('/api/tkgm/ilce?ilId=...')` ile çağırır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/api/tkgm/ilce/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const fetchIlceListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchIlceListesi: (...args: unknown[]) => fetchIlceListesiMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        TKGM_IDARI_YAPI: { limit: 30, windowMs: 60000 },
        TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60000 },
    },
}))

import { GET } from '../route'

function req(qs: string) {
    return new Request(`http://localhost/api/tkgm/ilce?${qs}`)
}

describe('GET /api/tkgm/ilce', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchIlceListesiMock.mockReset().mockResolvedValue([{ id: 104, text: 'Aladağ' }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('ilce listesini doner', async () => {
        const res = await GET(req('ilId=23'))
        expect(res.status).toBe(200)
        expect((await res.json()).ilceler).toEqual([{ id: 104, text: 'Aladağ' }])
        expect(fetchIlceListesiMock).toHaveBeenCalledWith(23)
    })

    it('ilId sayi degilse 400 doner', async () => {
        const res = await GET(req('ilId=abc'))
        expect(res.status).toBe(400)
        expect(fetchIlceListesiMock).not.toHaveBeenCalled()
    })

    it('ilId verilmezse 400 doner', async () => {
        const res = await GET(req(''))
        expect(res.status).toBe(400)
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 10 })
        const res = await GET(req('ilId=23'))
        expect(res.status).toBe(429)
        expect(fetchIlceListesiMock).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/api/tkgm/ilce --no-coverage`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Route'u yaz**

`src/app/api/tkgm/ilce/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchIlceListesi } from '@/lib/tkgm/idariYapi'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `tkgm-idari:${userId}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI
    } else {
        const ip = getClientIp(req)
        rlKey = `tkgm-idari:ip:${ip}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla istek yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const ilId = Number(searchParams.get('ilId'))
    if (!Number.isFinite(ilId)) {
        return NextResponse.json({ message: 'Geçersiz il.' }, { status: 400 })
    }

    const ilceler = await fetchIlceListesi(ilId)
    return NextResponse.json({ ilceler })
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/api/tkgm/ilce --no-coverage`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tkgm/ilce
git commit -m "feat(api): GET /api/tkgm/ilce route ekle"
```

---

### Task 5: `GET /api/tkgm/mahalle` route

**Files:**
- Create: `src/app/api/tkgm/mahalle/route.ts`
- Test: `src/app/api/tkgm/mahalle/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchMahalleListesi` (Task 1), rate-limit yardımcıları (Task 2)
- Produces: `GET` route handler döndürür `{ mahalleler: MahalleItem[] }` (200), `{message}` (400/429) — Task 7 `fetch('/api/tkgm/mahalle?ilceId=...')` ile çağırır.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/api/tkgm/mahalle/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const fetchMahalleListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchMahalleListesi: (...args: unknown[]) => fetchMahalleListesiMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        TKGM_IDARI_YAPI: { limit: 30, windowMs: 60000 },
        TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60000 },
    },
}))

import { GET } from '../route'

function req(qs: string) {
    return new Request(`http://localhost/api/tkgm/mahalle?${qs}`)
}

describe('GET /api/tkgm/mahalle', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchMahalleListesiMock.mockReset().mockResolvedValue([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('mahalle listesini centroid ile doner', async () => {
        const res = await GET(req('ilceId=104'))
        expect(res.status).toBe(200)
        expect((await res.json()).mahalleler).toEqual([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
        expect(fetchMahalleListesiMock).toHaveBeenCalledWith(104)
    })

    it('ilceId sayi degilse 400 doner', async () => {
        const res = await GET(req('ilceId=abc'))
        expect(res.status).toBe(400)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })

    it('ilceId verilmezse 400 doner (Number(null) === 0 tuzagi — Task 4 review bulgusu)', async () => {
        const res = await GET(req(''))
        expect(res.status).toBe(400)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 10 })
        const res = await GET(req('ilceId=104'))
        expect(res.status).toBe(429)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/app/api/tkgm/mahalle --no-coverage`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Route'u yaz**

`src/app/api/tkgm/mahalle/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchMahalleListesi } from '@/lib/tkgm/idariYapi'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `tkgm-idari:${userId}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI
    } else {
        const ip = getClientIp(req)
        rlKey = `tkgm-idari:ip:${ip}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla istek yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const ilceId = Number(searchParams.get('ilceId'))
    // `searchParams.get('ilceId')` parametre verilmediginde `null` doner ve
    // `Number(null) === 0` — `Number.isFinite(0)` `true` oldugu icin bu
    // kontrol TEK BASINA eksik `ilceId`yi sessizce 0 olarak kabul ederdi
    // (Task 4'un ayni `ilId` deseninde review'da yakalanan gercek bug).
    if (!Number.isFinite(ilceId) || ilceId <= 0) {
        return NextResponse.json({ message: 'Geçersiz ilçe.' }, { status: 400 })
    }

    const mahalleler = await fetchMahalleListesi(ilceId)
    return NextResponse.json({ mahalleler })
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/app/api/tkgm/mahalle --no-coverage`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tkgm/mahalle
git commit -m "feat(api): GET /api/tkgm/mahalle route ekle"
```

---

### Task 6: `TkgmAutocompleteField` — paylaşılan combobox bileşeni

**Files:**
- Create: `src/components/listing-wizard/TkgmAutocompleteField.tsx`
- Create: `src/components/listing-wizard/TkgmAutocompleteField.module.css`
- Test: `src/components/listing-wizard/TkgmAutocompleteField.test.tsx`

**Interfaces:**
- Produces: `type IdariYapiItem = { id: number; text: string }`, `<TkgmAutocompleteField id label required items value onInputChange onSelect disabled placeholder />` — Task 7 (`ManualParcelEntryForm`) İl/İlçe/Mahalle için bu bileşeni üç kez kullanır.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/listing-wizard/TkgmAutocompleteField.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TkgmAutocompleteField, type IdariYapiItem } from './TkgmAutocompleteField'

const ITEMS: IdariYapiItem[] = [
    { id: 1, text: 'İstanbul' },
    { id: 2, text: 'Isparta' },
    { id: 3, text: 'İzmir' },
]

function Wrapper({ items = ITEMS, disabled = false }: { items?: IdariYapiItem[]; disabled?: boolean }) {
    const [value, setValue] = useState('')
    const [selected, setSelected] = useState<IdariYapiItem | null>(null)
    return (
        <div>
            <TkgmAutocompleteField
                id="test-field"
                label="İl"
                required
                items={items}
                value={value}
                onInputChange={setValue}
                onSelect={item => { setSelected(item); setValue(item.text) }}
                disabled={disabled}
            />
            {selected && <span data-testid="selected">{selected.text}-{selected.id}</span>}
        </div>
    )
}

describe('TkgmAutocompleteField', () => {
    it('etiket ve input render eder', () => {
        render(<Wrapper />)
        expect(screen.getByLabelText('İl *')).toBeInTheDocument()
    })

    it('yazinca eslesen ogeler listelenir', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ist' } })
        expect(screen.getByText('İstanbul')).toBeInTheDocument()
        expect(screen.queryByText('Isparta')).not.toBeInTheDocument()
    })

    it('Turkce buyuk/kucuk harf farkini dogru uygular — "ı" İstanbul ile eslesmez', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'ı' } })
        expect(screen.queryByText('İstanbul')).not.toBeInTheDocument()
        expect(screen.getByText('Isparta')).toBeInTheDocument()
    })

    it('bir ogeye tiklamak onSelect cagirir ve inputu doldurur', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'izm' } })
        fireEvent.click(screen.getByText('İzmir'))
        expect(screen.getByTestId('selected')).toHaveTextContent('İzmir-3')
        expect(screen.getByLabelText('İl *')).toHaveValue('İzmir')
    })

    it('klavyeyle asagi ok + Enter secim yapar', () => {
        render(<Wrapper />)
        const input = screen.getByLabelText('İl *')
        fireEvent.change(input, { target: { value: 'i' } })
        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(screen.getByTestId('selected')).toBeInTheDocument()
    })

    it('blur olurken tam metin eslesmesi varsa otomatik secilir', () => {
        render(<Wrapper />)
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İzmir' } })
        fireEvent.blur(screen.getByLabelText('İl *'))
        expect(screen.getByTestId('selected')).toHaveTextContent('İzmir-3')
    })

    it('disabled iken input devre disidir', () => {
        render(<Wrapper disabled />)
        expect(screen.getByLabelText('İl *')).toBeDisabled()
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/components/listing-wizard/TkgmAutocompleteField.test.tsx --no-coverage`
Expected: FAIL — `Cannot find module './TkgmAutocompleteField'`

- [ ] **Step 3: Bileşeni yaz**

`src/components/listing-wizard/TkgmAutocompleteField.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import styles from './TkgmAutocompleteField.module.css'

export type IdariYapiItem = { id: number; text: string }

interface Props {
    id: string
    label: string
    required?: boolean
    items: IdariYapiItem[]
    value: string
    onInputChange: (text: string) => void
    onSelect: (item: IdariYapiItem) => void
    disabled?: boolean
    placeholder?: string
}

function turkishIncludes(haystack: string, needle: string): boolean {
    return haystack.toLocaleLowerCase('tr').includes(needle.toLocaleLowerCase('tr'))
}

export function TkgmAutocompleteField({
    id, label, required, items, value, onInputChange, onSelect, disabled, placeholder,
}: Props) {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    const matches = value.trim() === ''
        ? items.slice(0, 8)
        : items.filter(item => turkishIncludes(item.text, value)).slice(0, 8)

    const commit = (item: IdariYapiItem) => {
        onSelect(item)
        setOpen(false)
        setActiveIndex(-1)
    }

    const handleBlur = () => {
        // Tam metin eslesmesi varsa otomatik sec — serbest metin asla
        // TKGM'ye ulasmadan disariya sizmaz (spec ilkesi).
        const trimmed = value.trim().toLocaleLowerCase('tr')
        const exact = items.find(item => item.text.toLocaleLowerCase('tr') === trimmed)
        if (exact) commit(exact)
        setOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true)
            return
        }
        if (!open) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, matches.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && matches[activeIndex]) {
                e.preventDefault()
                commit(matches[activeIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={id}>{label}{required ? ' *' : ''}</label>
            <input
                id={id}
                className={styles.input}
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-listbox`}
                onChange={e => {
                    onInputChange(e.target.value)
                    setOpen(true)
                    setActiveIndex(-1)
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            {open && matches.length > 0 && (
                <ul className={styles.listbox} id={`${id}-listbox`} role="listbox">
                    {matches.map((item, idx) => (
                        <li
                            key={item.id}
                            role="option"
                            aria-selected={idx === activeIndex}
                            className={idx === activeIndex ? `${styles.option} ${styles.optionActive}` : styles.option}
                            // onMouseDown SADECE preventDefault yapar (input'un onBlur'unun
                            // ONCE tetiklenmesini engeller); gercek secim onClick'te olur —
                            // boylece hem gercek kullanici tiklamasi hem testing-library'nin
                            // fireEvent.click'i (yalnizca 'click' dispatch eder) dogru calisir.
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => commit(item)}
                        >
                            {item.text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
```

- [ ] **Step 4: CSS'i yaz**

`src/components/listing-wizard/TkgmAutocompleteField.module.css`:

```css
.field {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--label-color);
}

.input {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--input-bg);
    color: var(--text);
    font-size: 0.9rem;
}

.input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.listbox {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 20;
    margin: 4px 0 0 0;
    padding: 4px;
    list-style: none;
    max-height: 220px;
    overflow-y: auto;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.option {
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 0.88rem;
    color: var(--text);
    cursor: pointer;
}

.optionActive {
    background: var(--input-bg);
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/components/listing-wizard/TkgmAutocompleteField.test.tsx --no-coverage`
Expected: PASS (7 test)

- [ ] **Step 6: `tsc` çalıştır**

Run: `npx tsc --noEmit`
Expected: hata yok

- [ ] **Step 7: Commit**

```bash
git add src/components/listing-wizard/TkgmAutocompleteField.tsx src/components/listing-wizard/TkgmAutocompleteField.module.css src/components/listing-wizard/TkgmAutocompleteField.test.tsx
git commit -m "feat(listing-wizard): TkgmAutocompleteField paylasilan combobox bileseni ekle"
```

---

### Task 7: `ManualParcelEntryForm` — TKGM otomatik-tamamlamaya geçiş

**Files:**
- Modify: `src/components/listing-wizard/ManualParcelEntryForm.tsx` (tamamen yeniden yazılır)
- Modify: `src/components/listing-wizard/ManualParcelEntryForm.test.tsx` (tamamen yeniden yazılır)

**Interfaces:**
- Consumes: `TkgmAutocompleteField`, `IdariYapiItem` (Task 6); `/api/tkgm/il`, `/api/tkgm/ilce?ilId=`, `/api/tkgm/mahalle?ilceId=` (Task 3/4/5)
- Produces: `ManualParcelReference` tipi DEĞİŞMEDEN kalır (`{ il, ilce, mahalle, ada, parsel }`, hepsi `string`) — `ParcelVerificationSheet.tsx`'in `handleManualFound` fonksiyonu (mevcut, değişmiyor) bu sözleşmeye güveniyor.

- [ ] **Step 1: Başarısız testi yaz (tüm dosyayı değiştir)**

`src/components/listing-wizard/ManualParcelEntryForm.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ManualParcelEntryForm } from './ManualParcelEntryForm'

function mockFetchSequence(responses: unknown[]) {
    let call = 0
    global.fetch = jest.fn().mockImplementation(() => {
        const body = responses[Math.min(call, responses.length - 1)]
        call++
        return Promise.resolve({ ok: true, json: async () => body })
    }) as unknown as typeof fetch
}

describe('ManualParcelEntryForm', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('mount olunca il listesini ceker, il/ilce secilmeden Sorgula devre disidir', async () => {
        mockFetchSequence([{ iller: [{ id: 23, text: 'Adana' }] }])
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tkgm/il'))
        expect(screen.getByRole('button', { name: /Sorgula/i })).toBeDisabled()
    })

    it('il secilince ilce listesi cekilir ve ilce alani etkinlesir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
        ])
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        expect(global.fetch).toHaveBeenCalledWith('/api/tkgm/ilce?ilId=23')
    })

    it('mahalle secilip centroid varsa Nominatime hic gitmeden onLocationFound cagirir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }] },
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Akpınar' } })
        fireEvent.click(await screen.findByText('Akpınar'))

        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

        const fetchCallsBeforeSearch = (global.fetch as jest.Mock).mock.calls.length
        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.1, 35.1, {
                il: 'Adana', ilce: 'Aladağ', mahalle: 'Akpınar', ada: '0', parsel: '1871',
            })
        })
        // Centroid varken Nominatim'e (veya baska bir uca) HIC gidilmedi.
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBeforeSearch)
    })

    it('mahalle secilmezse Nominatim ile yaklasik konum aranir (il/ilce artik TKGM yazimi)', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            [{ lat: '37.3', lon: '35.4' }],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.3, 35.4, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
    })

    it('sonuc bulunamazsa hata gosterir (mahallesiz, Nominatim yolu)', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            [],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))
        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum bulunamadı/i)).toBeInTheDocument()
        })
        expect(onLocationFound).not.toHaveBeenCalled()
    })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npx jest src/components/listing-wizard/ManualParcelEntryForm.test.tsx --no-coverage`
Expected: FAIL (eski implementasyon `İl *`i düz input olarak render ediyor, yeni testler seçim akışını bekliyor — ör. `screen.findByText('Adana')` hiç bulunamaz)

- [ ] **Step 3: Bileşeni yeniden yaz**

`src/components/listing-wizard/ManualParcelEntryForm.tsx` (TÜM dosyanın yerini alır):

```tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './ManualParcelEntryForm.module.css'
import { TkgmAutocompleteField, type IdariYapiItem } from './TkgmAutocompleteField'

export type ManualParcelReference = {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
}

type MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }

interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference) => void
}

export function ManualParcelEntryForm({ onLocationFound }: Props) {
    const [ilText, setIlText] = useState('')
    const [il, setIl] = useState<IdariYapiItem | null>(null)
    const [ilceText, setIlceText] = useState('')
    const [ilce, setIlce] = useState<IdariYapiItem | null>(null)
    const [mahalleText, setMahalleText] = useState('')
    const [mahalle, setMahalle] = useState<MahalleItem | null>(null)
    const [ada, setAda] = useState('')
    const [parsel, setParsel] = useState('')

    const [iller, setIller] = useState<IdariYapiItem[]>([])
    const [ilceler, setIlceler] = useState<IdariYapiItem[]>([])
    const [mahalleler, setMahalleler] = useState<MahalleItem[]>([])
    const [ilceLoading, setIlceLoading] = useState(false)
    const [mahalleLoading, setMahalleLoading] = useState(false)

    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const res = await fetch('/api/tkgm/il')
                const data = await res.json()
                if (!cancelled && Array.isArray(data.iller)) setIller(data.iller)
            } catch {
                // Sessizce bos kalir — otomatik-tamamlama oneri sunamaz ama
                // form kullanilamaz hale gelmez.
            }
        })()
        return () => { cancelled = true }
    }, [])

    const handleIlSelect = (item: IdariYapiItem) => {
        setIl(item)
        setIlText(item.text)
        setIlceText('')
        setIlce(null)
        setMahalleText('')
        setMahalle(null)
        setIlceler([])
        setMahalleler([])
        setIlceLoading(true)
        void (async () => {
            try {
                const res = await fetch(`/api/tkgm/ilce?ilId=${item.id}`)
                const data = await res.json()
                setIlceler(Array.isArray(data.ilceler) ? data.ilceler : [])
            } catch {
                setIlceler([])
            } finally {
                setIlceLoading(false)
            }
        })()
    }

    const handleIlceSelect = (item: IdariYapiItem) => {
        setIlce(item)
        setIlceText(item.text)
        setMahalleText('')
        setMahalle(null)
        setMahalleler([])
        setMahalleLoading(true)
        void (async () => {
            try {
                const res = await fetch(`/api/tkgm/mahalle?ilceId=${item.id}`)
                const data = await res.json()
                setMahalleler(Array.isArray(data.mahalleler) ? data.mahalleler : [])
            } catch {
                setMahalleler([])
            } finally {
                setMahalleLoading(false)
            }
        })()
    }

    const handleMahalleSelect = (item: IdariYapiItem) => {
        const found = mahalleler.find(m => m.id === item.id) ?? { ...item, centroid: null }
        setMahalle(found)
        setMahalleText(found.text)
    }

    const canSearch = il !== null && ilce !== null && !searching

    const handleSearch = async () => {
        if (!canSearch || !il || !ilce) return
        setSearching(true)
        setError(null)
        try {
            const reference: ManualParcelReference = {
                il: il.text, ilce: ilce.text, mahalle: mahalle?.text ?? mahalleText, ada, parsel,
            }

            if (mahalle?.centroid) {
                onLocationFound(mahalle.centroid.lat, mahalle.centroid.lng, reference)
                return
            }

            // Mahalle secilmedi (veya centroid hesaplanamadi) — mevcut yaklasik-konum
            // yolu: Nominatim adres aramasi. il/ilce artik TKGM'nin resmi yazimi
            // oldugu icin (kullanici serbest yazmadi) bu sorgu bugunkunden daha
            // guvenilir.
            const query = [reference.mahalle, reference.ilce, reference.il, 'Türkiye'].filter(Boolean).join(', ')
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(query)}`,
            )
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) {
                setError('Bu adres için konum bulunamadı. Daha genel yazmayı deneyin veya haritadan elle işaretleyin.')
                return
            }
            const { lat, lon } = data[0]
            onLocationFound(parseFloat(lat), parseFloat(lon), reference)
        } catch {
            setError('Konum aranırken bir sorun oluştu. Lütfen tekrar deneyin.')
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className={styles.form}>
            <p className={styles.instructions}>
                Tapu veya senette yazan bilgileri girin.
            </p>

            <div className={styles.row}>
                <TkgmAutocompleteField
                    id="manual-il"
                    label="İl"
                    required
                    items={iller}
                    value={ilText}
                    onInputChange={setIlText}
                    onSelect={handleIlSelect}
                    placeholder="Örn. Tekirdağ"
                />
                <TkgmAutocompleteField
                    id="manual-ilce"
                    label="İlçe"
                    required
                    items={ilceler}
                    value={ilceText}
                    onInputChange={setIlceText}
                    onSelect={handleIlceSelect}
                    disabled={!il || ilceLoading}
                    placeholder={ilceLoading ? 'Yükleniyor…' : 'Örn. Muratlı'}
                />
            </div>

            <TkgmAutocompleteField
                id="manual-mahalle"
                label="Mahalle"
                items={mahalleler}
                value={mahalleText}
                onInputChange={setMahalleText}
                onSelect={handleMahalleSelect}
                disabled={!ilce || mahalleLoading}
                placeholder={mahalleLoading ? 'Yükleniyor…' : 'Örn. Kırkkepenekli'}
            />

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-ada">Ada No</label>
                    <input
                        id="manual-ada"
                        className={styles.input}
                        value={ada}
                        onChange={e => setAda(e.target.value)}
                        placeholder="örn. 1521"
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="manual-parsel">Parsel No</label>
                    <input
                        id="manual-parsel"
                        className={styles.input}
                        value={parsel}
                        onChange={e => setParsel(e.target.value)}
                        placeholder="örn. 7"
                    />
                </div>
            </div>

            {error && <div className={styles.errorNote}>{error}</div>}

            <button type="button" className={styles.searchBtn} onClick={handleSearch} disabled={!canSearch}>
                {searching ? 'Aranıyor…' : 'Sorgula'}
            </button>
        </div>
    )
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npx jest src/components/listing-wizard/ManualParcelEntryForm.test.tsx --no-coverage`
Expected: PASS (5 test)

- [ ] **Step 5: `tsc` ve TÜM test paketini çalıştır**

Run: `npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tsc temiz, tüm test suite PASS (önceki 848 + bu plandaki yeni testler)

- [ ] **Step 6: Commit**

```bash
git add src/components/listing-wizard/ManualParcelEntryForm.tsx src/components/listing-wizard/ManualParcelEntryForm.test.tsx
git commit -m "feat(listing-wizard): ManualParcelEntryForm TKGM otomatik-tamamlamaya gecsin"
```

---

## Son doğrulama (subagent-driven-development'ın whole-branch review'ından sonra, controller tarafından)

Plan tamamlandıktan sonra, final whole-branch review'a ek olarak controller (sen) şunu
CANLI doğrulamalı (bu oturumun tekrar eden dersi — regex/unit test tek başına yeterli değil):

1. `/hesapla` → "Elle gir" moduna geç → bir il seç (birkaç harf yaz, listeden seç) → ilçe
   seç → mahalle seç → "Sorgula"ya bas → Network sekmesinde/Playwright'ta Nominatim'e HİÇ
   istek gitmediğini, haritanın doğrudan seçilen mahallenin centroid'ine gittiğini kanıtla.
2. Aynı akışı mahalle SEÇMEDEN (yalnızca il+ilçe) dene — Nominatim'e gerçekten gidildiğini
   doğrula (fallback yolu kırılmamış).
3. Türkçe casing: "ı" yazınca "İstanbul" listelenmediğini, "ist" yazınca listelendiğini
   gerçek tarayıcıda (yalnızca jsdom testinde değil) doğrula.
