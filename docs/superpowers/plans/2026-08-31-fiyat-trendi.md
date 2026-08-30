# Bölge Fiyat Trendi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DegerKarti`'nin "Fiyat trendi" placeholder'ını bir bölge ₺/m² zaman serisi grafiğiyle (üye-gated) doldurmak; `AreaPriceTrend` önhesap tablosu + `npm run prices:trend`.

**Architecture:** Yeni `AreaPriceTrend` tablosu (`AreaPriceStat` deseniyle simetrik): il/ilçe/mahalle × aylık kova, medyan ₺/m² + örneklem sayısı. Saf `trendAggregate.ts` `MarketListing`'i `listedAt` ayına gruplar; saf `priceTrend.ts` bir alan için son 12 ayı + "son 3 ay %X" değişimini fallback (mahalle→ilçe→il) ile üretir. `buildDegerCard` bunu DI ile çekip DTO'ya **yalnız üye görünümünde** ekler. `PriceTrendChart` (`react-chartjs-2` `Line`) `DegerKarti` üye bölümünde render eder.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma + PostgreSQL, Jest + ts-jest (`testEnvironment: 'node'`; RTL testleri dosya başında `/** @jest-environment jsdom */`), React Testing Library, chart.js + react-chartjs-2 (mevcut — `CostBreakdownChart`/`RiskGaugeChart` `Doughnut` kullanıyor; bu ilk `Line`).

**Spec:** `docs/superpowers/specs/2026-08-31-fiyat-trendi-design.md`

## Global Constraints

- **`normalizeAreaName`** (`src/lib/areaPrices/normalizeAreaName.ts`) `AreaPriceTrend` anahtarları için — `AreaPriceStat` ile aynı key-space (SQL eşitliği güvenli, C1 tuzağı yalnız ham `MarketListing`'deydi).
- **`ARSA_LISTING_TYPES`** (`@/lib/areaPrices/aggregate`) — trend filtresinde de.
- **`stats.ts` `median`** yeniden kullanılır — yeni medyan implementasyonu YOK.
- **`composes` YASAK** yeni CSS modüllerinde.
- **Migration** elle yazılan SQL (proje deseni).
- **Üye-gate:** `priceTrend` DTO alanı yalnız `opts.memberView && !insufficientTrend` → eklenir; anonim payload'da HİÇ yok (yapısal — emsal `items` / `comparables` deseni). `card.value` şeması + mevcut paywall `Object.keys(res.card.value)` testi DEĞİŞMEZ (trend `card.priceTrend`'de).
- **`prices:aggregate` / `AreaPriceStat` / `aggregate.ts` / `valuation.ts` DOKUNULMAZ** — yeni `prices:trend` ayrı script (alt-proje 2 kontratı korunur).
- **`trendAggregate` status filtresi `('active','delisted')`** — `aggregate.ts`'in `status === 'active'` filtresinden FARKLI (delisted ilan geçmiş fiyat sinyali). `aggregate.ts`'i yeniden kullanma.
- Her task: `npx tsc --noEmit` temiz + scoped jest. Task 7/8 + final: `npm run build`.

---

## Dosya Yapısı

| Dosya | Create/Modify | Sorumluluk |
|---|---|---|
| `prisma/schema.prisma` | Modify | `AreaPriceTrend` modeli |
| `prisma/migrations/20260831120000_add_area_price_trend/migration.sql` | Create | Elle SQL |
| `src/lib/areaPrices/trendAggregate.ts` (+ `.test.ts`) | Create | `MarketListing` → aylık kova × alan |
| `scripts/aggregate-trend.ts` | Create | Wiring: Prisma oku → `trendAggregate` → `AreaPriceTrend` upsert |
| `package.json` | Modify | `"prices:trend"` script |
| `src/lib/deger/priceTrend.ts` (+ `.test.ts`) | Create | Trend satırları → `PriceTrendResult` |
| `src/lib/deger/card.ts` (+ `card.test.ts`) | Modify | `findAreaTrend` DI + `priceTrend` DTO (üye-only) |
| `src/app/api/deger/kart/route.ts` (+ `__tests__/route.test.ts`) | Modify | `findAreaTrend` inline DI sorgusu |
| `src/components/charts/PriceTrendChart.tsx` (+ `.test.tsx`) | Create | `react-chartjs-2` `Line` + "son 3 ay %X" özeti |
| `src/components/deger/DegerKarti.tsx` (+ `.test.tsx`, `.module.css`) | Modify | üye bölümüne trend bloğu; `.soon` güncelle |

---

## Task 1: `AreaPriceTrend` modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (yeni model — `AreaPriceStat` / `Neighborhood` yakınına)
- Create: `prisma/migrations/20260831120000_add_area_price_trend/migration.sql`
- Test: yok (şema; doğrulama `prisma migrate` + `tsc`)

**Interfaces:**
- Produces: Prisma `AreaPriceTrend` — `il: string`, `ilce: string | null`, `mahalle: string | null`, `scope: string`, `monthBucket: Date`, `medianPricePerSqm: number`, `sampleCount: number`, `computedAt: Date`. Unique: `[il, ilce, mahalle, monthBucket]`.

- [ ] **Step 1: Şemaya modeli ekle**

`prisma/schema.prisma`, `AreaPriceStat` modelinin ardına:

```prisma
model AreaPriceTrend {
  id                String   @id @default(cuid())
  il                String
  ilce              String?
  mahalle           String?
  scope             String
  monthBucket       DateTime
  medianPricePerSqm Float
  sampleCount       Int
  computedAt        DateTime

  @@unique([il, ilce, mahalle, monthBucket])
  @@index([il, ilce, mahalle])
}
```

- [ ] **Step 2: Migration SQL**

