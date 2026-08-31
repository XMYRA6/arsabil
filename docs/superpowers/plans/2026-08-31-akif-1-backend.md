# Akif-1 Metin MVP — Backend (Plan 1/2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akif-1'in sunucu tarafını kur: `POST /api/akif/turn` bir metin sohbet turunu alır, OpenAI (gpt-4o-mini, tool-calling) + mevcut deterministik kat-karşılığı motoruyla işler ve çift-kanallı `AkifTurn` (konuşma + yapısal sonuç) döner.

**Architecture:** `src/lib/ai/akif/` altında saf, DI'lı modüller: çift-kanallı sözleşme, Türkçe sayı güvenliği, 3-araçlı Tool Gateway (`CalculatorEngineV2` sarar), katmanlı sistem-prompt, OpenAI client sarmalayıcısı, maliyet guard'ı, audit. `orchestrator.runAkifTurn` hepsini bağlar. Route ince; sunucu stateless (geçmiş client'tan gelir).

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, Jest + ts-jest (node env), `openai` npm paketi (TEK yeni bağımlılık — zod EKLENMEZ, doğrulama elle).

**Spec:** `docs/superpowers/specs/2026-08-31-akif-1-metin-mvp-design.md`

**Not — Plan 2/2:** `/akif` sayfası + `src/components/akif/` + eval harness (`__evals__/` + `npm run akif:eval`) AYRI bir planda. Bu plan bitince route curl/jest ile uçtan uca test edilebilir olacak.

## Global Constraints

- **Sağlayıcı: OpenAI.** Model env `AKIF_MODEL` (varsayılan `gpt-4o-mini`). Sistem tek modele kod seviyesinde bağlanmaz.
- **zod YOK.** `AkifTurn` doğrulaması elle `parseAkifTurn` (5a `parseInbound`/`verifySignature` deseni). OpenAI `response_format` elle yazılmış JSON schema sabiti.
- **Ham kullanıcı metni / prompt SAKLANMAZ.** `AkifTurnLog` yalnız sayaç + niyet + araç adı (gizlilik, vizyon §49).
- Tüm iş mantığı saf + DI. OpenAI client / Prisma / motor doğrudan import edilip test edilmez — DI + mock. `CalculatorEngineV2` istisna: saf senkron, gateway araçlarının testinde GERÇEK çağrılır (motoru mock'lamak yanlış olur).
- Akif hesabı asla kendi yapmaz — yalnız Tool Gateway'in 3 aracını çağırır. Araçlar DB'ye YAZMAZ (yalnız `engineDefaults` OKUR).
- Kullanıcıya giden tüm metin Türkçe. Kod identifier İngilizce.
- Migration elle SQL `prisma/migrations/<UTC-ts>_<isim>/migration.sql`; dev'de `prisma migrate deploy`, prod batch deploy'da.
- Her task: `npx tsc --noEmit` temiz + ilgili jest yeşil. Route'a dokunan task'ta ek `npm run build`.
- jest: worktree'den `npx jest --no-coverage <pattern>` (NO `--roots`); ana checkout'ta `--roots "<rootDir>/src"`.
- Dev DB (Docker `arsabil_postgres_dev`, `postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev`) çalışıyor.
- `OPENAI_API_KEY` env — modül seviyesinde OKUNMAZ, yalnız handler/factory içinde. Yoksa route `500 { error: 'akif_unavailable' }`.

---

### Task 1: `openai` bağımlılığı + `AkifTurnLog` modeli + migration + rate-limit sabiti

**Files:**
- Modify: `package.json` (`openai` dependency)
- Modify: `prisma/schema.prisma` (model)
- Create: `prisma/migrations/20260902090000_add_akif_turn_log/migration.sql`
- Modify: `src/lib/rate-limit.ts` (`RATE_LIMITS.AKIF_TURN`)
- Test: yok (bağımlılık + şema) — doğrulama `prisma validate` + `tsc` + `npm run build`

**Interfaces:**
- Produces: `prisma.akifTurnLog` delegesi; `RATE_LIMITS.AKIF_TURN`

- [ ] **Step 1: `openai` ekle** — `npm install openai` (dependencies'e; sürümü sabitle). `npm ls openai` ile doğrula.

- [ ] **Step 2: Model** — `prisma/schema.prisma` sonuna:

```prisma
model AkifTurnLog {
  id               String   @id @default(cuid())
  conversationId   String
  turn             Int
  model            String
  promptTokens     Int
  completionTokens Int
  estCostUsd       Float
  intent           String
  tool             String?
  createdAt        DateTime @default(now())

  @@index([conversationId])
  @@index([createdAt])
}
```

- [ ] **Step 3: `npx prisma validate`** → valid

- [ ] **Step 4: Migration SQL** — `prisma/migrations/20260902090000_add_akif_turn_log/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AkifTurnLog" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "estCostUsd" DOUBLE PRECISION NOT NULL,
    "intent" TEXT NOT NULL,
    "tool" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AkifTurnLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifTurnLog_conversationId_idx" ON "AkifTurnLog"("conversationId");

-- CreateIndex
CREATE INDEX "AkifTurnLog_createdAt_idx" ON "AkifTurnLog"("createdAt");
```

- [ ] **Step 5:** `DATABASE_URL="postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_dev" npx prisma migrate deploy` + `npx prisma generate`

- [ ] **Step 6: Rate limit** — `src/lib/rate-limit.ts` `RATE_LIMITS` nesnesine:

```ts
    AKIF_TURN: { limit: 8, windowMs: 60_000 }, // kullanıcı/IP başına 8/dk — LLM turu pahalı
```

- [ ] **Step 7:** `npx tsc --noEmit` temiz + `npm run build` temiz.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma prisma/migrations/20260902090000_add_akif_turn_log src/lib/rate-limit.ts
git commit -m "feat(akif): openai bağımlılığı + AkifTurnLog modeli + AKIF_TURN rate limit"
```

---

### Task 2: `contract.ts` — tipler + JSON schema + `parseAkifTurn`

**Files:**
- Create: `src/lib/ai/akif/contract.ts`
- Test: `src/lib/ai/akif/__tests__/contract.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface AkifMessage { role: 'user' | 'akif'; content: string }

  export type AkifIntent =
    | 'explain_term' | 'compare_contractor' | 'compare_apartment_size'
    | 'collect_info' | 'clarify_number' | 'smalltalk' | 'out_of_scope'
  export type AkifState =
    | 'NEUTRAL' | 'THINKING' | 'EXPLAINING' | 'CAUTION' | 'CONFIDENT'
    | 'SERIOUS' | 'FRIENDLY' | 'HUMOR'

  export interface TermCard { kind: 'term'; term: string; shortDef: string; example: string }
  export interface ScenarioRow {
    label: string            // "Müteahhit %50" / "100 m²"
    arsaPayiX: number
    arsaSahibiDaireSayisi: number | null
    arsaSahibiDegeriTL: number | null
    daireSatisFiyatiTL: number
  }
  export interface ScenarioCard {
    kind: 'contractor_offers' | 'apartment_sizes'
    rows: ScenarioRow[]
    defaultsUsed: string[]
    assumptions: string[]
    emsalNote: string
  }
  export type ToolResultCard = TermCard | ScenarioCard

  export interface AkifTurn {
    intent: AkifIntent
    speech: string
    state: AkifState
    facts_used: string[]
    assumptions: string[]
    missing_fields: string[]
    tool_result?: ToolResultCard
    needs_confirmation?: { field: string; heard: string; question: string }
    risk_level: 'low' | 'medium' | 'high'
  }

  // OpenAI response_format için — model YALNIZ bu alanları üretir (tool_result HARİÇ:
  // onu orchestrator kendi çalıştırdığı sonuçla doldurur; modelden gelen tool_result
  // yok sayılır — vizyon §53).
  export const AKIF_TURN_JSON_SCHEMA: Record<string, unknown>  // aşağıda

  export function parseAkifTurn(raw: unknown): AkifTurn | null
  ```
- `AKIF_TURN_JSON_SCHEMA`: `type: 'object'`, `additionalProperties: false`, `required: ['intent','speech','state','facts_used','assumptions','missing_fields','risk_level']`, alanlar: `intent` enum (7), `speech` string, `state` enum (8), `facts_used`/`assumptions`/`missing_fields` `{ type:'array', items:{type:'string'} }`, `risk_level` enum (3), `needs_confirmation` `{ type:['object','null'], properties: {field,heard,question: string}, required:[...], additionalProperties:false }`. **`tool_result` şemada YOK** (model üretmesin).
- `parseAkifTurn`: elle — `raw` object mı; `intent`/`state`/`risk_level` geçerli enum mı; `speech` non-empty string mi; 3 array alan string[] mı; `needs_confirmation` varsa şekli doğru mu. Herhangi biri değilse `null`. `tool_result` alanını **yok sayar** (orchestrator sonradan ekler).

- [ ] **Step 1: Failing test**

```ts
import { parseAkifTurn, AKIF_TURN_JSON_SCHEMA } from '../contract'

const valid = {
  intent: 'explain_term', speech: 'Emsal, arsana ne kadar inşaat yapılabileceğini gösterir.',
  state: 'EXPLAINING', facts_used: [], assumptions: [], missing_fields: [], risk_level: 'low',
}

describe('parseAkifTurn', () => {
  it('geçerli tur → nesne', () => {
    expect(parseAkifTurn(valid)).toEqual(valid)
  })
  it('geçersiz intent → null', () => {
    expect(parseAkifTurn({ ...valid, intent: 'xyz' })).toBeNull()
  })
  it('speech boş → null', () => {
    expect(parseAkifTurn({ ...valid, speech: '' })).toBeNull()
  })
  it('facts_used dizi değil → null', () => {
    expect(parseAkifTurn({ ...valid, facts_used: 'x' })).toBeNull()
  })
  it('modelden gelen tool_result yok sayılır', () => {
    const r = parseAkifTurn({ ...valid, tool_result: { kind: 'term', term: 'x' } })
    expect(r).not.toBeNull()
    expect(r!.tool_result).toBeUndefined()
  })
  it('needs_confirmation geçerli şekil korunur', () => {
    const nc = { field: 'emsal', heard: '15', question: 'Emsal 1,50 mi?' }
    expect(parseAkifTurn({ ...valid, intent: 'clarify_number', needs_confirmation: nc })!.needs_confirmation).toEqual(nc)
  })
  it('null / non-object → null', () => {
    expect(parseAkifTurn(null)).toBeNull()
    expect(parseAkifTurn('x')).toBeNull()
  })
})

describe('AKIF_TURN_JSON_SCHEMA', () => {
  it('tool_result alanı içermez (model üretmesin)', () => {
    const props = (AKIF_TURN_JSON_SCHEMA as any).properties
    expect(props.tool_result).toBeUndefined()
    expect((AKIF_TURN_JSON_SCHEMA as any).required).toEqual(
      expect.arrayContaining(['intent', 'speech', 'state', 'risk_level']),
    )
  })
})
```

- [ ] **Step 2:** fail → `npx jest --no-coverage contract`
- [ ] **Step 3:** `contract.ts` yaz (yukarıdaki tipler + şema + parser)
- [ ] **Step 4:** geç (8 test)
- [ ] **Step 5:** `tsc` + commit (`feat(akif): çift-kanallı AkifTurn sözleşmesi + parseAkifTurn`)

---

### Task 3: `numberSafety.ts` — Türkçe sayı güvenliği

**Files:**
- Create: `src/lib/ai/akif/numberSafety.ts`
- Test: `src/lib/ai/akif/__tests__/numberSafety.test.ts`

**Interfaces:**
- Consumes: `src/app/hesapla/trNumberFormat.ts` — INCELE, `parseTRNumber` benzeri bir yardımcı varsa yeniden kullan; yoksa numberSafety kendi parser'ını taşır (app→lib bağımlılığı kurma — küçük mantık kopyalanır).
- Produces:
  ```ts
  export interface ExtractedNumber {
    raw: string            // metindeki ham ifade
    value: number
    kind: 'plain' | 'percent' | 'area' | 'ratio'
    lowConfidence: boolean  // sözlü ("bir virgül elli"), sıra dışı aralık, belirsiz
  }
  export function extractNumbers(text: string): ExtractedNumber[]
  export function isOutOfRange(kind: ExtractedNumber['kind'], value: number): boolean
  // Tool arg aralık doğrulama (toolRegistry kullanır):
  export const RANGES = {
    percent: { min: 0, max: 100 },
    area: { min: 100, max: 50_000 },     // arsa alanı m²
    emsal: { min: 0.1, max: 5 },
    daire: { min: 30, max: 500 },
  } as const
  export function validateRange(field: 'percent'|'area'|'emsal'|'daire', value: number): boolean
  ```
- `extractNumbers`: yakalar —
  - Rakam+`%` / "yüzde N" → `percent`
  - "N m²" / "N metrekare" → `area`
  - "bir virgül elli" / "iki virgül yirmi beş" (sözlü ondalık) → `ratio`, `lowConfidence: true`
  - "dokuz yüz" / "bin beş yüz" (sözlü tam sayı) → `plain`, `lowConfidence: true`
  - Düz `1.500` / `1,5` / `900` → `plain`/`ratio`
- `isOutOfRange`: emsal>5 veya <0.1, yüzde>100, alan<50 gibi → true.

- [ ] **Step 1: Failing test** — tablo:

```ts
import { extractNumbers, validateRange, isOutOfRange } from '../numberSafety'

describe('extractNumbers', () => {
  it('yüzde', () => {
    expect(extractNumbers('müteahhit yüzde elli istiyor')).toContainEqual(
      expect.objectContaining({ value: 50, kind: 'percent' }),
    )
  })
  it('sözlü ondalık lowConfidence', () => {
    const n = extractNumbers('emsal bir virgül elli')
    expect(n).toContainEqual(expect.objectContaining({ value: 1.5, kind: 'ratio', lowConfidence: true }))
  })
  it('alan', () => {
    expect(extractNumbers('900 m² arsam var')).toContainEqual(
      expect.objectContaining({ value: 900, kind: 'area' }),
    )
  })
  it('sözlü tam sayı', () => {
    expect(extractNumbers('dokuz yüz metrekare')).toContainEqual(
      expect.objectContaining({ value: 900, lowConfidence: true }),
    )
  })
  it('düz sayı 1.500', () => {
    expect(extractNumbers('1.500 lira')).toContainEqual(expect.objectContaining({ value: 1500 }))
  })
})
describe('validateRange', () => {
  it('yüzde 120 → false', () => expect(validateRange('percent', 120)).toBe(false))
  it('emsal 15 → false', () => expect(validateRange('emsal', 15)).toBe(false))
  it('emsal 1.5 → true', () => expect(validateRange('emsal', 1.5)).toBe(true))
  it('daire 100 → true', () => expect(validateRange('daire', 100)).toBe(true))
})
describe('isOutOfRange', () => {
  it('emsal kind ratio 15 → true', () => expect(isOutOfRange('ratio', 15)).toBe(true))
})
```

- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): numberSafety — Türkçe sayı çıkarımı + aralık doğrulama`)

Not: sözlü sayı parser'ı kaba olabilir (0–9999 aralığı, "virgül" ondalık ayırıcı). Kapsam dışı: karmaşık ifadeler ("iki bin üç yüz kırk beş"). Belirsizlikte `lowConfidence: true` → orchestrator kullanıcıya onaylatır.

---

### Task 4: `gateway/glossary.ts` + `gateway/explainTerm.ts`

**Files:**
- Create: `src/lib/ai/akif/gateway/glossary.ts`
- Create: `src/lib/ai/akif/gateway/explainTerm.ts`
- Test: `src/lib/ai/akif/__tests__/explainTerm.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // glossary.ts
  export type AkifTerm = 'emsal' | 'taks' | 'kaks' | 'kat_karsiligi' | 'arsa_payi' | 'iksa' | 'risk_katsayisi'
  export const GLOSSARY: Record<AkifTerm, { shortDef: string; example: string }>
  // explainTerm.ts
  export function explainTerm(args: { term: AkifTerm }): TermCard  // from '../contract'
  ```
- `GLOSSARY`: 7 terim, her biri 1-2 cümle sade Türkçe tanım + somut örnek. (Metinleri implementer yazar; imar terminolojisi doğru olmalı — emsal=KAKS ilişkisi, kat karşılığı tanımı vb. Vizyon §14 `explainTerm` + genel imar bilgisi.)
- `explainTerm`: `{ kind: 'term', term, ...GLOSSARY[term] }`. Bilinmeyen term → throw (toolRegistry allowlist zaten engeller ama savunmacı).

- [ ] **Step 1: Failing test** — her terim için `explainTerm({ term })` → `kind:'term'`, non-empty `shortDef`/`example`; 7 terimin hepsi `GLOSSARY`'de.
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): explainTerm + imar terimleri sözlüğü`)

---

### Task 5: `gateway/engineDefaults.ts`

**Files:**
- Create: `src/lib/ai/akif/gateway/engineDefaults.ts`
- Test: `src/lib/ai/akif/__tests__/engineDefaults.test.ts`

**Interfaces:**
- Consumes: `mergeQualityLevels`, `DEFAULT_QUALITY_LEVELS`, `QualityTier` from `@/app/hesapla/calculatorUiHelpers` (type + pure helper — lib'den app'e bu tek istisna; alternatif: kopyala. Implementer karar verir, ama `QualityLevels` mantığı TEK kaynak kalsın — import tercih edilir.)
- Produces:
  ```ts
  export interface EngineDefaults {
    P: number                 // birim inşaat maliyeti TL/m²
    K: number                 // müteahhit kâr katsayısı
    qualityLevels: { standart: number; orta: number; luks: number }
  }
  export interface EngineDefaultsDb {
    globalSettings: { findUnique(a: { where: { id: string } }): Promise<{ defaultUnitPrice: number; qualityStandard: number; qualityMedium: number; qualityLux: number } | null> }
    profitLevel: { findFirst(a: { where: { isDefault: boolean } }): Promise<{ value: number } | null> }
  }
  export async function resolveEngineDefaults(db: EngineDefaultsDb): Promise<EngineDefaults>
  export function lValue(tier: QualityTier, levels: EngineDefaults['qualityLevels']): number
  ```
- `resolveEngineDefaults`: `globalSettings.findUnique({ where: { id: 'settings' } })` → `P = row?.defaultUnitPrice ?? 12000`; `qualityLevels = mergeQualityLevels(DEFAULT_QUALITY_LEVELS, row ?? {})`. `profitLevel.findFirst({ where: { isDefault: true } })` → `K = row?.value ?? 1.30`.
- `lValue`: `levels[tier]`.

- [ ] **Step 1: Failing test** — sahte db: satır var → değerler; satır yok → fallback (`P=12000`, `K=1.30`, `L` default). `lValue('luks', ...)`.
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): engineDefaults — GlobalSettings/ProfitLevel → motor varsayılanları`)

