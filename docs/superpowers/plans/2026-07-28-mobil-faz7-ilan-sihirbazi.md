# Mobil Premium Liquid Glass Faz 7: Ilan Sihirbazi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil ilan olusturma sihirbazini Premium Liquid Glass tasarimina tasimak.

**Scope:** `/listings/new` ve mevcut wizard bilesenleri. Masaustu/desktop wizard davranisi degismez.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 7 (`4e`).

## Global Constraints

- Wizard ekraninda BottomNavbar gizlenir.
- 5 adimli akisin veri modeli ve submit API sozlesmesi degismez.
- Upload, lokasyon ve fizibilite adimlari mevcut testleriyle korunur.
- Klavye acikken sabit ileri/geri bar safe-area ile cakismaz.

## Task 1: Wizard shell ve progress

**Files:**
- Modify: `src/app/listings/new/page.tsx`
- Modify: `src/app/listings/new/page.module.css`
- Modify: `src/components/listing-wizard/WizardProgress.tsx`
- Modify: `src/components/listing-wizard/wizard.module.css`
- Test: `src/app/listings/new/wizardMobile.scope.test.ts`

- [x] **Step 1: Failing tests for mobile shell, hidden nav and progress**
- [x] **Step 2: Mobil appbar/progress/step container kur**
- [x] **Step 3: Sticky action bar ve safe-area guard ekle**
- [x] **Step 4: Commit**

## Task 2: Adim kartlari

**Files:**
- Modify: `src/components/listing-wizard/WizardStep1Location.tsx`
- Modify: `src/components/listing-wizard/WizardStep2Detail.tsx`
- Modify: `src/components/listing-wizard/WizardStep3Photos.tsx`
- Modify: `src/components/listing-wizard/WizardStep4Feasibility.tsx`
- Modify: `src/components/listing-wizard/WizardStep5Preview.tsx`
- Test: `src/components/listing-wizard/wizardSteps.mobile.test.tsx`

- [ ] **Step 1: Failing tests for mobile field order and touch targets**
- [ ] **Step 2: Her adimi cam kartlar ve cizgi ikonlarla tasima**
- [ ] **Step 3: Upload/gallery ve preview yatay overflow guard'i**
- [ ] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/listings/new`; alt nav gizli, action bar gorunur, tum adimlar tasmasiz.


