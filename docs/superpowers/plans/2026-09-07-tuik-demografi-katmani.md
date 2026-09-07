# TÜİK Demografi Katmanı (Alt-proje 6c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Değer Kartı'na (`/deger`), üye kullanıcılara açık, TÜİK ilçe demografi bloğu (çekirdek 4 metrik + tek kural-tabanlı özet cümle) eklemek; veriyi `crawler/tuik/` altında TÜİK SDMX REST API'sinden auth'lu `fetch` ile toplamak.

**Architecture:** Yeni `DistrictDemographics` Prisma modeli (il/ilçe katlanmış anahtar). `crawler/tuik/` ayrı bir crawler giriş noktası — `CrawlRun` takibini + izole tsconfig/jest'i yeniden kullanır, `fetcher/`/Playwright kullanmaz. TÜİK SDMX API'sinden SDMX-CSV çeker, parse eder, il-seviyesi 2 metriği ilin tüm ilçelerine yayar, upsert eder. Saf `src/lib/demografi/` yorum üretir. Değer Kartı entegrasyonu 6a Fiyat Trendi'nin (`priceTrend`) DI + üye-gate + DTO deseninin birebir kopyasıdır.

**Tech Stack:** Next.js 16, Prisma 5 + PostgreSQL, ts-node, Jest + ts-jest. Yeni npm bağımlılığı YOK (SDMX-CSV düz metin, token isteği `fetch` + `URLSearchParams`).

**Spec:** `docs/superpowers/specs/2026-09-07-tuik-demografi-katmani-design.md` (rev 2)

## Global Constraints

- **Metrikler (çekirdek 4):** `population` (Int, ilçe), `populationGrowthPerMille` (Float ‰, ilçe), `medianAge` (Float, İL değeri — ilin tüm ilçelerine kopyalanır), `avgHouseholdSize` (Float, İL değeri). Hepsi nullable. **Net göç YOK.**
- **Erişim:** üye-gated. `findDistrictDemographics` ve DTO `demographics` alanı anonim payload'a HİÇBİR koşulda konmaz. `anonCardDeps.ts`'e eklenmez.
- **Anahtar normalizasyonu:** her il/ilçe anahtarı `normalizeAreaName` (`src/lib/areaPrices/normalizeAreaName.ts`) ile katlanır — `.replace(/İ/g,'I').replace(/ı/g,'i').toUpperCase()`.
- **Veri disiplini:** yarım veri hiç veriden kötü. Bir turda HİÇBİR dataflow çekilemezse (ya da token alınamazsa) hiçbir satır yazılmaz (`districtPrices/data.ts` disiplini). Upsert asla satır SİLMEZ.
- **SDMX API tabanı:** `https://nsiws.tuik.gov.tr/rest`. Token uç noktası: `https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token` (`grant_type=password`, `client_id=nsi-ws-consumer`, `api_key=<TUIK_API_KEY>`). Veri: `GET /rest/data/TR,<DATAFLOW>,<VER>?format=SDMX-CSV&startPeriod=<yıl>&endPeriod=<yıl>` + `Authorization: Bearer <token>`.
- **API Key:** `TUIK_API_KEY` env değişkeni. **KULLANICI sağlar** (Veri Portalı → Kullanıcı Bilgileri → SMS doğrulama → API Key). Task 1, 6, 9 ve gerçek crawl bunu gerektirir; diğer task'lar gerektirmez.
- **Dal:** `codex/professional-ui-and-land-cost` üzerinde doğrudan (origin'de yok, worktree yok — `feedback_agent_tool_isolation_worktree`).
- **Commit:** her task sonunda. Mesaj sonu:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` +
  `Claude-Session: https://claude.ai/code/session_012nxvgsmnSrESr8pDggxUBi`
- **Jest (app):** `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "<pattern>"`
- **Jest (crawler):** `npm run test:crawler -- --testPathPatterns "<pattern>"`
- **Regresyon:** `npx tsc --noEmit` + `npx tsc -p crawler/tsconfig.json` + app jest + `npm run test:crawler` + `npm run build` — hepsi temiz.

---

## Task 1: API Key + SDMX introspection → `datasets.ts` + `areaCodesData.ts` + FINDINGS

**API Key gerektirir. Dispatch edilen subagent'la DEĞİL — controller (kullanıcı `TUIK_API_KEY`'i verdikten sonra) veya kullanıcı doğrudan yapar.** Çıktısı olmadan Task 6 ve Task 9 tamamlanamaz.

**Files:**
- Create: `crawler/tuik/datasets.ts`
- Create: `crawler/tuik/areaCodesData.ts` (üretilmiş ham harita — REF_AREA kodu → il/ilçe adı)
- Create: `crawler/tuik/FINDINGS.md`
- Create: `crawler/tuik/fixtures/` (bir gerçek SDMX-CSV örneği, PII yok — kamuya açık toplam istatistik)

**Interfaces:**
- Produces:
  - `DATAFLOWS: DataflowRef[]` — 4 dataflow'un id + versiyon + `field` (model alanı) + `level` (`'il'` | `'ilce'`) + `keyTemplate` (gösterge/cinsiyet boyutları için sabit değerler)
  - `DATA_YEAR: number`
  - `TOKEN_URL`, `DATA_BASE` sabitleri
  - `AREA_CODES: Record<string, { il: string; ilce: string | null }>` (areaCodesData.ts) — Task 6 tüketir
  - Task 5 (`parse.ts`), Task 6 (`areaCodes.ts`), Task 9 (`run.ts`) tüketir

- [ ] **Step 1: Token al ve sakla (elle, curl)**

```bash
curl -s -X POST "https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data "grant_type=password" --data "client_id=nsi-ws-consumer" \
  --data "api_key=$TUIK_API_KEY" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])"
```
Dönen `access_token`'ı bir kabuk değişkenine al: `TOKEN=<...>`.

- [ ] **Step 2: 4 dataflow'un versiyon + DSD yapısını doğrula**

Her biri için (`DF_ADNKS_T22`, `DF_ADNKS_T38`, `DF_ADNKS_T23`, `DF_ADNKS_T25`):

```bash
curl -s "https://nsiws.tuik.gov.tr/rest/dataflow/TR/DF_ADNKS_T22/latest?references=descendants" \
  --header "Authorization: Bearer $TOKEN" > /tmp/t22.xml
```
XML'den not et: `Dataflow version` (ör. `1.1`), bağlı `DSD` id + versiyon, DSD'nin **boyut sırası** (seri anahtarı şablonu — hangi pozisyon `REF_AREA`, hangisi gösterge/`CINSIYET`/`YAS_GRUBU` vb.), ve `REF_AREA` boyutunun bağlı olduğu **kod listesi** adı+versiyonu.

- [ ] **Step 3: REF_AREA kod listesini indir**

Step 2'de bulunan kod listesi adıyla (ör. `CL_ADRESSEL_KONUM` / `CL_IL_ILCE`):

```bash
curl -s "https://nsiws.tuik.gov.tr/rest/codelist/TR/<CL_ADI>/<VER>" \
  --header "Authorization: Bearer $TOKEN" > /tmp/areas.xml
```
Bu XML'de her kod için `id` + Türkçe `Name` + parent ilişkisi var. İl kodları (81) ve ilçe kodları (~970) ile bunların Türkçe adları buradan çıkar.

- [ ] **Step 4: Bir gerçek veri örneği çek (fixture)**

```bash
curl -s "https://nsiws.tuik.gov.tr/rest/data/TR,DF_ADNKS_T22,1.1?format=SDMX-CSV&startPeriod=2024&endPeriod=2024" \
  --header "Authorization: Bearer $TOKEN" > crawler/tuik/fixtures/adnks-t22-2024.csv
```
Dosyanın ilk ~15 satırını incele: sütun başlıkları (`DATAFLOW`, `REF_AREA`, `TIME_PERIOD`, `OBS_VALUE`, …), ondalık ayıracı, `REF_AREA` değer formatı, il-toplamı satırları nasıl ayırt ediliyor (REF_AREA kodunun uzunluğu / seviye).

- [ ] **Step 5: `FINDINGS.md` yaz**

