# Emsal İlan + Harita Katmanı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DegerKarti`'nin boş "Emsal ilanlar" placeholder'ını gerçek bir üye-gated emsal listesiyle, boş mini-haritasını gerçek mahalle sınırıyla doldurmak; talep üzerine açılan tam etkileşimli `EmsalMap`.

**Architecture:** Crawler Emlakjet detay sayfasından `neighborhoodGeometry` + `earthquakeRiskScore` çıkarır → yeni `Neighborhood` tablosu (mahalle başına tekil). Saf `comparables.ts` bir parsel için `MarketListing`'lerden mesafe + alan filtresiyle ilk 8 emsalı seçer. `buildDegerCard` bunları DI ile çekip DTO'ya ekler (üye: liste + sayı + geojson; anonim: sayı + geojson). `DegerKarti` statik bir mini-harita + emsal listesi render eder; "haritada gör" `EmsalMap`'i dinamik import eder.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma + PostgreSQL, Jest + ts-jest (`testEnvironment: 'node'`; RTL testleri dosya başında `/** @jest-environment jsdom */`), React Testing Library, Leaflet + leaflet.markercluster (`useLeafletMap` hook mevcut), Cheerio (crawler).

**Spec:** `docs/superpowers/specs/2026-08-30-emsal-ilan-harita-katmani-design.md`

## Global Constraints

- **`normalizeAreaName`** (`src/lib/areaPrices/normalizeAreaName.ts`) her yerde il/ilçe/mahalle anahtarları için — hem crawler `Neighborhood` yazımı hem API okuması. `AreaPriceStat` ile aynı key-space.
- **`ARSA_LISTING_TYPES`** (`src/lib/areaPrices/aggregate.ts`'ten export) — emsal filtresinde de aynı set (`['arsa','tarla','bag','bahce','zeytinlik','arazi']`).
- **`composes` YASAK** yeni CSS modüllerinde (Next 16 Turbopack/lightningcss `@media` içinde hard-error; `dev`+jest yakalamıyor — yalnız `npm run build`). Düz sınıf yaz.
- **Migration** elle yazılan SQL (proje deseni, `prisma/migrations/20260830120000_add_area_price_stat/` gibi).
- **Güvenlik deseni:** emsal `items` (liste) yalnız `memberView` payload'ına konur — hiç set edilmeyerek, client'ta gizlenerek değil. `comparableCount` + `neighborhoodGeojson` iki tarafta da (sınır hassas veri değil).
- **Dış kaynak linkleri:** emsal `sourceUrl` linkleri `target="_blank" rel="noopener nofollow"`.
- Her task: `npx tsc --noEmit` temiz + scoped jest. Görsel task'lar (8, 9) + final: `npm run build`.
- **`DistrictPrice` ve alt-proje 2'nin `AreaPriceStat` / `valuation.ts` mantığına DOKUNMA** — bu iş yalnızca yeni alan/dosya ekler; `DegerCardValue` şeması değişmez (emsal alanları `DegerCardDTO`'ya yeni top-level bölümler olarak eklenir).

---

## Dosya Yapısı

| Dosya | Create/Modify | Sorumluluk |
|---|---|---|
| `prisma/schema.prisma` | Modify | `Neighborhood` modeli |
| `prisma/migrations/20260831090000_add_neighborhood/migration.sql` | Create | Elle SQL |
| `src/lib/geo/haversine.ts` (+ `.test.ts`) | Create | `haversineMeters(a,b)` saf |
| `src/lib/deger/comparables.ts` (+ `.test.ts`) | Create | `selectComparables` saf |
| `crawler/adapters/types.ts` | Modify | `RawListing`'e `neighborhoodGeojson?` + `neighborhoodRiskScore?` |
| `crawler/adapters/emlakjet.ts` (+ `__tests__/emlakjet.test.ts`) | Modify | `extractNeighborhood(html)` + `parseDetailPage` çıktısına ekle |
| `crawler/pipeline/upsert.ts` | Modify | `UpsertClient`'a `neighborhood.upsert`; yeni `upsertNeighborhood()` fn |
| `crawler/run.ts` (+ `__tests__` varsa) | Modify | detay döngüsünde `upsertNeighborhood` çağrısı; `RunDeps.client` tipi |
| `src/lib/deger/card.ts` (+ `card.test.ts`) | Modify | `DegerCardDeps`'e `findListingsNear` + `findNeighborhood`; DTO'ya `neighborhood` + `comparables` bölümleri |
| `src/app/api/deger/kart/route.ts` (+ `__tests__/route.test.ts`) | Modify | iki yeni inline DI sorgusu |
| `src/components/deger/DegerMiniMap.tsx` (+ `.module.css`, `.test.tsx`) | Create | Statik Leaflet: parsel + mahalle sınırı |
| `src/components/deger/DegerKarti.tsx` (+ `.module.css`, `.test.tsx`) | Modify | mini-harita bileşenini göm; emsal liste bloğu; "haritada gör"; `.soon` güncelle |
| `src/components/deger/EmsalMap.tsx` (+ `.module.css`, `.test.tsx`) | Create | Tam etkileşimli Leaflet, dinamik import |

---

## Task 1: `Neighborhood` modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (yeni model — `AreaPriceStat` modelinin ardına)
- Create: `prisma/migrations/20260831090000_add_neighborhood/migration.sql`
- Test: yok (şema; doğrulama `prisma migrate` + `tsc`)

**Interfaces:**
- Produces: Prisma `Neighborhood` — `il: string`, `ilce: string`, `mahalle: string`, `geojson: Json | null`, `emlakjetRiskScore: number | null`, `source: string`, `updatedAt: Date`. Unique `[il, ilce, mahalle]` → Prisma compound key `il_ilce_mahalle`.

- [ ] **Step 1: Şemaya modeli ekle**

`prisma/schema.prisma`, `model AreaPriceStat { ... }` bloğunun ardına:

```prisma
model Neighborhood {
  id                String   @id @default(cuid())
  il                String
  ilce              String
  mahalle           String
  geojson           Json?
  emlakjetRiskScore Float?
  source            String
  updatedAt         DateTime @updatedAt

  @@unique([il, ilce, mahalle])
}
```

- [ ] **Step 2: Migration SQL**

`prisma/migrations/20260831090000_add_neighborhood/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "geojson" JSONB,
    "emlakjetRiskScore" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_il_ilce_mahalle_key" ON "Neighborhood"("il", "ilce", "mahalle");
```

- [ ] **Step 3: Uygula + generate**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `Neighborhood` tablosu oluşur, client tipleri güncellenir. (Dev DB `arsabil_postgres_dev` ayakta olmalı.)

- [ ] **Step 4: Tip kontrolü**

Run: `npx prisma migrate status` (temiz) ve `npx tsc --noEmit` (temiz — model henüz kullanılmıyor).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260831090000_add_neighborhood
git commit -m "feat(emsal): Neighborhood modeli + migration"
```

---

## Task 2: `haversine.ts`

**Files:**
- Create: `src/lib/geo/haversine.ts`
- Test: `src/lib/geo/haversine.test.ts`

**Interfaces:**
- Produces: `export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number`

- [ ] **Step 1: Failing test**

`src/lib/geo/haversine.test.ts`:

```ts
import { haversineMeters } from './haversine'

