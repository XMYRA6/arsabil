# Ada/Parsel ile Gerçek TKGM Sorgusu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ManualParcelEntryForm`'daki (paylaşılan bileşen, hem `/hesapla` hem ilan sihirbazı `WizardStep1Location` tarafından `ParcelVerificationSheet` üzerinden kullanılıyor) ada/parsel alanlarını gerçek bir TKGM ada/parsel sorgusuna bağlamak — böylece doğru ada/parsel girildiğinde kullanıcı haritaya hiç dokunmadan doğrudan "TKGM ile doğrulandı" sonucunu görür.

**Architecture:** TKGM'nin canlı public API'sinde bu oturumda doğrulanan `GET {TKGM_BASE}/parsel/{mahalleId}/{ada}/{parsel}` endpoint'i için `lib/tkgm/parcel.ts`'e yeni bir istemci fonksiyonu, onu saran yeni bir Next.js route, ve bu route'u `ManualParcelEntryForm`'un "Sorgula" akışına (mevcut centroid/Nominatim mantığından ÖNCE denenen, başarısız olursa sessizce ona düşen bir dal olarak) bağlayan bir zincir. `ParcelVerificationSheet` bu sonucu alıp `parcelValue.status`'u doğrudan `'verified'` yapar — zaten var olan "doğrulandı" UI'ı (parsel sınırı çizimi, kompakt özet kartı) hiç değişmeden devreye girer. **Yeni UI bileşeni yok.**

**Tech Stack:** Next.js 16 App Router (route handlers), TypeScript, Jest + Testing Library, mevcut `src/lib/tkgm/*` ve `src/lib/rate-limit.ts` altyapısı.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-parsel-ada-parsel-sorgusu-design.md`.
- Ada/parsel numaraları HER ZAMAN sadece rakam (`/^\d+$/`) — TKGM'nin gerçek numaralandırma şeması bu şekilde; regex bu varsayımla kısıtlanır.
- Ada/parsel eşleşmezse ya da herhangi bir hata olursa **sessizce** mevcut centroid/Nominatim davranışına düşülür — kullanıcıya YENİ bir hata metni gösterilmez (kullanıcı kararı, spec'te kayıtlı).
- Mevcut `parseTkgmArea`/`toParcelInfo` (`src/lib/tkgm/parcel.ts`) DEĞİŞMEDEN yeniden kullanılır — virgüllü `alan` formatı zaten destekleniyor.
- Yeni route, mevcut `src/app/api/parcel/lookup/route.ts` ile birebir aynı auth/rate-limit desenini izler (oturum opsiyonel, yalnızca rate-limit tier'ı için okunur — 401 asla dönmez).
- Test komutu: `npx jest --no-coverage --roots "src" <path>` (ana checkout'ta doğru jest komutu — bkz. proje hafızası).

---

## Dosya Yapısı Özeti

| Dosya | İşlem | Sorumluluk |
|---|---|---|
| `src/lib/geo/polygonCentroid.ts` | Oluştur | GeoJSON Polygon/MultiPolygon köşelerinin aritmetik ortalamasını hesaplayan paylaşılan saf fonksiyon |
| `src/lib/tkgm/idariYapi.ts` | Değiştir | Kendi yerel `computeCentroid`/`flattenCoordinates`'ini kaldırıp paylaşılanı kullanır |
| `src/lib/tkgm/parcel.ts` | Değiştir | Yeni `fetchParcelByAdaParsel`; ortak fetch+parse mantığı `fetchAndParseParcel`'e çıkarılır |
| `src/app/api/parcel/lookup-by-ada-parsel/route.ts` | Oluştur | Yeni GET route, `fetchParcelByAdaParsel`'i auth+rate-limit ile sarar |
| `src/components/listing-wizard/ManualParcelEntryForm.tsx` | Değiştir | `handleSearch`'e exact-lookup denemesi + `onLocationFound`'a 4. parametre |
| `src/components/listing-wizard/ParcelVerificationSheet.tsx` | Değiştir | `handleManualFound`, `exactParcel` geldiğinde `status:'verified'` set eder |

---

### Task 1: Paylaşılan `polygonCentroid` yardımcı fonksiyonu

**Files:**
- Create: `src/lib/geo/polygonCentroid.ts`
- Create: `src/lib/geo/polygonCentroid.test.ts`
- Modify: `src/lib/tkgm/idariYapi.ts:14-59` (yerel `flattenCoordinates`/`computeCentroid` kaldırılır, paylaşılan import edilir)

**Interfaces:**
- Produces: `polygonCentroid(geometry: { type?: string; coordinates?: unknown } | null | undefined): { lat: number; lng: number } | null` — `type` `'Polygon'` ya da `'MultiPolygon'` değilse, ya da köşe listesi boşsa `null` döner.

- [ ] **Step 1: Write the failing test**

`src/lib/geo/polygonCentroid.test.ts`:
```ts
import { polygonCentroid } from './polygonCentroid'

