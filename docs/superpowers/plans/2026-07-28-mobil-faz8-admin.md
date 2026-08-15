# Mobil Premium Liquid Glass Faz 8: Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil admin ve motor ayarlari yuzeylerini Premium Liquid Glass diline tasimak.

**Scope:** `/admin` alt sayfalarinin mobil stilleri. Masaustu admin tablo/dense operasyonel duzeni korunur.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 8 (`4t`).

## Global Constraints

- Admin yetki/middleware davranisi degismez.
- Masaustu tablolar ve bulk operasyon akislari korunur.
- Mobilde tablolar DataCard/section list mantigina iner; veri kaybi olmaz.

## Task 1: Admin shell mobil uyumu

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/admin.module.css`
- Test: `src/app/admin/adminMobile.scope.test.ts`

- [ ] **Step 1: Failing tests for mobile admin nav and layout**
- [ ] **Step 2: Mobil admin nav, header ve safe-area boslugunu ekle**
- [ ] **Step 3: Auth redirect durumunda login tasmasini dogrula**
- [ ] **Step 4: Commit**

## Task 2: Admin liste ve ayar ekranlari

**Files:**
- Modify: `src/app/admin/district-prices/page.tsx`
- Modify: `src/app/admin/district-prices/page.module.css`
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/settings/page.module.css`
- Modify: other touched admin CSS modules as needed
- Test: `src/app/admin/adminDataCards.mobile.test.ts`

- [ ] **Step 1: Failing tests for mobile card/table transformation**
- [ ] **Step 2: Kritik admin tablolarini mobil kart gorunumune bagla**
- [ ] **Step 3: Form/input/button touch target guard'larini ekle**
- [ ] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/admin`, `/admin/district-prices`, `/admin/settings`; yetkisiz akista login ekranina tasmasiz redirect.