`prisma/migrations/20260831120000_add_area_price_trend/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AreaPriceTrend" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT,
    "mahalle" TEXT,
    "scope" TEXT NOT NULL,
    "monthBucket" TIMESTAMP(3) NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaPriceTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaPriceTrend_il_ilce_mahalle_monthBucket_key" ON "AreaPriceTrend"("il", "ilce", "mahalle", "monthBucket");

-- CreateIndex
CREATE INDEX "AreaPriceTrend_il_ilce_mahalle_idx" ON "AreaPriceTrend"("il", "ilce", "mahalle");
```

- [ ] **Step 3: Uygula + generate**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `AreaPriceTrend` tablosu oluşur. (Dev DB `arsabil_postgres_dev` ayakta olmalı.)

- [ ] **Step 4: Doğrula**

Run: `npx prisma migrate status` (temiz) + `npx tsc --noEmit` (temiz). Çıktıları rapora ekle.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260831120000_add_area_price_trend
git commit -m "feat(trend): AreaPriceTrend modeli + migration"
```

---

## Task 2: `trendAggregate.ts` — aylık kova × alan (saf)

**Files:**
- Create: `src/lib/areaPrices/trendAggregate.ts`
- Test: `src/lib/areaPrices/trendAggregate.test.ts`

**Interfaces:**
- Consumes: `median` from `./stats`; `normalizeAreaName` from `./normalizeAreaName`; `ARSA_LISTING_TYPES` from `./aggregate`.
- Produces:
  - `export interface TrendInputRow { listingType: string; pricePerSqm: number | null; status: string; il: string | null; ilce: string | null; mahalle: string | null; listedAt: Date | null }`
  - `export interface AreaPriceTrendRow { il: string; ilce: string | null; mahalle: string | null; scope: 'il' | 'ilce' | 'mahalle'; monthBucket: Date; medianPricePerSqm: number; sampleCount: number }`
  - `export function aggregateTrend(rows: TrendInputRow[]): AreaPriceTrendRow[]`
- Kurallar:
  - Filtre: `status === 'active' || status === 'delisted'`; `listingType ∈ ARSA_LISTING_TYPES`; `pricePerSqm` sonlu ve `> 0`; `listedAt` bir `Date` ve geçerli; `il` dolu.
  - Ay kovası: `monthBucket = new Date(Date.UTC(listedAt.getUTCFullYear(), listedAt.getUTCMonth(), 1))`.
  - Grupla: `(il, monthBucket)`, `(il, ilce, monthBucket)`, `(il, ilce, mahalle, monthBucket)` — bir satır tüm uygulanabilir seviyelere katkı (`aggregate.ts` deseni).
  - Grup `sampleCount < 3` → yazılmaz (`MIN_SAMPLE = 3`).
  - il/ilçe/mahalle çıktıda `normalizeAreaName`.

- [ ] **Step 1: Failing test**

`src/lib/areaPrices/trendAggregate.test.ts`:

```ts
import { aggregateTrend, type TrendInputRow } from './trendAggregate'

const D = (iso: string) => new Date(iso)

function row(over: Partial<TrendInputRow>): TrendInputRow {
  return {
    listingType: 'arsa', pricePerSqm: 1000, status: 'active',
    il: 'trabzon', ilce: 'ortahisar', mahalle: 'uğurlu',
    listedAt: D('2026-06-15T00:00:00Z'),
    ...over,
  }
}

