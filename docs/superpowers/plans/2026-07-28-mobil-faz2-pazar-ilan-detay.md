# Mobil Premium Liquid Glass Faz 2: Pazar + Ilan Detay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil pazar yeri, harita/liste gecisi ve ilan detay ekranlarini Premium Liquid Glass tasarimina tasimak.

**Scope:** Yalnizca mobil (`max-width: 768px`). Masaustu marketplace ve listing detay duzeni degismez.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 2 (`2c`, `4h`, `4i`, `4b`).

## Global Constraints

- Faz 0 tokenlari ve mobil primitifleri kullanilir; yeni global tasarim dili icat edilmez.
- Veri uydurulmaz. Eksik `landSizeSqm`/`zoning`/score gibi alanlar mevcut planlardaki "Ornek veri" sinyaliyle gosterilir veya bos durum alir.
- Filtre/siralama mantigi `src/lib/listing/*` helper'larindan gelir; UI icinde tekrar hesaplama yazilmaz.
- Leaflet iceren bilesenlerde `mapReady` guard'i ve test mock deseni korunur.

## Task 1: Mobil marketplace liste yuzeyi

**Files:**
- Modify: `src/app/marketplace/page.tsx`
- Modify: `src/app/marketplace/marketplace.module.css`
- Modify: `src/components/listing/ListingCard.tsx`
- Modify: `src/components/listing/ListingCard.module.css`
- Test: `src/app/marketplace/marketplaceMobile.scope.test.ts`

- [ ] **Step 1: Write failing mobile scope tests**
- [ ] **Step 2: Mobil-only list container ve kart kurallarini ekle**
- [ ] **Step 3: Karttaki emoji/renkli placeholderlari cizgi ikon veya cam badge'e cevir**
- [ ] **Step 4: `npx jest src/app/marketplace/marketplaceMobile.scope.test.ts`**
- [ ] **Step 5: `npx tsc --noEmit`**
- [ ] **Step 6: Commit**

## Task 2: Filtre ve harita alt yapraklari

**Files:**
- Modify: `src/components/listing/FilterSidebar.tsx`
- Modify: `src/components/listing/FilterSidebar.module.css`
- Modify: `src/components/map/MapView.tsx`
- Test: `src/components/listing/FilterSidebar.mobile.test.tsx`

- [ ] **Step 1: Failing tests for mobile filter sheet and selected chips**
- [ ] **Step 2: Filtreleri BottomSheet icine mobil-only tasima**
- [ ] **Step 3: Harita/liste segmented kontrolunu ekle**
- [ ] **Step 4: Leaflet regresyon testlerini calistir**
- [ ] **Step 5: Commit**

## Task 3: Mobil ilan detay ve teklif CTA

**Files:**
- Modify: `src/app/listing/[id]/page.tsx`
- Modify: `src/app/listing/[id]/page.module.css`
- Test: `src/app/listing/[id]/listingDetail.mobile.test.tsx`

- [ ] **Step 1: Failing tests for mobile detail hero, stats and sticky offer bar**
- [ ] **Step 2: Mobil detay hero ve bilgi kartlarini cam dile tasima**
- [ ] **Step 3: Alt nav gizlenirken teklif barinin safe-area ile cakismamasini sagla**
- [ ] **Step 4: `npx jest src/app/listing/[id]`**
- [ ] **Step 5: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/marketplace`, `/listing/[id]` smoke; yatay overflow yok, alt nav/CTA cakismiyor.
