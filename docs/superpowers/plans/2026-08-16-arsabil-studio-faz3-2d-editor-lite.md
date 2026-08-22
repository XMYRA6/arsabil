# Arsabil Studio — Faz 3 2D Editor Lite Plani

> **For agentic workers:** Start after Faz 0 data contracts. Best after Faz 1/Faz 2 exist, because the editor should update massing and program state. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TKGM parsel geometrisi ve hesap sonucunu kullanarak Studio icinde kontrollu bir 2D planlama panosu olusturmak: parsel siniri, bina oturumu, zemin dukkan bandi ve 2+1/3+1 program alanlari.

**Architecture:** The editor manipulates a serializable `StudioLayoutDraft`. It does not own feasibility rules. It calls pure geometry/program helpers, then updates `StudioSnapshotDraft`.

**Tech Stack:** React, TypeScript, CSS Modules, SVG-first for MVP. Konva spike only if direct manipulation outgrows SVG.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-2d-editor-lite-design.md`

## Global Constraints

- Do not build freeform CAD.
- Do not modify official TKGM parcel geometry; only create proposal overlays.
- Do not require 3D/WebGL to use the 2D panel.
- All layout state must be serializable.
- Touch targets must remain usable on mobile, but advanced editing may be desktop-first in this phase.

---

### Task 1: Layout draft domain model

**Files:**
- Add: `src/lib/studio/layoutDraft.ts`
- Add: `src/lib/studio/layoutDraft.test.ts`
- Modify: `src/lib/studio/types.ts`

**Interfaces:**
- Produces:
  - `StudioLayoutDraft`
  - `FootprintDraft`
  - `ProgramBandDraft`
  - `createDefaultLayoutDraft(...)`

- [ ] **Step 1: Types**

Represent:

- parcel polygon reference;
- proposed footprint polygon;
- optional setback assumptions;
- commercial base band;
- residential bands mapped to program mix ids.

- [ ] **Step 2: Default draft**

Given a valid parcel polygon and building mass, create a conservative default draft using the parcel as a reference and a generated footprint placeholder.

- [ ] **Step 3: Tests**

Cover valid geometry, missing parcel geometry and invalid/too-small footprint.

---

### Task 2: Geometry utility layer

**Files:**
- Add: `src/lib/studio/geometry2d.ts`
- Add: `src/lib/studio/geometry2d.test.ts`

**Interfaces:**
- Produces helpers for polygon bounds, centroid, scale-to-fit and simple area checks.

- [ ] **Step 1: Pure tests**

Test:

- bounds calculation;
- centroid approximation;
- fit-to-viewBox transform;
- area warning for zero/invalid polygon.

- [ ] **Step 2: Implement helpers**

Keep math simple and deterministic. No rendering dependency.

---

### Task 3: 2D preview component

**Files:**
- Add: `src/components/studio/Studio2DPreview.tsx`
- Add: `src/components/studio/Studio2DPreview.module.css`
- Add: `src/components/studio/Studio2DPreview.test.tsx`

**Interfaces:**
- Consumes: `StudioLayoutDraft`, `ProgramMixItem[]`
- Produces: read-only SVG preview first.

- [ ] **Step 1: Read-only SVG MVP**

Render:

- parcel boundary;
- proposed footprint;
- ground-floor commercial band marker;
- residential program color legend;
- warnings/empty state.

- [ ] **Step 2: Stable sizing**

Container must not jump. Use fixed responsive aspect ratio and clear min-height.

- [ ] **Step 3: Component tests**

Test empty state and basic labels/legend.

---

### Task 4: Controlled editing controls

**Files:**
- Add: `src/components/studio/StudioLayoutControls.tsx`
- Add: `src/components/studio/StudioLayoutControls.module.css`
- Add/update tests.

**Interfaces:**
- Produces controlled updates to `StudioLayoutDraft`.

- [ ] **Step 1: Controls**

Add controls for:

- footprint scale / coverage assumption;
- ground-floor commercial toggle;
- commercial frontage/area assumption;
- residential split selector linked to program mix.

- [ ] **Step 2: No blank-canvas editing**

Use numeric controls, segmented controls and sliders first. Direct drag handles can be a later enhancement.

- [ ] **Step 3: Warnings**

Show warnings inline when area/program assumptions exceed feasibility limits.

---

### Task 5: Integration with Studio snapshot

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`
- Modify Studio panel files if Faz 1 UI exists.

- [ ] **Step 1: Snapshot field**

Add `layoutDraft` to `StudioSnapshotDraft`.

- [ ] **Step 2: Roundtrip test**

Ensure layout draft survives JSON serialization.

- [ ] **Step 3: Future UI hook**

If Studio UI exists, add a dormant/read-only `2D Plan` panel that consumes existing demo/default draft.

---

### Task 6: Verification

- [ ] **Step 1: Tests**

Run:

```powershell
npx jest src/lib/studio src/components/studio
```

- [ ] **Step 2: Typecheck**

Run:

```powershell
npx tsc --noEmit
```

---

## Dispatch Notes

This phase should feel like a professional proposal board, not a drawing toy. The key win is that a verified parcel becomes a visual scenario surface: footprint, shop band, residential split and warnings in one disciplined view.

