# Mobil Kart Dili Revizyonu - Faz 2 Audit

Kaynak komut: `rg "m-glass-bg|m-glass-border|m-glass-blur|mGlass" src`

## Role envanteri

| Role | Dosyalar | Karar |
| --- | --- | --- |
| `stat` | `src/app/dashboard/favorites/page.module.css`, `src/app/dashboard/listings/page.module.css` | Hero, empty ve state yuzeyleri `.mStatSurface`; tekrar eden blur cam kabugu kaldirildi. |
| `editorial` | `src/app/dashboard/favorites/page.module.css`, `src/app/dashboard/listings/page.module.css` | Fotografli ilan kartlari `.mEditorialListingCard` ile ayrildi. Foto yoksa mevcut `.itemPhoto` placeholder devrede kalir. |
| `stat/action` | `src/app/listing/[id]/offers/page.module.css` | Teklif karti ve bos durum `.mStatSurface`; ilan/teklif aksiyonu kartlari editorial kart gibi davranmaz. |
| `row` | `src/app/inbox/*`, `src/app/dashboard/profile/profile.module.css` menu/list/favorite satirlari | Faz 1 row desenleri korunur; `.menuRow` -> `.mFlatRow`, `.listRow/.favRow` -> `.mRowList`. |
| `chrome` | `BottomNavbar`, `marketplace` mobil kontrolleri, inbox header/input/sidebar, wizard progress/shell, offers `backLink` ve `createPanel` | Navigasyon, sticky aksiyon ve arac cubuklari glass kalabilir; icerik karti sayilmaz. |
| `modal/sheet` | `BottomSheet`, wizard shell ve benzeri kaplama yuzeyleri | Sheet/modallerde cam dili bilincli korunur. |
| `keep/custom` | `login`, `register`, auth/form panelleri, `ScenarioCompare`, hesapla steppers/sheets, admin operasyon satirlari, settings/profile-edit input ve toggle borderlari | Kendi interaction/chrome modeli var; bu fazda zorla `stat/row/editorial` desenine tasinmaz. |
| `out-of-scope/false positive` | Token tanimlari, test beklentileri, Pazar `ListingCard` accent/button/badge kullanimlari | Tokenlar global sozlesme icin kalir; Faz 1 Pazar kart referansi yeniden tasarlanmaz. |

## Notlar

- `.mEditorialListingCard` light-only olarak dokumante edildi; koyu tema fallback bu fazda yeni bir tema sistemi icat etmeden eklenmedi.
- `--m-glass-*` kalan kullanimlar icerik karti degil; navigasyon, sticky action, modal/sheet veya form/chrome yuzeylerinde bilincli tutuldu.`r`n- `src/app/dashboard/notifications` klasoru bu worktree'de bulunmuyor; bildirim taramasi dosya yoklugu nedeniyle audit'te out-of-scope sayildi.`r`n- `src/app/dashboard/settings/page.module.css` ve `src/app/dashboard/profile/edit/page.module.css` icerik kabuklari `.mStatSurface`; kalan glass sadece input/toggle kenari ve fixed `.saveBar` chrome yuzeyi.`r`n- `src/app/dashboard/profile/profile.module.css` icerik kabuklari `.mStatSurface`, satirlar `.mFlatRow/.mRowList`; `deleteModalCard` modal yuzeyi olarak glass kalir ve mevcut scope testi bunu korur.`r`n- `src/app/login/login.module.css` ve `src/app/register/register.module.css` ana form kabuklari `.mStatSurface`; kalan `m-glass-border` kullanimi form kontrol kenarligi olarak keep/custom.
- Ilan teklifleri sayfasinda fotografli ilan ozeti karti bulunmadigi icin mevcut gradient `summaryCard` ozet/hero yuzeyi olarak korundu; teklif kartlari stat/action desenine tasindi.


