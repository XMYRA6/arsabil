# Mobil Premium Liquid Glass Faz 3: Giris, Kayit, Ana Ekran Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil giris, kayit ve ana ekran deneyimini Premium Liquid Glass diline tasimak.

**Scope:** Yalnizca mobil (`max-width: 768px`). Masaustu auth split/profesyonel UI korunur.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 3 (`4k`, `4m`, `4g`).

## Global Constraints

- Auth sayfalarinda BottomNavbar gosterilmez.
- Form davranisi, validasyon ve auth API sozlesmeleri degismez.
- Yeni kullaniciya gorunur metinler Turkce olur.
- Mobilde koyu tema varyanti tasarlanmadi; mevcut gecici acik tema karari korunur.

## Task 1: Mobil giris sayfasi

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login.module.css`
- Test: `src/app/login/loginMobile.scope.test.ts`

- [x] **Step 1: Failing CSS scope tests**
- [x] **Step 2: Mobil-only cam form yuzeyi ve marka ust bolumunu ekle**
- [x] **Step 3: Touch target ve focus state kurallarini dogrula**
- [x] **Step 4: Commit**

## Task 2: Mobil kayit sayfasi

**Files:**
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/register/register.module.css`
- Test: `src/app/register/registerMobile.scope.test.ts`

- [x] **Step 1: Failing CSS scope tests**
- [x] **Step 2: Kayit formunu mobil cam kart ve adim hissine tasima**
- [x] **Step 3: Hata/basari durumlarini cam alert stiline bagla**
- [x] **Step 4: Commit**

## Task 3: Ana ekran mobil dashboard/home

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Modify: `src/app/mobile/HomeMobile.tsx`
- Modify: `src/app/mobile/mobile.module.css`
- Test: `src/app/homeMobile.scope.test.ts`

- [x] **Step 1: Failing tests for mobile hero/actions/stat cards**
- [x] **Step 2: Ilk viewportu gercek urun aksiyonlariyla kur**
- [x] **Step 3: BottomNavbar boslugu ve safe-area guard'ini dogrula**
- [x] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/`, `/login`, `/register`; form alanlari tasma yapmaz, alt nav auth ekranlarinda yok.