---

### Task 6: `compareContractorOffers` + `compareApartmentSizes` (motor sarma)

**Files:**
- Create: `src/lib/ai/akif/gateway/compareContractorOffers.ts`
- Create: `src/lib/ai/akif/gateway/compareApartmentSizes.ts`
- Test: `src/lib/ai/akif/__tests__/compareScenarios.test.ts`

**Interfaces:**
- Consumes: `CalculatorEngineV2`, `CalculationInput` from `@/lib/calculator/engine_v2`; `buildCalculationInput` from `@/app/hesapla/calculatorUiHelpers`; `EngineDefaults`, `lValue` from `./engineDefaults`; `ScenarioCard`, `ScenarioRow` from `../contract`
- Produces:
  ```ts
  export interface ContractorOffersArgs {
    arsaAlani: number; emsal: number; muteahhitPaylari: number[]
    daireBuyuklugu?: number; birimMaliyet?: number; kaliteSinifi?: 'standart'|'orta'|'luks'
  }
  export function compareContractorOffers(args: ContractorOffersArgs, defaults: EngineDefaults): ScenarioCard

  export interface ApartmentSizesArgs {
    arsaAlani: number; emsal: number; muteahhitPayi: number
    daireBuyuklukleri: number[]; birimMaliyet?: number; kaliteSinifi?: 'standart'|'orta'|'luks'
  }
  export function compareApartmentSizes(args: ApartmentSizesArgs, defaults: EngineDefaults): ScenarioCard
  ```
