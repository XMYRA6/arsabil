# Akif-5c Aşama C — İmar, Bölge Daire Fiyatı ve Hesap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konut ilanlarından bölge daire fiyatı istatistiği üretmek; WhatsApp Akif'in imar bilinmeyen müşteride fiyatı doğrulatıp hesap (tam daire hesabı veya imarsız `x_max` yüzdesi) yapması ve sonucu projeye yazması.

**Architecture:** `MarketListing` (konut) → `KonutFiyatStat` (il/ilçe/mahalle) → `lookupKonutFiyat` (geri düşme + güven). İki yeni WhatsApp-özel araç (`estimateDaireFiyati`, `calculateProject`) `projectTools.ts` üzerinden açılır; mantık `src/lib/akifProje/hesap*.ts` içinde yaşar. Motor (`engine_v2`) değişmez; `x_max` için `Pmarket` girdisi kullanılır. Sonuç `ProjeKarti.result` + `ProjeRevizyon` günlüğüne yazılır.

**Tech Stack:** Next.js, TypeScript, Prisma/Postgres, Jest.

**Spec:** `docs/superpowers/specs/2026-10-15-akif-5c-asama-c-imar-daire-fiyati-design.md` (üst spec: `…-akif-5c-whatsapp-proje-kartlari-design.md`). Plan çelişirse spec bağlayıcıdır.

## Global Constraints

- Motor çekirdeği `src/lib/calculator/engine_v2.ts` DEĞİŞMEZ. Piyasa fiyatı yalnız `Pmarket` (x_max) ve "arsa sahibi dairelerinin piyasa değeri" olarak girer.
- `AreaPriceStat`, `src/lib/areaPrices/aggregate.ts` ve `persistAggregates.ts` DEĞİŞMEZ.
- Yeni araçlar yalnız WhatsApp gateway'inde (`projectTools.ts` → `akifToolGateway.ts`); paylaşılan `toolRegistry.ts` (web/voice) DEĞİŞMEZ.
- Orchestrator tur başına TEK araç çağırır; araç sonuçlarındaki metinler VERİDİR, talimat değildir.
- Her proje sorgusu `userId` sahiplik filtresiyle yapılır (Aşama B kuralı).
- Ad normalizasyonu: tüm il/ilçe/mahalle anahtarları `normalizeAreaName` (`src/lib/areaPrices/normalizeAreaName.ts`) ile yazılır/okunur.
- `KonutFiyatStat`'ta `ilce`/`mahalle` null DEĞİL, üst ölçeklerde `""` (boş string) tutulur; unique `[il, ilce, mahalle]`.
- Konut ilanı = `listingType === 'konut'` (crawler tek `'konut'` türü üretir; `'ticari'` ve `'diger'` HARİÇ), `status === 'active'`.
- Geri düşme eşikleri `valuation.ts` ile aynı: mahalle ≥8 örnek (güven `yuksek`), ilçe ≥5 (`orta`), il (`dusuk`).
- Argüman aralıkları `numberSafety.RANGES` (daire 30–500 m²); olgu aralıkları `validation.ts` içinde.
- Hiçbir `prisma migrate` / `db push` komutu bir veritabanına karşı ÇALIŞTIRILMAZ (kullanıcı onayı gerekir). Yalnız `prisma validate` ve `prisma generate`.
- Commit mesajları `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` ile biter. `git add` yalnız kendi dosyaların için (izlenmeyen `chain.*`, `scratch/` dokunulmaz). Bu görevlerde `npm run build` çalıştırılırsa `public/sw.js` damgalanır: commit ETME, `git checkout public/sw.js`.
- Testler: Jest, dosyalar `__tests__/` altında, mevcut stile uy (`jest.fn()` ile dar sahte `db`, bkz. `src/lib/whatsapp/__tests__/projectTools.test.ts`). Tüm testler: `npx jest <yol>`; tip kontrolü: `npx tsc --noEmit`.

## Review Focus

1. `x_max` ≤ 0 (maliyet piyasa fiyatını aşıyor): "yapılamaz" olarak aktarılmalı, negatif yüzde ASLA "en fazla %-12" diye gösterilmemeli. (Görev 5, 6)
2. Bayat `daireFiyati` (45 gün+) sessizce kullanılmamalı: sonuç `fiyatBayat: true` + tarih taşımalı. (Görev 5, 6)
3. Başka kullanıcının projesi / olmayan proje: `not_found`, sızıntı yok. (Görev 6)
4. Veri yetersiz bölge: tahmin SUNULMAZ (`price_unavailable`), uydurma fiyat yok; ne emsal ne fiyat varken hesap `failed` ile eksiği söyler. (Görev 3, 5, 6)
5. Aynı hesap tekrar çalıştırılınca `ProjeRevizyon` şişmemeli; `result` yine güncellenmeli. (Görev 6)
6. İlan toplamasında aykırı değer (tek bir 1 TL / 5 milyar TL ilan) medyanı bozmamalı. (Görev 2)

---

## File Structure

| Dosya | Sorumluluk |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261016120000_add_konut_fiyat_stat_and_proje_result/migration.sql` | `KonutFiyatStat` modeli, `ProjeKarti.result` |
| `src/lib/konutPrices/aggregate.ts` | Saf: konut ilanlarından istatistik satırları |
| `src/lib/konutPrices/persist.ts` | DB: `refreshKonutFiyatStats` |
| `src/lib/konutPrices/lookup.ts` | DB: `lookupKonutFiyat` (geri düşme + güven) |
| `scripts/aggregate-konut-prices.ts` | CLI sarmalayıcı (`npm run prices:konut`) |
| `src/lib/akifProje/hesap.ts` | Saf: `computeProjectEstimate` (tam / imarsız mod) |
| `src/lib/akifProje/hesapTools.ts` | DB: `runEstimateDaireFiyati`, `runCalculateProject` (proje+olgu yükle, hesapla, kaydet) |
| `src/lib/whatsapp/projectTools.ts` | 2 yeni araç tanımı/doğrulama/dispatch bağlantısı |
| `src/lib/ai/akif/contract.ts` | `ProjectCard.op` birliğine 3 yeni op |
| `src/lib/whatsapp/akifHandleMessage.ts` | `recentProjects` yeni op'lardan beslenir |
| `src/lib/whatsapp/akifToolPolicy.ts` | Politika metni |
| `src/app/dashboard/akif-projeler/page.tsx` | `hesap` revizyon etiketi, nesne değeri gösterimi |
| `docs/akif/konut-tarama-pilot.md`, `docs/akif/akif-2-insan-duman-kontrol-listesi.md` | Operasyon runbook'u, duman testi |

---

### Task 1: Prisma şeması ve migration (KonutFiyatStat, ProjeKarti.result)

**Files:**
- Modify: `prisma/schema.prisma` (`model ProjeKarti` ~satır 617; `AreaPriceStat` ~satır 409'un yanına yeni model)
- Create: `prisma/migrations/20261016120000_add_konut_fiyat_stat_and_proje_result/migration.sql`

**Interfaces:**
- Produces: Prisma modeli `KonutFiyatStat { id, il, ilce, mahalle, scope, medianPricePerSqm, p25, p75, sampleCount, medianAreaSqm, computedAt }` ve `@@unique([il, ilce, mahalle])` (Prisma bileşik anahtar adı `il_ilce_mahalle`); `ProjeKarti.result Json?`.

- [ ] **Step 1: Modeli ekle**

`prisma/schema.prisma`, `AreaPriceStat` modelinin hemen altına:

```prisma
// Akif-5c Aşama C — bölge konut (daire) fiyat istatistiği. AreaPriceStat'tan FARKLI:
// ilce/mahalle null DEĞİL, üst ölçeklerde "" tutulur; böylece Postgres unique'i
// il/ilçe satırlarında da çoğalmayı engeller (null'lar unique'te eşit sayılmaz).
model KonutFiyatStat {
  id                String   @id @default(cuid())
  il                String
  ilce              String   @default("")
  mahalle           String   @default("")
  scope             String // "il" | "ilce" | "mahalle"
  medianPricePerSqm Float
  p25               Float
  p75               Float
  sampleCount       Int
  medianAreaSqm     Float
  computedAt        DateTime

  @@unique([il, ilce, mahalle])
}
```

`model ProjeKarti` içinde `inputs Json` satırının altına ekle:

```prisma
  result      Json?
```

- [ ] **Step 2: Migration SQL'i yaz**

`prisma/migrations/20261016120000_add_konut_fiyat_stat_and_proje_result/migration.sql` (stil: `20261015120000_add_akif_proje_kartlari/migration.sql` ile aynı):

```sql
-- AlterTable
ALTER TABLE "ProjeKarti" ADD COLUMN     "result" JSONB;

