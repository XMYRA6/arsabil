# TÜİK Demografi Katmanı (Alt-proje 6c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Değer Kartı'na (`/deger`), üye kullanıcılara açık, ilçe seviyesinde TÜİK demografi bloğu (çekirdek 5 metrik + tek kural-tabanlı özet cümle) eklemek; veriyi `crawler/tuik/` altında Playwright ile TÜİK portalından export yakalayarak toplamak.

**Architecture:** Yeni `DistrictDemographics` Prisma modeli (il/ilçe katlanmış anahtar). `crawler/tuik/` ayrı bir crawler giriş noktası — `crawler/fetcher` context kurulumunu ve `CrawlRun`'ı yeniden kullanır, `run.ts` liste pipeline'ını kullanmaz. Saf `src/lib/demografi/` yorum üretir. Değer Kartı entegrasyonu 6a Fiyat Trendi'nin (`priceTrend`) DI + üye-gate + DTO deseninin birebir kopyasıdır.

**Tech Stack:** Next.js 16, Prisma 5 + PostgreSQL, `@playwright/test` (crawler), ts-node, Jest + ts-jest. CSV parse elle (bağımlılık yok) — yalnız xlsx çıkarsa `exceljs`.

**Spec:** `docs/superpowers/specs/2026-09-07-tuik-demografi-katmani-design.md`

## Global Constraints

- **Granülerlik:** yalnız ilçe seviyesi. Mahalle/il fallback zinciri YOK.
- **Metrikler (çekirdek 5):** `population` (Int), `populationGrowthPerMille` (Float, ‰), `medianAge` (Float), `avgHouseholdSize` (Float), `netMigrationPerMille` (Float, ‰). Hepsi nullable.
- **Erişim:** üye-gated. `findDistrictDemographics` ve DTO `demographics` alanı anonim payload'a HİÇBİR koşulda konmaz. `anonCardDeps.ts`'e eklenmez.
- **Anahtar normalizasyonu:** her il/ilçe anahtarı `normalizeAreaName` (`src/lib/areaPrices/normalizeAreaName.ts`) ile katlanır — `.replace(/İ/g,'I').replace(/ı/g,'i').toUpperCase()`. Yazma yolu (crawler upsert) ve okuma yolu (route query) ikisi de aynı fonksiyonu kullanır.
- **Veri disiplini:** yarım veri hiç veriden kötü. Bir crawl turunda HİÇBİR metrik çekilemezse hiçbir satır yazılmaz (`districtPrices/data.ts` disiplini). Upsert asla satır SİLMEZ.
- **Migration:** elle yazılır, önce dev DB'ye `prisma migrate deploy`, prod'a batch deploy'da (diğer bekleyen migration'larla).
- **Test:** her saf fonksiyon TDD (RED→GREEN). Regresyon: `npx tsc --noEmit` + `npx tsc -p crawler/tsconfig.json` + `npx jest --no-coverage --roots "$(pwd)/src"` + `npm run test:crawler` + `npm run build` — hepsi temiz.
- **Dal:** `codex/professional-ui-and-land-cost` üzerinde doğrudan çalışılır (origin'de yok, worktree kurulmaz — bkz. `feedback_agent_tool_isolation_worktree`).
- **Commit:** her task sonunda. Mesaj sonu:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` +
  `Claude-Session: https://claude.ai/code/session_012nxvgsmnSrESr8pDggxUBi`
- **Jest komutu:** `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "<pattern>"` (proje `--testPathPatterns` çoğul kullanır; `--roots` worktree kalıntısı taramasını önler).

---

## Task 1: TÜİK portal keşfi → `datasets.ts` + FINDINGS

**Bu task interaktif tarayıcı erişimi gerektirir — dispatch edilen bir subagent'la DEĞİL, controller (veya kullanıcı) tarafından doğrudan yapılır.** Çıktısı olmadan Task 5 ve Task 7 yazılamaz.

**Files:**
- Create: `crawler/tuik/datasets.ts`
- Create: `crawler/tuik/FINDINGS.md`
- Create: `crawler/tuik/fixtures/` (indirilen örnek export dosyaları, PII yok — TÜİK verisi zaten kamuya açık toplu istatistik)

**Interfaces:**
- Produces: `DATASETS` — `DemographicDataset[]`; her metriğin TÜİK tablosunu, sorgu adımlarını ve export→model alan eşlemesini tanımlar. Task 5 (`parse.ts`) ve Task 7 (`extract.ts`) bunu tüketir.

- [ ] **Step 1: TÜİK portalını aç ve çekirdek-5'i ara**

`data.tuik.gov.tr` → "İstatistiksel Tablolar" → "Nüfus ve Demografi". Şu tabloları/verileri bul ve **ilçe kırılımında** mevcut mu doğrula:
1. İlçelere göre il/ilçe merkezi nüfusu (ADNKS) → `population`
2. Yıllık nüfus artış hızı (‰), ilçe → `populationGrowthPerMille` (doğrudan var mı, yoksa ardışık iki yıl nüfustan mı türetilecek?)
3. İlçelere göre ortanca yaş → `medianAge` (ilçe yoksa il seviyesi → alan null bırakılır)
4. İlçelere göre ortalama hane halkı büyüklüğü → `avgHouseholdSize`
5. İlçelere göre net göç hızı (‰) → `netMigrationPerMille`

- [ ] **Step 2: Her tablo için export yolunu belirle**

Her tablonun sorgu arayüzünde: İlçe kırılımı nasıl seçiliyor (dropdown/checkbox/selektör), yıl nasıl seçiliyor, "İndir" düğmesi hangi formatları sunuyor (CSV / XLSX / XLS). **CSV varsa CSV tercih edilir** (sıfır bağımlılık). Bir örnek dosyayı indirip `crawler/tuik/fixtures/`'e koy.

- [ ] **Step 3: `FINDINGS.md` yaz**

Her metrik için: TÜİK tablo adı + URL, ilçe kırılımı seçme adımları (Playwright'ta tıklanacak selektörler/metinler), export formatı, indirilen dosyanın sütun düzeni (hangi sütun il, hangisi ilçe, hangisi değer; başlık satırı kaç satır; ondalık ayıracı `,` mı `.` mı; ilçe adı formatı — "Ortahisar" mı "ORTAHİSAR" mı). Türetme gerekiyorsa (artış hızı) formülü yaz. Bir metrik ilçe kırılımında YOKSA bunu açıkça yaz — o alan kalıcı `null` kalır.

- [ ] **Step 4: `datasets.ts` yaz**

```typescript
// crawler/tuik/datasets.ts
export interface DemographicColumnMap {
  /** export dosyasında il adını taşıyan sütun başlığı veya 0-tabanlı index */
  ilColumn: string | number
  ilceColumn: string | number
  /** model alanı → export sütunu (başlık veya index). Alan bu tabloda yoksa hiç eklenmez. */
  fields: Partial<Record<'population' | 'populationGrowthPerMille' | 'medianAge' | 'avgHouseholdSize' | 'netMigrationPerMille', string | number>>
}

export interface DemographicDataset {
  key: string                    // "population" | "growth" | "medianAge" | "household" | "migration"
  label: string                  // insan-okur, log/CrawlRun.notes için
  tableUrl: string               // TÜİK sorgu sayfası
  /** Playwright extract.ts'in izleyeceği adımlar — FINDINGS.md'den. */
  querySteps: Array<{ action: 'click' | 'selectOption' | 'fill' | 'waitForSelector'; selector: string; value?: string }>
  exportFormat: 'csv' | 'xlsx'
  headerRows: number             // atlanacak başlık satırı sayısı
  decimalSeparator: ',' | '.'
  columns: DemographicColumnMap
  /** artış hızı gibi ham sütundan türetilen alanlar için; yoksa undefined */
  derive?: (row: Record<string, string>) => Partial<Record<string, number>>
}

export const DATASETS: DemographicDataset[] = [
  // Step 3'teki FINDINGS.md'ye göre BURAYI DOLDUR. Her satır bir TÜİK tablosu.
  // Örnek iskelet (gerçek değerler FINDINGS.md'den gelir):
  // {
  //   key: 'population',
  //   label: 'İlçe nüfusu (ADNKS)',
  //   tableUrl: 'https://data.tuik.gov.tr/...',
  //   querySteps: [
  //     { action: 'click', selector: 'text=İlçe' },
  //     { action: 'selectOption', selector: '#yil', value: '2024' },
  //   ],
  //   exportFormat: 'csv',
  //   headerRows: 3,
  //   decimalSeparator: ',',
  //   columns: { ilColumn: 'İl', ilceColumn: 'İlçe', fields: { population: 'Toplam' } },
  // },
]

/** DATASETS'in en güncel yılı — CrawlRun.notes ve DistrictDemographics.dataYear için. */
export const DATA_YEAR = 2024  // FINDINGS.md'ye göre güncelle
```

- [ ] **Step 5: Doğrula ve commit**

`npx tsc -p crawler/tsconfig.json` temiz olmalı (DATASETS boş olsa da tip geçerli). `crawler/tuik/FINDINGS.md` her metrik için Step 3'teki tüm soruları yanıtlıyor mu kontrol et.

```bash
git add crawler/tuik/datasets.ts crawler/tuik/FINDINGS.md crawler/tuik/fixtures/
git commit -m "feat(tuik): portal keşfi — datasets.ts config + FINDINGS"
```

---

## Task 2: Ortak tarayıcı context helper

**Files:**
- Create: `crawler/fetcher/context.ts`
- Modify: `crawler/fetcher/browser.ts` (context kurulumunu helper'a devret)
- Test: `crawler/__tests__/fetcher/context.test.ts`

**Interfaces:**
- Produces: `launchContext(cfg: CrawlConfig, opts?: { headful?: boolean }) => Promise<{ browser: Browser; context: BrowserContext }>` — Task 7 (`extract.ts`) bunu kullanır.

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/fetcher/context.test.ts
import { launchContext } from '../../fetcher/context'
import { DEFAULT_CONFIG } from '../../config'

describe('launchContext', () => {
  it('tr-TR locale ve Istanbul timezone ile bir context döndürür, sonra kapanır', async () => {
    const { browser, context } = await launchContext(DEFAULT_CONFIG, { headful: false })
    const page = await context.newPage()
    const locale = await page.evaluate(() => navigator.language)
    const webdriver = await page.evaluate(() => navigator.webdriver)
    await page.close()
    await context.close()
    await browser.close()
    expect(locale).toBe('tr-TR')
    expect(webdriver).toBeUndefined()
  }, 30_000)
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns context`
Expected: FAIL — `Cannot find module '../../fetcher/context'`

- [ ] **Step 3: `context.ts` yaz**

`browser.ts`'deki context kurulumunu (satır 19-31: `chromium.launch`, `newContext` ile UA/viewport/locale/timezone, `addInitScript` webdriver maskesi) buraya taşı:

```typescript
// crawler/fetcher/context.ts
import { chromium, type Browser, type BrowserContext } from '@playwright/test'
import type { CrawlConfig } from '../config'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function launchContext(
  _cfg: CrawlConfig,
  opts: { headful?: boolean } = {},
): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: !opts.headful })
  try {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1440, height: 900 },
      locale: 'tr-TR',
      timezoneId: 'Europe/Istanbul',
    })
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    return { browser, context }
  } catch (e) {
    await browser.close()
    throw e
  }
}
```

- [ ] **Step 4: `browser.ts`'i helper'ı kullanacak şekilde düzenle**

`browser.ts` içinde satır 19-36'daki inline kurulumu `const { browser, context } = await launchContext(cfg, opts)` ile değiştir. `UA` sabitini ve `chromium`/`Browser`/`BrowserContext` importlarını `browser.ts`'den kaldır (artık `context.ts`'de). `randDelayMs`, `Fetcher` arayüzü, `get()`/`close()` mantığı DEĞİŞMEZ.

- [ ] **Step 5: Testleri çalıştır**

Run: `npm run test:crawler` (tümü) + `npx tsc -p crawler/tsconfig.json`
Expected: context testi PASS; mevcut crawler testleri (emlakjet/sahibinden/pipeline) hâlâ PASS; tsc temiz.

- [ ] **Step 6: Commit**

```bash
git add crawler/fetcher/context.ts crawler/fetcher/browser.ts crawler/__tests__/fetcher/context.test.ts
git commit -m "refactor(crawler): tarayıcı context kurulumunu launchContext helper'ına çıkar"
```

---

## Task 3: `DistrictDemographics` modeli + migration

**Files:**
- Modify: `prisma/schema.prisma` (yeni model, dosya sonuna — diğer crawler modellerinin yanına)
- Create: `prisma/migrations/20260907120000_add_district_demographics/migration.sql`

**Interfaces:**
- Produces: `prisma.districtDemographics` Prisma Client modeli; `il_ilce` compound unique. Task 6, 8, 9 tüketir.

- [ ] **Step 1: Modeli `schema.prisma`'ya ekle**

`AkifTurnLog` modelinden sonra:

```prisma
model DistrictDemographics {
  id                       String   @id @default(cuid())
  il                       String
  ilce                     String
  dataYear                 Int
  population               Int?
  populationGrowthPerMille Float?
  medianAge                Float?
  avgHouseholdSize         Float?
  netMigrationPerMille     Float?
  source                   String
  fetchedAt                DateTime
  updatedAt                DateTime @updatedAt

  @@unique([il, ilce])
  @@index([il])
}
```

- [ ] **Step 2: Migration SQL yaz**

```sql
-- prisma/migrations/20260907120000_add_district_demographics/migration.sql
-- CreateTable
CREATE TABLE "DistrictDemographics" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "dataYear" INTEGER NOT NULL,
    "population" INTEGER,
    "populationGrowthPerMille" DOUBLE PRECISION,
    "medianAge" DOUBLE PRECISION,
    "avgHouseholdSize" DOUBLE PRECISION,
    "netMigrationPerMille" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictDemographics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDemographics_il_ilce_key" ON "DistrictDemographics"("il", "ilce");

