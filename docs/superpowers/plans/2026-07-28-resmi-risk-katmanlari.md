# Resmi Risk Katmanları Implementasyon Planı (T2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resmi TUCBS fay ve taşkın verisini haritada göster, parselin faya mesafesini ölç, TBDY 2018 γF'yi hesapla ve `/hesapla`'da kullanıcıya risk katsayısı öner.

**Architecture:** Dış servise yalnızca sunucu gider. `wms.ts` tek temas noktası (PNG getirir), `sampling.ts` + `coefficient.ts` saf fonksiyonlar (tam TDD), `lookup.ts` iki aşamalı örneklemeyi orkestre eder. İki API route: ölçüm (`/api/risk/lookup`) ve harita katmanı proxy'si (`/api/risk/tiles`). İlan kaydedilirken risk snapshot'ı sunucuda üretilir.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Leaflet, Jest + RTL, `pngjs` (yeni).

**Spec:** `docs/superpowers/specs/2026-07-28-resmi-risk-katmanlari-design.md` (commit `9751f61`)

## Global Constraints

- **WMS sürümü daima `1.1.1`, `srs` daima `EPSG:4326`.** WMS 1.3.0 + EPSG:4326 eksen sırasını `lat,lon`'a çevirir — sessiz koordinat hatası. 1.3.0 KULLANILMAYACAK.
- **Her TUCBS isteği tarayıcı User-Agent header'ı göndermek ZORUNDA.** WAF varsayılan UA'ları reddediyor.
- **Alpha eşiği 64.** Anti-aliasing saçakları `alpha=1..24` geliyor; `alpha > 0` testi sahte yakınlık üretir.
- **Risk verisi opsiyoneldir.** Hiçbir hata yolu kullanıcıyı hesap yapmaktan veya ilan görüntülemekten alıkoymaz. `wms.ts` asla throw etmez.
- **Motor dosyasına (`src/lib/calculator/engine_v2.ts`) DOKUNULMAYACAK.**
- Türkçe kullanıcı metinleri; kod/commit mesajları mevcut projedeki gibi ASCII.
- Test komutu (ana checkout): `npx jest --no-coverage --roots "<rootDir>/src"`. Worktree içinden: düz `npx jest`.
- Baseline: main `9751f61`, **455 test geçiyor**, `npx tsc --noEmit` 0 hata.

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/lib/risk/types.ts` | Paylaşılan tipler (`BBox`, `RGBAImage`, `RiskMeasurement`) |
| `src/lib/risk/sampling.ts` | Saf geometri/piksel fonksiyonları. Ağ yok. |
| `src/lib/risk/coefficient.ts` | Saf TBDY γF ve R önerisi. Ağ yok. |
| `src/lib/risk/wms.ts` | TUCBS'e giden TEK modül. PNG buffer döndürür. |
| `src/lib/risk/lookup.ts` | İki aşamalı örneklemeyi orkestre eder. |
| `src/lib/risk/riskSnapshot.ts` | İlan kaydında sunucu tarafı snapshot (parcelSnapshot deseni). |
| `src/app/api/risk/lookup/route.ts` | Ölçüm endpoint'i (auth + rate limit). |
| `src/app/api/risk/tiles/route.ts` | WMS tile proxy'si (beyaz liste + IP rate limit). |
| `src/components/risk/RiskSuggestionCard.tsx` | `/hesapla` öneri kartı. |

---

### Task 1: Tipler, `pngjs` ve saf örnekleme fonksiyonları

**Files:**
- Create: `src/lib/risk/types.ts`
- Create: `src/lib/risk/sampling.ts`
- Test: `src/lib/risk/sampling.test.ts`
- Modify: `package.json` (bağımlılık)

**Interfaces:**
- Consumes: —
- Produces: `BBox`, `RGBAImage`, `bboxAround(lat,lng,radiusM): BBox`, `metersPerPixel(radiusM,sizePx): number`, `nearestOpaquePixelPx(img): number | null`, `isCenterOpaque(img): boolean`, `ALPHA_THRESHOLD: 64`

- [ ] **Step 1: `pngjs`'i kur**

```bash
npm install pngjs
npm install --save-dev @types/pngjs
```

`sharp` KULLANILMAYACAK — native binary, Docker imajını büyütür. Bize yalnızca RGBA piksel erişimi lazım.

- [ ] **Step 2: Tipleri yaz**

`src/lib/risk/types.ts`:

```ts
/** WMS 1.1.1 bbox sırası: lon,lat (minLon,minLat,maxLon,maxLat). */
export type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number }

/** pngjs'in verdiği ham RGBA tamponu. data uzunluğu = width*height*4. */
export type RGBAImage = { width: number; height: number; data: Uint8Array | Buffer }

export type RiskMeasurement = {
    faultDistanceM: number | null
    gammaF: number
    floodQ100: boolean
    suggestedR: number
}
```

- [ ] **Step 3: Başarısız testi yaz**

`src/lib/risk/sampling.test.ts`:

```ts
import { bboxAround, metersPerPixel, nearestOpaquePixelPx, isCenterOpaque, ALPHA_THRESHOLD } from './sampling'
import type { RGBAImage } from './types'

/** Belirtilen piksellere verilen alpha'yı basan tek renkli test görüntüsü. */
function img(size: number, pixels: Array<[number, number, number]>): RGBAImage {
    const data = new Uint8Array(size * size * 4)
    for (const [x, y, a] of pixels) {
        const i = (y * size + x) * 4
        data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = a
    }
    return { width: size, height: size, data }
}

describe('metersPerPixel', () => {
    it('kutu KENARINI piksele boler, yaricapi degil', () => {
        // 2 km yaricap => 4 km kenar => 256 px => 15.625 m/px
        expect(metersPerPixel(2000, 256)).toBeCloseTo(15.625, 3)
        expect(metersPerPixel(25000, 256)).toBeCloseTo(195.3125, 3)
    })
})

describe('bboxAround', () => {
    it('enlem yaricapini 111320 m/derece ile hesaplar', () => {
        const b = bboxAround(40, 29, 111320)
        expect(b.maxLat - 40).toBeCloseTo(1, 4)
    })

    it('boylam yaricapini enlem daralmasiyla duzeltir', () => {
        // 60 derecede cos=0.5 => boylam acikligi enlemin iki kati olmali
        const b = bboxAround(60, 29, 111320)
        expect(b.maxLon - 29).toBeCloseTo(2, 3)
    })
})

describe('nearestOpaquePixelPx', () => {
    it('opak piksel yoksa null doner', () => {
        expect(nearestOpaquePixelPx(img(8, []))).toBeNull()
    })

    it('alpha esigin ALTINDAKI pikselleri saymaz (AA sacagi tuzagi)', () => {
        expect(nearestOpaquePixelPx(img(8, [[0, 0, 24]]))).toBeNull()
        expect(nearestOpaquePixelPx(img(8, [[0, 0, ALPHA_THRESHOLD]]))).toBeNull()
    })

    it('esigin USTUNDEKI en yakin pikselin merkeze uzakligini px olarak doner', () => {
        // 9x9 -> merkez (4,4). (4,6) iki piksel asagida.
        expect(nearestOpaquePixelPx(img(9, [[4, 6, 200]]))!).toBeCloseTo(2, 5)
    })

    it('birden fazla isabette EN YAKINI secer', () => {
        expect(nearestOpaquePixelPx(img(9, [[4, 8, 200], [4, 5, 200]]))!).toBeCloseTo(1, 5)
    })
})

