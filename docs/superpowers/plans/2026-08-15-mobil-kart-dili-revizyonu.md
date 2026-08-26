# Mobil Kart Dili Revizyonu Implementation Orchestration Plan

> **For agentic workers:** This is the umbrella plan for `docs/superpowers/specs/2026-08-15-mobil-kart-dili-revizyonu-design.md`. Use the phase plans below for detailed task execution.

**Goal:** Mobil ekranlarda her seyin ayni cam karta donusmesi hissini azaltmak; istatistik, ilan/fotograf ve liste satiri yuzeylerini tek kaynakli, tekrar kullanilabilir ve erisilebilir desenlerle ayirmak.

**Canonical Phase Plan:** `docs/superpowers/plans/2026-08-15-mobil-kart-dili-revizyonu-faz1.md`

## Scope

- Faz 1: Paylasimli `.mStatSurface` / `.mRowList` global yuzeyleri, Ana sayfa, Dashboard raporlari, Mesajlar, ListingCard mobil override temizligi ve iki `window.alert()` kaldirma.
- Faz 2: Faz 1'de bilerek kapsama alinmayan foto/ilan, profil alt ekranlari, ikincil sayfalar ve kalan mobil glass tekrarlarinin role gore ayrilmasi.

## Global Constraints

- Degisiklikler mobil scope ile sinirli kalir: `@media (max-width: 768px)` veya zaten mobile-only kullanimlar.
- Masaustu tasarim, hesap motoru ve backend contract'lari bu revizyonun parcasi degildir.
- `--brand-gradient`, `--m-grad-accent` ve mevcut button/badge accent kullanimlari silinmez.
- Tek bir genel glass kart komponenti uretilmez; yuzeyler icerik rolune gore ayrilir.
- Skeleton loader yayginlastirma ve site-geneli a11y denetimi ayri planlanir.

## Phase Gates

### Gate 1: Faz 1

- [x] `src/app/globals.css` icinde `.mStatSurface` ve `.mRowList` tek kaynakli hale gelir.
- [x] Ana sayfa, Dashboard raporlari ve Mesajlar kopya glass recetesi yerine global yuzeyleri compose eder.
- [x] `ListingCard` mobil glass override'i kaldirilir.
- [x] `dashboard/profile` ve `listings/new` icindeki `window.alert()` kullanimlari inline hata mesajina doner.
- [x] Faz 1 test/tsc dogrulamalari yesil olur.

### Gate 2: Faz 2

- [x] Faz 1 sonrasi kalan `--m-glass-*` kullanimi envanterlenir.
- [x] Fotograf/ilan yuzeyleri `.mEditorialListingCard` desenine tasinir.
- [x] Profil alt ekranlari, ikincil sayfalar, bildirimler ve ayarlar role gore `.mStatSurface`, `.mRowList` veya editorial desenlerine ayrilir.
- [x] Kalan glass kullanimi icin `keep/custom` gerekcesi dokumante edilir.

## Final Acceptance

- Mobil kart dili icerik rolune gore ayrisir; tum yuzeyler ayni cam kart gibi gorunmez.
- Paylasimli desenler tek kaynaklidir ve yeni kopya glass recetesi eklenmesine gerek birakmaz.
- Dokunulan interaktif yuzeylerde focus ve active geri bildirimi gorunur.
- Coverage indeksinde bu spec ana orchestration dosyasiyla kapanir; detayli uygulama faz dosyalarindan dispatch edilir.