-- CreateTable
CREATE TABLE "KonutFiyatStat" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL DEFAULT '',
    "mahalle" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "medianAreaSqm" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KonutFiyatStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KonutFiyatStat_il_ilce_mahalle_key" ON "KonutFiyatStat"("il", "ilce", "mahalle");
```

- [ ] **Step 3: Doğrula (DB'ye DOKUNMADAN)**

Run: `npx prisma validate` → "The schema ... is valid".
Run: `npx prisma generate` → başarılı.
Run: `npx tsc --noEmit` → hata yok (yeni alan yalnız tipe eklenir).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261016120000_add_konut_fiyat_stat_and_proje_result
git commit -m "feat(akif-5c): KonutFiyatStat modeli ve ProjeKarti.result kolonu (migration)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Konut fiyat istatistiği — saf hesap

**Files:**
- Create: `src/lib/konutPrices/aggregate.ts`
- Test: `src/lib/konutPrices/__tests__/aggregate.test.ts`

**Interfaces:**
- Consumes: `median`, `percentile` (`@/lib/areaPrices/stats`), `normalizeAreaName`.
- Produces:
  ```ts
  export interface KonutInputRow { listingType: string; pricePerSqm: number | null; areaSqm: number | null; status: string; il: string | null; ilce: string | null; mahalle: string | null }
  export interface KonutFiyatStatRow { il: string; ilce: string; mahalle: string; scope: 'il' | 'ilce' | 'mahalle'; medianPricePerSqm: number; p25: number; p75: number; sampleCount: number; medianAreaSqm: number }
  export function aggregateKonutPrices(rows: KonutInputRow[]): KonutFiyatStatRow[]
  ```

Kurallar (spec §3.2): yalnız `listingType==='konut'` ve `status==='active'`; `areaSqm` 40–400 aralığında, `pricePerSqm` sonlu ve >0, `il` dolu; aykırı eleme **il bazlı**: il içindeki geçerli ilanların `pricePerSqm` p5–p95 bandı dışında kalanlar atılır (il'de <20 ilan varsa eleme yapılmaz); sonra il/ilçe/mahalle gruplarına ayır; grup <3 örnekse satır üretme (`MIN_SAMPLE = 3`); üst ölçeklerde `ilce`/`mahalle` `""`.

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { aggregateKonutPrices, type KonutInputRow } from '../aggregate'

const row = (o: Partial<KonutInputRow> = {}): KonutInputRow => ({
  listingType: 'konut', pricePerSqm: 50_000, areaSqm: 100, status: 'active',
  il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ...o,
})
const many = (n: number, o: Partial<KonutInputRow> = {}) => Array.from({ length: n }, () => row(o))

describe('aggregateKonutPrices', () => {
  it('konut olmayan, aktif olmayan, geçersiz m²/fiyatlı ilanları atar', () => {
    const rows = [
      ...many(3),
      row({ listingType: 'arsa' }), row({ listingType: 'ticari' }), row({ status: 'delisted' }),
      row({ areaSqm: 39 }), row({ areaSqm: 401 }), row({ areaSqm: null }),
      row({ pricePerSqm: null }), row({ pricePerSqm: 0 }), row({ pricePerSqm: Number.NaN }), row({ il: null }),
    ]
    const out = aggregateKonutPrices(rows)
    expect(out.find((r) => r.scope === 'il')?.sampleCount).toBe(3)
  })

  it('üç ölçekte satır üretir; üst ölçeklerde ilce/mahalle boş string', () => {
    const out = aggregateKonutPrices(many(3))
    expect(out.map((r) => [r.scope, r.il, r.ilce, r.mahalle])).toEqual([
      ['il', 'TRABZON', '', ''],
      ['ilce', 'TRABZON', 'ORTAHISAR', ''],
      ['mahalle', 'TRABZON', 'ORTAHISAR', 'UGURLU'],
    ])
  })

  it('3 örnekten azsa satır üretmez', () => {
    expect(aggregateKonutPrices(many(2))).toEqual([])
  })

  it('medyan, p25, p75 ve medyan m² hesaplar', () => {
    const prices = [40_000, 50_000, 60_000, 70_000, 80_000]
    const rows = prices.map((p, i) => row({ pricePerSqm: p, areaSqm: 80 + i * 10 }))
    const mah = aggregateKonutPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.medianPricePerSqm).toBe(60_000)
    expect(mah.p25).toBe(50_000)
    expect(mah.p75).toBe(70_000)
    expect(mah.medianAreaSqm).toBe(100)
    expect(mah.sampleCount).toBe(5)
  })

  it('farklı yazımlı aynı mahalleyi tek grupta toplar (normalizeAreaName)', () => {
    const rows = [row({ mahalle: 'Uğurlu' }), row({ mahalle: 'UĞURLU' }), row({ mahalle: 'Ugurlu' })]
    expect(aggregateKonutPrices(rows).filter((r) => r.scope === 'mahalle')).toHaveLength(1)
  })

  it('il en az 20 ilan içerince il bazlı p5–p95 dışındaki aykırıları atar (medyan bozulmaz)', () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => row({ pricePerSqm: 45_000 + i * 500 })),
      row({ pricePerSqm: 1 }), row({ pricePerSqm: 9_000_000 }),
    ]
    const il = aggregateKonutPrices(rows).find((r) => r.scope === 'il')!
    expect(il.sampleCount).toBeLessThan(32)
    expect(il.medianPricePerSqm).toBeGreaterThan(50_000)
    expect(il.medianPricePerSqm).toBeLessThan(60_000)
  })

  it('il 20 ilandan azsa eleme yapmaz', () => {
    const rows = [...many(5), row({ pricePerSqm: 9_000_000 })]
    expect(aggregateKonutPrices(rows).find((r) => r.scope === 'il')!.sampleCount).toBe(6)
  })

  it('ilçesi/mahallesi olmayan ilan yalnız il grubuna girer', () => {
    const out = aggregateKonutPrices(many(3, { ilce: null, mahalle: null }))
    expect(out.map((r) => r.scope)).toEqual(['il'])
  })
})
```

- [ ] **Step 2: Testin düştüğünü doğrula**

Run: `npx jest src/lib/konutPrices/__tests__/aggregate.test.ts` → FAIL ("Cannot find module '../aggregate'").

- [ ] **Step 3: Uygula**

`src/lib/konutPrices/aggregate.ts`:

