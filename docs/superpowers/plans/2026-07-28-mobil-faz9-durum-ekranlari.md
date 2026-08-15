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

- [ ] **Step 1: Failing tests for empty/loading/error/offline variants**
- [ ] **Step 2: MobileState bilesenini ve CSS module'unu ekle**
- [ ] **Step 3: Reduced motion ve touch target guard'larini ekle**
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

- [ ] **Step 1: Failing tests for offline page and SW cache contract**
- [ ] **Step 2: `/offline` sayfasini MobileState ile kur**
- [ ] **Step 3: `sw.js` static/offline cache sozlesmesini ekle**
- [ ] **Step 4: 404 mobil yuzeyini MobileState ile uyumla**
- [ ] **Step 5: Commit**

## Task 3: Mevcut ekranlara bos/yukleniyor durumlarini yay

**Files:**
- Modify: dashboard/listing/marketplace pages as needed
- Test: affected page tests

- [ ] **Step 1: Failing tests for at least three representative empty states**
- [ ] **Step 2: MobileState'i tekrar eden lokal bos durumlarin yerine kullan**
- [ ] **Step 3: Masaustu durum ekranlarini bozmadigini dogrula**
- [ ] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/offline`, bilinmeyen route, bos liste senaryolari; yatay overflow yok.
