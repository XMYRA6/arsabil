# Final Fix Wave — Emsal İlan + Harita Katmanı

Branch: `sdd/emsal-ilan-harita`  ·  Base HEAD: `87bf763`  ·  Commit range: `670513b..3977e89`

## Verification summary (all green)

| Check | Result |
|---|---|
| Targeted deger suites (`src/lib/deger src/lib/areaPrices src/components/deger src/app/deger src/app/api/deger`) | 11 suites / 92 tests pass |
| Full app suite (`npx jest --silent --roots <cwd>/src`) | **253 suites / 1848 tests pass** (was 253 / 1840 → +8) |
| Crawler (`crawler && npx jest --config jest.config.js --testMatch "**/__tests__/**/*.test.ts"`) | **11 suites / 79 tests pass** (was 77 → +2) |
| `npx tsc --noEmit` (app) | clean |
| `npx tsc -p crawler --noEmit` | clean |
| `npm run build` | `✓ Compiled successfully in 37.8s`; `/deger` = `○ (Static)` |
| DB dotted-İ evidence | `SELECT DISTINCT ilce FROM "MarketListing" …` → `ORTAHİSAR`, `VAKFIKEBİR`, `AKÇAABAT`, `MAÇKA`, `DÜZKÖY` … (dotted İ confirmed); `il` → `TRABZON` |

---

## C1 — `findListingsNear` queried `MarketListing` in the wrong key space