```ts
// Akif-5c Aşama C — konut (daire) ilanlarından bölge fiyat istatistiği. Saf modül.

import { median, percentile } from '@/lib/areaPrices/stats'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export interface KonutInputRow {
  listingType: string
  pricePerSqm: number | null
  areaSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
}

export interface KonutFiyatStatRow {
  il: string
  ilce: string
  mahalle: string
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
  medianAreaSqm: number
}

const MIN_SAMPLE = 3
const MIN_AREA = 40
const MAX_AREA = 400
const MIN_FOR_OUTLIER_TRIM = 20

interface Clean { pricePerSqm: number; areaSqm: number; il: string; ilce: string; mahalle: string }

const finitePositive = (n: number | null): n is number => n != null && Number.isFinite(n) && n > 0

function clean(rows: KonutInputRow[]): Clean[] {
  const out: Clean[] = []
  for (const r of rows) {
    if (r.status !== 'active' || r.listingType !== 'konut') continue
    if (!finitePositive(r.pricePerSqm) || !finitePositive(r.areaSqm)) continue
    if (r.areaSqm < MIN_AREA || r.areaSqm > MAX_AREA) continue
    if (!r.il) continue
    out.push({
      pricePerSqm: r.pricePerSqm,
      areaSqm: r.areaSqm,
      il: normalizeAreaName(r.il),
      ilce: r.ilce ? normalizeAreaName(r.ilce) : '',
      mahalle: r.ilce && r.mahalle ? normalizeAreaName(r.mahalle) : '',
    })
  }
  return out
}

/** İl bazlı p5–p95 bandı dışındakileri atar; ilde <20 ilan varsa dokunmaz. */
function trimOutliersPerIl(rows: Clean[]): Clean[] {
  const byIl = new Map<string, Clean[]>()
  for (const r of rows) {
    const a = byIl.get(r.il)
    if (a) a.push(r)
    else byIl.set(r.il, [r])
  }
  const kept: Clean[] = []
  for (const list of byIl.values()) {
    if (list.length < MIN_FOR_OUTLIER_TRIM) {
      kept.push(...list)
      continue
    }
    const prices = list.map((r) => r.pricePerSqm)
    const lo = percentile(prices, 5)
    const hi = percentile(prices, 95)
    for (const r of list) if (r.pricePerSqm >= lo && r.pricePerSqm <= hi) kept.push(r)
  }
  return kept
}

function statRow(scope: KonutFiyatStatRow['scope'], key: Pick<Clean, 'il' | 'ilce' | 'mahalle'>, group: Clean[]): KonutFiyatStatRow {
  const prices = group.map((g) => g.pricePerSqm)
  return {
    il: key.il,
    ilce: key.ilce,
    mahalle: key.mahalle,
    scope,
    medianPricePerSqm: median(prices),
    p25: percentile(prices, 25),
    p75: percentile(prices, 75),
    sampleCount: group.length,
    medianAreaSqm: median(group.map((g) => g.areaSqm)),
  }
}

export function aggregateKonutPrices(rows: KonutInputRow[]): KonutFiyatStatRow[] {
  const data = trimOutliersPerIl(clean(rows))
  const groups = {
    il: new Map<string, Clean[]>(),
    ilce: new Map<string, Clean[]>(),
    mahalle: new Map<string, Clean[]>(),
  }
  const push = (m: Map<string, Clean[]>, k: string, r: Clean) => {
    const a = m.get(k)
    if (a) a.push(r)
    else m.set(k, [r])
  }
  for (const r of data) {
    push(groups.il, r.il, r)
    if (r.ilce) push(groups.ilce, `${r.il}|${r.ilce}`, r)
    if (r.ilce && r.mahalle) push(groups.mahalle, `${r.il}|${r.ilce}|${r.mahalle}`, r)
  }
  const out: KonutFiyatStatRow[] = []
  for (const scope of ['il', 'ilce', 'mahalle'] as const) {
    for (const group of groups[scope].values()) {
      if (group.length < MIN_SAMPLE) continue
      const f = group[0]
      out.push(statRow(scope, { il: f.il, ilce: scope === 'il' ? '' : f.ilce, mahalle: scope === 'mahalle' ? f.mahalle : '' }, group))
    }
  }
  return out
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `npx jest src/lib/konutPrices/__tests__/aggregate.test.ts` → hepsi PASS. `npx tsc --noEmit` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/konutPrices/aggregate.ts src/lib/konutPrices/__tests__/aggregate.test.ts
git commit -m "feat(akif-5c): konut fiyat istatistiği saf hesabı (aykırı eleme, ölçekler)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: İstatistiği yazma (persist), `lookupKonutFiyat` ve CLI

**Files:**
- Create: `src/lib/konutPrices/persist.ts`, `src/lib/konutPrices/lookup.ts`, `scripts/aggregate-konut-prices.ts`
- Modify: `package.json` (scripts: `"prices:konut"`, `prices:aggregate` satırının altına, aynı biçim)
- Test: `src/lib/konutPrices/__tests__/persist.test.ts`, `src/lib/konutPrices/__tests__/lookup.test.ts`

**Interfaces:**
- Consumes: `aggregateKonutPrices`/`KonutInputRow` (Görev 2).
- Produces:
  ```ts
  // persist.ts
  export interface KonutPersistDb {
    marketListing: { findMany(args: unknown): Promise<unknown[]> }
    konutFiyatStat: { upsert(args: unknown): Promise<unknown>; count(): Promise<number> }
  }
  export function refreshKonutFiyatStats(db: KonutPersistDb, computedAt?: Date): Promise<{ written: number; total: number }>

  // lookup.ts
  export type KonutScale = 'mahalle' | 'ilce' | 'il'
  export interface KonutFiyatLookup {
    tl: number            // yüzlüğe yuvarlanmış tahmin (medyan TL/m² × daireM2)
    perSqm: number        // yuvarlanmış medyan TL/m²
    scale: KonutScale
    sampleCount: number
    confidence: 'yuksek' | 'orta' | 'dusuk'
    bolge: string         // "TRABZON/ORTAHISAR/UGURLU" (ölçeğe göre kısalır)
  }
  export interface KonutLookupDb {
    konutFiyatStat: { findMany(args: unknown): Promise<Array<{ scope: string; medianPricePerSqm: number; sampleCount: number }>> }
  }
  export function lookupKonutFiyat(db: KonutLookupDb, a: { il: string; ilce: string; mahalle: string; daireM2: number }): Promise<KonutFiyatLookup | null>
  ```
  `lookupKonutFiyat` girdi adlarını `normalizeAreaName` ile normalleştirir. Geri düşme: mahalle satırı `sampleCount>=8` → ilçe satırı `>=5` → il satırı (herhangi bir sayı, kayıt varsa) → yoksa `null`. `daireM2` aralık dışı (30–500 değil) veya sonlu değilse `null`. `tl = Math.round(perSqm * daireM2 / 100) * 100`.

- [ ] **Step 1: Başarısız testleri yaz**

`persist.test.ts`:

```ts
import { refreshKonutFiyatStats, type KonutPersistDb } from '../persist'

const NOW = new Date('2026-10-16T10:00:00Z')
const listing = { listingType: 'konut', pricePerSqm: 50_000, areaSqm: 100, status: 'active', il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }

function makeDb(rows: unknown[]) {
  const upsert = jest.fn().mockResolvedValue({})
  const db: KonutPersistDb = {
    marketListing: { findMany: jest.fn().mockResolvedValue(rows) },
    konutFiyatStat: { upsert, count: jest.fn().mockResolvedValue(3) },
  }
  return { db, upsert }
}

describe('refreshKonutFiyatStats', () => {
  it('her satır için bileşik anahtarla upsert eder ve toplamı döner', async () => {
    const { db, upsert } = makeDb([listing, listing, listing])
    const r = await refreshKonutFiyatStats(db, NOW)
    expect(r).toEqual({ written: 3, total: 3 })
    expect(upsert).toHaveBeenCalledTimes(3)
    const first = upsert.mock.calls[0][0]
    expect(first.where).toEqual({ il_ilce_mahalle: { il: 'TRABZON', ilce: '', mahalle: '' } })
    expect(first.create).toMatchObject({ scope: 'il', sampleCount: 3, computedAt: NOW })
    expect(first.update).toMatchObject({ scope: 'il', sampleCount: 3, computedAt: NOW })
  })

  it('findMany yalnız gerekli alanları ve yalnız konut/aktif ilanları ister', async () => {
    const { db } = makeDb([])
    await refreshKonutFiyatStats(db, NOW)
    const arg = (db.marketListing.findMany as jest.Mock).mock.calls[0][0]
    expect(arg.where).toEqual({ listingType: 'konut', status: 'active' })
    expect(Object.keys(arg.select).sort()).toEqual(['areaSqm', 'il', 'ilce', 'listingType', 'mahalle', 'pricePerSqm', 'status'])
  })
})
```

`lookup.test.ts`:

```ts
import { lookupKonutFiyat, type KonutLookupDb } from '../lookup'

const stat = (scope: string, median: number, n: number) => ({ scope, medianPricePerSqm: median, sampleCount: n })
const dbWith = (rows: ReturnType<typeof stat>[]): KonutLookupDb => ({
  konutFiyatStat: { findMany: jest.fn().mockResolvedValue(rows) },
})
const A = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', daireM2: 150 }

describe('lookupKonutFiyat', () => {
  it('mahalle ≥8 örnek → yuksek güven, tl yüzlüğe yuvarlanır', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('mahalle', 46_667, 9), stat('ilce', 40_000, 50), stat('il', 30_000, 200)]), A)
    expect(r).toEqual({ tl: 7_000_000, perSqm: 46_667, scale: 'mahalle', sampleCount: 9, confidence: 'yuksek', bolge: 'TRABZON/ORTAHISAR/UGURLU' })
  })
  it('mahalle <8 ise ilçeye düşer (≥5, orta)', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('mahalle', 60_000, 7), stat('ilce', 40_000, 5), stat('il', 30_000, 200)]), A)
    expect(r).toMatchObject({ scale: 'ilce', confidence: 'orta', perSqm: 40_000, tl: 6_000_000, bolge: 'TRABZON/ORTAHISAR' })
  })
  it('ilçe <5 ise ile düşer (dusuk)', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('ilce', 40_000, 4), stat('il', 30_000, 12)]), A)
    expect(r).toMatchObject({ scale: 'il', confidence: 'dusuk', bolge: 'TRABZON' })
  })
  it('hiç satır yoksa null', async () => {
    expect(await lookupKonutFiyat(dbWith([]), A)).toBeNull()
  })
  it('geçersiz daireM2 → null (sorgu yapmaz)', async () => {
    const db = dbWith([stat('il', 30_000, 12)])
    expect(await lookupKonutFiyat(db, { ...A, daireM2: 20 })).toBeNull()
    expect(await lookupKonutFiyat(db, { ...A, daireM2: Number.NaN })).toBeNull()
    expect(db.konutFiyatStat.findMany).not.toHaveBeenCalled()
  })
  it('adları normalize ederek sorgular', async () => {
    const db = dbWith([])
    await lookupKonutFiyat(db, A)
    const where = (db.konutFiyatStat.findMany as jest.Mock).mock.calls[0][0].where
    expect(where.il).toBe('TRABZON')
    expect(JSON.stringify(where)).toContain('UGURLU')
  })
})
```

- [ ] **Step 2:** `npx jest src/lib/konutPrices` → FAIL (modüller yok).

- [ ] **Step 3: Uygula**

`persist.ts`:

```ts
import { aggregateKonutPrices, type KonutInputRow } from './aggregate'

