# Mobil Premium Liquid Glass Faz 6: Profil, Ayarlar, Bildirimler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil profil, profil duzenleme, ayarlar ve bildirimler ekranlarini Premium Liquid Glass diline tasimak.

**Scope:** `/dashboard/profile`, `/dashboard/profile/edit`, `/dashboard/settings`, `/notifications` ve public profil mobil yuzeyi. Masaustu profil korunur.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 6 (`2d`, `4r`, `4s`).

## Global Constraints

- Mevcut profil mobil liquid glass planlariyla cakisan kurallar once okunur; daha yeni spesifik duzeltmeler korunur.
- Account/profile API sozlesmeleri degismez.
- Bildirim okundu/okunmadi davranisi mevcut endpoint'lerden gelir.

## Task 1: Profil ana ve public profil uyumu

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile.module.css`
- Modify: `src/app/profile/[userId]/page.tsx`
- Modify: `src/app/profile/[userId]/page.module.css`
- Test: `src/app/dashboard/profile/profileMobile.scope.test.ts`

- [x] **Step 1: Failing tests for mobile profile header and stats**
- [x] **Step 2: Avatar, metrik ve aksiyonlari cam dile tasima**
- [x] **Step 3: Daha once kapatilan avatar/font regresyonlarini koru**
- [x] **Step 4: Commit**

## Task 2: Profil duzenleme ve ayarlar route'lari

**Files:**
- Add: `src/app/dashboard/profile/edit/page.tsx`
- Add: `src/app/dashboard/profile/edit/page.module.css`
- Add: `src/app/dashboard/settings/page.tsx`
- Add: `src/app/dashboard/settings/page.module.css`
- Test: `src/app/dashboard/profile/edit/page.test.tsx`
- Test: `src/app/dashboard/settings/page.test.tsx`

- [x] **Step 1: Failing tests for editable fields and settings toggles**
- [x] **Step 2: Mevcut profile/account API ile formlari bagla**
- [x] **Step 3: Mobil form, toggle ve kaydet barini tasarla**
- [x] **Step 4: Commit**

## Task 3: Bildirimler route'u

**Files:**
- Add: `src/app/notifications/page.tsx`
- Add: `src/app/notifications/page.module.css`
- Test: `src/app/notifications/page.test.tsx`

- [x] **Step 1: Failing tests for notification list and mark-read action**
- [x] **Step 2: `api/notifications` ile listeleme ve okundu isaretleme**
- [x] **Step 3: Mobil bildirim kartlari ve bos durumlar**
- [x] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/dashboard/profile`, `/profile/[userId]`, `/dashboard/profile/edit`, `/dashboard/settings`, `/notifications`.
