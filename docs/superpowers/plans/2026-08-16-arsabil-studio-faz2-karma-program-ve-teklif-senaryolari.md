# Arsabil Studio — Faz 2 Karma Program ve Teklif Senaryolari Plani

> **For agentic workers:** Start after Faz 0 data contracts exist. This phase may run before or after the first 3D scene, but the best product experience comes when Faz 1 can color the mass by program. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio'yu sadece "bina kutlesi gosterici" olmaktan cikarip gercek proje prototipine cevirmek: 2+1 / 3+1 daire bolgeleri, zemin kat kiralik dukkanlar ve arsa sahibi icin daire + nakit dengeleme teklif senaryolari.

**Architecture:** Program and offer calculations live in pure `src/lib/studio/*` modules. The 3D/2D UI only visualizes the result. No legal-contract wording is generated; the feature produces proposal scenarios and feasibility summaries.

**Tech Stack:** TypeScript, Jest, existing calculator/report model, future integration with `BuildingMass` and `StudioSnapshot`.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-karma-program-ve-teklif-senaryolari-design.md`

## Global Constraints

- This phase does not build a full CAD planner.
- This phase does not create a binding legal offer/contract generator.
- Commercial ground-floor value assumptions must be explicit, not hidden constants.
- Fractional arsa payi handling must be transparent; never silently round.
- UI copy must use proposal language: "senaryo", "on teklif", "denge odemesi", not final legal commitment.

---

### Task 1: Program mix domain model

**Files:**
- Add: `src/lib/studio/programMix.ts`
- Add: `src/lib/studio/programMix.test.ts`
- Modify: `src/lib/studio/types.ts`

**Interfaces:**
- Produces:
  - `ProgramUse = 'residential' | 'commercial' | 'parking' | 'common'`
  - `ResidentialUnitType = '1+1' | '2+1' | '3+1' | '4+1' | 'custom'`
  - `ProgramMixItem`
  - `summarizeProgramMix(items)`

- [x] **Step 1: Types and tests**

Represent:

- ground-floor shop/commercial band;
- `2+1` and `3+1` residential blocks;
- optional common/parking bands;
- area, count and floor allocation.

- [x] **Step 2: Validation rules**

Validate that total assigned gross/sellable area does not exceed the available construction area from `BuildingMass`.

- [x] **Step 3: Summary output**

Produce a serializable summary:

- residential unit count by type;
- commercial unit count and area;
- total allocated area;
- remaining/unassigned area;
- warnings.

---

### Task 2: Ground-floor commercial/rental shop scenario

**Files:**
- Add: `src/lib/studio/commercialScenario.ts`
- Add: `src/lib/studio/commercialScenario.test.ts`

**Interfaces:**
- Produces: commercial scenario summary for Studio and offer calculations.

- [x] **Step 1: Inputs**

Support:

- shop count;
- average shop area;
- rent estimate or sales value estimate;
- owner/developer allocation flag if needed later.

- [x] **Step 2: Explicit assumptions**

If commercial rent/value is missing, return a warning and still allow the massing/program view to render.

- [x] **Step 3: Tests**

Cover:

- valid shop band;
- missing rent/value assumption;
- commercial area exceeding available ground-floor area.

---

### Task 3: Arsa payi entitlement calculator

**Files:**
- Add: `src/lib/studio/landownerOffer.ts`
- Add: `src/lib/studio/landownerOffer.test.ts`

**Interfaces:**
- Produces:
  - `calculateLandownerEntitlement(...)`
  - `createLandownerOfferOptions(...)`

- [x] **Step 1: Base entitlement**

Given arsa payi / share result and total unit inventory, calculate entitled unit count including fractional balance.

Example:

- calculated entitlement: `9.2` units.
- whole units: `9`.
- fractional balance: `0.2`.

- [x] **Step 2: Offer options**

Generate transparent options:

- `9 daire + 0.2 pay icin nakit dengeleme`.
- `10 daire verilir, fazla 0.8 pay nakit/mahsup ile dengelenir`.
- `custom daire + direkt odeme` option where user can override counts and cash.

- [x] **Step 3: Area/value basis**

Cash equalization must be based on an explicit unit value or m2 value input. If missing, return an "assumption required" warning.

- [x] **Step 4: Tests**

Cover exact integer entitlement, fractional entitlement, missing value basis and custom override.

---

### Task 4: Studio snapshot extension

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`
- Modify: `src/lib/studio/types.ts`

