# WhatsApp Outbound Bildirimler (5b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp botunda bir mahalleyi "takip" eden kullanıcıya, zamanlanmış bir işle ayda bir fiyat özeti ve arada muhafazalı eşikli fiyat-hareketi uyarısı gönder.

**Architecture:** Yeni `WhatsappSubscription` Prisma modeli. 5a'nın `handleMessage`'ine DURDUR (opt-out) + kart-sonrası "Evet" ile opt-in yakalama eklenir. Yeni `scripts/whatsapp-notify.ts` (`npm run notify:run`, Coolify haftalık Scheduled Task): fiyat aggregate'lerini tazeler, sonra saf `src/lib/whatsapp/notify/` modülleriyle her abone için digest/uyarı kararını verip Meta `type:template` mesajı gönderir. Tüm iş mantığı saf + DI'lı.

**Tech Stack:** Next.js 16, Prisma + PostgreSQL, Jest + ts-jest (testEnvironment: node), `ts-node` scriptler, `node:crypto` yok (bu iş imza kullanmaz).

**Spec:** `docs/superpowers/specs/2026-08-31-whatsapp-outbound-bildirimler-design.md`

## Global Constraints

- Yalnız **UTILITY** Meta şablonları; 5b işletme-başlatmalı pazarlama mesajı göndermez.
- Bildirim gönderimi asla `throw` etmez (5a `sendMessage.ts` deseni) — bir abonenin hatası turu düşürmez.
- Ham Graph API hata gövdesi **loglanmaz** (5a F4 kararı): yalnız `res.status` + `error.code`/`type`/`message`; telefon numarası son-4 maskeli.
- Alan adları (`il`/`ilce`/`mahalle`) DB'ye ve sorguya `normalizeAreaName` (`@/lib/areaPrices/normalizeAreaName`: trim + İ→I + ı→i + toUpperCase) ile girer — `AreaPriceStat`/`AreaPriceTrend` key-space'iyle aynı.
- Test deseni: saf modül + DI. Prisma/fetch asla doğrudan import edilip test edilmez — hep DI + mock. Fixture'lar `src/lib/whatsapp/notify/__fixtures__/`.
- Migration: elle yazılmış SQL, `prisma/migrations/<UTC-ts>_<isim>/migration.sql`. `prisma migrate dev` DEĞİL. Dev DB varsa `prisma migrate deploy`; yoksa `prisma generate` yeter (test/tsc DB'ye vurmaz).
- Her task sonunda: `npx tsc --noEmit` temiz + ilgili jest yeşil. Route/page/script'e dokunan task'ta ek olarak `npm run build` temiz.
- jest: bu iş ana checkout'ta (`codex/professional-ui-and-land-cost`) VEYA bir worktree'de koşabilir. Worktree'den: `npx jest --no-coverage <pattern>` — `--roots` VERME. Ana checkout'ta: `npx jest --no-coverage --roots "<rootDir>/src" <pattern>`.
- Kullanıcıya giden tüm metin Türkçe. Kod identifier'ları İngilizce.
- Dev DB (Docker `arsabil_postgres_dev`, `postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev`) şu an ÇALIŞIYOR — migration'ı uygulayabilirsin.

---

### Task 1: `WhatsappSubscription` modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (model bloklarının sonuna)
- Create: `prisma/migrations/20260901120000_add_whatsapp_subscription/migration.sql`
- Test: yok (şema — doğrulama `prisma validate` + `tsc`)

**Interfaces:**
- Consumes: –
- Produces: `prisma.whatsappSubscription` delegesi; alanlar `id: string`, `phone: string`, `il/ilce/mahalle: string`, `createdAt: Date`, `lastDigestMonth: string | null`, `lastAlertAt: Date | null`, `lastAlertDirection: string | null`; unique `[phone, il, ilce, mahalle]`

- [ ] **Step 1: Modeli ekle**

```prisma
model WhatsappSubscription {
  id                 String   @id @default(cuid())
  phone              String
  il                 String
  ilce               String
  mahalle            String
  createdAt          DateTime @default(now())
  lastDigestMonth    String?
  lastAlertAt        DateTime?
  lastAlertDirection String?

  @@unique([phone, il, ilce, mahalle])
  @@index([il, ilce, mahalle])
}
```

- [ ] **Step 2: `npx prisma validate`** → "The schema is valid"

- [ ] **Step 3: Migration SQL**

`prisma/migrations/20260901120000_add_whatsapp_subscription/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "WhatsappSubscription" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDigestMonth" TEXT,
    "lastAlertAt" TIMESTAMP(3),
    "lastAlertDirection" TEXT,

    CONSTRAINT "WhatsappSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSubscription_phone_il_ilce_mahalle_key" ON "WhatsappSubscription"("phone", "il", "ilce", "mahalle");

-- CreateIndex
CREATE INDEX "WhatsappSubscription_il_ilce_mahalle_idx" ON "WhatsappSubscription"("il", "ilce", "mahalle");
```

- [ ] **Step 4: `npx prisma generate`** (+ dev DB varsa `DATABASE_URL="postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev" npx prisma migrate deploy`)

- [ ] **Step 5: `npx tsc --noEmit`** → temiz

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260901120000_add_whatsapp_subscription
git commit -m "feat(wa): WhatsappSubscription modeli + migration"
```

---

### Task 2: `persistAggregates` çıkarımı (2 script'in refactor'u)

**Files:**
- Create: `src/lib/areaPrices/persistAggregates.ts`
- Modify: `scripts/aggregate-area-prices.ts`, `scripts/aggregate-trend.ts` (write döngüsünü yeni helper'a taşı)
- Test: `src/lib/areaPrices/__tests__/persistAggregates.test.ts`

**Interfaces:**
- Consumes:
  - `aggregateAreaPrices` from `@/lib/areaPrices/aggregate` — `(rows: AggregateInputRow[]) => AreaPriceStatRow[]` (`{il, ilce, mahalle, scope, medianPricePerSqm, p25, p75, sampleCount}`)
  - `aggregateTrend` from `@/lib/areaPrices/trendAggregate` — `(rows: TrendInputRow[]) => TrendRow2[]` (`{il, ilce, mahalle, scope, monthBucket, medianPricePerSqm, sampleCount}`)
- Produces:
  ```ts
  interface AggregatePersistDb {
    areaPriceStat: { findFirst(a): Promise<{ id: string } | null>; update(a): Promise<unknown>; create(a): Promise<unknown>; count(): Promise<number> }
    areaPriceTrend: { findFirst(a): Promise<{ id: string } | null>; update(a): Promise<unknown>; create(a): Promise<unknown>; count(): Promise<number> }
    marketListing: { findMany(a): Promise<unknown[]> }
  }
  export async function refreshAreaPriceStats(db, computedAt?: Date): Promise<{ written: number; total: number }>
  export async function refreshAreaPriceTrends(db, computedAt?: Date): Promise<{ written: number; total: number }>
  ```
  Her biri: `db.marketListing.findMany` (script'lerdeki select'in aynısı) → saf aggregate → upsert döngüsü (mevcut script mantığı bire bir) → `{written, total}`.

- [ ] **Step 1: Failing test yaz**

`persistAggregates.test.ts` — sahte `db` ile: `marketListing.findMany` 3 satır döndürür, `areaPriceStat.findFirst` null → `create` çağrılır; ikinci turda `findFirst` `{id}` → `update` çağrılır. Aynısı trend için. Assert: `refreshAreaPriceStats` `written` sayısı, `create`/`update` çağrı argümanları.

```ts
import { refreshAreaPriceStats, refreshAreaPriceTrends } from '../persistAggregates'

function fakeDb(listings: unknown[]) {
  const stat = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(2) }
  const trend = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(2) }
  const marketListing = { findMany: jest.fn().mockResolvedValue(listings) }
  return { db: { areaPriceStat: stat, areaPriceTrend: trend, marketListing }, stat, trend, marketListing }
}