- `compareContractorOffers`: her `p ∈ muteahhitPaylari` → `x = 1 - p/100`. `input = buildCalculationInput({ x, luxLevel: lValue(kaliteSinifi ?? 'orta', defaults.qualityLevels), apartmentSize: daireBuyuklugu ?? 100, globalUnitPrice: birimMaliyet ?? defaults.P, builderProfit: defaults.K, isApartmentCountEnabled: false, totalApartments: 0, isAaEnabled: true, arsaAlani, riskLevel: 0, iksaMode: 'off', iksaPercentage: 0, iksaManualTL: 0 })`. `out = CalculatorEngineV2.calculate(input)`. Satır: `{ label: 'Müteahhit %'+p, arsaPayiX: x, arsaSahibiDaireSayisi: out.Sdx, arsaSahibiDegeriTL: out.FA, daireSatisFiyatiTL: out.FD_total }`.
  - `defaultsUsed`: `birimMaliyet` verilmedi → `"birim maliyet = "+defaults.P+" TL/m² (varsayılan)"`; `daireBuyuklugu` verilmedi → `"ortalama daire = 100 m² (varsayılan)"`; `kaliteSinifi` verilmedi → `"kalite = orta (varsayılan)"`.
  - `assumptions`: `["Yapılaşma alanı = arsa alanı × emsal", "Kâr katsayısı = "+defaults.K]`.
  - `emsalNote`: `"Emsal alanı = "+arsaAlani+" × "+emsal+" = "+(arsaAlani*emsal)+" m² — TAKS ve çekme mesafesi yok sayıldı."`
  - `kind: 'contractor_offers'`.
