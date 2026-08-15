# Mobil Premium Liquid Glass Faz 4: Mesajlar, Sohbet, Teklifler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil mesaj kutusu, sohbet ve teklif akisini Premium Liquid Glass diline tasimak; `/listing/[id]/offers` ince sayfasini eklemek.

**Scope:** Yalnizca mobil UI ve yeni teklif sayfasi. API sozlesmeleri degismez.

**Source:** `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`, Faz 4 (`4j`, `4d`, `4p`).

## Global Constraints

- Sohbet detayinda BottomNavbar gizlenir; mesaj composer safe-area ile cakismaz.
- Bildirim/okundu davranisi mevcut API uzerinden kalir.
- Teklif olusturma/cevaplama mevcut `api/offers` sozlesmesini kullanir.

## Task 1: Mobil inbox liste

**Files:**
- Modify: `src/app/inbox/page.tsx`
- Modify: `src/app/inbox/inbox.module.css`
- Test: `src/app/inbox/inboxMobile.scope.test.ts`

- [x] **Step 1: Failing tests for conversation cards and unread state**
- [x] **Step 2: Konusma listesini cam kartlara ve mono zaman etiketlerine tasima**
- [x] **Step 3: Bos durum ve yukleniyor iskeletini ekle**
- [x] **Step 4: Commit**

## Task 2: Mobil sohbet detay

**Files:**
- Modify: `src/app/inbox/[userId]/page.tsx`
- Modify: `src/app/inbox/[userId]/page.module.css`
- Test: `src/app/inbox/[userId]/chatMobile.test.tsx`

- [x] **Step 1: Failing tests for hidden bottom nav and sticky composer**
- [x] **Step 2: Bubble, appbar ve composer mobil stilini ekle**
- [x] **Step 3: Odak/klavye durumunda composer cakismasini kontrol et**
- [x] **Step 4: Commit**

## Task 3: Ilan teklifleri sayfasi

**Files:**
- Add: `src/app/listing/[id]/offers/page.tsx`
- Add: `src/app/listing/[id]/offers/page.module.css`
- Test: `src/app/listing/[id]/offers/page.test.tsx`

- [ ] **Step 1: Failing page tests for offer list and create action**
- [ ] **Step 2: Mevcut offers API ile listeleme/gonderme baglantisini kur**
- [ ] **Step 3: Mobil teklif kartlarini ve durum badge'lerini tasarla**
- [ ] **Step 4: Commit**

## Final Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx jest`
- [ ] `npm run build`
- [ ] Playwright 390x844: `/inbox`, `/inbox/[userId]`, `/listing/[id]/offers`; bottom nav/composer/CTA cakismasi yok.
