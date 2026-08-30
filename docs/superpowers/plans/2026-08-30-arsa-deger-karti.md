# Arsa Değer Kartı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bir parsel için tahmini değer + ₺/m² + risk rozeti gösteren, giriş gerektirmeyen `/deger` sayfası ve ona veri sağlayan birleşik anonim API.

**Architecture:** Yeni `AreaPriceStat` önhesap tablosu, `MarketListing`'ten elle çalıştırılan bir toplama script'iyle (`npm run prices:aggregate`) doldurulur. Saf `valuation.ts` fonksiyonu parsel alanı + istatistik satırlarından kademeli (mahalle→ilçe→il) bir değer tahmini üretir. Birleşik `GET /api/deger/kart` endpoint'i sunucuda TKGM parsel + TÜCBS WMS risk + `AreaPriceStat` sorgusunu birleştirip oturuma göre ücretsiz/üye bir DTO döndürür. `/deger` sayfası mevcut `ManualParcelEntryForm` / `ParcelPicker` bileşenlerini yeniden kullanır.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma + PostgreSQL, Jest + ts-jest (`testEnvironment: 'node'`, RTL testleri için dosya başında `/** @jest-environment jsdom */`), React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-arsa-deger-karti-design.md`

## Global Constraints

- **`DistrictPrice` tablosuna DOKUNULMAZ** — `/hesapla` fizibilite motorunun kontratı korunur. Bu iş yalnızca yeni `AreaPriceStat` tablosunu ekler.
- **Metin alanı normalizasyonu:** il / ilçe / mahalle her yerde `toLocaleUpperCase('tr-TR')` ile büyük harfe çevrilir — `MarketListing`'in crawler tarafından yazıldığı formatla aynı. `AreaPriceStat` yazımı ve okuması bu normalizasyonu kullanır.
- **Arsa tipi filtresi:** değerlemeye yalnızca `listingType ∈ {'arsa','tarla','bag','bahce','zeytinlik','arazi'}` giren ilanlar dahildir. `'konut'`, `'ticari'`, `'diger'` HARİÇ. (Değerler `crawler/adapters/types.ts` `ListingType` ile birebir.)
- **Güvenlik deseni:** risk ve değer YALNIZCA sunucuda hesaplanır; istemcinin gövde/query'de gönderdiği risk veya değer alanları asla okunmaz (mevcut `src/lib/risk/riskSnapshot.ts` gerekçesi). Üye alanları anonim yanıta hiç konmaz.
- **Migration:** elle yazılan SQL — `prisma migrate dev` ile üretilen taslak değil (proje deseni, bkz. `prisma/migrations/20260829120000_add_market_listing/migration.sql`).
- **Her task sonunda:** `npx tsc --noEmit` temiz + ilgili jest testleri yeşil. Task 9-11 sonrası ayrıca `npm run build` (Turbopack/lightningcss build-time tuzakları için).
- **Para/sayı formatı:** kullanıcıya gösterilen tutarlar `toLocaleString('tr-TR')`; bileşen içinde mevcut proje deseni neyse o (yeni bir formatter icat etme).

---

## Dosya Yapısı

| Dosya | Create/Modify | Sorumluluk |
|---|---|---|
| `prisma/schema.prisma` | Modify | `AreaPriceStat` modeli |
| `prisma/migrations/20260830120000_add_area_price_stat/migration.sql` | Create | Elle SQL |
| `src/lib/areaPrices/stats.ts` | Create | `median()`, `percentile()` saf yardımcıları |
| `src/lib/areaPrices/stats.test.ts` | Create | Test |
| `src/lib/areaPrices/aggregate.ts` | Create | `aggregateAreaPrices(rows)` — gruplama + istatistik |
| `src/lib/areaPrices/aggregate.test.ts` | Create | Test |
| `src/lib/areaPrices/valuation.ts` | Create | `valuateParcel(input)` — fallback zinciri, güven, aralıklar |
| `src/lib/areaPrices/valuation.test.ts` | Create | Test |
| `scripts/aggregate-area-prices.ts` | Create | Wiring: Prisma'dan oku → `aggregateAreaPrices` → upsert |
| `package.json` | Modify | `"prices:aggregate"` script |
| `src/lib/risk/formatDistance.ts` | Create | `RiskSuggestionCard`'tan çıkarılan ortak `formatDistance` |
| `src/lib/risk/formatDistance.test.ts` | Create | Test |
| `src/components/risk/RiskSuggestionCard.tsx` | Modify | Yerel `formatDistance` yerine ortak import |
| `src/lib/deger/card.ts` | Create | `buildDegerCard(params, deps)` orkestrasyonu + DTO tipleri |
| `src/lib/deger/card.test.ts` | Create | Test |
| `src/lib/rate-limit.ts` | Modify | `DEGER_KART`, `DEGER_KART_ANON` |
| `src/app/api/deger/kart/route.ts` | Create | GET handler |
| `src/app/api/deger/kart/__tests__/route.test.ts` | Create | Test |
| `src/components/deger/DegerKarti.tsx` | Create | Kart bileşeni (Düzen A) |
| `src/components/deger/DegerKarti.module.css` | Create | Stil |
| `src/components/deger/DegerKarti.test.tsx` | Create | RTL test |
| `src/app/deger/page.tsx` | Create | Sekmeli girdi + kart |
| `src/app/deger/page.module.css` | Create | Stil |
| `src/app/deger/page.test.tsx` | Create | RTL test |
| `src/components/home/DegerHookBox.tsx` | Create | Anasayfa kanca kutusu |
| `src/components/home/DegerHookBox.module.css` | Create | Stil |
| `src/components/home/DegerHookBox.test.tsx` | Create | RTL test |
| `src/app/page.tsx` | Modify | `<DegerHookBox />` yerleştir |

---

## Task 1: `AreaPriceStat` modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (yeni model — `MarketListing` modelinin hemen ardına ekle)
- Create: `prisma/migrations/20260830120000_add_area_price_stat/migration.sql`
- Test: yok (şema değişikliği; doğrulama `prisma migrate` + `tsc`)

**Interfaces:**
- Produces: Prisma `AreaPriceStat` modeli — alanlar: `il: string`, `ilce: string | null`, `mahalle: string | null`, `scope: string`, `medianPricePerSqm: number`, `p25: number`, `p75: number`, `sampleCount: number`, `computedAt: Date`. Unique: `[il, ilce, mahalle]`.

- [ ] **Step 1: Şemaya modeli ekle**

`prisma/schema.prisma` içinde `model MarketListing { ... }` bloğunun hemen ardına:

```prisma
model AreaPriceStat {
  id                String   @id @default(cuid())
  il                String
  ilce              String?
  mahalle           String?
  scope             String // "il" | "ilce" | "mahalle"
  medianPricePerSqm Float
  p25               Float
  p75               Float
  sampleCount       Int
  computedAt        DateTime

  @@unique([il, ilce, mahalle])
  @@index([il, ilce, mahalle])
}
```

- [ ] **Step 2: Migration SQL'ini yaz**

`prisma/migrations/20260830120000_add_area_price_stat/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AreaPriceStat" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT,
    "mahalle" TEXT,
    "scope" TEXT NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaPriceStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaPriceStat_il_ilce_mahalle_key" ON "AreaPriceStat"("il", "ilce", "mahalle");

-- CreateIndex
CREATE INDEX "AreaPriceStat_il_ilce_mahalle_idx" ON "AreaPriceStat"("il", "ilce", "mahalle");
```

- [ ] **Step 3: Migration'ı uygula ve client'i üret**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `AreaPriceStat` tablosu oluşur, `@prisma/client` tipleri güncellenir. (Dev DB `arsabil_postgres_dev` ayakta olmalı — değilse `npm run dev:db`.)

- [ ] **Step 4: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: temiz (yeni model henüz kullanılmıyor, sadece tip üretimi doğrulanır).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260830120000_add_area_price_stat
git commit -m "feat(deger): AreaPriceStat modeli + migration"
```

---

## Task 2: `stats.ts` — median / percentile saf yardımcıları

**Files:**
- Create: `src/lib/areaPrices/stats.ts`
- Test: `src/lib/areaPrices/stats.test.ts`

**Interfaces:**
- Produces:
  - `export function median(values: number[]): number` — boş dizide `NaN` döndürmez, çağıran boş dizi geçmez (aggregate zaten filtreler); yine de boşta `throw new Error('median: empty')`.
  - `export function percentile(values: number[], p: number): number` — `p` 0–100 arası; sıralı listede lineer enterpolasyon; tek elemanda o elemanı döndürür.

- [ ] **Step 1: Failing test yaz**

`src/lib/areaPrices/stats.test.ts`:

```ts
import { median, percentile } from './stats'