describe('polygonCentroid', () => {
    it('Polygon geometriden kose ortalamasi hesaplar', () => {
        const geometry = { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] }
        expect(polygonCentroid(geometry)).toEqual({ lat: 37.1, lng: 35.1 })
    })

    it('MultiPolygon geometrisinde TUM poligonlarin koseleri duzlestirilir', () => {
        const geometry = {
            type: 'MultiPolygon',
            coordinates: [
                [[[0, 0], [2, 0], [2, 2], [0, 2]]],
                [[[10, 10], [12, 10], [12, 12], [10, 12]]],
            ],
        }
        expect(polygonCentroid(geometry)).toEqual({ lat: 6, lng: 6 })
    })

    it('gecersiz/eksik geometride null doner', () => {
        expect(polygonCentroid(null)).toBeNull()
        expect(polygonCentroid(undefined)).toBeNull()
        expect(polygonCentroid({ type: 'Point', coordinates: [1, 2] })).toBeNull()
        expect(polygonCentroid({ type: 'Polygon', coordinates: [] })).toBeNull()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --no-coverage --roots "src" src/lib/geo/polygonCentroid.test.ts`
Expected: FAIL — `Cannot find module './polygonCentroid'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/geo/polygonCentroid.ts`:
```ts
/**
 * GeoJSON Polygon/MultiPolygon koordinatlarindaki TUM [lng,lat] koselerini
 * duzlestirip basit aritmetik ortalamasini alir. Alan-agirlikli gercek bir
 * centroid DEGIL — haritayi kabaca dogru noktaya ortalamak icin yeterli bir
 * yaklasiklik. `idariYapi.ts` (il/ilce/mahalle sinir centroid'i) ve ada/parsel
 * sorgusundan donen gercek parsel poligonu tarafindan paylasilir.
 */

export type GeoJSONGeometryLike = { type?: string; coordinates?: unknown }

function flattenCoordinates(coordinates: unknown, out: number[][]): void {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length === 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
        out.push(coordinates as number[])
        return
    }
    for (const item of coordinates) flattenCoordinates(item, out)
}

export function polygonCentroid(geometry: GeoJSONGeometryLike | null | undefined): { lat: number; lng: number } | null {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --no-coverage --roots "src" src/lib/geo/polygonCentroid.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: `idariYapi.ts`'i paylaşılan fonksiyona geçir (refactor, davranış değişmez)**

`src/lib/tkgm/idariYapi.ts` içinde şu bloğu:
```ts
type GeoJSONFeature = {
    properties?: { id?: unknown; text?: unknown }
    geometry?: { type?: string; coordinates?: unknown }
}
type GeoJSONFeatureCollection = { features?: GeoJSONFeature[] }

function toIdariYapiItem(feature: GeoJSONFeature): IdariYapiItem | null {
    ...
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
```
şu şekilde değiştir (yalnızca `flattenCoordinates`+`computeCentroid` silinir, `toIdariYapiItem` aynen kalır, `computeCentroid` çağrıları `polygonCentroid` olarak değişir):
```ts
import { polygonCentroid } from '@/lib/geo/polygonCentroid'

type GeoJSONFeature = {
    properties?: { id?: unknown; text?: unknown }
    geometry?: { type?: string; coordinates?: unknown }
}
type GeoJSONFeatureCollection = { features?: GeoJSONFeature[] }

function toIdariYapiItem(feature: GeoJSONFeature): IdariYapiItem | null {
    ...  // (değişmedi)
}
```
ve dosyanın altındaki `fetchAdminUnitsWithCentroid` içinde `computeCentroid(feature.geometry)` çağrısını `polygonCentroid(feature.geometry)` yap.

- [ ] **Step 6: Regresyon testlerini çalıştır**

Run: `npx jest --no-coverage --roots "src" src/lib/tkgm/idariYapi.test.ts`
Expected: PASS (mevcut 9 test, davranış değişmedi — saf refactor)

- [ ] **Step 7: Commit**

```bash
git add src/lib/geo/polygonCentroid.ts src/lib/geo/polygonCentroid.test.ts src/lib/tkgm/idariYapi.ts
git commit -m "refactor(tkgm): centroid hesaplamasini paylasilan lib/geo yardimcisina cikar"
```

---

### Task 2: `fetchParcelByAdaParsel` — TKGM ada/parsel istemcisi

**Files:**
- Modify: `src/lib/tkgm/parcel.ts`
- Modify: `src/lib/tkgm/parcel.test.ts`

**Interfaces:**
- Consumes: mevcut `TKGM_BASE`, `ParcelInfo`, `ParcelLookupResult`, `toParcelInfo` (aynı dosyada zaten var).
- Produces: `fetchParcelByAdaParsel(mahalleId: number, ada: string, parsel: string): Promise<ParcelLookupResult>` — Task 3'ün route'u bunu tüketir.

- [ ] **Step 1: Write the failing test**

`src/lib/tkgm/parcel.test.ts`'e (mevcut `TEKIRDAG_RESPONSE`/`mockFetchOnce`'ın altına, `fetchParcelByPoint` describe bloğundan sonra) ekle:
```ts
const GOZTEPE_ADA_PARSEL_RESPONSE = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[29.065, 40.975], [29.066, 40.975], [29.066, 40.976], [29.065, 40.976], [29.065, 40.975]]] },
    properties: {
        ilAd: 'İstanbul', ilceAd: 'Kadıköy', mahalleAd: 'Göztepe',
        adaNo: '398', parselNo: '19', alan: '965,85', nitelik: 'Bahçeli Kargir Apartman', mahalleId: 147964,
    },
}

describe('fetchParcelByAdaParsel', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('200 cevabini ParcelInfo olarak normalize eder (virgullu alan formati)', async () => {
        mockFetchOnce(200, GOZTEPE_ADA_PARSEL_RESPONSE)
        const res = await fetchParcelByAdaParsel(147964, '398', '19')
        expect(res.ok).toBe(true)
        if (!res.ok) throw new Error('beklenmedik')
        expect(res.parcel.adaNo).toBe('398')
        expect(res.parcel.parselNo).toBe('19')
        expect(res.parcel.areaSqm).toBe(965.85)
        expect(res.parcel.mahalle).toBe('Göztepe')
    })

    it('dogru TKGM URLsini cagirir', async () => {
        mockFetchOnce(200, GOZTEPE_ADA_PARSEL_RESPONSE)
        await fetchParcelByAdaParsel(147964, '398', '19')
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/parsel/147964/398/19')
    })

    it('404 -> not_found', async () => {
        mockFetchOnce(404, { Message: 'Parsel Bulunamadı' })
        const res = await fetchParcelByAdaParsel(147964, '1', '1')
        expect(res).toEqual({ ok: false, reason: 'not_found' })
    })

    it('500 -> unavailable', async () => {
        mockFetchOnce(500, {})
        const res = await fetchParcelByAdaParsel(147964, '1', '1')
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('ag hatasi -> unavailable', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        const res = await fetchParcelByAdaParsel(147964, '1', '1')
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })
})
```
Dosyanın en üstündeki import satırını güncelle:
```ts
import { parseTkgmArea, fetchParcelByPoint, fetchParcelByAdaParsel } from './parcel'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --no-coverage --roots "src" src/lib/tkgm/parcel.test.ts`
Expected: FAIL — `fetchParcelByAdaParsel is not a function` / import hatası

- [ ] **Step 3: Write minimal implementation**

`src/lib/tkgm/parcel.ts` içindeki `fetchParcelByPoint` fonksiyonunu şu şekilde yeniden düzenle (ortak gövde `fetchAndParseParcel`'e çıkarılır, `fetchParcelByPoint` onu çağırır, altına `fetchParcelByAdaParsel` eklenir):
```ts
async function fetchAndParseParcel(url: string): Promise<ParcelLookupResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(url, {
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

export async function fetchParcelByPoint(lat: number, lng: number): Promise<ParcelLookupResult> {
    return fetchAndParseParcel(`${TKGM_BASE}/parsel/${lat}/${lng}`)
}

/**
 * Ada/parsel numarasiyla dogrudan parsel sorgusu. Nokta-tabanli sorgunun
 * aksine kullanicinin haritada elle tiklamasini GEREKTIRMEZ — mahalleId
 * (TKGM idari-yapi hiyerarsisinden, bkz. idariYapi.ts) + tapudaki ada/parsel
 * numaralari yeterli. Canli TKGM API'sine karsi dogrulandi (bkz.
 * docs/superpowers/specs/2026-08-08-parsel-ada-parsel-sorgusu-design.md):
 * ayni parsel icin nokta-tabanli ve ada/parsel-tabanli sorgular BIREBIR ayni
 * GeoJSON Feature'i donuyor; tek fark `alan` alaninin virgullu formati
 * (parseTkgmArea zaten destekliyor).
 */
export async function fetchParcelByAdaParsel(mahalleId: number, ada: string, parsel: string): Promise<ParcelLookupResult> {
    return fetchAndParseParcel(`${TKGM_BASE}/parsel/${mahalleId}/${ada}/${parsel}`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --no-coverage --roots "src" src/lib/tkgm/parcel.test.ts`
Expected: PASS (tüm testler — eskiler + yeni 5 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tkgm/parcel.ts src/lib/tkgm/parcel.test.ts
git commit -m "feat(tkgm): ada/parsel numarasiyla dogrudan parsel sorgusu (fetchParcelByAdaParsel)"
```

---

### Task 3: Yeni route `GET /api/parcel/lookup-by-ada-parsel`

**Files:**
- Create: `src/app/api/parcel/lookup-by-ada-parsel/route.ts`
- Create: `src/app/api/parcel/lookup-by-ada-parsel/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 2'nin `fetchParcelByAdaParsel(mahalleId, ada, parsel)`.
- Produces: `GET` route — query param'lar `mahalleId` (pozitif tam sayı), `ada`, `parsel` (rakam dizisi). Yanıt şekli mevcut `/api/parcel/lookup` ile birebir aynı: `{status:'verified', parcel}` | `{status:'not_found'}` | `{status:'unavailable'}` | 400 | 429.

- [ ] **Step 1: Write the failing test**

`src/app/api/parcel/lookup-by-ada-parsel/__tests__/route.test.ts` (mevcut `src/app/api/parcel/lookup/__tests__/route.test.ts`'in birebir aynı deseniyle):
```ts
const getServerSessionMock = jest.fn()
const fetchParcelMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByAdaParsel: (...args: unknown[]) => fetchParcelMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        PARCEL_LOOKUP: { limit: 20, windowMs: 60000 },
        PARCEL_LOOKUP_ANON: { limit: 5, windowMs: 60000 },
    },
}))

import { GET } from '../route'

const PARCEL = {
    il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Göztepe',
    adaNo: '398', parselNo: '19', areaSqm: 965.85, quality: 'Bahçeli Kargir Apartman',
    geometry: { type: 'Polygon', coordinates: [[[29.065, 40.975]]] },
}

function req(qs: string) {
    return new Request(`http://localhost/api/parcel/lookup-by-ada-parsel?${qs}`)
}

describe('GET /api/parcel/lookup-by-ada-parsel', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchParcelMock.mockReset().mockResolvedValue({ ok: true, parcel: PARCEL })
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa anonim IP anahtariyla devam eder (401 degil)', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(200)
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel-ada-parsel:ip:203.0.113.7')
        expect(fetchParcelMock).toHaveBeenCalled()
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel-ada-parsel:u1')
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('mahalleId sayi degilse veya <= 0 ise 400 doner', async () => {
        expect((await GET(req('mahalleId=abc&ada=398&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=0&ada=398&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=-5&ada=398&parsel=19'))).status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('ada veya parsel rakam disi karakter icerirse 400 doner', async () => {
        expect((await GET(req('mahalleId=147964&ada=39x&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=147964&ada=398&parsel='))).status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('basarili sorguda parsel doner', async () => {
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('verified')
        expect(body.parcel.parselNo).toBe('19')
        expect(fetchParcelMock).toHaveBeenCalledWith(147964, '398', '19')
    })

    it('parsel bulunamazsa 200 + not_found doner (hata degil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const res = await GET(req('mahalleId=147964&ada=1&parsel=1'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('not_found')
    })

    it('TKGM erisilemezse 200 + unavailable doner (hata degil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const res = await GET(req('mahalleId=147964&ada=1&parsel=1'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --no-coverage --roots "src" src/app/api/parcel/lookup-by-ada-parsel`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Write minimal implementation**

`src/app/api/parcel/lookup-by-ada-parsel/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'

const ADA_PARSEL_PATTERN = /^\d+$/

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `parcel-ada-parsel:${userId}`
        rlOpts = RATE_LIMITS.PARCEL_LOOKUP
    } else {
        const ip = getClientIp(req)
        rlKey = `parcel-ada-parsel:ip:${ip}`
        rlOpts = RATE_LIMITS.PARCEL_LOOKUP_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla parsel sorgusu yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const mahalleId = Number(searchParams.get('mahalleId'))
    const ada = searchParams.get('ada') ?? ''
    const parsel = searchParams.get('parsel') ?? ''

    if (!Number.isInteger(mahalleId) || mahalleId <= 0) {
        return NextResponse.json({ message: 'Geçersiz mahalle kimliği.' }, { status: 400 })
    }
    if (!ADA_PARSEL_PATTERN.test(ada) || !ADA_PARSEL_PATTERN.test(parsel)) {
        return NextResponse.json({ message: 'Geçersiz ada/parsel numarası.' }, { status: 400 })
    }

    const result = await fetchParcelByAdaParsel(mahalleId, ada, parsel)
    if (result.ok) {
        return NextResponse.json({ status: 'verified', parcel: result.parcel })
    }
    return NextResponse.json({ status: result.reason })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --no-coverage --roots "src" src/app/api/parcel/lookup-by-ada-parsel`
Expected: PASS (9 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/parcel/lookup-by-ada-parsel
git commit -m "feat(api): ada/parsel numarasiyla parsel sorgu route'u"
```

---

### Task 4: `ManualParcelEntryForm` — exact-lookup'ı önce dene, sessizce fallback

**Files:**
- Modify: `src/components/listing-wizard/ManualParcelEntryForm.tsx`
- Modify: `src/components/listing-wizard/ManualParcelEntryForm.test.tsx`

**Interfaces:**
- Consumes: `GET /api/parcel/lookup-by-ada-parsel` (Task 3), `polygonCentroid` (Task 1), `ParcelInfo` tipi (`@/lib/tkgm/parcel`).
- Produces: `onLocationFound: (lat: number, lng: number, reference: ManualParcelReference, exactParcel?: ParcelInfo) => void` — Task 5'in `ParcelVerificationSheet.handleManualFound`'u bu 4. parametreyi tüketir.

- [ ] **Step 1: Mevcut testi daralt (yalnızca centroid-fallback davranışını test etsin, yeni ada/parsel dalını YANLIŞLIKLA tetiklemesin)**

`ManualParcelEntryForm.test.tsx`'teki `'mahalle secilip centroid varsa Nominatime hic gitmeden onLocationFound cagirir'` testinde (satır 46-80), ada/parsel doldurma satırlarını sil ve beklenen referansı güncelle:
```ts
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

    const fetchCallsBeforeSearch = (global.fetch as jest.Mock).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

    await waitFor(() => {
        expect(onLocationFound).toHaveBeenCalledWith(37.1, 35.1, {
            il: 'Adana', ilce: 'Aladağ', mahalle: 'Akpınar', ada: '', parsel: '',
        })
    })
    // Ada/parsel bos oldugu icin exact-lookup dalı hic tetiklenmedi — Nominatim'e
    // (veya baska bir uca) HIC gidilmedi.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBeforeSearch)
})
```
(Değişen tek şey: iki `fireEvent.change` satırının (Ada No/Parsel No) silinmesi ve beklenen `ada`/`parsel`'in `'0'`/`'1871'`'den `''`/`''`'e dönmesi.)

- [ ] **Step 2: Yeni iki testi ekle (dosyanın sonuna, son `it` bloğundan sonra, `})` kapanışından önce)**

```ts
    // --- Ada/Parsel exact-lookup: mahalle+ada+parsel doluysa once denenir ---

    it('mahalle+ada+parsel dolu ve TKGM eslesirse onLocationFound exactParcel ile (4. arguman) cagirilir', async () => {
        const parcelInfo = {
            il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Göztepe',
            adaNo: '398', parselNo: '19', areaSqm: 965.85, quality: 'Bahçeli Kargir Apartman',
            geometry: { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
        }
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: { lat: 99, lng: 99 } }] },
            { status: 'verified', parcel: parcelInfo },
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

        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '398' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '19' } })

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            // 37.1/35.1 = parselin GERCEK poligon-centroid'i, mahallenin
            // (99/99, kasten yanlis) centroid'i DEGIL — exact-lookup basarili
            // oldugu icin mahalle centroid'ine hic bakilmadi.
            expect(onLocationFound).toHaveBeenCalledWith(37.1, 35.1, {
                il: 'Adana', ilce: 'Aladağ', mahalle: 'Akpınar', ada: '398', parsel: '19',
            }, parcelInfo)
        })
        const lookupCall = (global.fetch as jest.Mock).mock.calls.find(
            c => typeof c[0] === 'string' && c[0].includes('lookup-by-ada-parsel'),
        )
        expect(lookupCall![0]).toBe('/api/parcel/lookup-by-ada-parsel?mahalleId=45478&ada=398&parsel=19')
    })

    it('mahalle+ada+parsel dolu ama TKGM eslesmezse (not_found) sessizce mahalle centroidine duser, hata gosterilmez', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }] },
            { status: 'not_found' },
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

        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '1' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1' } })

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.1, 35.1, {
                il: 'Adana', ilce: 'Aladağ', mahalle: 'Akpınar', ada: '1', parsel: '1',
            })
        })
        // exactParcel parametresi HIC gecilmedi (yalnizca 3 arguman).
        expect(onLocationFound.mock.calls[0].length).toBe(3)
        expect(screen.queryByText(/hata/i)).not.toBeInTheDocument()
    })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest --no-coverage --roots "src" src/components/listing-wizard/ManualParcelEntryForm.test.tsx`
Expected: FAIL — daraltılan test artık `ada:'0',parsel:'1871'` beklemiyor ama kod hâlâ eski davranışta (bu adımda asıl beklenen: yeni iki test FAIL olur çünkü exact-lookup dalı henüz yok — `onLocationFound` her zaman 3 argümanla çağrılıyor ve `/api/parcel/lookup-by-ada-parsel`'e hiç gidilmiyor)

- [ ] **Step 4: Write implementation**

`ManualParcelEntryForm.tsx`'in en üstündeki importlara ekle:
```ts
import type { ParcelInfo } from '@/lib/tkgm/parcel'
import { polygonCentroid } from '@/lib/geo/polygonCentroid'
```

`Props` interface'ini güncelle:
```ts
interface Props {
    onLocationFound: (lat: number, lng: number, reference: ManualParcelReference, exactParcel?: ParcelInfo) => void
}
```

`handleSearch` içinde, `const reference: ManualParcelReference = {...}` satırından hemen sonra, `if (mahalle?.centroid) {...}` bloğundan ÖNCE ekle:
```ts
            const reference: ManualParcelReference = {
                il: il.text, ilce: ilce.text, mahalle: mahalle?.text ?? '', ada, parsel,
            }

            // Ada/parsel numarasiyla dogrudan (yaklasik degil, TAM) TKGM eslesmesi.
            // Mahalle TKGM'den GERCEKTEN secilmis olmali (serbest metin asla
            // sizmaz — TkgmAutocompleteField'in genel ilkesi burada da gecerli).
            // Basarisiz olursa (404/ag hatasi/rate limit) SESSIZCE asagidaki
            // centroid/Nominatim yollarina dusulur — kullanici karari, ayri bir
            // hata metni EKLENMEZ.
            const adaTrimmed = ada.trim()
            const parselTrimmed = parsel.trim()
            if (mahalle && /^\d+$/.test(adaTrimmed) && /^\d+$/.test(parselTrimmed)) {
                try {
                    const res = await fetch(`/api/parcel/lookup-by-ada-parsel?mahalleId=${mahalle.id}&ada=${adaTrimmed}&parsel=${parselTrimmed}`)
                    const data = await res.json()
                    if (data.status === 'verified' && data.parcel) {
                        const centroid = polygonCentroid((data.parcel as ParcelInfo).geometry)
                        if (centroid) {
                            onLocationFound(centroid.lat, centroid.lng, reference, data.parcel as ParcelInfo)
                            return
                        }
                    }
                } catch {
                    // sessizce asagidaki yaklasik-konum yollarina dus
                }
            }

            if (mahalle?.centroid) {
```
(Not: `if (mahalle?.centroid) {` satırı zaten var olan koddur, sadece yeni bloğun nereye eklendiğini gösteriyor — mevcut gövdesi DEĞİŞMEDEN kalır.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest --no-coverage --roots "src" src/components/listing-wizard/ManualParcelEntryForm.test.tsx`
Expected: PASS (tüm testler — daraltılan + 2 yeni)

- [ ] **Step 6: Commit**

```bash
git add src/components/listing-wizard/ManualParcelEntryForm.tsx src/components/listing-wizard/ManualParcelEntryForm.test.tsx
git commit -m "feat(elle-gir): ada/parsel numarasi once gercek TKGM sorgusuyla denenir"
```

---

### Task 5: `ParcelVerificationSheet` — exact match direkt `verified` state'e geçer

**Files:**
- Modify: `src/components/listing-wizard/ParcelVerificationSheet.tsx`
- Modify: `src/components/listing-wizard/ParcelVerificationSheet.test.tsx`

**Interfaces:**
- Consumes: Task 4'ün `onLocationFound`/`ManualParcelEntryForm` 4. parametresi (`exactParcel?: ParcelInfo`).
- Produces: Kullanıcıya görünen davranış — exact match geldiğinde `parcelValue.status === 'verified'` doğrudan, harita/"Parseli Doğrula" adımı atlanır.

- [ ] **Step 1: Write the failing tests**

`ParcelVerificationSheet.test.tsx`'in en üstüne (diğer importlarla birlikte) ekleme gerekmiyor — `VERIFIED_PARCEL` zaten tanımlı. Dosyanın sonuna (son `describe` bloğunun kapanışından hemen önce, ana `describe('ParcelVerificationSheet', ...)` içine) ekle:

```ts
    describe('Elle gir — ada/parsel exact match direkt verified state üretir', () => {
        it('mobilde: mahalle+ada+parsel TKGM ile eslesirse harita/Dogrula adimi atlanir, kompakt ozet direkt gorunur', async () => {
            viewportKur(false) // mobil
            // NOT: paylasilan VERIFIED_PARCEL'in geometry.coordinates BOS —
            // ManualParcelEntryForm'un yeni exact-lookup dali polygonCentroid'in
            // GERCEK bir nokta donmesine bagli (bos poligon -> null -> sessiz
            // fallback'e duser, bu testin amacini bosa cikarir). Bu yuzden burada
            // gercek koseleri olan yerel bir varyant kullaniliyor.
            const parcelWithGeometry = {
                ...VERIFIED_PARCEL,
                geometry: { type: 'Polygon' as const, coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }
            let call = 0
            const responses: unknown[] = [
                { iller: [{ id: 34, text: 'İstanbul' }] },
                { ilceler: [{ id: 539, text: 'Kadıköy' }] },
                { mahalleler: [{ id: 147964, text: 'Göztepe', centroid: { lat: 99, lng: 99 } }] },
                { status: 'verified', parcel: parcelWithGeometry },
            ]
            global.fetch = jest.fn().mockImplementation(() => {
                const body = responses[Math.min(call, responses.length - 1)]
                call++
                return Promise.resolve({ ok: true, json: async () => body })
            }) as unknown as typeof fetch

            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
            fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
            fireEvent.click(await screen.findByText('İstanbul'))

            await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
            fireEvent.click(await screen.findByText('Kadıköy'))

            await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Göztepe' } })
            fireEvent.click(await screen.findByText('Göztepe'))

            fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
            fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

            fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

            // ParcelPicker'in "Parseli Dogrula"suna (simulate-verify) HIC
            // basilmadan, dogrudan mobil kompakt "dogrulandi" ozeti gorunmeli.
            await waitFor(() => {
                expect(screen.queryByTestId('parcel-picker')).not.toBeInTheDocument()
                expect(screen.getByText(/Kırkkepenekli/)).toBeInTheDocument()
                expect(screen.getByText(/830 m²/)).toBeInTheDocument()
            })
        })

        it('mahalle+ada+parsel eslesmezse (not_found) harita moduna doner, status idle kalir (bugunku davranis)', async () => {
            viewportKur(true) // masaustu — ParcelPicker mock'u dogrudan gozlenebilsin
            let call = 0
            const responses: unknown[] = [
                { iller: [{ id: 34, text: 'İstanbul' }] },
                { ilceler: [{ id: 539, text: 'Kadıköy' }] },
                { mahalleler: [{ id: 147964, text: 'Göztepe', centroid: { lat: 41.0, lng: 29.0 } }] },
                { status: 'not_found' },
            ]
            global.fetch = jest.fn().mockImplementation(() => {
                const body = responses[Math.min(call, responses.length - 1)]
                call++
                return Promise.resolve({ ok: true, json: async () => body })
            }) as unknown as typeof fetch

            render(<ParcelVerificationSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />)
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: 'Elle gir' }))
            fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'İstanbul' } })
            fireEvent.click(await screen.findByText('İstanbul'))

            await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Kadıköy' } })
            fireEvent.click(await screen.findByText('Kadıköy'))

            await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
            fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Göztepe' } })
            fireEvent.click(await screen.findByText('Göztepe'))

            fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '1' } })
            fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1' } })

            fireEvent.click(screen.getByRole('button', { name: 'Sorgula' }))

            // Harita moduna doner (mahalle centroidiyle), ama status HALA idle —
            // Aktar butonu devre disi kalir, kullanici elle "Parseli Dogrula"
            // basmali (bugunku davranis, degismedi).
            await waitFor(() => expect(screen.getByTestId('parcel-picker')).toBeInTheDocument())
            expect(screen.getByTestId('parcel-lat')).toHaveTextContent('41')
            expect(screen.getByTestId('parcel-lng')).toHaveTextContent('29')
            expect(screen.getByRole('button', { name: /Hesaplamaya Aktar/i })).toBeDisabled()
        })
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --no-coverage --roots "src" src/components/listing-wizard/ParcelVerificationSheet.test.tsx`
Expected: FAIL — ilk yeni test (`Kırkkepenekli`/`830 m²` bekleyen) FAIL olur çünkü `handleManualFound` henüz `exactParcel`'i hiç işlemiyor, `status` hep `'idle'` kalıyor, kompakt özet hiç görünmüyor.

- [ ] **Step 3: Write implementation**

`ParcelVerificationSheet.tsx`'in importlarına ekle:
```ts
import type { ParcelInfo } from '@/lib/tkgm/parcel'
```

`handleManualFound` fonksiyonunu şu şekilde değiştir:
```ts
    const handleManualFound = (lat: number, lng: number, reference: ManualParcelReference, exactParcel?: ParcelInfo) => {
        // `pickerRef.current?.placePin(...)` calisirken ParcelPicker zaten
        // unmount edilmis olur (mode === 'manual' oldugu icin JSX onun
        // yerine ManualParcelEntryForm render ediyordu) — ref o an null,
        // cagri sessizce no-op olurdu ve mode 'map'e donunce ParcelPicker
        // hala bos parcelValue ile yeniden mount olurdu. Bunun yerine
        // parcelValue'yu (ParcelPicker'in DEGIL, bu bilesenin state'i)
        // dogrudan guncelliyoruz; ParcelPicker'in kendi
        // "[mapReady, value.lat, value.lng]"e bagli marker effect'i
        // (duzenleme sayfasindan gelen kayitli konum icin zaten var olan
        // mekanizma) remount sonrasi bu degeri props'tan okuyup pini dogru
        // koyar.
        setManualRef(reference)
        // `exactParcel` verildiyse (ManualParcelEntryForm gercek TKGM ada/parsel
        // eslesmesi buldu) parcelValue dogrudan 'verified' olur — kullanici
        // haritada elle "Parseli Dogrula"ya basmak ZORUNDA degil, zaten var olan
        // dogrulanmis-durum UI'i (poligon cizimi, kompakt ozet) otomatik devreye
        // girer. Bulunamazsa (undefined) bugunku 'idle' davranisi degismez.
        if (exactParcel) {
            setParcelValue(v => ({ ...v, lat, lng, status: 'verified', parcel: exactParcel }))
        } else {
            setParcelValue(v => ({ ...v, lat, lng, status: 'idle', parcel: null }))
        }
        setMode('map')
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --no-coverage --roots "src" src/components/listing-wizard/ParcelVerificationSheet.test.tsx`
Expected: PASS (tüm testler — eskiler + yeni 2 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/listing-wizard/ParcelVerificationSheet.tsx src/components/listing-wizard/ParcelVerificationSheet.test.tsx
git commit -m "feat(parsel-dogrula): ada/parsel exact match direkt verified state'e gecer"
```

---

## Final Doğrulama (tüm task'lar bittikten sonra)

- [ ] **tsc:** `npx tsc --noEmit` — 0 hata.
- [ ] **Tam jest suite:** `npx jest --no-coverage --roots "src"` — tüm suite yeşil (yeni testler dahil, hiçbir mevcut test kırılmamış).
- [ ] **Canlı doğrulama (Playwright, gerçek TKGM API'sine karşı — spec'in "Doğrulama" bölümündeki 3 senaryo):**
  1. `/hesapla` → Elle Gir → İstanbul/Kadıköy/Göztepe + ada 398/parsel 19 → Sorgula → doğrudan "TKGM kaydıyla eşleşti" / kompakt özet görünüyor, harita elle tıklama gerekmiyor.
  2. Aynı akış ada=1/parsel=1 ile → sessizce mahalle merkezine düşülüyor, hata metni yok, kullanıcı haritadan elle onaylayabiliyor.
  3. İlan sihirbazı (`WizardStep1Location`) üzerinden senaryo 1 tekrarlanıyor (paylaşılan bileşen doğrulaması).
