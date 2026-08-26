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

- [x] **Step 1: Failing tests for mobile admin nav and layout**
- [x] **Step 2: Mobil admin nav, header ve safe-area boslugunu ekle**
- [x] **Step 3: Auth redirect durumunda login tasmasini dogrula**
- [ ] **Step 4: Commit**

## Task 2: Admin liste ve ayar ekranlari

**Files:**
- Modify: `src/app/admin/district-prices/page.tsx`
- Modify: `src/app/admin/district-prices/page.module.css`
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/settings/page.module.css`
- Modify: other touched admin CSS modules as needed
- Test: `src/app/admin/adminDataCards.mobile.test.ts`

- [x] **Step 1: Failing tests for mobile card/table transformation**
- [x] **Step 2: Kritik admin tablolarini mobil kart gorunumune bagla**
- [x] **Step 3: Form/input/button touch target guard'larini ekle**
- [ ] **Step 4: Commit**

## Final Verification

- [x] `npx tsc --noEmit`
- [x] `npx jest`
- [x] `npm run build`
- [x] Playwright 390x844: `/admin`, `/admin/district-prices`, `/admin/settings`; yetkisiz akista login ekranina tasmasiz redirect.
## Task 1 Validation Notes

- Added `src/app/admin/adminMobile.scope.test.ts` for the Faz 8 mobile shell contract.
- `npx jest --runTestsByPath src/app/admin/adminMobile.scope.test.ts src/app/admin/admin.scope.test.ts` PASS: 2 suites / 22 tests.
- `npx tsc --noEmit` PASS.
- Playwright 390x844 unauthenticated `/admin` smoke PASS: redirected to `/login?callbackUrl=%2Fadmin`, no document-level horizontal overflow, BottomNavbar hidden. Artifacts: `output/playwright/phase8-admin-shell-smoke.json`, `output/playwright/phase8-admin-shell-390x844.png`.
## Task 2 Validation Notes

- Added `src/app/admin/adminDataCards.mobile.test.ts` for admin mobile data-card/table and touch-target contracts.
- District prices keeps the desktop table and exposes mobile `CardList`/`DataCard` fields for `Piyasa`, `Insaat`, and `Arsa` values.
- Settings profit/risk rows are card-like on 768px mobile; order/default/delete controls remain visible instead of being hidden by the older 900px rule.
- `npx jest --runTestsByPath src/app/admin/adminDataCards.mobile.test.ts src/app/admin/adminMobile.scope.test.ts src/app/admin/admin.scope.test.ts src/app/admin/district-prices/AdminDistrictPrices.test.tsx src/app/admin/settings/AdminSettings.test.tsx` PASS: 5 suites / 33 tests.
- `npx tsc --noEmit` PASS.
## Final Validation Notes

- `npx tsc --noEmit` PASS.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 170 suites / 1344 tests.
- `npm run build` PASS.
- Playwright 390x844 final smoke PASS for `/admin`, `/admin/district-prices`, and `/admin/settings`: all redirected to login without document-level horizontal overflow and with BottomNavbar hidden. Artifacts: `output/playwright/phase8-mobile-smoke.json`, `output/playwright/phase8-admin-390x844.png`, `output/playwright/phase8-district-prices-390x844.png`, `output/playwright/phase8-settings-390x844.png`.