- **Not: `emsal` motora doğrudan girmiyor.** Motor `x`, `Ad`, `P`, `K`, `L` + `Aa` alır; emsal yalnız `emsalNote` + gelecekte `Ad` başına toplam daire sayısı türetiminde. v1'de emsal salt bilgilendirme — motor `Aa` (arsa alanı) üzerinden çalışır, emsal `assumptions`/`emsalNote`'ta görünür. (Açık nokta — spec §12.)
- `compareApartmentSizes`: `x = 1 - muteahhitPayi/100` sabit; her `d ∈ daireBuyuklukleri` → `apartmentSize: d`. Satır `label: d+' m²'`. `kind: 'apartment_sizes'`.

- [ ] **Step 1: Failing test**

```ts
import { compareContractorOffers, compareApartmentSizes } from '../gateway/compareContractorOffers'  // + compareApartmentSizes
const defaults = { P: 12000, K: 1.30, qualityLevels: { standart: 1, orta: 1.2, luks: 1.4 } }

describe('compareContractorOffers', () => {
  it('her müteahhit payı için bir satır, x = 1 - p/100', () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [45, 50, 55] }, defaults)
    expect(card.kind).toBe('contractor_offers')
    expect(card.rows).toHaveLength(3)
    expect(card.rows[0].arsaPayiX).toBeCloseTo(0.55)
    expect(card.rows.every(r => r.daireSatisFiyatiTL > 0)).toBe(true)
  })
  it('varsayılanlar defaultsUsed + emsalNote', () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50] }, defaults)
    expect(card.defaultsUsed.join(' ')).toMatch(/varsayılan/)
    expect(card.emsalNote).toMatch(/1350|1\.350/)
  })
  it('birimMaliyet verilince defaultsUsed'ta yok', () => {
    const card = compareContractorOffers({ arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50], birimMaliyet: 15000 }, defaults)
    expect(card.defaultsUsed.join(' ')).not.toMatch(/birim maliyet/)
  })
})
describe('compareApartmentSizes', () => {
  it('daire boyutu varyasyonu → satırlar', () => {
    const card = compareApartmentSizes({ arsaAlani: 900, emsal: 1.5, muteahhitPayi: 50, daireBuyuklukleri: [80, 100, 120] }, defaults)
    expect(card.rows.map(r => r.label)).toEqual(['80 m²', '100 m²', '120 m²'])
  })
})
```

