# Hesapla Girdi Mimarisi Implementation Plan

> **STATUS: IMPLEMENTED VIA CANONICAL PLAN.** This file maps `docs/superpowers/specs/2026-07-29-hesapla-girdi-mimarisi-design.md` to the detailed implementation plan and status record created on 2026-07-30.

**Goal:** Hesabi suren degerleri gorunur/duzenlenebilir yapmak, il/ilce ve parsel konum kavramlarini ayirmak, piyasa fiyatini sonuc baglamina tasimak ve gelismis ayarlara tek kapi birakmak.

**Canonical Implementation Plan:** `docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi.md`

**Status Record:** `docs/superpowers/plans/2026-07-30-hesapla-girdi-mimarisi-DURUM.md`

## Scope Mapping

- K1 Birim insaat maliyeti gorunur/elle ezilebilir -> canonical plan Task 1, 2, 6, 8.
- K2 Il/ilce + parsel pini tek Konum blogunda -> canonical plan Task 2, 6.
- K3 Piyasa fiyati sonuc karsilastirma blogunda -> canonical plan Task 3, 4, 8.
- K4 Gelismis ayarlara tek kapi -> canonical plan Task 5, 6.
- K5 Hesap/Analiz sekme seridi kalkar, Analiz drill-down olur -> canonical plan Task 7.
- K6 PDF mobil `/hesapla` yerine Raporlarim'da -> canonical plan Task 9.
- K7 Piyasa fiyati masaustunde de gorunur -> canonical plan Task 8.

## Completion Notes

`2026-07-30-hesapla-girdi-mimarisi-DURUM.md` kaydina gore plan 10/10 tamamlandi:

- `npx tsc --noEmit` -> 0.
- `npx jest --no-coverage` -> 716/716, daha sonra review fixleriyle 728/728.
- `npm run build` -> basarili.
- ESLint baseline 12 problem korunmus.

## Open Follow-ups

Bu spec'in kendisi kapali kabul edilir. Sonraki islere devreden kalemler canonical durum dosyasinda listelenmistir:

- Masaustu `/hesapla` yerlesimi ve HesapFisi sunumu icin ayri Parca 3 spec'i.
- Mobil dokunma hedefi/StickyActionBar cakismasi icin ayri mobil yerlesim spec'i.
- `page.tsx` render davranis testi eksigi.
- Olasi olu JSX/CSS temizligi.

## Guardrails

- Bu dosyadan yeni implementasyon dispatch edilmez; task detaylari canonical plandadir.
- Canonical planla celisen yeni talimat eklenmez.
- Devreden follow-up'lar bu plani yeniden acmaz; kendi spec/plan dosyalariyla ele alinir.
