# Mobil Premium Liquid Glass Faz 5: Portfoy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil raporlar, favoriler, ilanlarim ve senaryo karsilastirma yuzeylerini Premium Liquid Glass diline tasimak.

**Scope:** Dashboard alt ekranlari; masaustu dashboard korunur.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 5 (`4c`, `4q`, `4o`).

## Global Constraints

- Korumali route davranisi ve session guard degismez.
- Liste kartlari veri uydurmaz; eksik alanlar bos durum/placeholder ile gosterilir.
- BottomNavbar dashboard liste ekranlarinda gorunur, detay/alt sheet durumlarinda cakisma yapmaz.

## Task 1: Mobil raporlar

**Files:**
- Modify: `src/app/dashboard/reports/page.tsx`
- Modify: `src/app/dashboard/reports/page.module.css`
- Test: `src/app/dashboard/reports/reportsMobile.scope.test.ts`

- [x] **Step 1: Failing tests for report cards and mobile tabs**
- [x] **Step 2: Rapor listesini cam kart, mono metrik ve segmented filtrelerle tasima**
- [x] **Step 3: Bos/yukleniyor durumlarini ekle**
- [x] **Step 4: Commit**

## Task 2: Favoriler ve ilanlarim route'lari

**Files:**
- Add: `src/app/dashboard/favorites/page.tsx`
- Add: `src/app/dashboard/favorites/page.module.css`
- Add: `src/app/dashboard/listings/page.tsx`
- Add: `src/app/dashboard/listings/page.module.css`
- Test: `src/app/dashboard/favorites/page.test.tsx`
- Test: `src/app/dashboard/listings/page.test.tsx`

- [x] **Step 1: Failing tests for API-backed lists**
- [x] **Step 2: `api/favorites` ve listings kaynaklariyla sayfalari kur**
- [x] **Step 3: Mobil liste kartlari, bos durumlar ve hata durumlari**
- [x] **Step 4: Commit**

## Task 3: Senaryo karsilastirma mobil yuzeyi

**Files:**
- Modify: `src/components/ScenarioCompare.tsx`
- Modify: `src/components/ScenarioCompare.module.css`
- Test: `src/components/ScenarioCompare.mobile.test.tsx`

- [x] **Step 1: Failing tests for horizontal-safe mobile comparison**
- [x] **Step 2: Tabloyu mobil kart/segment gorunumune donustur**
- [x] **Step 3: Paylasim/indir aksiyonlarini icon button olarak hizala**
- [x] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/dashboard/reports`, `/dashboard/favorites`, `/dashboard/listings`; auth redirect bekleniyorsa login ekraninda tasma yok.