- [ ] **Step 2-5:** fail → implement (GERÇEK `CalculatorEngineV2` çağrılır) → geç → `tsc` + commit (`feat(akif): compareContractorOffers + compareApartmentSizes — motor sarma`)

---

### Task 7: `gateway/toolRegistry.ts`

**Files:**
- Create: `src/lib/ai/akif/gateway/toolRegistry.ts`
- Test: `src/lib/ai/akif/__tests__/toolRegistry.test.ts`

**Interfaces:**
- Consumes: `explainTerm` (T4), `compareContractorOffers`/`compareApartmentSizes` (T6), `validateRange` (T3), `resolveEngineDefaults`/`EngineDefaultsDb` (T5), `ToolResultCard`, `AkifTerm`
- Produces:
  ```ts
  export const AKIF_TOOL_DEFS: OpenAiToolDef[]   // 3 fonksiyon şeması (name/description/parameters)
  export type ToolName = 'explainTerm' | 'compareContractorOffers' | 'compareApartmentSizes'
  export type ValidateResult = { ok: true } | { ok: false; field: string; reason: string }
  export function validateArgs(name: ToolName, args: unknown): ValidateResult
  export interface DispatchDeps { db: EngineDefaultsDb }
  export async function dispatchTool(name: ToolName, args: unknown, deps: DispatchDeps): Promise<ToolResultCard>
  ```
- `AKIF_TOOL_DEFS`: OpenAI Chat Completions `tools` formatı — `{ type: 'function', function: { name, description, parameters: <JSON schema> } }`. Parametreler §3'teki şemalar (`additionalProperties: false`, `required` doğru).
- `validateArgs`:
  - `explainTerm`: `args.term` 7 terimden biri mi.
  - `compareContractorOffers`: `arsaAlani` `validateRange('area')`, `emsal` `validateRange('emsal')`, `muteahhitPaylari` 2–4 eleman & her biri `validateRange('percent')`, `daireBuyuklugu` verilmişse `validateRange('daire')`. İlk hatada `{ ok:false, field, reason }`.
  - `compareApartmentSizes`: benzer + `muteahhitPayi` tekil `validateRange('percent')`, `daireBuyuklukleri` 2–4 & her biri `validateRange('daire')`.
- `dispatchTool`: `validateArgs` geçtiği VARSAYILIR (orchestrator önce çağırır). `explainTerm` → doğrudan. compare* → `resolveEngineDefaults(deps.db)` sonra ilgili fonksiyon.

- [ ] **Step 1: Failing test** — `AKIF_TOOL_DEFS` 3 eleman, isimler doğru; `validateArgs('compareContractorOffers', { arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [50,55] })` → `{ok:true}`; `emsal: 15` → `{ok:false, field:'emsal'}`; `muteahhitPaylari: [50]` (tek) → `{ok:false}`; `dispatchTool('explainTerm', {term:'emsal'}, deps)` → `kind:'term'`; `dispatchTool('compareContractorOffers', ..., { db: fakeDb })` → `kind:'contractor_offers'`.
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): toolRegistry — allowlist + OpenAI şemaları + arg doğrulama + dispatch`)

---

### Task 8: `prompts/` — 7 katman + `assemble.ts`

**Files:**
- Create: `src/lib/ai/akif/prompts/persona.ts`, `domain.ts`, `conversationPolicy.ts`, `toolPolicy.ts`, `safetyPolicy.ts`, `dialect.ts`, `humor.ts`
- Create: `src/lib/ai/akif/prompts/assemble.ts`
- Test: `src/lib/ai/akif/__tests__/prompts.test.ts`

**Interfaces:**
- Produces: her dosya `export const <NAME>_PROMPT = \`...\`` (string sabit); `assemble.ts`:
  ```ts
  export interface PromptContext { hasHistory: boolean }
  export function assembleSystemPrompt(ctx: PromptContext): string
  ```
