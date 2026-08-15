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

- [x] Faz 2 Pazar + ilan detay. Plan: `2026-07-28-mobil-faz2-pazar-ilan-detay.md`
- [x] Faz 3 Giris, kayit, ana ekran. Plan: `2026-07-28-mobil-faz3-auth-ana-ekran.md`
- [x] Faz 4 Mesajlar + sohbet + teklifler. Plan: `2026-07-28-mobil-faz4-mesaj-teklif.md`
- [x] Faz 5 Portfoy. Plan: `2026-07-28-mobil-faz5-portfoy.md`
- [x] Faz 6 Profil/duzenleme/ayarlar/bildirimler. Plan: `2026-07-28-mobil-faz6-profil-ayar-bildirim.md`
- [x] Faz 7 Ilan sihirbazi. Plan: `2026-07-28-mobil-faz7-ilan-sihirbazi.md`
- [x] Faz 8 Admin. Plan: `2026-07-28-mobil-faz8-admin.md`
- [x] Faz 9 Bos/iskelet/offline/404. Plan: `2026-07-28-mobil-faz9-durum-ekranlari.md`

## Final Acceptance

- Canonical phase plan test/build dogrulamalari yesil.
- 390x844 mobil turda alt nav/CTA cakismasi yok.
- Masaustu screenshot regresyonu yok.
- Kalan fazlar icin yeni plan gereksinimi acik.

