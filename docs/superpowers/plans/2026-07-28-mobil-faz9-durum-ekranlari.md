# Mobil Premium Liquid Glass Faz 9: Durum Ekranlari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil bos, iskelet, cevrimdisi ve 404 durumlarini Premium Liquid Glass diline tasimak; `/offline` route'unu eklemek.

**Scope:** Paylasilan durum bilesenleri, `not-found`, loading/skeleton kullanimi ve service worker offline route onbellegi.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 9 (`4l`, `4u`).

## Global Constraints

- `public/sw.js` PWA guncelleme bildirimi sozlesmesini bozmaz; `SKIP_WAITING` message akisi korunur.
- Offline route eklenirken mevcut cache temizleme mantigi degismez.
- Durum ekranlari mobilde cam kart, cizgi ikon ve kisa Turkce metin kullanir; emoji kullanilmaz.

## Task 1: Paylasilan durum bilesenleri

**Files:**
- Add: `src/components/mobile/MobileState.tsx`
- Add: `src/components/mobile/MobileState.module.css`
- Test: `src/components/mobile/MobileState.test.tsx`
- Test: `src/components/mobile/mobileState.scope.test.ts`

- [x] **Step 1: Failing tests for empty/loading/error/offline variants**
- [x] **Step 2: MobileState bilesenini ve CSS module'unu ekle**
- [x] **Step 3: Reduced motion ve touch target guard'larini ekle**
- [ ] **Step 4: Commit**

## Task 2: Offline ve 404 route'lari

**Files:**
- Add: `src/app/offline/page.tsx`
- Add: `src/app/offline/page.module.css`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/not-found.module.css`
- Modify: `public/sw.js`
- Test: `src/app/offline/page.test.tsx`
- Test: `public/sw.contract.test.ts`

- [x] **Step 1: Failing tests for offline page and SW cache contract**
- [x] **Step 2: `/offline` sayfasini MobileState ile kur**
- [x] **Step 3: `sw.js` static/offline cache sozlesmesini ekle**
- [x] **Step 4: 404 mobil yuzeyini MobileState ile uyumla**
- [ ] **Step 5: Commit**

## Task 3: Mevcut ekranlara bos/yukleniyor durumlarini yay

**Files:**
- Modify: dashboard/listing/marketplace pages as needed
- Test: affected page tests

- [x] **Step 1: Failing tests for at least three representative empty states**
- [x] **Step 2: MobileState'i tekrar eden lokal bos durumlarin yerine kullan**
- [x] **Step 3: Masaustu durum ekranlarini bozmadigini dogrula**
- [ ] **Step 4: Commit**

## Final Verification

- [x] `npx tsc --noEmit`
- [x] `npx jest`
- [x] `npm run build`
- [x] Playwright 390x844: `/offline`, bilinmeyen route, bos liste senaryolari; yatay overflow yok.

## Task 1 Validation Notes

- Added `src/components/mobile/MobileState.tsx` and `src/components/mobile/MobileState.module.css` with `empty`, `loading`, `error`, and `offline` variants, short Turkish default copy, and line-icon/spinner rendering without emoji.
- Added `src/components/mobile/MobileState.test.tsx` for variant rendering, accessibility roles/live regions, custom copy/action/className, heading levels, and reduced-motion transition helper.
- Added `src/components/mobile/mobileState.scope.test.ts` to keep glass card styling mobile-scoped, enforce action touch targets, reduced-motion CSS, and contrast token usage.
- `npx jest --runTestsByPath src/components/mobile/MobileState.test.tsx src/components/mobile/mobileState.scope.test.ts` PASS: 2 suites / 11 tests.
- `npx tsc --noEmit` PASS.

## Task 2 Validation Notes

- Added `src/app/offline/page.tsx` and `src/app/offline/page.module.css` using `MobileState` offline copy with a home action.
- Replaced inline 404 markup in `src/app/not-found.tsx` with the shared `MobileState` empty-state surface and added `src/app/not-found.module.css`.
- Updated `public/sw.js` to cache `/offline`, bump the SW cache/version to `1.0.3`, and prefer `/offline` before `/` for navigation fetch failures while preserving `SKIP_WAITING` and old-cache cleanup behavior.
- Extended `src/lib/pwa/swContract.test.ts` and added `src/app/offline/page.test.tsx`.
- `npx jest --runTestsByPath src/app/offline/page.test.tsx src/lib/pwa/swContract.test.ts src/components/mobile/MobileState.test.tsx src/components/mobile/mobileState.scope.test.ts` PASS: 4 suites / 17 tests.
- `npx tsc --noEmit` PASS.

## Task 3 Validation Notes

- Replaced local empty/loading/error state markup with shared `MobileState` in `src/app/dashboard/favorites/page.tsx`, `src/app/dashboard/listings/page.tsx`, and `src/app/marketplace/page.tsx`.
- Dashboard favorites and listings keep their existing desktop portfolio shell and action links while delegating loading, error, and empty surfaces to `MobileState`.
- Marketplace empty filter results and map loading fallback now use `MobileState`; visible emoji state icons were removed from those paths.
- `npx jest --runTestsByPath src/app/dashboard/favorites/page.test.tsx src/app/dashboard/listings/page.test.tsx src/app/marketplace/pageStyles.scope.test.ts src/app/marketplace/marketplaceMobile.scope.test.ts src/components/mobile/MobileState.test.tsx src/components/mobile/mobileState.scope.test.ts` PASS: 6 suites / 31 tests.
- `npx tsc --noEmit` PASS.

## Final Validation Notes

- `npx tsc --noEmit` PASS.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 173 suites / 1358 tests.
- `npm run build` PASS; `/offline` is generated as a static route.
- Playwright 390x844 smoke PASS for `/offline` and an unknown route with no document-level horizontal overflow. `/marketplace` is protected by `src/middleware.ts` and correctly redirects unauthenticated users to `/login?callbackUrl=%2Fmarketplace` without overflow; representative empty-list UI is covered by the Task 3 Jest/scope tests. Artifacts: `output/playwright/phase9-mobile-smoke.json`, `output/playwright/phase9-offline-390x844.png`, `output/playwright/phase9-not-found-390x844.png`, `output/playwright/phase9-marketplace-protected-390x844.png`.