const L = (over = {}) => ({ listingType: 'arsa', pricePerSqm: 1000, status: 'active', il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UGURLU', listedAt: new Date('2026-07-15'), ...over })

describe('refreshAreaPriceStats', () => {
  it('yeni satırlar create edilir, sonuç {written,total}', async () => {
    const { db, stat } = fakeDb([L(), L({ pricePerSqm: 1200 }), L({ pricePerSqm: 900 })])
    const r = await refreshAreaPriceStats(db as never)
    expect(stat.create).toHaveBeenCalled()
    expect(r.written).toBeGreaterThan(0)
    expect(r.total).toBe(2)
  })
})
describe('refreshAreaPriceTrends', () => {
  it('mevcut satır update edilir', async () => {
    const { db, trend } = fakeDb([L(), L({ pricePerSqm: 1200 }), L({ pricePerSqm: 900 })])
    trend.findFirst.mockResolvedValue({ id: 'x1' })
    await refreshAreaPriceTrends(db as never)
    expect(trend.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'x1' } }))
  })
})
```

- [ ] **Step 2: Test fail** — `npx jest --no-coverage persistAggregates` → modül yok

- [ ] **Step 3: `persistAggregates.ts` yaz** — `scripts/aggregate-area-prices.ts` ve `scripts/aggregate-trend.ts`'in `main()` gövdesindeki `findMany` select + upsert döngüsünü BİRE BİR taşı. `computedAt` parametresi opsiyonel (`= new Date()`). Log satırı YAZMA (helper sessiz; script kendi log'unu yazar).

- [ ] **Step 4: Test geç** — `npx jest --no-coverage persistAggregates`

- [ ] **Step 5: Script'leri refactor et**

`scripts/aggregate-area-prices.ts`:
```ts
import { prisma } from '../src/lib/prisma'
import { refreshAreaPriceStats } from '../src/lib/areaPrices/persistAggregates'

