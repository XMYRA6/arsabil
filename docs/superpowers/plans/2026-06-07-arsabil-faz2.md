# ArsaBil Faz 2 Implementation Orchestration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the referenced sub-plans. This file is the umbrella plan for `docs/superpowers/specs/2026-06-07-arsabil-faz2-design.md`; do not duplicate task detail here when the sub-plan already owns it.

**Goal:** Faz 2 spec'ini iki bagimsiz deploy edilebilir alt faz olarak tamamlamak: **2A** admin/SaaS/e-posta altyapisi, **2B** marketplace/harita/favoriler/ilan detay yenilemesi.

**Architecture:** Faz 2, iki uygulama planina bolunmustur. 2A backend ve operasyonel kontrol katmanini kurar; 2B kullaniciya gorunen marketplace deneyimini onun uzerine insa eder. Bu dosya uygulama sirasini, bagimliliklari ve final kabul kriterlerini tanimlar.

**Sub-plans:**
- `docs/superpowers/plans/2026-06-07-arsabil-faz2a-plan.md`
- `docs/superpowers/plans/2026-06-07-arsabil-faz2b-plan.md`

## Global Constraints

- 2A ve 2B ayri commit serileri olarak tamamlanir.
- Prisma migration sirasi korunur: once 2A `faz2a-plan-approval-email`, sonra 2B `faz2b-marketplace-favorites`.
- 2B marketplace GET sorgulari yalnizca `APPROVED` ilanlari kullaniciya gostermeli; 2A onay akisi tamamlanmadan 2B production kabul edilmez.
- E-posta gonderimleri fire-and-forget olmali; Resend/SMTP hatasi asil API aksiyonunu geri almamali.
- Favoriler auth gerektirir; favori olmayan kullanici akisi marketplace kartlarini bozmamali.
- Harita Leaflet client-only kalir; SSR/hydration hatasi kabul edilmez.

---

### Phase Gate 1: Faz 2A'yi tamamla

**Owned by:** `2026-06-07-arsabil-faz2a-plan.md`

- [ ] Listing `status` modeli ve admin onay/red akisi tamamlandi.
- [ ] `User.plan` ve plan limit helper'i tamamlandi.
- [ ] Rapor/ilan/senaryo create endpoint'leri plan limitlerini uyguluyor.
- [ ] Admin users ekraninda plan atama ve `isVerified` toggle calisiyor.
- [ ] E-posta helper'i ve mesaj/teklif/ilan onay tetikleyicileri tamamlandi.
- [ ] 2A testleri yesil:

```bash
npx jest src/lib/plan.test.ts src/lib/email.test.ts src/app/api/admin src/app/api/reports src/app/api/listings
npx tsc --noEmit
```

- [ ] 2A commit serisi tamamlandi.

---

### Phase Gate 2: Faz 2B'yi tamamla

**Owned by:** `2026-06-07-arsabil-faz2b-plan.md`

- [ ] `Favorite` modeli ve `/api/favorites` endpoint'leri tamamlandi.
- [ ] Marketplace filtreleri URL query state ile calisiyor.
- [ ] Liste/Harita sekmeleri calisiyor; Leaflet harita client-only render ediliyor.
- [ ] ListingCard favori toggle'i optimistic veya refresh uyumlu calisiyor.
- [ ] `/listing/[id]` sayfasi foto galeri, teklif formu, paylas ve public profil linkiyle yenilendi.
- [ ] 2B testleri yesil:

```bash
npx jest src/app/marketplace src/components/marketplace src/app/api/favorites src/app/api/listings
npx tsc --noEmit
```

- [ ] 2B commit serisi tamamlandi.

---

### Phase Gate 3: Faz 2 entegrasyon kabul testi

**Files:** Kod degisikligi beklenmez; bulgu cikarsa ilgili alt plan dosyalarinda fix commit.

- [ ] Prisma state dogrula:

```bash
npx prisma generate
npx prisma migrate status
```

- [ ] Tam paket:

```bash
npx tsc --noEmit
npx jest
npm run build
```

- [ ] Playwright smoke:
  - Admin ilan onay/red.
  - FREE kullanici limit asimi 403 `PLAN_LIMIT`.
  - PRO kullanici ayni aksiyonda geciyor.
  - Marketplace filtre + favori ekle/cikar.
  - Harita sekmesinde pin popup detay linki.
  - Onaylanmamis ilan public marketplace'te gorunmuyor.

- [ ] Manuel production-readiness kontrolu:
  - `RESEND_API_KEY` yokken e-posta tetikleyen endpoint'ler asil aksiyonu tamamliyor.
  - Leaflet CSS ve marker asset'leri production build'de gorunuyor.
  - Mobile 390x844 marketplace/listing detay yatay tasma yok.

---

## Final Output

Faz 2 tamamlandiginda kullaniciya raporlanacak:
- 2A ve 2B commit araliklari.
- Migration adlari.
- Test/build komut sonuclari.
- Playwright/manuel smoke bulgulari.