describe('isCenterOpaque', () => {
    it('merkez piksel esigin ustundeyse true', () => {
        expect(isCenterOpaque(img(9, [[4, 4, 200]]))).toBe(true)
    })

    it('merkez piksel esigin altindaysa false', () => {
        expect(isCenterOpaque(img(9, [[4, 4, 10]]))).toBe(false)
    })
})
```

- [ ] **Step 4: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/sampling.test.ts`
Expected: FAIL — `Cannot find module './sampling'`

- [ ] **Step 5: Implementasyonu yaz**

`src/lib/risk/sampling.ts`:

```ts
import type { BBox, RGBAImage } from './types'

/**
 * Anti-aliasing saçağı eşiği. TUCBS rasterlarında ölçülen kenar pikselleri
 * alpha=1..24 aralığında geliyor; `alpha > 0` testi sahte yakınlık üretir.
 */
export const ALPHA_THRESHOLD = 64

const M_PER_DEG_LAT = 111320

/** Kutu KENARINI piksel sayısına böler — yarıçapı değil. */
export function metersPerPixel(radiusM: number, sizePx: number): number {
    return (2 * radiusM) / sizePx
}

export function bboxAround(lat: number, lng: number, radiusM: number): BBox {
    const dLat = radiusM / M_PER_DEG_LAT
    const dLon = radiusM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180))
    return { minLon: lng - dLon, minLat: lat - dLat, maxLon: lng + dLon, maxLat: lat + dLat }
}

function alphaAt(img: RGBAImage, x: number, y: number): number {
    return img.data[(y * img.width + x) * 4 + 3]
}

/** Merkezden en yakın opak piksele uzaklık (px). Opak piksel yoksa null. */
export function nearestOpaquePixelPx(img: RGBAImage): number | null {
    const cx = (img.width - 1) / 2
    const cy = (img.height - 1) / 2
    let best: number | null = null

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            if (alphaAt(img, x, y) <= ALPHA_THRESHOLD) continue
            const d = Math.hypot(x - cx, y - cy)
            if (best === null || d < best) best = d
        }
    }
    return best
}

export function isCenterOpaque(img: RGBAImage): boolean {
    const cx = Math.floor((img.width - 1) / 2)
    const cy = Math.floor((img.height - 1) / 2)
    return alphaAt(img, cx, cy) > ALPHA_THRESHOLD
}
```

- [ ] **Step 6: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/risk/sampling.test.ts`
Expected: PASS (11 test)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/risk/types.ts src/lib/risk/sampling.ts src/lib/risk/sampling.test.ts
git commit -m "feat(risk): raster ornekleme icin saf geometri ve piksel fonksiyonlari"
```

---

### Task 2: TBDY γF ve R önerisi

**Files:**
- Create: `src/lib/risk/coefficient.ts`
- Test: `src/lib/risk/coefficient.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `gammaF(faultDistanceM: number | null): number`, `suggestedR(gammaF: number, inFloodZone: boolean): number`, `R_FROM_GAMMA_FACTOR`, `FLOOD_R_INCREMENT`

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/risk/coefficient.test.ts`:

```ts
import { gammaF, suggestedR } from './coefficient'

describe('gammaF — TBDY 2018 yakin fay katsayisi', () => {
    it('15 km ve altinda 1.2 sabittir', () => {
        expect(gammaF(0)).toBeCloseTo(1.2, 5)
        expect(gammaF(1_200)).toBeCloseTo(1.2, 5)
        expect(gammaF(15_000)).toBeCloseTo(1.2, 5)   // tam sinir
    })

    it('15-25 km arasi dogrusal iner', () => {
        expect(gammaF(20_000)).toBeCloseTo(1.1, 5)
        expect(gammaF(25_000)).toBeCloseTo(1.0, 5)   // tam sinir
    })

    it('25 km ustunde 1.0', () => {
        expect(gammaF(30_000)).toBeCloseTo(1.0, 5)
    })

    it('mesafe bilinmiyorsa (isabet yok) 1.0', () => {
        expect(gammaF(null)).toBeCloseTo(1.0, 5)
    })
})

describe('suggestedR', () => {
    it('gammaF farkinin yarisini uygular ve 2 haneye yuvarlar', () => {
        expect(suggestedR(1.2, false)).toBe(1.1)
        expect(suggestedR(1.0, false)).toBe(1)
    })

    it('taskin bolgesinde ek pay ekler', () => {
        expect(suggestedR(1.2, true)).toBe(1.13)
        expect(suggestedR(1.0, true)).toBe(1.03)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/coefficient.test.ts`
Expected: FAIL — `Cannot find module './coefficient'`

- [ ] **Step 3: Implementasyonu yaz**

`src/lib/risk/coefficient.ts`:

```ts
/**
 * TBDY 2018 yakın fay katsayısı γF (DD-1 / DD-2 düzeyleri):
 *   LF ≤ 15 km      → 1,2
 *   15 < LF ≤ 25 km → 1,2 − 0,02·(LF − 15)
 *   LF > 25 km      → 1,0
 * `S_D1 = S1 · γF · F1` ile 1 sn periyot spektral ivmesine uygulanır.
 *
 * DİKKAT: γF deprem TASARIM TALEBİNİ ölçekler, inşaat maliyetini değil.
 * Maliyete çevrimi `suggestedR` yapar ve bu bir VARSAYIMDIR (aşağıya bkz.).
 */
export function gammaF(faultDistanceM: number | null): number {
    if (faultDistanceM === null) return 1.0
    const lfKm = faultDistanceM / 1000
    if (lfKm <= 15) return 1.2
    if (lfKm <= 25) return 1.2 - 0.02 * (lfKm - 15)
    return 1.0
}

/**
 * VARSAYIM, yönetmelik hükmü DEĞİL: tasarım talebindeki artışın maliyete
 * yansımasının yarı oranında olduğu kabul edilir. Ürün bu sayıyı "tahmini"
 * etiketiyle gösterir ve kullanıcı reddedebilir.
 */
export const R_FROM_GAMMA_FACTOR = 0.5

/** VARSAYIM: taşkın bölgesinde drenaj/temel önlemi payı. */
export const FLOOD_R_INCREMENT = 0.03

export function suggestedR(gamma: number, inFloodZone: boolean): number {
    const base = 1 + (gamma - 1) * R_FROM_GAMMA_FACTOR
    const withFlood = base + (inFloodZone ? FLOOD_R_INCREMENT : 0)
    return Math.round(withFlood * 100) / 100
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/risk/coefficient.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk/coefficient.ts src/lib/risk/coefficient.test.ts
git commit -m "feat(risk): TBDY 2018 gammaF ve tahmini R onerisi"
```

---

### Task 3: TUCBS WMS istemcisi

**Files:**
- Create: `src/lib/risk/wms.ts`
- Test: `src/lib/risk/wms.test.ts`

**Interfaces:**
- Consumes: `BBox` (Task 1)
- Produces: `WmsLayer` (`'diri_fay' | 'taskin_tehlike_haritasi_q100'`), `fetchWmsTile(layer, bbox, sizePx): Promise<WmsResult>`, `decodePng(buf): RGBAImage`, `WMS_BASE`, `BROWSER_UA`

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/risk/wms.test.ts`:

```ts
import { fetchWmsTile, WMS_BASE } from './wms'

const BBOX = { minLon: 28.9, minLat: 40.9, maxLon: 29.1, maxLat: 41.1 }

