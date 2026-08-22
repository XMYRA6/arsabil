# Arsabil Studio — Faz 5 AR, Ic Mimari ve Marketplace Karar Kapisi Plani

> **For agentic workers:** This is a decision-gate plan, not an implementation plan for AR/interior/marketplace. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio MVP kapsamindan sonra AR, ic mimari ve mobilya marketplace fikirlerinin hangisinin fonlanacagina kanitla karar vermek; MVP'yi scope explosion'dan korumak.

**Architecture:** No production AR/interior/marketplace code is added in this phase. The deliverable is decision evidence, prototype spikes if approved, and branch-specific implementation briefs.

**Tech Stack:** Research docs, product analytics/events if available, optional throwaway prototype spikes. No persistent runtime dependency unless a branch is explicitly approved.

**Spec:** `docs/superpowers/specs/2026-08-16-arsabil-studio-ar-ic-mimari-marketplace-karar-kapisi-design.md`

## Global Constraints

- Do not add native mobile code in this phase.
- Do not add checkout, payment, BNPL or credit integrations.
- Do not add production furniture catalog data.
- Do not represent AR placement as official/legal zoning proof.
- Every branch must have a business rationale before engineering starts.

---

### Task 1: Decision evidence checklist

**Files:**
- Add: `docs/superpowers/plans/2026-08-16-arsabil-studio-karar-kapisi-metrikleri.md`

**Interfaces:**
- Produces a checklist of metrics and qualitative signals.

- [ ] **Step 1: Usage metrics**

Define evidence:

- Studio opened per completed calculation.
- 3D massing interacted with.
- program mix configured.
- landowner offer exported/shared.
- report/share links created.

- [ ] **Step 2: Qualitative signals**

Track user requests:

- outdoor AR demand;
- interior/apartment planning demand;
- furniture purchasing demand;
- investor/landowner report demand.

- [ ] **Step 3: Go/no-go thresholds**

Write non-binding thresholds for when each branch deserves a spike.

---

### Task 2: Outdoor AR research brief

**Files:**
- Add: `docs/superpowers/plans/2026-08-16-arsabil-studio-ar-research-brief.md`

- [ ] **Step 1: Technical options**

Compare:

- native ARCore Geospatial / ARKit path;
- web `<model-viewer>` lightweight preview;
- no-AR fallback with 3D share link.

- [ ] **Step 2: Turkey coverage risk**

Document VPS/Street View/geospatial reliability checks required before committing.

- [ ] **Step 3: Proof-of-concept scope**

Define a throwaway POC only if evidence supports it:

- one sample parcel;
- one exported building model;
- one native/device placement test.

---

### Task 3: Interior design branch brief

**Files:**
- Add: `docs/superpowers/plans/2026-08-16-arsabil-studio-ic-mimari-branch-brief.md`

- [ ] **Step 1: MVP boundary**

Prefer apartment-type templates over freeform wall drawing.

- [ ] **Step 2: Asset strategy**

Define whether assets are generic placeholders, brand-provided models or generated/captured assets.

- [ ] **Step 3: Technical options**

Compare:

- SVG/Konva 2D templates;
- react-three-fiber room preview;
- third-party/open-source planner core if licensing is suitable.

---

### Task 4: Furniture marketplace branch brief

**Files:**
- Add: `docs/superpowers/plans/2026-08-16-arsabil-studio-mobilya-marketplace-branch-brief.md`

- [ ] **Step 1: Business model choices**

Document:

- marketplace referral/commission;
- direct seller model;
- lead-generation only.

- [ ] **Step 2: Catalog and 3D model pipeline**

Define:

- brand data feed;
- product dimensions/prices/stocks;
- glTF/USDZ/CAD conversion;
- photogrammetry as expensive fallback.

- [ ] **Step 3: Payment/credit boundary**

State that BNPL/credit must use licensed external providers; Arsabil does not lend directly.

---

### Task 5: Final branch decision

**Files:**
- Add: `docs/superpowers/plans/2026-08-16-arsabil-studio-faz5-decision-log-template.md`

- [ ] **Step 1: Decision log template**

Template fields:

- branch;
- evidence reviewed;
- decision;
- business owner;
- technical owner;
- budget/risk;
- next implementation plan or explicit rejection.

- [ ] **Step 2: Stop condition**

If evidence is weak, explicitly stop branch work and keep improving core Studio.

---

## Dispatch Notes

This phase is deliberately conservative. AR, interior design and marketplace are exciting, but the best path is to earn them through Studio usage. First prove the premium core: verified parcel -> feasibility -> 2D/3D scenario -> program mix -> landowner offer -> shareable proposal.