-- CreateIndex
CREATE INDEX "DistrictDemographics_il_idx" ON "DistrictDemographics"("il");
```

- [ ] **Step 3: Migration'ı dev DB'ye uygula**

Run: `npx prisma migrate deploy` (dev DB `arsabil_dev` çalışıyor olmalı — `npm run dev:db`)
Sonra: `npx prisma migrate status` → "Database schema is up to date"
Sonra: `npx prisma generate`

Windows'ta `prisma generate` EPERM verirse (`.prisma/client` DLL kilidi — jest/TS server): kilitleyen süreçleri kapat, tekrar dene. Şema değişikliği olduğu için generate ZORUNLU.

- [ ] **Step 4: tsc + regresyon**

Run: `npx tsc --noEmit`
Expected: temiz (yeni model henüz kullanılmıyor).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260907120000_add_district_demographics/
git commit -m "feat(db): DistrictDemographics modeli + migration (ilçe demografi)"
```

---

## Task 4: `src/lib/demografi/` — types + summarize

**Files:**
- Create: `src/lib/demografi/types.ts`
- Create: `src/lib/demografi/summarize.ts`
- Test: `src/lib/demografi/summarize.test.ts`

**Interfaces:**
- Produces:
  - `DistrictDemographicsRecord` — `{ dataYear: number; population: number | null; populationGrowthPerMille: number | null; medianAge: number | null; avgHouseholdSize: number | null; netMigrationPerMille: number | null }`
  - `DemographicsSummary` — `{ sentence: string | null }`
  - `summarizeDemographics(rec: DistrictDemographicsRecord) => DemographicsSummary`
  - Task 8 (`card.ts`) hepsini tüketir.

- [ ] **Step 1: `types.ts` yaz**

```typescript
// src/lib/demografi/types.ts
export interface DistrictDemographicsRecord {
  dataYear: number
  population: number | null
  populationGrowthPerMille: number | null
  medianAge: number | null
  avgHouseholdSize: number | null
  netMigrationPerMille: number | null
}

export interface DemographicsSummary {
  sentence: string | null
}
```

- [ ] **Step 2: Failing test yaz**