describe('aggregateTrend', () => {
  it('aynı ay 3+ ilan → mahalle+ilçe+il satırı, monthBucket ayın 1i (UTC)', () => {
    const out = aggregateTrend([
      row({ pricePerSqm: 1000 }), row({ pricePerSqm: 2000 }), row({ pricePerSqm: 3000 }),
    ])
    const mah = out.find((r) => r.scope === 'mahalle')!
    expect(mah).toMatchObject({
      il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU',
      medianPricePerSqm: 2000, sampleCount: 3,
    })
    expect(mah.monthBucket.toISOString()).toBe('2026-06-01T00:00:00.000Z')
    expect(out.map((r) => r.scope).sort()).toEqual(['il', 'ilce', 'mahalle'])
  })

  it('farklı aylar ayrı kova', () => {
    const rows = [
      ...[1, 2, 3].map(() => row({ listedAt: D('2026-06-10T00:00:00Z'), pricePerSqm: 1000 })),
      ...[1, 2, 3].map(() => row({ listedAt: D('2026-07-10T00:00:00Z'), pricePerSqm: 1500 })),
    ]
    const mah = aggregateTrend(rows).filter((r) => r.scope === 'mahalle')
    expect(mah).toHaveLength(2)
    expect(mah.map((r) => r.monthBucket.toISOString()).sort()).toEqual([
      '2026-06-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z',
    ])
  })

  it('<3 örneklem grubu atlanır', () => {
    expect(aggregateTrend([row({}), row({})])).toEqual([])
  })

  it('delisted DAHİL, başka status hariç', () => {
    const rows = [
      row({ status: 'delisted', pricePerSqm: 100 }),
      row({ status: 'delisted', pricePerSqm: 200 }),
      row({ status: 'delisted', pricePerSqm: 300 }),
      row({ status: 'archived', pricePerSqm: 9999 }),
    ]
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
    expect(mah.medianPricePerSqm).toBe(200)
  })

  it('konut / fiyatsız / listedAt-null / il-null elenir', () => {
    const rows = [
      row({ listingType: 'konut' }),
      row({ pricePerSqm: 0 }),
      row({ listedAt: null }),
      row({ il: null }),
      row({ pricePerSqm: 100 }), row({ pricePerSqm: 200 }), row({ pricePerSqm: 300 }),
    ]
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
  })

  it('ay sınırı: 31 Temmuz 23:59 UTC → Temmuz kovası', () => {
    const rows = [1, 2, 3].map(() => row({ listedAt: D('2026-07-31T23:59:00Z'), pricePerSqm: 500 }))
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.monthBucket.toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: RED** — `npx jest src/lib/areaPrices/trendAggregate.test.ts` → "Cannot find module './trendAggregate'".

- [ ] **Step 3: Implementasyon**

`src/lib/areaPrices/trendAggregate.ts`:

```ts
import { median } from './stats'
import { normalizeAreaName } from './normalizeAreaName'
import { ARSA_LISTING_TYPES } from './aggregate'

export interface TrendInputRow {
  listingType: string
  pricePerSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
  listedAt: Date | null
}

export interface AreaPriceTrendRow {
  il: string
  ilce: string | null
  mahalle: string | null
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}

const MIN_SAMPLE = 3
const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)

function monthKeyOf(d: Date): { key: string; bucket: Date } {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const bucket = new Date(Date.UTC(y, m, 1))
  return { key: `${y}-${String(m + 1).padStart(2, '0')}`, bucket }
}

export function aggregateTrend(rows: TrendInputRow[]): AreaPriceTrendRow[] {
  type Grp = { meta: { il: string; ilce: string | null; mahalle: string | null }; bucket: Date; values: number[] }
  const groups = new Map<string, Grp>()

  const push = (
    scope: 'il' | 'ilce' | 'mahalle',
    meta: Grp['meta'],
    monthKey: string,
    bucket: Date,
    value: number,
  ) => {
    const k = `${scope}|${meta.il}|${meta.ilce ?? ''}|${meta.mahalle ?? ''}|${monthKey}`
    let g = groups.get(k)
    if (!g) {
      g = { meta, bucket, values: [] }
      groups.set(k, g)
    }
    g.values.push(value)
  }

  for (const r of rows) {
    if (r.status !== 'active' && r.status !== 'delisted') continue
    if (!arsaTypes.has(r.listingType)) continue
    if (r.pricePerSqm == null || !Number.isFinite(r.pricePerSqm) || r.pricePerSqm <= 0) continue
    if (!(r.listedAt instanceof Date) || Number.isNaN(r.listedAt.getTime())) continue
    if (!r.il) continue

    const il = normalizeAreaName(r.il)
    const ilce = r.ilce ? normalizeAreaName(r.ilce) : null
    const mahalle = r.mahalle ? normalizeAreaName(r.mahalle) : null
    const { key, bucket } = monthKeyOf(r.listedAt)

    push('il', { il, ilce: null, mahalle: null }, key, bucket, r.pricePerSqm)
    if (ilce) {
      push('ilce', { il, ilce, mahalle: null }, key, bucket, r.pricePerSqm)
      if (mahalle) push('mahalle', { il, ilce, mahalle }, key, bucket, r.pricePerSqm)
    }
  }

  const out: AreaPriceTrendRow[] = []
  for (const [k, g] of groups) {
    if (g.values.length < MIN_SAMPLE) continue
    const scope = k.split('|')[0] as 'il' | 'ilce' | 'mahalle'
    out.push({
      ...g.meta,
      scope,
      monthBucket: g.bucket,
      medianPricePerSqm: median(g.values),
      sampleCount: g.values.length,
    })
  }
  return out
}
```

- [ ] **Step 4: GREEN** — `npx jest src/lib/areaPrices/trendAggregate.test.ts` → PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaPrices/trendAggregate.ts src/lib/areaPrices/trendAggregate.test.ts
git commit -m "feat(trend): aggregateTrend — MarketListing aylık kova × alan (saf)"
```

---

## Task 3: `scripts/aggregate-trend.ts` + `prices:trend`

**Files:**
- Create: `scripts/aggregate-trend.ts`
- Modify: `package.json` (`scripts`)
- Test: yok (ince I/O wiring; `scripts/aggregate-area-prices.ts` deseni; saf mantık Task 2'de). Doğrulama: dev DB'ye çalıştır.

**Interfaces:**
- Consumes: `aggregateTrend`, `TrendInputRow` from `../src/lib/areaPrices/trendAggregate`; `prisma` from `../src/lib/prisma` (RELATIVE import — `scripts/aggregate-area-prices.ts` deseni, `@/` YOK).

- [ ] **Step 1: Script'i yaz**

`scripts/aggregate-trend.ts` (`scripts/aggregate-area-prices.ts` yapısını birebir izle — `findFirst` + create/update):

```ts
import { prisma } from '../src/lib/prisma'
import { aggregateTrend, type TrendInputRow } from '../src/lib/areaPrices/trendAggregate'

async function main() {
  const rows = await prisma.marketListing.findMany({
    select: {
      listingType: true, pricePerSqm: true, status: true,
      il: true, ilce: true, mahalle: true, listedAt: true,
    },
  })

  const trend = aggregateTrend(rows as TrendInputRow[])
  const computedAt = new Date()

  let written = 0
  for (const t of trend) {
    const existing = await prisma.areaPriceTrend.findFirst({
      where: { il: t.il, ilce: t.ilce, mahalle: t.mahalle, monthBucket: t.monthBucket },
    })
    if (existing) {
      await prisma.areaPriceTrend.update({
        where: { id: existing.id },
        data: {
          scope: t.scope,
          medianPricePerSqm: t.medianPricePerSqm,
          sampleCount: t.sampleCount,
          computedAt,
        },
      })
    } else {
      await prisma.areaPriceTrend.create({ data: { ...t, computedAt } })
    }
    written++
  }

  const total = await prisma.areaPriceTrend.count()
  console.log(
    `✅ ${written} AreaPriceTrend satırı yazıldı/güncellendi (${rows.length} ilan tarandı). Tabloda toplam ${total}.`,
  )
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: `package.json`'a script ekle**

`scripts` bloğuna, `"prices:aggregate"` satırının yanına:

```json
"prices:trend": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/aggregate-trend.ts",
```

- [ ] **Step 3: Tip kontrolü** — `npx tsc --noEmit` → temiz.

- [ ] **Step 4: Dev DB'ye çalıştır**

Run: `npm run prices:trend`
Expected: `✅ N AreaPriceTrend satırı yazıldı/güncellendi (M ilan tarandı).` — hata yok, N ≥ 1. (Dev DB'de `MarketListing` `listedAt` Mayıs-Ağustos aralığında ~480 satır var → en az birkaç ay-kova satırı üretilmeli.)

- [ ] **Step 5: İkinci koşu (idempotent)** — `npm run prices:trend` tekrar → aynı N, hata yok.

- [ ] **Step 6: Commit**

```bash
git add scripts/aggregate-trend.ts package.json
git commit -m "feat(trend): prices:trend script (MarketListing → AreaPriceTrend)"
```

---

## Task 4: `priceTrend.ts` — fallback + değişim (saf)

**Files:**
- Create: `src/lib/deger/priceTrend.ts`
- Test: `src/lib/deger/priceTrend.test.ts`

**Interfaces:**
- Produces:
  - `export interface TrendRow { scope: 'il' | 'ilce' | 'mahalle'; monthBucket: Date; medianPricePerSqm: number; sampleCount: number }`
  - `export interface PriceTrendPoint { month: string; medianPricePerSqm: number; sampleCount: number }`
  - `export interface PriceTrendResult { insufficientTrend: boolean; basis?: 'mahalle' | 'ilce' | 'il'; points?: PriceTrendPoint[]; changePct3m?: number | null; thinTrend?: boolean }`
  - `export function priceTrend(rows: TrendRow[], opts: { now: Date }): PriceTrendResult`
- Kurallar:
  - **Pencere:** `windowStart = Date.UTC(now.year, now.month - 11, 1)` (12 kova: bu ay + geriye 11). `monthBucket < windowStart` olan satır elenir.
  - **Fallback:** pencere içi `scope==='mahalle'` satır sayısı **≥ 3** → basis `mahalle`; yoksa `ilce` ≥ 3; yoksa `il` ≥ 3; yoksa `{ insufficientTrend: true }`.
  - **`points`:** seçilen basis'in satırları, `monthBucket` artan. `month` = `"YYYY-MM"` (UTC). Eksik ay doldurulmaz.
  - **`changePct3m`:** `points.length >= 4` → `round1((points[last].median - points[last-3].median) / points[last-3].median * 100)`; yoksa `null`.
  - **`thinTrend`:** `sum(points.sampleCount) < 20 || points.length < 4` → `true`.
  - `rows` boş → `{ insufficientTrend: true }`.

- [ ] **Step 1: Failing test**

`src/lib/deger/priceTrend.test.ts`:

```ts
import { priceTrend, type TrendRow } from './priceTrend'

const NOW = new Date('2026-08-15T00:00:00Z')
const bucket = (ym: string) => new Date(`${ym}-01T00:00:00Z`)

function r(over: Partial<TrendRow>): TrendRow {
  return { scope: 'mahalle', monthBucket: bucket('2026-06'), medianPricePerSqm: 1000, sampleCount: 10, ...over }
}

describe('priceTrend', () => {
  it('mahalle ≥3 kova → basis mahalle, points ay artan', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2026-06'), medianPricePerSqm: 1000 }),
      r({ monthBucket: bucket('2026-07'), medianPricePerSqm: 1100 }),
      r({ monthBucket: bucket('2026-08'), medianPricePerSqm: 1200 }),
    ], { now: NOW })
    expect(res.insufficientTrend).toBe(false)
    expect(res.basis).toBe('mahalle')
    expect(res.points!.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(res.changePct3m).toBeNull() // <4 kova
  })

  it('mahalle <3 kova ama ilçe ≥3 → basis ilçe', () => {
    const res = priceTrend([
      r({ scope: 'mahalle', monthBucket: bucket('2026-07') }),
      r({ scope: 'mahalle', monthBucket: bucket('2026-08') }),
      r({ scope: 'ilce', monthBucket: bucket('2026-06'), medianPricePerSqm: 900 }),
      r({ scope: 'ilce', monthBucket: bucket('2026-07'), medianPricePerSqm: 950 }),
      r({ scope: 'ilce', monthBucket: bucket('2026-08'), medianPricePerSqm: 1000 }),
    ], { now: NOW })
    expect(res.basis).toBe('ilce')
    expect(res.points).toHaveLength(3)
  })

  it('4+ kova → changePct3m hesaplanır', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 1000 + i * 100, sampleCount: 10 }),
    ), { now: NOW })
    // last=1300, last-3=1000 → +30.0
    expect(res.changePct3m).toBe(30)
  })

  it('negatif değişim', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 2000 - i * 100, sampleCount: 10 }),
    ), { now: NOW })
    expect(res.changePct3m).toBe(-15) // 1700 vs 2000
  })

  it('12 ay penceresi: 13 ay önceki kova elenir', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2025-07'), medianPricePerSqm: 500 }), // 13 ay önce
      r({ monthBucket: bucket('2026-06') }),
      r({ monthBucket: bucket('2026-07') }),
      r({ monthBucket: bucket('2026-08') }),
    ], { now: NOW })
    expect(res.points!.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  it('thinTrend: toplam örneklem <20', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2026-06'), sampleCount: 3 }),
      r({ monthBucket: bucket('2026-07'), sampleCount: 3 }),
      r({ monthBucket: bucket('2026-08'), sampleCount: 3 }),
    ], { now: NOW })
    expect(res.thinTrend).toBe(true)
  })

  it('boş / yetersiz → insufficientTrend', () => {
    expect(priceTrend([], { now: NOW }).insufficientTrend).toBe(true)
    expect(priceTrend([r({ monthBucket: bucket('2026-08') })], { now: NOW }).insufficientTrend).toBe(true)
  })
})
```

- [ ] **Step 2: RED** — `npx jest src/lib/deger/priceTrend.test.ts` → "Cannot find module './priceTrend'".

- [ ] **Step 3: Implementasyon**

`src/lib/deger/priceTrend.ts`:

```ts
export interface TrendRow {
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}
export interface PriceTrendPoint {
  month: string
  medianPricePerSqm: number
  sampleCount: number
}
export interface PriceTrendResult {
  insufficientTrend: boolean
  basis?: 'mahalle' | 'ilce' | 'il'
  points?: PriceTrendPoint[]
  changePct3m?: number | null
  thinTrend?: boolean
}

const round1 = (n: number) => Math.round(n * 10) / 10
const monthStr = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

export function priceTrend(rows: TrendRow[], opts: { now: Date }): PriceTrendResult {
  const n = opts.now
  const windowStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 11, 1)
  const inWindow = rows.filter((r) => r.monthBucket.getTime() >= windowStart)

  const bySc = (s: TrendRow['scope']) =>
    inWindow.filter((r) => r.scope === s).sort((a, b) => a.monthBucket.getTime() - b.monthBucket.getTime())

  let basis: 'mahalle' | 'ilce' | 'il' | null = null
  let chosen: TrendRow[] = []
  for (const s of ['mahalle', 'ilce', 'il'] as const) {
    const rr = bySc(s)
    if (rr.length >= 3) {
      basis = s
      chosen = rr
      break
    }
  }
  if (!basis) return { insufficientTrend: true }

  const points: PriceTrendPoint[] = chosen.map((r) => ({
    month: monthStr(r.monthBucket),
    medianPricePerSqm: r.medianPricePerSqm,
    sampleCount: r.sampleCount,
  }))

  let changePct3m: number | null = null
  if (points.length >= 4) {
    const last = points[points.length - 1].medianPricePerSqm
    const prev = points[points.length - 4].medianPricePerSqm
    changePct3m = prev > 0 ? round1(((last - prev) / prev) * 100) : null
  }

  const totalSamples = points.reduce((s, p) => s + p.sampleCount, 0)
  const thinTrend = totalSamples < 20 || points.length < 4

  return { insufficientTrend: false, basis, points, changePct3m, thinTrend }
}
```

- [ ] **Step 4: GREEN** — `npx jest src/lib/deger/priceTrend.test.ts` → PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deger/priceTrend.ts src/lib/deger/priceTrend.test.ts
git commit -m "feat(trend): priceTrend — fallback + son 3 ay değişim (saf)"
```

---

## Task 5: `card.ts` — `findAreaTrend` + `priceTrend` DTO

**Files:**
- Modify: `src/lib/deger/card.ts`
- Test: `src/lib/deger/card.test.ts`

**Interfaces:**
- Consumes: `priceTrend`, `TrendRow`, `PriceTrendPoint` from `@/lib/deger/priceTrend`.
- Produces (card.ts değişiklikleri):
  - `DegerCardDeps`'e: `findAreaTrend: (il: string, ilce: string, mahalle: string) => Promise<TrendRow[]>`
  - `DegerCardDTO`'ya top-level: `priceTrend?: { basis: 'mahalle' | 'ilce' | 'il'; points: PriceTrendPoint[]; changePct3m: number | null; thinTrend: boolean }`
- Kurallar:
  - `findAreaTrend`, mevcut `Promise.all([snap, stats, listings, hood])`'a 5. eleman olarak eklenir (`nIl, nIlce, nMahalle` — zaten var).
  - `const trend = priceTrend(trendRows, { now: new Date() })`.
  - DTO return objesine: **yalnız `opts.memberView && !trend.insufficientTrend`** →
    `priceTrend: { basis: trend.basis!, points: trend.points!, changePct3m: trend.changePct3m ?? null, thinTrend: trend.thinTrend ?? false }`. Aksi halde alan HİÇ eklenmez.
  - Mevcut paywall testinin `Object.keys(res.card.value)` iddiası DEĞİŞMEZ (trend `card.priceTrend`'de).

- [ ] **Step 1: Failing test**

`src/lib/deger/card.test.ts` — `deps()` fabrikasına ekle:

```ts
    findAreaTrend: jest.fn().mockResolvedValue([
      { scope: 'mahalle', monthBucket: new Date('2026-06-01T00:00:00Z'), medianPricePerSqm: 1000, sampleCount: 10 },
      { scope: 'mahalle', monthBucket: new Date('2026-07-01T00:00:00Z'), medianPricePerSqm: 1100, sampleCount: 10 },
      { scope: 'mahalle', monthBucket: new Date('2026-08-01T00:00:00Z'), medianPricePerSqm: 1200, sampleCount: 10 },
    ]),
```

Yeni testler:

```ts
it('üye: priceTrend var (points + basis)', async () => {
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card.priceTrend).toBeDefined()
  expect(res.card.priceTrend!.basis).toBe('mahalle')
  expect(res.card.priceTrend!.points).toHaveLength(3)
})

it('anonim: priceTrend YOK', async () => {
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card).not.toHaveProperty('priceTrend')
})

it('yetersiz trend (tek kova) → priceTrend YOK (üye olsa bile)', async () => {
  const d = deps({ findAreaTrend: jest.fn().mockResolvedValue([
    { scope: 'mahalle', monthBucket: new Date('2026-08-01T00:00:00Z'), medianPricePerSqm: 1000, sampleCount: 5 },
  ]) })
  const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
  if (!res.ok) throw new Error('ok bekleniyordu')
  expect(res.card).not.toHaveProperty('priceTrend')
})

it('findAreaTrend normalize edilmiş args alır', async () => {
  const d = deps()
  await buildDegerCard({ kind: 'adaParsel', mahalleId: 1, ada: '1', parsel: '2' }, d, { memberView: true })
  expect(d.findAreaTrend).toHaveBeenCalledWith('TRABZON', 'ORTAHISAR', 'UĞURLU')
})
```

(Mevcut paywall "üye alanları YOK" testinin `Object.keys(res.card.value)` iddiası DEĞİŞMEZ.)

- [ ] **Step 2: RED** — `npx jest src/lib/deger/card.test.ts` → yeni testler FAIL.

- [ ] **Step 3: Implementasyon**

`card.ts`:
- Import: `import { priceTrend, type TrendRow, type PriceTrendPoint } from '@/lib/deger/priceTrend'`
- `DegerCardDeps`'e `findAreaTrend` satırı.
- `DegerCardDTO`'ya `priceTrend?: {...}` (Interfaces bloğundaki şekil).
- `Promise.all` genişlet:

```ts
  const [snap, stats, listings, hood, trendRows] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(nIl, nIlce, nMahalle),
    deps.findListingsNear(nIl, nIlce),
    deps.findNeighborhood(nIl, nIlce, nMahalle),
    deps.findAreaTrend(nIl, nIlce, nMahalle),
  ])
```

- `comp` hesabından sonra:

```ts
  const trend = priceTrend(trendRows, { now: new Date() })
```

- DTO return objesine (`comparables` yanına):

```ts
      ...(opts.memberView && !trend.insufficientTrend
        ? {
            priceTrend: {
              basis: trend.basis!,
              points: trend.points!,
              changePct3m: trend.changePct3m ?? null,
              thinTrend: trend.thinTrend ?? false,
            },
          }
        : {}),
```

- [ ] **Step 4: GREEN + regresyon** — `npx jest src/lib/deger/card.test.ts` → tüm testler. `npx tsc --noEmit` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deger/card.ts src/lib/deger/card.test.ts
git commit -m "feat(trend): buildDegerCard priceTrend orkestrasyonu (üye-gated)"
```

---

## Task 6: `route.ts` — `findAreaTrend` sorgusu

**Files:**
- Modify: `src/app/api/deger/kart/route.ts`
- Test: `src/app/api/deger/kart/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `card.ts`'in yeni `findAreaTrend` dep imzası; `TrendRow` from `@/lib/deger/priceTrend`.
- Route'un `buildDegerCard` DI objesine yeni alan (mevcut `findAreaStats`'ın yanına):

```ts
      findAreaTrend: async (il, ilce, mahalle): Promise<TrendRow[]> => {
        const windowStart = new Date()
        windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
        windowStart.setUTCHours(0, 0, 0, 0)
        const rows = await prisma.areaPriceTrend.findMany({
          where: {
            il,
            monthBucket: { gte: windowStart },
            OR: [
              { ilce: null, mahalle: null },
              { ilce, mahalle: null },
              { ilce, mahalle },
            ],
          },
          select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
        })
        return rows as TrendRow[]
      },
```

(il/ilce/mahalle `buildDegerCard` içinde zaten `normalizeAreaName`'den geçiyor — `findAreaStats` deseni. `AreaPriceTrend` anahtarları normalize uzayında → SQL eşitliği güvenli.)

- [ ] **Step 1: Failing test**

`route.test.ts` — `jest.mock('@/lib/prisma')` fixture'ına `areaPriceTrend.findMany` ekle; yeni test:

```ts
it('buildDegerCard\'a findAreaTrend DI geçer — 12 ay penceresi + 3-scope OR', async () => {
  const prisma = jest.requireMock('@/lib/prisma').prisma
  prisma.areaPriceTrend.findMany.mockResolvedValue([])
  await GET(req('lat=41.0&lng=39.7'))
  const deps = buildDegerCardMock.mock.calls[0][1]
  expect(typeof deps.findAreaTrend).toBe('function')
  await deps.findAreaTrend('TRABZON', 'ORTAHISAR', 'UĞURLU')
  const where = prisma.areaPriceTrend.findMany.mock.calls[0][0].where
  expect(where.il).toBe('TRABZON')
  expect(where.monthBucket.gte).toBeInstanceOf(Date)
  expect(where.OR).toEqual([
    { ilce: null, mahalle: null },
    { ilce: 'ORTAHISAR', mahalle: null },
    { ilce: 'ORTAHISAR', mahalle: 'UĞURLU' },
  ])
})
```

`jest.mock('@/lib/prisma')` genişletilir:
```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    areaPriceStat: { findMany: jest.fn().mockResolvedValue([]) },
    marketListing: { findMany: jest.fn().mockResolvedValue([]) },
    neighborhood: { findUnique: jest.fn().mockResolvedValue(null) },
    areaPriceTrend: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))