export interface KonutPersistDb {
  marketListing: { findMany(args: unknown): Promise<unknown[]> }
  konutFiyatStat: { upsert(args: unknown): Promise<unknown>; count(): Promise<number> }
}

export async function refreshKonutFiyatStats(
  db: KonutPersistDb,
  computedAt: Date = new Date(),
): Promise<{ written: number; total: number }> {
  const rows = await db.marketListing.findMany({
    where: { listingType: 'konut', status: 'active' },
    select: { listingType: true, pricePerSqm: true, areaSqm: true, status: true, il: true, ilce: true, mahalle: true },
  })
  const stats = aggregateKonutPrices(rows as KonutInputRow[])
  let written = 0
  for (const s of stats) {
    const data = {
      scope: s.scope,
      medianPricePerSqm: s.medianPricePerSqm,
      p25: s.p25,
      p75: s.p75,
      sampleCount: s.sampleCount,
      medianAreaSqm: s.medianAreaSqm,
      computedAt,
    }
    await db.konutFiyatStat.upsert({
      where: { il_ilce_mahalle: { il: s.il, ilce: s.ilce, mahalle: s.mahalle } },
      create: { il: s.il, ilce: s.ilce, mahalle: s.mahalle, ...data },
      update: data,
    })
    written++
  }
  return { written, total: await db.konutFiyatStat.count() }
}
```

`lookup.ts`:

```ts
import { validateRange } from '@/lib/ai/akif/numberSafety'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export type KonutScale = 'mahalle' | 'ilce' | 'il'

export interface KonutFiyatLookup {
  tl: number
  perSqm: number
  scale: KonutScale
  sampleCount: number
  confidence: 'yuksek' | 'orta' | 'dusuk'
  bolge: string
}

export interface KonutLookupDb {
  konutFiyatStat: {
    findMany(args: unknown): Promise<Array<{ scope: string; medianPricePerSqm: number; sampleCount: number }>>
  }
}

export async function lookupKonutFiyat(
  db: KonutLookupDb,
  a: { il: string; ilce: string; mahalle: string; daireM2: number },
): Promise<KonutFiyatLookup | null> {
  if (!Number.isFinite(a.daireM2) || !validateRange('daire', a.daireM2)) return null
  const il = normalizeAreaName(a.il)
  const ilce = normalizeAreaName(a.ilce)
  const mahalle = normalizeAreaName(a.mahalle)
  const rows = await db.konutFiyatStat.findMany({
    where: { il, OR: [{ ilce: '', mahalle: '' }, { ilce, mahalle: '' }, { ilce, mahalle }] },
  })
  const by = (scope: string) => rows.find((r) => r.scope === scope && Number.isFinite(r.medianPricePerSqm) && r.medianPricePerSqm > 0)
  const m = by('mahalle')
  const i = by('ilce')
  const l = by('il')

  let pick: { row: NonNullable<typeof m>; scale: KonutScale; confidence: KonutFiyatLookup['confidence']; bolge: string } | null = null
  if (m && m.sampleCount >= 8) pick = { row: m, scale: 'mahalle', confidence: 'yuksek', bolge: `${il}/${ilce}/${mahalle}` }
  else if (i && i.sampleCount >= 5) pick = { row: i, scale: 'ilce', confidence: 'orta', bolge: `${il}/${ilce}` }
  else if (l) pick = { row: l, scale: 'il', confidence: 'dusuk', bolge: il }
  if (!pick) return null

  const perSqm = Math.round(pick.row.medianPricePerSqm)
  return {
    tl: Math.round((pick.row.medianPricePerSqm * a.daireM2) / 100) * 100,
    perSqm,
    scale: pick.scale,
    sampleCount: pick.row.sampleCount,
    confidence: pick.confidence,
    bolge: pick.bolge,
  }
}
```

`scripts/aggregate-konut-prices.ts`:

```ts
import { prisma } from '../src/lib/prisma'
import { refreshKonutFiyatStats } from '../src/lib/konutPrices/persist'