async function main() {
  const { written, total } = await refreshAreaPriceStats(prisma)
  console.log(`✅ ${written} AreaPriceStat satırı yazıldı/güncellendi. Tabloda toplam ${total}.`)
}
main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
```
Aynısı `aggregate-trend.ts` için `refreshAreaPriceTrends`.

- [ ] **Step 6: Doğrula** — `npx tsc --noEmit` temiz. Dev DB varsa `DATABASE_URL=... npm run prices:aggregate` çalışır ve makul çıktı verir (regresyon yok).

- [ ] **Step 7: Commit**

```bash
git add src/lib/areaPrices/persistAggregates.ts src/lib/areaPrices/__tests__/persistAggregates.test.ts scripts/aggregate-area-prices.ts scripts/aggregate-trend.ts
git commit -m "refactor(prices): aggregate persist döngüsü paylaşılan helper'a (notify:run için)"
```

---

### Task 3: `notify/formatPctChange` + `notify/digestDue`

**Files:**
- Create: `src/lib/whatsapp/notify/formatPctChange.ts`
- Create: `src/lib/whatsapp/notify/digestDue.ts`
- Create: `src/lib/whatsapp/notify/types.ts`
- Test: `src/lib/whatsapp/notify/__tests__/formatPctChange.test.ts`, `.../digestDue.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export interface SubLike {
    id: string; phone: string; il: string; ilce: string; mahalle: string
    lastDigestMonth: string | null; lastAlertAt: Date | null; lastAlertDirection: string | null
  }
  export interface TrendBucket { scope: 'il'|'ilce'|'mahalle'; monthBucket: Date; medianPricePerSqm: number; sampleCount: number }
  // formatPctChange.ts
  export function ymKey(d: Date): string          // "2026-08" (UTC)
  export function formatPctChange(from: number, to: number): string
  // digestDue.ts
  export function digestDue(sub: Pick<SubLike,'lastDigestMonth'>, now: Date, digestDay: number): boolean
  ```
- `formatPctChange`: `pct = (to-from)/from`. `|pct| < 0.005` → `"değişim yok"`. else `` `%${(Math.abs(pct)*100).toFixed(1).replace('.',',')} ${pct>0?'artış':'düşüş'}` ``.
- `ymKey`: `` `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}` ``.
- `digestDue`: `now.getUTCDate() >= digestDay && sub.lastDigestMonth !== ymKey(now)`.

- [ ] **Step 1: Failing tests**

```ts
// formatPctChange.test.ts
import { formatPctChange, ymKey } from '../formatPctChange'
describe('ymKey', () => { it('UTC yıl-ay', () => { expect(ymKey(new Date('2026-08-03T00:00:00Z'))).toBe('2026-08') }) })
describe('formatPctChange', () => {
  it('artış', () => expect(formatPctChange(4200, 4378)).toBe('%4,2 artış'))
  it('düşüş', () => expect(formatPctChange(5000, 4460)).toBe('%10,8 düşüş'))
  it('eşik altı', () => expect(formatPctChange(4000, 4012)).toBe('değişim yok'))
})
// digestDue.test.ts
import { digestDue } from '../digestDue'
const now = new Date('2026-08-05T09:00:00Z')
describe('digestDue', () => {
  it('gün >= digestDay ve bu ay gönderilmemiş → true', () => expect(digestDue({ lastDigestMonth: '2026-07' }, now, 1)).toBe(true))
  it('bu ay zaten gönderilmiş → false', () => expect(digestDue({ lastDigestMonth: '2026-08' }, now, 1)).toBe(false))
  it('gün < digestDay → false', () => expect(digestDue({ lastDigestMonth: null }, now, 10)).toBe(false))
  it('lastDigestMonth null, gün uygun → true', () => expect(digestDue({ lastDigestMonth: null }, now, 1)).toBe(true))
})
```

- [ ] **Step 2: fail** → `npx jest --no-coverage "formatPctChange|digestDue"`
- [ ] **Step 3: 3 dosyayı yaz** (yukarıdaki imzalar)
- [ ] **Step 4: geç**
- [ ] **Step 5: `tsc` + commit**

```bash
git add src/lib/whatsapp/notify/formatPctChange.ts src/lib/whatsapp/notify/digestDue.ts src/lib/whatsapp/notify/types.ts src/lib/whatsapp/notify/__tests__/formatPctChange.test.ts src/lib/whatsapp/notify/__tests__/digestDue.test.ts
git commit -m "feat(wa/notify): formatPctChange + digestDue + notify tipleri"
```

---

### Task 4: `notify/resolveAreaTrend`

**Files:**
- Create: `src/lib/whatsapp/notify/resolveAreaTrend.ts`
- Test: `src/lib/whatsapp/notify/__tests__/resolveAreaTrend.test.ts`

**Interfaces:**
- Consumes: `SubLike`, `TrendBucket` from `./types`
- Produces:
  ```ts
  export interface AreaTrend { basis: 'mahalle'|'ilce'|'il'; buckets: TrendBucket[] }  // buckets monthBucket artan sıralı
  export function resolveAreaTrend(rows: TrendBucket[], sub: Pick<SubLike,'il'|'ilce'|'mahalle'>): AreaTrend | null
  ```
- Mantık (card.ts `priceTrend` fallback deseniyle aynı): `rows` bir mahalle için tüm scope'ları içerir (il/ilçe/mahalle 3-yönlü sorgudan). `scope==='mahalle'` kovaları ≥ 3 ise `basis:'mahalle'`; değilse `scope==='ilce'` kovaları ≥ 3 ise `basis:'ilce'`; değilse `scope==='il'` kovaları ≥ 1 ise `basis:'il'`; hiçbiri değilse `null`. Seçilen basis'in kovaları `monthBucket` artan sıralı döndürülür.

- [ ] **Step 1: Failing test**

```ts
import { resolveAreaTrend } from '../resolveAreaTrend'
const b = (scope, ym, median, n = 10) => ({ scope, monthBucket: new Date(`${ym}-01T00:00:00Z`), medianPricePerSqm: median, sampleCount: n })
const SUB = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UGURLU' }

describe('resolveAreaTrend', () => {
  it('mahalle ≥ 3 kova → mahalle basis, artan sıralı', () => {
    const rows = [b('mahalle','2026-08',5000), b('mahalle','2026-06',4600), b('mahalle','2026-07',4800), b('ilce','2026-08',5200)]
    const r = resolveAreaTrend(rows, SUB)
    expect(r?.basis).toBe('mahalle')
    expect(r?.buckets.map(x => x.medianPricePerSqm)).toEqual([4600, 4800, 5000])
  })
  it('mahalle 1 kova → ilçe fallback', () => {
    const rows = [b('mahalle','2026-08',5000), b('ilce','2026-06',4900), b('ilce','2026-07',5000), b('ilce','2026-08',5100)]
    expect(resolveAreaTrend(rows, SUB)?.basis).toBe('ilce')
  })
  it('hiçbiri yeterli değil → null', () => {
    expect(resolveAreaTrend([b('mahalle','2026-08',5000), b('ilce','2026-08',5200)], SUB)).toBeNull()
  })
})
```

- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(wa/notify): resolveAreaTrend — mahalle→ilçe→il fallback`)

---

### Task 5: `notify/thresholdAlert`

**Files:**
- Create: `src/lib/whatsapp/notify/thresholdAlert.ts`
- Test: `src/lib/whatsapp/notify/__tests__/thresholdAlert.test.ts`