- İçerik (implementer yazar, spec §3 + vizyon §25-26, §31, §49 rehber):
  - `PERSONA_PROMPT`: vizyon §26 metni ("Sen ArsaBil'in yapay zekâ danışmanı 'Akif Usta'sın...").
  - `DOMAIN_PROMPT`: imar/arsa terminolojisi davranışı; "tahmin / varsayım / doğrulanmış bilgi" ayrımını açıkça belirt (§15).
  - `CONVERSATION_POLICY_PROMPT`: eksik veri varsa tek seferde en gerekli soruyu sor; kısa konuş, ayrıntı isteğe bağlı.
  - `TOOL_POLICY_PROMPT`: hangi niyet → hangi araç (explain_term→explainTerm, karşılaştırma→compare*); **hesabı ASLA kendin yapma, her zaman aracı çağır**; araç sonucu yoksa sonucu varmış gibi tamamlama (§53).
  - `SAFETY_POLICY_PROMPT`: §31 — kesinlik dili yasak ("kesinlikle şu kadar eder" DEME); TAKS/çekme bilinmiyorsa taban oturumu verme; hukuki/vergi tavsiyesi verme.
  - `DIALECT_PROMPT`: ölçülü Karadeniz tonu; HER cümleyi şiveye çevirme; fonetik transkripsiyon yok; etnik kimliği mizah hedefi yapma (§49).
  - `HUMOR_PROMPT`: nadir, hafif; kullanıcıyla ASLA dalga geçme.
- `assembleSystemPrompt`: 7 parçayı sabit sırayla `\n\n---\n\n` ile birleştirir + `ctx.hasHistory` false ise kısa bir "ilk mesaj" notu ekler (opsiyonel).

- [ ] **Step 1: Failing test** — `assembleSystemPrompt({ hasHistory: false })` 7 parçanın anahtar cümlelerini içerir (persona "Akif Usta", tool policy "aracı çağır" vb.); string > 500 char; deterministik (aynı ctx → aynı çıktı).
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): 7 katmanlı sistem-prompt + assemble`)

---

### Task 9: `openaiClient.ts`

**Files:**
- Create: `src/lib/ai/akif/openaiClient.ts`
- Test: `src/lib/ai/akif/__tests__/openaiClient.test.ts`

**Interfaces:**
- Consumes: `openai` paketi (`import OpenAI from 'openai'`); `AKIF_TURN_JSON_SCHEMA` (T2); `AKIF_TOOL_DEFS` (T7)
- Produces:
  ```ts
  export interface AkifModelDeps {
    client: Pick<OpenAI, 'chat'>   // DI — testte sahte
    model: string
  }
  export interface ChatMsg { role: 'system'|'user'|'assistant'|'tool'; content: string; tool_call_id?: string; tool_calls?: unknown[] }
  export interface ChatWithToolsResult {
    kind: 'tool_call' | 'text'
    toolName?: string; toolArgs?: unknown; toolCallId?: string
    text?: string
    usage: { promptTokens: number; completionTokens: number }
  }
  export function createAkifModel(deps: AkifModelDeps): {
    chatWithTools(messages: ChatMsg[]): Promise<ChatWithToolsResult>
    finalStructured(messages: ChatMsg[]): Promise<{ turnRaw: unknown; usage: { promptTokens: number; completionTokens: number } }>
  }
  export function readAkifEnv(env?: NodeJS.ProcessEnv): { apiKey: string; model: string; maxTurnTokens: number; monthlyBudgetUsd: number }
  // apiKey yoksa throw Error('akif_unavailable')
  export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number
  // gpt-4o-mini fiyat tablosu sabiti; bilinmeyen model → kaba üst sınır
  ```
- `chatWithTools`: `client.chat.completions.create({ model, messages, tools: AKIF_TOOL_DEFS, tool_choice: 'auto' })`. Yanıtta `message.tool_calls?.[0]` varsa `kind:'tool_call'` (name + `JSON.parse(arguments)` + id); yoksa `kind:'text'` (`message.content`). `usage` map'lenir.
- `finalStructured`: `client.chat.completions.create({ model, messages, response_format: { type: 'json_schema', json_schema: { name: 'akif_turn', schema: AKIF_TURN_JSON_SCHEMA, strict: true } } })`. `turnRaw = JSON.parse(message.content)`.
- Hata (API throw): yukarı fırlatılır (orchestrator yakalar → route 500). Client RETRY yapmaz (maliyet).

- [ ] **Step 1: Failing test** — sahte `client.chat.completions.create`:
  - tool_calls dönen yanıt → `chatWithTools` `kind:'tool_call'`, `toolName`, `toolArgs` (parse edilmiş), `usage`.
  - content dönen yanıt → `kind:'text'`.
  - `finalStructured` → `turnRaw` = parse edilmiş content; `response_format` argümanı `json_schema` içeriyor.
  - `readAkifEnv({})` → throw `akif_unavailable`; `readAkifEnv({ OPENAI_API_KEY: 'k' })` → `model: 'gpt-4o-mini'` (varsayılan).
  - `estimateCostUsd('gpt-4o-mini', 1000, 500)` → makul küçük pozitif sayı.
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): openaiClient — chatWithTools + finalStructured + maliyet tahmini`)

---

### Task 10: `audit.ts` + `costGuard.ts`

**Files:**
- Create: `src/lib/ai/akif/audit.ts`
- Create: `src/lib/ai/akif/costGuard.ts`
- Test: `src/lib/ai/akif/__tests__/audit.test.ts`, `.../costGuard.test.ts`

**Interfaces:**
- `audit.ts`:
  ```ts
  export interface AuditEntry {
    conversationId: string; turn: number; model: string
    promptTokens: number; completionTokens: number; estCostUsd: number
    intent: string; tool: string | null
  }
  export interface AuditDb { akifTurnLog: { create(a: { data: AuditEntry & { } }): Promise<unknown>; aggregate(a: unknown): Promise<{ _sum: { estCostUsd: number | null } }> } }
  export function createAuditLogger(db: AuditDb): {
    logTurn(entry: AuditEntry): Promise<void>            // create; hata YUTULUR (audit turu düşürmesin) + console.error
    monthSpendUsd(now: Date): Promise<number>            // bu takvim ayı sum(estCostUsd)
  }
  ```
- `costGuard.ts`:
  ```ts
  export function estimateHistoryTokens(messages: { content: string }[]): number   // ~ char/4 kaba
  export function checkConversationBudget(messages: { content: string }[], maxTurnTokens: number): { ok: boolean }
  export interface MonthlyGuardDeps { monthSpendUsd: (now: Date) => Promise<number>; budgetUsd: number; now: () => Date }
  export async function checkMonthlyBudget(deps: MonthlyGuardDeps): Promise<{ ok: boolean; spent: number }>
  ```