function pngResponse() {
    return {
        ok: true,
        status: 200,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    }
}

describe('fetchWmsTile', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('tarayici User-Agent header i gonderir (WAF varsayilan UA yi reddediyor)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        const init = spy.mock.calls[0][1] as RequestInit
        expect(String((init.headers as Record<string, string>)['User-Agent'])).toMatch(/Mozilla/)
    })

    it('WMS 1.1.1 ve EPSG:4326 kullanir (1.3.0 eksen sirasini ters cevirir)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        const url = String(spy.mock.calls[0][0])
        expect(url).toContain('version=1.1.1')
        expect(url).toContain('srs=EPSG%3A4326')
        expect(url).not.toContain('1.3.0')
        expect(url.startsWith(WMS_BASE)).toBe(true)
    })

    it('bbox i lon,lat sirasiyla yazar', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        expect(decodeURIComponent(String(spy.mock.calls[0][0]))).toContain('bbox=28.9,40.9,29.1,41.1')
    })

    it('basarili PNG cevabinda ok:true doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(true)
    })

    it('PNG olmayan cevapta (WMS hata XML i) ok:false doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue({
            ok: true, status: 200,
            headers: { get: () => 'application/vnd.ogc.se_xml' },
            arrayBuffer: async () => new Uint8Array([60]).buffer,
        } as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(false)
    })

    it('ag hatasinda THROW ETMEZ, ok:false doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockRejectedValue(new Error('boom') as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(false)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/wms.test.ts`
Expected: FAIL — `Cannot find module './wms'`

- [ ] **Step 3: Implementasyonu yaz**

`src/lib/risk/wms.ts`:

```ts
import { PNG } from 'pngjs'
import type { BBox, RGBAImage } from './types'

/**
 * TUCBS (Ulusal Coğrafi Bilgi Platformu) GeoServer'ı.
 * Yalnızca sunucudan çağrılır — WAF tarayıcı UA'sı istiyor, CORS başlığı yok
 * ve kullanıcı IP'si devlet servisine açılmamalı.
 *
 * ÖLÇÜLDÜ (2026-07-28): bu servis yalnızca GetMap ve GetCapabilities'e izin
 * veriyor; GetFeatureInfo ve WFS 406 dönüyor. Bu yüzden mesafe/bölge bilgisi
 * raster örnekleme ile elde ediliyor.
 */
export const WMS_BASE = 'https://ucbp-app8.tucbs.gov.tr/geoserver/tucbs/wms'

export const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const TIMEOUT_MS = 8000

export type WmsLayer = 'diri_fay' | 'taskin_tehlike_haritasi_q100'
export type WmsResult = { ok: true; png: Buffer } | { ok: false; reason: 'unavailable' }

export function buildWmsUrl(layer: string, bbox: BBox, width: number, height: number): string {
    const params = new URLSearchParams({
        service: 'WMS',
        // 1.3.0 KULLANMA: EPSG:4326'da eksen sırasını lat,lon'a çevirir.
        version: '1.1.1',
        request: 'GetMap',
        layers: layer,
        styles: '',
        bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
        width: String(width),
        height: String(height),
        srs: 'EPSG:4326',
        format: 'image/png',
        transparent: 'true',
    })
    return `${WMS_BASE}?${params.toString()}`
}

/** Asla throw etmez — risk verisi opsiyoneldir. */
export async function fetchWmsTile(layer: WmsLayer, bbox: BBox, sizePx: number): Promise<WmsResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(buildWmsUrl(layer, bbox, sizePx, sizePx), {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, Accept: 'image/png,*/*' },
        })
        if (!res.ok) return { ok: false, reason: 'unavailable' }

        // WMS hatayı 200 + ServiceExceptionReport XML olarak da döndürebilir.
        const type = res.headers.get('content-type') ?? ''
        if (!type.includes('image/png')) return { ok: false, reason: 'unavailable' }

        return { ok: true, png: Buffer.from(await res.arrayBuffer()) }
    } catch {
        return { ok: false, reason: 'unavailable' }
    } finally {
        clearTimeout(timer)
    }
}

export function decodePng(buf: Buffer): RGBAImage {
    const png = PNG.sync.read(buf)
    return { width: png.width, height: png.height, data: png.data }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/risk/wms.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk/wms.ts src/lib/risk/wms.test.ts
git commit -m "feat(risk): TUCBS WMS istemcisi — tarayici UA, 1.1.1, hata toleransli"
```

---

### Task 4: İki aşamalı ölçüm orkestrasyonu

**Files:**
- Create: `src/lib/risk/lookup.ts`
- Test: `src/lib/risk/lookup.test.ts`

**Interfaces:**
- Consumes: `fetchWmsTile`, `decodePng` (Task 3); `bboxAround`, `metersPerPixel`, `nearestOpaquePixelPx`, `isCenterOpaque` (Task 1); `gammaF`, `suggestedR` (Task 2)
- Produces: `measureRisk(lat, lng): Promise<RiskMeasurement | null>`, `FINE`, `COARSE`, `FLOOD`

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/risk/lookup.test.ts`:

```ts
const fetchWmsTileMock = jest.fn()
const decodePngMock = jest.fn()

jest.mock('./wms', () => ({
    fetchWmsTile: (...a: unknown[]) => fetchWmsTileMock(...a),
    decodePng: (...a: unknown[]) => decodePngMock(...a),
}))

import { measureRisk, FINE, COARSE, FLOOD } from './lookup'
import type { RGBAImage } from './types'

/** size x size gorüntü; verilen pikselleri opak yapar. */
function img(size: number, pixels: Array<[number, number]>): RGBAImage {
    const data = new Uint8Array(size * size * 4)
    for (const [x, y] of pixels) data[(y * size + x) * 4 + 3] = 255
    return { width: size, height: size, data }
}

const OK = { ok: true, png: Buffer.from([1]) }
const FAIL = { ok: false, reason: 'unavailable' }

describe('measureRisk', () => {
    beforeEach(() => { fetchWmsTileMock.mockReset(); decodePngMock.mockReset() })

    it('ince kutuda isabet varsa KABA kutuyu hic istemez', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        // ince: merkeze yakin isabet; taskin: merkez bos
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, [[128, 130]]))
            .mockReturnValueOnce(img(FLOOD.sizePx, []))

        const r = await measureRisk(41.0, 29.0)
        const layers = fetchWmsTileMock.mock.calls.map(c => c[0])
        expect(layers.filter(l => l === 'diri_fay')).toHaveLength(1)
        // DIKKAT: 256 gibi CIFT boyutta merkez (127.5,127.5) olur, yani hicbir
        // piksel merkeze tam sayi uzaklikta degildir. Kesin esitlik ARAMA —
        // ince kutunun cozunurluk mertebesinde oldugunu dogrula.
        expect(r!.faultDistanceM).toBeGreaterThan(0)
        expect(r!.faultDistanceM).toBeLessThan(100)
    })

    it('ince kutuda isabet yoksa KABA kutuya duser', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, []))          // ince: bos
            .mockReturnValueOnce(img(COARSE.sizePx, [[128, 138]])) // kaba: 10 px
            .mockReturnValueOnce(img(64, []))                    // taskin
        const r = await measureRisk(41.0, 29.0)
        expect(fetchWmsTileMock.mock.calls.filter(c => c[0] === 'diri_fay')).toHaveLength(2)
        expect(r!.faultDistanceM).toBeGreaterThan(1000)
    })

    it('iki kutuda da isabet yoksa faultDistanceM null ve gammaF 1.0', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock.mockReturnValue(img(FINE.sizePx, []))
        const r = await measureRisk(41.0, 29.0)
        expect(r!.faultDistanceM).toBeNull()
        expect(r!.gammaF).toBeCloseTo(1.0, 5)
    })

    it('taskin merkez pikseli opaksa floodQ100 true olur ve R yi artirir', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, []))
            .mockReturnValueOnce(img(COARSE.sizePx, []))
            .mockReturnValueOnce(img(65, [[32, 32]]))   // taskin merkezi opak
        const r = await measureRisk(41.0, 29.0)
        expect(r!.floodQ100).toBe(true)
        expect(r!.suggestedR).toBe(1.03)
    })

    it('WMS tamamen erisilemezse null doner (cagiran taraf gostermez)', async () => {
        fetchWmsTileMock.mockResolvedValue(FAIL)
        const r = await measureRisk(41.0, 29.0)
        expect(r).toBeNull()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/lookup.test.ts`
Expected: FAIL — `Cannot find module './lookup'`

- [ ] **Step 3: Implementasyonu yaz**

`src/lib/risk/lookup.ts`:

```ts
import { fetchWmsTile, decodePng } from './wms'
import { bboxAround, metersPerPixel, nearestOpaquePixelPx, isCenterOpaque } from './sampling'
import { gammaF, suggestedR } from './coefficient'
import type { RiskMeasurement } from './types'

/**
 * İki aşamalı örnekleme. TBDY 25 km'ye kadar bakmayı gerektiriyor, ama 25 km'yi
 * 256 px'e sığdırmak çözünürlüğü ~195 m/px'e düşürür — yakın fayda kabul edilemez.
 * Önce dar ve hassas kutu; isabet yoksa geniş ve kaba kutu.
 */
export const FINE = { radiusM: 2_000, sizePx: 256 }    // ~15,6 m/px
export const COARSE = { radiusM: 25_000, sizePx: 256 } // ~195 m/px
export const FLOOD = { radiusM: 250, sizePx: 65 }      // tek merkez pikseli için; tek sayı => net merkez

async function faultDistance(lat: number, lng: number): Promise<{ ok: boolean; distanceM: number | null }> {
    for (const stage of [FINE, COARSE]) {
        const tile = await fetchWmsTile('diri_fay', bboxAround(lat, lng, stage.radiusM), stage.sizePx)
        if (!tile.ok) return { ok: false, distanceM: null }

        const px = nearestOpaquePixelPx(decodePng(tile.png))
        if (px !== null) {
            return { ok: true, distanceM: px * metersPerPixel(stage.radiusM, stage.sizePx) }
        }
    }
    // 25 km yarıçapta da fay yok — TBDY'ye göre γF = 1,0 bölgesi.
    return { ok: true, distanceM: null }
}

/** Servis erişilemezse null döner; çağıran taraf risk bilgisini hiç göstermez. */
export async function measureRisk(lat: number, lng: number): Promise<RiskMeasurement | null> {
    const fault = await faultDistance(lat, lng)
    if (!fault.ok) return null

    const floodTile = await fetchWmsTile(
        'taskin_tehlike_haritasi_q100',
        bboxAround(lat, lng, FLOOD.radiusM),
        FLOOD.sizePx,
    )
    if (!floodTile.ok) return null

    const floodQ100 = isCenterOpaque(decodePng(floodTile.png))
    const g = gammaF(fault.distanceM)

    return {
        faultDistanceM: fault.distanceM === null ? null : Math.round(fault.distanceM),
        gammaF: g,
        floodQ100,
        suggestedR: suggestedR(g, floodQ100),
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/risk/lookup.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk/lookup.ts src/lib/risk/lookup.test.ts
git commit -m "feat(risk): iki asamali fay mesafesi olcumu ve taskin testi"
```

---

### Task 5: `/api/risk/lookup` endpoint'i

**Files:**
- Create: `src/app/api/risk/lookup/route.ts`
- Test: `src/app/api/risk/lookup/__tests__/route.test.ts`
- Modify: `src/lib/rate-limit.ts:66` (RATE_LIMITS'e iki giriş ekle)

**Interfaces:**
- Consumes: `measureRisk` (Task 4)
- Produces: `GET /api/risk/lookup?lat=&lng=` → `{ status: 'ok', risk: RiskMeasurement }` veya `{ status: 'unavailable' }`

- [ ] **Step 1: Rate limit girişlerini ekle**

`src/lib/rate-limit.ts`, satır 66'dan sonra:

```ts
    PARCEL_LOOKUP: { limit: 20, windowMs: 60_000 }, // kullanıcı başına 20/dk (TKGM'yi yormamak için)
    RISK_LOOKUP: { limit: 20, windowMs: 60_000 },   // kullanıcı başına 20/dk (PARCEL_LOOKUP ile aynı eşik)
    RISK_TILES: { limit: 300, windowMs: 60_000 },   // IP başına 300/dk — tek harita görünümü onlarca tile ister
```

- [ ] **Step 2: Başarısız testi yaz**

`src/app/api/risk/lookup/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const measureRiskMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/risk/lookup', () => ({ measureRisk: (...a: unknown[]) => measureRiskMock(...a) }))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
    RATE_LIMITS: { RISK_LOOKUP: { limit: 20, windowMs: 60000 } },
}))

import { GET } from '../route'

const RISK = { faultDistanceM: 1200, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }

function req(qs: string) {
    return new Request(`http://localhost/api/risk/lookup?${qs}`)
}

describe('GET /api/risk/lookup', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        measureRiskMock.mockReset().mockResolvedValue(RISK)
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa 401 doner ve TUCBS hic cagrilmaz', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(401)
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('rate limit asilirsa 429 + Retry-After doner', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req('lat=41&lng=29'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('risk:u1')
    })

    it('Turkiye disi koordinatta 400 doner', async () => {
        const res = await GET(req('lat=51.5&lng=-0.12'))
        expect(res.status).toBe(400)
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('basarili olcumde risk doner', async () => {
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('ok')
        expect(body.risk.gammaF).toBe(1.2)
    })

    it('TUCBS erisilemezse 200 + unavailable doner (hata degil)', async () => {
        measureRiskMock.mockResolvedValue(null)
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/api/risk/lookup`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 4: Route'u yaz**

`src/app/api/risk/lookup/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { measureRisk } from '@/lib/risk/lookup'

/** Türkiye kaba sınırlayıcı kutusu — TUCBS'e anlamsız koordinat göndermemek için. */
const TR_BOUNDS = { minLat: 35, maxLat: 43, minLng: 25, maxLng: 45 }

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined
    if (!userId) {
        return NextResponse.json({ message: 'Giriş yapmanız gerekiyor.' }, { status: 401 })
    }

    const rl = checkRateLimit(`risk:${userId}`, RATE_LIMITS.RISK_LOOKUP)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla risk sorgusu yaptınız. Lütfen biraz bekleyin.' },
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

    const risk = await measureRisk(lat, lng)
    if (!risk) return NextResponse.json({ status: 'unavailable' })
    return NextResponse.json({ status: 'ok', risk })
}
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/api/risk/lookup`
Expected: PASS (6 test)

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/risk/lookup
git commit -m "feat(api): risk lookup endpoint — auth + rate limit + TR sinir kontrolu"
```

---

### Task 6: `/api/risk/tiles` WMS proxy'si

**Files:**
- Create: `src/app/api/risk/tiles/route.ts`
- Test: `src/app/api/risk/tiles/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `buildWmsUrl`, `BROWSER_UA` (Task 3); `getClientIp`, `checkRateLimit`, `RATE_LIMITS.RISK_TILES`
- Produces: `GET /api/risk/tiles?layers=&bbox=&width=&height=&srs=` → ham `image/png`

**KRİTİK:** Parametre adları Leaflet'in gönderdiğiyle birebir aynı olmalı. `L.tileLayer.wms` `layers` (**çoğul**) gönderir — tekil `layer` beklemek sessizce patlar.

- [ ] **Step 1: Başarısız testi yaz**

`src/app/api/risk/tiles/__tests__/route.test.ts`:

```ts
const checkRateLimitMock = jest.fn()

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
    getClientIp: () => '1.2.3.4',
    RATE_LIMITS: { RISK_TILES: { limit: 300, windowMs: 60000 } },
}))

import { GET } from '../route'

const QS = 'layers=diri_fay&bbox=28.9,40.9,29.1,41.1&width=256&height=256&srs=EPSG:4326'

function req(qs: string) {
    return new Request(`http://localhost/api/risk/tiles?${qs}`)
}

function pngResponse() {
    return {
        ok: true, status: 200,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    }
}

describe('GET /api/risk/tiles', () => {
    beforeEach(() => { checkRateLimitMock.mockReset().mockReturnValue({ ok: true }) })
    afterEach(() => { jest.restoreAllMocks() })

    it('Leaflet in gonderdigi COGUL layers parametresini kabul eder', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS))
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('image/png')
    })

    it('beyaz listede olmayan katmani reddeder (acik proxy olmasin)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS.replace('diri_fay', 'srtm')))
        expect(res.status).toBe(400)
        expect(spy).not.toHaveBeenCalled()
    })

    it('virgullu coklu katmani reddeder', async () => {
        const res = await GET(req(QS.replace('diri_fay', 'diri_fay,srtm')))
        expect(res.status).toBe(400)
    })

    it('EPSG:4326 disi srs i reddeder', async () => {
        const res = await GET(req(QS.replace('EPSG:4326', 'EPSG:3857')))
        expect(res.status).toBe(400)
    })

    it('512 den buyuk boyutu reddeder', async () => {
        const res = await GET(req(QS.replace('width=256', 'width=2048')))
        expect(res.status).toBe(400)
    })

    it('rate limit anahtari IP basinadir', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await GET(req(QS))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('risktiles:1.2.3.4')
    })

    it('rate limit asilirsa 429 doner', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 7 })
        const res = await GET(req(QS))
        expect(res.status).toBe(429)
    })

    it('cache header i gonderir', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS))
        expect(res.headers.get('Cache-Control')).toContain('max-age=86400')
    })

    it('TUCBS erisilemezse 502 doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockRejectedValue(new Error('boom') as never)
        const res = await GET(req(QS))
        expect(res.status).toBe(502)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/api/risk/tiles`
Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Route'u yaz**

`src/app/api/risk/tiles/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { BROWSER_UA, WMS_BASE } from '@/lib/risk/wms'

/**
 * Leaflet'in `L.tileLayer.wms`'i standart WMS parametrelerini kendisi üretir:
 * layers (ÇOĞUL), bbox, width, height, srs, format, transparent, service,
 * request, version. Bu route o adları aynen kabul eder.
 *
 * Açık proxy olmaması için katman beyaz listeye karşı doğrulanır.
 */
const ALLOWED_LAYERS = new Set(['diri_fay', 'taskin_tehlike_haritasi_q100'])
const MAX_SIZE = 512
const TIMEOUT_MS = 8000

export async function GET(req: Request) {
    const rl = checkRateLimit(`risktiles:${getClientIp(req)}`, RATE_LIMITS.RISK_TILES)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla harita isteği.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const layers = searchParams.get('layers') ?? ''
    const bbox = searchParams.get('bbox') ?? ''
    const width = Number(searchParams.get('width'))
    const height = Number(searchParams.get('height'))
    const srs = searchParams.get('srs') ?? ''

    const valid =
        ALLOWED_LAYERS.has(layers) &&                       // virgüllü çoklu katman burada elenir
        srs === 'EPSG:4326' &&                              // TUCBS başka CRS ilan etmiyor
        /^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(bbox) &&
        Number.isFinite(width) && width > 0 && width <= MAX_SIZE &&
        Number.isFinite(height) && height > 0 && height <= MAX_SIZE

    if (!valid) {
        return NextResponse.json({ message: 'Geçersiz katman isteği.' }, { status: 400 })
    }

    const params = new URLSearchParams({
        service: 'WMS', version: '1.1.1', request: 'GetMap',
        layers, styles: '', bbox,
        width: String(width), height: String(height),
        srs: 'EPSG:4326', format: 'image/png', transparent: 'true',
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const upstream = await fetch(`${WMS_BASE}?${params.toString()}`, {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, Accept: 'image/png,*/*' },
        })
        if (!upstream.ok) return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })

        const type = upstream.headers.get('content-type') ?? ''
        if (!type.includes('image/png')) {
            return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })
        }

        return new NextResponse(await upstream.arrayBuffer(), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                // Fay hatları günlük değişmez; TUCBS'i yormayalım.
                'Cache-Control': 'public, max-age=86400',
            },
        })
    } catch {
        return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })
    } finally {
        clearTimeout(timer)
    }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/api/risk/tiles`
Expected: PASS (9 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/risk/tiles
git commit -m "feat(api): risk tile proxy — beyaz liste, IP rate limit, cache"
```