```

- [ ] **Step 2: RED** — `npx jest src/app/api/deger/kart` → yeni test FAIL.

- [ ] **Step 3: Implementasyon** — Interfaces bloğundaki `findAreaTrend` DI'sını route'a ekle; import `import type { TrendRow } from '@/lib/deger/priceTrend'`.

- [ ] **Step 4: GREEN + tip + regresyon** — `npx jest src/app/api/deger/kart` → tüm testler; `npx tsc --noEmit` → temiz.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/deger/kart
git commit -m "feat(trend): /api/deger/kart — AreaPriceTrend sorgusu"
```

---

## Task 7: `PriceTrendChart.tsx`

**Files:**
- Create: `src/components/charts/PriceTrendChart.tsx`, `src/components/charts/PriceTrendChart.test.tsx`

**Interfaces:**
- Consumes: `react-chartjs-2` `Line`; `chart.js` register.
- Produces:
  - `export interface PriceTrendChartProps { points: Array<{ month: string; medianPricePerSqm: number; sampleCount: number }>; changePct3m: number | null; thinTrend?: boolean }`
  - `export function PriceTrendChart(props: PriceTrendChartProps): JSX.Element`
- `'use client'`. `chart.js` register: `CategoryScale, LinearScale, PointElement, LineElement, Tooltip` (`CostBreakdownChart.tsx` `ChartJS.register(...)` deseni).
- X etiketleri: `month` `"2026-06"` → `"Haz '26"` (kısa TR ay + 2 haneli yıl; sabit `['Oca','Şub',...,'Ara']` dizisi). Y: `₺/m²`.
- Tek dataset: bölge medyanı, ArsaBil mavisi (`#0a5cff`), `borderWidth: 2`, `tension: 0.2`, `spanGaps: false`, `pointRadius: 3`.
- Chart altında: `changePct3m != null` → `<p>Son 3 ay: <strong>{sign}%{abs}</strong></p>` (pozitif yeşil `#1e7a3c`, negatif kırmızı `#b3261e`, virgüllü ondalık). `thinTrend` → `<p className={styles.caveat}>⚠︎ sınırlı geçmiş veriye dayanıyor</p>`.

