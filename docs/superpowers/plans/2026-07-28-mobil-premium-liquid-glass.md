# Mobil Premium Liquid Glass Implementation Orchestration Plan

> **For agentic workers:** This is the umbrella plan for `docs/superpowers/specs/2026-07-28-mobil-premium-liquid-glass-design.md`. Use the phase plan below for detailed task execution.

**Goal:** 2026-07-28 onayli Premium Liquid Glass mobil tasarimini faz faz uygulamak; ilk teslimde temel token/ikon/nav katmani ve `/hesapla` mobil deneyimi kurulacak.

**Canonical Phase Plan:** `docs/superpowers/plans/2026-07-28-mobil-faz0-temel-faz1-hesapla.md`

## Scope

- Faz 0: `--m-*` token katmani, JetBrains Mono, cizgi ikon seti, FAB'siz 5 sekmeli BottomNavbar, MobileScreen/layout altyapisi.
- Faz 1: `/hesapla` mobil ekraninda SonucKarti, GirdiKarti, FiyatAciklamasi, GelismisAyarlarSheet ve Analiz gorunumu.
- Faz 2-9: Spec'teki pazar, auth/home, mesaj/teklif, portfoy, profil/ayarlar, wizard, admin, durum ekranlari daha sonra ayri planlarla detaylandirilir.

## Global Constraints

- Yalnizca mobil (`max-width: 768px`); masaustu duzeni degismez.
- `engine_v2.ts` degismez.
- `--seal-*` tokenlari silinmez.
- Emoji yok; cizgi ikon kullanilir.
- Tum rakamlar mono + tabular nums.
- Reduced motion desteklenir.

---

### Gate 1: Faz 0 + Faz 1 canonical plan

- [ ] Token katmani ve JetBrains Mono.
- [ ] Ikon seti.
- [ ] FAB'siz alt navigasyon.
- [ ] MobileScreen safe-area ve bottom nav boslugu.
- [ ] `/hesapla` mobil kok bilesenleri.
- [ ] Sonuc karti ve girdi karti.
- [ ] Fiyat aciklamasi ve muhendis gorunumu.
- [ ] Gelismis ayarlar yapragi.
- [ ] Analiz gorunumu.
- [ ] Final 390x844 Playwright turu.

### Gate 2: Sonraki fazlar icin planlama

Spec'teki kalan ekran gruplari icin ayri plan dosyalari olusturulmadan implementasyon baslatilmaz:

- [ ] Faz 2 Pazar + ilan detay.
- [ ] Faz 3 Giris, kayit, ana ekran.
- [ ] Faz 4 Mesajlar + sohbet + teklifler.
- [ ] Faz 5 Portfoy.
- [ ] Faz 6 Profil/duzenleme/ayarlar/bildirimler.
- [ ] Faz 7 Ilan sihirbazi.
- [ ] Faz 8 Admin.
- [ ] Faz 9 Bos/iskelet/offline/404.

## Final Acceptance

- Canonical phase plan test/build dogrulamalari yesil.
- 390x844 mobil turda alt nav/CTA cakismasi yok.
- Masaustu screenshot regresyonu yok.
- Kalan fazlar icin yeni plan gereksinimi acik.