---

### Task 7: Prisma alanları ve ilan kaydında snapshot

**Files:**
- Modify: `prisma/schema.prisma` (Listing modeli, `parcelLookupStatus` satırından sonra)
- Create: `src/lib/risk/riskSnapshot.ts`
- Test: `src/lib/risk/riskSnapshot.test.ts`
- Modify: `src/app/api/listings/route.ts:92` çevresi
- Modify: `src/app/api/listings/[id]/route.ts:73` çevresi

**Interfaces:**
- Consumes: `measureRisk` (Task 4)
- Produces: `RiskSnapshot` (`{ faultDistanceM, floodQ100, riskSnapshotAt }`), `buildRiskSnapshot(lat, lng): Promise<RiskSnapshot>`

- [ ] **Step 1: Şema alanlarını ekle**

`prisma/schema.prisma`, `Listing` modelinde `parcelLookupStatus  String?` satırından hemen sonra:

```prisma
  faultDistanceM      Int?
  floodQ100           Boolean?
  riskSnapshotAt      DateTime?
```

- [ ] **Step 2: Migration'ı üret ve uygula**

```bash
npx prisma migrate dev --name listing_risk_snapshot
```

Docker Desktop ve `arsabil_postgres_dev` konteyneri ayakta olmalı. Migration sonrası `npx prisma generate` otomatik koşar.