- [ ] **Step 1: Failing test**

`src/components/charts/PriceTrendChart.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('react-chartjs-2', () => ({
  Line: (props: { data: { datasets: Array<{ data: number[] }>; labels: string[] } }) => (
    <div
      data-testid="line"
      data-values={JSON.stringify(props.data.datasets[0].data)}
      data-labels={JSON.stringify(props.data.labels)}
    />
  ),
}))
import { PriceTrendChart } from './PriceTrendChart'

const POINTS = [
  { month: '2026-06', medianPricePerSqm: 1000, sampleCount: 10 },
  { month: '2026-07', medianPricePerSqm: 1100, sampleCount: 10 },
  { month: '2026-08', medianPricePerSqm: 1200, sampleCount: 10 },
]

it('points → dataset + kısa TR ay etiketleri', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} />)
  const line = screen.getByTestId('line')
  expect(JSON.parse(line.getAttribute('data-values')!)).toEqual([1000, 1100, 1200])
  expect(JSON.parse(line.getAttribute('data-labels')!)).toEqual(["Haz '26", "Tem '26", "Ağu '26"])
})

it('changePct3m pozitif → yeşil özet', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={12.5} />)
  expect(screen.getByText(/Son 3 ay/)).toHaveTextContent('+%12,5')
})

it('changePct3m null → özet gizli', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} />)
  expect(screen.queryByText(/Son 3 ay/)).not.toBeInTheDocument()
})

it('thinTrend → uyarı', () => {
  render(<PriceTrendChart points={POINTS} changePct3m={null} thinTrend />)
  expect(screen.getByText(/sınırlı geçmiş veriye/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: RED** — `npx jest src/components/charts/PriceTrendChart.test.tsx` → FAIL.

> **Not:** Bu, gerçek bir `chart.js`-kullanan bileşeni doğrudan render eden İLK test (`CostBreakdownChart`/`RiskGaugeChart` yalnız mock'lu tüketicilerden test ediliyor). `ChartJS.register(...)` modül-scope'ta çalışır ama canvas'a dokunmaz — jsdom'da sorun çıkarmamalı. Çıkarırsa (`chart.js` import hatası): teste `jest.mock('chart.js', () => ({ Chart: { register: jest.fn() }, CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, Tooltip: {} }))` ekle. `react-chartjs-2` mock'u zaten `Line`'ı stub'ladığı için görsel davranış test edilmiyor, sadece `data` prop'u.

- [ ] **Step 3: Implementasyon** (`CostBreakdownChart.tsx` register + yapı desenini izle; `.module.css` YOK — inline style ya da tek `.module.css` `composes`'suz; küçük CSS için inline style proje chart'larında zaten yaygın).

`src/components/charts/PriceTrendChart.tsx` iskelet:

```tsx
'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export interface PriceTrendChartProps {
  points: Array<{ month: string; medianPricePerSqm: number; sampleCount: number }>
  changePct3m: number | null
  thinTrend?: boolean
}

