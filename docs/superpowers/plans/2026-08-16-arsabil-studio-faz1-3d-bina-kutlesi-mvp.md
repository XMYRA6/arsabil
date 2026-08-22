# Arsabil Studio — Faz 1 3D Bina Kutlesi MVP Plani

> **For agentic workers:** Start only after Faz 0 has a tested Studio massing contract. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OpenMap3D benzeri, browser icinde calisan ilk Arsabil Studio deneyimini uretmek: parsel/footprint uzerinden extrude edilmis kaba bina kutlesi, orbit kontrolu, kat bantlari ve hesaplama verisine dayali uyari/ozet paneli.

**Architecture:** `react-three-fiber` scene only renders `BuildingMass`. It does not calculate feasibility. Geometry preparation lives in `src/lib/studio/*`; UI lives under the `hesapla` page or a colocated Studio component tree.

**Tech Stack:** Next.js, React, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, Jest for pure geometry tests, Playwright for visual smoke if a browser scene is added.

**Reference:** OpenMap3D-style approach: 3D buildings generated in browser with React Three Fiber from map/footprint data. Arsabil adaptation uses project feasibility data instead of rendering a generic city map.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-3d-mvp-design.md`

## Global Constraints

- Do not build a full city map.
- Do not fetch OSM/Overpass data in the first MVP.
- Do not introduce AR, native mobile, furniture assets or interior editor code.
- Rendering must be optional/client-only; SSR must not crash.
- The page must degrade gracefully if WebGL is unavailable.
- Keep the first visual language utilitarian: parcel base plane, proposed mass, floor bands, labels, warning panel.

---

### Task 1: Dependency and client boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Add: `src/components/studio/StudioPreview.tsx`
- Add: `src/components/studio/StudioPreview.module.css`

**Interfaces:**
- Consumes: `BuildingMass`
- Produces: client-only preview boundary.

- [x] **Step 1: Add dependencies**

Install:

```powershell
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

- [x] **Step 2: Client boundary component**

`StudioPreview.tsx` starts with `"use client"` and accepts `mass: BuildingMass | null`.

If `mass` is null, render a non-WebGL empty state with the warnings from Faz 0 where available.

- [x] **Step 3: SSR guard**

Ensure no `window` access happens outside React/client lifecycle.

---

### Task 2: 3D mass scene

**Files:**
- Add: `src/components/studio/StudioScene.tsx`
- Add: `src/components/studio/buildMassGeometry.ts`
- Add: `src/components/studio/buildMassGeometry.test.ts`

**Interfaces:**
- Consumes: `BuildingMass`
- Produces: Three.js shape/extrusion data.

- [x] **Step 1: Pure geometry conversion tests**

Test polygon points convert into a closed shape and preserve coordinate order.

- [x] **Step 2: Implement geometry helper**

Build a `THREE.Shape` from `mass.footprint.points`; use `ExtrudeGeometry` or a simple prism mesh path.

- [x] **Step 3: Scene component**

Render base grid/parcel plane, extruded mass, simple edges/wireframe, ambient + directional light, camera and orbit controls.

- [x] **Step 4: Floor bands**

Add optional horizontal visual bands based on `mass.floorCount`. Keep them lightweight; no complex boolean geometry.

---

### Task 3: Hesapla integration

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css`
- Possibly add: `src/app/hesapla/StudioPanel.tsx`
- Add/update tests as appropriate.

**Interfaces:**
- Consumes: existing calculator state + Faz 0 adapter.
- Produces: `3D Onizleme` section/tab.

- [x] **Step 1: Locate current tab/section structure**

Read `src/app/hesapla/page.tsx` and mobile/desktop page module patterns before editing.

- [x] **Step 2: Add inactive-safe panel**

The Studio panel should not render a heavy Canvas until selected/visible.

- [x] **Step 3: Wire adapter**

Use Faz 0 `createStudioMassingInput` + `deriveBuildingMass`; pass result into `StudioPreview`.

- [x] **Step 4: Warning copy**

If geometry or gross area is missing, show a clear message: `3D onizleme icin parsel geometrisi ve insaat alani gerekiyor. Bu senaryoda eksik veri var.`

---

### Task 4: Visual and interaction polish

**Files:**
- Modify: `src/components/studio/StudioPreview.module.css`
- Modify: `src/app/hesapla/page.module.css`

- [x] **Step 1: Stable container sizing**

Canvas container must have fixed responsive min-height and aspect ratio so the page does not jump.

- [x] **Step 2: Controls**

Add small controls for reset view, mass/wireframe toggle and floor bands toggle.

- [x] **Step 3: Accessibility fallback**

Canvas area has an accessible textual summary next to or below it: estimated floors, estimated height, gross construction area and warnings.

---

### Task 5: Testing and verification

- [x] **Step 1: Unit tests**

Run: `npx jest src/lib/studio src/components/studio`

- [x] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [x] **Step 3: Browser smoke**

Start dev server and inspect `/hesapla`.

Expected:

- no SSR crash.
- Canvas renders nonblank on desktop.
- empty/warning state renders when geometry is missing.
- page remains usable on mobile viewport.

- [x] **Step 4: Screenshot artifacts**

Save desktop and mobile screenshots under `output/playwright/` only if Playwright verification is performed.

---

## Dispatch Notes

This phase is intentionally not AR and not interior design. It is the smallest Studio slice that can prove whether users value a visual massing preview. If this is useful, Faz 2 should add the 2D Studio editor-lite layer; if not, avoid funding the much larger Roomstyler-style branch.


## Validation Notes

- Existing Studio Faz 0 contracts verified in `src/lib/studio/*`; adapter currently derives `grossConstructionAreaM2` from `Sd * Ad` unless an authoritative value is supplied.
- Added `StudioPreview` reset-view control and component tests for empty state, toggles, source notes and summary metrics.
- `npx jest src/lib/studio src/components/studio --no-coverage --roots "<rootDir>/src"` PASS: 7 suites / 18 tests.
- `npx tsc --noEmit` PASS.
- `npm run build` PASS. Existing Next workspace-root and middleware/proxy warnings remain.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 174 suites / 1361 tests.
- `node output/playwright/studio-faz1-smoke.cjs` PASS. Desktop `/hesapla` after `Örnek Proje ile Dene`: Canvas present, 874x520, `canvasUniqueColors=126`, no horizontal overflow. Mobile `/hesapla`: no horizontal overflow. Screenshots saved under `output/playwright/`.
- Playwright dev-server logs included transient DB connection errors for settings endpoints when local Postgres was unavailable; page-level Studio smoke still rendered and passed using existing fallbacks.
