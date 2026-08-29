# İlan Crawler + Veri Hattı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ArsaBil için Sahibinden/Emlakjet/Hepsiemlak'tan satılık arsa+konut ilanlarını lokal Playwright ile çekip normalize eden, `MarketListing` tablosuna yazan bir crawler kurmak.

**Architecture:** Repo içinde `src/` dışında `crawler/` kök klasörü. Saf modüller (adapters, normalize, geocode, dedupe) HTML string / obje alır, cheerio ile parse eder, jest'te fixture ile test edilir. `fetcher/` Playwright'a bağımlı, birim test edilmez. `run.ts` her şeyi bağlar, elle `npm run crawl` ile çalışır. app kodu `crawler/`'dan hiçbir şey import etmez; `next build` crawler'ı görmez.

**Tech Stack:** TypeScript, Playwright (chromium), cheerio, Prisma 5.22 (PostgreSQL), ts-node, jest (ayrı config).

**Spec:** `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md`

## Global Constraints

- Kod yeri: `crawler/` kök klasör, **`src/` dışında**. app kodu crawler'ı import etmez (tek yönlü).
- `crawler/` root `tsconfig.json` `exclude`'una ve `eslint.config.mjs` `globalIgnores`'una eklenir; `next build` ve `npx jest --roots src` etkilenmez.
- Saf modüller (`adapters/*`, `pipeline/normalize.ts`, `pipeline/dedupe.ts`, `pipeline/geocode.ts`): Playwright/DOM/Prisma importu **yok**. Sadece string/obje girer, obje çıkar.
- Canlı ağ jest suite'inde **yok** — fixture / fake / DI.
- v1 il: **Trabzon**. v1 kategori: `arsa` (arsa/arazi) + `konut`. Portallar: `sahibinden`, `emlakjet`, `hepsiemlak`.
- İnsan-benzeri hız: istekler arası 20000–40000 ms rastgele; her 15 istekte 180000–480000 ms mola; tur başına en fazla 300 istek.
- `blocked` tespit edilince tur **anında** durur, tekrar deneme yok, `delisted` adımı atlanır.
- Bir turda `unparseable / found > 0.30` → tur durur (körelen parser).
- Fotoğraflar **yeniden barındırılmaz** — sadece URL saklanır. `sourceUrl` her kayıtta.
- Commit mesajları Türkçe, `feat(crawler):` / `test(crawler):` / `chore(crawler):` öneki.

---

## File Structure

**Yeni:**
- `crawler/tsconfig.json` — crawler derleme ayarı (commonjs, noEmit)
- `crawler/jest.config.js` — crawler test config'i
- `crawler/README.md` — kullanım
- `crawler/config.ts` — `CrawlConfig` tipi + `DEFAULT_CONFIG`
- `crawler/adapters/types.ts` — paylaşılan tipler + `PortalAdapter` arayüzü
- `crawler/adapters/sahibinden.ts`
- `crawler/adapters/emlakjet.ts`
- `crawler/adapters/hepsiemlak.ts`
- `crawler/pipeline/normalize.ts` — `normalizeRaw(raw): NormalizedListing`
- `crawler/pipeline/geocode.ts` — `geocodeListing(n, deps): Promise<GeoResult>` + `createTkgmCentroidResolver()`
- `crawler/pipeline/dedupe.ts` — `findDupes(candidates): Map<string,string>`
- `crawler/pipeline/upsert.ts` — `upsertListing(deps, rec)`, `markDelistedExcept(deps, scope, seenIds)`
- `crawler/fetcher/blockDetector.ts` — `detectBlock(input): BlockResult`
- `crawler/fetcher/browser.ts` — `createFetcher(opts): Promise<Fetcher>`
- `crawler/run.ts` — CLI orkestrasyon
- `crawler/fixtures/*.html` — gerçek portal sayfaları (temizlenmiş)
- `crawler/__tests__/*.test.ts`

**Değişecek:**
- `prisma/schema.prisma` — `MarketListing`, `MarketListingPricePoint`, `CrawlRun`
- `prisma/migrations/*` — yeni migration
- `tsconfig.json` — `exclude`'a `"crawler"`
- `eslint.config.mjs` — `globalIgnores`'a `"crawler/**"`
- `package.json` — `scripts`: `crawl`, `test:crawler`; `devDependencies`: `cheerio`

---

## Task 1: Prisma modelleri + migration + crawler iskeleti

**Files:**
- Modify: `prisma/schema.prisma` (sona 3 model ekle)
- Create: `prisma/migrations/<ts>_add_market_listing/migration.sql` (prisma üretir)
- Modify: `tsconfig.json` (`exclude`)
- Modify: `eslint.config.mjs` (`globalIgnores`)
- Modify: `package.json` (`scripts`, `devDependencies`)
- Create: `crawler/tsconfig.json`
- Create: `crawler/jest.config.js`
- Create: `crawler/README.md`
- Create: `crawler/__tests__/scaffold.test.ts`