**Interfaces:**
- Adds `programMix` and `landownerOffer` to `StudioSnapshotDraft`.

- [x] **Step 1: Extend snapshot schema**

Include:

- `programMix`;
- `programSummary`;
- selected `landownerOffer`;
- generated offer options;
- warnings.

- [x] **Step 2: Roundtrip tests**

Ensure snapshot stays JSON serializable.

---

### Task 5: UI planning hooks for future implementation

**Files:**
- No required UI edits in this phase unless Faz 1 Studio panel already exists.

- [x] **Step 1: Define intended UI panels**

Document the panels a future UI must expose:

**1. Program Dağılımı** (data source: `summarizeProgramMix` + `summarizeCommercialScenario`)
- Girdi formu: her `ProgramMixItem` için use/residentialType/unitCount/unitAreaM2/floorAllocation; zemin dükkan bandı için ayrıca shopCount/averageShopAreaM2/valueBasis.
- Çıktı: `residentialUnitCountByType` dağılımı (basit bar/liste), `commercialAreaM2`, `totalAllocatedAreaM2` vs `BuildingMass.grossConstructionAreaM2` karşılaştırması (kalan/aşım göstergesi).
- Faz1B'nin token deseniyle aynı ruh: her daire tipi + ticari için `studioVisualTokens.ts`'teki `STUDIO_PROGRAM_COLOR_SLOTS`'tan sabit bir renk ataması (Faz1B Task 2 bullet 4'te tam bunun için ayrılmıştı).

**2. Teklif Senaryoları** (data source: `calculateLandownerEntitlement` + `createLandownerOfferOptions`)
- Arsa payı oranı ve toplam daire envanterinden türeyen hak ediş (`entitledUnitCount`, kesirli kısım gizlenmez).
- `options` listesi kart/liste olarak: her biri `label` (spec dili: "senaryo", "ön teklif" — kesin sözleşme değil), `wholeUnitCount`, `cashEqualizationTl` (null ise "varsayım gerekli" rozetiyle).
- Kullanıcı "Özel teklif" için `customOverride` girip üçüncü bir seçenek ekleyebilir.