- [ ] **Step 3: Başarısız testi yaz**

`src/lib/risk/riskSnapshot.test.ts`:

```ts
const measureRiskMock = jest.fn()
jest.mock('./lookup', () => ({ measureRisk: (...a: unknown[]) => measureRiskMock(...a) }))

import { buildRiskSnapshot } from './riskSnapshot'

describe('buildRiskSnapshot', () => {
    beforeEach(() => { measureRiskMock.mockReset() })

    it('koordinat yoksa TUCBS yi hic cagirmaz ve bos snapshot doner', async () => {
        const s = await buildRiskSnapshot(null, null)
        expect(measureRiskMock).not.toHaveBeenCalled()
        expect(s).toEqual({ faultDistanceM: null, floodQ100: null, riskSnapshotAt: null })
    })

    it('olcum basarisizsa bos snapshot doner (ilan kaydi engellenmez)', async () => {
        measureRiskMock.mockResolvedValue(null)
        const s = await buildRiskSnapshot(41, 29)
        expect(s.riskSnapshotAt).toBeNull()
    })

    it('basarili olcumde alanlari ve zaman damgasini doldurur', async () => {
        measureRiskMock.mockResolvedValue({
            faultDistanceM: 1200, gammaF: 1.2, floodQ100: true, suggestedR: 1.13,
        })
        const s = await buildRiskSnapshot(41, 29)
        expect(s.faultDistanceM).toBe(1200)
        expect(s.floodQ100).toBe(true)
        expect(s.riskSnapshotAt).toBeInstanceOf(Date)
    })
})
```