Her dataflow için: doğrulanmış versiyon, DSD id+ver, seri anahtarı şablonu (boyut sırası), `REF_AREA` dışı boyutlar için seçilecek sabit değer (`medianAge` T23'te `CINSIYET=_T` toplam), `level` (T22/T38 ilçe, T23/T25 il). SDMX-CSV sütun düzeni + ondalık ayıracı. Kod listesi adı/versiyonu. Token TTL gözlemi.

- [ ] **Step 6: `areaCodesData.ts` yaz (üretilmiş harita)**

Step 3 XML'inden türet — script veya elle:

```typescript
// crawler/tuik/areaCodesData.ts
// TÜİK CL_<...>/<ver> kod listesinden üretildi (Task 1). Yıllık tazelemede
// yeni ilçe eklenirse burası güncellenir (areaCodes.ts'in resolveArea'sı
// bilinmeyen kodu null döndürüp CrawlRun.notes'a sayar).
export const AREA_CODES: Record<string, { il: string; ilce: string | null }> = {
  // "TR_IL_34": { il: "İstanbul", ilce: null },
  // "TR_ILCE_3401": { il: "İstanbul", ilce: "Adalar" },
  // ... Step 3'ten doldur
}
```

- [ ] **Step 7: `datasets.ts` yaz**

```typescript
// crawler/tuik/datasets.ts
export const TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token'
export const DATA_BASE = 'https://nsiws.tuik.gov.tr/rest/data/TR'

export type DemographicField =
  | 'population'
  | 'populationGrowthPerMille'
  | 'medianAge'
  | 'avgHouseholdSize'

export interface DataflowRef {
  key: string            // kısa ad — log / CrawlRun.notes
  dataflow: string       // "DF_ADNKS_T22"
  version: string        // Task 1 Step 2'den doğrulanmış — ör. "1.1"
  field: DemographicField
  level: 'il' | 'ilce'
  /** REF_AREA dışı boyutlar için sabit filtre (seri anahtarı sırasına göre,
   *  REF_AREA ve TIME_PERIOD hariç). Ör. medyan yaş T23 için { CINSIYET: '_T' }.
   *  Task 1 Step 2 DSD sırasına göre doldurulur. */
  keyDimensions: Record<string, string>
}

export const DATA_YEAR = 2024  // Task 1'de en güncel tam yıl doğrulanır

export const DATAFLOWS: DataflowRef[] = [
  // Task 1 Step 2/5 FINDINGS'e göre doldur. İskelet:
  // { key: 'population', dataflow: 'DF_ADNKS_T22', version: '1.1',
  //   field: 'population', level: 'ilce', keyDimensions: {} },
  // { key: 'growth', dataflow: 'DF_ADNKS_T38', version: '1.1',
  //   field: 'populationGrowthPerMille', level: 'ilce', keyDimensions: {} },
  // { key: 'medianAge', dataflow: 'DF_ADNKS_T23', version: '1.1',
  //   field: 'medianAge', level: 'il', keyDimensions: { CINSIYET: '_T' } },
  // { key: 'household', dataflow: 'DF_ADNKS_T25', version: '1.1',
  //   field: 'avgHouseholdSize', level: 'il', keyDimensions: {} },
]
```

- [ ] **Step 8: Doğrula + commit**

`npx tsc -p crawler/tsconfig.json` temiz (DATAFLOWS boş olsa da tip geçerli). FINDINGS.md tüm Step 2/5 sorularını yanıtlıyor mu kontrol et.

```bash
git add crawler/tuik/datasets.ts crawler/tuik/areaCodesData.ts crawler/tuik/FINDINGS.md crawler/tuik/fixtures/
git commit -m "feat(tuik): SDMX introspection — datasets.ts + areaCodesData.ts + FINDINGS"
```

---

## Task 1b: API-Key sonrası doldurma + crawl sertleştirme

> **Bağlam:** Tasks 2–13 API Key'siz tamamlandı ve merge edildi. `datasets.ts`
> `DATAFLOWS: []`, `areaCodesData.ts` `AREA_CODES: {}` — iskele. `crawl:tuik` bu
> hâlde `main()`'de erken çıkar (kod inert). Bu task, `TUIK_API_KEY` geldikten
> sonra crawler'ı gerçekten çalışabilir hâle getirir. Final whole-branch
> review'un (2026-09-07) crawl-öncesi zorunlulukları da buraya toplandı.

**API Key GEREKİR.** Öncesinde Task 1 Step 1–7 (SDMX introspection) yapılmış olmalı.

- [ ] **1b.1 — `DATAFLOWS` + `AREA_CODES` doldur** (Task 1 Step 6/7 çıktısı).
  `npx tsc -p crawler/tsconfig.json` temiz.

- [ ] **1b.2 — `crawler/__tests__/tuik/areaCodes.test.ts`'e "bilinen kod" testlerini ekle.**
  Task 6'da `AREA_CODES` boş olduğu için ertelenen 2 test (bilinen ilçe kodu →
  il+ilçe; bilinen il kodu → il, ilce null). Artık gerçek koddan biriyle yazılır.

- [ ] **1b.3 — `fetchData.ts` `keyPart` birleştirmesini gerçek DSD'ye karşı doğrula
  (review I7).** Bir gerçek filtreli seri anahtarını elle curl et
  (`{CINSIYET:'_T'}` → DSD `(REF_AREA, CINSIYET)` ise `/._T` olmalı, `/_T` değil).
  Gerekiyorsa `keyPart` birleştirmesini DSD boyut sırasına göre düzelt (obje anahtar
  sırası DEĞİL). `crawler/__tests__/tuik/fetchData.test.ts` ekle: URL şekli,
  `Authorization: Bearer`, non-ok → throw.

- [ ] **1b.4 — Çözülemeyen REF_AREA sayacı (review I1).** `mergeDemographics` bir
  `unresolvedCodes: number` (+ birkaç örnek kod) döndürsün ya da out-param'la yazsın.
  `run.ts` `RunSummary`'ye `unresolved` + `mergedRows` ekle; `CrawlRun.notes` JSON'una
  koy. **Gerekçe:** `AREA_CODES` eksik/bozuksa tur "sağlıklı" görünür
  (`blocked:false`, `listingsFound` dolu, `upserted:0`) — sayaç bunu görünür yapar.

- [ ] **1b.5 — Dry-run gözlemlenebilirliği (review I2).** `RunSummary.mergedRows`
  (1b.4) `main()`'de loglanır. Dry-run çıktısı, hiçbir kod çözülmeyen bir turla
  çözülen bir turu ayırt edebilmeli.

- [ ] **1b.6 — `timePeriod === DATA_YEAR` filtresi (review I5).** `mergeDemographics`
  her iki fazda `obs.timePeriod` yılını `DATA_YEAR` ile karşılaştırıp eşleşmeyeni
  atsın (yılı parametre olarak geçir ya da `run.ts`'te merge öncesi filtrele).
  Ayrıca `byIl` üzerine yazma çakışmasını say (`if (byIl.has(k)) { conflicts++; ... }`)
  ve `notes`'a koy. **Gerekçe:** kart her değeri "Kaynak: TÜİK {dataYear}" diye
  etiketliyor — startPeriod/endPeriod filtresi kaçarsa etiket yalan olur.

- [ ] **1b.7 — Token-fail testinde `blocked:true` yazımını doğrula (Task 9 ertelenen
  minor).** `run.test.ts`'te token-fail senaryosu `crawlRunClient.crawlRun.update`'in
  `blocked:true` + `notes: auth failed…` ile çağrıldığını assert etsin (spec design
  satır 242-243).

- [ ] **1b.8 — Boş-gövde dataflow → `dataflowsFailed` (review Minor).** `run.ts`
  HTTP 200 + boş gövde döndüren dataflow'u da `failed`/`empty` listesine alsın (spec
  satır 245 "4xx/5xx / boş döndü" ikisini birlikte istiyor).

- [ ] **1b.9 — Prod migration + ilk gerçek crawl.**
  `npx prisma migrate deploy` (prod DB), `npx prisma migrate status` → up to date.
  Coolify env'e `TUIK_API_KEY` ekle. `npm run crawl:tuik -- --dry-run` → yeni sayaçları
  OKU (1b.4/1b.5). Temizse `npm run crawl:tuik`. `CrawlRun.notes`'u doğrula.