- [ ] **Step 1: Failing tests**
  - `audit`: `logTurn` → `create` çağrıldı doğru data ile; `create` throw → `logTurn` resolve (yutulur) + `console.error`; `monthSpendUsd` → `aggregate` `_sum.estCostUsd ?? 0`.
  - `costGuard`: `estimateHistoryTokens` kaba oran; `checkConversationBudget` eşik altı/üstü; `checkMonthlyBudget` bütçe altı → ok:true, aşımı → ok:false.
- [ ] **Step 2-5:** fail → implement → geç → `tsc` + commit (`feat(akif): audit (AkifTurnLog) + costGuard (token tavanı + aylık bütçe)`)

---

### Task 11: `orchestrator.ts` — `runAkifTurn`

**Files:**
- Create: `src/lib/ai/akif/orchestrator.ts`
- Test: `src/lib/ai/akif/__tests__/orchestrator.test.ts`

**Interfaces:**
- Consumes: T2 (`AkifMessage`, `AkifTurn`, `parseAkifTurn`), T3 (`extractNumbers`, `isOutOfRange`), T7 (`AKIF_TOOL_DEFS`, `validateArgs`, `dispatchTool`, `ToolName`), T8 (`assembleSystemPrompt`), T9 (`createAkifModel` output type, `ChatMsg`, `estimateCostUsd`), T10 (audit logger, costGuard)
- Produces:
  ```ts
  export interface RunAkifTurnInput { conversationId: string; history: AkifMessage[]; userMessage: string }
  export interface RunAkifTurnDeps {
    model: ReturnType<typeof import('./openaiClient').createAkifModel>
    modelName: string
    dispatch: (name: ToolName, args: unknown) => Promise<import('./contract').ToolResultCard>
    validateArgs: typeof import('./gateway/toolRegistry').validateArgs
    audit: ReturnType<typeof import('./audit').createAuditLogger>
    checkConversationBudget: (messages: { content: string }[]) => { ok: boolean }
    now: () => Date
  }
  export async function runAkifTurn(input: RunAkifTurnInput, deps: RunAkifTurnDeps): Promise<AkifTurn>
  ```
- Akış (spec §5 — BİREBİR):
  1. `budget = deps.checkConversationBudget([...history mapped, { content: userMessage }])`. `!ok` → `AkifTurn { intent:'out_of_scope', speech:'Konuşmamız uzadı, yeni bir sohbet açalım.', state:'NEUTRAL', facts_used:[], assumptions:[], missing_fields:[], risk_level:'low' }`, audit ('out_of_scope', null, 0 token), return.
  2. `chatMsgs: ChatMsg[]` = `[{ role:'system', content: assembleSystemPrompt({ hasHistory: history.length>0 }) }, ...history.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.content })), { role:'user', content: userMessage }]`.
  3. `r1 = await deps.model.chatWithTools(chatMsgs)`. `usedTokens += r1.usage`.
  4. `toolResult: ToolResultCard | undefined`; `toolName: string | null = null`; `invalidArgNote: string | null = null`.
     - `r1.kind === 'tool_call'`:
       - `v = deps.validateArgs(r1.toolName as ToolName, r1.toolArgs)`.
       - `v.ok` → `toolResult = await deps.dispatch(r1.toolName as ToolName, r1.toolArgs)`; `toolName = r1.toolName`; push `{ role:'assistant', tool_calls:[...] }` + `{ role:'tool', tool_call_id: r1.toolCallId, content: JSON.stringify(toolResult) }` to chatMsgs.
       - `!v.ok` → `invalidArgNote = v.field+': '+v.reason`; push `{ role:'tool', tool_call_id: r1.toolCallId, content: JSON.stringify({ error:'invalid_args', field:v.field, reason:v.reason }) }`.
     - `r1.kind === 'text'` → chatMsgs'e `{ role:'assistant', content: r1.text }` EKLENİR (final çağrının tutarlı üretmesi için); adım 5.
  5. `r2 = await deps.model.finalStructured(chatMsgs)`. `usedTokens += r2.usage`.
  6. `turn = parseAkifTurn(r2.turnRaw)`. `null` → fallback `AkifTurn { intent:'out_of_scope', speech:'Bir sorun oldu, tekrar dener misin?', state:'NEUTRAL', ..., risk_level:'low' }`.
  7. **Sonuç enjeksiyonu:** `if (toolResult) { turn.tool_result = toolResult; if (toolResult.kind !== 'term') { turn.assumptions = [...new Set([...turn.assumptions, ...toolResult.assumptions, ...toolResult.defaultsUsed])] } }` (modelden gelen `tool_result` zaten `parseAkifTurn` tarafından atılmıştı).
  8. `audit.logTurn({ conversationId, turn: Math.floor(history.length / 2) + 1, model: modelName, promptTokens: usedTokens.prompt, completionTokens: usedTokens.completion, estCostUsd: estimateCostUsd(modelName, usedTokens.prompt, usedTokens.completion), intent: turn.intent, tool: toolName })`.
  9. return `turn`.

- [ ] **Step 1: Failing test** — tüm deps sahte:
  - (a) `chatWithTools` → text; `finalStructured` → geçerli explain_term turn → `runAkifTurn` o turu döner, `dispatch` çağrılmadı, audit `intent:'explain_term'`.
  - (b) `chatWithTools` → tool_call `explainTerm`, `validateArgs` ok, `dispatch` → TermCard; final turn → `turn.tool_result` = dispatch sonucu.
  - (c) `chatWithTools` → tool_call `compareContractorOffers` args `emsal:15`, `validateArgs` `{ok:false, field:'emsal'}` → `dispatch` ÇAĞRILMAZ; final turn `intent:'clarify_number'` (model invalid_args görünce) → dönen turda `tool_result` yok.
  - (d) `checkConversationBudget` → `{ok:false}` → `out_of_scope`, model HİÇ çağrılmaz, audit yazılır.
  - (e) `finalStructured` → çöp JSON → `parseAkifTurn` null → fallback turn.
  - (f) compare tool → `turn.assumptions` içine `defaultsUsed` merge edildi.