async function main() {
  const { written, total } = await refreshKonutFiyatStats(prisma)
  console.log(`✅ ${written} KonutFiyatStat satırı yazıldı/güncellendi. Tabloda toplam ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
```

`package.json` scripts'e (`prices:aggregate` satırının altına, aynı komut biçimiyle):

```json
    "prices:konut": "ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\"}\" scripts/aggregate-konut-prices.ts",
```

- [ ] **Step 4:** `npx jest src/lib/konutPrices` → PASS; `npx tsc --noEmit` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/konutPrices scripts/aggregate-konut-prices.ts package.json
git commit -m "feat(akif-5c): konut istatistiği persist + lookupKonutFiyat + prices:konut betiği

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hesap çekirdeği — `computeProjectEstimate` (saf)

**Files:**
- Create: `src/lib/akifProje/hesap.ts`
- Test: `src/lib/akifProje/__tests__/hesap.test.ts`

**Interfaces:**
- Consumes: `compareContractorOffers` (`@/lib/ai/akif/gateway/compareContractorOffers`), `buildScenarioEngineInput` (`.../scenarioEngine`), `CalculatorEngineV2`, `EngineDefaults` (`.../engineDefaults`).
- Produces:
  ```ts
  export interface EstimateInput {
    arsaAlani?: number; emsal?: number; arsaSahibiPayiYuzde?: number
    daireBuyuklugu?: number; birimMaliyet?: number; kaliteSinifi?: 'standart' | 'orta' | 'luks'
    fiyat?: { m2: number; tl: number }          // doğrulanmış bölge daire fiyatı
    defaults: EngineDefaults
  }
  export interface EstimateRow {
    muteahhitYuzde: number; arsaSahibiYuzde: number
    arsaSahibiDaire: number | null          // 1 ondalık
    arsaSahibiDegerTL: number | null        // motor (maliyet bazlı), yuvarlanmış
    piyasaDegerTL: number | null            // arsaSahibiDaire × daire piyasa fiyatı (fiyat yoksa null)
  }
  export type EstimateResult =
    | { ok: true; mod: 'tam' | 'imarsiz'; daireM2: number; daireFiyatiTL: number | null
        xMaxYuzde: number | null; yapilamaz: boolean
        toplamDaire: number | null; satirlar: EstimateRow[]
        varsayimlar: string[]; notlar: string[] }
    | { ok: false; eksik: string[] }
  export function computeProjectEstimate(i: EstimateInput): EstimateResult
  ```

Kurallar:
- `Ad` (daire m²) = `daireBuyuklugu ?? fiyat?.m2`. Tam modda ikisi de yoksa 100 (motorun mevcut varsayılanı, `varsayimlar`'a "ortalama daire = 100 m² (varsayılan)"); imarsız modda ikisi de yoksa `{ok:false, eksik:['daireBuyuklugu']}`.
- `daireFiyatiTL` (bu `Ad` için) = `fiyat ? round(fiyat.tl / fiyat.m2 * Ad)` : null. `Pmarket` = bu değer.
- **Tam mod**: `arsaAlani` ve `emsal` ikisi de var. Müteahhit payları: `arsaSahibiPayiYuzde` verildiyse `[100 - payi]`, yoksa `[60, 55, 50]` ve `varsayimlar`'a "arsa sahibi payı verilmedi; %40 / %45 / %50 senaryoları". Satırlar `compareContractorOffers`'tan; `piyasaDegerTL = arsaSahibiDaire × daireFiyatiTL` (ikisi de varsa). `toplamDaire = floor(arsaAlani*emsal/Ad)`. `varsayimlar` = `defaultsUsed` + `assumptions` kartından gelenler.
- **İmarsız mod**: tam mod koşulu yok ama `fiyat` var. `satirlar = []`, `toplamDaire = null`, `notlar`'a "İmar bilinmediği için daire sayısı hesaplanamaz; yalnız arsa payı üst sınırı verilir".
- Her iki modda `fiyat` varsa `xMax` motordan: `CalculatorEngineV2.calculate({...buildScenarioEngineInput({x:0.5, apartmentSize:Ad, totalApartments:0, birimMaliyet, kaliteSinifi, arsaAlani: arsaAlani ?? 1000, defaults}), Pmarket})`.x_max. `xMaxYuzde = Math.floor(xMax*100)` (aşağı yuvarla: güvenli taraf); `yapilamaz = xMax <= 0` ve bu durumda `xMaxYuzde = null`. `x_max >= 1` olamaz (Mi>0), ama sonlu değilse `xMaxYuzde=null, yapilamaz=false`.
- Hiçbiri yoksa: `{ok:false, eksik:['imar (emsal) ya da daire fiyatı']}`; tam mod için arsaAlani eksik, fiyat da yoksa `eksik` o duruma göre `['arsaAlani', 'emsal']` listesinin eksik olanlarını + `'daireFiyati'` içerir (test örneklerine bak).
- Satır yuvarlamaları: `arsaSahibiDaire` 1 ondalık, TL değerleri `Math.round`.

- [ ] **Step 1: Başarısız testleri yaz**

Test varsayılanları: `P=10000, K=1.25, qualityLevels {standart:1, orta:1, luks:1.5}` → kalite orta için `Mi = 1·10000·150 = 1 500 000`.

```ts
import { computeProjectEstimate } from '../hesap'

const defaults = { P: 10_000, K: 1.25, qualityLevels: { standart: 1, orta: 1, luks: 1.5 } }
const FIYAT = { m2: 150, tl: 7_000_000 }

describe('computeProjectEstimate — imarsız mod', () => {
  it('yalnız fiyatla x_max verir: 1 − (1.5M×1.25)/7M = %73 (aşağı yuvarla)', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 150, fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, mod: 'imarsiz', daireM2: 150, daireFiyatiTL: 7_000_000, xMaxYuzde: 73, yapilamaz: false, toplamDaire: null })
    if (r.ok) {
      expect(r.satirlar).toEqual([])
      expect(r.notlar.join(' ')).toMatch(/daire sayısı hesaplanamaz/)
    }
  })
  it('daire büyüklüğü verilmediyse fiyatın m²sini kullanır', () => {
    const r = computeProjectEstimate({ fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, daireM2: 150, xMaxYuzde: 73 })
  })
  it('fiyat m²si ile daire m²si farklıysa fiyatı m² başına ölçekler', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 100, fiyat: FIYAT, defaults })
    // 7M/150×100 = 4 666 667; Mi = 1M; x_max = 1 − 1.25M/4 666 667 = 0.7321
    expect(r).toMatchObject({ ok: true, daireFiyatiTL: 4_666_667, xMaxYuzde: 73 })
  })
  it('maliyet piyasa fiyatını aşıyorsa yapilamaz=true, xMaxYuzde=null (negatif yüzde gösterilmez)', () => {
    const r = computeProjectEstimate({ daireBuyuklugu: 150, birimMaliyet: 60_000, fiyat: FIYAT, defaults })
    expect(r).toMatchObject({ ok: true, yapilamaz: true, xMaxYuzde: null })
  })
})

describe('computeProjectEstimate — tam mod', () => {
  const base = { arsaAlani: 1000, emsal: 1.5, daireBuyuklugu: 100, defaults }
  it('toplam daire = floor(1000×1.5/100) = 15; verilen pay tek satır', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40 })
    expect(r).toMatchObject({ ok: true, mod: 'tam', toplamDaire: 15 })
    if (r.ok) {
      expect(r.satirlar).toHaveLength(1)
      expect(r.satirlar[0]).toMatchObject({ muteahhitYuzde: 60, arsaSahibiYuzde: 40, arsaSahibiDaire: 6 })
    }
  })
  it('pay verilmezse %40/45/50 senaryoları ve varsayım notu', () => {
    const r = computeProjectEstimate(base)
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar.map((s) => s.arsaSahibiYuzde)).toEqual([40, 45, 50])
    expect(r.varsayimlar.join(' ')).toMatch(/%40 \/ %45 \/ %50/)
  })
  it('fiyat varsa piyasa değeri = arsa sahibi daire × daire fiyatı ve x_max de gelir', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40, fiyat: { m2: 100, tl: 5_000_000 } })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar[0].piyasaDegerTL).toBe(30_000_000) // 6 daire × 5M
    // Mi = 1×10000×100 = 1M; x_max = 1 − 1.25M/5M = 0.75
    expect(r.xMaxYuzde).toBe(75)
  })
  it('fiyat yoksa piyasaDegerTL ve xMax null', () => {
    const r = computeProjectEstimate({ ...base, arsaSahibiPayiYuzde: 40 })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.satirlar[0].piyasaDegerTL).toBeNull()
    expect(r.xMaxYuzde).toBeNull()
    expect(r.yapilamaz).toBe(false)
  })
  it('daire büyüklüğü hiç yoksa tam modda 100 m² varsayılır ve belirtilir', () => {
    const r = computeProjectEstimate({ arsaAlani: 1000, emsal: 1.5, arsaSahibiPayiYuzde: 40, defaults })
    if (!r.ok) throw new Error('beklenmedik')
    expect(r.daireM2).toBe(100)
    expect(r.varsayimlar.join(' ')).toMatch(/100 m²/)
  })
})

describe('computeProjectEstimate — eksik girdi', () => {
  it('ne imar ne fiyat: ok=false, eksikler adlandırılır', () => {
    const r = computeProjectEstimate({ defaults })
    expect(r).toMatchObject({ ok: false })
    if (!r.ok) expect(r.eksik).toEqual(expect.arrayContaining(['emsal', 'daireFiyati']))
  })
  it('emsal var ama arsa alanı yok ve fiyat da yok: arsaAlani eksik', () => {
    const r = computeProjectEstimate({ emsal: 1.5, defaults })
    if (r.ok) throw new Error('beklenmedik')
    expect(r.eksik).toEqual(expect.arrayContaining(['arsaAlani', 'daireFiyati']))
  })
  it('imarsız modda daire büyüklüğü ve fiyat m²si de yoksa (fiyat m2 zorunlu olduğundan) pratikte oluşmaz; fiyat m2 daima Ad verir', () => {
    expect(computeProjectEstimate({ fiyat: FIYAT, defaults }).ok).toBe(true)
  })
})
```

- [ ] **Step 2:** `npx jest src/lib/akifProje/__tests__/hesap.test.ts` → FAIL (modül yok).

- [ ] **Step 3: Uygula**

`src/lib/akifProje/hesap.ts`:

```ts
// Akif-5c Aşama C — proje hesabı (saf). Motor çekirdeğine DOKUNMAZ:
// tam mod mevcut compareContractorOffers'ı, x_max ise motorun Pmarket girdisini kullanır.
// `Mi = L·P·Ad` ve `Pmarket` DAİRE BAŞINA değerlerdir (engine_v2.ts), bu yüzden
// x_max daire sayısı bilinmeden de hesaplanır (imarsız mod).

import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2'
import { compareContractorOffers } from '@/lib/ai/akif/gateway/compareContractorOffers'
import { buildScenarioEngineInput } from '@/lib/ai/akif/gateway/scenarioEngine'
import type { EngineDefaults } from '@/lib/ai/akif/gateway/engineDefaults'

export interface EstimateInput {
  arsaAlani?: number
  emsal?: number
  arsaSahibiPayiYuzde?: number
  daireBuyuklugu?: number
  birimMaliyet?: number
  kaliteSinifi?: 'standart' | 'orta' | 'luks'
  fiyat?: { m2: number; tl: number }
  defaults: EngineDefaults
}

export interface EstimateRow {
  muteahhitYuzde: number
  arsaSahibiYuzde: number
  arsaSahibiDaire: number | null
  arsaSahibiDegerTL: number | null
  piyasaDegerTL: number | null
}

export type EstimateResult =
  | {
      ok: true
      mod: 'tam' | 'imarsiz'
      daireM2: number
      daireFiyatiTL: number | null
      xMaxYuzde: number | null
      yapilamaz: boolean
      toplamDaire: number | null
      satirlar: EstimateRow[]
      varsayimlar: string[]
      notlar: string[]
    }
  | { ok: false; eksik: string[] }

const DEFAULT_SHARES = [60, 55, 50] // müteahhit %

function computeXMax(i: EstimateInput, ad: number, pmarket: number): number {
  const input = buildScenarioEngineInput({
    x: 0.5,
    apartmentSize: ad,
    totalApartments: 0,
    birimMaliyet: i.birimMaliyet,
    kaliteSinifi: i.kaliteSinifi,
    arsaAlani: i.arsaAlani ?? 1000,
    defaults: i.defaults,
  })
  return CalculatorEngineV2.calculate({ ...input, Pmarket: pmarket }).x_max as number
}

export function computeProjectEstimate(i: EstimateInput): EstimateResult {
  const tam = i.arsaAlani !== undefined && i.emsal !== undefined
  const fiyat = i.fiyat

  if (!tam && !fiyat) {
    const eksik: string[] = []
    if (i.arsaAlani === undefined) eksik.push('arsaAlani')
    if (i.emsal === undefined) eksik.push('emsal')
    eksik.push('daireFiyati')
    return { ok: false, eksik }
  }

  const varsayimlar: string[] = []
  const notlar: string[] = []

  let ad = i.daireBuyuklugu ?? fiyat?.m2
  if (ad === undefined) {
    ad = 100
    varsayimlar.push('ortalama daire = 100 m² (varsayılan)')
  }

  const daireFiyatiTL = fiyat ? Math.round((fiyat.tl / fiyat.m2) * ad) : null

  let xMaxYuzde: number | null = null
  let yapilamaz = false
  if (daireFiyatiTL !== null) {
    const xMax = computeXMax(i, ad, daireFiyatiTL)
    if (Number.isFinite(xMax)) {
      if (xMax <= 0) yapilamaz = true
      else xMaxYuzde = Math.floor(xMax * 100)
    }
  }

  if (!tam) {
    notlar.push('İmar bilinmediği için daire sayısı hesaplanamaz; yalnız arsa payı üst sınırı verilir')
    return { ok: true, mod: 'imarsiz', daireM2: ad, daireFiyatiTL, xMaxYuzde, yapilamaz, toplamDaire: null, satirlar: [], varsayimlar, notlar }
  }

  const arsaAlani = i.arsaAlani as number
  const emsal = i.emsal as number
  const muteahhitPaylari =
    i.arsaSahibiPayiYuzde !== undefined ? [100 - i.arsaSahibiPayiYuzde] : DEFAULT_SHARES
  if (i.arsaSahibiPayiYuzde === undefined) varsayimlar.push('arsa sahibi payı verilmedi; %40 / %45 / %50 senaryoları')

  const card = compareContractorOffers(
    { arsaAlani, emsal, muteahhitPaylari, daireBuyuklugu: ad, birimMaliyet: i.birimMaliyet, kaliteSinifi: i.kaliteSinifi },
    i.defaults,
  )
  const satirlar: EstimateRow[] = card.rows.map((r, idx) => {
    const daire = r.arsaSahibiDaireSayisi === null ? null : Math.round(r.arsaSahibiDaireSayisi * 10) / 10
    return {
      muteahhitYuzde: muteahhitPaylari[idx],
      arsaSahibiYuzde: 100 - muteahhitPaylari[idx],
      arsaSahibiDaire: daire,
      arsaSahibiDegerTL: r.arsaSahibiDegeriTL === null ? null : Math.round(r.arsaSahibiDegeriTL),
      piyasaDegerTL: daire !== null && daireFiyatiTL !== null ? Math.round(daire * daireFiyatiTL) : null,
    }
  })
  // card.defaultsUsed: birim maliyet / kalite varsayımları (daire m² zaten yukarıda yönetildi).
  varsayimlar.push(...card.defaultsUsed.filter((d) => !d.startsWith('ortalama daire')), ...card.assumptions)

  return {
    ok: true,
    mod: 'tam',
    daireM2: ad,
    daireFiyatiTL,
    xMaxYuzde,
    yapilamaz,
    toplamDaire: Math.floor((arsaAlani * emsal) / ad),
    satirlar,
    varsayimlar,
    notlar: [card.emsalNote],
  }
}
```

- [ ] **Step 4:** `npx jest src/lib/akifProje/__tests__/hesap.test.ts` → PASS. Bir test elle hesaplanan değerle uyuşmazsa önce hesabı gözden geçir (formül `x_max = 1 − Mi·K/Pmarket`), testin beklentisini körü körüne değiştirme. `npx tsc --noEmit` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/akifProje/hesap.ts src/lib/akifProje/__tests__/hesap.test.ts
git commit -m "feat(akif-5c): computeProjectEstimate — tam ve imarsız (x_max) hesap

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `ProjectCard` op'ları ve `hesapTools` (proje yükle, fiyat tahmini, hesap + kayıt)

**Files:**
- Modify: `src/lib/ai/akif/contract.ts` (`ProjectCard.op` birliği)
- Create: `src/lib/akifProje/hesapTools.ts`
- Test: `src/lib/akifProje/__tests__/hesapTools.test.ts`

**Interfaces:**
- Consumes: `lookupKonutFiyat` (Görev 3), `computeProjectEstimate` (Görev 4), `resolveEngineDefaults` + `EngineDefaultsDb`, `FACT_TTL_DAYS` (`./freshness`), `istanbulDateString` (`./dateRange`), `canonicalJson` (`./parselDosyasi`).
- Produces:
  ```ts
  // contract.ts: ProjectCard.op'a eklenir: 'price_estimate' | 'price_unavailable' | 'calculated'
  export interface HesapToolDb { /* PrismaClient'ın kullanılan dar dilimi; testte sahte */ }
  export function runEstimateDaireFiyati(db: PrismaClient, a: { userId: string; projectId: string }): Promise<ProjectCard>
  export function runCalculateProject(db: PrismaClient, a: { userId: string; projectId: string }, now: Date): Promise<ProjectCard>
  ```

**Proje yükleme (tek sorgu):** `db.projeKarti.findFirst({ where: { id: projectId, userId }, select: { id: true, name: true, inputs: true, result: true, parseller: { select: { parselDosyasi: { select: { il, ilce, mahalle, ada, parsel, olgular: { where: { supersededAt: null }, select: { key, value, source, recordedAt } } } } } } } })`. Yoksa `{kind:'project', op:'not_found'}` (başka kullanıcının projesi dahil).

**Olgu seçimi:** her anahtar için tüm parsellerin güncel olguları arasından en yeni `recordedAt`. Girdi birleşimi: `arsaAlani = inputs.arsaAlani ?? olgu.areaSqm`, `emsal = inputs.emsal ?? olgu.emsal`; diğer girdiler `inputs`'tan. `fiyat = olgu.daireFiyati` (`{m2,tl}` biçimli ve sonlu değilse yok sayılır). `fiyatBayat = now - recordedAt > FACT_TTL_DAYS.daireFiyati gün`.

**`runEstimateDaireFiyati`:** ilk parselin il/ilçe/mahalle'si; `daireM2 = inputs.daireBuyuklugu ?? fiyat olgusunun m2'si ?? 100` (100 ise `daireM2Varsayilan: true`). `lookupKonutFiyat` null → `{op:'price_unavailable', data:{projectId, bolge:'IL/ILCE/MAHALLE', neden:'Bu bölge için yeterli konut ilanı verisi yok'}}`. Aksi `{op:'price_estimate', data:{projectId, daireM2, daireM2Varsayilan, tahminiFiyatTL, m2BirimFiyatTL, olcek, ornekSayisi, guven, bolge, parsel:{il,ilce,mahalle,ada,parsel}, not:'İlan fiyatlarına dayanır; pazarlık payı içerebilir'}}`. Parseli olmayan proje (parseller boş) → `{op:'failed', data:{alan:'parsel', neden:'projede parsel yok'}}`.

**`runCalculateProject`:** `resolveEngineDefaults(db)`, `computeProjectEstimate`. `ok:false` → `{op:'failed', data:{alan:'girdi', neden:'hesap için eksik bilgi', eksik}}`. Başarıda `result` JSON'u `{ ...sonuç, fiyatBayat, fiyatTarihi (istanbulDateString veya null), hesapTarihi: istanbulDateString(now) }`; tek transaction: `projeKarti.update({where:{id}, data:{result}})`; kompakt özet `{mod, xMaxYuzde, yapilamaz, arsaSahibiDaire: ilk satırın değeri veya null}`, önceki `result`'tan aynı biçimde çıkarılan özetle `canonicalJson` ile karşılaştırılır; FARKLIYSA `projeRevizyon.create({data:{projeKartiId, field:'hesap', oldValue: öncekiÖzet ?? undefined, newValue: özet, changedAt: now, channel:'whatsapp', note: mod}})`. Kart: `{op:'calculated', data:{projectId, ad, ...sonuç alanları (Türkçe anahtarlar: mod, daireM2, daireFiyatiTL, xMaxYuzde, yapilamaz, toplamDaire, satirlar, varsayimlar, notlar), fiyatBayat, fiyatTarihi}}`.

- [ ] **Step 1: Sözleşmeyi genişlet**

`contract.ts` içinde `ProjectCard.op` birliğine ekle:

```ts
    | 'price_estimate'
    | 'price_unavailable'
    | 'calculated'
```

- [ ] **Step 2: Başarısız testleri yaz**

`hesapTools.test.ts` — sahte `db` (kendi dosyanda küçük bir `makeDb(projectRow, { konutRows, global/profit })` yardımcısı): `projeKarti.findFirst`, `projeKarti.update`, `projeRevizyon.create`, `konutFiyatStat.findMany`, `globalSettings.findUnique` (→ `null`: P 12000), `profitLevel.findFirst` (→ `null`: K 1.30), `$transaction: (fn) => fn(tx)`. Testler (her biri ayrı `it`):

1. `runEstimateDaireFiyati`: mahalle satırı (46 667, 9 örnek) + `inputs.daireBuyuklugu=150` → `op:'price_estimate'`, `data.tahminiFiyatTL === 7_000_000`, `data.olcek==='mahalle'`, `data.guven==='yuksek'`, `data.parsel` ilk parselin alanlarını taşır, `data.not` "pazarlık" içerir.
2. İstatistik satırı yok → `op:'price_unavailable'`, `data.tahminiFiyatTL` YOK.
3. Proje başka kullanıcıya ait / yok (`findFirst` null; ve `findFirst` çağrısının `where` argümanı `{id, userId}` içerir) → `op:'not_found'`.
4. Parseli olmayan proje → `op:'failed'`, `data.alan==='parsel'`.
5. `daireBuyuklugu` yok → `daireM2Varsayilan: true`, `daireM2 === 100`.
6. `runCalculateProject` imarsız: olgular `daireFiyati {m2:150,tl:7_000_000}` (taze), inputs `{daireBuyuklugu:150}` → `op:'calculated'`, `data.mod==='imarsiz'`, `data.xMaxYuzde` sayı, `projeKarti.update` çağrıldı (`data.result.mod==='imarsiz'`), `projeRevizyon.create` 1 kez (`field:'hesap'`, `channel:'whatsapp'`).
7. `runCalculateProject` tam: inputs `{arsaAlani:1000, emsal:1.5, daireBuyuklugu:100, arsaSahibiPayiYuzde:40}` → `data.mod==='tam'`, `data.toplamDaire===15`; emsal yalnız olgudan gelirse (inputs.emsal yok, olgu `emsal:1.5`) aynı sonuç.
8. Bayat fiyat (olgu `recordedAt` = now − 46 gün) → `data.fiyatBayat===true`, `data.fiyatTarihi` dolu; taze (44 gün) → `false`.
9. Ne emsal ne fiyat → `op:'failed'`, `data.eksik` `daireFiyati` içerir; `update`/`create` ÇAĞRILMAZ.
10. Aynı hesap ikinci kez (önceki `result` aynı özeti taşıyor) → `projeKarti.update` çağrılır, `projeRevizyon.create` ÇAĞRILMAZ.
11. `yapilamaz` senaryosu (inputs `birimMaliyet: 60000`) → `data.yapilamaz===true`, `data.xMaxYuzde===null`.

- [ ] **Step 3:** `npx jest src/lib/akifProje/__tests__/hesapTools.test.ts` → FAIL (modül yok).

- [ ] **Step 4: Uygula** `src/lib/akifProje/hesapTools.ts` (yukarıdaki kurallarla). Yardımcılar dosya içinde: `loadProject`, `latestFact(rows, key)`, `compact(result)`. `PrismaClient` tipi `import type { PrismaClient } from '@prisma/client'`. `resolveEngineDefaults(db)`'ye `db` doğrudan geçilir (yapısal uyum; uyumsuzsa `db as unknown as EngineDefaultsDb`).

- [ ] **Step 5:** `npx jest src/lib/akifProje src/lib/konutPrices` → PASS; `npx tsc --noEmit` temiz.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/contract.ts src/lib/akifProje/hesapTools.ts src/lib/akifProje/__tests__/hesapTools.test.ts
git commit -m "feat(akif-5c): fiyat tahmini ve proje hesabı (result + revizyon) araç mantığı

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: İki yeni aracı WhatsApp gateway'ine bağla

**Files:**
- Modify: `src/lib/whatsapp/projectTools.ts` (`ProjectToolName`, `NAMES`, `PROJECT_TOOL_DEFS`, `validateProjectToolArgs`, `dispatchProjectTool`)
- Test: `src/lib/whatsapp/__tests__/projectTools.test.ts` (mevcut "5 araç" testini güncelle + yeni testler), `src/lib/whatsapp/__tests__/akifToolGateway.test.ts` (araç sayısı/adı varsa güncelle)

**Interfaces:**
- Consumes: `runEstimateDaireFiyati`, `runCalculateProject` (Görev 5).
- Produces: araç adları `estimateDaireFiyati`, `calculateProject` (ikisi de `{ projectId: string }` ister; `required: ['projectId']`, `additionalProperties: false`).

- [ ] **Step 1: Testleri güncelle / ekle**

`projectTools.test.ts`:
- "araç kaydı" testi: liste artık `['findProjects','summarizeProject','createProject','updateProject','rememberFact','estimateDaireFiyati','calculateProject']`; `isProjectToolName('calculateProject')` true.
- `validateProjectToolArgs`: iki araç için boş/uzun/sayı `projectId` → `ok:false`, `field:'projectId'`; geçerli id → `ok:true`.
- `dispatchProjectTool`: hesapsız telefon (`linked:false`) iki yeni araçta da `op:'needs_signup'` döner (`createClaim` yolu, taslak YOK: `data.taslakKaydedildi === false`). Bağlı telefonda `estimateDaireFiyati`/`calculateProject` çağrısının `runEstimateDaireFiyati`/`runCalculateProject`'ı doğru `userId` ve `projectId` ile çağırdığını `jest.mock('@/lib/akifProje/hesapTools')` ile doğrula (dönen kart aynen iletilir).

- [ ] **Step 2:** `npx jest src/lib/whatsapp/__tests__/projectTools.test.ts` → yeni/güncel testler FAIL.

- [ ] **Step 3: Uygula**

```ts
export type ProjectToolName =
  | 'findProjects' | 'summarizeProject' | 'createProject' | 'updateProject' | 'rememberFact'
  | 'estimateDaireFiyati' | 'calculateProject'
```

`NAMES` listesine iki ad; `PROJECT_TOOL_DEFS` sonuna:

```ts
  {
    type: 'function',
    function: {
      name: 'estimateDaireFiyati',
      description:
        "Projenin parselinin bölgesindeki konut ilanlarından yaklaşık daire fiyatını getirir (kullanıcıya 'doğru mu?' diye doğrulatmak için). İmar bilinmiyorsa veya daire fiyatı olgusu yoksa çağır. Sonuç doğrulanmadan hesaba girmez.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculateProject',
      description:
        'Projeyi hesaplar: imar (emsal) biliniyorsa toplam daire ve arsa sahibine düşen daire/değer; yalnız doğrulanmış daire fiyatı varsa müteahhidin verebileceği en yüksek arsa payı (%). Rakamları yalnız bu aracın sonucundan aktar, kendin hesaplama. Sonuç projeye kaydedilir.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
```

`validateProjectToolArgs` içinde `summarizeProject` case'ini paylaşacak şekilde `case 'summarizeProject': case 'estimateDaireFiyati': case 'calculateProject':` yap (aynı `projectId` kontrolü). `dispatchProjectTool` switch'ine:

```ts
    case 'estimateDaireFiyati':
      return runEstimateDaireFiyati(deps.db, { userId, projectId: String(o.projectId) })
    case 'calculateProject':
      return runCalculateProject(deps.db, { userId, projectId: String(o.projectId) }, now)
```

`needsSignup`'taki taslak mantığı zaten yalnız `createProject` için taslak üretir; yeni araçlar `draft = null` ile gider (değişiklik gerekmez).

- [ ] **Step 4:** `npx jest src/lib/whatsapp src/lib/akifProje` → PASS; `npx tsc --noEmit` temiz.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/projectTools.ts src/lib/whatsapp/__tests__
git commit -m "feat(akif-5c): estimateDaireFiyati ve calculateProject araçlarını WhatsApp gateway'ine bağla

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Handler (recentProjects), politika ve web etiketi

**Files:**
- Modify: `src/lib/whatsapp/akifHandleMessage.ts` (`mergeRecentProjects` switch), `src/lib/whatsapp/akifToolPolicy.ts` (`AKIF_WHATSAPP_PROJECT_POLICY`), `src/app/dashboard/akif-projeler/page.tsx` (`LABELS` + `show`)
- Test: `src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`, `src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`, `src/app/dashboard/akif-projeler/page.test.tsx`

**Interfaces:** Consumes Görev 5'in kart verisi (`data.projectId` her üç yeni op'ta var; `price_unavailable`/`price_estimate`/`calculated` hepsi `projectId` taşır).

- [ ] **Step 1: Testler**

- `akifHandleMessage.test.ts`: tur sonunda `tool_result` `{kind:'project', op:'calculated', data:{projectId:'p9', ad:'Maçka'}}` / `price_estimate` `{projectId:'p9'}` ise `saveConversation`'a verilen state'in `recentProjects` ilk girdisi `{id:'p9', name:...}` (name: `calculated` kartında `data.ad`; `price_estimate`'te önceki `recentProjects`'ten bulunur yoksa `null`). Mevcut `updated` testinin kalıbını izle.
- `akifToolPolicy.test.ts`: politika metni şunları içerir: `estimateDaireFiyati`, `calculateProject`, `price_estimate`, `price_unavailable`, `calculated`, `yapilamaz`, `fiyatBayat`, `pazarlık`.
- `page.test.tsx`: `field:'hesap'` revizyonu (oldValue null, newValue `{mod:'imarsiz', xMaxYuzde:73, yapilamaz:false, arsaSahibiDaire:null}`) sayfayı çökertmeden "Hesap" etiketiyle ve `[object Object]` içermeyen metinle render edilir.

- [ ] **Step 2:** Üç dosyayı çalıştır → yeni testler FAIL.

- [ ] **Step 3: Uygula**

`akifHandleMessage.ts` `mergeRecentProjects`: mevcut `case 'updated'` bloğunu şuna genişlet:

```ts
    case 'updated':
    case 'price_estimate':
    case 'price_unavailable':
    case 'calculated': {
      const id = str(data?.projectId)
      if (id) fresh.push({ id, name: str(data?.ad) ?? prev.find((p) => p.id === id)?.name ?? null })
      break
    }
```

(`updated` davranışı değişmez: `data.ad` zaten yok → önceki ad.)

`page.tsx`: `LABELS`'a `hesap: 'Hesap'`; `show`'u nesneleri okunur yazsın:

```ts
const show = (v: unknown) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.mod === 'string') {
      if (o.yapilamaz === true) return `${o.mod} · bu fiyatla yapılamaz`
      const parts = [String(o.mod)]
      if (typeof o.xMaxYuzde === 'number') parts.push(`en fazla %${o.xMaxYuzde} arsa payı`)
      if (typeof o.arsaSahibiDaire === 'number') parts.push(`${o.arsaSahibiDaire} daire`)
      return parts.join(' · ')
    }
    return JSON.stringify(v)
  }
  return String(v)
}
```

`akifToolPolicy.ts` `AKIF_WHATSAPP_PROJECT_POLICY`: ilk satırdaki "Araçlar:" listesine `estimateDaireFiyati`, `calculateProject` ekle ve politika sonuna (son maddeden önce) şu blok:

```
- HESAP SIRASI: parsel belli → imar sor (kat, emsal). İmar biliniyorsa rememberFact ile kaydet, calculateProject çağır. Kullanıcı imarı bilmiyorsa estimateDaireFiyati çağır.
- "price_estimate" sonucu: kullanıcıya "<bolge> bölgesinde <daireM2> m² daire ilan fiyatlarına göre yaklaşık <tahminiFiyatTL> TL (örnek sayısı, güven); ilan fiyatları pazarlık payı içerebilir. Doğru mu?" diye sor; rakamları aynen aktar. "Evet" derse AYNI data.parsel alanları ve {m2: daireM2, tl: tahminiFiyatTL} ile rememberFact(key: daireFiyati, source: ilan) çağır; farklı bir fiyat söylerse onun değeriyle source: kullanici ile çağır; ardından calculateProject. daireM2Varsayilan true ise önce daire büyüklüğünü sor.
- "price_unavailable": tahmin YOK; bölge için yeterli ilan verisi olmadığını söyle ve kullanıcıdan yaklaşık daire fiyatını iste.
- "calculated" sonucu: mod "tam" ise toplam daire ve satırları (arsa sahibi payı, daire sayısı, piyasa değeri) kısa anlat; mod "imarsiz" ise daire sayısı VERME, "müteahhit zarara girmeden en fazla yaklaşık %<xMaxYuzde> arsa payı verebilir" de ve imarı öğrenince net sayı çıkarabileceğini ekle. yapilamaz true ise "bu fiyat ve maliyetle bu paylaşım yapılamaz" de, yüzde verme. fiyatBayat true ise fiyatTarihi ile "hâlâ geçerli mi?" diye teyit ettir. Rakamları değiştirme, hesaplama; varsayımları (varsayimlar) kısaca belirt.
- Hesap için emsal da daire fiyatı da yoksa "failed" döner (eksik listesi): eksiği sor.
```

- [ ] **Step 4:** `npx jest src/lib/whatsapp src/app/dashboard/akif-projeler` → PASS; `npx tsc --noEmit` temiz; `npx eslint` değişen dosyalarda temiz (repo'da kullanılan komut neyse: `npx eslint src/lib/whatsapp src/lib/akifProje src/lib/konutPrices src/app/dashboard/akif-projeler`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp src/app/dashboard/akif-projeler
git commit -m "feat(akif-5c): recentProjects yeni op'larla beslenir; politika ve web etiketi

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Operasyon runbook'u ve duman listesi

**Files:**
- Create: `docs/akif/konut-tarama-pilot.md`
- Modify: `docs/akif/akif-2-insan-duman-kontrol-listesi.md` (sona "Akif-5c Aşama C" bölümü)

- [ ] **Step 1: Runbook'u yaz** (`docs/akif/konut-tarama-pilot.md`): amaç; ön koşullar (gerçek Postgres, `prisma migrate deploy` ile Aşama B + C migration'ları, emlakjet proxy ayarı — `crawler/README.md` §emlakjet); pilot iller İstanbul, Ankara, İzmir, Trabzon; her il için komut `npm run crawl -- --portal=emlakjet --il=<il> --category=konut --max-pages=<N>` (önce `--dry-run --limit=1` ile; `crawler/README.md`'deki gerçek bayrak adlarını doğrula ve belge ile uyumlu yaz; `crawl-all` arsa-only olduğundan KULLANILMAZ); tek worker, partili (bellek baskısı notu: `project_arsabil_yarin_devam`), il bitince bellek/RAM kontrolü; sonra `npm run prices:konut`; doğrulama sorguları: `SELECT scope, count(*) FROM "KonutFiyatStat" GROUP BY scope;` ve pilot illerde mahalle/ilçe örnek sayıları; sonuç tablosunu (il, ilan sayısı, KonutFiyatStat satır sayısı) bu belgeye "Sonuç" başlığı altına işlemek için boş şablon; bilinen sınırlamalar (villa/müstakil de `konut` sayılır; ilan fiyatı pazarlık payı içerir; durmuş ilanlar `computedAt`'a göre bayatlayabilir, silme yok).

- [ ] **Step 2: Duman listesi** — `akif-2-insan-duman-kontrol-listesi.md` sonuna "Akif-5c Aşama C" bölümü (Aşama B bölümünün biçimiyle; ön koşul: iki migration uygulanmış, pilot il istatistiği üretilmiş), maddeler:
  - [ ] Bağlı numaradan pilot ilde parsel + proje kur; "imarı bilmiyorum" de → Akif daire fiyatını (bölge, m², yaklaşık TL, ilan notu) sorar, "doğru mu?" der
  - [ ] "Evet" de → `ParselOlgu`'da `daireFiyati` (source `ilan`) oluşur; Akif en fazla % arsa payını söyler, daire sayısı VERMEZ
  - [ ] Fiyatı düzelt ("hayır 6 milyon") → olgu `kullanici` kaynaklı yeni değerle kaydolur, hesap yenilenir
  - [ ] Pilot dışı bölgede aynı akış → Akif tahmin sunmaz, fiyatı sorar
  - [ ] Kat/emsal ver → tam hesap: toplam daire, arsa sahibi daire sayısı, piyasa değeri
  - [ ] Aşırı yüksek birim maliyet ver → "bu fiyatla yapılamaz", negatif yüzde yok
  - [ ] `daireFiyati` `recordedAt`'ı 46+ gün geriye çek → Akif tarihiyle teyit ister
  - [ ] Aynı hesabı tekrar iste → `ProjeRevizyon`'a ikinci `hesap` satırı EKLENMEZ, `ProjeKarti.result` günceldir
  - [ ] 20 Ekim senaryosu: "15 Ekim'deki projeyi hatırlıyor musun?" → özet hesabı da içerir; web "Akif Projelerim"de `Hesap` satırı okunur görünür

- [ ] **Step 3: Commit**

```bash
git add docs/akif/konut-tarama-pilot.md docs/akif/akif-2-insan-duman-kontrol-listesi.md
git commit -m "docs(akif-5c): konut tarama runbook'u ve Aşama C duman listesi

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Yürütme sonrası (kontrolcü, plan görevi değil)

- Tüm süit: `npx jest` + `npx tsc --noEmit`; final whole-branch inceleme (en yetenekli kullanılabilir model).
- **Pilot konut taramasını koşturmak** (Task 8 runbook'u) DB'ye yazan, uzun süren bir operasyondur ve gerçek Postgres + proxy ister: kullanıcı onayı ve DB hazır olmadan çalıştırılmaz. Kontrolcü bu adımı kullanıcıya sorar.
- Migration'lar (Aşama B + C) gerçek Postgres'te `migrate deploy` + `migrate diff --exit-code` ile doğrulanmadan push/deploy yok.