**Interfaces:**
- Consumes: `resolveAreaTrend` (Task 4), `ymKey` (Task 3), `SubLike`, `TrendBucket` from `./types`
- Produces:
  ```ts
  export interface AlertResult { fire: boolean; direction?: 'up'|'down'; current?: number; baseline?: number; pctChange?: number }
  export function thresholdAlert(rows: TrendBucket[], sub: Pick<SubLike,'il'|'ilce'|'mahalle'>, now: Date, opts: { minSample: number; pct: number }): AlertResult
  ```
- Mantık:
  1. `at = resolveAreaTrend(rows, sub)`; `null` → `{ fire: false }`.
  2. `cur = at.buckets` içinde `ymKey(monthBucket) === ymKey(now)` olan kova. Yoksa → `{ fire: false }`.
  3. `baseline` = `now`'dan önceki **3 takvim ayının** kovaları (`ymKey` set'i: `now`−1ay, −2ay, −3ay). Bu 3 aya karşılık gelen kova sayısı < 3 → `{ fire: false }`.
  4. `cur.sampleCount < opts.minSample` VEYA baseline kovalarından herhangi biri `sampleCount < opts.minSample` → `{ fire: false }`.
  5. `baselineMedian` = 3 baseline kovasının `medianPricePerSqm` ortalaması.
  6. `pctChange = (cur.medianPricePerSqm - baselineMedian) / baselineMedian`. `|pctChange| < opts.pct` → `{ fire: false }`.
  7. `{ fire: true, direction: pctChange > 0 ? 'up' : 'down', current: cur.medianPricePerSqm, baseline: baselineMedian, pctChange }`.
- **Dedup burada YOK** — o `runNotify` katmanında (`lastAlertAt`/`lastAlertDirection`).

- [ ] **Step 1: Failing test** — kovalar: baseline 3 ay (Mayıs/Haz/Tem 4000) + current (Ağustos). Testler: %8 → no fire; %12 → fire up; current sampleCount 3 (minSample 5) → no fire; baseline'da 2 kova → no fire; −%15 → fire down; `resolveAreaTrend` null → no fire.

```ts
import { thresholdAlert } from '../thresholdAlert'
const now = new Date('2026-08-15T00:00:00Z')
const b = (scope, ym, median, n = 10) => ({ scope, monthBucket: new Date(`${ym}-01T00:00:00Z`), medianPricePerSqm: median, sampleCount: n })
const SUB = { il: 'T', ilce: 'O', mahalle: 'U' }
const base3 = [b('mahalle','2026-05',4000), b('mahalle','2026-06',4000), b('mahalle','2026-07',4000)]
const opts = { minSample: 5, pct: 0.10 }

describe('thresholdAlert', () => {
  it('%8 hareket → no fire', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',4320)], SUB, now, opts).fire).toBe(false)
  })
  it('%12 artış → fire up', () => {
    const r = thresholdAlert([...base3, b('mahalle','2026-08',4480)], SUB, now, opts)
    expect(r).toMatchObject({ fire: true, direction: 'up', baseline: 4000, current: 4480 })
  })
  it('current ince örneklem → no fire', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',4480,3)], SUB, now, opts).fire).toBe(false)
  })
  it('baseline eksik kova → no fire', () => {
    expect(thresholdAlert([b('mahalle','2026-06',4000), b('mahalle','2026-07',4000), b('mahalle','2026-08',4480)], SUB, now, opts).fire).toBe(false)
  })
  it('%15 düşüş → fire down', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',3400)], SUB, now, opts).direction).toBe('down')
  })
})
```

- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(wa/notify): thresholdAlert — muhafazalı eşik motoru`)

---

### Task 6: `sendTemplate` + digest/alert sarmalayıcıları

**Files:**
- Create: `src/lib/whatsapp/sendTemplate.ts`
- Test: `src/lib/whatsapp/__tests__/sendTemplate.test.ts`

**Interfaces:**
- Consumes: `WhatsappConfig` from `@/lib/whatsapp/config`; `formatTl` from `@/lib/whatsapp/formatTl`
- Produces:
  ```ts
  export interface SendTemplateDeps { fetch: typeof fetch; config: WhatsappConfig }
  export function createSendTemplate(deps: SendTemplateDeps): (to: string, template: string, params: string[]) => Promise<void>
  export function createSendDigest(send: ReturnType<typeof createSendTemplate>): (to: string, a: { mahalle: string; current: number; pctText: string; href: string }) => Promise<void>
  export function createSendAlert(send: ReturnType<typeof createSendTemplate>): (to: string, a: { mahalle: string; pctText: string; baseline: number; current: number; href: string }) => Promise<void>
  ```
- `createSendTemplate`: `POST https://graph.facebook.com/{graphVersion}/{phoneNumberId}/messages`, header `Authorization: Bearer {accessToken}`, gövde:
  ```json
  { "messaging_product":"whatsapp", "to":"<to>", "type":"template",
    "template": { "name":"<template>", "language": { "code":"tr" },
      "components": [ { "type":"body", "parameters": <params.map(p => ({ type:"text", text:p })) > } ] } }
  ```
  `!res.ok` → `console.error('[wa] template failed <status> to <mask> code=<code> type=<type> message=<message>')` (gövde JSON.parse try/catch içinde; parse başarısız → status-only). **throw ETMEZ.** fetch reject → aynı, throw etmez.
- `createSendDigest(send)` → `send(to, 'arsabil_aylik_ozet', [a.mahalle, formatTl(a.current) + ' ₺/m²', a.pctText, a.href])`
- `createSendAlert(send)` → `send(to, 'arsabil_fiyat_uyarisi', [a.mahalle, a.pctText, formatTl(a.baseline) + ' ₺/m²', formatTl(a.current) + ' ₺/m²', a.href])`

- [ ] **Step 1: Failing test**