- [ ] **Step 2-5:** fail → implement → geç → `npx jest --no-coverage "ai/akif"` tümü yeşil + `tsc` → commit (`feat(akif): orchestrator — runAkifTurn tur akışı`)

---

### Task 12: `api/akif/turn/route.ts`

**Files:**
- Create: `src/app/api/akif/turn/route.ts`
- Test: `src/app/api/akif/turn/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `runAkifTurn` (T11), `createAkifModel`/`readAkifEnv` (T9), `createAuditLogger` (T10), `checkConversationBudget`/`checkMonthlyBudget` (T10), `dispatchTool`/`validateArgs` (T7), `checkRateLimit`/`getClientIp`/`RATE_LIMITS` (`@/lib/rate-limit`), `prisma`, `OpenAI` (`openai`)
- Produces: `POST(req: Request): Promise<Response>`; `export const runtime = 'nodejs'`

**Davranış:**
1. Rate limit: `checkRateLimit('akif:ip:'+getClientIp(req), RATE_LIMITS.AKIF_TURN)` → `!ok` → `429 { error:'rate_limited' }` + `Retry-After`.
2. Gövde parse: `{ conversationId: string, history: AkifMessage[], userMessage: string }`. Doğrulama: `conversationId` non-empty string; `history` dizi, ≤ 40, her eleman `{ role:'user'|'akif', content: string }`; `userMessage` string 1–2000. Geçersiz → `400 { error:'bad_request' }`.
3. `let env; try { env = readAkifEnv() } catch { return 503 { error:'akif_unavailable' } }`.
4. Aylık bütçe: `const audit = createAuditLogger(prisma); const mb = await checkMonthlyBudget({ monthSpendUsd: audit.monthSpendUsd, budgetUsd: env.monthlyBudgetUsd, now: () => new Date() })`. `!mb.ok` → `503 { error:'akif_unavailable', reason:'monthly_budget' }`.
5. `const openai = new OpenAI({ apiKey: env.apiKey }); const model = createAkifModel({ client: openai, model: env.model })`.
6. `try { const turn = await runAkifTurn({ conversationId, history, userMessage }, { model, modelName: env.model, dispatch: (n,a) => dispatchTool(n,a,{ db: prisma }), validateArgs, audit, checkConversationBudget: (m) => checkConversationBudget(m, env.maxTurnTokens), now: () => new Date() }); return Response.json(turn) } catch (e) { console.error('[akif] turn', e); return Response.json({ error:'akif_error' }, { status: 502 }) }`.

- [ ] **Step 1: Failing test** — mock `openai`, `@/lib/ai/akif/orchestrator` (`runAkifTurn`), `@/lib/ai/akif/openaiClient` (`readAkifEnv`), `@/lib/prisma`, `@/lib/rate-limit`:
  - geçerli POST → 200, `runAkifTurn` çağrıldı, dönen turn JSON.
  - `readAkifEnv` throw → 503 `akif_unavailable`.
  - `history` 50 eleman → 400.
  - `userMessage` boş → 400.
  - rate limit aşıldı → 429.
  - `runAkifTurn` throw → 502.
- [ ] **Step 2: fail** → `npx jest --no-coverage "akif/turn"`
- [ ] **Step 3: `route.ts` yaz**
- [ ] **Step 4:** geç
- [ ] **Step 5:** `npx tsc --noEmit` + `npm run build` (`/api/akif/turn` route listede) + `npx jest --no-coverage "ai/akif|akif/turn"` tümü yeşil
- [ ] **Step 6: Commit** (`feat(akif): /api/akif/turn route — env guard + bütçe + orchestrator bağlama`)

---

## Final doğrulama (bu plan bitince)

- [ ] `npx tsc --noEmit` temiz
- [ ] `npx jest --no-coverage --roots "<rootDir>/src"` — TÜM proje yeşil
- [ ] `npm run build` temiz, `/api/akif/turn` route çıktıda
- [ ] Migration `20260902090000_add_akif_turn_log` dev DB'de; prod BEKLEMEDE
- [ ] Whole-branch review (SDD final review)
- [ ] `.env.example`/README'ye env notu: `OPENAI_API_KEY` (zorunlu), `AKIF_MODEL`, `AKIF_MAX_TURN_TOKENS`, `AKIF_MONTHLY_BUDGET_USD`, `AKIF_EVAL_BUDGET_USD`

**Deploy DIŞI.** Plan 2 (`/akif` sayfası + `src/components/akif/` + eval harness) ayrı plan olarak yazılacak.

## v1 kalıntıları (ledger'a)

- `emsal` motora doğrudan girmiyor — v1'de yalnız `emsalNote`/`assumptions` bilgilendirmesi; motor `Aa` (arsa alanı) üzerinden. Emsal→toplam-daire türetimi ileri faz.
- Stateless — uzun sohbette tüm geçmiş yeniden gönderilir; `costGuard` turu keser; özet-sıkıştırma = Akif-3.
- `response_format json_schema` `gpt-4o-mini`'de çalışıyor; model değişirse `openaiClient` fallback gerekebilir.
- `engineDefaults` / `numberSafety` `@/app/hesapla/*`'tan import (lib→app) — tek kaynak korumak için tercih; alternatif kopyalama.
- Eval harness bu planda YOK (Plan 2) — model kalitesi deploy öncesi elle ölçülecek.
- Rate limit + bütçe guard bellek-içi/tek-instance (5a/5b ile aynı).