describe('median', () => {
  it('tek sayıda eleman: ortadaki', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
  it('çift sayıda eleman: ortadaki ikinin ortalaması', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('tek eleman', () => {
    expect(median([7])).toBe(7)
  })
  it('boş dizi fırlatır', () => {
    expect(() => median([])).toThrow()
  })
})

describe('percentile', () => {
  it('p50 medyana eşittir (çift)', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5)
  })
  it('p25 lineer enterpolasyon', () => {
    // sıralı [10,20,30,40,50], rank = 0.25*(5-1)=1.0 -> tam index 1 -> 20
    expect(percentile([50, 10, 40, 20, 30], 25)).toBe(20)
  })
  it('p75 lineer enterpolasyon (kesirli rank)', () => {
    // [10,20,30,40], rank = 0.75*3 = 2.25 -> 30 + 0.25*(40-30) = 32.5
    expect(percentile([10, 20, 30, 40], 75)).toBe(32.5)
  })
  it('tek eleman her p için o eleman', () => {
    expect(percentile([42], 10)).toBe(42)
    expect(percentile([42], 90)).toBe(42)
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/areaPrices/stats.test.ts`
Expected: FAIL — "Cannot find module './stats'".

- [ ] **Step 3: Minimal implementasyon**

`src/lib/areaPrices/stats.ts`:

```ts
/** Sıralı kopya üzerinde lineer enterpolasyonlu persentil. p: 0–100. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new Error('percentile: empty')
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]
  const frac = rank - low
  return sorted[low] + frac * (sorted[high] - sorted[low])
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median: empty')
  return percentile(values, 50)
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/areaPrices/stats.test.ts`
Expected: PASS (10 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaPrices/stats.ts src/lib/areaPrices/stats.test.ts
git commit -m "feat(deger): median/percentile saf yardımcıları"
```

---

## Task 3: `aggregate.ts` — gruplama + istatistik

**Files:**
- Create: `src/lib/areaPrices/aggregate.ts`
- Test: `src/lib/areaPrices/aggregate.test.ts`

**Interfaces:**
- Consumes: `median`, `percentile` from `./stats`.
- Produces:
  - `export const ARSA_LISTING_TYPES: readonly string[]` — `['arsa','tarla','bag','bahce','zeytinlik','arazi']`.
  - `export interface AggregateInputRow { listingType: string; pricePerSqm: number | null; status: string; il: string | null; ilce: string | null; mahalle: string | null }`
  - `export interface AreaPriceStatRow { il: string; ilce: string | null; mahalle: string | null; scope: 'il' | 'ilce' | 'mahalle'; medianPricePerSqm: number; p25: number; p75: number; sampleCount: number }`
  - `export function aggregateAreaPrices(rows: AggregateInputRow[]): AreaPriceStatRow[]`
- Kural: yalnızca `status === 'active'`, `listingType ∈ ARSA_LISTING_TYPES`, `pricePerSqm` sonlu ve `> 0`, `il` dolu olan satırlar dahil. `il` boşsa satır tamamen atlanır. Grup için `sampleCount < 3` → o grup çıktıya YAZILMAZ. il/ilçe/mahalle çıktıda `toLocaleUpperCase('tr-TR')`.

- [ ] **Step 1: Failing test yaz**

`src/lib/areaPrices/aggregate.test.ts`:

```ts
import { aggregateAreaPrices, ARSA_LISTING_TYPES, type AggregateInputRow } from './aggregate'

function row(over: Partial<AggregateInputRow>): AggregateInputRow {
  return {
    listingType: 'arsa',
    pricePerSqm: 1000,
    status: 'active',
    il: 'trabzon',
    ilce: 'ortahisar',
    mahalle: 'uğurlu',
    ...over,
  }
}

describe('aggregateAreaPrices', () => {
  it('tek mahallede 3+ arsa ilanı → mahalle + ilçe + il satırı üretir', () => {
    const rows = [
      row({ pricePerSqm: 1000 }),
      row({ pricePerSqm: 2000 }),
      row({ pricePerSqm: 3000 }),
    ]
    const out = aggregateAreaPrices(rows)
    const scopes = out.map((r) => r.scope).sort()
    expect(scopes).toEqual(['il', 'ilce', 'mahalle'])
    const mah = out.find((r) => r.scope === 'mahalle')!
    expect(mah).toMatchObject({
      il: 'TRABZON',
      ilce: 'ORTAHİSAR',
      mahalle: 'UĞURLU',
      medianPricePerSqm: 2000,
      sampleCount: 3,
    })
  })

  it('3ten az örneklem olan grubu yazmaz', () => {
    const out = aggregateAreaPrices([row({}), row({})]) // 2 ilan
    expect(out).toEqual([])
  })

  it('konut / ticari / diger listingType hariç tutulur', () => {
    const rows = [
      row({ listingType: 'konut', pricePerSqm: 9999 }),
      row({ listingType: 'ticari', pricePerSqm: 9999 }),
      row({ listingType: 'diger', pricePerSqm: 9999 }),
      row({ listingType: 'arsa', pricePerSqm: 100 }),
      row({ listingType: 'tarla', pricePerSqm: 200 }),
      row({ listingType: 'bag', pricePerSqm: 300 }),
    ]
    const mah = aggregateAreaPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
    expect(mah.medianPricePerSqm).toBe(200)
  })

  it('pasif ilan, null/0/negatif pricePerSqm hariç', () => {
    const rows = [
      row({ status: 'delisted', pricePerSqm: 5000 }),
      row({ pricePerSqm: null }),
      row({ pricePerSqm: 0 }),
      row({ pricePerSqm: -5 }),
      row({ pricePerSqm: 100 }),
      row({ pricePerSqm: 200 }),
      row({ pricePerSqm: 300 }),
    ]
    const mah = aggregateAreaPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
  })

  it('il boş olan satır tamamen atlanır', () => {
    const out = aggregateAreaPrices([
      row({ il: null }),
      row({ il: null }),
      row({ il: null }),
    ])
    expect(out).toEqual([])
  })

  it('ilçe geneli satırı birden çok mahalleyi toplar; mahalle satırları ayrı', () => {
    const rows = [
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
    ]
    const out = aggregateAreaPrices(rows)
    const ilce = out.find((r) => r.scope === 'ilce')!
    expect(ilce.sampleCount).toBe(6)
    expect(ilce.medianPricePerSqm).toBe(300) // median of [100,100,100,500,500,500]
    expect(out.filter((r) => r.scope === 'mahalle')).toHaveLength(2)
  })

  it('ARSA_LISTING_TYPES beklenen değerler', () => {
    expect([...ARSA_LISTING_TYPES].sort()).toEqual(
      ['arazi', 'arsa', 'bag', 'bahce', 'tarla', 'zeytinlik'],
    )
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/areaPrices/aggregate.test.ts`
Expected: FAIL — "Cannot find module './aggregate'".

- [ ] **Step 3: Minimal implementasyon**

`src/lib/areaPrices/aggregate.ts`:

```ts
import { median, percentile } from './stats'

export const ARSA_LISTING_TYPES = [
  'arsa',
  'tarla',
  'bag',
  'bahce',
  'zeytinlik',
  'arazi',
] as const

export interface AggregateInputRow {
  listingType: string
  pricePerSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
}

export interface AreaPriceStatRow {
  il: string
  ilce: string | null
  mahalle: string | null
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

const MIN_SAMPLE = 3
const UP = (s: string) => s.toLocaleUpperCase('tr-TR')

function statRow(
  scope: AreaPriceStatRow['scope'],
  key: { il: string; ilce: string | null; mahalle: string | null },
  values: number[],
): AreaPriceStatRow {
  return {
    ...key,
    scope,
    medianPricePerSqm: median(values),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    sampleCount: values.length,
  }
}

export function aggregateAreaPrices(rows: AggregateInputRow[]): AreaPriceStatRow[] {
  const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)
  const ilGroups = new Map<string, number[]>()
  const ilceGroups = new Map<string, number[]>()
  const mahalleGroups = new Map<string, number[]>()
  // Anahtar → orijinal (büyük harfli) il/ilçe/mahalle bileşenleri
  const meta = new Map<string, { il: string; ilce: string | null; mahalle: string | null }>()

  for (const r of rows) {
    if (r.status !== 'active') continue
    if (!arsaTypes.has(r.listingType)) continue
    if (r.pricePerSqm == null || !Number.isFinite(r.pricePerSqm) || r.pricePerSqm <= 0) continue
    if (!r.il) continue

    const il = UP(r.il)
    const ilce = r.ilce ? UP(r.ilce) : null
    const mahalle = r.mahalle ? UP(r.mahalle) : null

    const ilKey = il
    ilGroups.set(ilKey, [...(ilGroups.get(ilKey) ?? []), r.pricePerSqm])
    meta.set(`il|${ilKey}`, { il, ilce: null, mahalle: null })

    if (ilce) {
      const ilceKey = `${il}|${ilce}`
      ilceGroups.set(ilceKey, [...(ilceGroups.get(ilceKey) ?? []), r.pricePerSqm])
      meta.set(`ilce|${ilceKey}`, { il, ilce, mahalle: null })

      if (mahalle) {
        const mahKey = `${il}|${ilce}|${mahalle}`
        mahalleGroups.set(mahKey, [...(mahalleGroups.get(mahKey) ?? []), r.pricePerSqm])
        meta.set(`mahalle|${mahKey}`, { il, ilce, mahalle })
      }
    }
  }

  const out: AreaPriceStatRow[] = []
  for (const [k, v] of ilGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('il', meta.get(`il|${k}`)!, v))
  }
  for (const [k, v] of ilceGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('ilce', meta.get(`ilce|${k}`)!, v))
  }
  for (const [k, v] of mahalleGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('mahalle', meta.get(`mahalle|${k}`)!, v))
  }
  return out
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/areaPrices/aggregate.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaPrices/aggregate.ts src/lib/areaPrices/aggregate.test.ts
git commit -m "feat(deger): MarketListing → AreaPriceStat toplama (saf)"
```

---

## Task 4: `scripts/aggregate-area-prices.ts` + `prices:aggregate`

**Files:**
- Create: `scripts/aggregate-area-prices.ts`
- Modify: `package.json` (`scripts` bloğu)
- Test: yok (ince I/O wiring; saf mantık Task 3'te test edildi — crawler'ın `run.ts` CLI'ıyla aynı yaklaşım). Doğrulama: script'i dev DB'ye karşı çalıştır.

**Interfaces:**
- Consumes: `aggregateAreaPrices` from `@/lib/areaPrices/aggregate`, `prisma` from `@/lib/prisma`.

- [ ] **Step 1: Script'i yaz**

`scripts/aggregate-area-prices.ts`:

```ts
import { prisma } from '@/lib/prisma'
import { aggregateAreaPrices, type AggregateInputRow } from '@/lib/areaPrices/aggregate'

async function main() {
  const rows = await prisma.marketListing.findMany({
    select: {
      listingType: true,
      pricePerSqm: true,
      status: true,
      il: true,
      ilce: true,
      mahalle: true,
    },
  })

  const stats = aggregateAreaPrices(rows as AggregateInputRow[])
  const computedAt = new Date()

  let written = 0
  for (const s of stats) {
    await prisma.areaPriceStat.upsert({
      where: {
        il_ilce_mahalle: { il: s.il, ilce: s.ilce, mahalle: s.mahalle },
      },
      create: { ...s, computedAt },
      update: {
        scope: s.scope,
        medianPricePerSqm: s.medianPricePerSqm,
        p25: s.p25,
        p75: s.p75,
        sampleCount: s.sampleCount,
        computedAt,
      },
    })
    written++
  }

  const total = await prisma.areaPriceStat.count()
  console.log(
    `✅ ${written} AreaPriceStat satırı yazıldı/güncellendi (${rows.length} ilan tarandı). Tabloda toplam ${total}.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
```

> Not: Prisma'nın compound-unique `where` anahtarı `il_ilce_mahalle` olur (alan sırası `@@unique([il, ilce, mahalle])` ile aynı). `null` bileşenler Prisma'da bu anahtarda geçerlidir.

- [ ] **Step 2: `package.json`'a script ekle**

`scripts` bloğuna, `"db:seed:district-prices"` satırının yanına:

```json
"prices:aggregate": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" -r tsconfig-paths/register scripts/aggregate-area-prices.ts",
```

> `db:seed:district-prices` ile aynı `ts-node` çağrı deseni + `@/` alias'ı için `tsconfig-paths/register` (bkz. `crawl` script'inde aynı gereksinim — commit `7ca904c`).

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: temiz.

- [ ] **Step 4: Dev DB'ye karşı çalıştır**

Run: `npm run prices:aggregate`
Expected: `✅ N AreaPriceStat satırı yazıldı/güncellendi (M ilan tarandı).` — hata yok. (Dev DB'de crawler'ın yazdığı Trabzon `MarketListing` satırları var; en az bir `il`+`ilce` satırı üretilmeli.)

- [ ] **Step 5: İkinci kez çalıştır (idempotent doğrulama)**

Run: `npm run prices:aggregate`
Expected: aynı satır sayısı, hata yok (upsert — yeni satır eklemez).

- [ ] **Step 6: Commit**

```bash
git add scripts/aggregate-area-prices.ts package.json
git commit -m "feat(deger): prices:aggregate script'i (MarketListing → AreaPriceStat)"
```

---

## Task 5: `valuation.ts` — fallback zinciri + değerleme

**Files:**
- Create: `src/lib/areaPrices/valuation.ts`
- Test: `src/lib/areaPrices/valuation.test.ts`

**Interfaces:**
- Produces:
  - `export interface StatLike { medianPricePerSqm: number; p25: number; p75: number; sampleCount: number }`
  - `export interface ValuationInput { areaSqm: number | null; mahalle?: StatLike | null; ilce?: StatLike | null; il?: StatLike | null }`
  - `export type Confidence = 'yuksek' | 'orta' | 'dusuk'`
  - `export type ValuationBasis = 'mahalle' | 'ilce' | 'il'`
  - `export interface ValuationResult { insufficientData: boolean; basis?: ValuationBasis; confidence?: Confidence; thinData?: boolean; estimate?: number; freeRangeLow?: number; freeRangeHigh?: number; memberRangeLow?: number; memberRangeHigh?: number; pricePerSqmCoarse?: number; pricePerSqm?: { mahalle?: number; ilce?: number }; sampleCount?: { mahalle?: number; ilce?: number } }`
  - `export function valuateParcel(input: ValuationInput): ValuationResult`
- Kurallar (spec §"Değerleme mantığı"):
  - fallback: `mahalle` varsa ve `sampleCount ≥ 8` → basis `mahalle`, confidence `yuksek`; yoksa `ilce` varsa ve `sampleCount ≥ 5` → basis `ilce`, confidence `orta`; yoksa `il` varsa → basis `il`, confidence `dusuk`; yoksa `insufficientData: true`.
  - `areaSqm == null || areaSqm <= 0` → `insufficientData: true`.
  - Bir seviye ancak `medianPricePerSqm > 0` ise geçerli sayılır (bozuk veri guard'ı).
  - `estimate = round(basisStat.medianPricePerSqm * areaSqm)`
  - `freeRangeLow/High = round(median * 0.75 * area)` / `round(median * 1.25 * area)`
  - `memberRangeLow/High = round(p25 * area)` / `round(p75 * area)`
  - `pricePerSqmCoarse = round100(basisStat.medianPricePerSqm)` (en yakın 100)
  - `pricePerSqm.mahalle` = `mahalle` stat varsa `round(mahalle.medianPricePerSqm)`; `pricePerSqm.ilce` = `ilce` stat varsa `round(ilce.medianPricePerSqm)` (basis ne olursa olsun ikisi de doldurulur, veri varsa)
  - `sampleCount.mahalle` / `sampleCount.ilce` — aynı mantık
  - `thinData = basis === 'il' || basisStat.sampleCount < 10`

- [ ] **Step 1: Failing test yaz**

`src/lib/areaPrices/valuation.test.ts`:

```ts
import { valuateParcel, type StatLike } from './valuation'

const stat = (over: Partial<StatLike>): StatLike => ({
  medianPricePerSqm: 1000,
  p25: 800,
  p75: 1200,
  sampleCount: 10,
  ...over,
})

describe('valuateParcel', () => {
  it('mahalle 8+ örneklem → basis mahalle, güven yüksek', () => {
    const r = valuateParcel({
      areaSqm: 500,
      mahalle: stat({ medianPricePerSqm: 2000, p25: 1800, p75: 2400, sampleCount: 12 }),
      ilce: stat({ sampleCount: 40 }),
      il: stat({ sampleCount: 200 }),
    })
    expect(r.insufficientData).toBe(false)
    expect(r.basis).toBe('mahalle')
    expect(r.confidence).toBe('yuksek')
    expect(r.estimate).toBe(1_000_000) // 2000 * 500
    expect(r.freeRangeLow).toBe(750_000) // 2000*0.75*500
    expect(r.freeRangeHigh).toBe(1_250_000)
    expect(r.memberRangeLow).toBe(900_000) // 1800*500
    expect(r.memberRangeHigh).toBe(1_200_000)
    expect(r.pricePerSqmCoarse).toBe(2000)
    expect(r.thinData).toBe(false)
  })

  it('mahalle < 8 ama ilçe ≥ 5 → basis ilçe, güven orta, mahalle ₺/m² yine döndürülür', () => {
    const r = valuateParcel({
      areaSqm: 100,
      mahalle: stat({ medianPricePerSqm: 3000, sampleCount: 6 }),
      ilce: stat({ medianPricePerSqm: 2500, sampleCount: 20 }),
      il: stat({ sampleCount: 500 }),
    })
    expect(r.basis).toBe('ilce')
    expect(r.confidence).toBe('orta')
    expect(r.pricePerSqm).toEqual({ mahalle: 3000, ilce: 2500 })
    expect(r.sampleCount).toEqual({ mahalle: 6, ilce: 20 })
    expect(r.estimate).toBe(250_000)
  })

  it('yalnızca il → basis il, güven düşük, thinData true', () => {
    const r = valuateParcel({ areaSqm: 100, il: stat({ medianPricePerSqm: 1500, sampleCount: 300 }) })
    expect(r.basis).toBe('il')
    expect(r.confidence).toBe('dusuk')
    expect(r.thinData).toBe(true)
  })

  it('hiç veri yok → insufficientData', () => {
    const r = valuateParcel({ areaSqm: 100 })
    expect(r.insufficientData).toBe(true)
    expect(r.estimate).toBeUndefined()
  })

  it('areaSqm null veya 0 → insufficientData', () => {
    expect(valuateParcel({ areaSqm: null, mahalle: stat({ sampleCount: 20 }) }).insufficientData).toBe(true)
    expect(valuateParcel({ areaSqm: 0, mahalle: stat({ sampleCount: 20 }) }).insufficientData).toBe(true)
  })

  it('basis örneklem < 10 → thinData true (basis mahalle olsa bile)', () => {
    const r = valuateParcel({ areaSqm: 100, mahalle: stat({ sampleCount: 9 }) })
    expect(r.basis).toBe('mahalle')
    expect(r.thinData).toBe(true)
  })

  it('medianPricePerSqm 0/negatif olan seviye yok sayılır', () => {
    const r = valuateParcel({
      areaSqm: 100,
      mahalle: stat({ medianPricePerSqm: 0, sampleCount: 50 }),
      ilce: stat({ medianPricePerSqm: 2000, sampleCount: 50 }),
    })
    expect(r.basis).toBe('ilce')
  })

  it('pricePerSqmCoarse en yakın 100e yuvarlanır', () => {
    const r = valuateParcel({ areaSqm: 100, mahalle: stat({ medianPricePerSqm: 3748, sampleCount: 20 }) })
    expect(r.pricePerSqmCoarse).toBe(3700)
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/areaPrices/valuation.test.ts`
Expected: FAIL — "Cannot find module './valuation'".

- [ ] **Step 3: Minimal implementasyon**

`src/lib/areaPrices/valuation.ts`:

```ts
export interface StatLike {
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface ValuationInput {
  areaSqm: number | null
  mahalle?: StatLike | null
  ilce?: StatLike | null
  il?: StatLike | null
}

export type Confidence = 'yuksek' | 'orta' | 'dusuk'
export type ValuationBasis = 'mahalle' | 'ilce' | 'il'

export interface ValuationResult {
  insufficientData: boolean
  basis?: ValuationBasis
  confidence?: Confidence
  thinData?: boolean
  estimate?: number
  freeRangeLow?: number
  freeRangeHigh?: number
  memberRangeLow?: number
  memberRangeHigh?: number
  pricePerSqmCoarse?: number
  pricePerSqm?: { mahalle?: number; ilce?: number }
  sampleCount?: { mahalle?: number; ilce?: number }
}

const valid = (s?: StatLike | null): s is StatLike =>
  !!s && Number.isFinite(s.medianPricePerSqm) && s.medianPricePerSqm > 0

const round = (n: number) => Math.round(n)
const round100 = (n: number) => Math.round(n / 100) * 100

export function valuateParcel(input: ValuationInput): ValuationResult {
  const area = input.areaSqm
  if (area == null || !Number.isFinite(area) || area <= 0) {
    return { insufficientData: true }
  }

  const mahalle = valid(input.mahalle) ? input.mahalle : null
  const ilce = valid(input.ilce) ? input.ilce : null
  const il = valid(input.il) ? input.il : null

  let basis: ValuationBasis
  let basisStat: StatLike
  let confidence: Confidence

  if (mahalle && mahalle.sampleCount >= 8) {
    basis = 'mahalle'
    basisStat = mahalle
    confidence = 'yuksek'
  } else if (ilce && ilce.sampleCount >= 5) {
    basis = 'ilce'
    basisStat = ilce
    confidence = 'orta'
  } else if (il) {
    basis = 'il'
    basisStat = il
    confidence = 'dusuk'
  } else {
    return { insufficientData: true }
  }

  const pricePerSqm: { mahalle?: number; ilce?: number } = {}
  const sampleCount: { mahalle?: number; ilce?: number } = {}
  if (mahalle) {
    pricePerSqm.mahalle = round(mahalle.medianPricePerSqm)
    sampleCount.mahalle = mahalle.sampleCount
  }
  if (ilce) {
    pricePerSqm.ilce = round(ilce.medianPricePerSqm)
    sampleCount.ilce = ilce.sampleCount
  }

  return {
    insufficientData: false,
    basis,
    confidence,
    thinData: basis === 'il' || basisStat.sampleCount < 10,
    estimate: round(basisStat.medianPricePerSqm * area),
    freeRangeLow: round(basisStat.medianPricePerSqm * 0.75 * area),
    freeRangeHigh: round(basisStat.medianPricePerSqm * 1.25 * area),
    memberRangeLow: round(basisStat.p25 * area),
    memberRangeHigh: round(basisStat.p75 * area),
    pricePerSqmCoarse: round100(basisStat.medianPricePerSqm),
    pricePerSqm,
    sampleCount,
  }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/areaPrices/valuation.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaPrices/valuation.ts src/lib/areaPrices/valuation.test.ts
git commit -m "feat(deger): valuateParcel — kademeli değerleme (saf)"
```

---

## Task 6: `formatDistance` ortak yardımcıya çıkar

**Files:**
- Create: `src/lib/risk/formatDistance.ts`
- Create: `src/lib/risk/formatDistance.test.ts`
- Modify: `src/components/risk/RiskSuggestionCard.tsx` (yerel `formatDistance` fonksiyonunu sil, import et)

**Interfaces:**
- Produces: `export function formatFaultDistance(m: number | null): string` — `m === null` → `"25 km'den uzak"`; `m >= 1000` → `"1,8 km"` (bir ondalık, virgül); aksi → `"850 m"`. (`RiskSuggestionCard`'ın mevcut davranışı BİREBİR.)

- [ ] **Step 1: Failing test yaz**

`src/lib/risk/formatDistance.test.ts`:

```ts
import { formatFaultDistance } from './formatDistance'

describe('formatFaultDistance', () => {
  it('null → 25 km üstü metni', () => {
    expect(formatFaultDistance(null)).toBe('25 km’den uzak')
  })
  it('1000 m ve üstü → km, bir ondalık, virgül', () => {
    expect(formatFaultDistance(1800)).toBe('1,8 km')
    expect(formatFaultDistance(12000)).toBe('12,0 km')
  })
  it('1000 m altı → metre', () => {
    expect(formatFaultDistance(850)).toBe('850 m')
  })
})
```

> Not: mevcut kodda apostrof "'" (U+2019) kullanılıyor — testte de aynı karakter.

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/risk/formatDistance.test.ts`
Expected: FAIL — "Cannot find module './formatDistance'".

- [ ] **Step 3: Yardımcıyı yaz**

`src/lib/risk/formatDistance.ts`:

```ts
/** Diri fay mesafesi metni. RiskSuggestionCard'ın eski yerel fonksiyonundan çıkarıldı. */
export function formatFaultDistance(m: number | null): string {
  if (m === null) return '25 km’den uzak'
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}
```

- [ ] **Step 4: `RiskSuggestionCard`'ı güncelle**

`src/components/risk/RiskSuggestionCard.tsx`:
- `import` bloğuna: `import { formatFaultDistance } from '@/lib/risk/formatDistance'`
- Dosyadaki yerel `function formatDistance(m: number | null): string { ... }` tanımını SİL
- Kullanım yerini değiştir: `{formatDistance(risk.faultDistanceM)}` → `{formatFaultDistance(risk.faultDistanceM)}`

- [ ] **Step 5: Testler + regresyon**

Run: `npx jest src/lib/risk/formatDistance.test.ts src/components/risk/RiskSuggestionCard.test.tsx`
Expected: PASS — hem yeni yardımcı testi hem mevcut `RiskSuggestionCard` testi (özellikle "mesafeyi ... gosterir" ve "fay bulunamadiysa ... 25 km disi der").

- [ ] **Step 6: Commit**

```bash
git add src/lib/risk/formatDistance.ts src/lib/risk/formatDistance.test.ts src/components/risk/RiskSuggestionCard.tsx
git commit -m "refactor(risk): formatFaultDistance ortak yardımcıya çıkarıldı"
```

---

## Task 7: `card.ts` — orkestrasyon + DTO

**Files:**
- Create: `src/lib/deger/card.ts`
- Test: `src/lib/deger/card.test.ts`

**Interfaces:**
- Consumes:
  - `valuateParcel`, `ValuationResult` from `@/lib/areaPrices/valuation`
  - `ParcelInfo`, `ParcelLookupResult` from `@/lib/tkgm/parcel` (`fetchParcelByPoint`, `fetchParcelByAdaParsel` — DI ile geçilir)
  - `buildRiskSnapshot` from `@/lib/risk/riskSnapshot` (DI ile geçilir) — dönüş `{ faultDistanceM: number|null, floodQ100: boolean|null, riskSnapshotAt: Date|null }`
  - Prisma `areaPriceStat.findMany` (DI ile geçilir)
- Produces:
  - `export type DegerCardInput = { kind: 'point'; lat: number; lng: number } | { kind: 'adaParsel'; mahalleId: number; ada: string; parsel: string }`
  - `export interface DegerCardDeps { fetchParcelByPoint: (lat: number, lng: number) => Promise<ParcelLookupResult>; fetchParcelByAdaParsel: (mahalleId: number, ada: string, parsel: string) => Promise<ParcelLookupResult>; buildRiskSnapshot: (lat: number | null, lng: number | null) => Promise<{ faultDistanceM: number | null; floodQ100: boolean | null; riskSnapshotAt: Date | null }>; findAreaStats: (il: string, ilce: string, mahalle: string) => Promise<AreaStatRecord[]> }`
  - `export interface AreaStatRecord { scope: 'il' | 'ilce' | 'mahalle'; medianPricePerSqm: number; p25: number; p75: number; sampleCount: number }`
  - `export interface DegerCardResult { ok: true; card: DegerCardDTO } | { ok: false; reason: 'parcel_not_found' | 'parcel_unavailable' }`
  - `export interface DegerCardDTO { parcel: {...}; risk: {...}; value: DegerCardValue }` (aşağıdaki implementasyonda tam)
  - `export function buildDegerCard(input: DegerCardInput, deps: DegerCardDeps, opts: { memberView: boolean }): Promise<DegerCardResult>`
- Kurallar:
  - `kind: 'point'` → `fetchParcelByPoint`; `kind: 'adaParsel'` → `fetchParcelByAdaParsel`.
  - Parsel `{ ok: false, reason: 'not_found' }` → sonuç `{ ok: false, reason: 'parcel_not_found' }`. `'unavailable'` → `'parcel_unavailable'`.
  - Parsel bulundu → `buildRiskSnapshot(parcel merkezi lat/lng)` çağrılır. `kind: 'point'` için verilen lat/lng; `kind: 'adaParsel'` için parsel geometrisinin ilk koordinatı (aşağıda `parcelCentroidLatLng` yardımcısı).
  - `findAreaStats(UP(il), UP(ilce), UP(mahalle))` çağrılır; dönen kayıtlar `scope`'a göre `{ mahalle, ilce, il }` slotlarına yerleştirilir.
  - `valuateParcel({ areaSqm: parcel.areaSqm, mahalle, ilce, il })` çağrılır.
  - `risk.status`: `riskSnapshotAt == null && faultDistanceM == null && floodQ100 == null` → `'unavailable'`; aksi `'ok'`.
  - `value` bloğu: her zaman `tier` + (`insufficientData` VEYA ücretsiz alanlar). `memberView === true` ise üye alanları da eklenir.
  - `feasibilityHref`: v1'de sabit `'/hesapla'` (spec — prefill kontratı ayrı iyileştirme). `memberView` ise doldurulur, değilse yok.

- [ ] **Step 1: Failing test yaz**

`src/lib/deger/card.test.ts`:

```ts
import { buildDegerCard, type DegerCardDeps } from './card'

const PARCEL = {
  il: 'Trabzon',
  ilce: 'Ortahisar',
  mahalle: 'Uğurlu',
  adaNo: '142',
  parselNo: '7',
  areaSqm: 500,
  quality: 'Arsa',
  geometry: { type: 'Polygon' as const, coordinates: [[[39.7, 41.0], [39.71, 41.0], [39.71, 41.01], [39.7, 41.0]]] },
}

function deps(over: Partial<DegerCardDeps> = {}): DegerCardDeps {
  return {
    fetchParcelByPoint: jest.fn().mockResolvedValue({ ok: true, parcel: PARCEL }),
    fetchParcelByAdaParsel: jest.fn().mockResolvedValue({ ok: true, parcel: PARCEL }),
    buildRiskSnapshot: jest.fn().mockResolvedValue({ faultDistanceM: 1800, floodQ100: false, riskSnapshotAt: new Date() }),
    findAreaStats: jest.fn().mockResolvedValue([
      { scope: 'mahalle', medianPricePerSqm: 2000, p25: 1800, p75: 2400, sampleCount: 12 },
      { scope: 'ilce', medianPricePerSqm: 1500, p25: 1200, p75: 1800, sampleCount: 40 },
      { scope: 'il', medianPricePerSqm: 1000, p25: 700, p75: 1300, sampleCount: 300 },
    ]),
    ...over,
  }
}

describe('buildDegerCard', () => {
  it('anonim görünüm: üye alanları YOK', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.card.value.tier).toBe('free')
    expect(res.card.value.freeRangeLow).toBeGreaterThan(0)
    expect(res.card.value.pricePerSqmCoarse).toBe(2000)
    expect(res.card.value).not.toHaveProperty('estimate')
    expect(res.card.value).not.toHaveProperty('pricePerSqm')
    expect(res.card.value).not.toHaveProperty('feasibilityHref')
  })

  it('üye görünüm: net değer + kırılım + fizibilite köprüsü', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.value.tier).toBe('member')
    expect(res.card.value.estimate).toBe(1_000_000) // 2000 * 500
    expect(res.card.value.pricePerSqm).toEqual({ mahalle: 2000, ilce: 1500 })
    expect(res.card.value.feasibilityHref).toBe('/hesapla')
  })

  it('parsel bulunamadı → reason parcel_not_found, risk/stat çağrılmaz', async () => {
    const d = deps({ fetchParcelByPoint: jest.fn().mockResolvedValue({ ok: false, reason: 'not_found' }) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    expect(res).toEqual({ ok: false, reason: 'parcel_not_found' })
    expect(d.buildRiskSnapshot).not.toHaveBeenCalled()
    expect(d.findAreaStats).not.toHaveBeenCalled()
  })

  it('risk snapshot boş → risk.status unavailable, kartın kalanı yine üretilir', async () => {
    const d = deps({
      buildRiskSnapshot: jest.fn().mockResolvedValue({ faultDistanceM: null, floodQ100: null, riskSnapshotAt: null }),
    })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.risk.status).toBe('unavailable')
    expect(res.card.value.tier).toBe('free')
  })

  it('hiç AreaPriceStat yok → value.insufficientData, risk + parsel yine var', async () => {
    const d = deps({ findAreaStats: jest.fn().mockResolvedValue([]) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.value.insufficientData).toBe(true)
    expect(res.card.risk.status).toBe('ok')
    expect(res.card.parcel.mahalle).toBe('Uğurlu')
  })

  it('adaParsel girişi → fetchParcelByAdaParsel kullanılır, findAreaStats büyük harfli', async () => {
    const d = deps()
    await buildDegerCard({ kind: 'adaParsel', mahalleId: 123, ada: '142', parsel: '7' }, d, { memberView: false })
    expect(d.fetchParcelByAdaParsel).toHaveBeenCalledWith(123, '142', '7')
    expect(d.findAreaStats).toHaveBeenCalledWith('TRABZON', 'ORTAHİSAR', 'UĞURLU')
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/deger/card.test.ts`
Expected: FAIL — "Cannot find module './card'".

- [ ] **Step 3: Implementasyon**

`src/lib/deger/card.ts`:

```ts
import type { ParcelLookupResult, GeoJSONPolygon } from '@/lib/tkgm/parcel'
import { valuateParcel, type StatLike } from '@/lib/areaPrices/valuation'

const UP = (s: string) => s.toLocaleUpperCase('tr-TR')

export type DegerCardInput =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'adaParsel'; mahalleId: number; ada: string; parsel: string }

export interface AreaStatRecord {
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface RiskSnapshotLike {
  faultDistanceM: number | null
  floodQ100: boolean | null
  riskSnapshotAt: Date | null
}

export interface DegerCardDeps {
  fetchParcelByPoint: (lat: number, lng: number) => Promise<ParcelLookupResult>
  fetchParcelByAdaParsel: (mahalleId: number, ada: string, parsel: string) => Promise<ParcelLookupResult>
  buildRiskSnapshot: (lat: number | null, lng: number | null) => Promise<RiskSnapshotLike>
  findAreaStats: (il: string, ilce: string, mahalle: string) => Promise<AreaStatRecord[]>
}

export interface DegerCardValue {
  tier: 'free' | 'member'
  insufficientData: boolean
  basis?: 'mahalle' | 'ilce' | 'il'
  thinData?: boolean
  // ücretsiz
  freeRangeLow?: number
  freeRangeHigh?: number
  pricePerSqmCoarse?: number
  // üye
  estimate?: number
  memberRangeLow?: number
  memberRangeHigh?: number
  confidence?: 'yuksek' | 'orta' | 'dusuk'
  pricePerSqm?: { mahalle?: number; ilce?: number }
  sampleCount?: { mahalle?: number; ilce?: number }
  feasibilityHref?: string
}

export interface DegerCardDTO {
  parcel: {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
    areaSqm: number
    geometry: GeoJSONPolygon
  }
  risk: {
    faultDistanceM: number | null
    floodQ100: boolean | null
    status: 'ok' | 'unavailable'
  }
  value: DegerCardValue
}

export type DegerCardResult =
  | { ok: true; card: DegerCardDTO }
  | { ok: false; reason: 'parcel_not_found' | 'parcel_unavailable' }

/** Polygon'un ilk halka ilk noktası [lng, lat] → { lat, lng }. */
function firstCoord(geometry: GeoJSONPolygon): { lat: number; lng: number } | null {
  const p = geometry?.coordinates?.[0]?.[0]
  if (!p || p.length < 2) return null
  return { lat: p[1], lng: p[0] }
}

export async function buildDegerCard(
  input: DegerCardInput,
  deps: DegerCardDeps,
  opts: { memberView: boolean },
): Promise<DegerCardResult> {
  const lookup =
    input.kind === 'point'
      ? await deps.fetchParcelByPoint(input.lat, input.lng)
      : await deps.fetchParcelByAdaParsel(input.mahalleId, input.ada, input.parsel)

  if (!lookup.ok) {
    return {
      ok: false,
      reason: lookup.reason === 'not_found' ? 'parcel_not_found' : 'parcel_unavailable',
    }
  }
  const parcel = lookup.parcel

  const center =
    input.kind === 'point'
      ? { lat: input.lat, lng: input.lng }
      : firstCoord(parcel.geometry)

  const [snap, stats] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(UP(parcel.il), UP(parcel.ilce), UP(parcel.mahalle)),
  ])

  const bySlot: { mahalle?: StatLike; ilce?: StatLike; il?: StatLike } = {}
  for (const s of stats) {
    bySlot[s.scope] = {
      medianPricePerSqm: s.medianPricePerSqm,
      p25: s.p25,
      p75: s.p75,
      sampleCount: s.sampleCount,
    }
  }

  const v = valuateParcel({
    areaSqm: parcel.areaSqm,
    mahalle: bySlot.mahalle ?? null,
    ilce: bySlot.ilce ?? null,
    il: bySlot.il ?? null,
  })

  const value: DegerCardValue = { tier: opts.memberView ? 'member' : 'free', insufficientData: v.insufficientData }
  if (!v.insufficientData) {
    value.basis = v.basis
    value.thinData = v.thinData
    value.freeRangeLow = v.freeRangeLow
    value.freeRangeHigh = v.freeRangeHigh
    value.pricePerSqmCoarse = v.pricePerSqmCoarse
    if (opts.memberView) {
      value.estimate = v.estimate
      value.memberRangeLow = v.memberRangeLow
      value.memberRangeHigh = v.memberRangeHigh
      value.confidence = v.confidence
      value.pricePerSqm = v.pricePerSqm
      value.sampleCount = v.sampleCount
      value.feasibilityHref = '/hesapla'
    }
  }

  const riskUnavailable =
    snap.riskSnapshotAt == null && snap.faultDistanceM == null && snap.floodQ100 == null

  return {
    ok: true,
    card: {
      parcel: {
        il: parcel.il,
        ilce: parcel.ilce,
        mahalle: parcel.mahalle,
        ada: parcel.adaNo,
        parsel: parcel.parselNo,
        areaSqm: parcel.areaSqm,
        geometry: parcel.geometry,
      },
      risk: {
        faultDistanceM: snap.faultDistanceM,
        floodQ100: snap.floodQ100,
        status: riskUnavailable ? 'unavailable' : 'ok',
      },
      value,
    },
  }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/deger/card.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deger/card.ts src/lib/deger/card.test.ts
git commit -m "feat(deger): buildDegerCard orkestrasyonu + DTO"
```

---

## Task 8: rate-limit girdileri + `GET /api/deger/kart`

**Files:**
- Modify: `src/lib/rate-limit.ts` (`RATE_LIMITS` bloğu)
- Create: `src/app/api/deger/kart/route.ts`
- Test: `src/app/api/deger/kart/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `buildDegerCard`, `DegerCardInput` from `@/lib/deger/card`; `fetchParcelByPoint`, `fetchParcelByAdaParsel` from `@/lib/tkgm/parcel`; `buildRiskSnapshot` from `@/lib/risk/riskSnapshot`; `prisma` from `@/lib/prisma`; `checkRateLimit`, `getClientIp`, `RATE_LIMITS` from `@/lib/rate-limit`; `getServerSession` + `authOptions`; `isWithinTurkey` from `@/lib/geo/turkeyBounds`.
- Produces: `export async function GET(req: Request): Promise<Response>`
- Query: `?lat&lng` VEYA `?mahalleId&ada&parsel`. `ada`/`parsel` pattern `/^\d{1,7}$/` (mevcut `lookup-by-ada-parsel` deseni). `lat`/`lng` → `isWithinTurkey` guard.
- Rate limit: oturum varsa `RATE_LIMITS.DEGER_KART` + `deger:${userId}`; yoksa `RATE_LIMITS.DEGER_KART_ANON` + `deger:ip:${ip}`.
- `memberView = !!userId`.
- Sonuç: `{ ok: false, reason: 'parcel_not_found' }` → 404 `{ error: 'parcel_not_found' }`; `'parcel_unavailable'` → 503 `{ error: 'parcel_unavailable' }`; `ok` → 200 `card`.
- Geçersiz girdi → 400 `{ error: 'bad_request' }`.

- [ ] **Step 1: `RATE_LIMITS`'e ekle**

`src/lib/rate-limit.ts`, `RATE_LIMITS` objesine (`TKGM_IDARI_YAPI_ANON` satırından sonra):

```ts
    DEGER_KART: { limit: 15, windowMs: 60_000 },      // kullanıcı başına 15/dk (tek çağrı = TKGM + WMS + DB)
    DEGER_KART_ANON: { limit: 4, windowMs: 60_000 },  // IP başına 4/dk (PARCEL_LOOKUP_ANON'dan sıkı)
```

- [ ] **Step 2: Failing test yaz**

`src/app/api/deger/kart/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const buildDegerCardMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
  getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/deger/card', () => ({
  buildDegerCard: (...a: unknown[]) => buildDegerCardMock(...a),
}))
jest.mock('@/lib/tkgm/parcel', () => ({
  fetchParcelByPoint: jest.fn(),
  fetchParcelByAdaParsel: jest.fn(),
}))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { areaPriceStat: { findMany: jest.fn() } } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: {
    DEGER_KART: { limit: 15, windowMs: 60000 },
    DEGER_KART_ANON: { limit: 4, windowMs: 60000 },
  },
}))

import { GET } from '../route'

const CARD = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, freeRangeLow: 1, freeRangeHigh: 2, pricePerSqmCoarse: 2000 },
}

function req(qs: string) {
  return new Request(`http://localhost/api/deger/kart?${qs}`)
}

describe('GET /api/deger/kart', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset().mockResolvedValue(null)
    checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    buildDegerCardMock.mockReset().mockResolvedValue({ ok: true, card: CARD })
  })

  it('anonim: IP anahtarıyla rate-limit, memberView false', async () => {
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(200)
    expect(checkRateLimitMock.mock.calls[0][0]).toBe('deger:ip:203.0.113.9')
    const passedOpts = buildDegerCardMock.mock.calls[0][2]
    expect(passedOpts).toEqual({ memberView: false })
  })

  it('giriş yapılmış: kullanıcı anahtarı, memberView true', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    await GET(req('lat=41.0&lng=39.7'))
    expect(checkRateLimitMock.mock.calls[0][0]).toBe('deger:u1')
    expect(buildDegerCardMock.mock.calls[0][2]).toEqual({ memberView: true })
  })

  it('rate limit aşıldı → 429, buildDegerCard çağrılmaz', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(429)
    expect(buildDegerCardMock).not.toHaveBeenCalled()
  })

  it('ada/parsel girişi → kind adaParsel', async () => {
    await GET(req('mahalleId=123&ada=142&parsel=7'))
    expect(buildDegerCardMock.mock.calls[0][0]).toEqual({ kind: 'adaParsel', mahalleId: 123, ada: '142', parsel: '7' })
  })

  it('geçersiz ada (harf) → 400', async () => {
    const res = await GET(req('mahalleId=123&ada=abc&parsel=7'))
    expect(res.status).toBe(400)
  })

  it('TR dışı koordinat → 400, buildDegerCard çağrılmaz', async () => {
    const res = await GET(req('lat=10&lng=10'))
    expect(res.status).toBe(400)
    expect(buildDegerCardMock).not.toHaveBeenCalled()
  })

  it('eksik parametre → 400', async () => {
    const res = await GET(req('lat=41.0'))
    expect(res.status).toBe(400)
  })

  it('parsel bulunamadı → 404', async () => {
    buildDegerCardMock.mockResolvedValue({ ok: false, reason: 'parcel_not_found' })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'parcel_not_found' })
  })

  it('parsel servis dışı → 503', async () => {
    buildDegerCardMock.mockResolvedValue({ ok: false, reason: 'parcel_unavailable' })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(503)
  })
})
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/api/deger/kart`
Expected: FAIL — "Cannot find module '../route'".

- [ ] **Step 4: Route'u yaz**

`src/app/api/deger/kart/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { fetchParcelByPoint, fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { prisma } from '@/lib/prisma'
import { buildDegerCard, type DegerCardInput, type AreaStatRecord } from '@/lib/deger/card'

const NUM_PATTERN = /^\d{1,7}$/

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined

  const rlKey = userId ? `deger:${userId}` : `deger:ip:${getClientIp(req)}`
  const rlOpts = userId ? RATE_LIMITS.DEGER_KART : RATE_LIMITS.DEGER_KART_ANON
  const rl = checkRateLimit(rlKey, rlOpts)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const latRaw = searchParams.get('lat')
  const lngRaw = searchParams.get('lng')
  const mahalleIdRaw = searchParams.get('mahalleId')
  const ada = searchParams.get('ada')
  const parsel = searchParams.get('parsel')

  let input: DegerCardInput
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!isWithinTurkey(lat, lng)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    input = { kind: 'point', lat, lng }
  } else if (mahalleIdRaw != null && ada != null && parsel != null) {
    const mahalleId = Number(mahalleIdRaw)
    if (!Number.isFinite(mahalleId) || mahalleId <= 0 || !NUM_PATTERN.test(ada) || !NUM_PATTERN.test(parsel)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    input = { kind: 'adaParsel', mahalleId, ada, parsel }
  } else {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const result = await buildDegerCard(
    input,
    {
      fetchParcelByPoint,
      fetchParcelByAdaParsel,
      buildRiskSnapshot,
      findAreaStats: async (il, ilce, mahalle): Promise<AreaStatRecord[]> => {
        const rows = await prisma.areaPriceStat.findMany({
          where: {
            il,
            OR: [
              { ilce: null, mahalle: null },
              { ilce, mahalle: null },
              { ilce, mahalle },
            ],
          },
          select: { scope: true, medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
        })
        return rows as AreaStatRecord[]
      },
    },
    { memberView: !!userId },
  )

  if (!result.ok) {
    const status = result.reason === 'parcel_not_found' ? 404 : 503
    return NextResponse.json({ error: result.reason }, { status })
  }
  return NextResponse.json(result.card)
}
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/api/deger/kart`
Expected: PASS (9 test).

- [ ] **Step 6: Tip + regresyon**

Run: `npx tsc --noEmit && npx jest src/lib/rate-limit` (rate-limit'in mevcut testi varsa)
Expected: temiz / yeşil.

- [ ] **Step 7: Commit**

```bash
git add src/lib/rate-limit.ts src/app/api/deger/kart
git commit -m "feat(deger): GET /api/deger/kart birleşik endpoint + rate-limit"
```

---

## Task 9: `DegerKarti.tsx` bileşeni (Düzen A)

**Files:**
- Create: `src/components/deger/DegerKarti.tsx`
- Create: `src/components/deger/DegerKarti.module.css`
- Test: `src/components/deger/DegerKarti.test.tsx` (`/** @jest-environment jsdom */`)

**Interfaces:**
- Consumes: `DegerCardDTO` from `@/lib/deger/card`; `formatFaultDistance` from `@/lib/risk/formatDistance`.
- Produces:
  - `export interface DegerKartiProps { card: DegerCardDTO; isLoggedIn: boolean; parcelQuery: string /* login callbackUrl'i için, örn "mahalleId=1&ada=2&parsel=3" */ }`
  - `export function DegerKarti(props: DegerKartiProps): JSX.Element`
- Davranış:
  - **Ücretsiz kısım (her zaman):** parsel satırı (`il / ilce mahalle — Ada X, Parsel Y · Z m²`); mini harita placeholder (`div`, geometri ileride — v1'de sadece `data-testid="deger-map"` boş kutu, YAGNI); `value.insufficientData` değilse "Tahmini Değer Aralığı" + `freeRangeLow`–`freeRangeHigh` (`toLocaleString('tr-TR')` + " ₺"); "≈ ₺{pricePerSqmCoarse}/m² bölge medyanı"; risk çipleri.
  - Risk çipleri: `risk.status === 'unavailable'` → tek çip "risk verisi alınamadı". Aksi: fay çipi `Faya {formatFaultDistance(faultDistanceM)}` + taşkın çipi (`floodQ100` true → "Q100 taşkın bölgesi", false → "Taşkın riski yok", null → çip yok).
  - `value.thinData` → `⚠︎` uyarı satırı ("Sınırlı emsal verisine dayanıyor; aralık geniş olabilir.").
  - `value.insufficientData` → değer bloğu yerine "Bu bölge için yeterli emsal verisi yok." metni (risk + parsel yine görünür).
  - **Üye kısmı (divider'dan sonra):**
    - `isLoggedIn === true && !insufficientData` → gerçek içerik: "Net Tahmini Değer" `estimate`; "Dar aralık" `memberRangeLow`–`memberRangeHigh`; "Güven: {confidence}"; mahalle/ilçe ₺/m² satırları (`pricePerSqm.mahalle`/`.ilce` — tanımlıysa); "Bu parselle fizibilite hesapla →" linki `href={value.feasibilityHref}`.
    - `isLoggedIn === false && !insufficientData` → bulanık taklit blok (`aria-hidden`, `.blurred` class) + üstünde örtü: metin "Net değer + mahalle kırılımı" + "Üye Ol" linki `href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`}`.
    - `insufficientData` → üye kısmı render edilmez.
  - **Alt:** pasif metin "Yakında (üyelere): Emsal ilanlar · Fiyat trendi · Uzman görüşü".

- [ ] **Step 1: Failing test yaz**

`src/components/deger/DegerKarti.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DegerKarti } from './DegerKarti'
import type { DegerCardDTO } from '@/lib/deger/card'

const baseCard: DegerCardDTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: {
    tier: 'free',
    insufficientData: false,
    basis: 'ilce',
    thinData: true,
    freeRangeLow: 750000,
    freeRangeHigh: 1250000,
    pricePerSqmCoarse: 2000,
  },
}

const memberValue = {
  tier: 'member' as const,
  insufficientData: false,
  basis: 'ilce' as const,
  thinData: false,
  freeRangeLow: 750000,
  freeRangeHigh: 1250000,
  pricePerSqmCoarse: 2000,
  estimate: 1000000,
  memberRangeLow: 900000,
  memberRangeHigh: 1200000,
  confidence: 'orta' as const,
  pricePerSqm: { mahalle: 2200, ilce: 2000 },
  sampleCount: { mahalle: 6, ilce: 20 },
  feasibilityHref: '/hesapla',
}

it('ücretsiz kısım her zaman render olur', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="mahalleId=1&ada=142&parsel=7" />)
  expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument()
  expect(screen.getByText(/750\.000/)).toBeInTheDocument()
  expect(screen.getByText(/Faya 1,8 km/)).toBeInTheDocument()
})

it('thinData → uyarı satırı', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Sınırlı emsal verisine dayanıyor/i)).toBeInTheDocument()
})

it('oturumsuz → bulanık blok + Üye Ol linki callbackUrl ile', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="mahalleId=1&ada=142&parsel=7" />)
  const link = screen.getByRole('link', { name: /Üye Ol/i })
  expect(link).toHaveAttribute(
    'href',
    '/register?callbackUrl=' + encodeURIComponent('/deger?mahalleId=1&ada=142&parsel=7'),
  )
  expect(screen.queryByText(/Net Tahmini Değer/i)).not.toBeInTheDocument()
})

it('oturumlu → net değer, kırılım, fizibilite linki', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue }} isLoggedIn parcelQuery="q=1" />)
  expect(screen.getByText(/Net Tahmini Değer/i)).toBeInTheDocument()
  expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument()
  expect(screen.getByText(/2\.200/)).toBeInTheDocument() // mahalle ₺/m²
  expect(screen.getByRole('link', { name: /fizibilite hesapla/i })).toHaveAttribute('href', '/hesapla')
  expect(screen.queryByRole('link', { name: /Üye Ol/i })).not.toBeInTheDocument()
})

it('insufficientData → yeterli veri yok metni, üye kısmı yok, risk yine görünür', () => {
  const card: DegerCardDTO = { ...baseCard, value: { tier: 'free', insufficientData: true } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/yeterli emsal verisi yok/i)).toBeInTheDocument()
  expect(screen.queryByText(/Tahmini Değer Aralığı/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Faya 1,8 km/)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Üye Ol/i })).not.toBeInTheDocument()
})

it('risk unavailable → tek çip "risk verisi alınamadı"', () => {
  const card: DegerCardDTO = { ...baseCard, risk: { faultDistanceM: null, floodQ100: null, status: 'unavailable' } }
  render(<DegerKarti card={card} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/risk verisi alınamadı/i)).toBeInTheDocument()
  expect(screen.queryByText(/Faya/)).not.toBeInTheDocument()
})

it('yakında metni her zaman var', () => {
  render(<DegerKarti card={baseCard} isLoggedIn={false} parcelQuery="q=1" />)
  expect(screen.getByText(/Yakında/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/deger/DegerKarti.test.tsx`
Expected: FAIL — "Cannot find module './DegerKarti'".

- [ ] **Step 3: Bileşeni + CSS'i yaz**

`src/components/deger/DegerKarti.module.css` — mobil-öncelikli, sade (memory'deki Apple-restraint tonu: `#f5f5f7` / `#1d1d1f` / `#6e6e73`, tabular-nums). **`composes` KULLANMA** — Next 16 `next build` (Turbopack/lightningcss) `composes`'u `@media` içinde hard-error veriyor ve `npm run dev` / jest bunu yakalamıyor (bkz. [[project-arsabil-kart-dili-revizyonu]] dersi). Düz sınıf yaz:

```css
.card { background: #fff; border: 1px solid #e5e5e7; border-radius: 16px; padding: 18px; max-width: 420px; }
.parcel { font-size: 12px; color: #6e6e73; }
.map { height: 96px; background: #dbe7f3; border-radius: 10px; margin: 10px 0; }
.label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #6e6e73; margin-top: 6px; }
.range { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sub { font-size: 13px; color: #6e6e73; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.chip { font-size: 12px; padding: 4px 9px; border-radius: 999px; background: #f0f0f2; }
.chipWarn { background: #fdecec; color: #b3261e; }
.chipOk { background: #e8f3ec; color: #1e7a3c; }
.caveat { font-size: 11px; color: #8a8a8e; margin-top: 10px; }
.divider { height: 1px; background: #e5e5e7; margin: 16px 0; }
.gatedWrap { position: relative; }
.blurred { filter: blur(4px); opacity: .55; pointer-events: none; user-select: none; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 12px; }
.cta { background: #0a5cff; color: #fff; border-radius: 10px; padding: 9px 18px; font-size: 14px; font-weight: 600; text-decoration: none; }
.memberRow { font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f0f0f2; }
.feasLink { display: inline-block; margin-top: 10px; font-size: 14px; color: #0a5cff; text-decoration: none; }
.soon { font-size: 11px; color: #a1a1a6; margin-top: 14px; }
.insufficient { font-size: 14px; color: #6e6e73; margin: 10px 0; }
```

`src/components/deger/DegerKarti.tsx`:

```tsx
import Link from 'next/link'
import type { DegerCardDTO } from '@/lib/deger/card'
import { formatFaultDistance } from '@/lib/risk/formatDistance'
import styles from './DegerKarti.module.css'

export interface DegerKartiProps {
  card: DegerCardDTO
  isLoggedIn: boolean
  parcelQuery: string
}

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`

const CONFIDENCE_LABEL: Record<string, string> = {
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
}

export function DegerKarti({ card, isLoggedIn, parcelQuery }: DegerKartiProps) {
  const { parcel, risk, value } = card

  return (
    <div className={styles.card}>
      <div className={styles.parcel}>
        {parcel.il} / {parcel.ilce} {parcel.mahalle} — Ada {parcel.ada}, Parsel {parcel.parsel} · {parcel.areaSqm.toLocaleString('tr-TR')} m²
      </div>
      <div className={styles.map} data-testid="deger-map" />

      {value.insufficientData ? (
        <p className={styles.insufficient}>Bu bölge için yeterli emsal verisi yok.</p>
      ) : (
        <>
          <div className={styles.label}>Tahmini Değer Aralığı</div>
          <div className={styles.range}>
            {tl(value.freeRangeLow!)} – {tl(value.freeRangeHigh!)}
          </div>
          <div className={styles.sub}>≈ {value.pricePerSqmCoarse!.toLocaleString('tr-TR')} ₺/m² bölge medyanı</div>
          {value.thinData && (
            <p className={styles.caveat}>⚠︎ Sınırlı emsal verisine dayanıyor; aralık geniş olabilir.</p>
          )}
        </>
      )}

      <div className={styles.chips}>
        {risk.status === 'unavailable' ? (
          <span className={styles.chip}>Risk verisi alınamadı</span>
        ) : (
          <>
            <span className={`${styles.chip} ${styles.chipWarn}`}>
              Faya {formatFaultDistance(risk.faultDistanceM)}
            </span>
            {risk.floodQ100 === true && <span className={`${styles.chip} ${styles.chipWarn}`}>Q100 taşkın bölgesi</span>}
            {risk.floodQ100 === false && <span className={`${styles.chip} ${styles.chipOk}`}>Taşkın riski yok</span>}
          </>
        )}
      </div>

      {!value.insufficientData && (
        <>
          <div className={styles.divider} />
          {isLoggedIn ? (
            <div>
              <div className={styles.label}>Net Tahmini Değer</div>
              <div className={styles.range}>{tl(value.estimate!)}</div>
              <div className={styles.sub}>
                {tl(value.memberRangeLow!)} – {tl(value.memberRangeHigh!)} · Güven: {CONFIDENCE_LABEL[value.confidence!] ?? value.confidence}
              </div>
              {value.pricePerSqm?.mahalle != null && (
                <div className={styles.memberRow}>
                  Mahalle ₺/m²: {value.pricePerSqm.mahalle.toLocaleString('tr-TR')}
                  {value.sampleCount?.mahalle != null && ` (${value.sampleCount.mahalle} emsal)`}
                </div>
              )}
              {value.pricePerSqm?.ilce != null && (
                <div className={styles.memberRow}>
                  İlçe ₺/m²: {value.pricePerSqm.ilce.toLocaleString('tr-TR')}
                  {value.sampleCount?.ilce != null && ` (${value.sampleCount.ilce} emsal)`}
                </div>
              )}
              <Link href={value.feasibilityHref ?? '/hesapla'} className={styles.feasLink}>
                Bu parselle fizibilite hesapla →
              </Link>
            </div>
          ) : (
            <div className={styles.gatedWrap}>
              <div className={styles.blurred} aria-hidden="true">
                <div className={styles.label}>Net Tahmini Değer</div>
                <div className={styles.range}>₺••••••</div>
                <div className={styles.memberRow}>Mahalle ₺/m²: ••••</div>
                <div className={styles.memberRow}>İlçe ₺/m²: ••••</div>
              </div>
              <div className={styles.overlay}>
                <strong>Net değer + mahalle kırılımı</strong>
                <span className={styles.sub}>Ücretsiz üyelikle aç</span>
                <Link
                  href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`}
                  className={styles.cta}
                >
                  Üye Ol
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      <p className={styles.soon}>Yakında (üyelere): Emsal ilanlar · Fiyat trendi · Uzman görüşü</p>
    </div>
  )
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/components/deger/DegerKarti.test.tsx`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/deger/DegerKarti.tsx src/components/deger/DegerKarti.module.css src/components/deger/DegerKarti.test.tsx
git commit -m "feat(deger): DegerKarti bileşeni (Düzen A — kademeli kilit)"
```

---

## Task 10: `/deger` sayfası

**Files:**
- Create: `src/app/deger/page.tsx`
- Create: `src/app/deger/page.module.css`
- Test: `src/app/deger/page.test.tsx` (`/** @jest-environment jsdom */`)

**Interfaces:**
- Consumes: `ManualParcelEntryForm` (`onLocationFound(lat, lng, reference, exactParcel?)`) from `@/components/listing-wizard/ManualParcelEntryForm`; `ParcelPicker` + `ParcelPickerValue` from `@/components/listing-wizard/ParcelPicker`; `DegerKarti` from `@/components/deger/DegerKarti`; `useSession` from `next-auth/react`.
- Davranış:
  - `'use client'` component. Sekme state: `'adaParsel' | 'harita'`, varsayılan `'adaParsel'`.
  - **Ada/Parsel sekmesi:** `<ManualParcelEntryForm onLocationFound={handleManual} />`. `handleManual(lat, lng, reference)` → `mahalleId` gerekli; `reference` içinde `mahalle`/`ada`/`parsel` var ama `mahalleId` YOK → `ManualParcelEntryForm` `onLocationFound`'a `mahalleId` geçmiyor. **Bu yüzden:** ada/parsel yolunda karta `?lat&lng` ile git (form zaten parsel merkezini veriyor). `exactParcel` varsa onun `areaSqm`/`geometry`'si daha güvenilir ama endpoint yine kendi lookup'ını yapar — biz sadece `lat/lng` + `reference` gönderiyoruz. → `fetchCard({ lat, lng })`.
  - **Harita sekmesi:** `ParcelPicker` controlled (`value`/`onChange` local state). `value.status === 'verified'` && `value.lat/lng` → `fetchCard({ lat, lng })`.
  - `fetchCard({lat,lng})`: `GET /api/deger/kart?lat=..&lng=..` → 200 ise `setCard(json)`, `setParcelQuery('lat=..&lng=..')`; 404 → "Parsel bulunamadı"; 503 → "TKGM servisi yanıt vermiyor"; 429 → "Çok fazla sorgu, biraz bekleyin".
  - Kart geldiğinde: `router.replace('/deger?lat=..&lng=..')` (paylaşılabilir URL; `useSearchParams` ile ilk yüklemede varsa otomatik `fetchCard`).
  - `<DegerKarti card={card} isLoggedIn={!!session} parcelQuery={parcelQuery} />`.

> **Not (implementer'a):** `ManualParcelEntryForm` `onLocationFound` imzasında `mahalleId` yok — bu yüzden ada/parsel sekmesi de karta `lat/lng` ile gidiyor. Bu bilinçli: endpoint `kind:'point'` yolu ada/parsel yoluyla aynı parseli çözer (TKGM'de nokta ve ada/parsel sorguları birebir aynı Feature'ı döndürüyor — bkz. `fetchParcelByAdaParsel` JSDoc). `?mahalleId&ada&parsel` query yolu endpoint'te DESTEKLENİYOR ama bu sayfa v1'de kullanmıyor; ileride `ManualParcelEntryForm`'a `mahalleId` eklenirse geçilebilir.

- [ ] **Step 1: Failing test yaz**

`src/app/deger/page.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const replaceMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
jest.mock('@/components/listing-wizard/ManualParcelEntryForm', () => ({
  ManualParcelEntryForm: ({ onLocationFound }: { onLocationFound: (lat: number, lng: number, ref: unknown) => void }) => (
    <button onClick={() => onLocationFound(41.0, 39.7, { il: 'T', ilce: 'O', mahalle: 'U', ada: '142', parsel: '7' })}>
      manuel-bul
    </button>
  ),
}))
jest.mock('@/components/listing-wizard/ParcelPicker', () => ({
  ParcelPicker: () => <div>harita-picker</div>,
}))

import DegerPage from './page'

const CARD = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, basis: 'ilce', thinData: false, freeRangeLow: 750000, freeRangeHigh: 1250000, pricePerSqmCoarse: 2000 },
}

beforeEach(() => {
  replaceMock.mockReset()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => CARD }) as jest.Mock
})

it('ada/parsel sekmesi: parsel çözülünce kart görünür + URL güncellenir', async () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Tahmini Değer Aralığı/i)).toBeInTheDocument())
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/deger/kart?lat=41&lng=39.7')
  expect(replaceMock).toHaveBeenCalledWith('/deger?lat=41&lng=39.7')
})

it('sekme değiştirince harita bileşeni görünür', () => {
  render(<DegerPage />)
  fireEvent.click(screen.getByRole('tab', { name: /Haritadan/i }))
  expect(screen.getByText('harita-picker')).toBeInTheDocument()
})

it('404 → parsel bulunamadı mesajı', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'parcel_not_found' }) })
  render(<DegerPage />)
  fireEvent.click(screen.getByText('manuel-bul'))
  await waitFor(() => expect(screen.getByText(/Parsel bulunamadı/i)).toBeInTheDocument())
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/app/deger/page.test.tsx`
Expected: FAIL — "Cannot find module './page'".

- [ ] **Step 3: Sayfayı + CSS'i yaz**

`src/app/deger/page.module.css`:

```css
.wrap { max-width: 480px; margin: 0 auto; padding: 16px; }
.title { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.subtitle { font-size: 14px; color: #6e6e73; margin-bottom: 16px; }
.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tab { flex: 1; padding: 8px; border: 1px solid #e5e5e7; background: #fff; border-radius: 8px; font-size: 13px; cursor: pointer; }
.tabActive { background: #f0f0f2; font-weight: 600; }
.error { color: #b3261e; font-size: 13px; margin: 12px 0; }
```

`src/app/deger/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ManualParcelEntryForm } from '@/components/listing-wizard/ManualParcelEntryForm'
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker'
import { DegerKarti } from '@/components/deger/DegerKarti'
import type { DegerCardDTO } from '@/lib/deger/card'
import styles from './page.module.css'

type Tab = 'adaParsel' | 'harita'

const ERR: Record<number, string> = {
  404: 'Parsel bulunamadı. Farklı bir nokta veya ada/parsel deneyin.',
  503: 'TKGM servisi şu an yanıt vermiyor. Biraz sonra tekrar deneyin.',
  429: 'Çok fazla sorgu yaptınız. Lütfen biraz bekleyin.',
}

export default function DegerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const [tab, setTab] = useState<Tab>('adaParsel')
  const [card, setCard] = useState<DegerCardDTO | null>(null)
  const [parcelQuery, setParcelQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<ParcelPickerValue>({ lat: null, lng: null, parcel: null, status: 'idle' })
  const didInitFetch = useRef(false)

  const fetchCard = useCallback(
    async (lat: number, lng: number) => {
      setError(null)
      const qs = `lat=${lat}&lng=${lng}`
      const res = await fetch(`/api/deger/kart?${qs}`)
      if (!res.ok) {
        setCard(null)
        setError(ERR[res.status] ?? 'Beklenmeyen bir hata oluştu.')
        return
      }
      const json = (await res.json()) as DegerCardDTO
      setCard(json)
      setParcelQuery(qs)
      router.replace(`/deger?${qs}`)
    },
    [router],
  )

  // Paylaşılan URL ile ilk yükleme
  useEffect(() => {
    if (didInitFetch.current) return
    didInitFetch.current = true
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      void fetchCard(lat, lng)
    }
  }, [searchParams, fetchCard])

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Arsanın tahmini değerini öğren</h1>
      <p className={styles.subtitle}>Ada/parsel gir veya haritadan seç — tahmini değer, ₺/m² ve deprem/taşkın riski.</p>

      <div className={styles.tabs} role="tablist">
        <button role="tab" aria-selected={tab === 'adaParsel'} className={`${styles.tab} ${tab === 'adaParsel' ? styles.tabActive : ''}`} onClick={() => setTab('adaParsel')}>
          Ada / Parsel ile
        </button>
        <button role="tab" aria-selected={tab === 'harita'} className={`${styles.tab} ${tab === 'harita' ? styles.tabActive : ''}`} onClick={() => setTab('harita')}>
          Haritadan seç
        </button>
      </div>

      {tab === 'adaParsel' && (
        <ManualParcelEntryForm onLocationFound={(lat, lng) => void fetchCard(lat, lng)} />
      )}
      {tab === 'harita' && (
        <ParcelPicker
          value={picker}
          onChange={(patch) => {
            setPicker((prev) => {
              const next = { ...prev, ...patch }
              if (next.status === 'verified' && next.lat != null && next.lng != null) {
                void fetchCard(next.lat, next.lng)
              }
              return next
            })
          }}
          hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
          notFoundText="Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın."
          unavailableText="TKGM servisi şu an yanıt vermiyor, biraz sonra tekrar deneyin."
        />
      )}

      {error && <p className={styles.error}>{error}</p>}
      {card && <DegerKarti card={card} isLoggedIn={!!session} parcelQuery={parcelQuery} />}
    </div>
  )
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/app/deger/page.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Regresyon — mevcut bileşen testleri**

Run: `npx jest src/components/listing-wizard/ManualParcelEntryForm.test.tsx src/components/listing-wizard/ParcelPicker.test.tsx src/components/listing-wizard/ParcelPicker.map.test.tsx`
Expected: PASS — `/deger` bu bileşenlere DOKUNMADI (yalnız tüketici), davranışları değişmemeli.

- [ ] **Step 6: Commit**

```bash
git add src/app/deger
git commit -m "feat(deger): /deger sayfası — sekmeli girdi + kart"
```

---

## Task 11: Anasayfa kanca kutusu

**Files:**
- Create: `src/components/home/DegerHookBox.tsx`
- Create: `src/components/home/DegerHookBox.module.css`
- Test: `src/components/home/DegerHookBox.test.tsx` (`/** @jest-environment jsdom */`)
- Modify: `src/app/page.tsx` (hero'nun hemen ardına `<DegerHookBox />`)

**Interfaces:**
- Produces: `export function DegerHookBox(): JSX.Element` — başlık "Arsanın değeri ne kadar?" + kısa açıklama + `<Link href="/deger">` "Değeri Öğren →".

- [ ] **Step 1: Failing test yaz**

`src/components/home/DegerHookBox.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DegerHookBox } from './DegerHookBox'

it('başlık + /deger linki render eder', () => {
  render(<DegerHookBox />)
  expect(screen.getByText(/Arsanın değeri ne kadar/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Değeri Öğren/i })).toHaveAttribute('href', '/deger')
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/components/home/DegerHookBox.test.tsx`
Expected: FAIL — "Cannot find module './DegerHookBox'".

- [ ] **Step 3: Bileşen + CSS**

`src/components/home/DegerHookBox.module.css`:

```css
.box { max-width: 720px; margin: 24px auto; padding: 20px; background: #f5f5f7; border-radius: 16px; text-align: center; }
.title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.desc { font-size: 14px; color: #6e6e73; margin-bottom: 14px; }
.link { display: inline-block; background: #0a5cff; color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; }
```

`src/components/home/DegerHookBox.tsx`:

```tsx
import Link from 'next/link'
import styles from './DegerHookBox.module.css'

export function DegerHookBox() {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>Arsanın değeri ne kadar?</h2>
      <p className={styles.desc}>
        Ada/parsel gir, saniyeler içinde tahmini piyasa değeri, ₺/m² ve deprem/taşkın riskini gör.
      </p>
      <Link href="/deger" className={styles.link}>
        Değeri Öğren →
      </Link>
    </section>
  )
}
```

- [ ] **Step 4: `src/app/page.tsx`'e yerleştir**

`src/app/page.tsx` içinde:
- Üst importlara ekle: `import { DegerHookBox } from '@/components/home/DegerHookBox'`
- `MarketingHomePage()` fonksiyonunda, Hero `<section className={styles.hero}>…</section>` bloğunun kapanışının (`{/* Hero Section */}` bloğu) **hemen ardına**, `{/* Stats Strip */}` / `<StatsStrip />` satırından **önce** şunu yerleştir:

```tsx
      <DegerHookBox />
```

Başka hiçbir şeyi değiştirme. (`HomePage` default export'u, `HomeMobile`, diğer bölümler dokunulmaz.)

- [ ] **Step 5: Testler + regresyon + build**

Run: `npx jest src/components/home/DegerHookBox.test.tsx src/app/page.test.tsx`
Expected: PASS — yeni test + mevcut `page.test.tsx` (anasayfa smoke) yeşil.

Run: `npx tsc --noEmit && npm run build`
Expected: `tsc` temiz, `npm run build` başarılı (Turbopack/lightningcss — yeni CSS modülleri `composes` kullanmıyor, sorun çıkmamalı).

- [ ] **Step 6: Commit**

```bash
git add src/components/home/DegerHookBox.tsx src/components/home/DegerHookBox.module.css src/components/home/DegerHookBox.test.tsx src/app/page.tsx
git commit -m "feat(deger): anasayfa değer kartı kanca kutusu"
```

---

## Final Doğrulama (tüm task'lar bitince)

- [ ] **Tam test paketi:** `npx jest --roots "$(pwd)/src"` → tüm suite yeşil (worktree kullanıldıysa önce `git worktree remove`, bkz. proje deseni).
- [ ] **Tip:** `npx tsc --noEmit` temiz.
- [ ] **Build:** `npm run build` başarılı.
- [ ] **Elle uçtan uca (dev):** `npm run dev`, `arsabil_postgres_dev` ayakta, `npm run prices:aggregate` çalıştırılmış. `http://localhost:3001/deger` → Trabzon'dan bilinen bir ada/parsel gir (ör. crawler verisinde geçen Ortahisar/Uğurlu) → kart görünmeli: ücretsiz aralık + risk çipleri; giriş yapılmamışken üye kısmı bulanık + "Üye Ol". Giriş yap → net değer + kırılım görünmeli.
- [ ] **Anasayfa:** `/` → hook kutusu görünür, "Değeri Öğren" → `/deger`.
- [ ] **Veri az olan yer:** verisi olmayan bir il/parsel → "Bu bölge için yeterli emsal verisi yok" + risk yine görünür (crash yok).

---

## Notlar / bilinen v1 kalıntıları

- `/deger` ada/parsel sekmesi karta `lat/lng` ile gidiyor (`ManualParcelEntryForm.onLocationFound` `mahalleId` vermiyor). Endpoint'in `?mahalleId&ada&parsel` yolu var ve test ediliyor ama sayfa kullanmıyor. `ManualParcelEntryForm`'a `mahalleId` eklemek ayrı bir iyileştirme.
- Mini harita (`DegerKarti` `.map` div'i) v1'de boş placeholder — parsel geometrisini leaflet ile çizmek alt-proje 3'te (emsal harita katmanı) zaten gerekecek, birlikte yapılır.
- `feasibilityHref` sabit `/hesapla` — `/hesapla` parsel prefill query'si eklenince güncellenecek.
- `AreaPriceStat` yalnız Trabzon verisiyle dolu (crawler v1). Diğer iller `insufficientData` yolundan geçer.