function label(month: string): string {
  const [y, m] = month.split('-')
  return `${AYLAR[Number(m) - 1]} '${y.slice(2)}`
}

export function PriceTrendChart({ points, changePct3m, thinTrend }: PriceTrendChartProps) {
  const data = {
    labels: points.map((p) => label(p.month)),
    datasets: [
      {
        data: points.map((p) => p.medianPricePerSqm),
        borderColor: '#0a5cff',
        backgroundColor: 'rgba(10,92,255,0.08)',
        borderWidth: 2,
        tension: 0.2,
        spanGaps: false,
        pointRadius: 3,
        fill: true,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        ticks: {
          callback: (v: string | number) => `${Number(v).toLocaleString('tr-TR')} ₺`,
        },
      },
    },
  }
  const pos = (changePct3m ?? 0) >= 0
  return (
    <div>
      <Line data={data} options={options} />
      {changePct3m != null && (
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Son 3 ay:{' '}
          <strong style={{ color: pos ? '#1e7a3c' : '#b3261e' }}>
            {pos ? '+' : ''}%{Math.abs(changePct3m).toLocaleString('tr-TR')}
          </strong>
        </p>
      )}
      {thinTrend && (
        <p style={{ fontSize: '0.75rem', color: '#8a8a8e', marginTop: 4 }}>
          ⚠︎ sınırlı geçmiş veriye dayanıyor
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: GREEN + tip + build**

Run: `npx jest src/components/charts/PriceTrendChart.test.tsx` → PASS (4).
Run: `npx tsc --noEmit` → temiz.
Run: `npm run build` → "✓ Compiled successfully" (yeni chart.js `Line` register + `/deger` etkilenmez).

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/PriceTrendChart.tsx src/components/charts/PriceTrendChart.test.tsx
git commit -m "feat(trend): PriceTrendChart — bölge ₺/m² zaman serisi"
```

---

## Task 8: `DegerKarti.tsx` — trend bloğu

**Files:**
- Modify: `src/components/deger/DegerKarti.tsx`, `DegerKarti.module.css`, `DegerKarti.test.tsx`

**Interfaces:**
- Consumes: `PriceTrendChart` from `@/components/charts/PriceTrendChart`; `DegerCardDTO.priceTrend` (Task 5).
- `DegerKarti.tsx` değişiklikleri:
  - `import { PriceTrendChart } from '@/components/charts/PriceTrendChart'`
  - Üye bölümünde, emsal bloğundan SONRA, `.disclaimer`'dan ÖNCE:

```tsx
      {isMember && card.priceTrend && (
        <div className={styles.trendBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>Bölge Fiyat Eğilimi</div>
          <PriceTrendChart
            points={card.priceTrend.points}
            changePct3m={card.priceTrend.changePct3m}
            thinTrend={card.priceTrend.thinTrend}
          />
        </div>
      )}
```

  - `.soon` satırı: `Yakında (üyelere): Uzman görüşü` ("Fiyat trendi ·" çıkarıldı).
- `DegerKarti.module.css`: `.trendBlock { margin-top: 4px; }` (varsa yeterli — `.divider` / `.label` zaten var).
- `DegerKarti.test.tsx`: `jest.mock('@/components/charts/PriceTrendChart', () => ({ PriceTrendChart: () => <div data-testid="trend-chart" /> }))` (proje chart mock deseni). `baseCard` fixture'a bir şey EKLEME (priceTrend opsiyonel).

- [ ] **Step 1: Failing test**

`DegerKarti.test.tsx` — mock ekle + yeni testler:

```tsx
jest.mock('@/components/charts/PriceTrendChart', () => ({ PriceTrendChart: () => <div data-testid="trend-chart" /> }))

it('üye + priceTrend → trend bloğu render', () => {
  const card = { ...baseCard, priceTrend: {
    basis: 'mahalle' as const,
    points: [{ month: '2026-06', medianPricePerSqm: 1000, sampleCount: 10 }],
    changePct3m: 5, thinTrend: false,
  } }
  render(<DegerKarti card={card} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Bölge Fiyat Eğilimi/)).toBeInTheDocument()
  expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
})

it('priceTrend yoksa trend bloğu YOK', () => {
  render(<DegerKarti card={baseCard} isLoggedIn parcelQuery="q=1" />)
  expect(screen.queryByText(/Bölge Fiyat Eğilimi/)).not.toBeInTheDocument()
})

it('anonim + priceTrend (imkânsız ama) → trend bloğu YOK', () => {
  const card = { ...baseCard, priceTrend: { basis: 'il' as const, points: [], changePct3m: null, thinTrend: true } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.queryByText(/Bölge Fiyat Eğilimi/)).not.toBeInTheDocument()
})

it('.soon artık "Fiyat trendi" içermiyor, "Uzman görüşü" içeriyor', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  const soon = screen.getByText(/Yakında/)
  expect(soon).not.toHaveTextContent('Fiyat trendi')
  expect(soon).toHaveTextContent('Uzman görüşü')
})
```

- [ ] **Step 2: RED** — `npx jest src/components/deger/DegerKarti.test.tsx` → yeni testler FAIL.

- [ ] **Step 3: Implementasyon** — Interfaces bloğundaki JSX + `.soon` güncelle + CSS.

- [ ] **Step 4: GREEN + regresyon + build**

Run: `npx jest src/components/deger/ src/app/deger/` → tüm testler (mevcut emsal/mini-harita/disclaimer/insufficientData yeşil).
Run: `npx tsc --noEmit` → temiz.
Run: `npm run build` → "✓ Compiled successfully", `/deger` static.

- [ ] **Step 5: Commit**

```bash
git add src/components/deger/DegerKarti.tsx src/components/deger/DegerKarti.module.css src/components/deger/DegerKarti.test.tsx
git commit -m "feat(trend): DegerKarti bölge fiyat eğilimi bloğu (üye)"
```

---

## Final Doğrulama (tüm task'lar bitince)

- [ ] `npx jest --roots "$(pwd)/src"` → tüm suite yeşil (worktree kullanıldıysa önce `git worktree remove`)
- [ ] `npx tsc --noEmit` temiz
- [ ] `npm run build` başarılı, `/deger` + `/` build oluyor
- [ ] `npx prisma migrate status` temiz
- [ ] **Elle uçtan uca (dev):** `npm run dev`, `arsabil_postgres_dev` ayakta, `npm run prices:trend` çalıştırılmış. `/deger`'de Trabzon'dan bilinen bir parsel + giriş yap → "Bölge Fiyat Eğilimi" grafiği (Mayıs-Ağustos çizgisi) + "son 3 ay %X". Giriş yapmadan → blok YOK.

---

## Notlar / bilinen v1 kalıntıları

- `listedAt` Emlakjet "İlan Güncelleme Tarihi"si olabilir — trend "fiyat şu ay geçerliydi" yaklaşımı, kesin ilk-yayın değil.
- 4 aylık veri → `changePct3m` çoğu bölgede `null` (4+ kova yok) → sadece geçmiş çizgi gösterilir. Tekrarlı crawl + zaman ile derinleşir.
- Öngörü yok — spec kararı, veri 12+ aya ulaşınca ayrı iterasyon.
- `PriceTrendChart` inline style kullanıyor (proje chart'larının deseni — `CostBreakdownChart` da öyle); ileride `.module.css`'e taşınabilir.
- Ulusal veri gelene kadar trend yalnız Trabzon bölgelerinde dolu.