- [ ] **1b.10 — I8: anonim demografi teaser'ı vs boş tablo.** `DegerKarti.tsx`'in
  anonim demografi teaser'ı (`Bölge Demografisi` blur + "Üye Ol") HER anonim
  ziyaretçiye görünüyor — tablo boşken kayıt olan kullanıcı hiçbir şey görmez.
  **Ya** deploy sırasını garanti et (migration + ilk `crawl:tuik` başarılı → SONRA
  teaser prod'a) **ya da** teaser'ı ucuz bir "herhangi bir satır var mı" sinyaline /
  build flag'e bağla. Prod deploy'dan önce KARAR verilmeli.

---

## Task 2: `crawler/tuik/auth.ts` — access token

**API Key GEREKMEZ (mock'lu test).**

**Files:**
- Create: `crawler/tuik/auth.ts`
- Test: `crawler/__tests__/tuik/auth.test.ts`

**Interfaces:**
- Consumes: `TOKEN_URL` (Task 1)
- Produces: `getAccessToken(deps: { fetch: typeof fetch; apiKey: string }) => Promise<string>` — Task 9 tüketir

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/tuik/auth.test.ts
import { getAccessToken } from '../../tuik/auth'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response
}

describe('getAccessToken', () => {
  it('token uç noktasına password grant + api_key gönderir, access_token döner', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return jsonResponse({ access_token: 'tok-123', expires_in: 300 })
    }) as unknown as typeof fetch

    const token = await getAccessToken({ fetch: fakeFetch, apiKey: 'KEY-abc' })

    expect(token).toBe('tok-123')
    expect(calls[0].url).toContain('/realms/web/protocol/openid-connect/token')
    const body = String(calls[0].init?.body)
    expect(body).toContain('grant_type=password')
    expect(body).toContain('client_id=nsi-ws-consumer')
    expect(body).toContain('api_key=KEY-abc')
  })

  it('non-200 → anlamlı hata fırlatır', async () => {
    const fakeFetch = (async () => jsonResponse({ error: 'invalid_grant' }, false, 401)) as unknown as typeof fetch
    await expect(getAccessToken({ fetch: fakeFetch, apiKey: 'bad' })).rejects.toThrow(/token alınamadı|401/i)
  })

  it('yanıtta access_token yoksa → hata fırlatır', async () => {
    const fakeFetch = (async () => jsonResponse({ expires_in: 300 })) as unknown as typeof fetch
    await expect(getAccessToken({ fetch: fakeFetch, apiKey: 'x' })).rejects.toThrow(/access_token/i)
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/auth"`
Expected: FAIL — modül yok.

- [ ] **Step 3: `auth.ts` yaz**

```typescript
// crawler/tuik/auth.ts
import { TOKEN_URL } from './datasets'

export async function getAccessToken(deps: { fetch: typeof fetch; apiKey: string }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'nsi-ws-consumer',
    api_key: deps.apiKey,
  })
  const res = await deps.fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`TÜİK token alınamadı (HTTP ${res.status})`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('TÜİK token yanıtında access_token yok')
  }
  return json.access_token
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/auth"` → 3 test PASS.
`npx tsc -p crawler/tsconfig.json` temiz.

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/auth.ts crawler/__tests__/tuik/auth.test.ts
git commit -m "feat(tuik): SDMX access token (getAccessToken)"
```

---

## Task 3: `DistrictDemographics` modeli + migration

**API Key GEREKMEZ.**

**Files:**
- Modify: `prisma/schema.prisma` (yeni model, `AkifTurnLog` sonrası)
- Create: `prisma/migrations/20260907130000_add_district_demographics/migration.sql`

**Interfaces:**
- Produces: `prisma.districtDemographics` modeli; `il_ilce` compound unique. Task 8, 10, 11 tüketir.

- [ ] **Step 1: Modeli `schema.prisma`'ya ekle**

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
  source                   String
  fetchedAt                DateTime
  updatedAt                DateTime @updatedAt

  @@unique([il, ilce])
  @@index([il])
}
```

- [ ] **Step 2: Migration SQL yaz**

```sql
-- prisma/migrations/20260907130000_add_district_demographics/migration.sql
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

Run: `npm run dev:db` (container ayakta olmalı) → `npx prisma migrate deploy` → `npx prisma migrate status` ("up to date") → `npx prisma generate`.
Windows'ta `generate` EPERM verirse kilitleyen süreçleri kapat, tekrar dene.

- [ ] **Step 4: tsc**

Run: `npx tsc --noEmit` → temiz (model henüz kullanılmıyor).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260907130000_add_district_demographics/
git commit -m "feat(db): DistrictDemographics modeli + migration (ilçe demografi, 4 metrik)"
```

---

## Task 4: `src/lib/demografi/` — types + summarize

**API Key GEREKMEZ.**

**Files:**
- Create: `src/lib/demografi/types.ts`
- Create: `src/lib/demografi/summarize.ts`
- Test: `src/lib/demografi/summarize.test.ts`

**Interfaces:**
- Produces:
  - `DistrictDemographicsRecord` — `{ dataYear: number; population: number | null; populationGrowthPerMille: number | null; medianAge: number | null; avgHouseholdSize: number | null }`
  - `DemographicsSummary` — `{ sentence: string | null }`
  - `summarizeDemographics(rec: DistrictDemographicsRecord) => DemographicsSummary`
  - Task 10 (`card.ts`) tüketir.

- [ ] **Step 1: `types.ts` yaz**

```typescript
// src/lib/demografi/types.ts
export interface DistrictDemographicsRecord {
  dataYear: number
  population: number | null
  populationGrowthPerMille: number | null
  medianAge: number | null
  avgHouseholdSize: number | null
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
  population: 300_000,
  populationGrowthPerMille: 0,
  medianAge: 35,
  avgHouseholdSize: 3.2,
}

describe('summarizeDemographics', () => {
  it('artış ≥ +10‰ → nüfus belirgin büyüyor', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 14 })
    expect(r.sentence).toBe('Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.')
  })

  it('artış ≤ −10‰ → nüfus hızla azalıyor', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: -12 })
    expect(r.sentence).toBe('Nüfus hızla azalıyor — konut talebi zayıf olabilir.')
  })

  it('−10‰ < artış < +10‰ → durağan', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3 })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok.')
  })

  it('medyan yaş ≤ 32 → genç nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3, medianAge: 29 })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok. Genç nüfus yapısı.')
  })

  it('medyan yaş ≥ 40 → yaşlanan nüfus eki', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 14, medianAge: 43 })
    expect(r.sentence).toBe('Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü. Yaşlanan nüfus.')
  })

  it('medyan yaş null → yaş eki yok', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: 3, medianAge: null })
    expect(r.sentence).toBe('Nüfus görece durağan; belirgin bir demografik baskı yok.')
  })

  it('artış null → sentence null', () => {
    const r = summarizeDemographics({ ...base, populationGrowthPerMille: null })
    expect(r.sentence).toBeNull()
  })
})
```

- [ ] **Step 3: Test'i çalıştır, FAIL gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "demografi/summarize"`
Expected: FAIL — modül yok.

- [ ] **Step 4: `summarize.ts` yaz**

```typescript
// src/lib/demografi/summarize.ts
import type { DistrictDemographicsRecord, DemographicsSummary } from './types'

export function summarizeDemographics(rec: DistrictDemographicsRecord): DemographicsSummary {
  const g = rec.populationGrowthPerMille
  if (g == null) return { sentence: null }

  let sentence: string
  if (g >= 10) {
    sentence = 'Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.'
  } else if (g <= -10) {
    sentence = 'Nüfus hızla azalıyor — konut talebi zayıf olabilir.'
  } else {
    sentence = 'Nüfus görece durağan; belirgin bir demografik baskı yok.'
  }

  const age = rec.medianAge
  if (age != null && age <= 32) sentence += ' Genç nüfus yapısı.'
  else if (age != null && age >= 40) sentence += ' Yaşlanan nüfus.'

  return { sentence }
}
```

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "demografi/summarize"` → 7 test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/demografi/
git commit -m "feat(demografi): DistrictDemographicsRecord tipi + summarizeDemographics"
```

---

## Task 5: `crawler/tuik/parse.ts` — SDMX-CSV parser

**API Key GEREKMEZ (fixture'lı test). Task 1'e bağlı DEĞİL — SDMX-CSV formatı standart.**

**Files:**
- Create: `crawler/tuik/parse.ts`
- Test: `crawler/__tests__/tuik/parse.test.ts`

**Interfaces:**
- Produces:
  - `SdmxObservation` — `{ refArea: string; timePeriod: string; value: number }`
  - `parseSdmxCsv(csvText: string) => SdmxObservation[]`
  - Task 9 (`run.ts`) tüketir.

- [ ] **Step 1: Failing test yaz**

SDMX-CSV standardı: ilk satır başlık, `REF_AREA` / `TIME_PERIOD` / `OBS_VALUE` sütunları (artı boyut sütunları). Değerler tırnak içinde olabilir, ondalık `.`.

```typescript
// crawler/__tests__/tuik/parse.test.ts
import { parseSdmxCsv, type SdmxObservation } from '../../tuik/parse'

describe('parseSdmxCsv', () => {
  it('REF_AREA / TIME_PERIOD / OBS_VALUE sütunlarını çıkarır', () => {
    const csv = [
      'DATAFLOW,REF_AREA,TIME_PERIOD,OBS_VALUE,UNIT_MULT',
      'TR:DF_ADNKS_T22(1.1),TR_ILCE_3401,2024,17550,0',
      'TR:DF_ADNKS_T22(1.1),TR_ILCE_3402,2024,742102,0',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual<SdmxObservation[]>([
      { refArea: 'TR_ILCE_3401', timePeriod: '2024', value: 17550 },
      { refArea: 'TR_ILCE_3402', timePeriod: '2024', value: 742102 },
    ])
  })

  it('ondalık OBS_VALUE parse eder (medyan yaş / hane)', () => {
    const csv = ['REF_AREA,TIME_PERIOD,OBS_VALUE', 'TR_IL_61,2024,"36.4"'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_IL_61', timePeriod: '2024', value: 36.4 }])
  })

  it('boş / sayısal olmayan OBS_VALUE satırını atlar', () => {
    const csv = [
      'REF_AREA,TIME_PERIOD,OBS_VALUE',
      'TR_ILCE_3401,2024,',
      'TR_ILCE_3402,2024,NaN',
      'TR_ILCE_3403,2024,123',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_ILCE_3403', timePeriod: '2024', value: 123 }])
  })

  it('sütun sırası farklıysa başlığa göre çözer', () => {
    const csv = ['OBS_VALUE,TIME_PERIOD,REF_AREA', '999,2024,TR_ILCE_0101'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_ILCE_0101', timePeriod: '2024', value: 999 }])
  })

  it('boş gövde → boş dizi', () => {
    expect(parseSdmxCsv('REF_AREA,TIME_PERIOD,OBS_VALUE\n')).toEqual([])
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/parse"` → FAIL, modül yok.

- [ ] **Step 3: `parse.ts` yaz**

```typescript
// crawler/tuik/parse.ts
export interface SdmxObservation {
  refArea: string
  timePeriod: string
  value: number
}

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

const unquote = (s: string) => s.trim().replace(/^"|"$/g, '').trim()

export function parseSdmxCsv(csvText: string): SdmxObservation[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const header = splitCsvLine(lines[0]).map(unquote)
  const iArea = header.indexOf('REF_AREA')
  const iTime = header.indexOf('TIME_PERIOD')
  const iVal = header.indexOf('OBS_VALUE')
  if (iArea < 0 || iTime < 0 || iVal < 0) {
    throw new Error(`SDMX-CSV başlığında REF_AREA/TIME_PERIOD/OBS_VALUE eksik: ${header.join(',')}`)
  }

  const out: SdmxObservation[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const refArea = unquote(cells[iArea] ?? '')
    const timePeriod = unquote(cells[iTime] ?? '')
    const raw = unquote(cells[iVal] ?? '')
    if (!refArea || !raw) continue
    const value = Number(raw)
    if (!Number.isFinite(value)) continue
    out.push({ refArea, timePeriod, value })
  }
  return out
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/parse"` → 5 test PASS.

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/parse.ts crawler/__tests__/tuik/parse.test.ts
git commit -m "feat(tuik): SDMX-CSV parser (parseSdmxCsv)"
```

---

## Task 6: `crawler/tuik/areaCodes.ts` — resolveArea

**Task 1'in `areaCodesData.ts`'ine bağlı. API Key gerektirmez ama Task 1 tamamlanmış olmalı.**

**Files:**
- Create: `crawler/tuik/areaCodes.ts`
- Test: `crawler/__tests__/tuik/areaCodes.test.ts`

**Interfaces:**
- Consumes: `AREA_CODES` (Task 1, `areaCodesData.ts`)
- Produces:
  - `ResolvedArea` — `{ il: string; ilce: string | null }`
  - `resolveArea(refAreaCode: string) => ResolvedArea | null`
  - Task 7 (`merge.ts`) tüketir.

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/tuik/areaCodes.test.ts
import { resolveArea } from '../../tuik/areaCodes'
import { AREA_CODES } from '../../tuik/areaCodesData'

describe('resolveArea', () => {
  it('bilinen ilçe kodu → il + ilçe', () => {
    // areaCodesData.ts gerçek doldurulduğunda ilk gerçek koddan birini kullan.
    // Test dosyası AREA_CODES'tan bilinen bir kayıt çeker (kırılganlık önlenir).
    const [code, expected] = Object.entries(AREA_CODES).find(([, v]) => v.ilce != null)!
    expect(resolveArea(code)).toEqual(expected)
  })

  it('bilinen il kodu → il, ilce null', () => {
    const [code, expected] = Object.entries(AREA_CODES).find(([, v]) => v.ilce == null)!
    expect(resolveArea(code)).toEqual(expected)
  })

  it('bilinmeyen kod → null', () => {
    expect(resolveArea('TR_ILCE_ZZZZ')).toBeNull()
  })

  it('boş / whitespace kod → null', () => {
    expect(resolveArea('')).toBeNull()
    expect(resolveArea('  ')).toBeNull()
  })
})
```

> **NOT:** Task 1 `areaCodesData.ts`'i doldurmadıysa (`AREA_CODES` boş), ilk iki
> test `undefined` destructuring'de patlar. Bu, Task 1'in tamamlanması gereken
> bir bağımlılık — Task 1 boşsa bu task'ı başlatma.

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/areaCodes"` → FAIL, modül yok.

- [ ] **Step 3: `areaCodes.ts` yaz**

```typescript
// crawler/tuik/areaCodes.ts
import { AREA_CODES } from './areaCodesData'

export interface ResolvedArea {
  il: string
  ilce: string | null
}

export function resolveArea(refAreaCode: string): ResolvedArea | null {
  const code = refAreaCode.trim()
  if (!code) return null
  return AREA_CODES[code] ?? null
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/areaCodes"` → 4 test PASS.

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/areaCodes.ts crawler/__tests__/tuik/areaCodes.test.ts
git commit -m "feat(tuik): REF_AREA kodu → il/ilçe çözümleme (resolveArea)"
```

---

## Task 7: `crawler/tuik/merge.ts` — gözlemleri birleştir + il-yayılımı

**API Key GEREKMEZ.**

**Files:**
- Create: `crawler/tuik/merge.ts`
- Test: `crawler/__tests__/tuik/merge.test.ts`

**Interfaces:**
- Consumes: `SdmxObservation` (Task 5); `resolveArea`, `ResolvedArea` (Task 6); `DataflowRef`, `DemographicField` (Task 1); `normalizeAreaName` (`@/lib/areaPrices/normalizeAreaName`)
- Produces:
  - `MergedDistrictRow` — `{ il: string; ilce: string } & Partial<Record<DemographicField, number>>`
  - `DataflowResult` — `{ ref: DataflowRef; observations: SdmxObservation[] }`
  - `mergeDemographics(results: DataflowResult[], resolve: (code: string) => ResolvedArea | null) => MergedDistrictRow[]`
  - Task 9 (`run.ts`) tüketir.

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/tuik/merge.test.ts
import { mergeDemographics, type DataflowResult } from '../../tuik/merge'
import type { ResolvedArea } from '../../tuik/areaCodes'

const RES: Record<string, ResolvedArea> = {
  IL_TRABZON: { il: 'Trabzon', ilce: null },
  ILCE_ORTAHISAR: { il: 'Trabzon', ilce: 'Ortahisar' },
  ILCE_AKCAABAT: { il: 'Trabzon', ilce: 'Akçaabat' },
  ILCE_ISTANBUL_SISLI: { il: 'İstanbul', ilce: 'Şişli' },
}
const resolve = (code: string) => RES[code] ?? null

const dfRef = (key: string, field: any, level: 'il' | 'ilce') => ({
  key, dataflow: key, version: '1.1', field, level, keyDimensions: {},
})

describe('mergeDemographics', () => {
  it('ilçe-seviyesi gözlemler ilçe satırına yazılır', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('population', 'population', 'ilce'),
      observations: [
        { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
        { refArea: 'ILCE_AKCAABAT', timePeriod: '2024', value: 130000 },
      ],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000 },
      { il: 'TRABZON', ilce: 'AKÇAABAT', population: 130000 },
    ])
  })

  it('il-seviyesi gözlem, o ilin TÜM (mevcut) ilçelerine yayılır', () => {
    const results: DataflowResult[] = [
      {
        ref: dfRef('population', 'population', 'ilce'),
        observations: [
          { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
          { refArea: 'ILCE_AKCAABAT', timePeriod: '2024', value: 130000 },
        ],
      },
      {
        ref: dfRef('medianAge', 'medianAge', 'il'),
        observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
      },
    ]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 },
      { il: 'TRABZON', ilce: 'AKÇAABAT', population: 130000, medianAge: 36.4 },
    ])
  })

  it('il-seviyesi gözlem, o ilde HİÇ ilçe satırı yoksa satır üretmez (sızıntı yok)', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('medianAge', 'medianAge', 'il'),
      observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([])
  })

  it('çözülemeyen REF_AREA kodu atlanır', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('population', 'population', 'ilce'),
      observations: [
        { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
        { refArea: 'BILINMEYEN', timePeriod: '2024', value: 999 },
      ],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000 },
    ])
  })

  it('il-seviyesi gözlem yalnızca kendi ilinin ilçelerine yayılır', () => {
    const results: DataflowResult[] = [
      {
        ref: dfRef('population', 'population', 'ilce'),
        observations: [
          { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
          { refArea: 'ILCE_ISTANBUL_SISLI', timePeriod: '2024', value: 270000 },
        ],
      },
      {
        ref: dfRef('medianAge', 'medianAge', 'il'),
        observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
      },
    ]
    const rows = mergeDemographics(results, resolve)
    expect(rows.find((r) => r.ilce === 'ORTAHISAR')!.medianAge).toBe(36.4)
    expect(rows.find((r) => r.ilce === 'ŞİŞLİ')!.medianAge).toBeUndefined()
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/merge"` → FAIL, modül yok.

- [ ] **Step 3: `merge.ts` yaz**

```typescript
// crawler/tuik/merge.ts
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { SdmxObservation } from './parse'
import type { ResolvedArea } from './areaCodes'
import type { DataflowRef, DemographicField } from './datasets'

export type MergedDistrictRow = { il: string; ilce: string } & Partial<Record<DemographicField, number>>

export interface DataflowResult {
  ref: DataflowRef
  observations: SdmxObservation[]
}

export function mergeDemographics(
  results: DataflowResult[],
  resolve: (code: string) => ResolvedArea | null,
): MergedDistrictRow[] {
  const rows = new Map<string, MergedDistrictRow>()
  const key = (il: string, ilce: string) => `${il} ${ilce}`

  // 1. Önce tüm ilçe-seviyesi gözlemler — ilçe satırlarını oluşturur.
  for (const { ref, observations } of results) {
    if (ref.level !== 'ilce') continue
    for (const obs of observations) {
      const area = resolve(obs.refArea)
      if (!area || area.ilce == null) continue
      const il = normalizeAreaName(area.il)
      const ilce = normalizeAreaName(area.ilce)
      const row = rows.get(key(il, ilce)) ?? { il, ilce }
      row[ref.field] = obs.value
      rows.set(key(il, ilce), row)
    }
  }

  // 2. İl-seviyesi gözlemler — o ilin MEVCUT ilçe satırlarına yayılır (yeni satır AÇMAZ).
  for (const { ref, observations } of results) {
    if (ref.level !== 'il') continue
    const byIl = new Map<string, number>()
    for (const obs of observations) {
      const area = resolve(obs.refArea)
      if (!area) continue
      byIl.set(normalizeAreaName(area.il), obs.value)
    }
    for (const row of rows.values()) {
      const v = byIl.get(row.il)
      if (v !== undefined) row[ref.field] = v
    }
  }

  return [...rows.values()]
}
```

- [ ] **Step 4: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/merge"` → 5 test PASS.
`npx tsc -p crawler/tsconfig.json` temiz.

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/merge.ts crawler/__tests__/tuik/merge.test.ts
git commit -m "feat(tuik): gözlem birleştirme + il-seviyesi metrik yayılımı (mergeDemographics)"
```

---

## Task 8: `crawler/tuik/upsert.ts` — DistrictDemographics upsert

**API Key GEREKMEZ (mock client). Task 3 (model) tamamlanmış olmalı.**

**Files:**
- Create: `crawler/tuik/upsert.ts`
- Test: `crawler/__tests__/tuik/upsert.test.ts`

**Interfaces:**
- Consumes: `MergedDistrictRow` (Task 7); `DemographicField` (Task 1)
- Produces:
  - `DemographicsUpsertClient` — `{ districtDemographics: { upsert(args: unknown): Promise<unknown> } }`
  - `upsertDistrictDemographics(client, rows: MergedDistrictRow[], meta: { dataYear: number; source: string; fetchedAt: Date }) => Promise<number>` (yazılan satır sayısı)
  - Task 9 (`run.ts`) tüketir.

- [ ] **Step 1: Failing test yaz**

```typescript
// crawler/__tests__/tuik/upsert.test.ts
import { upsertDistrictDemographics, type DemographicsUpsertClient } from '../../tuik/upsert'

describe('upsertDistrictDemographics', () => {
  const meta = { dataYear: 2024, source: 'tuik-adnks-sdmx', fetchedAt: new Date('2026-09-07T00:00:00Z') }

  it('her satır için upsert çağırır; create ve update aynı metrik alanlarını yazar; sayı döner', async () => {
    const calls: any[] = []
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async (a: any) => { calls.push(a); return {} } },
    }
    const n = await upsertDistrictDemographics(
      client,
      [{ il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 }],
      meta,
    )
    expect(n).toBe(1)
    expect(calls[0].where).toEqual({ il_ilce: { il: 'TRABZON', ilce: 'ORTAHISAR' } })
    expect(calls[0].create).toMatchObject({
      il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4,
      populationGrowthPerMille: null, avgHouseholdSize: null,
      dataYear: 2024, source: 'tuik-adnks-sdmx',
    })
    expect(calls[0].update).toMatchObject({
      population: 320000, medianAge: 36.4, populationGrowthPerMille: null, avgHouseholdSize: null, dataYear: 2024,
    })
    expect(calls[0].update.il).toBeUndefined()  // anahtar sabit
  })

  it('eksik metrik → null yazılır (eski değeri temizler)', async () => {
    const calls: any[] = []
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async (a: any) => { calls.push(a); return {} } },
    }
    await upsertDistrictDemographics(client, [{ il: 'X', ilce: 'Y', population: 5 }], meta)
    expect(calls[0].update.medianAge).toBeNull()
    expect(calls[0].update.avgHouseholdSize).toBeNull()
    expect(calls[0].update.populationGrowthPerMille).toBeNull()
  })

  it('boş liste → 0, hiç upsert yok', async () => {
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async () => { throw new Error('çağrılmamalı') } },
    }
    expect(await upsertDistrictDemographics(client, [], meta)).toBe(0)
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/upsert"` → FAIL, modül yok.

- [ ] **Step 3: `upsert.ts` yaz**

```typescript
// crawler/tuik/upsert.ts
import type { MergedDistrictRow } from './merge'
import type { DemographicField } from './datasets'

const FIELDS: DemographicField[] = [
  'population',
  'populationGrowthPerMille',
  'medianAge',
  'avgHouseholdSize',
]

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
    const metrics: Record<string, number | null> = {}
    for (const f of FIELDS) metrics[f] = typeof row[f] === 'number' ? (row[f] as number) : null

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

- [ ] **Step 5: Commit**

```bash
git add crawler/tuik/upsert.ts crawler/__tests__/tuik/upsert.test.ts
git commit -m "feat(tuik): DistrictDemographics upsert (UPSERT, silme yok, eksik metrik→null)"
```

---

## Task 9: `crawler/tuik/fetchData.ts` + `run.ts` + `crawl:tuik` scripti + README

**API Key gerçek turda gerekir. `run.ts` orchestration testi mock'lu (key gerekmez). Task 1, 2, 5, 6, 7, 8 tamamlanmış olmalı.**

**Files:**
- Create: `crawler/tuik/fetchData.ts`
- Create: `crawler/tuik/run.ts`
- Create: `crawler/tuik/README.md`
- Modify: `package.json` (`crawl:tuik` scripti)
- Test: `crawler/__tests__/tuik/run.test.ts`

**Interfaces:**
- Consumes: `getAccessToken` (Task 2); `DATAFLOWS`, `DATA_YEAR`, `DATA_BASE` (Task 1); `parseSdmxCsv` (Task 5); `resolveArea` (Task 6); `mergeDemographics`, `DataflowResult` (Task 7); `upsertDistrictDemographics`, `DemographicsUpsertClient` (Task 8)
- Produces:
  - `fetchDataflowCsv(deps: { fetch: typeof fetch; token: string }, ref: DataflowRef, year: number) => Promise<string>`
  - `runTuikDemographics(deps: RunDeps, opts: { dryRun: boolean }) => Promise<RunSummary>`
  - `RunSummary` — `{ dataflowsOk: number; dataflowsFailed: string[]; rowsWritten: number; aborted: boolean }`

- [ ] **Step 1: Failing test yaz (run.ts orchestration — DI, ağ YOK)**

```typescript
// crawler/__tests__/tuik/run.test.ts
import { runTuikDemographics, type RunDeps } from '../../tuik/run'
import type { DataflowRef } from '../../tuik/datasets'

const ref = (key: string, field: any, level: 'il' | 'ilce'): DataflowRef => ({
  key, dataflow: `DF_${key}`, version: '1.1', field, level, keyDimensions: {},
})

function makeDeps(over: Partial<RunDeps> = {}): RunDeps & { _upserts: any[] } {
  const _upserts: any[] = []
  return {
    dataflows: [ref('population', 'population', 'ilce'), ref('medianAge', 'medianAge', 'il')],
    dataYear: 2024,
    getToken: jest.fn(async () => 'tok'),
    fetchCsv: jest.fn(async (r: DataflowRef) => `REF_AREA,TIME_PERIOD,OBS_VALUE\nA_${r.key},2024,1`),
    parse: jest.fn((csv: string) => [{ refArea: csv.split('\n')[1].split(',')[0], timePeriod: '2024', value: 1 }]),
    resolve: jest.fn((code: string) =>
      code === 'A_population' ? { il: 'Trabzon', ilce: 'Ortahisar' }
      : code === 'A_medianAge' ? { il: 'Trabzon', ilce: null } : null),
    client: { districtDemographics: { upsert: async (a: any) => { _upserts.push(a) } } } as any,
    crawlRunClient: { crawlRun: { create: jest.fn(async () => ({ id: 'r1' })), update: jest.fn(async () => ({})) } } as any,
    _upserts,
    ...over,
  } as RunDeps & { _upserts: any[] }
}

describe('runTuikDemographics', () => {
  it('tüm dataflow OK → token alır, satır yazar, CrawlRun kapatır', async () => {
    const deps = makeDeps()
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(deps.getToken).toHaveBeenCalled()
    expect(s.dataflowsOk).toBe(2)
    expect(s.dataflowsFailed).toEqual([])
    expect(s.rowsWritten).toBe(1)               // 1 ilçe satırı (medianAge il→ilçe yayıldı)
    expect(s.aborted).toBe(false)
    expect(deps.crawlRunClient.crawlRun.update).toHaveBeenCalled()
  })

  it('token alınamazsa → abort, hiç fetch/upsert yok', async () => {
    const deps = makeDeps({ getToken: jest.fn(async () => { throw new Error('auth failed') }) })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.aborted).toBe(true)
    expect(s.rowsWritten).toBe(0)
    expect(deps.fetchCsv).not.toHaveBeenCalled()
    expect(deps._upserts).toHaveLength(0)
  })

  it('bir dataflow fetch hata verir → o metrik atlanır, diğerleri yazılır', async () => {
    const deps = makeDeps({
      fetchCsv: jest.fn(async (r: DataflowRef) => {
        if (r.key === 'medianAge') throw new Error('HTTP 500')
        return `REF_AREA,TIME_PERIOD,OBS_VALUE\nA_${r.key},2024,1`
      }),
    })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.dataflowsOk).toBe(1)
    expect(s.dataflowsFailed).toEqual(['medianAge'])
    expect(s.rowsWritten).toBe(1)
    expect(s.aborted).toBe(false)
  })

  it('HİÇBİR dataflow çekilemez → abort, 0 satır, hiç upsert yok', async () => {
    const deps = makeDeps({ fetchCsv: jest.fn(async () => { throw new Error('down') }) })
    const s = await runTuikDemographics(deps, { dryRun: false })
    expect(s.aborted).toBe(true)
    expect(deps._upserts).toHaveLength(0)
  })

  it('dryRun → parse+merge eder ama upsert ETMEZ', async () => {
    const deps = makeDeps()
    const s = await runTuikDemographics(deps, { dryRun: true })
    expect(s.dataflowsOk).toBe(2)
    expect(deps._upserts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/run"` → FAIL, modül yok.

- [ ] **Step 3: `fetchData.ts` yaz**

```typescript
// crawler/tuik/fetchData.ts
import { DATA_BASE, type DataflowRef } from './datasets'

/** Bir dataflow'u SDMX-CSV metni olarak çeker. keyDimensions seri anahtarına
 *  gömülür (REF_AREA ve TIME_PERIOD boş bırakılır → tüm alanlar / tüm dönem-yıl). */
export async function fetchDataflowCsv(
  deps: { fetch: typeof fetch; token: string },
  ref: DataflowRef,
  year: number,
): Promise<string> {
  // Seri anahtarı: keyDimensions varsa "?" ile filtrelenir; yoksa tümü.
  const keyPart = Object.keys(ref.keyDimensions).length
    ? '/' + Object.values(ref.keyDimensions).join('.')  // DSD sırasına göre — Task 1 doğrular
    : ''
  const url =
    `${DATA_BASE},${ref.dataflow},${ref.version}${keyPart}` +
    `?format=SDMX-CSV&startPeriod=${year}&endPeriod=${year}`
  const res = await deps.fetch(url, { headers: { Authorization: `Bearer ${deps.token}` } })
  if (!res.ok) {
    throw new Error(`TÜİK ${ref.dataflow} çekilemedi (HTTP ${res.status})`)
  }
  return await res.text()
}
```

> **NOT:** `keyPart` oluşumu Task 1'in DSD boyut sırası bulgusuna göre kesinleşir.
> `keyDimensions` boşsa (tüm örnekler) bu kod olduğu gibi çalışır; dolu bir ref
> için (medyan yaş `CINSIYET=_T`) Task 1 boyut pozisyonunu doğrular, gerekirse
> `keyPart` boyut sırasına göre `.` konumlaması düzeltilir.

- [ ] **Step 4: `run.ts` yaz (orchestration + CLI)**

```typescript
// crawler/tuik/run.ts
import type { DataflowRef } from './datasets'
import type { SdmxObservation } from './parse'
import type { ResolvedArea } from './areaCodes'
import { mergeDemographics, type DataflowResult } from './merge'
import { upsertDistrictDemographics, type DemographicsUpsertClient } from './upsert'

export interface RunSummary {
  dataflowsOk: number
  dataflowsFailed: string[]
  rowsWritten: number
  aborted: boolean
}

export interface RunDeps {
  dataflows: DataflowRef[]
  dataYear: number
  getToken: () => Promise<string>
  fetchCsv: (ref: DataflowRef, token: string, year: number) => Promise<string>
  parse: (csv: string) => SdmxObservation[]
  resolve: (code: string) => ResolvedArea | null
  client: DemographicsUpsertClient
  crawlRunClient: {
    crawlRun: {
      create(args: unknown): Promise<{ id: string }>
      update(args: unknown): Promise<unknown>
    }
  }
}

export async function runTuikDemographics(deps: RunDeps, opts: { dryRun: boolean }): Promise<RunSummary> {
  const run = await deps.crawlRunClient.crawlRun.create({
    data: { source: 'tuik', il: 'ALL', category: 'demografi' },
  })

  let token: string
  try {
    token = await deps.getToken()
  } catch (err) {
    await deps.crawlRunClient.crawlRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), blocked: true, notes: `auth failed: ${(err as Error).message}` },
    })
    return { dataflowsOk: 0, dataflowsFailed: deps.dataflows.map((d) => d.key), rowsWritten: 0, aborted: true }
  }

  const results: DataflowResult[] = []
  const failed: string[] = []
  for (const ref of deps.dataflows) {
    try {
      const csv = await deps.fetchCsv(ref, token, deps.dataYear)
      results.push({ ref, observations: deps.parse(csv) })
    } catch (err) {
      failed.push(ref.key)
      console.error(`[tuik] ${ref.key} çekilemedi:`, (err as Error).message)
    }
  }

  const aborted = results.length === 0
  let rowsWritten = 0
  if (!aborted && !opts.dryRun) {
    const merged = mergeDemographics(results, deps.resolve)
    rowsWritten = await upsertDistrictDemographics(deps.client, merged, {
      dataYear: deps.dataYear,
      source: 'tuik-adnks-sdmx',
      fetchedAt: new Date(),
    })
  } else if (!aborted && opts.dryRun) {
    mergeDemographics(results, deps.resolve)  // parse/merge yolunu doğrula, yazma
  }

  await deps.crawlRunClient.crawlRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      blocked: aborted,
      listingsFound: results.reduce((n, r) => n + r.observations.length, 0),
      listingsUpserted: rowsWritten,
      notes: JSON.stringify({ dryRun: opts.dryRun, dataflowsFailed: failed, dataYear: deps.dataYear }),
    },
  })

  return {
    dataflowsOk: deps.dataflows.length - failed.length,
    dataflowsFailed: failed,
    rowsWritten,
    aborted,
  }
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run')
  const apiKey = process.env.TUIK_API_KEY
  if (!apiKey) {
    console.error('TUIK_API_KEY env değişkeni yok — Task 1 ön koşulu.')
    process.exitCode = 1
    return
  }

  const { DATAFLOWS, DATA_YEAR } = await import('./datasets')
  const { getAccessToken } = await import('./auth')
  const { parseSdmxCsv } = await import('./parse')
  const { resolveArea } = await import('./areaCodes')
  const { fetchDataflowCsv } = await import('./fetchData')
  const { PrismaClient } = await import('@prisma/client')

  if (DATAFLOWS.length === 0) {
    console.error('crawler/tuik/datasets.ts boş — Task 1 tamamlanmadı.')
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  try {
    const summary = await runTuikDemographics(
      {
        dataflows: DATAFLOWS,
        dataYear: DATA_YEAR,
        getToken: () => getAccessToken({ fetch, apiKey }),
        fetchCsv: (ref, token, year) => fetchDataflowCsv({ fetch, token }, ref, year),
        parse: parseSdmxCsv,
        resolve: resolveArea,
        client: prisma as unknown as DemographicsUpsertClient,
        crawlRunClient: prisma as unknown as RunDeps['crawlRunClient'],
      },
      { dryRun },
    )
    console.log('[tuik] özet:', summary)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
}
```

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npm run test:crawler -- --testPathPatterns "tuik/run"` → 5 test PASS.
`npx tsc -p crawler/tsconfig.json` temiz.

- [ ] **Step 6: `package.json`'a script ekle**

`"crawl"` satırının altına:

```json
"crawl:tuik": "cross-env TS_NODE_PROJECT=crawler/tsconfig.json ts-node --transpile-only -r tsconfig-paths/register crawler/tuik/run.ts",
```

- [ ] **Step 7: `README.md` yaz**

```markdown
# crawler/tuik — TÜİK İlçe Demografi (SDMX API)

Değer Kartı'nın üye demografi bloğunu besleyen ilçe seviyesi TÜİK verisini
TÜİK SDMX REST API'sinden çeker.

## Ön koşul: API Key

1. `veriportali.tuik.gov.tr` → giriş → "Kullanıcı Bilgileri" → SMS ile telefon
   doğrula → **API Key** üret. (Türk telefonu yoksa `info@tuik.gov.tr`'ye talep.)
2. `TUIK_API_KEY=<key>` → yerel `.env` (crawl için) ve prod deploy anında Coolify env.

## Çalıştırma

1. Migration uygulanmış olmalı: `npx prisma migrate status` → up to date.
2. Kuru koşu: `npm run crawl:tuik -- --dry-run`
3. Gerçek koşu: `npm run crawl:tuik`

## Metrikler ve seviye

| Alan | Dataflow | Seviye |
|---|---|---|
| population | DF_ADNKS_T22 | ilçe |
| populationGrowthPerMille (‰) | DF_ADNKS_T38 | ilçe |
| medianAge | DF_ADNKS_T23 | **il** (ilin tüm ilçelerine kopyalanır) |
| avgHouseholdSize | DF_ADNKS_T25 | **il** (ilin tüm ilçelerine kopyalanır) |

## Tazeleme kadansı

Yılda bir — ADNKS Şubat'ta yayınlanır. `datasets.ts`'te `DATA_YEAR`'ı güncelle,
gerekirse dataflow `version`'larını `GET /rest/dataflow/TR/<DF>/latest` ile doğrula, koş.

## Bir dataflow çekilemezse

`CrawlRun.notes` (`dataflowsFailed`) hangi metriğin düştüğünü söyler. O sütun bir
sonraki başarılı turda güncellenir; eski değer korunur (UPSERT, silme yok).
Yeni ilçe kodu görülürse `areaCodesData.ts` güncellenir.
```

- [ ] **Step 8: Regresyon + commit**

Run: `npx tsc -p crawler/tsconfig.json` + `npm run test:crawler` → tümü PASS.

```bash
git add crawler/tuik/fetchData.ts crawler/tuik/run.ts crawler/tuik/README.md crawler/__tests__/tuik/run.test.ts package.json
git commit -m "feat(tuik): fetchDataflowCsv + runTuikDemographics orchestration + crawl:tuik scripti"
```

---

## Task 10: `card.ts` — deps + DTO + buildDegerCard wiring

**API Key GEREKMEZ. Task 3 (model) + Task 4 (summarize) tamamlanmış olmalı.**

**Files:**
- Modify: `src/lib/deger/card.ts`
- Modify: `src/lib/deger/anonCardDeps.ts`
- Test: `src/lib/deger/card.test.ts`

**Interfaces:**
- Consumes: `DistrictDemographicsRecord`, `summarizeDemographics` (Task 4)
- Produces:
  - `DegerCardDeps.findDistrictDemographics: (il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>` (zorunlu)
  - `DegerCardDTO.demographics?` — `{ dataYear; population; populationGrowthPerMille; medianAge; avgHouseholdSize; summary: string | null }` (sayısal alanlar `number | null`)
  - Task 11, 12 tüketir.

- [ ] **Step 1: Mevcut `deps()` fabrikasına alan ekle (kırık testleri önlemek için ÖNCE)**

`card.test.ts` `deps()` fabrikasına, `findAreaTrend`'in yanına:

```typescript
    findDistrictDemographics: jest.fn().mockResolvedValue({
      dataYear: 2024,
      population: 320_000,
      populationGrowthPerMille: 14,
      medianAge: 36,
      avgHouseholdSize: 3.1,
    }),
```

- [ ] **Step 2: Failing testler yaz**

`card.test.ts` sonuna:

```typescript
  it('üye: demographics var (4 metrik + summary)', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.demographics).toBeDefined()
    expect(res.card.demographics!.population).toBe(320_000)
    expect(res.card.demographics!.dataYear).toBe(2024)
    expect(res.card.demographics!.summary).toContain('konut talebi güçlü')
    expect(res.card.demographics).not.toHaveProperty('netMigrationPerMille')
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
Expected: yeni testler FAIL; mevcut testler PASS.

- [ ] **Step 4: `card.ts`'i düzenle**

İmport:
```typescript
import { summarizeDemographics } from '@/lib/demografi/summarize'
import type { DistrictDemographicsRecord } from '@/lib/demografi/types'
```

`DegerCardDeps` + :
```typescript
  findDistrictDemographics: (il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>
```

`DegerCardDTO` + :
```typescript
  demographics?: {
    dataYear: number
    population: number | null
    populationGrowthPerMille: number | null
    medianAge: number | null
    avgHouseholdSize: number | null
    summary: string | null
  }
```

`buildDegerCard` `Promise.all` dizisine ekle:
```typescript
    deps.findDistrictDemographics(nIl, nIlce),
```
destructuring'e `demo` ekle (trendRows'un yanına).

DTO oluşturmada, `priceTrend` spread'inin yanına:
```typescript
      ...(opts.memberView && demo
        ? {
            demographics: {
              dataYear: demo.dataYear,
              population: demo.population,
              populationGrowthPerMille: demo.populationGrowthPerMille,
              medianAge: demo.medianAge,
              avgHouseholdSize: demo.avgHouseholdSize,
              summary: summarizeDemographics(demo).sentence,
            },
          }
        : {}),
```

- [ ] **Step 5: `anonCardDeps.ts` — Omit tipini genişlet**

```typescript
export function createAnonCardDeps(): Omit<DegerCardDeps, 'findAreaTrend' | 'findDistrictDemographics'> {
```
Docstring'e: `findDistrictDemographics` de üye-özel — route'ta `if (!userId) return null`.

- [ ] **Step 6: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "deger/card"` → tümü PASS.

`npx tsc --noEmit` → **`/api/deger/kart/route.ts` ve `whatsapp/webhook/route.ts`'te `findDistrictDemographics` eksik hatası BEKLENİYOR** (Task 11'de düzeltilecek). Başka hata olmamalı.

- [ ] **Step 7: Commit**

```bash
git add src/lib/deger/card.ts src/lib/deger/anonCardDeps.ts src/lib/deger/card.test.ts
git commit -m "feat(deger): card.ts demographics DTO + findDistrictDemographics deps (üye-gated)"
```

---

## Task 11: Route wiring — `/api/deger/kart` + WhatsApp webhook

**API Key GEREKMEZ. Task 10 tamamlanmış olmalı (bıraktığı tsc hatalarını çözer).**

**Files:**
- Modify: `src/app/api/deger/kart/route.ts`
- Modify: `src/app/api/whatsapp/webhook/route.ts`

**Interfaces:** Consumes `DegerCardDeps.findDistrictDemographics` (Task 10). Produces: yok.

- [ ] **Step 1: `/api/deger/kart/route.ts` — deps'e ekle**

`findAreaTrend` dep'inin yanına:

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
            },
          })
        } catch {
          return null   // DistrictDemographics tablosu henüz migrate edilmemişse /deger'i düşürme
        }
      },
```

- [ ] **Step 2: `whatsapp/webhook/route.ts` — `cardDeps`'e ekle**

`findAreaTrend: async () => [],` yanına:

```typescript
    findDistrictDemographics: async () => null,
```
Yorumu güncelle: `// Bot trend/demografi göstermez → ikisi de boş/null.`

- [ ] **Step 3: tsc + hedefli suite**

Run: `npx tsc --noEmit` → **temiz** (Task 10'un bıraktığı 2 hata çözüldü).
Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "deger|whatsapp"` → tümü PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/deger/kart/route.ts src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(deger): findDistrictDemographics route wiring (/deger üye + whatsapp null)"
```

---

## Task 12: `DegerKarti.tsx` — demografi bloğu + CSS

**API Key GEREKMEZ. Task 10 tamamlanmış olmalı.**

**Files:**
- Modify: `src/components/deger/DegerKarti.tsx`
- Modify: `src/components/deger/DegerKarti.module.css`
- Test: `src/components/deger/DegerKarti.test.tsx`

- [ ] **Step 1: Fixture + failing testler yaz**

`DegerKarti.test.tsx`'te:

```typescript
const demographics = {
  dataYear: 2024,
  population: 320000,
  populationGrowthPerMille: 14,
  medianAge: 36,
  avgHouseholdSize: 3.1,
  summary: 'Bu ilçede nüfus belirgin şekilde büyüyor — konut talebi güçlü.',
}
```

Testler:

```typescript
it('üye + demographics: özet cümle + metrikler + il-geneli etiketi render edilir', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/konut talebi güçlü/)).toBeInTheDocument()
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()
  expect(screen.getByText(/\+14/)).toBeInTheDocument()            // ‰ işaretli artış
  expect(screen.getAllByText(/il geneli/i).length).toBeGreaterThanOrEqual(1)  // medyan yaş/hane etiketi
  expect(screen.getByText(/Kaynak: TÜİK 2024/)).toBeInTheDocument()
})

it('anonim + demographics undefined: blur overlay + Üye Ol, gerçek sayı yok', () => {
  render(<DegerKarti card={{ ...baseCard }} isLoggedIn={false} parcelQuery="x" />)
  expect(screen.getByText(/Bölge Demografisi/)).toBeInTheDocument()
  expect(screen.queryByText(/320\.000/)).not.toBeInTheDocument()
})

it('demografi bloğu hiçbir fetch tetiklemez', () => {
  const spy = jest.spyOn(global, 'fetch' as any)
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics }} isLoggedIn={true} parcelQuery="x" />)
  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})

it('summary null → cümle yok ama metrikler var', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { ...demographics, summary: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.getByText(/320\.000/)).toBeInTheDocument()
})

it('null metrik satırı render edilmez', () => {
  render(<DegerKarti card={{ ...baseCard, value: memberValue, demographics: { ...demographics, avgHouseholdSize: null } }} isLoggedIn={true} parcelQuery="x" />)
  expect(screen.queryByText(/Ortalama hane/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Test'i çalıştır, FAIL gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "DegerKarti"` → yeni testler FAIL.

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
            {card.demographics.medianAge != null && (
              <div className={styles.memberRow}>
                Medyan yaş: {card.demographics.medianAge.toLocaleString('tr-TR')}{' '}
                <span className={styles.demografiScope}>(il geneli)</span>
              </div>
            )}
            {card.demographics.avgHouseholdSize != null && (
              <div className={styles.memberRow}>
                Ortalama hane: {card.demographics.avgHouseholdSize.toLocaleString('tr-TR')} kişi{' '}
                <span className={styles.demografiScope}>(il geneli)</span>
              </div>
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
              <div className={styles.memberRow}>Medyan yaş: ••••</div>
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

Dosya üstüne, `tl` sabitinin yanına:

```typescript
const fmtPerMille = (n: number) => {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toLocaleString('tr-TR')}‰`
}
```

- [ ] **Step 4: CSS ekle**

`DegerKarti.module.css` sonuna:

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

.demografiScope {
  font-size: 11px;
  color: #94a3b8;
}

.demografiSource {
  font-size: 11px;
  color: #94a3b8;
  margin: 8px 0 0;
}
```

`.memberRow`, `.divider`, `.label`, `.trendScope`, `.gatedWrap`, `.blurred`,
`.overlay`, `.sub`, `.cta` zaten tanımlı — yeniden tanımlama.

- [ ] **Step 5: Test'i çalıştır, PASS gör**

Run: `npx jest --no-coverage --roots "$(pwd)/src" --testPathPatterns "DegerKarti"` → tümü PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/deger/DegerKarti.tsx src/components/deger/DegerKarti.module.css src/components/deger/DegerKarti.test.tsx
git commit -m "feat(deger): DegerKarti üye demografi bloğu (il-geneli etiketli) + anonim blur overlay"
```

---

## Task 13: Final regresyon + doğrulama

**Files:** yok (doğrulama).

- [ ] **Step 1: Tam tsc**

Run: `npx tsc --noEmit` → 0 hata
Run: `npx tsc -p crawler/tsconfig.json` → 0 hata

- [ ] **Step 2: Tam test suite**

Run: `npx jest --no-coverage --roots "$(pwd)/src"` → tüm suite yeşil
Run: `npm run test:crawler` → tüm crawler testleri yeşil

- [ ] **Step 3: Production build**

Run: `npm run build` → temiz. Build sonrası `public/sw.js` dirty olursa `git checkout public/sw.js`.

- [ ] **Step 4: eslint (değişen dosyalar)**

Run: `npx eslint src/lib/demografi/ src/lib/deger/card.ts src/components/deger/DegerKarti.tsx src/app/api/deger/kart/route.ts` → yeni ihlal yok.

- [ ] **Step 5: Bulguları not et**

- `crawl:tuik` gerçek turu + prod migration BATCH DEPLOY'a bırakıldı. `DistrictDemographics` migration'ı bekleyen migration listesine eklenir.
- `TUIK_API_KEY` prod deploy anında Coolify env'e eklenir.
- `datasets.ts`/`areaCodesData.ts` Task 1'de doldurulmadıysa demografi bloğu canlıda hiç görünmez (tablo boş) — güvenli başlangıç, kart geri kalanı etkilenmez.
- Gerçek SDMX yanıt şekli (`keyPart` boyut sırası, SDMX-CSV sütun adları) prod'da ilk `crawl:tuik --dry-run` turuyla doğrulanmalı.

- [ ] **Step 6: Final commit**

```bash
git commit --allow-empty -m "chore(tuik): final regresyon doğrulaması"
```

---

## Self-Review

**Spec coverage (rev 2):**
- §Task 1 Bulguları / Kararlar (rev 2) — SDMX yönü → Task 1 (`datasets.ts`/`areaCodesData.ts`) + Task 2 (`auth.ts`) ✓
- §Veri modeli (4 metrik, net göç yok) → Task 3 ✓
- §Crawler `crawler/tuik/` (auth/fetchData/parse/areaCodes/merge/upsert/run) → Task 1,2,5,6,7,8,9 ✓
- §il-yayılımı (medyan yaş/hane il→ilçe) → Task 7 `mergeDemographics` + testleri ✓
- §Saf lib `src/lib/demografi/` (summarize: artış + yaş) → Task 4 ✓
- §Değer Kartı entegrasyonu → Task 10,11,12 ✓
- §"(il geneli)" etiketi → Task 12 Step 3 + test ✓
- §Hata Yönetimi (token fail / dataflow fail / hepsi fail / bilinmeyen kod / tablo yok / hepsi null) → Task 9 (run) + Task 11 (route catch) + Task 12 (null metrik/summary) ✓
- §Test Stratejisi → her task TDD + Task 13 ✓
- §Non-Goals → hiçbir task mahalle/geçmiş/net-göç/MEDAS/cron/Akif eklemiyor ✓
- §Ön Koşul (API Key, batch deploy) → Global Constraints + Task 9 README + Task 13 Step 5 ✓
- §Açık teknik kararlar → Task 1 Step 2/3/5 (versiyon, DSD sırası, kod listesi) + Task 9 Step 3 NOT'u (`keyPart`) ✓

**Placeholder scan:** Task 1'in `datasets.ts`/`areaCodesData.ts` iskeletleri bilinçli — API Key gerektiren keşif çıktısı doldurur, tip geçerli, `tsc` geçer. Task 9 `keyPart` oluşumu Task 1 DSD bulgusuna bağlı — NOT ile işaretli, `keyDimensions` boşken kod çalışır. Başka placeholder yok.

**Type consistency:**
- `SdmxObservation` (Task 5) → `DataflowResult.observations` (Task 7) — birebir
- `MergedDistrictRow` (Task 7) = `{ il; ilce } & Partial<Record<DemographicField, number>>` → `upsertDistrictDemographics` girdisi (Task 8) — birebir
- `DemographicField` union: `datasets.ts`'te (Task 1) tanımlı, `merge.ts` (Task 7) + `upsert.ts` (Task 8) import eder — tek kaynak
- `DistrictDemographicsRecord` (Task 4) alanları = `card.ts` DTO `demographics` sayısal alanları (Task 10) = route `select` (Task 11) — hepsi `population, populationGrowthPerMille, medianAge, avgHouseholdSize` + `dataYear`. Net göç HİÇBİRİNDE yok. Tutarlı.
- `findDistrictDemographics(il, ilce)` imzası: card arayüzü (Task 10), route impl (Task 11), whatsapp impl (Task 11), card.test fabrikası (Task 10) — hepsi `(il: string, ilce: string) => Promise<DistrictDemographicsRecord | null>`
- `getAccessToken({fetch, apiKey})` (Task 2) ← `run.ts` main (Task 9) `getToken: () => getAccessToken({ fetch, apiKey })` — uyumlu
- `RunDeps.fetchCsv(ref, token, year)` (Task 9) ← `fetchDataflowCsv({fetch, token}, ref, year)` (Task 9 Step 3) — main'de `(ref, token, year) => fetchDataflowCsv({fetch, token}, ref, year)` ile köprüleniyor, uyumlu

Gap yok. Plan uygulanmaya hazır.