```typescript
// src/lib/demografi/summarize.test.ts
import { summarizeDemographics } from './summarize'
import type { DistrictDemographicsRecord } from './types'

const base: DistrictDemographicsRecord = {
  dataYear: 2024,
  population: 400_000,
  populationGrowthPerMille: 0,
  medianAge: 35,
  avgHouseholdSize: 3.2,
  netMigrationPerMille: 0,
}

describe('summarizeDemographics', () => {
  it('artış ≥ +5‰ ve net göç > 0 → talep destekleniyor', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 12, netMigrationPerMille: 8 })
    expect(r.sentence).toBe('Bu ilçede nüfus büyüyor ve net göç pozitif — konut talebi destekleniyor.')
  })

  it('artış ≤ −5‰ → talep zayıf olabilir', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: -9, netMigrationPerMille: -2 })
    expect(r.sentence).toBe('Nüfus geriliyor ya da ilçe net göç veriyor — konut talebi zayıf olabilir.')
  })

  it('net göç ≤ −10‰ (artış nötr olsa da) → talep zayıf olabilir', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 1, netMigrationPerMille: -15 })
    expect(r.sentence).toBe('Nüfus geriliyor ya da ilçe net göç veriyor — konut talebi zayıf olabilir.')
  })

  it('iki sinyal arası → dengeli', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 2, netMigrationPerMille: 1 })
    expect(r.sentence).toBe('Nüfus ve göç dengeli; belirgin bir demografik baskı yok.')
  })

  it('medyan yaş ≤ 30 → genç nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 2, netMigrationPerMille: 1, medianAge: 27 })
    expect(r.sentence).toBe('Nüfus ve göç dengeli; belirgin bir demografik baskı yok. Genç nüfus yapısı.')
  })

  it('medyan yaş ≥ 40 → yaşlanan nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 12, netMigrationPerMille: 8, medianAge: 44 })
    expect(r.sentence).toBe('Bu ilçede nüfus büyüyor ve net göç pozitif — konut talebi destekleniyor. Yaşlanan nüfus.')
  })

  it('artış ve net göç ikisi de null → sentence null', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: null, netMigrationPerMille: null })
    expect(r.sentence).toBeNull()
  })

  it('artış null ama net göç var → cümle üretilir (null dalına düşmez)', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: null, netMigrationPerMille: 3 })
    expect(r.sentence).not.toBeNull()
  })
})
```

- [ ] **Step 3: Test'i çalıştır, FAIL gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "demografi/summarize"`
Expected: FAIL — `Cannot find module './summarize'`

- [ ] **Step 4: `summarize.ts` yaz**

```typescript
// src/lib/demografi/summarize.ts
import type { DistrictDemographicsRecord, DemographicsSummary } from './types'

export function summarizeDemographics(rec: DistrictDemographicsRecord): DemographicsSummary {
  const g = rec.populationGrowthPerMille
  const m = rec.netMigrationPerMille

  if (g == null && m == null) return { sentence: null }

  const growing = g != null && g >= 5
  const migPositive = m != null && m > 0
  const shrinking = (g != null && g <= -5) || (m != null && m <= -10)

  let sentence: string
  if (growing && migPositive) {
    sentence = 'Bu ilçede nüfus büyüyor ve net göç pozitif — konut talebi destekleniyor.'
  } else if (shrinking) {
    sentence = 'Nüfus geriliyor ya da ilçe net göç veriyor — konut talebi zayıf olabilir.'
  } else {
    sentence = 'Nüfus ve göç dengeli; belirgin bir demografik baskı yok.'
  }

  const age = rec.medianAge
  if (age != null && age <= 30) sentence += ' Genç nüfus yapısı.'
  else if (age != null && age >= 40) sentence += ' Yaşlanan nüfus.'

  return { sentence }
}
```

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "demografi/summarize"`
Expected: 8 test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/demografi/
git commit -m "feat(demografi): DistrictDemographicsRecord tipi + summarizeDemographics"
```

---

## Task 5: `crawler/tuik/parse.ts`

**Files:**
- Create: `crawler/tuik/parse.ts`
- Test: `crawler/__tests__/tuik/parse.test.ts`
- Create/kullan: `crawler/tuik/fixtures/*.csv` (Task 1'de indirilen örnek; yoksa Task 1 FINDINGS'e göre elle temsilî bir tane oluştur)

**Interfaces:**
- Consumes: `DemographicDataset` (Task 1, `crawler/tuik/datasets.ts`)
- Produces:
  - `ParsedDemographicRow` — `{ il: string; ilce: string } & Partial<Record<'population'|'populationGrowthPerMille'|'medianAge'|'avgHouseholdSize'|'netMigrationPerMille', number>>`
  - `parseDatasetFile(fileText: string, dataset: DemographicDataset) => ParsedDemographicRow[]`
  - Task 7 (`run.ts`) tüketir.

- [ ] **Step 1: Fixture hazırla**

`crawler/tuik/fixtures/population-sample.csv` — Task 1'de gerçek indirilen dosya varsa onu kısalt (5-10 satır, birkaç il). Yoksa FINDINGS.md'nin tarif ettiği sütun düzeniyle temsilî bir CSV yaz. İçinde en az bir "İ/ı" içeren ilçe adı olsun (Ortahisar / Şişli gibi) ve bir eksik hücre.

- [ ] **Step 2: Failing test yaz**

```typescript
// crawler/__tests__/tuik/parse.test.ts
import { parseDatasetFile, type ParsedDemographicRow } from '../../tuik/parse'
import type { DemographicDataset } from '../../tuik/datasets'
import fs from 'fs'
import path from 'path'

const DS: DemographicDataset = {
  key: 'population',
  label: 'test',
  tableUrl: 'x',
  querySteps: [],
  exportFormat: 'csv',
  headerRows: 1,
  decimalSeparator: ',',
  columns: { ilColumn: 'Il', ilceColumn: 'Ilce', fields: { population: 'Toplam' } },
}

describe('parseDatasetFile', () => {
  it('CSV satırlarını il/ilçe + alan değerlerine çevirir, ondalık ayıracını normalize eder', () => {
    const csv = ['Il,Ilce,Toplam', 'Trabzon,Ortahisar,"320.000"', 'İstanbul,Şişli,"274.420"'].join('\n')
    const rows = parseDatasetFile(csv, DS)
    expect(rows).toEqual<ParsedDemographicRow[]>([
      { il: 'Trabzon', ilce: 'Ortahisar', population: 320000 },
      { il: 'İstanbul', ilce: 'Şişli', population: 274420 },
    ])
  })

  it('eksik/boş hücre → o alan atlanır (undefined), satır yine döner', () => {
    const csv = ['Il,Ilce,Toplam', 'Ordu,Altınordu,'].join('\n')
    const rows = parseDatasetFile(csv, DS)
    expect(rows).toEqual([{ il: 'Ordu', ilce: 'Altınordu' }])
  })

  it('decimalSeparator "," olan ondalık değeri parse eder (medyan yaş)', () => {
    const ds2: DemographicDataset = { ...DS, columns: { ...DS.columns, fields: { medianAge: 'Toplam' } } }
    const csv = ['Il,Ilce,Toplam', 'Trabzon,Ortahisar,"36,4"'].join('\n')
    expect(parseDatasetFile(csv, ds2)).toEqual([{ il: 'Trabzon', ilce: 'Ortahisar', medianAge: 36.4 }])
  })

  it('il toplamı / "Toplam" özet satırlarını atlar (ilçe adı boş veya "Toplam")', () => {
    const csv = ['Il,Ilce,Toplam', 'Trabzon,,"800.000"', 'Trabzon,Toplam,"800.000"', 'Trabzon,Ortahisar,"320.000"'].join('\n')
    expect(parseDatasetFile(csv, DS)).toEqual([{ il: 'Trabzon', ilce: 'Ortahisar', population: 320000 }])
  })
})
```

- [ ] **Step 3: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/parse"`
Expected: FAIL — modül yok.

- [ ] **Step 4: `parse.ts` yaz**