```ts
import { createSendTemplate, createSendDigest } from '../sendTemplate'
const cfg = { verifyToken:'v', appSecret:'s', accessToken:'TOK', phoneNumberId:'PN', graphVersion:'v21.0' }

describe('createSendTemplate', () => {
  it('Graph API template gövdesi', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' })
    await createSendTemplate({ fetch: f as never, config: cfg })('905321234567', 'arsabil_aylik_ozet', ['Uğurlu', '4.900 ₺/m²', '%4,2 artış', 'https://x'])
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body).toMatchObject({ type: 'template', to: '905321234567', template: { name: 'arsabil_aylik_ozet', language: { code: 'tr' } } })
    expect(body.template.components[0].parameters).toEqual([
      { type:'text', text:'Uğurlu' }, { type:'text', text:'4.900 ₺/m²' }, { type:'text', text:'%4,2 artış' }, { type:'text', text:'https://x' },
    ])
  })
  it('!ok → console.error, throw yok, ham gövde loglanmaz', async () => {
    const f = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => '{"error":{"code":131030,"type":"OAuthException","message":"generic"}}' })
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(createSendTemplate({ fetch: f as never, config: cfg })('905321234567', 't', [])).resolves.toBeUndefined()
    const logged = spy.mock.calls[0].join(' ')
    expect(logged).toContain('131030'); expect(logged).not.toContain('905321234567'); expect(logged).not.toContain('"error"')
    spy.mockRestore()
  })
  it('fetch reject → throw yok', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(createSendTemplate({ fetch: jest.fn().mockRejectedValue(new Error('net')) as never, config: cfg })('9', 't', [])).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
describe('createSendDigest', () => {
  it('şablon + parametre eşlemesi', async () => {
    const send = jest.fn().mockResolvedValue(undefined)
    await createSendDigest(send)('9', { mahalle: 'Uğurlu', current: 4900, pctText: '%4,2 artış', href: 'https://x' })
    expect(send).toHaveBeenCalledWith('9', 'arsabil_aylik_ozet', ['Uğurlu', '4.900 ₺/m²', '%4,2 artış', 'https://x'])
  })
})
```

- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(wa): sendTemplate — Graph API type:template + digest/alert sarmalayıcıları`)

---

### Task 7: `notify/runNotify` orkestratör

**Files:**
- Create: `src/lib/whatsapp/notify/runNotify.ts`
- Test: `src/lib/whatsapp/notify/__tests__/runNotify.test.ts`

**Interfaces:**
- Consumes: `digestDue` (T3), `ymKey`/`formatPctChange` (T3), `resolveAreaTrend` (T4), `thresholdAlert` (T5), `SubLike`/`TrendBucket` from `./types`
- Produces:
  ```ts
  export interface NotifyConfig { digestDay: number; minSample: number; alertPct: number; siteBase: string }
  export interface NotifyDeps {
    listSubscriptions: () => Promise<SubLike[]>
    findTrendRows: (il: string, ilce: string, mahalle: string) => Promise<TrendBucket[]>
    sendDigest: (to: string, a: { mahalle: string; current: number; pctText: string; href: string }) => Promise<void>
    sendAlert: (to: string, a: { mahalle: string; pctText: string; baseline: number; current: number; href: string }) => Promise<void>
    markDigestSent: (subId: string, month: string) => Promise<void>
    markAlertSent: (subId: string, at: Date, direction: 'up'|'down') => Promise<void>
    now: () => Date
    config: NotifyConfig
  }
  export interface NotifySummary { subs: number; digests: number; alerts: number; skipped: number; errors: number }
  export async function runNotify(deps: NotifyDeps): Promise<NotifySummary>
  ```
- Akış (spec §4.3):
  - `subs = await listSubscriptions()`.
  - Her `sub`: `rows = await findTrendRows(sub.il, sub.ilce, sub.mahalle)` (bir `try` içinde; hata → `errors++`, logla, sonraki sub).
    - **Digest:** `digestDue(sub, now, config.digestDay)` ise: `at = resolveAreaTrend(rows, sub)`; `at` null veya `at.buckets.length < 2` → `skipped++`. Aksi halde son iki kova (`prev`,`last`): `pctText = formatPctChange(prev.median, last.median)`; `await sendDigest(sub.phone, { mahalle: sub.mahalle, current: last.medianPricePerSqm, pctText, href: config.siteBase + '/deger' })`; `await markDigestSent(sub.id, ymKey(now))`; `digests++`.
    - **Alert:** `res = thresholdAlert(rows, sub, now, { minSample, pct: alertPct })`. `res.fire` ve dedup geçerse (`sub.lastAlertAt == null` VEYA `now - lastAlertAt > 30 gün` VEYA `sub.lastAlertDirection !== res.direction`): `pctText = formatPctChange(res.baseline!, res.current!)`; `await sendAlert(sub.phone, { mahalle: sub.mahalle, pctText, baseline: res.baseline!, current: res.current!, href: config.siteBase + '/deger' })`; `await markAlertSent(sub.id, now, res.direction!)`; `alerts++`.
  - `{ subs: subs.length, digests, alerts, skipped, errors }`.
- Gönderimler arası 200ms bekleme `runNotify` İÇİNDE DEĞİL — script katmanında (test hızlı kalsın). (Not: `runNotify` saf-DI; `sendDigest`/`sendAlert` zaten throw etmez.)

- [ ] **Step 1: Failing test** — sahte deps:
  - (a) 1 abone, digest günü, mahalle 2 kova + eşik aşıldı → `sendDigest` 1×, `sendAlert` 1×, `markDigestSent`/`markAlertSent` çağrıldı, summary `{digests:1, alerts:1}`.
  - (b) idempotent: `lastDigestMonth = ymKey(now)`, `lastAlertDirection='up'` ve `lastAlertAt` dün, thresholdAlert 'up' → `sendDigest` 0×, `sendAlert` 0×.
  - (c) `findTrendRows` throw → `errors:1`, sonraki abone yine işlenir.
  - (d) `resolveAreaTrend` null (yetersiz veri) → digest `skipped`, alert fire etmez.
  - (e) farklı yön: `lastAlertDirection='down'`, thresholdAlert 'up' → `sendAlert` gönderilir.

- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(wa/notify): runNotify orkestratör`)