**3. 3D Kütle — program renkli** (mevcut `StudioScene.tsx`'i genişletir)
- Her `ProgramMixItem`in `floorAllocation`ına göre kat bantlarını `STUDIO_PROGRAM_COLOR_SLOTS`tan bir renkle boyar (şu an tüm bantlar tek renk `STUDIO_SCENE_COLORS.floorBand`).
- Renderer program/teklif hesabı YAPMAZ (Global Constraint) — yalnızca zaten hesaplanmış `ProgramMixItem[]`i görselleştirir.

- [x] **Step 2: Empty/missing-data states**

Every panel must support missing TKGM geometry, missing commercial value and missing unit value assumptions without crashing.

- Program Dağılımı: `mass === null` iken (Faz1B'deki `StudioPreview`'in `!mass` dalıyla aynı desen) formu devre dışı bırakmaz, sadece "kütle hesaplanınca alan karşılaştırması aktifleşir" notunu gösterir.
- Zemin dükkan değer varsayımı eksikse (`MISSING_COMMERCIAL_VALUE_ASSUMPTION`) alan/adet gösterilmeye devam eder, yalnızca TL tahmini "—" ile "varsayım gerekli" notu alır (Faz1B'deki uyarı-bandı deseniyle aynı, canvas'ı/paneli kaplamaz).
- Birim değer varsayımı eksikse (`MISSING_UNIT_VALUE_BASIS`) daire sayısı seçenekleri (round-down/round-up) yine gösterilir, yalnızca `cashEqualizationTl` alanları "—" olur.
- Hiçbir eksik-veri durumu paneli tamamen gizlemez veya sayfayı çökertmez — bu, `src/lib/studio/*` katmanındaki testlerde zaten doğrulandı (bkz. Task 1-4).

---

### Task 6: Verification

- [x] **Step 1: Targeted tests**

Run:

```powershell
npx jest src/lib/studio
```

- [x] **Step 2: Typecheck**

Run:

```powershell
npx tsc --noEmit
```

---

## Dispatch Notes

This phase is the business-value bridge. The premium moment is not merely seeing a 3D block; it is seeing "bu arsaya su program oturuyor, zemin dukkanlar su degeri uretiyor, arsa sahibine su teklif senaryolari cikiyor" in one coherent Studio flow.

## Validation Notes

- `programMix.ts`: `summarizeProgramMix(items, availableAreaM2)` — konut tipine göre daire sayısını toplar, ticari alan/adet ayrı sayılır, ortak/otopark alana dahil ama sayaçlara karışmaz. Aşım `PROGRAM_AREA_EXCEEDS_AVAILABLE` uyarısıyla döner, `remainingAreaM2` negatif olabilir — sessizce kırpılmaz.
- `commercialScenario.ts`: `summarizeCommercialScenario(...)` — kira/satış bazlı iki değer varsayımını destekler; varsayım eksikse `MISSING_COMMERCIAL_VALUE_ASSUMPTION` uyarısıyla alan hesabı yine döner (bloklamaz).
- `landownerOffer.ts`: `calculateLandownerEntitlement(shareRatio, totalUnitCount)` kesirli hak edişi (örn. `9.2`) kayan-nokta gürültüsü sızdırmadan (1e6 hassasiyetle yuvarlanmış) döner. `createLandownerOfferOptions(...)` tam sayı hak edişte tek seçenek, kesirli hak edişte "aşağı yuvarla + nakit al" / "yukarı yuvarla + nakit öde" iki seçenek, `unitValueTl` eksikse `MISSING_UNIT_VALUE_BASIS` uyarısıyla yalnızca nakit alanları `null`; `customOverride` verilirse üçüncü "Özel teklif" seçeneği aynen eklenir.
- `snapshot.ts`: `StudioSnapshotDraft` artık opsiyonel `programMix`/`programSummary`/`landownerOffer` taşıyor; alt uyarıları üst seviye `warnings`e katılıyor ama `buildingMass.warnings` yalnızca geometri/kütle konusunda kalıyor (karışmadı — testte ayrıca doğrulandı). JSON roundtrip korunuyor.
- Task 5 (UI planning): üç panel (Program Dağılımı, Teklif Senaryoları, program-renkli 3D Kütle) ve boş/eksik-veri davranışları plan dosyasının kendi içinde belgelendi — bu fazda gerçek UI kodu yazılmadı (plan metninin kendisi: "No required UI edits in this phase").
- `npx jest src/lib/studio --no-coverage --roots "<rootDir>/src"` PASS: 9 suite / 46 test (yeni: 21 test — programMix 5, commercialScenario 5, landownerOffer 6, snapshot +2, mevcutlar 3).
- `npx jest src/components/studio src/lib/studio` PASS: 22 suite / 104 test (Faz1B'den kalanlarla birlikte, hiçbir regresyon yok).
- `npx tsc --noEmit` PASS.
- `npm run build` PASS.
- Bu faz saf `src/lib/studio/*` katmanında kaldığı için Playwright tarayıcı smoke'u gerekmiyor (Task 5'in kendisi "bu fazda UI kodu yok" diyor) — Faz 2A/2B UI'yı gerçekten bağladığında canlı QA gerekecek.