```typescript
// crawler/tuik/parse.ts
import type { DemographicDataset } from './datasets'

const NUMERIC_FIELDS = [
  'population',
  'populationGrowthPerMille',
  'medianAge',
  'avgHouseholdSize',
  'netMigrationPerMille',
] as const
type NumericField = (typeof NUMERIC_FIELDS)[number]

export type ParsedDemographicRow = { il: string; ilce: string } & Partial<Record<NumericField, number>>

/** "320.000" veya "36,4" → number. Binlik ayıracını (decimalSeparator'ın TERSİ) siler. */
function parseNumber(raw: string, decimalSeparator: ',' | '.'): number | undefined {
  const s = raw.trim().replace(/^"|"$/g, '')
  if (!s) return undefined
  const thousands = decimalSeparator === ',' ? '.' : ','
  const cleaned = s.split(thousands).join('').replace(decimalSeparator, '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

/** Basit CSV satır ayrıştırıcı — tırnak içi virgülü korur. TÜİK export'ları basit yapıdadır. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuotes = !inQuotes
    else if (c === ',' && !inQuotes) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

function resolveIndex(col: string | number, header: string[]): number {
  if (typeof col === 'number') return col
  return header.findIndex((h) => h.trim() === col)
}

export function parseDatasetFile(fileText: string, dataset: DemographicDataset): ParsedDemographicRow[] {
  const lines = fileText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const header = splitCsvLine(lines[0] ?? '')
  const body = lines.slice(Math.max(1, dataset.headerRows))

  const ilIdx = resolveIndex(dataset.columns.ilColumn, header)
  const ilceIdx = resolveIndex(dataset.columns.ilceColumn, header)

  const rows: ParsedDemographicRow[] = []
  for (const line of body) {
    const cells = splitCsvLine(line)
    const il = (cells[ilIdx] ?? '').trim().replace(/^"|"$/g, '')
    const ilce = (cells[ilceIdx] ?? '').trim().replace(/^"|"$/g, '')
    // il toplamı / özet satırlarını atla
    if (!il || !ilce || /^toplam$/i.test(ilce)) continue

    const row: ParsedDemographicRow = { il, ilce }
    for (const [field, col] of Object.entries(dataset.columns.fields) as [NumericField, string | number][]) {
      const idx = resolveIndex(col, header)
      const val = parseNumber(cells[idx] ?? '', dataset.decimalSeparator)
      if (val !== undefined) row[field] = val
    }
    if (dataset.derive) {
      const asRecord: Record<string, string> = {}
      header.forEach((h, i) => { asRecord[h.trim()] = (cells[i] ?? '').trim() })
      for (const [k, v] of Object.entries(dataset.derive(asRecord))) {
        if (typeof v === 'number' && Number.isFinite(v)) row[k as NumericField] = v
      }
    }
    rows.push(row)
  }
  return rows
}
```

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/parse"`
Expected: 4 test PASS.

- [ ] **Step 6: Commit**

```bash
git add crawler/tuik/parse.ts crawler/__tests__/tuik/parse.test.ts crawler/tuik/fixtures/
git commit -m "feat(tuik): export dosyası parse — parseDatasetFile"
```

---

## Task 6: `crawler/tuik/upsert.ts`

**Files:**
- Create: `crawler/tuik/upsert.ts`
- Test: `crawler/__tests__/tuik/upsert.test.ts`

**Interfaces:**
- Consumes: `ParsedDemographicRow` (Task 5); `normalizeAreaName` (`@/lib/areaPrices/normalizeAreaName`)
- Produces:
  - `MergedDistrictRow` — `{ il: string; ilce: string } & Partial<Record<NumericField, number>>` (normalize edilmiş anahtar, birden çok dataset birleştirilmiş)
  - `mergeRows(perDataset: ParsedDemographicRow[][]) => MergedDistrictRow[]`
  - `DemographicsUpsertClient` — `{ districtDemographics: { upsert(args: unknown): Promise<unknown> } }`
  - `upsertDistrictDemographics(client: DemographicsUpsertClient, rows: MergedDistrictRow[], meta: { dataYear: number; source: string; fetchedAt: Date }) => Promise<number>` (yazılan satır sayısı döner)
  - Task 7 (`run.ts`) tüketir.

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/tuik/upsert.test.ts
import { mergeRows, upsertDistrictDemographics, type DemographicsUpsertClient } from '../../tuik/upsert'

describe('mergeRows', () => {
  it('birden çok dataset satırını il/ilçe anahtarında birleştirir, anahtarı normalize eder', () => {
    const merged = mergeRows([
      [{ il: 'Trabzon', ilce: 'Ortahisar', population: 320000 }],
      [{ il: 'Trabzon', ilce: 'ORTAHİSAR', medianAge: 36.4 }],
    ])
    expect(merged).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 },
    ])
  })
})