**Changed:** `src/app/api/deger/kart/route.ts` — `findListingsNear` (~line 74-100).
- Removed `il` / `ilce` from the Prisma `where` (they were SQL-equality filtered against `normalizeAreaName`-folded keys, e.g. `'ORTAHISAR'` dotless I, while rows store the crawler's `cleanTrName` tr-upper form `'ORTAHİSAR'` dotted İ → never matched for any il/ilçe containing i/İ).
- `where` now: `status:'active'`, `lat/lng not null`, `listingType in ARSA_LISTING_TYPES`.
- Added `select: { …, il: true, ilce: true }`, `orderBy: [{ listedAt:'desc' },{ id:'asc' }]`, `take: 2000`.
- Post-query `.filter(r => normalizeAreaName(r.il) === il && normalizeAreaName(r.ilce) === ilce)` — folds both sides.
- Added `import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'`.

**Tests:** `src/app/api/deger/kart/__tests__/route.test.ts`
- Rewrote `findListingsNear aktif + koordinatlı + arsa filtresiyle sorgular` → now asserts `where` has NO `il` / `ilce` keys, still `status:'active'` + lat/lng/listingType filters.
- New `C1 — findListingsNear crawler tr-upper anahtarını (noktalı İ) katlanmış anahtarla eşler`: pins `normalizeAreaName('ORTAHİSAR') === normalizeAreaName('Ortahisar')` AND `'ORTAHİSAR' !== normalizeAreaName('Ortahisar')`; mocks `prisma.marketListing.findMany` to return rows with `ilce:'ORTAHİSAR'` (dotted, as stored) + `ilce:'AKÇAABAT'`; asserts `findListingsNear('TRABZON','ORTAHISAR')` (folded, as card.ts passes) returns only the `ORTAHİSAR` row.
- Added `import { normalizeAreaName }` to the test.

**Output:** `src/app/api/deger` — 14 tests pass (was 13).

## I1 + I2 — non-deterministic top-8 + unbounded scan

**Changed:**
- `route.ts` — `orderBy` + `take: 2000` (same edit as C1).
- `src/lib/deger/comparables.ts` — `selectComparables` sort: `passed.sort((a,b) => a.distanceM - b.distanceM || dateVal(b.listedAt) - dateVal(a.listedAt))` with local `const dateVal = (d: string | null) => (d ? new Date(d).getTime() : 0)`.

**Test:** `src/lib/deger/comparables.test.ts` — new `I1/I2 — eşit mesafede yeni ilan önce sıralanır (deterministik top-N)`: two listings at identical lat/lng, `listedAt` 2026-01-01 vs 2026-08-01 → asserts equal `distanceM` and `items[0].listedAt === '2026-08-01T00:00:00.000Z'`.

**Output:** `src/lib/deger` suites pass.

## M1 — `Comparable.listedAt` type lied (Date on paper, string on the wire)

**Changed:** `src/lib/deger/comparables.ts`
- `Comparable.listedAt: Date | null` → `string | null` (DTO-facing; `NextResponse.json` serializes to ISO string).
- `selectComparables` now emits `l.listedAt ? l.listedAt.toISOString() : null` (input `ComparableListing.listedAt` stays `Date | null` from Prisma).
- `DegerCardDTO.comparables.items` inherits the corrected shape via `Comparable[]` — no change in `card.ts`.
- `src/components/deger/DegerKarti.tsx` keeps its harmless `new Date(c.listedAt)` wrap (works on a string).

**Tests:**
- `comparables.test.ts` — new `listedAt DTO için ISO string olarak çıkar (M1)` and `listedAt null olan ilan → çıktıda null`.
- `src/components/deger/DegerKarti.test.tsx` — fixture `listedAt: new Date('2026-08-21')` → `'2026-08-21T00:00:00.000Z'`.

**Output:** `src/components/deger` — 21 tests pass; `src/lib/deger` pass.

## M2 — `EmsalMap` dropped MapView's markercluster guard

**Changed:** `src/components/deger/EmsalMap.tsx`
- `await import('leaflet.markercluster')` wrapped in `try { … } catch { /* optional */ }`.
- `const cluster = (L as any).markerClusterGroup ? (L as any).markerClusterGroup() : (L as any).layerGroup()` — mirrors `MapView.tsx`.

**Test:** `EmsalMap.test.tsx` — added `layerGroup` to mock `L`; new `markerClusterGroup yoksa layerGroup fallback — marker yine eklenir (M2)` (invokes `onReady` with an `L` missing `markerClusterGroup`, asserts `layerGroup` called + marker still added). Existing happy-path `markerClusterGroup` assertion unchanged.

## M3 — unguarded boundary `L.geoJSON` could blank the whole map

**Changed:**
- `src/components/deger/DegerMiniMap.tsx` — `L.geoJSON(neighborhoodGeojson, …).addTo(map)` wrapped in `try/catch` (`console.error` + continue).
- `src/components/deger/EmsalMap.tsx` — same for its `neighborhoodGeojson` `L.geoJSON` call.
- Parcel-layer `L.geoJSON` left unguarded (parcel geometry is TKGM-validated `GeoJSONPolygon`; a throw there is a real error, and `fitBounds` is already guarded).

**Tests:**
- `DegerMiniMap.test.tsx` — new `bozuk neighborhoodGeojson → atılmaz, parsel katmanı yine eklenir (M3)`: `neighborhoodGeojson = { type:'MultiPolygon' }` (no `coordinates`), mock `geoJSON` throws for that shape → component's `onReady` does not throw, `geoJSON` still called twice (boundary throws, parcel drawn). `console.error` spied/silenced.
- `EmsalMap.test.tsx` — analogous `bozuk neighborhoodGeojson → atılmaz, parsel katmanı yine eklenir (M3)` (async `onReady`, `markerClusterGroup` still reached).

## M4 — `parcelGeometry: unknown` → `GeoJSONPolygon`

**Changed:** `src/components/deger/DegerMiniMap.tsx` + `src/components/deger/EmsalMap.tsx`
- Prop type `parcelGeometry: unknown` → `GeoJSONPolygon` (`import type { GeoJSONPolygon } from '@/lib/tkgm/parcel'`).
- `DegerMiniMap`: dropped the `polygonCentroid(parcelGeometry as Parameters<…>)` cast — `GeoJSONPolygon` is structurally assignable to `polygonCentroid`'s `GeoJSONGeometryLike` param.
- Leaflet `L.geoJSON(parcelGeometry as Parameters<typeof L.geoJSON>[0], …)` casts kept (Leaflet's `geoJSON` first-arg type is stricter than a bare polygon literal).
- `DegerKarti` already passes `parcel.geometry` (`GeoJSONPolygon`) — no change; tsc clean.

## M6 — Neighborhood upserts invisible in `CrawlRun`

**Changed:** `crawler/run.ts`
- `RunSummary` +`neighborhoodUpserted: number` +`neighborhoodFailed: number`; both `0` in the `summary` init.
- Detail-loop `upsertNeighborhood` block: `summary.neighborhoodUpserted++` after success, `summary.neighborhoodFailed++` in the existing `catch` (still logs + continues, never blocks the listing flow / delist evaluation).
- `notes` string (near `crawlRun.update`) appends `neighborhoodUpserted=.. neighborhoodFailed=..`.

**Tests:** `crawler/__tests__/run.pipeline.test.ts`
- `fakeClient` gained a `neighborhood.upsert` stub (spy counter + optional `{ neighborhoodThrows }` to force a throw).
- New `M6: neighborhoodGeojson taşıyan ilan → neighborhoodUpserted=1, CrawlRun notes'a yazılır` — adapter yields a detail with `neighborhoodGeojson` → `summary.neighborhoodUpserted === 1`, `neighborhoodFailed === 0`, `spy.crawlRunUpdate.notes` matches `/neighborhoodUpserted=1 neighborhoodFailed=0/`.
- New `M6: upsertNeighborhood fırlatırsa neighborhoodFailed=1, tur tamamlanır, delist yine değerlendirilir` — `neighborhoodThrows: true` + one stale seeded row → `neighborhoodFailed === 1`, `neighborhoodUpserted === 0`, `complete === true`, `failed === 0`, `spy.delistFindMany === 1`, `delisted === 1`, stale row `status === 'delisted'`.

**Output:** `crawler` — 11 suites / 79 tests pass (was 77).

## T6 — emsal independent of `insufficientData`

**Changed:** none (test only).

**Test:** `src/lib/deger/card.test.ts` — new `T6 — emsal + sınır, değerleme verisinden BAĞIMSIZ (insufficientData olsa bile)`: `findAreaStats` → `[]` (`insufficientData: true`), default `findListingsNear` returns a comparable, `findNeighborhood` returns geojson, `memberView: true` → asserts `value.insufficientData === true`, `comparables.count > 0`, `comparables.items` present with length > 0, `neighborhood.geojson` present.

---

## Commands run (captured)

```
$ docker exec arsabil_postgres_dev psql -U arsabil -d arsabil_dev -tc \
  "SELECT DISTINCT ilce FROM \"MarketListing\" WHERE ilce IS NOT NULL LIMIT 10;"
 MAÇKA / DÜZKÖY / YOMRA / ÇAYKARA / ARAKLI / KÖPRÜBAŞI / AKÇAABAT / OF / ORTAHİSAR / VAKFIKEBİR
$ … DISTINCT il … →  TRABZON

$ npx jest src/lib/deger src/lib/areaPrices src/components/deger src/app/deger src/app/api/deger
Test Suites: 11 passed, 11 total   Tests: 92 passed, 92 total

$ cd crawler && npx jest --config jest.config.js --testMatch "**/__tests__/**/*.test.ts"
Test Suites: 11 passed, 11 total   Tests: 79 passed, 79 total

$ npx tsc --noEmit            → (clean, no output)
$ npx tsc -p crawler --noEmit → (clean, no output)

$ npx jest --silent --roots "$(pwd)/src"
Test Suites: 253 passed, 253 total   Tests: 1848 passed, 1848 total

$ npm run build
✓ Compiled successfully in 37.8s
Route (app)  …  ○ /deger  (Static)
```

## Commits

| SHA | Title |
|---|---|
| `670513b` | fix(emsal): findListingsNear anahtar-uzayı uyuşmazlığı + deterministik sınırlı tarama (C1/I1/I2) |
| `435f43b` | fix(emsal): selectComparables recency tie-break + listedAt DTO tipini düzelt (I1/I2/M1) |
| `ab0b68b` | fix(emsal): harita bileşenleri sağlamlaştırma — markercluster guard, sınır try/catch, GeoJSONPolygon tipi (M2/M3/M4) |
| `32d0551` | fix(emsal): CrawlRun'da mahalle sınır upsert sayaçları görünür (M6) |
| `3977e89` | fix(emsal): emsal + sınır değerleme verisinden bağımsız — regresyon testi (T6) |

All findings fully addressed. No open concerns.