---

### Task 8: `scripts/whatsapp-notify.ts` + `notify:run`

**Files:**
- Create: `scripts/whatsapp-notify.ts`
- Modify: `package.json` (`"notify:run"` script)
- Test: yok (script — çekirdek `runNotify` zaten T7'de test edildi; script yalnız DI bağlar)

**Interfaces:**
- Consumes: `refreshAreaPriceStats`/`refreshAreaPriceTrends` (T2), `runNotify`/`NotifyConfig` (T7), `createSendTemplate`/`createSendDigest`/`createSendAlert` (T6), `readWhatsappConfig` (`@/lib/whatsapp/config`), `normalizeAreaName`, `prisma`
- Produces: `npm run notify:run` — Coolify Scheduled Task komutu

- [ ] **Step 1: `package.json`'a script ekle**

```json
"notify:run": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/whatsapp-notify.ts",
```

- [ ] **Step 2: `scripts/whatsapp-notify.ts` yaz**

```ts
import { prisma } from '../src/lib/prisma'
import { refreshAreaPriceStats, refreshAreaPriceTrends } from '../src/lib/areaPrices/persistAggregates'
import { readWhatsappConfig } from '../src/lib/whatsapp/config'
import { createSendTemplate, createSendDigest, createSendAlert } from '../src/lib/whatsapp/sendTemplate'
import { runNotify, type NotifyConfig } from '../src/lib/whatsapp/notify/runNotify'
import type { SubLike, TrendBucket } from '../src/lib/whatsapp/notify/types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const s = await refreshAreaPriceStats(prisma)
  const t = await refreshAreaPriceTrends(prisma)
  console.log(`[notify] aggregate: ${s.written} stat / ${t.written} trend tazelendi`)

  const config = readWhatsappConfig()
  const send = createSendTemplate({ fetch, config })
  const sendDigestRaw = createSendDigest(send)
  const sendAlertRaw = createSendAlert(send)

  const cfg: NotifyConfig = {
    digestDay: Number(process.env.NOTIFY_DIGEST_DAY ?? 1),
    minSample: Number(process.env.NOTIFY_MIN_SAMPLE ?? 5),
    alertPct: Number(process.env.NOTIFY_ALERT_PCT ?? 0.10),
    siteBase: 'https://www.arsabil.com',
  }

  const summary = await runNotify({
    now: () => new Date(),
    config: cfg,
    listSubscriptions: () => prisma.whatsappSubscription.findMany() as Promise<SubLike[]>,
    findTrendRows: async (il, ilce, mahalle) => {
      const windowStart = new Date()
      windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
      windowStart.setUTCHours(0, 0, 0, 0)
      const rows = await prisma.areaPriceTrend.findMany({
        where: {
          il,
          monthBucket: { gte: windowStart },
          OR: [{ ilce: null, mahalle: null }, { ilce, mahalle: null }, { ilce, mahalle }],
        },
        select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
      })
      return rows as TrendBucket[]
    },
    sendDigest: async (to, a) => { await sendDigestRaw(to, a); await sleep(200) },
    sendAlert: async (to, a) => { await sendAlertRaw(to, a); await sleep(200) },
    markDigestSent: (id, month) => prisma.whatsappSubscription.update({ where: { id }, data: { lastDigestMonth: month } }).then(() => {}),
    markAlertSent: (id, at, direction) => prisma.whatsappSubscription.update({ where: { id }, data: { lastAlertAt: at, lastAlertDirection: direction } }).then(() => {}),
  })
  console.log(`[notify] ${JSON.stringify(summary)}`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
```

Not: `findTrendRows`'a giren `il`/`ilce`/`mahalle` zaten `WhatsappSubscription`'da normalize saklandığı için ek `normalizeAreaName` gerekmez (bu yüzden script'te import yok).

- [ ] **Step 3: Doğrula** — `npx tsc --noEmit` temiz. `npm run build` temiz (script `src/` dışı ama tsconfig kapsıyorsa kontrol et). Dev DB'de abonelik yokken `DATABASE_URL=... WHATSAPP_VERIFY_TOKEN=x WHATSAPP_APP_SECRET=x WHATSAPP_ACCESS_TOKEN=x WHATSAPP_PHONE_NUMBER_ID=x npm run notify:run` → `subs:0` özeti, hata yok (env'ler sahte; gerçek gönderim olmayacağı için OK).

- [ ] **Step 4: Commit** (`feat(wa): notify:run script — Coolify Scheduled Task girişi`)

---

### Task 9: 5a `handleMessage` — DURDUR + opt-in yakalama + kart-sonrası soru

**Files:**
- Modify: `src/lib/whatsapp/types.ts` (`ConvState.awaitingFollowup`)
- Modify: `src/lib/whatsapp/handleMessage.ts` (yeni adımlar + `HandleDeps` genişletme)
- Modify: `src/lib/whatsapp/renderCard.ts` (placeholder satırını KALDIR)
- Create: `src/lib/whatsapp/renderFollowup.ts` (yeni Türkçe metinler)
- Test: `src/lib/whatsapp/__tests__/renderFollowup.test.ts`, `src/lib/whatsapp/__tests__/handleMessage.test.ts` (mevcut dosyaya yeni testler)

**Interfaces:**
- Consumes: `ConvState` from `./types`
- Produces:
  - `types.ts`: `ConvState` içine `awaitingFollowup?: { il: string; ilce: string; mahalle: string }`
  - `renderFollowup.ts`:
    ```ts
    export const renderFollowup: {
      prompt(mahalle: string): string
      subscribed(mahalle: string): string
      unsubscribedAll(): string
      noSubscription(): string
    }
    ```
  - `HandleDeps` (handleMessage.ts) yeni alanlar:
    ```ts
    hasSubscription: (phone: string, il: string, ilce: string, mahalle: string) => Promise<boolean>
    upsertSubscription: (phone: string, area: { il: string; ilce: string; mahalle: string }) => Promise<void>
    deleteSubscriptions: (phone: string) => Promise<number>
    ```

- [ ] **Step 1: `renderFollowup` failing test + implement**

```ts
import { renderFollowup } from '../renderFollowup'
it('prompt mahalle adı + "Evet" içerir', () => {
  const t = renderFollowup.prompt('Uğurlu')
  expect(t).toContain('Uğurlu'); expect(t.toLowerCase()).toContain('evet'); expect(t).toContain('takip')
})
it('subscribed onay + DURDUR ipucu', () => {
  expect(renderFollowup.subscribed('Uğurlu')).toContain('DURDUR')
})
it('unsubscribedAll / noSubscription', () => {
  expect(renderFollowup.unsubscribedAll()).toContain('durduruldu')
  expect(renderFollowup.noSubscription()).toContain('abone')
})
```

Metinler:
- `prompt(m)` → `` `📩 ${m} Mah. için fiyat değişimlerini takip edeyim mi? *Evet* yaz — ayda bir fiyat özeti, arada sert bir hareket olursa uyarı göndereyim.` ``
- `subscribed(m)` → `` `✅ ${m} Mah. takibe alındı. Durdurmak için istediğin an DURDUR yaz.` ``
- `unsubscribedAll()` → `'Tüm fiyat takip aboneliklerin durduruldu. İstediğin an yeni bir parsel sorarak tekrar takip başlatabilirsin.'`
- `noSubscription()` → `'Zaten aktif bir fiyat takip aboneliğin yok.'`

- [ ] **Step 2: `renderCard.ts` — placeholder satırını sil**

`const PLACEHOLDER = ...` ve onu `lines.push` eden satırı KALDIR. `renderCard.test.ts`'te `expect(t).toContain('Yakında:')` assert'ini SİL (o testte artık placeholder yok — testi güncelle, "link satırı var" assert'i kalsın).

- [ ] **Step 3: `types.ts` — `awaitingFollowup` ekle**

- [ ] **Step 4: `handleMessage.ts` failing testler yaz** (mevcut `handleMessage.test.ts`'e):

```ts
it('DURDUR → tüm abonelikleri siler + onay, state korunur', async () => {
  const { deps, sent } = makeDeps({ deleteSubscriptions: jest.fn().mockResolvedValue(2) })
  await handleMessage(msg({ text: 'DURDUR' }), deps)
  expect(deps.deleteSubscriptions).toHaveBeenCalledWith('905321234567')
  expect(sent[0]).toContain('durduruldu')
  expect(deps.buildCard).not.toHaveBeenCalled()
})
it('DURDUR ama abonelik yok → "zaten abone değilsin"', async () => {
  const { deps, sent } = makeDeps({ deleteSubscriptions: jest.fn().mockResolvedValue(0) })
  await handleMessage(msg({ text: 'durdur' }), deps)
  expect(sent[0].toLowerCase()).toContain('abone')
})
it('kart sonrası: abone değilse takip sorusu gönderilir + awaitingFollowup kaydedilir', async () => {
  const { deps, sent, saved } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(false) })
  await handleMessage(msg(), deps)
  expect(sent[sent.length - 1]).toContain('takip edeyim mi')
  expect(saved[saved.length - 1]).toMatchObject({ awaitingFollowup: { mahalle: 'Uğurlu' } })
})
it('zaten abone → takip sorusu YOK', async () => {
  const { deps, sent } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(true) })
  await handleMessage(msg(), deps)
  expect(sent.join('')).not.toContain('takip edeyim mi')
})
it('awaitingFollowup + "Evet" → upsertSubscription + onay', async () => {
  const load = jest.fn().mockResolvedValue({ state: { fields: {}, awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } }, lastMessageId: 'wamid.0' })
  const { deps, sent } = makeDeps({ store: { loadConversation: load, saveConversation: jest.fn() }, upsertSubscription: jest.fn().mockResolvedValue(undefined) })
  await handleMessage(msg({ text: 'evet', messageId: 'wamid.1' }), deps)
  expect(deps.upsertSubscription).toHaveBeenCalledWith('905321234567', { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  expect(sent[0]).toContain('takibe alındı')
})
it('awaitingFollowup + başka metin → flag temizlenir, mesaj normal işlenir', async () => {
  const load = jest.fn().mockResolvedValue({ state: { fields: {}, awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } }, lastMessageId: 'wamid.0' })
  const { deps } = makeDeps({ store: { loadConversation: load, saveConversation: jest.fn() } })
  await handleMessage(msg({ text: 'Trabzon Of 5/6', messageId: 'wamid.2' }), deps)
  expect(deps.understanding.understand).toHaveBeenCalled()
})
```

`makeDeps` içine yeni 3 dep'in varsayılanını ekle: `hasSubscription: jest.fn().mockResolvedValue(false)`, `upsertSubscription: jest.fn().mockResolvedValue(undefined)`, `deleteSubscriptions: jest.fn().mockResolvedValue(0)`.

- [ ] **Step 5: `handleMessage.ts` implement**

Yeni adımların yeri (mevcut numaralı yorumlara göre):
- **Adım 5'ten (empty guard) SONRA, adım 5b'den (çıkış kapısı) ÖNCE:**
  - `5c. DURDUR:` `const low = text.toLocaleLowerCase('tr')`; `if (['durdur','stop','aboneliği iptal','abonelikten çık'].includes(low)) { const n = await deps.deleteSubscriptions(msg.from); await deps.sendText(msg.from, n > 0 ? renderFollowup.unsubscribedAll() : renderFollowup.noSubscription()); /* state değişmeden */ await deps.store.saveConversation(msg.from, state, msg.messageId); return }`
  - `5d. Follow-up cevabı:` `if (state.awaitingFollowup) { const yes = ['evet','e','olur','tamam','takip et','takip'].includes(low); const area = state.awaitingFollowup; state.awaitingFollowup = undefined; if (yes) { await deps.upsertSubscription(msg.from, area); await deps.sendText(msg.from, renderFollowup.subscribed(area.mahalle)); await deps.store.saveConversation(msg.from, state, msg.messageId); return } /* yes değil → flag temizlendi, aşağı düş, mesaj normal işlensin */ }`
- **Adım 11 (build card) `res.ok` dalında, kart `sendText`'inden SONRA, adım 12 save'den ÖNCE:**
  - `if (!(await deps.hasSubscription(msg.from, fields.ilText!, fields.ilceText!, fields.mahalleText!))) { await deps.sendText(msg.from, renderFollowup.prompt(fields.mahalleText!)); state.awaitingFollowup = { il: fields.ilText!, ilce: fields.ilceText!, mahalle: fields.mahalleText! } }`
  - (adım 12 zaten `state`'i kaydediyor — `awaitingFollowup` dahil olur)

- [ ] **Step 6: Doğrula** — `npx jest --no-coverage "whatsapp"` tümü yeşil (`renderCard` güncellenen testi dahil), `npx tsc --noEmit` temiz.

- [ ] **Step 7: Commit** (`feat(wa): handleMessage — DURDUR opt-out + kart sonrası takip opt-in`)

---

### Task 10: `route.ts` — subscription deps wiring

**Files:**
- Modify: `src/app/api/whatsapp/webhook/route.ts` (`buildHandleDeps` içine 3 yeni dep)
- Test: `src/app/api/whatsapp/webhook/__tests__/route.test.ts` (mevcut — mock'lara `whatsappSubscription` ekle, gerekiyorsa)

**Interfaces:**
- Consumes: `HandleDeps` (T9 genişletilmiş), `prisma`, `normalizeAreaName`
- Produces: canlı `hasSubscription` / `upsertSubscription` / `deleteSubscriptions`

- [ ] **Step 1: `buildHandleDeps()` içine ekle**

```ts
const nk = (il: string, ilce: string, mahalle: string) => ({
  il: normalizeAreaName(il), ilce: normalizeAreaName(ilce), mahalle: normalizeAreaName(mahalle),
})
// ...HandleDeps nesnesine:
hasSubscription: async (phone, il, ilce, mahalle) => {
  const k = nk(il, ilce, mahalle)
  const row = await prisma.whatsappSubscription.findUnique({
    where: { phone_il_ilce_mahalle: { phone, ...k } }, select: { id: true },
  })
  return !!row
},
upsertSubscription: async (phone, area) => {
  const k = nk(area.il, area.ilce, area.mahalle)
  await prisma.whatsappSubscription.upsert({
    where: { phone_il_ilce_mahalle: { phone, ...k } },
    create: { phone, ...k },
    update: {},
  })
},
deleteSubscriptions: async (phone) => {
  const r = await prisma.whatsappSubscription.deleteMany({ where: { phone } })
  return r.count
},
```

(Compound unique adı Prisma'da `phone_il_ilce_mahalle` olur — `prisma generate` sonrası doğrula; farklıysa üretilen ada göre düzelt.)

- [ ] **Step 2: route testini güncelle** — `jest.mock('@/lib/prisma')` içindeki `prisma` nesnesine `whatsappSubscription: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) }` ekle (POST testleri `after` → `handleMessage` mock'lu olduğu için muhtemelen dokunmadan geçer; sadece TS mock tipi için gerekebilir). Mevcut 6 test yeşil kalmalı.

- [ ] **Step 3: Doğrula** — `npx jest --no-coverage "whatsapp/webhook"` yeşil; `npx tsc --noEmit` temiz; `npm run build` temiz (`/api/whatsapp/webhook` route listede).

- [ ] **Step 4: Commit** (`feat(wa): webhook route — subscription deps (has/upsert/delete)`)

---

## Final doğrulama (tüm task'lar bitince)

- [ ] `npx tsc --noEmit` — temiz
- [ ] `npx jest --no-coverage --roots "<rootDir>/src"` — TÜM proje yeşil
- [ ] `npm run build` — temiz
- [ ] Migration `20260901120000_add_whatsapp_subscription` dev DB'de; prod'da BEKLEMEDE (batch deploy)
- [ ] `npm run notify:run` dev'de abonelik yokken temiz koşar (`subs:0`)
- [ ] Whole-branch review (SDD final review)
- [ ] `.env.example` / README'ye 3 opsiyonel env notu: `NOTIFY_DIGEST_DAY`, `NOTIFY_MIN_SAMPLE`, `NOTIFY_ALERT_PCT`

**Deploy DIŞI** — 5b/6b/6c + Akif hepsi lokal bitince tek seferde `main` merge + push + Coolify (deploy + `WhatsappSubscription` migration + 2 Meta şablonu onayı + Scheduled Task `npm run notify:run` haftalık).

## v1 kalıntıları (ledger'a)

- `runNotify` her koşuda tüm `prices:aggregate`/`trend`'i yeniden hesaplar — Trabzon-pilot veride ucuz, ulusal veride artımlıya geçilebilir.
- `sendDigest`/`sendAlert` 200ms bekleme script katmanında — çok aboneli turlarda toplam süre uzar (haftalık task, sorun değil).
- Şablon parametresinde `₺`/newline — Meta onayı reddederse wording sadeleşir, parametre yapısı sabit.
- Follow-up "hayır" cevabına açık "tamam" denmiyor (bilinçli, gürültü azaltma).
- `href` parsel taşımıyor (`/deger` ana sayfa) — 6b mahalle sayfası gelince oraya işaret edebilir.