- [ ] **Step 4: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/riskSnapshot.test.ts`
Expected: FAIL — `Cannot find module './riskSnapshot'`

- [ ] **Step 5: Snapshot builder'ı yaz**

`src/lib/risk/riskSnapshot.ts`:

```ts
import { measureRisk } from './lookup'

export type RiskSnapshot = {
    faultDistanceM: number | null
    floodQ100: boolean | null
    riskSnapshotAt: Date | null
}

const EMPTY: RiskSnapshot = { faultDistanceM: null, floodQ100: null, riskSnapshotAt: null }

/**
 * Risk snapshot'ını YALNIZCA sunucu üretir. İstemcinin gövdede gönderdiği risk
 * alanları asla kullanılmaz — aksi halde "faya 12 km" gibi bir değer taklit
 * edilebilir hale gelir. `parcelSnapshot.ts` ile aynı güvenlik gerekçesi.
 */
export async function buildRiskSnapshot(
    lat: number | null,
    lng: number | null,
): Promise<RiskSnapshot> {
    if (lat == null || lng == null) return { ...EMPTY }

    const risk = await measureRisk(lat, lng)
    if (!risk) return { ...EMPTY }

    return {
        faultDistanceM: risk.faultDistanceM,
        floodQ100: risk.floodQ100,
        riskSnapshotAt: new Date(),
    }
}
```

- [ ] **Step 6: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/risk/riskSnapshot.test.ts`
Expected: PASS (3 test)

- [ ] **Step 7: İlan oluşturma route'una bağla**

`src/app/api/listings/route.ts` — import bloğuna ekle:

```ts
import { buildRiskSnapshot } from "@/lib/risk/riskSnapshot";
```

Satır 92'deki `const parcelSnapshot = await buildParcelSnapshot(latNum, lngNum)` satırından hemen sonra:

```ts
        const riskSnapshot = await buildRiskSnapshot(latNum, lngNum)
```

Aynı dosyada `prisma.listing.create` çağrısının `data` bloğu şu an şöyle (satır 110-112):

```ts
                lat: latNum,
                lng: lngNum,
                ...parcelSnapshot,
```

Bunu şuna çevir:

```ts
                lat: latNum,
                lng: lngNum,
                ...parcelSnapshot,
                ...riskSnapshot,
```

- [ ] **Step 8: İlan güncelleme route'una bağla**

`src/app/api/listings/[id]/route.ts` — import ekle:

```ts
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
```

Satır 73'teki koşullu yayılımı genişlet:

```ts
            ? { lat: latNum, lng: lngNum, ...(await buildParcelSnapshot(latNum, lngNum)), ...(await buildRiskSnapshot(latNum, lngNum)) }
```

- [ ] **Step 9: Tam paketi koştur**

Run: `npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"`
Expected: tsc 0 hata; tüm testler geçer.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/risk/riskSnapshot.ts src/lib/risk/riskSnapshot.test.ts src/app/api/listings/route.ts "src/app/api/listings/[id]/route.ts"
git commit -m "feat(db): Listing e risk snapshot alanlari + kayitta sunucu tarafi olcum"
```

---

### Task 8: İlan detayında risk satırı ve harita katmanları

**Files:**
- Modify: `src/components/marketplace/MiniMap.tsx`
- Modify: `src/app/listing/[id]/page.tsx` (satır ~50 mock alanları, ~207 Parsel Detayları bölümü, ~343 MiniMap kullanımı)
- Test: `src/components/marketplace/MiniMap.test.tsx`

**Interfaces:**
- Consumes: `/api/risk/tiles` (Task 6); `Listing.faultDistanceM`, `Listing.floodQ100` (Task 7)
- Produces: `MiniMap` yeni opsiyonel prop: `riskLayers?: boolean`

**KRİTİK:** `MiniMap` kasıtlı olarak etkileşimsiz (`dragging: false`, `scrollWheelZoom: false`, `zoomControl: false`). Katman ekleme bu ayarları DEĞİŞTİRMEMELİ.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/marketplace/MiniMap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MiniMap } from './MiniMap'

describe('MiniMap risk katmanlari', () => {
    it('riskLayers verilmediginde katman kontrolu gosterilmez', () => {
        render(<MiniMap lat={41} lng={29} />)
        expect(screen.queryByLabelText('Diri fay katmani')).toBeNull()
    })

    it('riskLayers true iken iki katman kontrolu gosterilir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).toBeInTheDocument()
        expect(screen.getByLabelText('Taskin katmani')).toBeInTheDocument()
    })

    it('katman kontrolleri varsayilan olarak kapalidir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).not.toBeChecked()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/marketplace/MiniMap.test.tsx`
Expected: FAIL — `riskLayers` prop'u yok, kontroller bulunamıyor.

- [ ] **Step 3: `MiniMap`'e katman desteği ekle**

`src/components/marketplace/MiniMap.tsx` — `Props` arayüzüne ekle:

```ts
    riskLayers?: boolean;
```

Bileşen gövdesine, mevcut `useEffect`'ten SONRA (haritayı kuran effect'e dokunma):

```tsx
    const [showFault, setShowFault] = useState(false);
    const [showFlood, setShowFlood] = useState(false);
    const faultRef = useRef<import('leaflet').TileLayer | null>(null);
    const floodRef = useRef<import('leaflet').TileLayer | null>(null);

    useEffect(() => {
        if (!riskLayers) return;
        let cancelled = false;

        void (async () => {
            const L = (await import('leaflet')).default;
            const map = mapRef.current;
            if (cancelled || !map) return;

            const attach = (
                ref: React.MutableRefObject<import('leaflet').TileLayer | null>,
                layer: string,
                show: boolean,
            ) => {
                if (show && !ref.current) {
                    // TUCBS yalnizca EPSG:4326 ilan ediyor; Leaflet varsayilani
                    // EPSG:3857'dir ve bos tile dondurur.
                    ref.current = L.tileLayer.wms('/api/risk/tiles', {
                        layers: layer,
                        format: 'image/png',
                        transparent: true,
                        crs: L.CRS.EPSG4326,
                    }).addTo(map);
                } else if (!show && ref.current) {
                    map.removeLayer(ref.current);
                    ref.current = null;
                }
            };

            attach(faultRef, 'diri_fay', showFault);
            attach(floodRef, 'taskin_tehlike_haritasi_q100', showFlood);
        })();

        return () => { cancelled = true; };
    }, [riskLayers, showFault, showFlood]);
```

