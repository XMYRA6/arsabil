# Arsabil Studio — Faz 4 Raporlama ve Paylasim Plani

> **For agentic workers:** Start after Studio snapshot, program mix and offer scenario contracts exist. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio'da uretilen senaryoyu kaydedilebilir, tekrar acilabilir, rapora girebilir ve paylasilabilir bir teklif/prototip artefaktina cevirmek.

**Architecture:** `StudioSnapshot` becomes the durable source. Reports, thumbnails and share summaries consume snapshot data; they do not recalculate business logic independently.

**Tech Stack:** TypeScript, Prisma if persistence is added, existing report/PDF flow, React components for snapshot summary, Playwright for visual verification if thumbnails/screenshots are generated.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-rapor-paylasim-design.md`

## Global Constraints

- Do not generate legal contracts.
- Do not hide warnings during export.
- Do not create a second calculation path for reports.
- Do not require WebGL rendering on the server.
- Snapshot schema must be versioned for future migrations.

---

### Task 1: Durable Studio snapshot schema

**Files:**
- Modify: `src/lib/studio/snapshot.ts`
- Modify: `src/lib/studio/snapshot.test.ts`
- Possibly modify: `prisma/schema.prisma` if DB persistence is in scope.

**Interfaces:**
- Produces versioned `StudioSnapshot`.

- [ ] **Step 1: Finalize fields**

Include:

- `schemaVersion`;
- parcel identity and verification status;
- massing input and building mass;
- program mix and summary;
- landowner offer options and selected offer;
- 2D layout draft;
- assumptions and warnings.

- [ ] **Step 2: Migration decision**

Decide whether first persistence lives inside existing `Report`/`Scenario` JSON or a new relation. Prefer JSON for MVP unless query needs demand a relation.

- [ ] **Step 3: Serialization tests**

Roundtrip realistic snapshots.

---

### Task 2: Scenario summary component

**Files:**
- Add: `src/components/studio/StudioScenarioSummary.tsx`
- Add: `src/components/studio/StudioScenarioSummary.module.css`
- Add: `src/components/studio/StudioScenarioSummary.test.tsx`

**Interfaces:**
- Consumes: `StudioSnapshot`
- Produces readable summary for report/dashboard/share surfaces.

- [ ] **Step 1: Summary sections**

Render:

- parcel;
- feasibility;
- program mix;
- landowner offer;
- warnings.

- [ ] **Step 2: Copy discipline**

Use "senaryo", "varsayim", "on teklif", "denge odemesi" language.

- [ ] **Step 3: Tests**

Cover normal snapshot and missing-assumption warning state.

---

### Task 3: Report/PDF integration

**Files:**
- Inspect and possibly modify: `src/lib/pdf/*`
- Inspect and possibly modify: dashboard report pages.
- Add tests where current PDF/report test patterns allow.

- [ ] **Step 1: Existing report flow audit**

Read current saved report/PDF generator and identify where Studio summary can be inserted.

- [ ] **Step 2: Add Studio section**

Add optional report section only when snapshot exists:

- 2D/3D thumbnail placeholder or generated image path;
- program and offer summary;
- assumptions/warnings.

- [ ] **Step 3: Test/report smoke**

Run targeted report tests.

---

### Task 4: Shareable proposal route

**Files:**
- Possibly add: `src/app/studio/share/[token]/page.tsx`
- Possibly add: API route for token generation, following existing compare/share patterns.

- [ ] **Step 1: Inspect existing compare share route**

Use the existing `compare/[token]` and `api/compare/share` patterns if they fit.

- [ ] **Step 2: Minimal share page**

Read-only, no editing:

- parcel and feasibility summary;
- visual snapshot area;
- program/offer cards;
- assumptions.

- [ ] **Step 3: Access model**

Decide whether share links are public token links like compare, or authenticated dashboard-only for MVP.

---

### Task 5: Verification

- [ ] **Step 1: Unit tests**

Run:

```powershell
npx jest src/lib/studio src/components/studio
```

- [ ] **Step 2: Report tests**

Run relevant PDF/report tests found in the audit.

- [ ] **Step 3: Typecheck**

Run:

```powershell
npx tsc --noEmit
```

---

## Dispatch Notes

This phase turns Studio from a live screen into a business artifact. The user should be able to sit with a landowner and say: "Parsel bu, senaryo bu, teklif alternatifleri bunlar, varsayimlar burada."