describe('upsertDistrictDemographics', () => {
  it('her satır için upsert çağırır (create + update aynı alanlar), SİLME yapmaz, sayı döner', async () => {
    const calls: any[] = []
    const client: DemographicsUpsertClient = {
      districtDemographics: {
        upsert: async (args: any) => { calls.push(args); return {} },
      },
    }
    const n = await upsertDistrictDemographics(
      client,
      [{ il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 }],
      { dataYear: 2024, source: 'tuik-adnks', fetchedAt: new Date('2026-09-07T00:00:00Z') },
    )
    expect(n).toBe(1)
    expect(calls[0].where).toEqual({ il_ilce: { il: 'TRABZON', ilce: 'ORTAHISAR' } })
    expect(calls[0].create).toMatchObject({ il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4, dataYear: 2024, source: 'tuik-adnks' })
    expect(calls[0].update).toMatchObject({ population: 320000, medianAge: 36.4, dataYear: 2024 })
    // update il/ilce'yi yeniden yazmaz (anahtar sabit)
    expect(calls[0].update.il).toBeUndefined()
  })

  it('boş satır listesi → 0, hiç upsert yok', async () => {
    const client: DemographicsUpsertClient = { districtDemographics: { upsert: async () => { throw new Error('çağrılmamalı') } } }
    expect(await upsertDistrictDemographics(client, [], { dataYear: 2024, source: 'x', fetchedAt: new Date() })).toBe(0)
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/upsert"`
Expected: FAIL — modül yok.

- [ ] **Step 3: `upsert.ts` yaz**

```typescript
// crawler/tuik/upsert.ts
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { ParsedDemographicRow } from './parse'

const NUMERIC_FIELDS = [
  'population',
  'populationGrowthPerMille',
  'medianAge',
  'avgHouseholdSize',
  'netMigrationPerMille',
] as const
type NumericField = (typeof NUMERIC_FIELDS)[number]

export type MergedDistrictRow = { il: string; ilce: string } & Partial<Record<NumericField, number>>

export function mergeRows(perDataset: ParsedDemographicRow[][]): MergedDistrictRow[] {
  const map = new Map<string, MergedDistrictRow>()
  for (const rows of perDataset) {
    for (const r of rows) {
      const il = normalizeAreaName(r.il)
      const ilce = normalizeAreaName(r.ilce)
      const key = `${il} ${ilce}`
      const existing = map.get(key) ?? { il, ilce }
      for (const f of NUMERIC_FIELDS) {
        if (typeof r[f] === 'number') existing[f] = r[f]
      }
      map.set(key, existing)
    }
  }
  return [...map.values()]
}

export interface DemographicsUpsertClient {
  districtDemographics: { upsert(args: unknown): Promise<unknown> }
}

export async function upsertDistrictDemographics(
  client: DemographicsUpsertClient,
  rows: MergedDistrictRow[],
  meta: { dataYear: number; source: string; fetchedAt: Date },
): Promise<number> {
  let written = 0
  for (const row of rows) {
    const metrics: Partial<Record<NumericField, number | null>> = {}
    for (const f of NUMERIC_FIELDS) metrics[f] = typeof row[f] === 'number' ? row[f]! : null

    await client.districtDemographics.upsert({
      where: { il_ilce: { il: row.il, ilce: row.ilce } },
      create: {
        il: row.il,
        ilce: row.ilce,
        dataYear: meta.dataYear,
        source: meta.source,
        fetchedAt: meta.fetchedAt,
        ...metrics,
      },
      update: {
        dataYear: meta.dataYear,
        source: meta.source,
        fetchedAt: meta.fetchedAt,
        ...metrics,
      },
    })
    written++
  }
  return written
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/upsert"` → 3 test PASS.
Ayrıca: `npx tsc -p crawler/tsconfig.json` temiz.

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/upsert.ts crawler/__tests__/tuik/upsert.test.ts
git commit -m "feat(tuik): mergeRows + upsertDistrictDemographics (UPSERT, silme yok)"
```

---

## Task 7: `crawler/tuik/extract.ts` + `run.ts` + script + README

**Files:**
- Create: `crawler/tuik/extract.ts`
- Create: `crawler/tuik/run.ts`
- Create: `crawler/tuik/README.md`
- Modify: `package.json` (`crawl:tuik` scripti)
- Test: `crawler/__tests__/tuik/run.test.ts`

**Interfaces:**
- Consumes: `launchContext` (Task 2); `DATASETS`, `DATA_YEAR` (Task 1); `parseDatasetFile` (Task 5); `mergeRows`, `upsertDistrictDemographics`, `DemographicsUpsertClient` (Task 6)
- Produces:
  - `extractDataset(context: BrowserContext, dataset: DemographicDataset, downloadDir: string) => Promise<string>` (indirilen dosya yolu)
  - `runTuikCrawl(deps: RunDeps, opts: { dryRun: boolean }) => Promise<RunSummary>` — `RunDeps = { extract, parseFn, client, crawlRunClient, datasets, dataYear }`; DI ile test edilir
  - `RunSummary` — `{ datasetsOk: number; datasetsFailed: string[]; rowsWritten: number; aborted: boolean }`

- [ ] **Step 1: Failing test yaz (run.ts orchestration — DI, tarayıcı YOK)**

```typescript
// crawler/__tests__/tuik/run.test.ts
import { runTuikCrawl, type RunDeps } from '../../tuik/run'
import type { DemographicDataset } from '../../tuik/datasets'

const ds = (key: string): DemographicDataset => ({
  key, label: key, tableUrl: 'x', querySteps: [], exportFormat: 'csv',
  headerRows: 1, decimalSeparator: ',', columns: { ilColumn: 'Il', ilceColumn: 'Ilce', fields: {} },
})

function makeDeps(over: Partial<RunDeps> = {}): RunDeps {
  const upserts: any[] = []
  return {
    datasets: [ds('population'), ds('migration')],
    dataYear: 2024,
    extract: jest.fn(async (dsArg: DemographicDataset) => `/tmp/${dsArg.key}.csv`),
    readFile: jest.fn(async () => 'Il,Ilce,Toplam\nTrabzon,Ortahisar,"1"'),
    parseFn: jest.fn(() => [{ il: 'Trabzon', ilce: 'Ortahisar', population: 1 }]),
    client: { districtDemographics: { upsert: async (a: any) => { upserts.push(a) } } } as any,
    crawlRunClient: { crawlRun: { create: jest.fn(async () => ({ id: 'run-1' })), update: jest.fn(async () => ({})) } } as any,
    _upserts: upserts,
    ...over,
  } as RunDeps & { _upserts: any[] }
}

describe('runTuikCrawl', () => {
  it('tüm dataset başarılı → satır yazar, CrawlRun kapatır', async () => {
    const deps = makeDeps()
    const summary = await runTuikCrawl(deps, { dryRun: false })
    expect(summary.datasetsOk).toBe(2)
    expect(summary.datasetsFailed).toEqual([])
    expect(summary.rowsWritten).toBe(1)
    expect(summary.aborted).toBe(false)
    expect((deps as any).crawlRunClient.crawlRun.update).toHaveBeenCalled()
  })

  it('bir dataset extract hata verir → o metrik atlanır, diğerleri yazılır, notes\'a düşer', async () => {
    const deps = makeDeps({
      extract: jest.fn(async (d: DemographicDataset) => {
        if (d.key === 'migration') throw new Error('export indirilemedi')
        return `/tmp/${d.key}.csv`
      }),
    })
    const summary = await runTuikCrawl(deps, { dryRun: false })
    expect(summary.datasetsOk).toBe(1)
    expect(summary.datasetsFailed).toEqual(['migration'])
    expect(summary.rowsWritten).toBe(1)
    expect(summary.aborted).toBe(false)
  })

  it('HİÇBİR dataset çekilemez → aborted, 0 satır, hiç upsert yok', async () => {
    const deps = makeDeps({ extract: jest.fn(async () => { throw new Error('portal down') }) })
    const summary = await runTuikCrawl(deps, { dryRun: false })
    expect(summary.aborted).toBe(true)
    expect(summary.rowsWritten).toBe(0)
    expect((deps as any)._upserts).toHaveLength(0)
  })

  it('dryRun: parse eder ama upsert ETMEZ', async () => {
    const deps = makeDeps()
    const summary = await runTuikCrawl(deps, { dryRun: true })
    expect(summary.datasetsOk).toBe(2)
    expect((deps as any)._upserts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/run"`
Expected: FAIL — modül yok.

- [ ] **Step 3: `run.ts` yaz (orchestration)**

```typescript
// crawler/tuik/run.ts
import type { DemographicDataset } from './datasets'
import type { ParsedDemographicRow } from './parse'
import { mergeRows, upsertDistrictDemographics, type DemographicsUpsertClient } from './upsert'

export interface RunSummary {
  datasetsOk: number
  datasetsFailed: string[]
  rowsWritten: number
  aborted: boolean
}

export interface RunDeps {
  datasets: DemographicDataset[]
  dataYear: number
  extract: (dataset: DemographicDataset) => Promise<string>
  readFile: (path: string) => Promise<string>
  parseFn: (fileText: string, dataset: DemographicDataset) => ParsedDemographicRow[]
  client: DemographicsUpsertClient
  crawlRunClient: {
    crawlRun: {
      create(args: unknown): Promise<{ id: string }>
      update(args: unknown): Promise<unknown>
    }
  }
}

export async function runTuikCrawl(deps: RunDeps, opts: { dryRun: boolean }): Promise<RunSummary> {
  const run = await deps.crawlRunClient.crawlRun.create({
    data: { source: 'tuik', il: 'ALL', category: 'demografi' },
  })

  const perDataset: ParsedDemographicRow[][] = []
  const failed: string[] = []

  for (const dataset of deps.datasets) {
    try {
      const filePath = await deps.extract(dataset)
      const text = await deps.readFile(filePath)
      perDataset.push(deps.parseFn(text, dataset))
    } catch (err) {
      failed.push(dataset.key)
      console.error(`[tuik] ${dataset.key} çekilemedi:`, (err as Error).message)
    }
  }

  const aborted = perDataset.length === 0
  let rowsWritten = 0

  if (!aborted && !opts.dryRun) {
    const merged = mergeRows(perDataset)
    rowsWritten = await upsertDistrictDemographics(deps.client, merged, {
      dataYear: deps.dataYear,
      source: 'tuik-adnks',
      fetchedAt: new Date(),
    })
  }

  const summary: RunSummary = {
    datasetsOk: deps.datasets.length - failed.length,
    datasetsFailed: failed,
    rowsWritten,
    aborted,
  }

  await deps.crawlRunClient.crawlRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      blocked: aborted,
      listingsFound: perDataset.reduce((n, r) => n + r.length, 0),
      listingsUpserted: rowsWritten,
      notes: JSON.stringify({ dryRun: opts.dryRun, datasetsFailed: failed, dataYear: deps.dataYear }),
    },
  })

  return summary
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/run"` → 4 test PASS.

- [ ] **Step 5: `extract.ts` yaz (Playwright sürücü — birim testi YOK, gerçek turda doğrulanır)**

```typescript
// crawler/tuik/extract.ts
import path from 'path'
import type { BrowserContext } from '@playwright/test'
import type { DemographicDataset } from './datasets'

/**
 * TÜİK sorgu arayüzünü sürer, İlçe kırılımı + yıl seçer, export'u indirir.
 * querySteps ve exportFormat crawler/tuik/datasets.ts'ten (Task 1 FINDINGS) gelir.
 * Bu fonksiyonun birim testi yoktur — gerçek portal davranışına bağlıdır;
 * `npm run crawl:tuik -- --headful --dry-run` ile elle doğrulanır (README).
 */
export async function extractDataset(
  context: BrowserContext,
  dataset: DemographicDataset,
  downloadDir: string,
): Promise<string> {
  const page = await context.newPage()
  try {
    await page.goto(dataset.tableUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })

    for (const step of dataset.querySteps) {
      if (step.action === 'waitForSelector') await page.waitForSelector(step.selector, { timeout: 20_000 })
      else if (step.action === 'click') await page.click(step.selector)
      else if (step.action === 'fill') await page.fill(step.selector, step.value ?? '')
      else if (step.action === 'selectOption') await page.selectOption(step.selector, step.value ?? '')
      await page.waitForTimeout(1500 + Math.random() * 2000)
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      // İndir düğmesi querySteps'in SON adımıdır (Task 1'de öyle tanımlanır) —
      // ya da burada dataset'e özel bir "downloadTrigger" selektörü eklenir.
      // FINDINGS.md'ye göre son querySteps adımı indirmeyi tetiklemiyorsa,
      // datasets.ts'e `downloadTrigger: string` alanı ekle ve burada tıkla.
    ])
    const suggested = download.suggestedFilename()
    const ext = dataset.exportFormat === 'csv' ? 'csv' : 'xlsx'
    const filePath = path.join(downloadDir, `${dataset.key}.${suggested.endsWith(ext) ? suggested.split('.').pop() : ext}`)
    await download.saveAs(filePath)
    return filePath
  } finally {
    await page.close()
  }
}
```

**NOT:** Step 5 kodundaki `Promise.all` içindeki indirme-tetikleyici, Task 1 FINDINGS'e göre netleşir. Son `querySteps` adımı indirmeyi tetikliyorsa döngüyü indirmeden ÖNCE bir adım kısa bırak ve son adımı `Promise.all` içine al; değilse `datasets.ts`'e `downloadTrigger: string` alanı ekleyip burada `page.click(dataset.downloadTrigger)` yap. Bu, Task 1 çıktısına bağlı bilinçli bir esneklik noktası.

- [ ] **Step 6: `run.ts`'e gerçek CLI girişini ekle (I10 deseni — prisma yalnız gerçek çalıştırmada)**

`run.ts` sonuna ekle:

```typescript
// crawler/tuik/run.ts (devam) — CLI girişi
async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const headful = argv.includes('--headful')

  const { DATASETS, DATA_YEAR } = await import('./datasets')
  const { launchContext } = await import('../fetcher/context')
  const { DEFAULT_CONFIG } = await import('../config')
  const { parseDatasetFile } = await import('./parse')
  const { extractDataset } = await import('./extract')
  const fs = await import('fs/promises')
  const os = await import('os')
  const path = await import('path')
  const { PrismaClient } = await import('@prisma/client')

  if (DATASETS.length === 0) {
    console.error('crawler/tuik/datasets.ts boş — Task 1 (portal keşfi) tamamlanmadı.')
    process.exitCode = 1
    return
  }

  const downloadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tuik-'))
  const { browser, context } = await launchContext(DEFAULT_CONFIG, { headful })
  const prisma = new PrismaClient()

  try {
    const summary = await runTuikCrawl(
      {
        datasets: DATASETS,
        dataYear: DATA_YEAR,
        extract: (ds) => extractDataset(context, ds, downloadDir),
        readFile: (p) => fs.readFile(p, 'utf8'),
        parseFn: parseDatasetFile,
        client: prisma as unknown as DemographicsUpsertClient,
        crawlRunClient: prisma as unknown as RunDeps['crawlRunClient'],
      },
      { dryRun },
    )
    console.log('[tuik] özet:', summary)
  } finally {
    await context.close()
    await browser.close()
    await prisma.$disconnect()
    await fs.rm(downloadDir, { recursive: true, force: true })
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
}
```

- [ ] **Step 7: `package.json`'a script ekle**

`"crawl"` satırının altına:

```json
"crawl:tuik": "cross-env TS_NODE_PROJECT=crawler/tsconfig.json ts-node --transpile-only -r tsconfig-paths/register crawler/tuik/run.ts",
```

- [ ] **Step 8: `README.md` yaz**

```markdown
# crawler/tuik — TÜİK İlçe Demografi Toplama

Değer Kartı'nın üye demografi bloğunu besleyen ilçe seviyesi TÜİK verisini toplar.

## Çalıştırma

1. Migration uygulanmış olmalı: `npx prisma migrate status` → up to date.
2. Kuru koşu (parse eder, DB'ye yazMAZ, tarayıcıyı gösterir):
   `npm run crawl:tuik -- --dry-run --headful`
3. Gerçek koşu: `npm run crawl:tuik`

## Tazeleme kadansı

Yılda bir — TÜİK ADNKS sonuçları genelde Şubat'ta yayınlanır. `datasets.ts`'teki
`DATA_YEAR`'ı güncelle, gerekiyorsa `querySteps`'teki yıl değerini değiştir, koş.

## Bir metrik çekilemezse

`CrawlRun.notes` (`datasetsFailed`) hangi metriğin düştüğünü söyler. O metrik
sütunu bir sonraki başarılı turda güncellenir; eski değer korunur (UPSERT, silme yok).
TÜİK arayüzü değiştiyse `datasets.ts`'teki `querySteps`/selektörleri güncelle.
```

- [ ] **Step 9: Regresyon + commit**

Run: `npx tsc -p crawler/tsconfig.json` + `npm run test:crawler`
Expected: temiz, tüm crawler testleri PASS.

```bash
git add crawler/tuik/ crawler/__tests__/tuik/run.test.ts package.json
git commit -m "feat(tuik): extract Playwright sürücüsü + runTuikCrawl orchestration + crawl:tuik scripti"
```

---

## Task 8: `card.ts` — deps + DTO + buildDegerCard wiring

**Files:**
- Modify: `src/lib/deger/card.ts`
- Modify: `src/lib/deger/anonCardDeps.ts` (Omit tipini genişlet)
- Test: `src/lib/deger/card.test.ts` (yeni testler + mevcut `deps()` fabrikasına alan ekle)

**Interfaces:**
- Consumes: `DistrictDemographicsRecord`, `summarizeDemographics` (Task 4)
- Produces:
  - `DegerCardDeps.findDistrictDemographics: (il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>` (zorunlu)
  - `DegerCardDTO.demographics?` — `{ dataYear; population; populationGrowthPerMille; medianAge; avgHouseholdSize; netMigrationPerMille; summary: string | null }` (tüm sayısal alanlar `number | null`)
  - Task 9 (route'lar) ve Task 10 (`DegerKarti`) tüketir.

- [ ] **Step 1: Mevcut `deps()` fabrikasına alan ekle (kırık testleri önlemek için ÖNCE)**

`card.test.ts` içindeki `deps()` fabrikasına (yaklaşık satır 14-40), `findAreaTrend`'in yanına:

```typescript
    findDistrictDemographics: jest.fn().mockResolvedValue({
      dataYear: 2024,
      population: 320_000,
      populationGrowthPerMille: 12,
      medianAge: 36,
      avgHouseholdSize: 3.1,
      netMigrationPerMille: 5,
    }),
```

- [ ] **Step 2: Failing testler yaz**

`card.test.ts` sonuna (priceTrend testlerinin yanına):

```typescript
  it('üye: demographics var (5 metrik + summary)', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.demographics).toBeDefined()
    expect(res.card.demographics!.population).toBe(320_000)
    expect(res.card.demographics!.dataYear).toBe(2024)
    expect(res.card.demographics!.summary).toContain('konut talebi destekleniyor')
  })

  it('anonim: demographics YOK', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card).not.toHaveProperty('demographics')
  })

  it('demografi kaydı yok → demographics alanı hiç eklenmez (üye olsa bile)', async () => {
    const d = deps({ findDistrictDemographics: jest.fn().mockResolvedValue(null) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card).not.toHaveProperty('demographics')
  })

  it('findDistrictDemographics normalize edilmiş args alır', async () => {
    const d = deps()
    await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
    expect(d.findDistrictDemographics).toHaveBeenCalledWith('TRABZON', 'ORTAHISAR')
  })

  it('parsel bulunamadı → findDistrictDemographics çağrılmaz', async () => {
    const d = deps({ fetchParcelByPoint: jest.fn().mockResolvedValue({ ok: false, reason: 'not_found' }) })
    await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
    expect(d.findDistrictDemographics).not.toHaveBeenCalled()
  })
```

- [ ] **Step 3: Test'i çalıştır, FAIL gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "deger/card"`
Expected: yeni testler FAIL (`demographics` undefined); mevcut testler PASS (fabrika alanı eklendi).

- [ ] **Step 4: `card.ts`'i düzenle**

İmport ekle:
```typescript
import { summarizeDemographics } from '@/lib/demografi/summarize'
import type { DistrictDemographicsRecord } from '@/lib/demografi/types'
```

`DegerCardDeps` arayüzüne ekle:
```typescript
  findDistrictDemographics: (il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>
```

`DegerCardDTO`'ya ekle:
```typescript
  demographics?: {
    dataYear: number
    population: number | null
    populationGrowthPerMille: number | null
    medianAge: number | null
    avgHouseholdSize: number | null
    netMigrationPerMille: number | null
    summary: string | null
  }
```

`buildDegerCard` içinde `Promise.all` dizisine `deps.findDistrictDemographics(nIl, nIlce)` ekle (trendRows'un yanına), destructuring'e `demo` ekle:
```typescript
  const [snap, stats, listings, hood, trendRows, demo] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(nIl, nIlce, nMahalle),
    deps.findListingsNear(nIl, nIlce),
    deps.findNeighborhood(nIl, nIlce, nMahalle),
    deps.findAreaTrend(nIl, nIlce, nMahalle),
    deps.findDistrictDemographics(nIl, nIlce),
  ])
```

DTO oluşturma bloğunda, `priceTrend` spread'inin yanına:
```typescript
      ...(opts.memberView && demo
        ? {
            demographics: {
              dataYear: demo.dataYear,
              population: demo.population,
              populationGrowthPerMille: demo.populationGrowthPerMille,
              medianAge: demo.medianAge,
              avgHouseholdSize: demo.avgHouseholdSize,
              netMigrationPerMille: demo.netMigrationPerMille,
              summary: summarizeDemographics(demo).sentence,
            },
          }
        : {}),
```

- [ ] **Step 5: `anonCardDeps.ts` — Omit tipini genişlet**

`createAnonCardDeps` dönüş tipini değiştir:
```typescript
export function createAnonCardDeps(): Omit<DegerCardDeps, 'findAreaTrend' | 'findDistrictDemographics'> {
```
Docstring'e bir satır ekle: `findDistrictDemographics` da bilinçli olarak dışarıda — üye-özel (route'ta `if (!userId) return null`).

- [ ] **Step 6: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "deger/card"`
Expected: tüm testler PASS.

`npx tsc --noEmit` → **`/api/deger/kart/route.ts` ve `whatsapp/webhook/route.ts`'te `findDistrictDemographics` eksik hatası BEKLENİYOR** (Task 9'da düzeltilecek). Başka tsc hatası olmamalı.

- [ ] **Step 7: Commit**

```bash
git add src/lib/deger/card.ts src/lib/deger/anonCardDeps.ts src/lib/deger/card.test.ts
git commit -m "feat(deger): card.ts demographics DTO + findDistrictDemographics deps (üye-gated)"
```

---

## Task 9: Route wiring — `/api/deger/kart` + WhatsApp webhook

**Files:**
- Modify: `src/app/api/deger/kart/route.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`
- Test: `src/app/api/deger/kart/route.test.ts` (varsa; yoksa `card.ts` testleri yeterli — bu durumda route'a bir odak testi ekle)

**Interfaces:**
- Consumes: `DegerCardDeps.findDistrictDemographics` (Task 8)
- Produces: yok (uçlar)

- [ ] **Step 1: `/api/deger/kart/route.ts` — deps'e `findDistrictDemographics` ekle**

`findAreaTrend` dep'inin yanına (aynı `if (!userId)` + `try/catch` savunması):

```typescript
      findDistrictDemographics: async (il, ilce) => {
        if (!userId) return null
        try {
          return await prisma.districtDemographics.findUnique({
            where: { il_ilce: { il, ilce } },
            select: {
              dataYear: true,
              population: true,
              populationGrowthPerMille: true,
              medianAge: true,
              avgHouseholdSize: true,
              netMigrationPerMille: true,
            },
          })
        } catch {
          // DistrictDemographics tablosu henüz migrate edilmemişse /deger'i düşürme.
          return null
        }
      },
```

- [ ] **Step 2: `whatsapp/webhook/route.ts` — `cardDeps`'e ekle**

`findAreaTrend: async () => [],` satırının yanına:

```typescript
    findDistrictDemographics: async () => null,
```

Yorumu güncelle: `// Bot trend/demografi göstermez → ikisi de boş/null.`

- [ ] **Step 3: Route odak testi (mevcut kart route testi yoksa ekle)**

`src/app/api/deger/kart/route.test.ts` yoksa oluştur; varsa şu testi ekle:

```typescript
it('anonim istek: findDistrictDemographics null döner (DTO\'da demographics yok)', async () => {
  // route'un buildDegerCard'a geçtiği deps'te findDistrictDemographics var ve
  // userId yokken null döndürüyor — buildDegerCard mock'lanmışsa deps şeklini doğrula.
  // (Mevcut kart route testinin mock desenini izle.)
})
```

Not: mevcut route testi `buildDegerCard`'ı mock'luyorsa (whatsapp testi öyle yapıyor), bu testi `card.test.ts`'in kapsamı zaten karşılar — o zaman bu adımı atla ve yalnızca tsc temizliğine güven.

- [ ] **Step 4: tsc + tüm suite**

Run: `npx tsc --noEmit`
Expected: **temiz** (Task 8'in bıraktığı iki hata çözüldü).

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "deger|whatsapp"`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/deger/kart/route.ts src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(deger): findDistrictDemographics route wiring (/deger üye + whatsapp null)"
```

---

## Task 10: `DegerKarti.tsx` — demografi bloğu + CSS

**Files:**
- Modify: `src/components/deger/DegerKarti.tsx`
- Modify: `src/components/deger/DegerKarti.module.css`
- Test: `src/components/deger/DegerKarti.test.tsx`

**Interfaces:**
- Consumes: `DegerCardDTO.demographics` (Task 8)

- [ ] **Step 1: Test fixture'ına demographics ekle + failing testler yaz**

`DegerKarti.test.tsx`'te bir `memberCardWithDemographics` DTO'su kur (mevcut `baseCard` + `value: memberValue` + `demographics`):

```typescript
const demographics = {
  dataYear: 2024,
  population: 320000,
  populationGrowthPerMille: 12,
  medianAge: 36,
  avgHouseholdSize: 3.1,
  netMigrationPerMille: 5,
  summary: 'Bu ilçede nüfus büyüyor ve net göç pozitif — konut talebi destekleniyor.',
}
```

Testler:

```typescript
it('üye + demographics: özet cümle ve 5 metrik render edilir', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/konut talebi destekleniyor/)).toBeInTheDocument()
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()          // nüfus tr-TR
  expect(screen.getByText(/Kaynak: TÜİK 2024/)).toBeInTheDocument()
})

it('anonim + demographics undefined: blur overlay + Üye Ol gösterilir, metrik değerleri yok', () => {
  render(<DegerKarti card={{ ...baseCard }} isLoggedIn={false} parcelQuery="x" />)
  // demografi bloğu başlığı görünür ama gerçek sayı yok
  expect(screen.getByText(/Bölge Demografisi/)).toBeInTheDocument()
  expect(screen.queryByText(/320\.000/)).not.toBeInTheDocument()
})

it('demografi bloğu hiçbir fetch tetiklemez', () => {
  const spy = jest.spyOn(global, 'fetch' as any)
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})

it('summary null ise özet cümle render edilmez ama metrikler render edilir', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { ...demographics, summary: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "DegerKarti"`
Expected: yeni testler FAIL.

- [ ] **Step 3: `DegerKarti.tsx`'e blok ekle**

`{isMember && card.priceTrend && (...)}` bloğundan SONRA, `<p className={styles.disclaimer}>`'dan ÖNCE:

```tsx
      {isMember && card.demographics ? (
        <div className={styles.demografiBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>
            Bölge Demografisi <span className={styles.trendScope}>· İlçe geneli</span>
          </div>
          {card.demographics.summary && (
            <p className={styles.demografiSummary}>{card.demographics.summary}</p>
          )}
          <div className={styles.demografiGrid}>
            {card.demographics.population != null && (
              <div className={styles.memberRow}>Nüfus: {card.demographics.population.toLocaleString('tr-TR')}</div>
            )}
            {card.demographics.populationGrowthPerMille != null && (
              <div className={styles.memberRow}>Yıllık nüfus artışı: {fmtPerMille(card.demographics.populationGrowthPerMille)}</div>
            )}
            {card.demographics.netMigrationPerMille != null && (
              <div className={styles.memberRow}>Net göç hızı: {fmtPerMille(card.demographics.netMigrationPerMille)}</div>
            )}
            {card.demographics.medianAge != null && (
              <div className={styles.memberRow}>Medyan yaş: {card.demographics.medianAge.toLocaleString('tr-TR')}</div>
            )}
            {card.demographics.avgHouseholdSize != null && (
              <div className={styles.memberRow}>Ortalama hane: {card.demographics.avgHouseholdSize.toLocaleString('tr-TR')} kişi</div>
            )}
          </div>
          <p className={styles.demografiSource}>Kaynak: TÜİK {card.demographics.dataYear}</p>
        </div>
      ) : !isMember ? (
        <div className={styles.demografiBlock}>
          <div className={styles.divider} />
          <div className={styles.label}>
            Bölge Demografisi <span className={styles.trendScope}>· İlçe geneli</span>
          </div>
          <div className={styles.gatedWrap}>
            <div className={styles.blurred} aria-hidden="true">
              <div className={styles.memberRow}>Nüfus: ••••••</div>
              <div className={styles.memberRow}>Yıllık nüfus artışı: ••••</div>
              <div className={styles.memberRow}>Net göç hızı: ••••</div>
            </div>
            <div className={styles.overlay}>
              <strong>İlçe demografik profili</strong>
              <span className={styles.sub}>Ücretsiz üyelikle aç</span>
              <Link href={`/register?callbackUrl=${encodeURIComponent('/deger?' + parcelQuery)}`} className={styles.cta}>Üye Ol</Link>
            </div>
          </div>
        </div>
      ) : null}
```

Dosyanın üstüne, `tl` sabitinin yanına yardımcı ekle:

```typescript
const fmtPerMille = (n: number) => {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toLocaleString('tr-TR')}‰`
}
```

- [ ] **Step 4: CSS ekle**

`DegerKarti.module.css` sonuna (`trendBlock` stilleriyle tutarlı):

```css
.demografiBlock {
  margin-top: 4px;
}

.demografiSummary {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text, #1d1d1f);
  margin: 8px 0;
}

.demografiGrid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demografiSource {
  font-size: 11px;
  color: #94a3b8;
  margin: 8px 0 0;
}
```

Not: `.memberRow`, `.divider`, `.label`, `.trendScope`, `.gatedWrap`, `.blurred`, `.overlay`, `.sub`, `.cta` zaten `DegerKarti.module.css`'te tanımlı — yeniden tanımlama.

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "DegerKarti"`
Expected: tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/deger/DegerKarti.tsx src/components/deger/DegerKarti.module.css src/components/deger/DegerKarti.test.tsx
git commit -m "feat(deger): DegerKarti üye demografi bloğu + anonim blur overlay"
```

---

## Task 11: Final regresyon + doğrulama

**Files:** yok (doğrulama)

- [ ] **Step 1: Tam tsc**

Run: `npx tsc --noEmit` → 0 hata
Run: `npx tsc -p crawler/tsconfig.json` → 0 hata

- [ ] **Step 2: Tam test suite**

Run: `npx jest --no-coverage --roots "$(pwd)/src"` → tüm suite yeşil
Run: `npm run test:crawler` → tüm crawler testleri yeşil

- [ ] **Step 3: Production build**

Run: `npm run build` → temiz (memory: `composes`/lightningcss tuzağı — bu planda `composes` YOK ama build yine de zorunlu). Build sonrası `public/sw.js` dirty olursa `git checkout public/sw.js`.

- [ ] **Step 4: eslint (değişen dosyalar)**

Run: `npx eslint src/lib/demografi/ src/lib/deger/card.ts src/components/deger/DegerKarti.tsx src/app/api/deger/kart/route.ts` → yeni ihlal yok

- [ ] **Step 5: Bulguları not et**

`crawl:tuik` gerçek turu ve prod migration'ı BATCH DEPLOY'a bırakıldı (spec §Ön Koşul). `DistrictDemographics` migration'ı bekleyen migration listesine eklenir. `crawler/tuik/datasets.ts` doldurulmadıysa (Task 1 eksikse) demografi bloğu canlıda hiç görünmez (tablo boş) — bu güvenli bir başlangıç durumu, kart geri kalanı etkilenmez.

- [ ] **Step 6: Final commit (varsa)**

```bash
git add -A
git commit -m "chore(tuik): final regresyon doğrulaması" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- §Veri modeli → Task 3 ✓
- §Crawler `crawler/tuik/` → Task 1 (datasets), Task 5 (parse), Task 6 (upsert), Task 7 (extract+run) ✓
- §Hedeflenen küçük iyileştirme (context helper) → Task 2 ✓
- §Saf lib `src/lib/demografi/` → Task 4 ✓
- §Değer Kartı entegrasyonu (card.ts + anonCardDeps + route'lar + DegerKarti) → Task 8, 9, 10 ✓
- §Hata Yönetimi → Task 7 (dataset fail / hepsi fail), Task 9 (tablo yok → catch null), Task 10 (summary null / eksik metrik) ✓
- §Test Stratejisi → her task'ın TDD adımları + Task 11 regresyon ✓
- §Kapsam dışı → planda hiçbir task mahalle/geçmiş/API/cron/Akif eklemiyor ✓
- §Ön koşul → Task 11 Step 5 ✓
- §Açık teknik kararlar → Task 1 spike bunları kapatır; Task 7 Step 5 NOT'u indirme-tetikleyici esnekliğini adresliyor ✓

**Placeholder scan:** Task 1'in `datasets.ts` iskeleti bilinçli — spike çıktısı doldurur, tip geçerli. Task 9 Step 3 koşullu (mevcut route testi desenine bağlı) — net talimatla. Başka placeholder yok.

**Type consistency:**
- `ParsedDemographicRow` (Task 5) → `mergeRows` girdi tipi (Task 6) → tutarlı `{ il; ilce } & Partial<Record<NumericField, number>>`
- `NumericField` union üç dosyada tekrar tanımlı (parse.ts, upsert.ts) — küçük tekrar, kasıtlı (crawler modülleri izole; paylaşılan tip için `datasets.ts`'e koymak da olurdu ama parse/upsert bağımsız kalsın). Değerler birebir aynı.
- `DistrictDemographicsRecord` (Task 4) alanları = `card.ts` DTO `demographics` sayısal alanları = route `select` alanları — hepsi `population, populationGrowthPerMille, medianAge, avgHouseholdSize, netMigrationPerMille` + `dataYear`. Tutarlı.
- `findDistrictDemographics(il, ilce)` imzası: card.ts arayüzü, route impl, whatsapp impl, card.test fabrikası — hepsi `(il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>`. Tutarlı.
- `runTuikCrawl(deps, opts)` / `RunDeps` / `RunSummary` — Task 7 içinde tanımlı ve tüketiliyor. Tutarlı.

Gap yok. Plan uygulanmaya hazır.