describe('haversineMeters', () => {
  it('aynı nokta → 0', () => {
    expect(haversineMeters({ lat: 41, lng: 39 }, { lat: 41, lng: 39 })).toBe(0)
  })
  it('~1 derece boylam farkı ekvatora yakın ~111 km değil ama Trabzon enleminde ~84 km', () => {
    // Trabzon ~41°N: 1° boylam ≈ 111320 * cos(41°) ≈ 84 km
    const d = haversineMeters({ lat: 41, lng: 39 }, { lat: 41, lng: 40 })
    expect(d).toBeGreaterThan(83000)
    expect(d).toBeLessThan(85000)
  })
  it('~1 derece enlem farkı ≈ 111 km', () => {
    const d = haversineMeters({ lat: 41, lng: 39 }, { lat: 42, lng: 39 })
    expect(d).toBeGreaterThan(110000)
    expect(d).toBeLessThan(112000)
  })
  it('kısa mesafe (~500 m) makul', () => {
    const d = haversineMeters({ lat: 41.0, lng: 39.0 }, { lat: 41.0045, lng: 39.0 })
    expect(d).toBeGreaterThan(490)
    expect(d).toBeLessThan(510)
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/geo/haversine.test.ts` → FAIL "Cannot find module './haversine'".

- [ ] **Step 3: Implementasyon**

`src/lib/geo/haversine.ts`:

```ts
const R = 6_371_000 // dünya yarıçapı, metre

/** İki lat/lng arası büyük-daire mesafesi (metre). */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/geo/haversine.test.ts` → PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo/haversine.ts src/lib/geo/haversine.test.ts
git commit -m "feat(emsal): haversineMeters saf yardımcısı"
```

---

## Task 3: `comparables.ts`

**Files:**
- Create: `src/lib/deger/comparables.ts`
- Test: `src/lib/deger/comparables.test.ts`

**Interfaces:**
- Consumes: `haversineMeters` from `@/lib/geo/haversine`; `ARSA_LISTING_TYPES` from `@/lib/areaPrices/aggregate`.
- Produces:
  - `export interface ComparableListing { id: string; pricePerSqm: number | null; areaSqm: number | null; price: number | null; lat: number | null; lng: number | null; geoPrecision: string | null; listedAt: Date | null; source: string; sourceUrl: string; listingType: string }`
  - `export interface ComparableInput { parcel: { lat: number; lng: number; areaSqm: number | null }; listings: ComparableListing[] }`
  - `export interface Comparable { pricePerSqm: number | null; areaSqm: number | null; price: number | null; distanceM: number; approxDistance: boolean; lat: number; lng: number; listedAt: Date | null; source: string; sourceUrl: string }`
  - `export function selectComparables(input: ComparableInput): { items: Comparable[]; total: number }`
- Kurallar (spec §comparables.ts):
  - `parcel.lat`/`lng` sonlu değilse → `{ items: [], total: 0 }`
  - Filtre: `lat`+`lng` sonlu · `pricePerSqm` sonlu ve `> 0` · `listingType ∈ ARSA_LISTING_TYPES`
  - Alan benzerliği: `parcel.areaSqm` sonlu ve `> 0` ise `areaSqm` (dolu olanlarda) `[parcel.areaSqm*0.25, parcel.areaSqm*4]` dışını ele; `areaSqm` null olan geçer; `parcel.areaSqm` yoksa filtre atlanır
  - Yarıçap: `haversineMeters > 5000` ele
  - `total` = 1–3'ü geçen sayı; `items` = `distanceM` artan sıralı ilk 8
  - `approxDistance = geoPrecision !== 'exact'`

- [ ] **Step 1: Failing test**

`src/lib/deger/comparables.test.ts`:

```ts
import { selectComparables, type ComparableListing } from './comparables'

const P = { lat: 41.0, lng: 39.7, areaSqm: 1000 }

function L(over: Partial<ComparableListing>): ComparableListing {
  return {
    id: 'x', pricePerSqm: 2000, areaSqm: 1000, price: 2_000_000,
    lat: 41.001, lng: 39.7, geoPrecision: 'neighborhood',
    listedAt: new Date('2026-08-20'), source: 'emlakjet',
    sourceUrl: 'https://emlakjet.com/ilan/1', listingType: 'arsa',
    ...over,
  }
}

describe('selectComparables', () => {
  it('yakın + benzer alan → emsal listesinde', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'a' })] })
    expect(r.total).toBe(1)
    expect(r.items).toHaveLength(1)
    expect(r.items[0].distanceM).toBeGreaterThan(0)
    expect(r.items[0].approxDistance).toBe(true) // geoPrecision neighborhood
  })

  it('50.000 m² tarla, 1.000 m² parsele emsal DEĞİL (alan filtresi)', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'big', areaSqm: 50_000 })] })
    expect(r.total).toBe(0)
    expect(r.items).toEqual([])
  })

  it('alanı null olan ilan alan filtresini geçer', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'na', areaSqm: null })] })
    expect(r.total).toBe(1)
  })

  it('parsel alanı yoksa alan filtresi atlanır', () => {
    const r = selectComparables({
      parcel: { ...P, areaSqm: null },
      listings: [L({ id: 'big', areaSqm: 50_000 })],
    })
    expect(r.total).toBe(1)
  })

  it('5 km ötesi elenir', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'far', lat: 41.1, lng: 39.7 })] })
    expect(r.total).toBe(0)
  })

  it('koordinatsız / fiyatsız / yanlış-tip elenir', () => {
    const r = selectComparables({
      parcel: P,
      listings: [
        L({ id: 'nocoord', lat: null }),
        L({ id: 'noprice', pricePerSqm: 0 }),
        L({ id: 'konut', listingType: 'konut' }),
        L({ id: 'ok' }),
      ],
    })
    expect(r.total).toBe(1)
    expect(r.items[0].source).toBe('emlakjet')
  })

  it('8 sınırı + total tam sayı, mesafeye göre sıralı', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      L({ id: `n${i}`, lat: 41.0 + i * 0.0005, lng: 39.7 }),
    )
    const r = selectComparables({ parcel: P, listings: many })
    expect(r.total).toBe(12)
    expect(r.items).toHaveLength(8)
    const dists = r.items.map((c) => c.distanceM)
    expect([...dists].sort((a, b) => a - b)).toEqual(dists)
  })

  it('parsel koordinatı geçersiz → boş', () => {
    const r = selectComparables({ parcel: { lat: NaN, lng: 39, areaSqm: 1000 }, listings: [L({})] })
    expect(r).toEqual({ items: [], total: 0 })
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/deger/comparables.test.ts` → FAIL "Cannot find module './comparables'".

- [ ] **Step 3: Implementasyon**

`src/lib/deger/comparables.ts`:

```ts
import { haversineMeters } from '@/lib/geo/haversine'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'

export interface ComparableListing {
  id: string
  pricePerSqm: number | null
  areaSqm: number | null
  price: number | null
  lat: number | null
  lng: number | null
  geoPrecision: string | null
  listedAt: Date | null
  source: string
  sourceUrl: string
  listingType: string
}

export interface ComparableInput {
  parcel: { lat: number; lng: number; areaSqm: number | null }
  listings: ComparableListing[]
}

export interface Comparable {
  pricePerSqm: number | null
  areaSqm: number | null
  price: number | null
  distanceM: number
  approxDistance: boolean
  lat: number
  lng: number
  listedAt: Date | null
  source: string
  sourceUrl: string
}

const MAX_RADIUS_M = 5000
const MAX_ITEMS = 8
const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)

export function selectComparables(input: ComparableInput): { items: Comparable[]; total: number } {
  const { parcel } = input
  if (!Number.isFinite(parcel.lat) || !Number.isFinite(parcel.lng)) {
    return { items: [], total: 0 }
  }
  const hasParcelArea = Number.isFinite(parcel.areaSqm) && (parcel.areaSqm ?? 0) > 0
  const areaLow = hasParcelArea ? (parcel.areaSqm as number) * 0.25 : 0
  const areaHigh = hasParcelArea ? (parcel.areaSqm as number) * 4 : Infinity

  const passed: Comparable[] = []
  for (const l of input.listings) {
    if (l.lat == null || l.lng == null || !Number.isFinite(l.lat) || !Number.isFinite(l.lng)) continue
    if (l.pricePerSqm == null || !Number.isFinite(l.pricePerSqm) || l.pricePerSqm <= 0) continue
    if (!arsaTypes.has(l.listingType)) continue
    if (hasParcelArea && l.areaSqm != null && (l.areaSqm < areaLow || l.areaSqm > areaHigh)) continue
    const distanceM = haversineMeters({ lat: parcel.lat, lng: parcel.lng }, { lat: l.lat, lng: l.lng })
    if (distanceM > MAX_RADIUS_M) continue
    passed.push({
      pricePerSqm: l.pricePerSqm,
      areaSqm: l.areaSqm,
      price: l.price,
      distanceM,
      approxDistance: l.geoPrecision !== 'exact',
      lat: l.lat,
      lng: l.lng,
      listedAt: l.listedAt,
      source: l.source,
      sourceUrl: l.sourceUrl,
    })
  }
  passed.sort((a, b) => a.distanceM - b.distanceM)
  return { items: passed.slice(0, MAX_ITEMS), total: passed.length }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/deger/comparables.test.ts` → PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deger/comparables.ts src/lib/deger/comparables.test.ts
git commit -m "feat(emsal): selectComparables saf motor (mesafe + alan filtresi)"
```

---

## Task 4: Crawler — `extractNeighborhood`

**Files:**
- Modify: `crawler/adapters/types.ts` (`RawListing`)
- Modify: `crawler/adapters/emlakjet.ts` (yeni yardımcı + `parseDetailPage`)
- Test: `crawler/adapters/__tests__/emlakjet.test.ts` (mevcut dosyaya ekle)

**Interfaces:**
- Produces:
  - `RawListing` opsiyonel alanlar: `neighborhoodGeojson?: unknown`, `neighborhoodRiskScore?: number`
  - `emlakjet.ts` içinde (dosya-yerel, export gerekmez ama test için `export`): `export function extractNeighborhood(html: string): { geojson: unknown; riskScore: number | null } | null`

**Fixture gerçeği:** `crawler/fixtures/emlakjet-arsa-detail-1.html` içinde kaçışlı JSON:
`\"earthquakeRiskScore\":0.198,` ve `\"neighborhoodGeometry\":{\"type\":\"multipolygon\",\"coordinates\":[[[[39.338743509,41.067457401],...]]]}`
(HTML ham baytlarında `\` sayısı değişebilir — regex `\\+` ile herhangi bir kaçış seviyesini karşıla). Geometri objesinin İÇİNDE `{}` yok (sadece diziler) → `\{[^{}]*\}` güvenli.

- [ ] **Step 1: Failing test yaz**

`crawler/adapters/__tests__/emlakjet.test.ts` içine (dosyanın mevcut import'larıyla uyumlu — muhtemelen `import { emlakjetAdapter } from '../emlakjet'` var; `extractNeighborhood`'u da import et):

```ts
import { emlakjetAdapter, extractNeighborhood } from '../emlakjet'
import { readFileSync } from 'fs'
import { join } from 'path'

const arsaDetailHtml = readFileSync(
  join(__dirname, '../../fixtures/emlakjet-arsa-detail-1.html'),
  'utf8',
)

describe('extractNeighborhood', () => {
  it('fixture\'dan multipolygon + risk skoru çıkarır', () => {
    const n = extractNeighborhood(arsaDetailHtml)
    expect(n).not.toBeNull()
    expect(n!.riskScore).toBeCloseTo(0.198)
    const geo = n!.geojson as { type: string; coordinates: number[][][][] }
    expect(geo.type).toBe('MultiPolygon') // küçük harf 'multipolygon' normalize edildi
    expect(geo.coordinates[0][0][0]).toEqual([39.338743509, 41.067457401]) // [lng, lat] dokunulmadı
  })

  it('geometri yoksa null döner', () => {
    expect(extractNeighborhood('<html>hiçbir şey</html>')).toBeNull()
  })

  it('parseDetailPage sonucu neighborhoodGeojson + neighborhoodRiskScore taşır', () => {
    const raw = emlakjetAdapter.parseDetailPage(arsaDetailHtml, 'https://www.emlakjet.com/ilan/x-17976077')
    expect(raw.neighborhoodGeojson).toBeTruthy()
    expect(raw.neighborhoodRiskScore).toBeCloseTo(0.198)
    // mevcut alanlar bozulmadı
    expect(raw.sourceListingId).toBe('17976077')
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npm run test:crawler -- emlakjet` → FAIL (extractNeighborhood yok / undefined alanlar).

- [ ] **Step 3: `RawListing`'e alan ekle**

`crawler/adapters/types.ts`, `RawListing` interface'ine (mevcut alanların yanına):

```ts
  neighborhoodGeojson?: unknown
  neighborhoodRiskScore?: number
```

- [ ] **Step 4: `extractNeighborhood` + `parseDetailPage`**

`crawler/adapters/emlakjet.ts`, dosya seviyesinde yeni fonksiyon:

```ts
/**
 * Emlakjet detay sayfası, mahalle sınır poligonunu + deprem risk skorunu
 * kaçışlı JSON olarak bir JS blob'unun içinde taşıyor:
 *   \"earthquakeRiskScore\":0.198, ... \"neighborhoodGeometry\":{\"type\":\"multipolygon\",\"coordinates\":[[[[lng,lat],...]]]}
 * Hassas ilan koordinatı YOK — yalnızca mahalle geometrisi.
 */
export function extractNeighborhood(
  html: string,
): { geojson: unknown; riskScore: number | null } | null {
  // geometri objesi: içinde {} yok, sadece diziler → [^{}]* güvenli.
  const geoMatch = html.match(/\\+"neighborhoodGeometry\\+"\s*:\s*(\{[^{}]*\})/)
  if (!geoMatch) return null
  let geojson: unknown
  try {
    // herhangi bir kaçış seviyesini düz JSON'a indir: \\\" / \" → "
    const jsonText = geoMatch[1].replace(/\\+"/g, '"')
    const parsed = JSON.parse(jsonText) as { type?: string; coordinates?: unknown }
    if (!parsed || typeof parsed !== 'object' || !parsed.coordinates) return null
    // "multipolygon" → "MultiPolygon" (GeoJSON standardı); koordinat sırası dokunma
    const type =
      String(parsed.type ?? '').toLowerCase() === 'multipolygon' ? 'MultiPolygon' : 'Polygon'
    geojson = { type, coordinates: parsed.coordinates }
  } catch {
    return null
  }
  const riskMatch = html.match(/\\+"earthquakeRiskScore\\+"\s*:\s*([0-9]+(?:\.[0-9]+)?)/)
  const riskScore = riskMatch ? Number(riskMatch[1]) : null
  return { geojson, riskScore: Number.isFinite(riskScore as number) ? riskScore : null }
}
```

`parseDetailPage`'in `return { ... }` objesine ekle (mevcut alanların yanına):

```ts
      ...(extractNeighborhood(html)
        ? {
            neighborhoodGeojson: extractNeighborhood(html)!.geojson,
            neighborhoodRiskScore: extractNeighborhood(html)!.riskScore ?? undefined,
          }
        : {}),
```

(Not: `extractNeighborhood`'u üç kez çağırmak yerine bir kez üstte `const nb = extractNeighborhood(html)` tanımlayıp kullanabilirsin — implementer'ın tercihine bırakılıyor, ikisi de doğru.)

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npm run test:crawler -- emlakjet` → PASS (yeni 3 + mevcut emlakjet testleri).
Run: `npx tsc -p crawler` → temiz (proje `test:crawler` yanında ayrı `tsc -p crawler` adımı var — CI deseni).

- [ ] **Step 6: Commit**

```bash
git add crawler/adapters/types.ts crawler/adapters/emlakjet.ts crawler/adapters/__tests__/emlakjet.test.ts
git commit -m "feat(emsal): Emlakjet neighborhoodGeometry + earthquakeRiskScore çıkarımı"
```

---

## Task 5: Crawler — `Neighborhood` upsert

**Files:**
- Modify: `crawler/pipeline/upsert.ts` (`UpsertClient` tipi + yeni `upsertNeighborhood`)
- Modify: `crawler/run.ts` (detay döngüsünde çağrı + `RunDeps.client` tipi + `main()` wiring)
- Test: `crawler/pipeline/__tests__/upsert.test.ts` (mevcut dosyaya ekle) veya `crawler/run` test dosyası varsa oraya

**Interfaces:**
- Consumes: `normalizeAreaName` — **crawler `@/` alias'ı `tsconfig-paths` ile çözüyor** (bkz. `geocode.ts`'in `@/lib/tkgm/idariYapi` import'u), yani `import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'` çalışır.
- Produces:
  - `UpsertClient` interface'ine: `neighborhood: { upsert(args: { where: { il_ilce_mahalle: { il: string; ilce: string; mahalle: string } }; create: any; update: any }): Promise<any> }`
  - `export async function upsertNeighborhood(client: UpsertClient, args: { il: string; ilce: string; mahalle: string; geojson: unknown; riskScore: number | null; source: string }): Promise<void>`

- [ ] **Step 1: Failing test**

`crawler/pipeline/__tests__/upsert.test.ts` içine:

```ts
import { upsertNeighborhood, type UpsertClient } from '../upsert'

function client() {
  return {
    neighborhood: { upsert: jest.fn().mockResolvedValue({}) },
  } as unknown as UpsertClient
}

describe('upsertNeighborhood', () => {
  it('normalize edilmiş anahtarla upsert eder', async () => {
    const c = client()
    await upsertNeighborhood(c, {
      il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu',
      geojson: { type: 'MultiPolygon', coordinates: [] }, riskScore: 0.2, source: 'emlakjet',
    })
    const call = (c.neighborhood.upsert as jest.Mock).mock.calls[0][0]
    expect(call.where.il_ilce_mahalle).toEqual({ il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU' })
    expect(call.create.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
    expect(call.create.emlakjetRiskScore).toBe(0.2)
    expect(call.update.geojson).toBeDefined()
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npm run test:crawler -- upsert` → FAIL "upsertNeighborhood is not a function".

- [ ] **Step 3: `upsert.ts` değişikliği**

`crawler/pipeline/upsert.ts` üstüne import:

```ts
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
```

`UpsertClient` interface'ine:

```ts
  neighborhood: {
    upsert(args: {
      where: { il_ilce_mahalle: { il: string; ilce: string; mahalle: string } }
      create: Record<string, unknown>
      update: Record<string, unknown>
    }): Promise<unknown>
  }
```

Yeni fonksiyon (dosya sonuna):

```ts
export async function upsertNeighborhood(
  client: UpsertClient,
  args: { il: string; ilce: string; mahalle: string; geojson: unknown; riskScore: number | null; source: string },
): Promise<void> {
  const il = normalizeAreaName(args.il)
  const ilce = normalizeAreaName(args.ilce)
  const mahalle = normalizeAreaName(args.mahalle)
  const data = {
    geojson: args.geojson as never,
    emlakjetRiskScore: args.riskScore,
    source: args.source,
  }
  await client.neighborhood.upsert({
    where: { il_ilce_mahalle: { il, ilce, mahalle } },
    create: { il, ilce, mahalle, ...data },
    update: data,
  })
}
```

- [ ] **Step 4: `run.ts` değişikliği**

`crawler/run.ts` — import ekle: `import { upsertListing, markDelistedExcept, writeDupeLinks, upsertNeighborhood, type UpsertClient } from './pipeline/upsert'`

`RunDeps.client` tip birleşimine `neighborhood` zaten `UpsertClient`'tan gelir (değişiklik gerekmez — `client: UpsertClient & { crawlRun: ... }`).

Detay döngüsünde, `const res = await upsertListing(deps.client, { normalized, geo })` satırından hemen SONRA:

```ts
          if (
            normalized.il && normalized.ilce && normalized.mahalle &&
            raw.neighborhoodGeojson
          ) {
            try {
              await upsertNeighborhood(deps.client, {
                il: normalized.il, ilce: normalized.ilce, mahalle: normalized.mahalle,
                geojson: raw.neighborhoodGeojson,
                riskScore: raw.neighborhoodRiskScore ?? null,
                source: adapter.source,
              })
            } catch (e) {
              // Neighborhood yazımı ilan akışını BLOKLAMAZ — delisting/dedupe'den bağımsız
              console.error('neighborhood upsert atlandı:', e)
            }
          }
```

(`raw` bu scope'ta zaten var — `parseDetailPage`'in çıktısı; `normalizeRaw(raw)`'dan önce tanımlı.)

`main()` içinde `client: prisma as unknown as RunDeps['client']` zaten `prisma.neighborhood`'u kapsar — değişiklik gerekmez.

- [ ] **Step 5: Testlerin geçtiğini + regresyon**

Run: `npm run test:crawler` → tüm crawler süiti yeşil (mevcut `run` / `upsert` testleri + yeni).
Run: `npx tsc -p crawler` → temiz.

Eğer mevcut `run.ts` testleri `deps.client` mock'unda `neighborhood` eksik diye tip hatası verirse: o test dosyalarındaki mock client fixture'ına `neighborhood: { upsert: jest.fn() }` ekle (implementer bunu yapmalı — mevcut testlerin davranışı değişmez, sadece tip tamamlanır).

- [ ] **Step 6: Commit**

```bash
git add crawler/pipeline/upsert.ts crawler/run.ts crawler/pipeline/__tests__/upsert.test.ts
git commit -m "feat(emsal): crawler ilan başına Neighborhood upsert"
```

---

## Task 6: `card.ts` — emsal + sınır orkestrasyonu

**Files:**
- Modify: `src/lib/deger/card.ts`
- Test: `src/lib/deger/card.test.ts`

**Interfaces:**
- Consumes: `selectComparables`, `Comparable`, `ComparableListing` from `@/lib/deger/comparables`.
- Produces (card.ts değişiklikleri):
  - `DegerCardDeps`'e:
    - `findListingsNear: (il: string, ilce: string) => Promise<ComparableListing[]>`
    - `findNeighborhood: (il: string, ilce: string, mahalle: string) => Promise<{ geojson: unknown } | null>`
  - `DegerCardDTO`'ya iki yeni top-level alan:
    - `neighborhood: { geojson: unknown | null }`
    - `comparables: { count: number; items?: Comparable[] }`
- Kurallar:
  - `findListingsNear` + `findNeighborhood`, `findAreaStats` ile aynı `Promise.all` içinde (parsel bulundu, `insufficientData` OLSA BİLE — emsal `insufficientData`'dan bağımsız), `normalizeAreaName`'li argümanlarla.
  - `selectComparables({ parcel: { lat, lng, areaSqm: parcel.areaSqm }, listings })` — `lat/lng` = `center` (point ise input, adaParsel ise `parcelCentroidLatLng`). `center` null ise emsal boş.
  - `neighborhood.geojson` = `findNeighborhood(...)?.geojson ?? null` — **her iki tier'da**.
  - `comparables.count` = `selectComparables(...).total` — **her iki tier'da**.
  - `comparables.items` = **yalnız `opts.memberView`** → `selectComparables(...).items`. Anonim: `items` hiç yok.
  - Parsel `{ ok: false }` → mevcut davranış (yeni alanlar eklenmez, DTO zaten dönmüyor).

- [ ] **Step 1: Failing test**

`src/lib/deger/card.test.ts` — mevcut `deps()` fabrikasına iki yeni mock ekle ve yeni testler:

```ts
// deps() fabrikasına ekle:
    findListingsNear: jest.fn().mockResolvedValue([
      {
        id: 'c1', pricePerSqm: 2500, areaSqm: 480, price: 1_200_000,
        lat: 41.0009, lng: 39.7, geoPrecision: 'neighborhood',
        listedAt: new Date('2026-08-21'), source: 'emlakjet',
        sourceUrl: 'https://emlakjet.com/ilan/c1', listingType: 'arsa',
      },
    ]),
    findNeighborhood: jest.fn().mockResolvedValue({ geojson: { type: 'MultiPolygon', coordinates: [] } }),
```

```ts
it('üye: comparables.items + count + neighborhood.geojson', async () => {
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card.comparables.count).toBe(1)
  expect(res.card.comparables.items).toHaveLength(1)
  expect(res.card.comparables.items![0].pricePerSqm).toBe(2500)
  expect(res.card.neighborhood.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
})

it('anonim: comparables.count + neighborhood.geojson AMA items YOK', async () => {
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card.comparables.count).toBe(1)
  expect(res.card.comparables).not.toHaveProperty('items')
  expect(res.card.neighborhood.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
})

it('Neighborhood yoksa geojson null', async () => {
  const d = deps({ findNeighborhood: jest.fn().mockResolvedValue(null) })
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card.neighborhood.geojson).toBeNull()
})

it('findListingsNear normalize edilmiş il/ilçe alır', async () => {
  const d = deps()
  await buildDegerCard({ kind: 'adaParsel', mahalleId: 1, ada: '1', parsel: '2' }, d, { memberView: false })
  expect(d.findListingsNear).toHaveBeenCalledWith('TRABZON', 'ORTAHISAR')
})
```

(Mevcut "üye alanları YOK" paywall testinin `Object.keys(res.card.value)` iddiası DEĞİŞMEZ — emsal alanları `card.value`'da değil, `card.comparables` / `card.neighborhood`'da.)

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/deger/card.test.ts` → yeni testler FAIL (deps eksik / DTO alanı yok).

- [ ] **Step 3: `card.ts` implementasyon**

Import: `import { selectComparables, type Comparable, type ComparableListing } from '@/lib/deger/comparables'`

`DegerCardDeps`'e iki alan (Interfaces bölümündeki imzalarla).

`DegerCardDTO`'ya:

```ts
  neighborhood: { geojson: unknown | null }
  comparables: { count: number; items?: Comparable[] }
```

`buildDegerCard` içinde — mevcut `Promise.all` (şu an `buildRiskSnapshot` + `findAreaStats` içeriyor) iki yeni çağrıyla genişletilir:

```ts
  const nIl = normalizeAreaName(parcel.il)
  const nIlce = normalizeAreaName(parcel.ilce)
  const nMahalle = normalizeAreaName(parcel.mahalle)
  const [snap, stats, listings, hood] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(nIl, nIlce, nMahalle),
    deps.findListingsNear(nIl, nIlce),
    deps.findNeighborhood(nIl, nIlce, nMahalle),
  ])
```

(Mevcut kodda `findAreaStats` çağrısı zaten `normalizeAreaName(parcel.il)` vb. ile yapılıyor — üç `const`'a çıkar, dört çağrıda da kullan. `snap` değişkeni mevcut isimse koru.)

`center` hesabından sonra:

```ts
  const comp = center
    ? selectComparables({
        parcel: { lat: center.lat, lng: center.lng, areaSqm: parcel.areaSqm },
        listings,
      })
    : { items: [], total: 0 }
```

DTO `return` objesine (parsel/risk/value yanına):

```ts
      neighborhood: { geojson: hood?.geojson ?? null },
      comparables: {
        count: comp.total,
        ...(opts.memberView ? { items: comp.items } : {}),
      },
```

- [ ] **Step 4: Testlerin geçtiğini + regresyon**

Run: `npx jest src/lib/deger/card.test.ts` → tüm testler (yeni + mevcut paywall/insufficient/risk).
Run: `npx tsc --noEmit` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deger/card.ts src/lib/deger/card.test.ts
git commit -m "feat(emsal): buildDegerCard emsal listesi + mahalle sınırı orkestrasyonu"
```

---

## Task 7: `/api/deger/kart` route — yeni sorgular

**Files:**
- Modify: `src/app/api/deger/kart/route.ts`
- Test: `src/app/api/deger/kart/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `card.ts`'in yeni `DegerCardDeps` alanları; `ComparableListing` from `@/lib/deger/comparables`; `ARSA_LISTING_TYPES` from `@/lib/areaPrices/aggregate`.
- Route'un `buildDegerCard` DI objesine iki yeni alan:
  - `findListingsNear: async (il, ilce): Promise<ComparableListing[]>` →
    `prisma.marketListing.findMany({ where: { il, ilce, status: 'active', lat: { not: null }, lng: { not: null }, listingType: { in: [...ARSA_LISTING_TYPES] } }, select: { id, pricePerSqm, areaSqm, price, lat, lng, geoPrecision, listedAt, source, sourceUrl, listingType } })` → `rows as ComparableListing[]`
  - `findNeighborhood: async (il, ilce, mahalle) => prisma.neighborhood.findUnique({ where: { il_ilce_mahalle: { il, ilce, mahalle } }, select: { geojson: true } })` → dönüş `{ geojson } | null` (Prisma `geojson` `JsonValue` → `unknown` cast)
- il/ilçe/mahalle argümanları `buildDegerCard` içinde zaten `normalizeAreaName`'den geçiyor (route ham verir, card normalize eder — mevcut `findAreaStats` deseniyle aynı).

- [ ] **Step 1: Failing test**

`route.test.ts` — `jest.mock('@/lib/prisma')` fixture'ına `marketListing.findMany` + `neighborhood.findUnique` ekle; `jest.mock('@/lib/deger/card')` zaten `buildDegerCard`'ı mock'luyor, yani route testi **DI objesinin şeklini** doğrular:

```ts
it('buildDegerCard\'a findListingsNear + findNeighborhood DI geçer', async () => {
  await GET(req('lat=41.0&lng=39.7'))
  const deps = buildDegerCardMock.mock.calls[0][1]
  expect(typeof deps.findListingsNear).toBe('function')
  expect(typeof deps.findNeighborhood).toBe('function')
})

it('findListingsNear aktif + koordinatlı + arsa filtresiyle sorgular', async () => {
  const prisma = jest.requireMock('@/lib/prisma').prisma
  prisma.marketListing.findMany.mockResolvedValue([])
  await GET(req('lat=41.0&lng=39.7'))
  const deps = buildDegerCardMock.mock.calls[0][1]
  await deps.findListingsNear('TRABZON', 'ORTAHISAR')
  const where = prisma.marketListing.findMany.mock.calls[0][0].where
  expect(where).toMatchObject({ il: 'TRABZON', ilce: 'ORTAHISAR', status: 'active' })
  expect(where.lat).toEqual({ not: null })
  expect(where.listingType.in).toEqual(expect.arrayContaining(['arsa', 'tarla']))
})

it('findNeighborhood compound key ile findUnique', async () => {
  const prisma = jest.requireMock('@/lib/prisma').prisma
  prisma.neighborhood.findUnique.mockResolvedValue({ geojson: { type: 'MultiPolygon' } })
  await GET(req('lat=41.0&lng=39.7'))
  const deps = buildDegerCardMock.mock.calls[0][1]
  const r = await deps.findNeighborhood('TRABZON', 'ORTAHISAR', 'UĞURLU')
  expect(prisma.neighborhood.findUnique.mock.calls[0][0].where.il_ilce_mahalle)
    .toEqual({ il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU' })
  expect(r).toEqual({ geojson: { type: 'MultiPolygon' } })
})
```

Mevcut testler için `jest.mock('@/lib/prisma')` genişletilir:
```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    areaPriceStat: { findMany: jest.fn().mockResolvedValue([]) },
    marketListing: { findMany: jest.fn().mockResolvedValue([]) },
    neighborhood: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}))
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/api/deger/kart` → yeni testler FAIL.

- [ ] **Step 3: Route implementasyon**

`route.ts` — import `import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'` ve `import type { ComparableListing } from '@/lib/deger/comparables'`.

`buildDegerCard(input, { ... }, ...)` DI objesine `findAreaStats`'ın yanına:

```ts
      findListingsNear: async (il, ilce): Promise<ComparableListing[]> => {
        const rows = await prisma.marketListing.findMany({
          where: {
            il,
            ilce,
            status: 'active',
            lat: { not: null },
            lng: { not: null },
            listingType: { in: [...ARSA_LISTING_TYPES] },
          },
          select: {
            id: true, pricePerSqm: true, areaSqm: true, price: true,
            lat: true, lng: true, geoPrecision: true, listedAt: true,
            source: true, sourceUrl: true, listingType: true,
          },
        })
        return rows as ComparableListing[]
      },
      findNeighborhood: async (il, ilce, mahalle) => {
        const row = await prisma.neighborhood.findUnique({
          where: { il_ilce_mahalle: { il, ilce, mahalle } },
          select: { geojson: true },
        })
        return row ? { geojson: row.geojson as unknown } : null
      },
```

- [ ] **Step 4: Testlerin geçtiğini + regresyon + tip**

Run: `npx jest src/app/api/deger/kart` → tüm testler.
Run: `npx tsc --noEmit` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/deger/kart
git commit -m "feat(emsal): /api/deger/kart — MarketListing + Neighborhood sorguları"
```

---

## Task 8: `DegerMiniMap` + `DegerKarti` emsal bloğu

**Files:**
- Create: `src/components/deger/DegerMiniMap.tsx`, `DegerMiniMap.module.css`, `DegerMiniMap.test.tsx`
- Modify: `src/components/deger/DegerKarti.tsx`, `DegerKarti.module.css`, `DegerKarti.test.tsx`

**Interfaces:**
- `DegerMiniMap` — `export function DegerMiniMap(props: { parcelGeometry: unknown; neighborhoodGeojson: unknown | null }): JSX.Element`
  - `'use client'`. `useLeafletMap` (`@/lib/hooks/useLeafletMap`) — `MiniMap.tsx` deseni: `leafletMapOptions: { zoomControl: false, scrollWheelZoom: false, dragging: false }`.
  - `onReady(map, L)`: `L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map)` (`TILE_URL` = `'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'` — `MapView` `TILES.light` ile aynı); `L.geoJSON(parcelGeometry)` dolu ArsaBil mavisi + `map.fitBounds`; `neighborhoodGeojson` varsa `L.geoJSON` ince kesikli çizgi dolgu yok.
  - `leaflet/dist/leaflet.css` import.
- `DegerKarti` değişiklikleri:
  - `import { DegerMiniMap } from './DegerMiniMap'` — `<div className={styles.map} data-testid="deger-map" />` yerine:
    `card.neighborhood.geojson ? <DegerMiniMap parcelGeometry={parcel.geometry} neighborhoodGeojson={card.neighborhood.geojson} /> : <div className={styles.map} data-testid="deger-map" />`
  - **Emsal bloğu** — mevcut `!value.insufficientData && (<>divider + üye/anon</>)` bloğunun İÇİNDE, fizibilite link'inden sonra (üye dalı) VE gated overlay'den sonra (anon dalı) DEĞİL — ayrı bir bölüm olarak, `insufficientData` OLSA BİLE gösterilir (emsal `insufficientData`'dan bağımsız). Yani mevcut `{!value.insufficientData && ...}` bloğunun DIŞINA, `disclaimer`'dan ÖNCE yeni bir blok:

```tsx
      {card.comparables.count > 0 ? (
        <div className={styles.emsalBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>Bölgedeki Emsal İlanlar ({card.comparables.count})</div>
          {isMember && card.comparables.items ? (
            <>
              {card.comparables.items.map((c, i) => (
                <div key={i} className={styles.emsalRow}>
                  <strong>{c.pricePerSqm != null ? `${c.pricePerSqm.toLocaleString('tr-TR')} ₺/m²` : '—'}</strong>
                  {c.areaSqm != null && <span> · {c.areaSqm.toLocaleString('tr-TR')} m²</span>}
                  {c.price != null && <span> · {c.price.toLocaleString('tr-TR')} ₺</span>}
                  <span> · {c.approxDistance ? '~' : ''}{(c.distanceM / 1000).toFixed(1).replace('.', ',')} km</span>
                  {c.listedAt && <span> · {new Date(c.listedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>}
                  {' '}
                  <a href={c.sourceUrl} target="_blank" rel="noopener nofollow" className={styles.emsalLink}>Emlakjet ↗</a>
                </div>
              ))}
              <button type="button" className={styles.mapToggle} onClick={() => setShowMap(true)}>
                Emsalları haritada gör →
              </button>
            </>
          ) : (
            <div className={styles.gatedWrap}>
              <div className={styles.blurred} aria-hidden="true">
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
                <div className={styles.emsalRow}><strong>•••• ₺/m²</strong> · •••• m² · •••• km</div>
              </div>
              <div className={styles.overlay}>
                <strong>{card.comparables.count} emsal ilan</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`} className={styles.cta}>Üye Ol</Link>
              </div>
            </div>
          )}
        </div>
      ) : isMember ? (
        <p className={styles.sub}>Bu bölgede aktif emsal ilan bulunamadı.</p>
      ) : null}

      {showMap && isMember && card.comparables.items && card.comparables.items.length > 0 && (
        <EmsalMapLazy
          parcelGeometry={parcel.geometry}
          neighborhoodGeojson={card.neighborhood.geojson}
          comparables={card.comparables.items}
          center={
            polygonCentroid(parcel.geometry) ?? {
              lat: card.comparables.items[0].lat,
              lng: card.comparables.items[0].lng,
            }
          }
          onClose={() => setShowMap(false)}
        />
      )}
```

Import: `import { polygonCentroid } from '@/lib/geo/polygonCentroid'`.

  - `isMember` = `isLoggedIn` (mevcut prop; alt-proje 2'nin `card.value.tier === 'member'` kuralıyla page zaten hizalı geçiyor — yeni prop gerekmez).
  - `const [showMap, setShowMap] = useState(false)` — bileşen `'use client'` DEĞİL şu an; **`'use client'` ekle** (useState + lazy import için). Alt-proje 2'de server component'ti; bu değişiklik `/deger/page.tsx` zaten client olduğu için sorun değil, ama `DegerKarti`'yi import eden başka server yer YOK (grep ile doğrula).
  - `EmsalMapLazy` = `const EmsalMapLazy = dynamic(() => import('./EmsalMap').then(m => m.EmsalMap), { ssr: false })` (`next/dynamic`).
  - **`center` notu:** `EmsalMap`'e parselin merkez koordinatı lazım. `card.ts` DTO'suna `parcel` içine bir `center: { lat, lng } | null` eklemek EN TEMİZ olur — ama Task 6 kapsamında değildi. **Ruling gerekebilir:** implementer `parcel.geometry`'den `polygonCentroid` (`@/lib/geo/polygonCentroid`) ile client-side türetsin (zaten DegerMiniMap de fitBounds yapıyor, merkez kritik değil — `EmsalMap` `fitBounds` ile parsel+pinleri çerçeveler). `center` prop'unu `polygonCentroid(parcelGeometry) ?? { lat: comparables[0].lat, lng: comparables[0].lng }` yap.
  - `.soon` satırı: `Yakında (üyelere): Fiyat trendi · Uzman görüşü` ("Emsal ilanlar" çıkarıldı).

- [ ] **Step 1: Failing test — `DegerMiniMap.test.tsx`**

`/** @jest-environment jsdom */` + `useLeafletMap` mock (proje deseni — `MiniMap.test.tsx`'e bak):

```tsx
/** @jest-environment jsdom */
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

const onReadyCalls: Array<(map: unknown, L: unknown) => void> = []
jest.mock('@/lib/hooks/useLeafletMap', () => ({
  useLeafletMap: (_ref: unknown, opts: { onReady?: (m: unknown, l: unknown) => void }) => {
    if (opts.onReady) onReadyCalls.push(opts.onReady)
    return { mapRef: { current: null }, mapReady: false, LRef: { current: null } }
  },
}))
import { DegerMiniMap } from './DegerMiniMap'

const geoJSON = jest.fn(() => ({ addTo: jest.fn(), getBounds: () => ({}) }))
const fakeL = { tileLayer: jest.fn(() => ({ addTo: jest.fn() })), geoJSON }
const fakeMap = { fitBounds: jest.fn() }

beforeEach(() => { onReadyCalls.length = 0; geoJSON.mockClear() })

it('parsel + mahalle sınırı katmanı ekler', () => {
  render(<DegerMiniMap parcelGeometry={{ type: 'Polygon', coordinates: [[[39.7, 41], [39.71, 41], [39.71, 41.01], [39.7, 41]]] }} neighborhoodGeojson={{ type: 'MultiPolygon', coordinates: [] }} />)
  onReadyCalls[0](fakeMap, fakeL)
  expect(fakeL.tileLayer).toHaveBeenCalled()
  expect(geoJSON).toHaveBeenCalledTimes(2) // parsel + sınır
})

it('neighborhoodGeojson null → sadece parsel katmanı', () => {
  render(<DegerMiniMap parcelGeometry={{ type: 'Polygon', coordinates: [[[39.7, 41]]] }} neighborhoodGeojson={null} />)
  onReadyCalls[0](fakeMap, fakeL)
  expect(geoJSON).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: RED doğrula** — `npx jest src/components/deger/DegerMiniMap.test.tsx` → FAIL.

- [ ] **Step 3: `DegerMiniMap.tsx` + css yaz** (MiniMap.tsx desenini izle; `.module.css` düz sınıf, `composes` YOK).

- [ ] **Step 4: GREEN** — `npx jest src/components/deger/DegerMiniMap.test.tsx` → PASS (2).

- [ ] **Step 5: `DegerKarti.test.tsx` yeni testler** — mevcut `baseCard` fixture'ına `neighborhood: { geojson: null }` + `comparables: { count: 0 }` ekle (mevcut testler kırılmasın). Yeni:

```tsx
// DegerMiniMap'i mock'la ki DegerKarti testi leaflet'e girmesin
jest.mock('./DegerMiniMap', () => ({ DegerMiniMap: () => <div data-testid="mini-map" /> }))
jest.mock('next/dynamic', () => () => () => <div data-testid="emsal-map" />)

it('üye: emsal listesi render (₺/m², link, ~ approx)', () => {
  const card = { ...baseCard, comparables: { count: 2, items: [
    { pricePerSqm: 2500, areaSqm: 480, price: 1200000, distanceM: 1200, approxDistance: true, lat: 41, lng: 39.7, listedAt: new Date('2026-08-21'), source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' },
  ] } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Bölgedeki Emsal İlanlar \(2\)/)).toBeInTheDocument()
  expect(screen.getByText(/2\.500 ₺\/m²/)).toBeInTheDocument()
  expect(screen.getByText(/~1,2 km/)).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /Emlakjet/ })
  expect(link).toHaveAttribute('href', 'https://emlakjet.com/ilan/c1')
  expect(link).toHaveAttribute('rel', 'noopener nofollow')
})

it('anonim: emsal bulanık + count teaser, liste yok', () => {
  const card = { ...baseCard, comparables: { count: 5 } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/5 emsal ilan/)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Emlakjet/ })).not.toBeInTheDocument()
})

it('üye + count 0 → "bulunamadı" mesajı', () => {
  render(<DegerKarti card={{ ...baseCard, comparables: { count: 0 } }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/aktif emsal ilan bulunamadı/i)).toBeInTheDocument()
})

it('neighborhood.geojson varsa mini-harita render', () => {
  render(<DegerKarti card={{ ...baseCard, neighborhood: { geojson: { type: 'MultiPolygon', coordinates: [] } } }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByTestId('mini-map')).toBeInTheDocument()
})

it('"haritada gör" → EmsalMap lazy mount', () => {
  const card = { ...baseCard, comparables: { count: 1, items: [{ pricePerSqm: 2500, areaSqm: 480, price: 1200000, distanceM: 900, approxDistance: true, lat: 41, lng: 39.7, listedAt: null, source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' }] } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  fireEvent.click(screen.getByRole('button', { name: /haritada gör/i }))
  expect(screen.getByTestId('emsal-map')).toBeInTheDocument()
})

it('".soon" artık "Emsal ilanlar" içermiyor', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Yakında/)).not.toHaveTextContent('Emsal ilanlar')
})
```

- [ ] **Step 6: RED doğrula** — `npx jest src/components/deger/DegerKarti.test.tsx` → yeni testler FAIL.

- [ ] **Step 7: `DegerKarti.tsx` + css implementasyon** (yukarıdaki Interfaces bloğundaki JSX). `'use client'` ekle. Grep: `grep -rn "DegerKarti" src --include=*.tsx | grep -v test` → yalnız `src/app/deger/page.tsx` (client) tüketiyor mu doğrula; başka server tüketici varsa BLOCKED raporla.

- [ ] **Step 8: GREEN + regresyon + build**

Run: `npx jest src/components/deger/` → tüm deger bileşen testleri.
Run: `npx tsc --noEmit` → temiz.
Run: `npm run build` → "✓ Compiled successfully", `/deger` hâlâ build oluyor.

- [ ] **Step 9: Commit**

```bash
git add src/components/deger/DegerMiniMap.tsx src/components/deger/DegerMiniMap.module.css src/components/deger/DegerMiniMap.test.tsx src/components/deger/DegerKarti.tsx src/components/deger/DegerKarti.module.css src/components/deger/DegerKarti.test.tsx
git commit -m "feat(emsal): DegerKarti emsal listesi + statik mini-harita"
```

---

## Task 9: `EmsalMap` — tam etkileşimli harita

**Files:**
- Create: `src/components/deger/EmsalMap.tsx`, `EmsalMap.module.css`, `EmsalMap.test.tsx`

**Interfaces:**
- `export function EmsalMap(props: { parcelGeometry: unknown; neighborhoodGeojson: unknown | null; comparables: Comparable[]; center: { lat: number; lng: number }; onClose: () => void }): JSX.Element`
  - `'use client'`. `useLeafletMap` — tam etkileşimli (varsayılan opsiyonlar).
  - `leaflet/dist/leaflet.css` + `leaflet.markercluster/dist/MarkerCluster.css` + `MarkerCluster.Default.css` import.
  - `onReady(map, L)`:
    - `L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO', maxZoom: 19 }).addTo(map)`
    - parsel: `const pj = L.geoJSON(parcelGeometry, { style: { color: '#0a5cff', weight: 2, fillOpacity: 0.15 } }).addTo(map)`
    - `neighborhoodGeojson` varsa: `L.geoJSON(neighborhoodGeojson, { style: { color: '#6e6e73', weight: 1, dashArray: '4 3', fill: false } }).addTo(map)`
    - `await import('leaflet.markercluster')` sonra `const cluster = (L as any).markerClusterGroup()` (bkz. `MapView.tsx:186-190` — aynı eslint-disable yorumu); her `comparables` için `L.marker([c.lat, c.lng]).bindPopup(popupHtml(c))`; `cluster.addLayer(...)`; `cluster.addTo(map)`. `approxDistance` pinleri `L.marker(..., { opacity: 0.6 })`.
    - `map.fitBounds` — parsel + tüm pinleri kapsayan bounds (`L.featureGroup([pj, cluster]).getBounds()` veya elle).
  - Kapat butonu (`className={styles.close}`, `aria-label="Kapat"`) → `onClose()`.
  - Container `div ref` + `styles.container` (yükseklik ~360px).
  - **`popupHtml(c)`** yardımcısı: `` `<b>${c.pricePerSqm?.toLocaleString('tr-TR') ?? '—'} ₺/m²</b><br>${c.areaSqm ?? '—'} m²<br>${c.approxDistance ? '~ yaklaşık konum (mahalle)' : ''}<br><a href="${c.sourceUrl}" target="_blank" rel="noopener nofollow">Emlakjet ↗</a>` `` (string; Leaflet popup HTML kabul eder).

- [ ] **Step 1: Failing test — `EmsalMap.test.tsx`**

`/** @jest-environment jsdom */`, `useLeafletMap` mock (Task 8 deseni), `L` mock:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const onReadyCalls: Array<(m: unknown, l: unknown) => void | Promise<void>> = []
jest.mock('@/lib/hooks/useLeafletMap', () => ({
  useLeafletMap: (_r: unknown, o: { onReady?: (m: unknown, l: unknown) => void }) => {
    if (o.onReady) onReadyCalls.push(o.onReady)
    return { mapRef: { current: null }, mapReady: false, LRef: { current: null } }
  },
}))
jest.mock('leaflet.markercluster', () => ({}))
import { EmsalMap } from './EmsalMap'

const layer = () => ({ addTo: jest.fn().mockReturnThis(), addLayer: jest.fn(), bindPopup: jest.fn().mockReturnThis(), getBounds: () => ({}) })
const L = {
  tileLayer: jest.fn(layer), geoJSON: jest.fn(layer), marker: jest.fn(layer),
  markerClusterGroup: jest.fn(layer), featureGroup: jest.fn(layer),
}
const map = { fitBounds: jest.fn() }
const CMP = [
  { pricePerSqm: 2500, areaSqm: 480, price: 1, distanceM: 900, approxDistance: true, lat: 41.001, lng: 39.7, listedAt: null, source: 'emlakjet', sourceUrl: 'https://emlakjet.com/ilan/c1' },
]

beforeEach(() => { onReadyCalls.length = 0; Object.values(L).forEach((f) => (f as jest.Mock).mockClear?.()) })

it('parsel + sınır + cluster katmanları ekler', async () => {
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={{ type: 'MultiPolygon', coordinates: [] }} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={jest.fn()} />)
  await onReadyCalls[0](map, L)
  expect(L.tileLayer).toHaveBeenCalled()
  expect(L.geoJSON).toHaveBeenCalledTimes(2) // parsel + sınır
  expect(L.markerClusterGroup).toHaveBeenCalled()
  expect(L.marker).toHaveBeenCalledTimes(1)
})

it('neighborhoodGeojson null → sınır katmanı eklenmez', async () => {
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={null} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={jest.fn()} />)
  await onReadyCalls[0](map, L)
  expect(L.geoJSON).toHaveBeenCalledTimes(1)
})

it('kapat butonu onClose çağırır', () => {
  const onClose = jest.fn()
  render(<EmsalMap parcelGeometry={{ type: 'Polygon', coordinates: [] }} neighborhoodGeojson={null} comparables={CMP} center={{ lat: 41, lng: 39.7 }} onClose={onClose} />)
  fireEvent.click(screen.getByLabelText('Kapat'))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: RED doğrula** — `npx jest src/components/deger/EmsalMap.test.tsx` → FAIL.

- [ ] **Step 3: `EmsalMap.tsx` + css yaz** (Interfaces bloğu; `MapView.tsx` markercluster desenini birebir izle; `.module.css` düz sınıf `composes` YOK).

- [ ] **Step 4: GREEN + build**

Run: `npx jest src/components/deger/EmsalMap.test.tsx` → PASS (3).
Run: `npx tsc --noEmit` → temiz.
Run: `npm run build` → "✓ Compiled successfully" (Leaflet CSS + markercluster CSS import + dinamik import chunk sorunsuz).

- [ ] **Step 5: Commit**

```bash
git add src/components/deger/EmsalMap.tsx src/components/deger/EmsalMap.module.css src/components/deger/EmsalMap.test.tsx
git commit -m "feat(emsal): EmsalMap tam etkileşimli harita (dinamik import)"
```

---

## Final Doğrulama (tüm task'lar bitince)

- [ ] `npx jest --roots "$(pwd)/src"` → tüm suite yeşil
- [ ] `npm run test:crawler` → yeşil; `npx tsc -p crawler` → temiz
- [ ] `npx tsc --noEmit` → temiz
- [ ] `npm run build` → başarılı, `/deger` + `/` build oluyor
- [ ] `npx prisma migrate status` → temiz
- [ ] **Elle uçtan uca (dev):** `npm run dev`, `arsabil_postgres_dev` ayakta. **Not:** `Neighborhood` tablosu boş (mevcut 450 satır crawler-öncesi) → `/deger`'de emsal listesi gelir ama mini-harita sınırı boş kalır. Gerçek sınır + tazelenmiş emsal için "Canlı Doğrulama" adımı gerekir.

---

## Canlı Doğrulama (AYRI operasyon adımı — plan sonu, kullanıcı onayıyla, SDD DIŞI)

1. `npm run crawl -- --portal=emlakjet --il=trabzon --category=arsa --max-pages=25`
   - `MarketListing` tazelenir + `Neighborhood` dolar
   - `--max-pages` gerçek sayfa sayısını aşarsa `complete=true` → **delisting yolu ilk kez test edilir** (alt-proje 1'in açık doğrulaması)
2. `npm run prices:aggregate` (re-run)
3. `/deger`'de gerçek Trabzon parseliyle (ör. Ortahisar/Uğurlu ada/parsel): emsal listesi (giriş yaparak), mini-harita sınırı, "haritada gör" → `EmsalMap`. `curl` ile `/deger` SSR + Playwright ile etkileşim.
4. `CrawlRun` satırını incele — `complete`, `delisted`, `blocked` sayıları.

---

## Notlar / bilinen v1 kalıntıları

- Emsal pinleri mahalle centroid'inde (`approxDistance: true`) — hassas koordinat Sahibinden/proxy alt-projesinde.
- `Neighborhood` yalnız Emlakjet'in geometri verdiği mahallelerde dolar; vermeyende mini-harita sınırı boş.
- `emlakjetRiskScore` saklanıyor ama kullanıcıya gösterilmiyor (bizim TBDY motoru otoriter).
- `EmsalMap` `center` prop'u `polygonCentroid` ile client-side türetiliyor (DTO'ya `parcel.center` eklenmedi — Task 6 kapsamı dışıydı).
- Marketplace haritası dokunulmadı.
