# Arsabil Studio — Faz 0 Veri ve Mimari Hazirlik Plani

> **For agentic workers:** Implement this before the 3D scene. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arsabil Studio 3D MVP'sine baslamadan once hesaplama sonucu, parsel geometrisi ve bina kutlesi arasindaki veri sozlesmesini netlestirmek. Bu faz goruntu uretmez; WebGL/Three.js eklemez. Amac, 3D sahnenin tuketecegi saf TypeScript katmanini ve testlerini hazirlamaktir.

**Architecture:** Rendering code feasibility kurallarini tekrar hesaplamaz. `hesapla` girdileri ve calculator sonucu once saf bir `studio` adapter katmanina girer; bu katman `StudioMassingInput`, `BuildingMass`, `StudioWarning` ve ileride `StudioSnapshot` tarafindan kullanilacak karar verisini uretir.

**Tech Stack:** TypeScript, Jest, existing calculator/report types, GeoJSON-compatible polygon contract. No WebGL dependency in this phase.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

**Implementation status (2026-08-16):** Implemented. Targeted Jest and TypeScript checks pass. Current MVP adapter derives `grossConstructionAreaM2` from `Sd * Ad` because `engine_v2` does not yet expose a separate authoritative gross-construction-area / emsal-derived buildable-area field.

## Global Constraints

- Bu fazda `three`, `@react-three/fiber`, `@react-three/drei`, Konva veya Fabric dependency'si eklenmez.
- UI minimum tutulur; gerekirse yalnizca internal/dev-facing data guard eklenir.
- Calculator davranisi degistirilmez; Studio adapter mevcut sonucu tuketir.
- Emsal verisi eksikse adapter bunu sessizce uydurmaz, warning uretir.
- Geometri hesaplari saf fonksiyon olarak test edilir; React component icinde is kurali yazilmaz.

---

### Task 1: Studio domain tipleri

**Files:**
- Add: `src/lib/studio/types.ts`
- Add: `src/lib/studio/types.test.ts`

**Interfaces:**
- Produces: `StudioPoint`, `StudioPolygon`, `StudioMassingInput`, `BuildingMass`, `StudioWarning`, `StudioSnapshotDraft`

- [x] **Step 1: Tipleri ekle**

`src/lib/studio/types.ts` dosyasinda UI'dan bagimsiz tipler tanimlanir. Runtime bagimliligi olmamalidir.

- [x] **Step 2: Type-level smoke test ekle**

Export edilen tiplerin import edilebilir oldugunu kanitlayan kucuk bir test eklenir.

- [x] **Step 3: Testi calistir**

Run: `npx jest src/lib/studio/types.test.ts`

---

### Task 2: Bina kutlesi turetme fonksiyonu

**Files:**
- Add: `src/lib/studio/massing.ts`
- Add: `src/lib/studio/massing.test.ts`

**Interfaces:**
- Produces: `deriveBuildingMass(input: StudioMassingInput): BuildingMass | null`

- [x] **Step 1: Failing tests yaz**

Test cases:

- valid polygon + gross construction area + floor count returns mass with height.
- missing gross construction area returns explicit warning/null.
- invalid parcel area returns `INVALID_AREA` warning.
- missing geometry returns `MISSING_GEOMETRY` warning.

- [x] **Step 2: Pure function implement et**

Rules:

- default `floorHeightM = 3.2`.
- if `assumedFloorCount` exists, height = `assumedFloorCount * floorHeightM`.
- if floor count is missing but gross area and parcel area exist, first version may estimate floor count as `ceil(grossConstructionAreaM2 / parcelAreaM2)`.
- never return negative or zero height.
- warnings are explicit and serializable.

- [x] **Step 3: Testleri yesile al**

Run: `npx jest src/lib/studio/massing.test.ts`

---

### Task 3: Calculator sonucundan Studio input adapter'i

**Files:**
- Add: `src/lib/studio/calculatorAdapter.ts`
- Add: `src/lib/studio/calculatorAdapter.test.ts`
- Possibly modify: calculator result type exports if needed, without changing calculator behavior.

**Interfaces:**
- Produces: `createStudioMassingInput(args): StudioMassingInput`

- [x] **Step 1: Mevcut calculator result alanlarini oku**

`src/lib/calculator/engine_v2.ts`, `src/app/hesapla/page.tsx` ve ilgili testlerde gross area / apartment area / parcel area alanlari incelenir.

- [x] **Step 2: Adapter testlerini yaz**

Test cases:

- hesaplama sonucu varsa gross construction area Studio input'a akar.
- parsel geometrisi yoksa input yine uretilir ama geometry warning sonraki katmanda cikar.
- UI mock emsal verisi dogrudan kaynak kabul edilmez; veri sozlesmesi acik degilse adapter testte bunu belgeleyen bir warning yolu kullanir.

- [x] **Step 3: Adapter'i implement et**

Adapter, hesaplama motorunu degistirmez; sadece mevcut sonucu Studio sozlesmesine cevirir.

- [x] **Step 4: Testleri calistir**

Run: `npx jest src/lib/studio/calculatorAdapter.test.ts src/lib/studio/massing.test.ts`

---

### Task 4: Studio snapshot taslagi

**Files:**
- Add: `src/lib/studio/snapshot.ts`
- Add: `src/lib/studio/snapshot.test.ts`

**Interfaces:**
- Produces: `createStudioSnapshotDraft(...)`

- [x] **Step 1: Snapshot sozlesmesini yaz**

Snapshot schema version, source calculator/report id, `massingInput`, `buildingMass`, warnings ve test icin inject edilebilir timestamp tasir.

- [x] **Step 2: Serialization testleri**

Snapshot `JSON.stringify` / `JSON.parse` roundtrip'ten gecmelidir.

- [x] **Step 3: Implementasyon**

No UI. No DB migration yet. This is a draft contract for Faz 4 persistence.

---

### Task 5: Phase verification

- [x] **Step 1: Targeted tests**

Run: `npx jest src/lib/studio`

- [x] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [x] **Step 3: Decision log**

If the current calculator does not expose a reliable gross construction area / emsal-derived field, document the exact missing field at the top of the Faz 1 plan before dispatching 3D rendering work.