JSX'te harita konteynerinin yanına (yalnızca `riskLayers` iken):

```tsx
            {riskLayers && (
                <div className={styles.layerToggles}>
                    <label>
                        <input
                            type="checkbox"
                            aria-label="Diri fay katmani"
                            checked={showFault}
                            onChange={e => setShowFault(e.target.checked)}
                        />
                        Diri fay
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            aria-label="Taskin katmani"
                            checked={showFlood}
                            onChange={e => setShowFlood(e.target.checked)}
                        />
                        Taşkın (Q100)
                    </label>
                </div>
            )}
```

`useState` import'unu dosyanın başındaki `import { useEffect, useRef } from 'react'` satırına ekle.

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/marketplace/MiniMap.test.tsx`
Expected: PASS (3 test)

- [ ] **Step 5: İlan detayına risk satırını ekle**

`src/app/listing/[id]/page.tsx` — satır ~50 civarındaki mock nesnesine (`adaNo: null as string | null,` komşuluğu) ekle:

```ts
    faultDistanceM: null as number | null,
    floodQ100: null as boolean | null,
```

"Parsel Detayları" bölümünde (satır ~207), `parcelId` bloğundan SONRA:

```tsx
                                {listing.faultDistanceM != null && (
                                    <div className={styles.parcelRow}>
                                        <span>
                                            Diri faya yaklaşık{' '}
                                            {listing.faultDistanceM >= 1000
                                                ? `${(listing.faultDistanceM / 1000).toFixed(1)} km`
                                                : `${listing.faultDistanceM} m`}
                                            {listing.floodQ100 != null &&
                                                ` · Q100 taşkın bölgesi ${listing.floodQ100 ? 'İÇİNDE' : 'dışında'}`}
                                        </span>
                                    </div>
                                )}
```

**Veri yoksa satır HİÇ gösterilmez** — boş/şüpheli değer basılmaz.

Satır 343-348'deki `MiniMap` kullanımına prop ekle. Şu an:

```tsx
                        <MiniMap
                            lat={listing.lat}
                            lng={listing.lng}
                            label={`${listing.district}, ${listing.city}`}
                            listingId={id}
                        />
```

Şuna çevir:

```tsx
                        <MiniMap
                            lat={listing.lat}
                            lng={listing.lng}
                            label={`${listing.district}, ${listing.city}`}
                            listingId={id}
                            riskLayers
                        />
```

Bu blok `listing.lat != null && listing.lng != null` koşulunun içindedir — koordinatsız ilanda harita zaten gösterilmiyor, dolayısıyla katman kontrolü de görünmez. Bu koşula DOKUNMA.

- [ ] **Step 6: tsc ve tam testi koştur**

Run: `npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"`
Expected: 0 hata, tüm testler geçer.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketplace/MiniMap.tsx src/components/marketplace/MiniMap.test.tsx "src/app/listing/[id]/page.tsx"
git commit -m "feat(listing): ilan detayinda risk satiri ve fay/taskin harita katmanlari"
```

---

### Task 9: `/hesapla` risk önerisi

**Files:**
- Create: `src/components/risk/RiskSuggestionCard.tsx`
- Test: `src/components/risk/RiskSuggestionCard.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (satır ~80-85 `riskLevels` state'i, ~509-513 risk ızgarası)

**Interfaces:**
- Consumes: `/api/risk/lookup` (Task 5); `RiskMeasurement` (Task 1)
- Produces: `RiskSuggestionCard({ risk, onApply })`

**KRİTİK — planlama sırasında ölçüldü:** `/hesapla` `R`'yi doğrudan tutmuyor. `riskLevel` (yüzde, `useState<number>(10)`) tutuyor ve `R`'yi `1 + riskLevel/100` diye türetiyor (satır 191-192, 862-863, 880-881). `riskLevels` ayrık bir seçenek **state dizisi** (`{id,label,value,sortOrder,isDefault}`) ve ızgara `--lux-cols: riskLevels.length` ile dinamik render ediliyor — yani **yeni seçenek eklenebilir**. Öneri bu yolla uygulanır; `R` state'i ARANMAYACAK, yoktur.

- [ ] **Step 1: Başarısız testi yaz**

`src/components/risk/RiskSuggestionCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RiskSuggestionCard } from './RiskSuggestionCard'

const RISK = { faultDistanceM: 1200, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }

describe('RiskSuggestionCard', () => {
    it('mesafeyi ve gammaF yi gosterir', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/1,2 km/)).toBeInTheDocument()
        expect(screen.getByText(/1,20/)).toBeInTheDocument()
    })

    it('onerilen R yi TAHMINI olarak etiketler', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/tahmini/i)).toBeInTheDocument()
    })

    it('yonetmeligin maliyet degil tasarim talebi olcekledigini yazar', () => {
        render(<RiskSuggestionCard risk={RISK} onApply={jest.fn()} />)
        expect(screen.getByText(/mühendislik raporu yerine geçmez/i)).toBeInTheDocument()
    })

    it('Uygula tiklaninca yuzde cinsinden risk seviyesi bildirir', async () => {
        const onApply = jest.fn()
        render(<RiskSuggestionCard risk={RISK} onApply={onApply} />)
        await userEvent.click(screen.getByRole('button', { name: /uygula/i }))
        expect(onApply).toHaveBeenCalledWith(10)   // (1.10 - 1) * 100
    })

    it('taskin bolgesindeyse bunu belirtir ve yuzdeyi yuvarlar', async () => {
        const onApply = jest.fn()
        render(
            <RiskSuggestionCard
                risk={{ ...RISK, floodQ100: true, suggestedR: 1.13 }}
                onApply={onApply}
            />,
        )
        expect(screen.getByText(/taşkın/i)).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /uygula/i }))
        expect(onApply).toHaveBeenCalledWith(13)
    })

    it('fay bulunamadiysa mesafe yerine 25 km disi der', () => {
        render(
            <RiskSuggestionCard
                risk={{ faultDistanceM: null, gammaF: 1, floodQ100: false, suggestedR: 1 }}
                onApply={jest.fn()}
            />,
        )
        expect(screen.getByText(/25 km/)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/risk/RiskSuggestionCard.test.tsx`
Expected: FAIL — `Cannot find module './RiskSuggestionCard'`

- [ ] **Step 3: Kartı yaz**

`src/components/risk/RiskSuggestionCard.tsx`:

```tsx
'use client'

import type { RiskMeasurement } from '@/lib/risk/types'
import styles from './RiskSuggestionCard.module.css'

interface Props {
    risk: RiskMeasurement
    /** Yüzde cinsinden risk seviyesi — /hesapla `riskLevel` state'i bu birimde. */
    onApply: (riskLevelPercent: number) => void
}

function formatDistance(m: number | null): string {
    if (m === null) return '25 km’den uzak'
    return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}

export function RiskSuggestionCard({ risk, onApply }: Props) {
    const percent = Math.round((risk.suggestedR - 1) * 100)

    return (
        <div className={styles.card}>
            <h4 className={styles.title}>Yakın fay etkisi</h4>

            <p className={styles.line}>
                Parseliniz diri faya yaklaşık <strong>{formatDistance(risk.faultDistanceM)}</strong>.
                {risk.floodQ100 && ' Parsel Q100 taşkın tehlike bölgesi içinde.'}
            </p>

            <p className={styles.line}>
                TBDY 2018 yakın fay katsayısı{' '}
                <strong>γF = {risk.gammaF.toFixed(2).replace('.', ',')}</strong>
            </p>

            <p className={styles.line}>
                <em>Tahmini</em> risk katsayısı önerisi:{' '}
                <strong>R = {risk.suggestedR.toFixed(2).replace('.', ',')}</strong>
            </p>

            <button type="button" className={styles.applyBtn} onClick={() => onApply(percent)}>
                Uygula
            </button>

            <small className={styles.disclaimer}>
                γF, TBDY 2018 uyarınca deprem tasarım talebini ölçekler; maliyet etkisi tahminidir.
                Mesafe fayın yüzey izine göre hesaplanmıştır. Mühendislik raporu yerine geçmez.
            </small>
        </div>
    )
}
```

`src/components/risk/RiskSuggestionCard.module.css` — mevcut `--seal-*` token'larını kullan, YENİ RENK TANIMLAMA:

```css
.card {
    border: 1px solid rgba(var(--seal-accent-rgb), 0.35);
    border-radius: 12px;
    padding: 16px;
    background: rgba(var(--seal-accent-rgb), 0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.title { margin: 0; font-size: 1rem; }
.line { margin: 0; font-size: 0.9rem; line-height: 1.5; }
.applyBtn {
    align-self: flex-start;
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: var(--seal-accent);
    color: #fff;
    font-weight: 600;
}
.disclaimer { opacity: 0.75; font-size: 0.75rem; line-height: 1.4; }
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/risk/RiskSuggestionCard.test.tsx`
Expected: PASS (6 test)

- [ ] **Step 5: `/hesapla`'ya bağla**

`src/app/hesapla/page.tsx` — import'lara ekle:

```ts
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { RiskSuggestionCard } from '@/components/risk/RiskSuggestionCard';
import type { RiskMeasurement } from '@/lib/risk/types';
```

`riskLevels` state'inin (satır ~81) hemen ardına:

```ts
  const [parcelValue, setParcelValue] = useState<ParcelPickerValue>({
    lat: null, lng: null, parcel: null, status: 'idle',
  });
  const [risk, setRisk] = useState<RiskMeasurement | null>(null);

  // Konum secilince risk olcumu. Konum OPSIYONELDIR; secilmezse sayfa
  // bugunku gibi calisir ve hicbir risk UI'i gosterilmez.
  useEffect(() => {
    const { lat, lng } = parcelValue;
    if (lat == null || lng == null) { setRisk(null); return; }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/risk/lookup?lat=${lat}&lng=${lng}`);
        const body = await res.json();
        if (!cancelled) setRisk(body.status === 'ok' ? body.risk : null);
      } catch {
        if (!cancelled) setRisk(null);
      }
    })();
    return () => { cancelled = true; };
  }, [parcelValue]);

  /**
   * Oneriyi ayrik risk izgarasina uygular. Izgara `riskLevels` state dizisinden
   * render edildigi icin onerilen yuzde mevcut secenekler arasinda yoksa yeni
   * bir secenek olarak eklenir.
   */
  const applyRiskSuggestion = (percent: number) => {
    setRiskLevels(prev =>
      prev.some(o => o.value === percent)
        ? prev
        : [...prev, {
            id: 'tbdy-suggested',
            label: 'TBDY önerisi',
            value: percent,
            sortOrder: prev.length,
            isDefault: false,
          }].sort((a, b) => a.value - b.value),
    );
    setRiskLevel(percent);
  };