**Interfaces:**
- Produces: Prisma modelleri `MarketListing`, `MarketListingPricePoint`, `CrawlRun` (client tipleri: `prisma.marketListing`, `prisma.marketListingPricePoint`, `prisma.crawlRun`). `npm run test:crawler` komutu. `npm run crawl` komutu (henüz `run.ts` yok — Task 13'te).

- [ ] **Step 1: Prisma şemasına modelleri ekle**

`prisma/schema.prisma` sonuna:

```prisma
model MarketListing {
  id              String   @id @default(cuid())
  source          String
  sourceListingId String
  sourceUrl       String
  title           String?
  description     String?  @db.Text
  price           Float?
  currency        String   @default("TRY")
  areaSqm         Float?
  pricePerSqm     Float?
  listingType     String
  imarStatus      String?
  il              String?
  ilce            String?
  mahalle         String?
  adaNo           String?
  parselNo        String?
  lat             Float?
  lng             Float?
  geoPrecision    String?
  photoUrls       String[] @default([])
  listedAt        DateTime?
  status          String   @default("active")
  firstSeenAt     DateTime @default(now())
  lastSeenAt      DateTime @default(now())
  dupeOfId        String?
  rawJson         Json?
  priceHistory    MarketListingPricePoint[]

  @@unique([source, sourceListingId])
  @@index([il, ilce, mahalle])
  @@index([listingType, status])
  @@index([lat, lng])
}

model MarketListingPricePoint {
  id         String        @id @default(cuid())
  listingId  String
  price      Float
  observedAt DateTime      @default(now())
  listing    MarketListing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId])
}

model CrawlRun {
  id               String    @id @default(cuid())
  source           String
  il               String
  category         String
  startedAt        DateTime  @default(now())
  finishedAt       DateTime?
  pagesFetched     Int       @default(0)
  listingsFound    Int       @default(0)
  listingsUpserted Int       @default(0)
  blocked          Boolean   @default(false)
  notes            String?
}
```

- [ ] **Step 2: Migration üret ve uygula (lokal dev DB)**

Run:
```bash
npm run dev:db          # postgres:16 dev container ayakta değilse
npx prisma migrate dev --name add_market_listing
```
Expected: `migration.sql` oluşur, dev DB'ye uygulanır, `prisma generate` çalışır, hata yok.

- [ ] **Step 3: `tsconfig.json` — crawler'ı hariç tut**

`exclude` dizisini şu hale getir:
```json
"exclude": ["node_modules", "crawler"]
```

- [ ] **Step 4: `eslint.config.mjs` — crawler'ı yoksay**

`globalIgnores([...])` listesine ekle:
```js
    "crawler/**",
```

- [ ] **Step 5: `package.json` — script + bağımlılık**

`scripts` içine:
```json
"crawl": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" crawler/run.ts",
"test:crawler": "jest --config crawler/jest.config.js"
```
Sonra:
```bash
npm install --save-dev cheerio
```

- [ ] **Step 6: `crawler/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2021", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": { "@/*": ["../src/*"] }
  },
  "include": ["**/*.ts"],
  "exclude": ["fixtures"]
}
```

- [ ] **Step 7: `crawler/jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
}
```

- [ ] **Step 8: `crawler/README.md`**

```markdown
# ArsaBil İlan Crawler (v1)

Lokal çalışan, elle tetiklenen crawler. Sahibinden / Emlakjet / Hepsiemlak'tan
satılık arsa + konut ilanlarını çeker, normalize eder, `MarketListing`
tablosuna yazar.

## Çalıştırma

```bash
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=5
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --dry-run --limit=1
```

## Test

```bash
npm run test:crawler
```

## Kapsam / sınırlar

Bkz. `docs/superpowers/specs/2026-08-29-ilan-crawler-veri-hatti-design.md` §6.
Otomasyon, proxy, kopya birleştirme, UI gösterimi v1 dışı.

## Fixture yenileme

Portal HTML'i değişince testler kırılır. `crawler/fixtures/` altındaki ilgili
`.html` dosyasını tarayıcıdan "Sayfayı kaydet" ile yenile (kişisel veriyi —
telefon, ilan sahibi adı — sil), testi güncelle.
```

- [ ] **Step 9: `crawler/__tests__/scaffold.test.ts` — duman testi**

```ts
import { PrismaClient } from '@prisma/client'

describe('crawler scaffold', () => {
  it('Prisma client MarketListing modelini tanır', () => {
    const client = new PrismaClient()
    expect(client.marketListing).toBeDefined()
    expect(client.marketListingPricePoint).toBeDefined()
    expect(client.crawlRun).toBeDefined()
  })
})
```

- [ ] **Step 10: Doğrulama**

Run:
```bash
npm run test:crawler
npx tsc -p crawler/tsconfig.json
npx tsc --noEmit          # app typecheck — crawler görülmemeli
npx jest --roots src --listTests | head    # app suite crawler testini toplamamalı
```
Expected: `test:crawler` 1 test PASS; her iki tsc temiz; app jest listesi `crawler/` içermiyor.

- [ ] **Step 11: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tsconfig.json eslint.config.mjs package.json package-lock.json crawler/
git commit -m "feat(crawler): MarketListing modelleri + crawler iskeleti (tsconfig/jest/scripts)"
```

---

## Task 2: Paylaşılan tipler

**Files:**
- Create: `crawler/adapters/types.ts`
- Create: `crawler/__tests__/types.test.ts`

**Interfaces:**
- Produces: `PortalSource`, `ListingCategory`, `ListingStub`, `RawListing`, `ListingType`, `ImarStatus`, `NormalizedListing`, `GeoPrecision`, `GeoResult`, `PortalAdapter`. Tüm sonraki task'lar bu tipleri kullanır.

- [ ] **Step 1: `crawler/adapters/types.ts`**

```ts
export type PortalSource = 'sahibinden' | 'emlakjet' | 'hepsiemlak'
export type ListingCategory = 'arsa' | 'konut'

export type ListingType =
  | 'arsa' | 'tarla' | 'bag' | 'bahce' | 'zeytinlik'
  | 'konut' | 'ticari' | 'arazi' | 'diger'

export type ImarStatus = 'imarli' | 'imarsiz' | 'bilinmiyor'
export type GeoPrecision = 'exact' | 'neighborhood' | 'none'

/** Arama sonuç sayfasından çıkan minimum bilgi. */
export interface ListingStub {
  sourceListingId: string
  detailUrl: string
  rawPrice?: string
  rawArea?: string
  rawTitle?: string
}

/** Detay sayfasından çıkan ham (normalize edilmemiş) kayıt. */
export interface RawListing {
  source: PortalSource
  sourceListingId: string
  sourceUrl: string
  rawTitle?: string
  rawDescription?: string
  rawPrice?: string
  rawArea?: string
  rawType?: string
  rawImarStatus?: string
  rawIl?: string
  rawIlce?: string
  rawMahalle?: string
  rawAdaNo?: string
  rawParselNo?: string
  rawListedAt?: string
  lat?: number
  lng?: number
  photoUrls: string[]
  extra: Record<string, unknown>
}

/** normalize sonrası, DB'ye yazılmaya hazır (geocode hariç). */
export interface NormalizedListing {
  source: PortalSource
  sourceListingId: string
  sourceUrl: string
  title: string | null
  description: string | null
  price: number | null
  currency: 'TRY'
  areaSqm: number | null
  pricePerSqm: number | null
  listingType: ListingType
  imarStatus: ImarStatus
  il: string | null
  ilce: string | null
  mahalle: string | null
  adaNo: string | null
  parselNo: string | null
  lat: number | null
  lng: number | null
  photoUrls: string[]
  listedAt: Date | null
  rawJson: Record<string, unknown>
  notes: string[]
}

export interface GeoResult {
  lat: number | null
  lng: number | null
  geoPrecision: GeoPrecision
}

export interface PortalAdapter {
  source: PortalSource
  searchUrls(il: string, category: ListingCategory, maxPages: number): string[]
  parseSearchPage(html: string): ListingStub[]
  parseDetailPage(html: string, url: string): RawListing
}
```

- [ ] **Step 2: `crawler/__tests__/types.test.ts` — derleme kilidi**

```ts
import type { PortalAdapter, RawListing, NormalizedListing, GeoResult } from '../adapters/types'

it('tipler import edilebiliyor', () => {
  const sample: Pick<RawListing, 'source' | 'photoUrls' | 'extra'> = {
    source: 'sahibinden',
    photoUrls: [],
    extra: {},
  }
  expect(sample.source).toBe('sahibinden')
})
```

- [ ] **Step 3: Doğrulama**

Run: `npm run test:crawler && npx tsc -p crawler/tsconfig.json`
Expected: PASS, tsc temiz.

- [ ] **Step 4: Commit**

```bash
git add crawler/adapters/types.ts crawler/__tests__/types.test.ts
git commit -m "feat(crawler): paylaşılan tipler (RawListing, NormalizedListing, PortalAdapter)"
```

---

## Task 3: normalize modülü

**Files:**
- Create: `crawler/pipeline/normalize.ts`
- Create: `crawler/__tests__/normalize.test.ts`

**Interfaces:**
- Consumes: `RawListing`, `NormalizedListing`, `ListingType`, `ImarStatus` (Task 2)
- Produces: `normalizeRaw(raw: RawListing): NormalizedListing`; yardımcılar `parseTrNumber(s: string): number | null`, `parseTrArea(s: string): number | null`, `mapListingType(rawType?: string, rawImar?: string): { listingType: ListingType; imarStatus: ImarStatus }`, `cleanTrName(s?: string): string | null`, `parseTrDate(s?: string): Date | null`

- [ ] **Step 1: Failing test yaz**

```ts
import { normalizeRaw, parseTrNumber, parseTrArea, mapListingType, cleanTrName, parseTrDate } from '../pipeline/normalize'
import type { RawListing } from '../adapters/types'

describe('parseTrNumber', () => {
  it('binlik ayraçlı fiyatı sayıya çevirir', () => {
    expect(parseTrNumber('1.250.000 TL')).toBe(1250000)
    expect(parseTrNumber('130.000.000 ₺')).toBe(130000000)
    expect(parseTrNumber('7.039')).toBe(7039)
  })
  it('geçersizde null', () => {
    expect(parseTrNumber('Fiyat sorunuz')).toBeNull()
    expect(parseTrNumber('')).toBeNull()
  })
})

describe('parseTrArea', () => {
  it('m² alanını sayıya çevirir', () => {
    expect(parseTrArea('2.430 m²')).toBe(2430)
    expect(parseTrArea('494 m2')).toBe(494)
    expect(parseTrArea('1.396,95 m²')).toBeCloseTo(1396.95)
  })
})

describe('mapListingType', () => {
  it('portal metnini enum + imar durumuna eşler', () => {
    expect(mapListingType('Konut İmarlı Arsa', 'İmarlı')).toEqual({ listingType: 'arsa', imarStatus: 'imarli' })
    expect(mapListingType('Tarla')).toEqual({ listingType: 'tarla', imarStatus: 'imarsiz' })
    expect(mapListingType('Zeytinlik')).toEqual({ listingType: 'zeytinlik', imarStatus: 'imarsiz' })
    expect(mapListingType('Satılık Daire')).toEqual({ listingType: 'konut', imarStatus: 'bilinmiyor' })
    expect(mapListingType('Bilinmeyen Şey')).toEqual({ listingType: 'diger', imarStatus: 'bilinmiyor' })
  })
})

describe('cleanTrName', () => {
  it('mahalle/köy soneklerini ve fazla boşluğu temizler, tr-uppercase yapar', () => {
    expect(cleanTrName('  Denizli   Mah. ')).toBe('DENİZLİ')
    expect(cleanTrName('Uzunkuyu Köyü')).toBe('UZUNKUYU')
    expect(cleanTrName('ORTAHISAR')).toBe('ORTAHISAR')
    expect(cleanTrName(undefined)).toBeNull()
  })
})

describe('parseTrDate', () => {
  it('yaygın tr tarih biçimlerini Date yapar', () => {
    expect(parseTrDate('2025-03-23')?.toISOString().slice(0, 10)).toBe('2025-03-23')
    expect(parseTrDate('23.03.2025')?.toISOString().slice(0, 10)).toBe('2025-03-23')
    expect(parseTrDate('bilinmiyor')).toBeNull()
  })
})

describe('normalizeRaw', () => {
  const base: RawListing = {
    source: 'sahibinden',
    sourceListingId: '123',
    sourceUrl: 'https://www.sahibinden.com/ilan/123',
    rawTitle: 'Satılık İmarlı Arsa',
    rawPrice: '25.000.000 TL',
    rawArea: '494 m²',
    rawType: 'Konut İmarlı Arsa',
    rawImarStatus: 'İmarlı',
    rawIl: 'İzmir',
    rawIlce: 'Urla',
    rawMahalle: 'Denizli Mah.',
    rawListedAt: '17.06.2025',
    photoUrls: ['https://img/1.jpg'],
    extra: { foo: 'bar' },
  }

  it('tam kayıt normalize edilir, ₺/m² hesaplanır', () => {
    const n = normalizeRaw(base)
    expect(n.price).toBe(25000000)
    expect(n.areaSqm).toBe(494)
    expect(n.pricePerSqm).toBeCloseTo(25000000 / 494)
    expect(n.listingType).toBe('arsa')
    expect(n.imarStatus).toBe('imarli')
    expect(n.il).toBe('İZMİR')
    expect(n.ilce).toBe('URLA')
    expect(n.mahalle).toBe('DENİZLİ')
    expect(n.listedAt?.toISOString().slice(0, 10)).toBe('2025-06-17')
    expect(n.rawJson).toEqual(expect.objectContaining({ foo: 'bar' }))
    expect(n.notes).toEqual([])
  })

  it('eksik fiyat/alanda null + not, ₺/m² hesaplanmaz', () => {
    const n = normalizeRaw({ ...base, rawPrice: 'Fiyat sorunuz', rawArea: undefined })
    expect(n.price).toBeNull()
    expect(n.areaSqm).toBeNull()
    expect(n.pricePerSqm).toBeNull()
    expect(n.notes.length).toBeGreaterThan(0)
  })

  it('sayfada lat/lng varsa taşınır', () => {
    const n = normalizeRaw({ ...base, lat: 38.32, lng: 26.76 })
    expect(n.lat).toBe(38.32)
    expect(n.lng).toBe(26.76)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- normalize`
Expected: FAIL — `Cannot find module '../pipeline/normalize'`

- [ ] **Step 3: `crawler/pipeline/normalize.ts` yaz**

```ts
import type { RawListing, NormalizedListing, ListingType, ImarStatus } from '../adapters/types'

export function parseTrNumber(s?: string | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  // tr biçimi: '.' binlik, ',' ondalık
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseTrArea(s?: string | null): number | null {
  if (!s) return null
  const m = s.match(/([\d.,]+)\s*m/i)
  return m ? parseTrNumber(m[1]) : parseTrNumber(s)
}

const TYPE_RULES: Array<{ re: RegExp; type: ListingType }> = [
  { re: /zeytin/i, type: 'zeytinlik' },
  { re: /\bbağ\b/i, type: 'bag' },
  { re: /bahçe/i, type: 'bahce' },
  { re: /tarla/i, type: 'tarla' },
  { re: /ticari|dükkan|işyeri|mağaza|ofis/i, type: 'ticari' },
  { re: /arsa/i, type: 'arsa' },
  { re: /arazi|ham toprak|fundalık|kayalık/i, type: 'arazi' },
  { re: /daire|konut|villa|müstakil|rezidans|yazlık/i, type: 'konut' },
]

export function mapListingType(rawType?: string, rawImar?: string): { listingType: ListingType; imarStatus: ImarStatus } {
  const t = rawType ?? ''
  const listingType = TYPE_RULES.find((r) => r.re.test(t))?.type ?? 'diger'

  let imarStatus: ImarStatus = 'bilinmiyor'
  const imarText = `${rawImar ?? ''} ${t}`
  if (/imarsız|i̇marsız|arazi vasfı/i.test(imarText)) imarStatus = 'imarsiz'
  else if (/imarlı|i̇marlı/i.test(imarText)) imarStatus = 'imarli'
  else if (['tarla', 'bag', 'bahce', 'zeytinlik', 'arazi'].includes(listingType)) imarStatus = 'imarsiz'

  return { listingType, imarStatus }
}

const NAME_SUFFIXES = /\s*(mah(\.|allesi)?|köyü|belde(si)?)\s*$/i

export function cleanTrName(s?: string | null): string | null {
  if (!s) return null
  const trimmed = s.replace(NAME_SUFFIXES, '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.toLocaleUpperCase('tr-TR')
}

export function parseTrDate(s?: string | null): Date | null {
  if (!s) return null
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
  return null
}

export function normalizeRaw(raw: RawListing): NormalizedListing {
  const notes: string[] = []
  const price = parseTrNumber(raw.rawPrice)
  if (price === null) notes.push('fiyat parse edilemedi')
  const areaSqm = parseTrArea(raw.rawArea)
  if (areaSqm === null) notes.push('alan parse edilemedi')
  const pricePerSqm = price !== null && areaSqm !== null && areaSqm > 0 ? price / areaSqm : null

  const { listingType, imarStatus } = mapListingType(raw.rawType, raw.rawImarStatus)

  return {
    source: raw.source,
    sourceListingId: raw.sourceListingId,
    sourceUrl: raw.sourceUrl,
    title: raw.rawTitle?.trim() ?? null,
    description: raw.rawDescription?.trim() ?? null,
    price,
    currency: 'TRY',
    areaSqm,
    pricePerSqm,
    listingType,
    imarStatus,
    il: cleanTrName(raw.rawIl),
    ilce: cleanTrName(raw.rawIlce),
    mahalle: cleanTrName(raw.rawMahalle),
    adaNo: raw.rawAdaNo?.trim() || null,
    parselNo: raw.rawParselNo?.trim() || null,
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lng: typeof raw.lng === 'number' ? raw.lng : null,
    photoUrls: raw.photoUrls ?? [],
    listedAt: parseTrDate(raw.rawListedAt),
    rawJson: { ...raw.extra, _raw: { price: raw.rawPrice, area: raw.rawArea, type: raw.rawType, listedAt: raw.rawListedAt } },
    notes,
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- normalize`
Expected: PASS (tüm describe blokları yeşil)

- [ ] **Step 5: Commit**

```bash
git add crawler/pipeline/normalize.ts crawler/__tests__/normalize.test.ts
git commit -m "feat(crawler): normalize — tr fiyat/alan/tarih parse, tip eşleme, isim temizleme"
```

---

## Task 4: geocode modülü

**Files:**
- Create: `crawler/pipeline/geocode.ts`
- Create: `crawler/__tests__/geocode.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing`, `GeoResult` (Task 2)
- Produces:
  - `interface GeocodeDeps { resolveMahalleCentroid(il: string, ilce: string, mahalle: string): Promise<{ lat: number; lng: number } | null>; isWithinTurkey(lat: number, lng: number): boolean }`
  - `geocodeListing(n: NormalizedListing, deps: GeocodeDeps): Promise<GeoResult>`
  - `createTkgmCentroidResolver(): GeocodeDeps['resolveMahalleCentroid']` (idariYapi fetch'lerini per-run cache ile sarar)

- [ ] **Step 1: Failing test yaz**

```ts
import { geocodeListing, type GeocodeDeps } from '../pipeline/geocode'
import type { NormalizedListing } from '../adapters/types'

const base: NormalizedListing = {
  source: 'sahibinden', sourceListingId: '1', sourceUrl: 'u', title: null, description: null,
  price: null, currency: 'TRY', areaSqm: null, pricePerSqm: null, listingType: 'arsa',
  imarStatus: 'bilinmiyor', il: 'İZMİR', ilce: 'URLA', mahalle: 'DENİZLİ',
  adaNo: null, parselNo: null, lat: null, lng: null, photoUrls: [], listedAt: null,
  rawJson: {}, notes: [],
}

const deps: GeocodeDeps = {
  resolveMahalleCentroid: async (il, ilce, mah) =>
    il === 'İZMİR' && ilce === 'URLA' && mah === 'DENİZLİ' ? { lat: 38.32, lng: 26.76 } : null,
  isWithinTurkey: (lat, lng) => lat > 35 && lat < 43 && lng > 25 && lng < 45,
}

describe('geocodeListing', () => {
  it('sayfadan gelen lat/lng varsa exact', async () => {
    const r = await geocodeListing({ ...base, lat: 38.30, lng: 26.75 }, deps)
    expect(r).toEqual({ lat: 38.30, lng: 26.75, geoPrecision: 'exact' })
  })

  it('lat/lng yok ama Türkiye dışıysa yok sayılır, mahalle centroid denenir', async () => {
    const r = await geocodeListing({ ...base, lat: 0, lng: 0 }, deps)
    expect(r).toEqual({ lat: 38.32, lng: 26.76, geoPrecision: 'neighborhood' })
  })

  it('pin yok → mahalle centroid → neighborhood', async () => {
    const r = await geocodeListing(base, deps)
    expect(r).toEqual({ lat: 38.32, lng: 26.76, geoPrecision: 'neighborhood' })
  })

  it('centroid de bulunamazsa none', async () => {
    const r = await geocodeListing({ ...base, mahalle: 'YOK' }, deps)
    expect(r).toEqual({ lat: null, lng: null, geoPrecision: 'none' })
  })

  it('il/ilçe/mahalle eksikse none', async () => {
    const r = await geocodeListing({ ...base, mahalle: null }, deps)
    expect(r).toEqual({ lat: null, lng: null, geoPrecision: 'none' })
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- geocode`
Expected: FAIL — modül yok

- [ ] **Step 3: `crawler/pipeline/geocode.ts` yaz**

```ts
import type { NormalizedListing, GeoResult } from '../adapters/types'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'

export interface GeocodeDeps {
  resolveMahalleCentroid(il: string, ilce: string, mahalle: string): Promise<{ lat: number; lng: number } | null>
  isWithinTurkey(lat: number, lng: number): boolean
}

export async function geocodeListing(n: NormalizedListing, deps: GeocodeDeps): Promise<GeoResult> {
  if (typeof n.lat === 'number' && typeof n.lng === 'number' && deps.isWithinTurkey(n.lat, n.lng)) {
    return { lat: n.lat, lng: n.lng, geoPrecision: 'exact' }
  }
  if (n.il && n.ilce && n.mahalle) {
    const c = await deps.resolveMahalleCentroid(n.il, n.ilce, n.mahalle)
    if (c && deps.isWithinTurkey(c.lat, c.lng)) {
      return { lat: c.lat, lng: c.lng, geoPrecision: 'neighborhood' }
    }
  }
  return { lat: null, lng: null, geoPrecision: 'none' }
}

/**
 * TKGM idari yapı servisinden mahalle centroid'i çözer. Tek crawl turu boyunca
 * il/ilçe/mahalle listelerini bellekte tutar (idariYapi çağrıları ağ gider).
 * İsimler cleanTrName ile tr-uppercase geldiği için karşılaştırma da öyle yapılır.
 */
export function createTkgmCentroidResolver(): GeocodeDeps['resolveMahalleCentroid'] {
  const ilCache = new Map<string, number>() // İL adı -> id
  const ilceCache = new Map<string, number>() // "İL|İLÇE" -> id
  const mahCache = new Map<string, { lat: number; lng: number } | null>() // "İL|İLÇE|MAH" -> centroid

  const up = (s: string) => s.toLocaleUpperCase('tr-TR')

  return async (il, ilce, mahalle) => {
    const key = `${il}|${ilce}|${mahalle}`
    if (mahCache.has(key)) return mahCache.get(key)!

    try {
      if (ilCache.size === 0) {
        for (const it of await fetchIlListesi()) ilCache.set(up(it.text), it.id)
      }
      const ilId = ilCache.get(il)
      if (!ilId) { mahCache.set(key, null); return null }

      const ilceKey = `${il}|${ilce}`
      if (!ilceCache.has(ilceKey)) {
        for (const it of await fetchIlceListesi(ilId)) ilceCache.set(`${il}|${up(it.text)}`, it.id)
      }
      const ilceId = ilceCache.get(ilceKey)
      if (!ilceId) { mahCache.set(key, null); return null }

      const mahList = await fetchMahalleListesi(ilceId)
      const found = mahList.find((m) => up(m.text.replace(/\s*(mah(\.|allesi)?|köyü)\s*$/i, '').trim()) === mahalle)
      const centroid = found?.centroid ?? null
      mahCache.set(key, centroid)
      return centroid
    } catch {
      mahCache.set(key, null)
      return null
    }
  }
}

export const defaultGeocodeDeps = (): GeocodeDeps => ({
  resolveMahalleCentroid: createTkgmCentroidResolver(),
  isWithinTurkey,
})
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- geocode`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crawler/pipeline/geocode.ts crawler/__tests__/geocode.test.ts
git commit -m "feat(crawler): geocode — sayfa pini → TKGM mahalle centroid → none"
```

---

## Task 5: dedupe modülü

**Files:**
- Create: `crawler/pipeline/dedupe.ts`
- Create: `crawler/__tests__/dedupe.test.ts`

**Interfaces:**
- Consumes: `PortalSource`, `ListingType` (Task 2)
- Produces:
  - `interface DedupeCandidate { id: string; source: PortalSource; ilce: string | null; mahalle: string | null; areaSqm: number | null; price: number | null; listingType: ListingType; firstSeenAt: Date }`
  - `findDupes(candidates: DedupeCandidate[]): Map<string, string>` — anahtar: kopya kaydın id'si, değer: kümedeki en eski `firstSeenAt`'e sahip kaydın id'si ("asıl"). Asıl kayıt haritada yer almaz.

- [ ] **Step 1: Failing test yaz**

```ts
import { findDupes, type DedupeCandidate } from '../pipeline/dedupe'

const c = (over: Partial<DedupeCandidate>): DedupeCandidate => ({
  id: 'x', source: 'sahibinden', ilce: 'URLA', mahalle: 'DENİZLİ',
  areaSqm: 500, price: 10_000_000, listingType: 'arsa',
  firstSeenAt: new Date('2025-01-01'), ...over,
})

describe('findDupes', () => {
  it('farklı portalda aynı ilan → yeni olan asıla işaret eder', () => {
    const a = c({ id: 'a', source: 'sahibinden', firstSeenAt: new Date('2025-01-01') })
    const b = c({ id: 'b', source: 'emlakjet', firstSeenAt: new Date('2025-02-01') })
    const map = findDupes([a, b])
    expect(map.get('b')).toBe('a')
    expect(map.has('a')).toBe(false)
  })

  it('alan ±%5, fiyat ±%3 toleransı', () => {
    const a = c({ id: 'a', areaSqm: 500, price: 10_000_000 })
    const b = c({ id: 'b', source: 'hepsiemlak', areaSqm: 520, price: 10_250_000, firstSeenAt: new Date('2025-03-01') })
    expect(findDupes([a, b]).get('b')).toBe('a')
  })

  it('farklı mahalle → kopya değil', () => {
    const a = c({ id: 'a', mahalle: 'DENİZLİ' })
    const b = c({ id: 'b', mahalle: 'İSKELE', firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('fiyat ya da alan null → eşleştirme yapılmaz', () => {
    const a = c({ id: 'a', price: null })
    const b = c({ id: 'b', price: null, firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('aynı portalda iki kayıt kopya sayılmaz (portal kendi içinde tekrarlamaz)', () => {
    const a = c({ id: 'a', source: 'sahibinden' })
    const b = c({ id: 'b', source: 'sahibinden', firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('üçlü küme: en eskisi asıl, diğer ikisi ona işaret eder', () => {
    const a = c({ id: 'a', source: 'sahibinden', firstSeenAt: new Date('2025-01-01') })
    const b = c({ id: 'b', source: 'emlakjet', firstSeenAt: new Date('2025-02-01') })
    const d = c({ id: 'd', source: 'hepsiemlak', firstSeenAt: new Date('2025-03-01') })
    const map = findDupes([a, b, d])
    expect(map.get('b')).toBe('a')
    expect(map.get('d')).toBe('a')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- dedupe`
Expected: FAIL — modül yok

- [ ] **Step 3: `crawler/pipeline/dedupe.ts` yaz**

```ts
import type { PortalSource, ListingType } from '../adapters/types'

export interface DedupeCandidate {
  id: string
  source: PortalSource
  ilce: string | null
  mahalle: string | null
  areaSqm: number | null
  price: number | null
  listingType: ListingType
  firstSeenAt: Date
}

const AREA_TOL = 0.05
const PRICE_TOL = 0.03

function within(a: number, b: number, tol: number): boolean {
  if (a <= 0 || b <= 0) return false
  return Math.abs(a - b) / Math.max(a, b) <= tol
}

function match(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (a.source === b.source) return false
  if (!a.ilce || !a.mahalle || a.ilce !== b.ilce || a.mahalle !== b.mahalle) return false
  if (a.listingType !== b.listingType) return false
  if (a.areaSqm === null || b.areaSqm === null || a.price === null || b.price === null) return false
  return within(a.areaSqm, b.areaSqm, AREA_TOL) && within(a.price, b.price, PRICE_TOL)
}

/**
 * Union-Find ile kopya kümeleri bulur. Her küme için en eski `firstSeenAt`
 * "asıl" seçilir; kümedeki diğer id'ler -> asıl id map'i döner. Asıl kayıt
 * map'te yer almaz.
 */
export function findDupes(candidates: DedupeCandidate[]): Map<string, string> {
  const parent = new Map<string, string>()
  candidates.forEach((c) => parent.set(c.id, c.id))
  const find = (x: string): string => {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    while (parent.get(x) !== r) { const n = parent.get(x)!; parent.set(x, r); x = n }
    return r
  }
  const union = (x: string, y: string) => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry) }

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (match(candidates[i], candidates[j])) union(candidates[i].id, candidates[j].id)
    }
  }

  const clusters = new Map<string, DedupeCandidate[]>()
  for (const c of candidates) {
    const root = find(c.id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(c)
  }

  const result = new Map<string, string>()
  for (const members of clusters.values()) {
    if (members.length < 2) continue
    const canonical = members.reduce((a, b) => (a.firstSeenAt <= b.firstSeenAt ? a : b))
    for (const m of members) if (m.id !== canonical.id) result.set(m.id, canonical.id)
  }
  return result
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- dedupe`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crawler/pipeline/dedupe.ts crawler/__tests__/dedupe.test.ts
git commit -m "feat(crawler): dedupe — çapraz-portal kopya işaretleme (union-find, alan/fiyat toleransı)"
```

---

## Task 6: upsert modülü

**Files:**
- Create: `crawler/pipeline/upsert.ts`
- Create: `crawler/__tests__/upsert.test.ts`

**Interfaces:**
- Consumes: `NormalizedListing`, `GeoResult`, `PortalSource`, `ListingCategory` (Task 2)
- Produces:
  - `interface UpsertableRecord { normalized: NormalizedListing; geo: GeoResult }`
  - `interface UpsertClient` — çağrılan Prisma metotlarının dar arayüzü (aşağıda)
  - `upsertListing(client: UpsertClient, rec: UpsertableRecord): Promise<{ id: string; created: boolean; priceChanged: boolean }>`
  - `markDelistedExcept(client: UpsertClient, scope: { source: PortalSource; il: string; listingTypes: ListingType[] }, seenIds: string[]): Promise<number>`
  - `writeDupeLinks(client: UpsertClient, links: Map<string, string>): Promise<void>`

- [ ] **Step 1: Failing test yaz**

```ts
import { upsertListing, markDelistedExcept, writeDupeLinks, type UpsertClient, type UpsertableRecord } from '../pipeline/upsert'
import type { NormalizedListing, GeoResult } from '../adapters/types'

function makeFakeClient() {
  const rows: any[] = []
  const pricePoints: any[] = []
  let seq = 0
  const client: UpsertClient = {
    marketListing: {
      findUnique: async ({ where }: any) =>
        rows.find((r) => r.source === where.source_sourceListingId.source && r.sourceListingId === where.source_sourceListingId.sourceListingId) ?? null,
      create: async ({ data }: any) => { const row = { id: `id${++seq}`, ...data }; rows.push(row); return row },
      update: async ({ where, data }: any) => { const row = rows.find((r) => r.id === where.id); Object.assign(row, data); return row },
      findMany: async ({ where }: any) =>
        rows.filter((r) =>
          r.source === where.source && r.il === where.il && r.status === 'active' &&
          where.listingType.in.includes(r.listingType) && !where.id.in.includes(r.id)),
      updateMany: async ({ where, data }: any) => {
        let n = 0
        for (const r of rows) if (where.id.in.includes(r.id)) { Object.assign(r, data); n++ }
        return { count: n }
      },
    },
    marketListingPricePoint: {
      create: async ({ data }: any) => { pricePoints.push(data); return data },
    },
  }
  return { client, rows, pricePoints }
}

const n: NormalizedListing = {
  source: 'sahibinden', sourceListingId: '100', sourceUrl: 'u', title: 't', description: null,
  price: 10_000_000, currency: 'TRY', areaSqm: 500, pricePerSqm: 20000, listingType: 'arsa',
  imarStatus: 'imarli', il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DÜRBİNAR',
  adaNo: null, parselNo: null, lat: null, lng: null, photoUrls: [], listedAt: null,
  rawJson: {}, notes: [],
}
const geo: GeoResult = { lat: 41.0, lng: 39.5, geoPrecision: 'neighborhood' }
const rec: UpsertableRecord = { normalized: n, geo }

describe('upsertListing', () => {
  it('yeni kayıt oluşturur', async () => {
    const { client, rows } = makeFakeClient()
    const r = await upsertListing(client, rec)
    expect(r.created).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0].lat).toBe(41.0)
    expect(rows[0].geoPrecision).toBe('neighborhood')
  })

  it('tekrar görülünce günceller, lastSeenAt ilerler, yeni satır yok', async () => {
    const { client, rows } = makeFakeClient()
    await upsertListing(client, rec)
    const before = rows[0].lastSeenAt
    await new Promise((res) => setTimeout(res, 5))
    const r = await upsertListing(client, rec)
    expect(r.created).toBe(false)
    expect(rows).toHaveLength(1)
    expect(rows[0].lastSeenAt.getTime()).toBeGreaterThan(before.getTime())
  })

  it('fiyat değişince PricePoint eklenir ve priceChanged=true', async () => {
    const { client, pricePoints } = makeFakeClient()
    await upsertListing(client, rec)
    const r = await upsertListing(client, { ...rec, normalized: { ...n, price: 12_000_000, pricePerSqm: 24000 } })
    expect(r.priceChanged).toBe(true)
    expect(pricePoints).toHaveLength(1)
    expect(pricePoints[0].price).toBe(12_000_000)
  })
})

describe('markDelistedExcept', () => {
  it('turda görülmeyen active ilanları delisted yapar', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '200' } })
    const count = await markDelistedExcept(
      client,
      { source: 'sahibinden', il: 'TRABZON', listingTypes: ['arsa'] },
      [a.id], // sadece a görüldü
    )
    expect(count).toBe(1)
    expect(rows.find((r) => r.id === b.id).status).toBe('delisted')
    expect(rows.find((r) => r.id === a.id).status).toBe('active')
  })
})

describe('writeDupeLinks', () => {
  it('dupeOfId yazar', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '201' } })
    await writeDupeLinks(client, new Map([[b.id, a.id]]))
    expect(rows.find((r) => r.id === b.id).dupeOfId).toBe(a.id)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- upsert`
Expected: FAIL — modül yok

- [ ] **Step 3: `crawler/pipeline/upsert.ts` yaz**

```ts
import type { NormalizedListing, GeoResult, PortalSource, ListingType } from '../adapters/types'

export interface UpsertableRecord {
  normalized: NormalizedListing
  geo: GeoResult
}

export interface UpsertClient {
  marketListing: {
    findUnique(args: { where: { source_sourceListingId: { source: string; sourceListingId: string } } }): Promise<any | null>
    create(args: { data: any }): Promise<{ id: string }>
    update(args: { where: { id: string }; data: any }): Promise<any>
    findMany(args: { where: any }): Promise<Array<{ id: string }>>
    updateMany(args: { where: any; data: any }): Promise<{ count: number }>
  }
  marketListingPricePoint: {
    create(args: { data: { listingId: string; price: number } }): Promise<any>
  }
}

function toData(rec: UpsertableRecord) {
  const n = rec.normalized
  return {
    source: n.source,
    sourceListingId: n.sourceListingId,
    sourceUrl: n.sourceUrl,
    title: n.title,
    description: n.description,
    price: n.price,
    currency: n.currency,
    areaSqm: n.areaSqm,
    pricePerSqm: n.pricePerSqm,
    listingType: n.listingType,
    imarStatus: n.imarStatus,
    il: n.il,
    ilce: n.ilce,
    mahalle: n.mahalle,
    adaNo: n.adaNo,
    parselNo: n.parselNo,
    lat: rec.geo.lat,
    lng: rec.geo.lng,
    geoPrecision: rec.geo.geoPrecision,
    photoUrls: n.photoUrls,
    listedAt: n.listedAt,
    rawJson: n.rawJson as any,
  }
}

export async function upsertListing(
  client: UpsertClient,
  rec: UpsertableRecord,
): Promise<{ id: string; created: boolean; priceChanged: boolean }> {
  const n = rec.normalized
  const existing = await client.marketListing.findUnique({
    where: { source_sourceListingId: { source: n.source, sourceListingId: n.sourceListingId } },
  })
  const data = toData(rec)

  if (!existing) {
    const created = await client.marketListing.create({ data })
    return { id: created.id, created: true, priceChanged: false }
  }

  const priceChanged = n.price !== null && existing.price !== n.price
  await client.marketListing.update({
    where: { id: existing.id },
    data: { ...data, lastSeenAt: new Date(), status: 'active' },
  })
  if (priceChanged) {
    await client.marketListingPricePoint.create({ data: { listingId: existing.id, price: n.price! } })
  }
  return { id: existing.id, created: false, priceChanged }
}

export async function markDelistedExcept(
  client: UpsertClient,
  scope: { source: PortalSource; il: string; listingTypes: ListingType[] },
  seenIds: string[],
): Promise<number> {
  const stale = await client.marketListing.findMany({
    where: {
      source: scope.source,
      il: scope.il,
      status: 'active',
      listingType: { in: scope.listingTypes },
      id: { in: seenIds }, // fake client bunu "hariç tut" olarak ele alır; gerçek Prisma'da notIn kullanılır (Step 4 notu)
    },
  })
  if (stale.length === 0) return 0
  const res = await client.marketListing.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: { status: 'delisted' },
  })
  return res.count
}

export async function writeDupeLinks(client: UpsertClient, links: Map<string, string>): Promise<void> {
  for (const [dupId, canonicalId] of links) {
    await client.marketListing.update({ where: { id: dupId }, data: { dupeOfId: canonicalId } })
  }
}
```

> **Step 4 notu (gerçek Prisma farkı):** yukarıdaki fake client `id: { in: seenIds }` ifadesini "görülenleri getir" gibi yorumluyor; testte `findMany` fake'i `!where.id.in.includes(r.id)` ile TERSİNİ uyguluyor. Gerçek `run.ts` çağrısında `where.id`'yi `{ notIn: seenIds }` yapıp fake'teki yorum farkını gidereceğiz — bunu Task 13'te `run.ts` içinde `markDelistedExcept`'i çağırırken değil, burada düzeltmek için: `markDelistedExcept` imzasını koruyup gövdesinde `id: { notIn: seenIds }` kullan ve fake client'ın `findMany`'sini de `notIn` semantiğine göre yaz. **Uygulayıcı: testteki fake `findMany`'yi `!where.id.notIn.includes(r.id)` yap ve implementasyonda `notIn` kullan; iki taraf da tutarlı olsun.**

- [ ] **Step 4: Testi (düzeltilmiş fake ile) çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- upsert`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crawler/pipeline/upsert.ts crawler/__tests__/upsert.test.ts
git commit -m "feat(crawler): upsert — kayıt yaşam döngüsü, fiyat geçmişi, delisted, dupe linkleri (DI'lı client)"
```

---

## Task 7: blockDetector modülü

**Files:**
- Create: `crawler/fetcher/blockDetector.ts`
- Create: `crawler/__tests__/blockDetector.test.ts`

**Interfaces:**
- Produces:
  - `interface BlockCheckInput { html: string; httpStatus: number; expectedSelector: string; foundListingCount: number }`
  - `interface BlockResult { blocked: boolean; reason: string | null }`
  - `detectBlock(input: BlockCheckInput): BlockResult`

- [ ] **Step 1: Failing test yaz**

```ts
import { detectBlock } from '../fetcher/blockDetector'

const ok = { html: '<div class="results"><div class="card">x</div></div>', httpStatus: 200, expectedSelector: '.results', foundListingCount: 12 }

describe('detectBlock', () => {
  it('normal sayfada blocked=false', () => {
    expect(detectBlock(ok)).toEqual({ blocked: false, reason: null })
  })

  it('HTTP 403/429 → blocked', () => {
    expect(detectBlock({ ...ok, httpStatus: 403 }).blocked).toBe(true)
    expect(detectBlock({ ...ok, httpStatus: 429 }).blocked).toBe(true)
  })

  it('challenge işaretleri → blocked', () => {
    expect(detectBlock({ ...ok, html: '<title>Just a moment...</title>' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: 'lütfen robot olmadığınızı doğrulayın' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: '<iframe src="https://challenges.cloudflare.com/..."></iframe>' }).blocked).toBe(true)
    expect(detectBlock({ ...ok, html: '<div id="px-captcha"></div>' }).blocked).toBe(true)
  })

  it('beklenen konteyner yok → blocked', () => {
    expect(detectBlock({ ...ok, html: '<body>bambaşka</body>' }).blocked).toBe(true)
  })

  it('konteyner var ama 0 ilan (arama sayfasında) → blocked şüphesi', () => {
    expect(detectBlock({ ...ok, foundListingCount: 0 }).blocked).toBe(true)
  })

  it('foundListingCount negatif = "kontrol etme" (detay sayfası) → sadece diğer sinyaller', () => {
    expect(detectBlock({ ...ok, foundListingCount: -1 }).blocked).toBe(false)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- blockDetector`
Expected: FAIL

- [ ] **Step 3: `crawler/fetcher/blockDetector.ts` yaz**

```ts
export interface BlockCheckInput {
  html: string
  httpStatus: number
  expectedSelector: string
  /** arama sayfasında bulunan ilan sayısı; detay sayfasında -1 verilip bu kontrol atlanır */
  foundListingCount: number
}

export interface BlockResult {
  blocked: boolean
  reason: string | null
}

const CHALLENGE_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /just a moment|checking your browser|cf-browser-verification/i, reason: 'cloudflare challenge' },
  { re: /challenges\.cloudflare\.com/i, reason: 'cloudflare turnstile iframe' },
  { re: /px-captcha|_px3|perimeterx/i, reason: 'perimeterx/px captcha' },
  { re: /datadome/i, reason: 'datadome' },
  { re: /hcaptcha\.com|g-recaptcha/i, reason: 'captcha widget' },
  { re: /robot olmad[ıi]ğ[ıi]n[ıi]z[ıi] doğrula|robot musunuz|güvenlik doğrulaması/i, reason: 'tr bot doğrulama metni' },
]

export function detectBlock(input: BlockCheckInput): BlockResult {
  if (input.httpStatus === 403 || input.httpStatus === 429 || input.httpStatus >= 500) {
    return { blocked: true, reason: `http ${input.httpStatus}` }
  }
  for (const p of CHALLENGE_PATTERNS) {
    if (p.re.test(input.html)) return { blocked: true, reason: p.reason }
  }
  if (!input.html.includes(stripSelector(input.expectedSelector))) {
    return { blocked: true, reason: `beklenen konteyner yok: ${input.expectedSelector}` }
  }
  if (input.foundListingCount === 0) {
    return { blocked: true, reason: 'arama sayfasında 0 ilan (muhtemel soft-block)' }
  }
  return { blocked: false, reason: null }
}

/** '.results' / '#px' gibi seçiciden ham metni çıkarır (kaba içerik kontrolü için). */
function stripSelector(sel: string): string {
  return sel.replace(/^[.#]/, '')
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- blockDetector`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crawler/fetcher/blockDetector.ts crawler/__tests__/blockDetector.test.ts
git commit -m "feat(crawler): blockDetector — challenge/captcha/http/boş-sonuç tespiti"
```

---

## Task 8: config modülü

**Files:**
- Create: `crawler/config.ts`
- Create: `crawler/__tests__/config.test.ts`

**Interfaces:**
- Produces:
  - `interface CrawlConfig { minDelayMs; maxDelayMs; breakEveryN; breakMinMs; breakMaxMs; maxRequestsPerRun; detailRefreshDays; perPortalCooldownHours; unparseableAbortRatio }` (hepsi `number`)
  - `DEFAULT_CONFIG: CrawlConfig`
  - `randDelayMs(cfg: CrawlConfig): number`

- [ ] **Step 1: Failing test yaz**

```ts
import { DEFAULT_CONFIG, randDelayMs } from '../config'

describe('config', () => {
  it('varsayılanlar spec ile uyumlu', () => {
    expect(DEFAULT_CONFIG.minDelayMs).toBe(20_000)
    expect(DEFAULT_CONFIG.maxDelayMs).toBe(40_000)
    expect(DEFAULT_CONFIG.maxRequestsPerRun).toBe(300)
    expect(DEFAULT_CONFIG.detailRefreshDays).toBe(7)
    expect(DEFAULT_CONFIG.unparseableAbortRatio).toBe(0.3)
  })
  it('randDelayMs aralık içinde', () => {
    for (let i = 0; i < 50; i++) {
      const d = randDelayMs(DEFAULT_CONFIG)
      expect(d).toBeGreaterThanOrEqual(20_000)
      expect(d).toBeLessThanOrEqual(40_000)
    }
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- config`
Expected: FAIL

- [ ] **Step 3: `crawler/config.ts` yaz**

```ts
export interface CrawlConfig {
  minDelayMs: number
  maxDelayMs: number
  breakEveryN: number
  breakMinMs: number
  breakMaxMs: number
  maxRequestsPerRun: number
  detailRefreshDays: number
  perPortalCooldownHours: number
  unparseableAbortRatio: number
}

export const DEFAULT_CONFIG: CrawlConfig = {
  minDelayMs: 20_000,
  maxDelayMs: 40_000,
  breakEveryN: 15,
  breakMinMs: 180_000,
  breakMaxMs: 480_000,
  maxRequestsPerRun: 300,
  detailRefreshDays: 7,
  perPortalCooldownHours: 12,
  unparseableAbortRatio: 0.3,
}

export function randDelayMs(cfg: CrawlConfig): number {
  return Math.floor(cfg.minDelayMs + Math.random() * (cfg.maxDelayMs - cfg.minDelayMs))
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- config`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crawler/config.ts crawler/__tests__/config.test.ts
git commit -m "feat(crawler): config — hız/mola/eşik varsayılanları + randDelayMs"
```

---

## Task 9: Sahibinden adapter + fixture'lar

**Files:**
- Create: `crawler/fixtures/sahibinden-arsa-search.html` (manuel yakalama)
- Create: `crawler/fixtures/sahibinden-arsa-detail-1.html` (manuel yakalama)
- Create: `crawler/fixtures/sahibinden-konut-detail-1.html` (manuel yakalama)
- Create: `crawler/adapters/sahibinden.ts`
- Create: `crawler/__tests__/sahibinden.test.ts`

**Interfaces:**
- Consumes: `PortalAdapter`, `ListingStub`, `RawListing` (Task 2)
- Produces: `sahibindenAdapter: PortalAdapter` (default export ve isimli export)

- [ ] **Step 1: Fixture'ları yakala (manuel — tarayıcı gerekir)**

Uygulayıcı ya da kullanıcı, tarayıcıda şu sayfaları açıp **"Sayfayı farklı kaydet → Yalnızca HTML"** ile kaydeder; telefon numarası ve ilan sahibi adını dosyadan **siler**:

1. Trabzon satılık arsa arama sonucu (1. sayfa) → `crawler/fixtures/sahibinden-arsa-search.html`
   URL kalıbı: `https://www.sahibinden.com/satilik-arsa/trabzon`
2. O sonuçtan bir arsa ilanının detay sayfası → `crawler/fixtures/sahibinden-arsa-detail-1.html`
3. Trabzon bir satılık konut ilanı detay sayfası → `crawler/fixtures/sahibinden-konut-detail-1.html`

> Fixture yoksa bu task başlayamaz. Kullanıcıya haber ver, sağlanınca devam et.

- [ ] **Step 2: Failing test yaz**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { sahibindenAdapter } from '../adapters/sahibinden'

const fx = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8')

describe('sahibindenAdapter.searchUrls', () => {
  it('il + kategori + sayfa numarasıyla URL üretir', () => {
    const urls = sahibindenAdapter.searchUrls('trabzon', 'arsa', 3)
    expect(urls).toHaveLength(3)
    expect(urls[0]).toContain('trabzon')
    expect(urls[0]).toMatch(/arsa/)
    expect(urls[1]).not.toBe(urls[0]) // sayfalama farklı
  })
})

describe('sahibindenAdapter.parseSearchPage', () => {
  it('arama sonucundan ilan stub çıkarır', () => {
    const stubs = sahibindenAdapter.parseSearchPage(fx('sahibinden-arsa-search.html'))
    expect(stubs.length).toBeGreaterThan(0)
    const s = stubs[0]
    expect(s.sourceListingId).toMatch(/^\d+$/)
    expect(s.detailUrl).toMatch(/^https:\/\/www\.sahibinden\.com\//)
  })
})

describe('sahibindenAdapter.parseDetailPage', () => {
  it('arsa detayından RawListing çıkarır', () => {
    const r = sahibindenAdapter.parseDetailPage(fx('sahibinden-arsa-detail-1.html'), 'https://www.sahibinden.com/ilan/1')
    expect(r.source).toBe('sahibinden')
    expect(r.sourceListingId).toMatch(/\d+/)
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toMatch(/m/)
    expect(r.rawIl).toMatch(/trabzon/i)
    expect(Array.isArray(r.photoUrls)).toBe(true)
    // sahibinden detay sayfasında genelde harita pini var
    expect(typeof r.lat === 'number' || r.lat === undefined).toBe(true)
  })

  it('konut detayından da RawListing çıkarır', () => {
    const r = sahibindenAdapter.parseDetailPage(fx('sahibinden-konut-detail-1.html'), 'https://www.sahibinden.com/ilan/2')
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawType).toBeTruthy()
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- sahibinden`
Expected: FAIL — modül yok

- [ ] **Step 4: `crawler/adapters/sahibinden.ts` yaz**

Fixture HTML'ini inceleyerek seçicileri belirle. İskelet:

```ts
import * as cheerio from 'cheerio'
import type { PortalAdapter, ListingStub, RawListing } from './types'

const BASE = 'https://www.sahibinden.com'

// kategori -> arama yolu
const CATEGORY_PATH: Record<'arsa' | 'konut', string> = {
  arsa: 'satilik-arsa',
  konut: 'satilik',
}

export const sahibindenAdapter: PortalAdapter = {
  source: 'sahibinden',

  searchUrls(il, category, maxPages) {
    const urls: string[] = []
    for (let p = 0; p < maxPages; p++) {
      const offset = p * 20
      const q = offset > 0 ? `?pagingOffset=${offset}` : ''
      urls.push(`${BASE}/${CATEGORY_PATH[category]}/${il.toLowerCase()}${q}`)
    }
    return urls
  },

  parseSearchPage(html) {
    const $ = cheerio.load(html)
    const stubs: ListingStub[] = []
    // NOT: seçiciler fixture'a göre kesinleştirilecek. Sahibinden arama satırları
    // genelde `tr.searchResultsItem` / `[data-id]` üzerinde; detay linki `.classifiedTitle`.
    $('tr.searchResultsItem, [data-id]').each((_, el) => {
      const $el = $(el)
      const id = $el.attr('data-id') ?? $el.find('[data-id]').attr('data-id')
      const href = $el.find('a.classifiedTitle, a[href*="/ilan/"]').attr('href')
      if (!id || !href) return
      stubs.push({
        sourceListingId: id,
        detailUrl: href.startsWith('http') ? href : `${BASE}${href}`,
        rawTitle: $el.find('a.classifiedTitle').text().trim() || undefined,
        rawPrice: $el.find('.searchResultsPriceValue').text().trim() || undefined,
      })
    })
    return stubs
  },

  parseDetailPage(html, url) {
    const $ = cheerio.load(html)
    const idFromUrl = url.match(/\/(\d+)(?:\/|$|\?)/)?.[1] ?? url.match(/(\d+)/)?.[1] ?? ''

    // "İlan bilgileri" tablosu: label -> value
    const info: Record<string, string> = {}
    $('.classifiedInfoList li, ul.classifiedInfoList li').each((_, li) => {
      const label = $(li).find('strong').text().trim().toLocaleLowerCase('tr-TR')
      const value = $(li).find('span').text().trim()
      if (label) info[label] = value
    })

    // harita pini (sahibinden çoğu ilanda gizli input / data-attr ile lat/lon verir)
    const latAttr = $('#gmap').attr('data-lat') ?? $('[data-lat]').attr('data-lat')
    const lngAttr = $('#gmap').attr('data-lon') ?? $('[data-lon]').attr('data-lon')

    const photoUrls: string[] = []
    $('.classifiedDetailMainPhoto img, .megaPhotoContainer img, [data-preview]').each((_, img) => {
      const src = $(img).attr('data-src') ?? $(img).attr('src')
      if (src && /^https?:/.test(src)) photoUrls.push(src)
    })

    return {
      source: 'sahibinden',
      sourceListingId: idFromUrl,
      sourceUrl: url,
      rawTitle: $('.classifiedDetailTitle h1, h1').first().text().trim() || undefined,
      rawDescription: $('#classifiedDescription').text().trim() || undefined,
      rawPrice: $('.classifiedInfo .classified-price-wrapper, .classifiedInfo h3').first().text().trim() || info['fiyat'] || undefined,
      rawArea: info['m² (brüt)'] ?? info['m²'] ?? info['metrekare'] ?? info['alan'] ?? undefined,
      rawType: info['emlak tipi'] ?? info['tipi'] ?? $('.classifiedDetailTitle h2').text().trim() || undefined,
      rawImarStatus: info['i̇mar durumu'] ?? info['imar durumu'] ?? undefined,
      rawIl: $('.classifiedInfo h2 a[href*="/il-"], .searchResultsLocationValue').first().text().trim() || undefined,
      rawIlce: undefined, // konum kırılımı fixture'a göre doldurulacak
      rawMahalle: undefined,
      rawAdaNo: info['ada no'] ?? undefined,
      rawParselNo: info['parsel no'] ?? undefined,
      rawListedAt: info['i̇lan tarihi'] ?? info['ilan tarihi'] ?? undefined,
      lat: latAttr ? Number(latAttr) : undefined,
      lng: lngAttr ? Number(lngAttr) : undefined,
      photoUrls: [...new Set(photoUrls)],
      extra: { info },
    }
  },
}

export default sahibindenAdapter
```

> **Uygulayıcı notu:** yukarıdaki seçiciler *tahmini*. Fixture HTML'ini aç, gerçek sınıf/attr adlarını bul, testler yeşil olana kadar seçicileri düzelt. Konum kırılımı (il/ilçe/mahalle) genelde breadcrumb ya da `.classifiedInfo` içindedir — fixture'dan çıkar. `rawIlce`/`rawMahalle` mutlaka doldurulmalı (geocode + dedupe buna bağlı).

- [ ] **Step 5: Testi çalıştır, seçicileri düzelt, geçir**

Run: `npm run test:crawler -- sahibinden`
Expected: PASS (tüm assertion'lar; özellikle `rawIlce`/`rawMahalle` boş bırakılmışsa testlere `expect(r.rawIlce).toBeTruthy()` ekle ve doldur)

- [ ] **Step 6: Commit**

```bash
git add crawler/adapters/sahibinden.ts crawler/__tests__/sahibinden.test.ts crawler/fixtures/sahibinden-*.html
git commit -m "feat(crawler): Sahibinden adapter — arama + detay parse (fixture testli)"
```

---

## Task 10: Emlakjet adapter + fixture'lar

**Files:**
- Create: `crawler/fixtures/emlakjet-arsa-search.html`, `emlakjet-arsa-detail-1.html`, `emlakjet-konut-detail-1.html`
- Create: `crawler/adapters/emlakjet.ts`
- Create: `crawler/__tests__/emlakjet.test.ts`

**Interfaces:**
- Produces: `emlakjetAdapter: PortalAdapter`

- [ ] **Step 1: Fixture'ları yakala (manuel)**

Tarayıcıda: `https://www.emlakjet.com/satilik-arsa/trabzon/` arama sonucu + bir arsa detay + bir konut detay. Kişisel veriyi sil. Kaydet: `crawler/fixtures/emlakjet-*.html`.

- [ ] **Step 2: Failing test yaz**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { emlakjetAdapter } from '../adapters/emlakjet'

const fx = (n: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', n), 'utf8')

describe('emlakjetAdapter', () => {
  it('searchUrls il/kategori/sayfa üretir', () => {
    const urls = emlakjetAdapter.searchUrls('trabzon', 'arsa', 2)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('trabzon')
  })

  it('parseSearchPage stub çıkarır', () => {
    const stubs = emlakjetAdapter.parseSearchPage(fx('emlakjet-arsa-search.html'))
    expect(stubs.length).toBeGreaterThan(0)
    expect(stubs[0].detailUrl).toMatch(/emlakjet\.com/)
    expect(stubs[0].sourceListingId).toBeTruthy()
  })

  it('parseDetailPage RawListing çıkarır (arsa)', () => {
    const r = emlakjetAdapter.parseDetailPage(fx('emlakjet-arsa-detail-1.html'), 'https://www.emlakjet.com/ilan/x-1')
    expect(r.source).toBe('emlakjet')
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
  })

  it('parseDetailPage RawListing çıkarır (konut)', () => {
    const r = emlakjetAdapter.parseDetailPage(fx('emlakjet-konut-detail-1.html'), 'https://www.emlakjet.com/ilan/y-2')
    expect(r.rawPrice).toBeTruthy()
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- emlakjet`
Expected: FAIL

- [ ] **Step 4: `crawler/adapters/emlakjet.ts` yaz**

Emlakjet çoğu veriyi `<script id="__NEXT_DATA__">` JSON'unda taşır — önce onu dene, yoksa DOM'a düş:

```ts
import * as cheerio from 'cheerio'
import type { PortalAdapter, ListingStub, RawListing } from './types'

const BASE = 'https://www.emlakjet.com'
const CATEGORY_PATH: Record<'arsa' | 'konut', string> = {
  arsa: 'satilik-arsa',
  konut: 'satilik-konut',
}

function readNextData($: cheerio.CheerioAPI): any | null {
  const raw = $('#__NEXT_DATA__').contents().text()
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export const emlakjetAdapter: PortalAdapter = {
  source: 'emlakjet',

  searchUrls(il, category, maxPages) {
    const urls: string[] = []
    for (let p = 1; p <= maxPages; p++) {
      const q = p > 1 ? `?sayfa=${p}` : ''
      urls.push(`${BASE}/${CATEGORY_PATH[category]}/${il.toLowerCase()}/${q}`)
    }
    return urls
  },

  parseSearchPage(html) {
    const $ = cheerio.load(html)
    const stubs: ListingStub[] = []
    const data = readNextData($)
    // NEXT_DATA yolları fixture'a göre kesinleştirilecek:
    const items: any[] = data?.props?.pageProps?.searchResult?.data ?? []
    if (items.length) {
      for (const it of items) {
        if (!it?.id || !it?.url) continue
        stubs.push({
          sourceListingId: String(it.id),
          detailUrl: it.url.startsWith('http') ? it.url : `${BASE}${it.url}`,
          rawPrice: it.price ? String(it.price) : undefined,
          rawTitle: it.title ?? undefined,
        })
      }
      return stubs
    }
    // DOM fallback
    $('a[href*="/ilan/"]').each((_, a) => {
      const href = $(a).attr('href') ?? ''
      const id = href.match(/-(\d+)\/?$/)?.[1]
      if (!id) return
      stubs.push({ sourceListingId: id, detailUrl: href.startsWith('http') ? href : `${BASE}${href}` })
    })
    return stubs
  },

  parseDetailPage(html, url) {
    const $ = cheerio.load(html)
    const data = readNextData($)
    const d = data?.props?.pageProps?.listing ?? data?.props?.pageProps?.detail ?? null
    const idFromUrl = url.match(/-(\d+)\/?$/)?.[1] ?? ''

    if (d) {
      return {
        source: 'emlakjet',
        sourceListingId: String(d.id ?? idFromUrl),
        sourceUrl: url,
        rawTitle: d.title ?? undefined,
        rawDescription: d.description ?? undefined,
        rawPrice: d.price != null ? String(d.price) : undefined,
        rawArea: d.area != null ? String(d.area) : (d.metrekare != null ? String(d.metrekare) : undefined),
        rawType: d.category?.name ?? d.type ?? undefined,
        rawImarStatus: d.attributes?.['İmar Durumu'] ?? undefined,
        rawIl: d.location?.city ?? d.city ?? undefined,
        rawIlce: d.location?.district ?? d.district ?? undefined,
        rawMahalle: d.location?.neighborhood ?? d.neighborhood ?? undefined,
        rawAdaNo: d.attributes?.['Ada No'] ?? undefined,
        rawParselNo: d.attributes?.['Parsel No'] ?? undefined,
        rawListedAt: d.publishDate ?? d.createdAt ?? undefined,
        lat: d.location?.lat ?? d.lat ?? undefined,
        lng: d.location?.lng ?? d.lon ?? undefined,
        photoUrls: (d.images ?? d.photos ?? []).map((x: any) => (typeof x === 'string' ? x : x.url)).filter(Boolean),
        extra: { source: 'next_data' },
      }
    }

    // DOM fallback — fixture'a göre seçiciler
    const info: Record<string, string> = {}
    $('[class*="detayList"] li, .ilan-detay li').each((_, li) => {
      const k = $(li).find('span').first().text().trim().toLocaleLowerCase('tr-TR')
      const v = $(li).find('span').last().text().trim()
      if (k) info[k] = v
    })
    return {
      source: 'emlakjet',
      sourceListingId: idFromUrl,
      sourceUrl: url,
      rawTitle: $('h1').first().text().trim() || undefined,
      rawPrice: $('[class*="price"]').first().text().trim() || info['fiyat'] || undefined,
      rawArea: info['metrekare'] ?? info['m²'] ?? info['alan'] ?? undefined,
      rawType: info['i̇lan tipi'] ?? info['kategori'] ?? undefined,
      rawImarStatus: info['i̇mar durumu'] ?? undefined,
      rawIl: undefined, rawIlce: undefined, rawMahalle: undefined,
      rawAdaNo: info['ada no'] ?? undefined,
      rawParselNo: info['parsel no'] ?? undefined,
      rawListedAt: info['i̇lan tarihi'] ?? undefined,
      photoUrls: [],
      extra: { info, source: 'dom_fallback' },
    }
  },
}

export default emlakjetAdapter
```

> **Uygulayıcı notu:** fixture'daki `__NEXT_DATA__` JSON'unu aç, gerçek yolları (`props.pageProps...`) bul ve yukarıdaki yolları düzelt. DOM fallback'i sadece JSON hiç yoksa gerekir.

- [ ] **Step 5: Testi çalıştır, düzelt, geçir**

Run: `npm run test:crawler -- emlakjet`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add crawler/adapters/emlakjet.ts crawler/__tests__/emlakjet.test.ts crawler/fixtures/emlakjet-*.html
git commit -m "feat(crawler): Emlakjet adapter — NEXT_DATA öncelikli parse (fixture testli)"
```

---

## Task 11: Hepsiemlak adapter + fixture'lar

**Files:**
- Create: `crawler/fixtures/hepsiemlak-arsa-search.html`, `hepsiemlak-arsa-detail-1.html`, `hepsiemlak-konut-detail-1.html`
- Create: `crawler/adapters/hepsiemlak.ts`
- Create: `crawler/__tests__/hepsiemlak.test.ts`

**Interfaces:**
- Produces: `hepsiemlakAdapter: PortalAdapter`

- [ ] **Step 1: Fixture'ları yakala (manuel)**

`https://www.hepsiemlak.com/trabzon-satilik/arsa` arama + arsa detay + konut detay. Kişisel veri silinir. `crawler/fixtures/hepsiemlak-*.html`.

- [ ] **Step 2: Failing test yaz**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { hepsiemlakAdapter } from '../adapters/hepsiemlak'

const fx = (n: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', n), 'utf8')

describe('hepsiemlakAdapter', () => {
  it('searchUrls üretir', () => {
    const urls = hepsiemlakAdapter.searchUrls('trabzon', 'arsa', 2)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('trabzon')
  })
  it('parseSearchPage stub çıkarır', () => {
    const stubs = hepsiemlakAdapter.parseSearchPage(fx('hepsiemlak-arsa-search.html'))
    expect(stubs.length).toBeGreaterThan(0)
    expect(stubs[0].sourceListingId).toBeTruthy()
    expect(stubs[0].detailUrl).toMatch(/hepsiemlak\.com/)
  })
  it('parseDetailPage RawListing (arsa)', () => {
    const r = hepsiemlakAdapter.parseDetailPage(fx('hepsiemlak-arsa-detail-1.html'), 'https://www.hepsiemlak.com/x-1')
    expect(r.source).toBe('hepsiemlak')
    expect(r.rawPrice).toBeTruthy()
    expect(r.rawArea).toBeTruthy()
    expect(r.rawIlce).toBeTruthy()
    expect(r.rawMahalle).toBeTruthy()
  })
  it('parseDetailPage RawListing (konut)', () => {
    const r = hepsiemlakAdapter.parseDetailPage(fx('hepsiemlak-konut-detail-1.html'), 'https://www.hepsiemlak.com/y-2')
    expect(r.rawPrice).toBeTruthy()
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- hepsiemlak`
Expected: FAIL

- [ ] **Step 4: `crawler/adapters/hepsiemlak.ts` yaz**

Task 9 (Sahibinden) ile aynı desen: cheerio, arama satırları + detay "ilan bilgileri" tablosu, harita pini, foto listesi. Hepsiemlak detayında bilgi tablosu genelde `.spec-item` / `.det-adv-info` sınıflarında; fixture'a göre kesinleştir. `rawIlce`/`rawMahalle` breadcrumb'dan (`.breadcrumb a`) alınır.

```ts
import * as cheerio from 'cheerio'
import type { PortalAdapter, ListingStub, RawListing } from './types'

const BASE = 'https://www.hepsiemlak.com'

export const hepsiemlakAdapter: PortalAdapter = {
  source: 'hepsiemlak',

  searchUrls(il, category, maxPages) {
    const seg = category === 'arsa' ? 'arsa' : 'konut'
    const urls: string[] = []
    for (let p = 1; p <= maxPages; p++) {
      const q = p > 1 ? `?page=${p}` : ''
      urls.push(`${BASE}/${il.toLowerCase()}-satilik/${seg}${q}`)
    }
    return urls
  },

  parseSearchPage(html) {
    const $ = cheerio.load(html)
    const stubs: ListingStub[] = []
    $('.listing-item, [id^="realtyListing"]').each((_, el) => {
      const $el = $(el)
      const href = $el.find('a.card-link, a[href*="-detay-"]').attr('href')
      const id = $el.attr('id')?.replace(/\D/g, '') || href?.match(/-(\d+)\/?$/)?.[1]
      if (!href || !id) return
      stubs.push({
        sourceListingId: id,
        detailUrl: href.startsWith('http') ? href : `${BASE}${href}`,
        rawPrice: $el.find('.list-view-price').text().trim() || undefined,
        rawTitle: $el.find('.card-title, h3').text().trim() || undefined,
      })
    })
    return stubs
  },

  parseDetailPage(html, url) {
    const $ = cheerio.load(html)
    const id = url.match(/-(\d+)\/?$/)?.[1] ?? ''
    const info: Record<string, string> = {}
    $('.spec-item, .det-adv-info li, .adv-info-list li').each((_, li) => {
      const k = $(li).find('span').first().text().trim().toLocaleLowerCase('tr-TR')
      const v = $(li).find('span').last().text().trim()
      if (k && v && k !== v) info[k] = v
    })
    const crumbs = $('.breadcrumb a, nav.breadcrumb a').map((_, a) => $(a).text().trim()).get()
    const latMeta = $('[data-lat]').attr('data-lat') ?? $('#map').attr('data-latitude')
    const lngMeta = $('[data-lng]').attr('data-lng') ?? $('#map').attr('data-longitude')
    const photoUrls: string[] = []
    $('.slider img, .gallery img, [data-src*="hepsiemlak"]').each((_, img) => {
      const s = $(img).attr('data-src') ?? $(img).attr('src')
      if (s && /^https?:/.test(s)) photoUrls.push(s)
    })

    return {
      source: 'hepsiemlak',
      sourceListingId: id,
      sourceUrl: url,
      rawTitle: $('h1').first().text().trim() || undefined,
      rawDescription: $('.description-content, #description').text().trim() || undefined,
      rawPrice: $('.price, .fz24-text').first().text().trim() || info['fiyat'] || undefined,
      rawArea: info['m² (brüt)'] ?? info['metrekare'] ?? info['arsa alanı'] ?? info['m²'] ?? undefined,
      rawType: info['konut tipi'] ?? info['emlak tipi'] ?? info['i̇lan tipi'] ?? undefined,
      rawImarStatus: info['i̇mar durumu'] ?? undefined,
      rawIl: crumbs[1] ?? undefined,
      rawIlce: crumbs[2] ?? undefined,
      rawMahalle: crumbs[3] ?? undefined,
      rawAdaNo: info['ada no'] ?? undefined,
      rawParselNo: info['parsel no'] ?? undefined,
      rawListedAt: info['i̇lan tarihi'] ?? info['güncelleme tarihi'] ?? undefined,
      lat: latMeta ? Number(latMeta) : undefined,
      lng: lngMeta ? Number(lngMeta) : undefined,
      photoUrls: [...new Set(photoUrls)],
      extra: { info, crumbs },
    }
  },
}

export default hepsiemlakAdapter
```

> **Uygulayıcı notu:** breadcrumb sırası (il/ilçe/mahalle indeksleri) fixture'a göre doğrula.

- [ ] **Step 5: Testi çalıştır, düzelt, geçir**

Run: `npm run test:crawler -- hepsiemlak`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add crawler/adapters/hepsiemlak.ts crawler/__tests__/hepsiemlak.test.ts crawler/fixtures/hepsiemlak-*.html
git commit -m "feat(crawler): Hepsiemlak adapter — arama + detay parse (fixture testli)"
```

---

## Task 12: fetcher/browser (Playwright sarmalayıcı)

**Files:**
- Create: `crawler/fetcher/browser.ts`

**Interfaces:**
- Consumes: `CrawlConfig`, `randDelayMs` (Task 8)
- Produces:
  - `interface Fetcher { get(url: string): Promise<{ html: string; status: number }>; requestCount: number; close(): Promise<void> }`
  - `createFetcher(cfg: CrawlConfig, opts?: { headful?: boolean }): Promise<Fetcher>`

- [ ] **Step 1: `crawler/fetcher/browser.ts` yaz (birim test yok — Task 13 smoke)**

```ts
import { chromium, type Browser, type BrowserContext } from '@playwright/test'
import type { CrawlConfig } from '../config'
import { randDelayMs } from '../config'

export interface Fetcher {
  get(url: string): Promise<{ html: string; status: number }>
  requestCount: number
  close(): Promise<void>
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function createFetcher(cfg: CrawlConfig, opts: { headful?: boolean } = {}): Promise<Fetcher> {
  const browser: Browser = await chromium.launch({ headless: !opts.headful })
  const context: BrowserContext = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  })
  // basit maskeleme
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  let requestCount = 0

  const fetcher: Fetcher = {
    get requestCount() {
      return requestCount
    },
    async get(url: string) {
      if (requestCount >= cfg.maxRequestsPerRun) {
        throw new Error(`maxRequestsPerRun (${cfg.maxRequestsPerRun}) aşıldı — tur durduruluyor`)
      }
      // istekler arası insan-benzeri bekleme (ilk istekte de kısa bekle)
      await sleep(randDelayMs(cfg))
      // periyodik uzun mola
      if (requestCount > 0 && requestCount % cfg.breakEveryN === 0) {
        const brk = cfg.breakMinMs + Math.random() * (cfg.breakMaxMs - cfg.breakMinMs)
        console.log(`  … mola ${Math.round(brk / 1000)} sn`)
        await sleep(brk)
      }

      const page = await context.newPage()
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        // insan-benzeri scroll
        await page.mouse.wheel(0, 600 + Math.random() * 1200)
        await sleep(1200 + Math.random() * 2500)
        const html = await page.content()
        const status = resp?.status() ?? 0
        requestCount++
        return { html, status }
      } finally {
        await page.close()
      }
    },
    async close() {
      await context.close()
      await browser.close()
    },
  }
  return fetcher
}
```

- [ ] **Step 2: Derleme doğrulaması**

Run: `npx tsc -p crawler/tsconfig.json`
Expected: temiz (Playwright tipleri `@playwright/test`'ten geliyor)

- [ ] **Step 3: Commit**

```bash
git add crawler/fetcher/browser.ts
git commit -m "feat(crawler): fetcher — Playwright sarmalayıcı (insan-benzeri bekleme, mola, istek tavanı)"
```

---

## Task 13: run.ts — orkestrasyon + uçtan uca doğrulama

**Files:**
- Create: `crawler/run.ts`
- Create: `crawler/__tests__/run.pipeline.test.ts` (fetcher'ı fake'leyerek akış testi)

**Interfaces:**
- Consumes: tüm önceki modüller
- Produces: CLI. Argümanlar: `--portal=<sahibinden|emlakjet|hepsiemlak>` `--il=<slug>` `--category=<arsa|konut>` `--max-pages=<n>` `--dry-run` `--limit=<n>` `--headful`

- [ ] **Step 1: Failing test yaz (akış — fake fetcher + fake client)**

```ts
import { runCrawl, type RunDeps } from '../run'
import type { PortalAdapter } from '../adapters/types'

const fakeAdapter: PortalAdapter = {
  source: 'sahibinden',
  searchUrls: () => ['http://s/1'],
  parseSearchPage: () => [
    { sourceListingId: 'A', detailUrl: 'http://s/ilan/A' },
    { sourceListingId: 'B', detailUrl: 'http://s/ilan/B' },
  ],
  parseDetailPage: (_html, url) => ({
    source: 'sahibinden',
    sourceListingId: url.endsWith('A') ? 'A' : 'B',
    sourceUrl: url,
    rawPrice: '10.000.000 TL',
    rawArea: '500 m²',
    rawType: 'Tarla',
    rawIl: 'Trabzon', rawIlce: 'Akçaabat', rawMahalle: 'Dürbinar',
    photoUrls: [],
    extra: {},
  }),
}

function fakeClient() {
  const rows: any[] = []
  let seq = 0
  return {
    rows,
    client: {
      marketListing: {
        findUnique: async ({ where }: any) => rows.find((r) => r.source === where.source_sourceListingId.source && r.sourceListingId === where.source_sourceListingId.sourceListingId) ?? null,
        create: async ({ data }: any) => { const row = { id: `id${++seq}`, status: 'active', firstSeenAt: new Date(), ...data }; rows.push(row); return row },
        update: async ({ where, data }: any) => { Object.assign(rows.find((r) => r.id === where.id), data); return {} },
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
      },
      marketListingPricePoint: { create: async () => ({}) },
      crawlRun: {
        create: async ({ data }: any) => ({ id: 'run1', ...data }),
        update: async () => ({}),
      },
    },
  }
}

describe('runCrawl', () => {
  it('arama → detay → normalize → geocode → upsert akışını yürütür', async () => {
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: {
        requestCount: 0,
        get: async () => ({ html: '<div class="searchResultsItem"></div>', status: 200 }),
        close: async () => {},
      },
      geocodeDeps: {
        resolveMahalleCentroid: async () => ({ lat: 41, lng: 39.6 }),
        isWithinTurkey: () => true,
      },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.listingsUpserted).toBe(2)
    expect(rows).toHaveLength(2)
    expect(rows[0].geoPrecision).toBe('neighborhood')
    expect(summary.blocked).toBe(false)
  })

  it('blocked tespit edilince tur durur, delisted adımı atlanır', async () => {
    const { client } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: { requestCount: 0, get: async () => ({ html: 'just a moment', status: 200 }), close: async () => {} },
      geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
      detectBlock: () => ({ blocked: true, reason: 'cloudflare challenge' }),
      now: () => new Date(),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.blocked).toBe(true)
    expect(summary.listingsUpserted).toBe(0)
  })

  it('dry-run DB yazmaz', async () => {
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: { requestCount: 0, get: async () => ({ html: '<div class="searchResultsItem"></div>', status: 200 }), close: async () => {} },
      geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date(),
    }
    await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: true, limit: 1 }, deps)
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm run test:crawler -- run.pipeline`
Expected: FAIL — `runCrawl` yok

- [ ] **Step 3: `crawler/run.ts` yaz**

```ts
import { prisma } from '@/lib/prisma'
import { DEFAULT_CONFIG, type CrawlConfig } from './config'
import { sahibindenAdapter } from './adapters/sahibinden'
import { emlakjetAdapter } from './adapters/emlakjet'
import { hepsiemlakAdapter } from './adapters/hepsiemlak'
import type { PortalAdapter, PortalSource, ListingCategory, ListingType } from './adapters/types'
import { normalizeRaw } from './pipeline/normalize'
import { geocodeListing, defaultGeocodeDeps, type GeocodeDeps } from './pipeline/geocode'
import { findDupes, type DedupeCandidate } from './pipeline/dedupe'
import { upsertListing, markDelistedExcept, writeDupeLinks, type UpsertClient } from './pipeline/upsert'
import { detectBlock, type BlockCheckInput, type BlockResult } from './fetcher/blockDetector'
import { createFetcher } from './fetcher/browser'

const ADAPTERS: Record<PortalSource, PortalAdapter> = {
  sahibinden: sahibindenAdapter,
  emlakjet: emlakjetAdapter,
  hepsiemlak: hepsiemlakAdapter,
}
const ARSA_TYPES: ListingType[] = ['arsa', 'tarla', 'bag', 'bahce', 'zeytinlik', 'arazi']
const KONUT_TYPES: ListingType[] = ['konut', 'ticari', 'diger']

export interface RunArgs {
  il: string
  category: ListingCategory
  maxPages: number
  dryRun: boolean
  limit?: number
}

export interface RunSummary {
  pagesFetched: number
  listingsFound: number
  listingsUpserted: number
  unparseable: number
  delisted: number
  dupes: number
  blocked: boolean
  blockReason: string | null
}

export interface RunDeps {
  adapter: PortalAdapter
  client: UpsertClient & { crawlRun: { create(a: any): Promise<{ id: string }>; update(a: any): Promise<any> } }
  fetcher: { get(url: string): Promise<{ html: string; status: number }>; requestCount: number; close(): Promise<void> }
  geocodeDeps: GeocodeDeps
  detectBlock: (i: BlockCheckInput) => BlockResult
  now: () => Date
  cfg?: CrawlConfig
}

export async function runCrawl(args: RunArgs, deps: RunDeps): Promise<RunSummary> {
  const cfg = deps.cfg ?? DEFAULT_CONFIG
  const { adapter } = deps
  const types = args.category === 'arsa' ? ARSA_TYPES : KONUT_TYPES
  const summary: RunSummary = {
    pagesFetched: 0, listingsFound: 0, listingsUpserted: 0,
    unparseable: 0, delisted: 0, dupes: 0, blocked: false, blockReason: null,
  }

  const run = args.dryRun
    ? { id: 'dry' }
    : await deps.client.crawlRun.create({
        data: { source: adapter.source, il: args.il, category: args.category, startedAt: deps.now() },
      })

  const seenIds: string[] = []
  const dedupeCands: DedupeCandidate[] = []
  const searchUrls = adapter.searchUrls(args.il, args.category, args.maxPages)

  outer: for (const url of searchUrls) {
    const { html, status } = await deps.fetcher.get(url)
    summary.pagesFetched++
    const stubs = adapter.parseSearchPage(html)
    const block = deps.detectBlock({ html, httpStatus: status, expectedSelector: '.searchResults', foundListingCount: stubs.length })
    if (block.blocked) { summary.blocked = true; summary.blockReason = block.reason; break }

    for (const stub of stubs) {
      if (args.limit && summary.listingsFound >= args.limit) break outer
      summary.listingsFound++

      const detail = await deps.fetcher.get(stub.detailUrl)
      const db = deps.detectBlock({ html: detail.html, httpStatus: detail.status, expectedSelector: '.classifiedDetail', foundListingCount: -1 })
      if (db.blocked) { summary.blocked = true; summary.blockReason = db.reason; break outer }

      let raw
      try {
        raw = adapter.parseDetailPage(detail.html, stub.detailUrl)
      } catch {
        summary.unparseable++
        continue
      }
      const normalized = normalizeRaw(raw)
      if (normalized.price === null && normalized.areaSqm === null) summary.unparseable++
      const geo = await geocodeListing(normalized, deps.geocodeDeps)

      if (args.dryRun) {
        console.log(JSON.stringify({ normalized, geo }, null, 2))
        continue
      }

      const res = await upsertListing(deps.client, { normalized, geo })
      seenIds.push(res.id)
      summary.listingsUpserted++
      dedupeCands.push({
        id: res.id, source: adapter.source, ilce: normalized.ilce, mahalle: normalized.mahalle,
        areaSqm: normalized.areaSqm, price: normalized.price, listingType: normalized.listingType,
        firstSeenAt: deps.now(),
      })
    }

    if (summary.listingsFound > 0 && summary.unparseable / summary.listingsFound > cfg.unparseableAbortRatio) {
      summary.blockReason = `unparseable oranı ${cfg.unparseableAbortRatio} üstünde — parser körelmiş olabilir`
      break
    }
  }

  if (!args.dryRun && !summary.blocked) {
    summary.delisted = await markDelistedExcept(
      deps.client,
      { source: adapter.source, il: args.il.toLocaleUpperCase('tr-TR'), listingTypes: types },
      seenIds,
    )
    // il genelinde kopya işaretle: bu turdaki + DB'deki diğer kaynakların güncel kayıtları
    // v1: sadece bu turdaki kayıtlar arası (basit). Cross-tur dedupe sonraki iterasyon.
    const links = findDupes(dedupeCands)
    await writeDupeLinks(deps.client, links)
    summary.dupes = links.size
  }

  if (!args.dryRun) {
    await deps.client.crawlRun.update({
      where: { id: run.id },
      data: {
        finishedAt: deps.now(),
        pagesFetched: summary.pagesFetched,
        listingsFound: summary.listingsFound,
        listingsUpserted: summary.listingsUpserted,
        blocked: summary.blocked,
        notes: summary.blockReason,
      },
    })
  }

  return summary
}

// ---- CLI ----
function parseArgs(argv: string[]) {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  const has = (k: string) => argv.includes(`--${k}`)
  return {
    portal: (get('portal') ?? 'sahibinden') as PortalSource,
    il: get('il') ?? 'trabzon',
    category: (get('category') ?? 'arsa') as ListingCategory,
    maxPages: Number(get('max-pages') ?? 20),
    dryRun: has('dry-run'),
    limit: get('limit') ? Number(get('limit')) : undefined,
    headful: has('headful'),
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  console.log(`crawl: ${a.portal} / ${a.il} / ${a.category} / maxPages=${a.maxPages}${a.dryRun ? ' (dry-run)' : ''}`)
  const fetcher = await createFetcher(DEFAULT_CONFIG, { headful: a.headful })
  try {
    const summary = await runCrawl(
      { il: a.il, category: a.category, maxPages: a.maxPages, dryRun: a.dryRun, limit: a.limit },
      {
        adapter: ADAPTERS[a.portal],
        client: prisma as unknown as RunDeps['client'],
        fetcher,
        geocodeDeps: defaultGeocodeDeps(),
        detectBlock,
        now: () => new Date(),
      },
    )
    console.table(summary)
    if (summary.blocked) {
      console.error(`\n⚠️  ENGELLENDİ: ${summary.blockReason}\n`)
      process.exitCode = 2
    }
  } finally {
    await fetcher.close()
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm run test:crawler -- run.pipeline`
Expected: PASS (3 test)

- [ ] **Step 5: Tam crawler suite + izolasyon doğrulaması**

Run:
```bash
npm run test:crawler
npx tsc -p crawler/tsconfig.json
npx tsc --noEmit
npx jest --roots src --listTests | grep -c crawler   # 0 olmalı
npm run build                                          # crawler'sız derlenmeli
```
Expected: crawler suite tam yeşil; iki tsc temiz; app jest crawler görmüyor; `next build` başarılı.

- [ ] **Step 6: Canlı duman testi (manuel, küçük)**

Run:
```bash
npm run dev:db
# .env DATABASE_URL lokal dev DB'ye baksın
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --dry-run --limit=1 --headful
```
Expected: 1 ilan çekilir, normalize+geocode çıktısı JSON olarak yazdırılır, DB'ye yazılmaz. Engellenirse `⚠️ ENGELLENDİ` mesajı — bu durumda spec'e göre proxy adımına geçilir (ayrı iterasyon).

- [ ] **Step 7: Canlı küçük gerçek tur (manuel)**

Run:
```bash
npm run crawl -- --portal=sahibinden --il=trabzon --category=arsa --max-pages=2
npm run crawl -- --portal=emlakjet   --il=trabzon --category=arsa --max-pages=2
npm run crawl -- --portal=hepsiemlak --il=trabzon --category=arsa --max-pages=2
```
Expected: `MarketListing` satırları oluşur; `npm run crawl ... sahibinden ...` tekrar çalışınca yeni satır oluşmaz (upsert), `CrawlRun` satırları özet tutar. Prisma Studio'da (`npm run dev`) kontrol.

- [ ] **Step 8: Commit**

```bash
git add crawler/run.ts crawler/__tests__/run.pipeline.test.ts
git commit -m "feat(crawler): run.ts — uçtan uca orkestrasyon + CLI + akış testi"
```

---

## Task 14: Prod migration notu + kapanış

**Files:**
- Modify: `crawler/README.md` (prod bölümü)

- [ ] **Step 1: README'ye prod migration adımı ekle**

```markdown
## Prod'a yazma (ilk kez)

Crawler lokal çalışır ama prod DB'ye yazacaksa `MarketListing` migration'ı
prod'da uygulanmalı:

    DATABASE_URL="<prod url>" npx prisma migrate deploy

Sonra `crawl` komutunu `DATABASE_URL` prod'a bakacak şekilde çalıştır. Prod'a
yazarken `--max-pages` küçük tut, `CrawlRun.blocked` sonuçlarını izle.
```

- [ ] **Step 2: Commit**

```bash
git add crawler/README.md
git commit -m "docs(crawler): prod migration + yazma notu"
```

- [ ] **Step 3: Branch kapanışı**

`superpowers:finishing-a-development-branch` skill'i ile: tüm crawler testleri yeşil, `npx jest --roots src` etkilenmemiş, `next build` temiz olduğunu doğrula; worktree kullanıldıysa sil, `codex/professional-ui-and-land-cost`'a merge et (lokal — push/deploy kullanıcı kararı).

---

## Self-Review

**1. Spec coverage:**
- §1 Veri modeli → Task 1 ✓
- §2 Modül yapısı → Task 2–13 (dizin yapısı Task 1'de tsconfig/jest ile kilitlenir) ✓
- §3 Pipeline akışı → Task 13 `runCrawl` (detay tazeleme aralığı: `detailRefreshDays` config'de var; run.ts v1'de "her stub'a bak" — tazeleme filtresi Task 13 not: `lastSeenAt` filtresi `parseSearchPage` sonrası eklenebilir, ama v1 küçük `--max-pages` ile çalıştığı için zorunlu değil; **eksik değil, bilinçli sadeleştirme** — spec §3 "yeni VEYA lastSeenAt > tazelemeAralığı" diyor; bunu run.ts'e eklemek için: stub'ları upsert öncesi `client.marketListing.findMany({where:{source, sourceListingId:{in: stubIds}}})` ile çek, taze olanları atla. Uygulayıcı Task 13 Step 3'te bu filtreyi eklesin — aşağıya not düşüldü.) ⚠ düzeltme aşağıda
- §4 Hata yönetimi → Task 7 (blockDetector), Task 13 (unparseable eşiği, blocked'da delisted atlama) ✓
- §5 Araç zinciri + test → Task 1 (tsconfig/eslint/jest/scripts), her task TDD ✓
- §6 Kapsam sınırları → plan hiçbir v1-dışı özelliği içermiyor ✓
- Başarı ölçütü → Task 13 Step 5–7 ✓

**Düzeltme (spec §3 tazeleme filtresi):** Task 13 Step 3'te, detay sayfası çekmeden önce şu filtre eklenir:

```ts
// stub'ları topla, hangileri "taze" (yakında görülmüş) DB'de var mı bak
const stubIds = stubs.map((s) => s.sourceListingId)
const fresh = new Set(
  (await deps.client.marketListing.findMany({
    where: { source: adapter.source, sourceListingId: { in: stubIds } },
  })).filter((r: any) => r.lastSeenAt && (deps.now().getTime() - new Date(r.lastSeenAt).getTime()) < cfg.detailRefreshDays * 86_400_000)
   .map((r: any) => r.sourceListingId),
)
// döngüde: if (fresh.has(stub.sourceListingId)) { seenIds.push(existing.id...); continue }
```

Uygulayıcı bu filtreyi ekler ve `run.pipeline.test.ts`'e "taze kayıt tekrar çekilmez" testi yazar (RED→GREEN).

**2. Placeholder scan:** Adapter seçicileri "tahmini" olarak işaretli ama her biri fixture'a karşı TDD ile kesinleştiriliyor — bu bir plan kusuru değil, portal HTML'i çalışma anında elde edildiği için kaçınılmaz; her adapter task'ı "testi geçir" adımıyla kapanıyor. Başka placeholder yok.

**3. Type consistency:**
- `UpsertClient` Task 6'da tanımlı, Task 13'te `RunDeps.client` onu genişletiyor (`& { crawlRun: ... }`) ✓
- `GeocodeDeps` Task 4'te, Task 13'te kullanılıyor ✓
- `NormalizedListing` / `GeoResult` / `RawListing` / `ListingStub` / `PortalAdapter` — Task 2'de tek kaynak, hepsi ordan import ✓
- `randDelayMs` Task 8 → Task 12 ✓
- `detectBlock` imzası: Task 7 `(input: BlockCheckInput)`, Task 13 `deps.detectBlock` aynı ✓
- `markDelistedExcept` Task 6 imzası ile Task 13 çağrısı: `{ source, il, listingTypes }` + `seenIds` ✓ (Task 6 Step 4 notundaki `notIn` düzeltmesi uygulanmış varsayılır)

Tüm tutarsızlıklar giderildi.

---

## Execution Handoff

Plan tamamlandı ve `docs/superpowers/plans/2026-08-29-ilan-crawler-veri-hatti.md`'ye kaydedildi. İki uygulama seçeneği:

**1. Subagent-Driven (önerilen)** — her task için taze subagent, task'lar arası iki aşamalı review, hızlı iterasyon.

**2. Inline Execution** — bu oturumda `executing-plans` ile, checkpoint'li toplu uygulama.

Hangisi?

> **Not (worktree):** `codex/professional-ui-and-land-cost` origin'de yok / bayat. Worktree açılırsa `superpowers:using-git-worktrees` ile ve **local HEAD'ten** dallandırılmalı (bkz. `feedback_worktree_base_ref_defaults_to_origin`). Fixture yakalama adımları (Task 9–11 Step 1) tarayıcı gerektirir — subagent bunu yapamaz; kullanıcı sağlar ya da ana oturum tarayıcı aracıyla yakalar.