```

Risk ızgarasının (satır ~509-513) hemen ARDINA, aynı sarmalayıcı içinde:

```tsx
              <ParcelPicker value={parcelValue} onChange={patch => setParcelValue(v => ({ ...v, ...patch }))} />
              {risk && <RiskSuggestionCard risk={risk} onApply={applyRiskSuggestion} />}
```

- [ ] **Step 6: tsc ve tam testi koştur**

Run: `npx tsc --noEmit && npx jest --no-coverage --roots "<rootDir>/src"`
Expected: 0 hata, tüm testler geçer.

- [ ] **Step 7: Commit**

```bash
git add src/components/risk src/app/hesapla/page.tsx
git commit -m "feat(hesapla): konum secimi ve TBDY tabanli risk katsayisi onerisi"
```

---

### Task 10: Final doğrulama

**Files:** yok (yalnızca doğrulama; bulgu çıkarsa düzeltme commit'i)

- [ ] **Step 1: Tam komut paketi**

```bash
npx tsc --noEmit
npx jest --no-coverage --roots "<rootDir>/src"
npx eslint src --max-warnings=-1
npm run build
```

Beklenen: tsc 0; jest tümü geçer (baseline 455 + bu planın ~45 yeni testi); eslint'te bu plandan kaynaklanan YENİ ihlal yok (projede önceden var olan 5 hata/12 uyarı bu planın kapsamı dışıdır); build başarılı.

- [ ] **Step 2: Canlı TUCBS erişimini doğrula**

Docker + dev sunucu ayaktayken, gerçek bir koordinatla:

```bash
curl -s "http://localhost:3000/api/risk/tiles?layers=diri_fay&bbox=28.6,40.7,29.4,41.3&width=256&height=256&srs=EPSG:4326" -o /tmp/fay.png
file /tmp/fay.png
```

Beklenen: `PNG image data, 256 x 256`. XML dönerse §3.1'deki UA/sürüm kısıtlarından biri ihlal edilmiştir.

- [ ] **Step 3: Playwright ile 4 senaryo**

1. **`/hesapla` — konum seçmeden:** sayfa bugünkü gibi çalışıyor, risk kartı YOK, hesap sonucu üretiliyor. (Mevcut akışın bozulmadığının kanıtı.)
2. **`/hesapla` — fay yakınında bir nokta seç** (örn. 40.875, 28.756): kart çıkıyor, γF = 1,20 yazıyor, "tahmini" etiketi ve uyarı metni görünür.
3. **`[Uygula]` sonrası:** risk ızgarasında seçili seçenek öneriye eşit, ve **hesap sonucu değişiyor** (ekran görüntüsüyle önce/sonra karşılaştır).
4. **İlan detayı:** "Diri fay" onay kutusu işaretlenince harita üzerinde katman beliriyor; kaldırılınca kayboluyor; harita hâlâ sürüklenemez (etkileşimsizlik korunmuş).

- [ ] **Step 4: İki dürüstlük sınırının ekranda göründüğünü doğrula**

Spec §5.1 gereği, `/hesapla` kartında şunlar GÖRÜNÜR olmalı: "tahmini" nitelemesi, "deprem tasarım talebini ölçekler; maliyet etkisi tahminidir", "fayın yüzey izine göre", "Mühendislik raporu yerine geçmez". Eksikse düzelt.

- [ ] **Step 5: Bulgular varsa düzelt ve commit et**

```bash
git add -A
git commit -m "fix(risk): final dogrulamada bulunan kusurlar giderildi"
```

---

## Notlar

- **origin ölü** (`github.com/XMYRA6/arsabil.git` → "Repository not found"). Bu plan yalnızca lokal commit üretir; push denenmeyecek.
- **Worktree kullanılırsa:** şema değiştiği için merge sonrası ANA checkout'ta `npx prisma generate` ŞART — aksi halde `tsc` bayat client yüzünden yalancı hata verir.
- **Ana checkout'ta jest:** worktree açıkken düz `npx jest` worktree kopyalarındaki testleri de toplar ve sahte hata verir. Daima `--roots "<rootDir>/src"` kullan.
