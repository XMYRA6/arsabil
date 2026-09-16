# ArsaBil Mobil UI — Teknik Audit (Impeccable)

**Tarih:** 2026-09-17
**Kapsam:** `src/components/mobile/`, `src/app/hesapla/mobile/`, `src/app/marketplace/` (mobil arama), `src/app/deger/`, `src/components/deger/DegerKarti.tsx`, `src/app/dashboard/` (mobil formlar), `src/components/akif/`, `src/app/globals.css` (viewport/safe-area token'ları)
**Yöntem:** Kod-seviyesi statik inceleme (tarayıcı/dev sunucu kullanılmadı) + Impeccable bundled detector (`detect.mjs`). Bulgular dosya:satır ile doğrulanabilir.

## Audit Health Score

| # | Boyut | Puan | Ana Bulgu |
|---|-------|------|-----------|
| 1 | Accessibility | 3 | `--touch-target: 44px` token'ı tutarlı kullanılıyor; tam ARIA/kontrast taraması bu kapsamın dışında (bkz. Sınırlar) |
| 2 | Performance | 3 | Bu kapsamda layout-thrash/expensive-animation bulunmadı; derin render-profil analizi yapılmadı |
| 3 | Responsive Design | 2 | **2 sayfada** (profil düzenle, ayarlar) klavye-farkındalıksız `position:fixed;bottom:0` Kaydet çubuğu — projenin kendi çözdüğü bir problemin regresyonu |
| 4 | Theming | 4 | `--m-*` mobil token sistemi (glassmorphism redesign) tutarlı ve kapsamlı uygulanmış |
| 5 | Implementation Integrity | 2 | Aynı `.saveBar` CSS bloğu 2 dosyada bit-bit kopya; mevcut yeniden-kullanılabilir `StickyActionBar` bileşeni yerine bu kopyalanmış |
| **Toplam** | | **14/20** | **İyi (zayıf boyutlar giderilmeli)** |

## Implementation Integrity Verdict

**Kısmen geçti.** Proje genelinde tutarlı bir mobil tasarım dili (`--m-*` token'ları, `useKeyboardInset` deseni) var ve BİLİNÇLİ olarak kurulmuş (kod içi Türkçe yorumlar kök nedeni ve önceki bug'ı belgeliyor). Ancak bu tutarlılık HER YERDE uygulanmamış: `dashboard/profile/edit` ve `dashboard/settings` sayfaları, projenin kendi `StickyActionBar` bileşenini kullanmak yerine onun ERKEN/eksik bir kopyasını yazmış — tam olarak `StickyActionBar`'ın çözdüğü klavye sorununu yeniden yaşıyor. Detector 3 düşük-önem "slop" bulgusu buldu (aşağıda).

## Executive Summary

- **Audit Health Score:** 14/20 (İyi)
- **Bulgu sayısı:** P0: 1, P1: 1, P2: 3, P3: 2
- **En kritik 3 bulgu:**
  1. Profil düzenleme + Ayarlar sayfalarındaki "Kaydet" çubuğu klavye açıkken input'un üstünü kapatabilir/kendisi klavyenin altında kalabilir (P0)
  2. Bu iki sayfa arasında bit-bit aynı, kopyalanmış `.saveBar` CSS bloğu — DRY ihlali + tek bir kaynaktan fix'lenebilecek bir hata iki yerde ayrı ayrı yaşıyor (P1)
  3. `StudioSaveDialog`/`ShareProposalDialog` (Studio — mobilde de kullanılıyor) ortalanmış `position:fixed;inset:0` diyaloglarında input var ama klavye-farkındalığı yok (P2)
- **Önerilen sıradaki adım:** `/impeccable adapt` (klavye-farkındalık fix'i) → `/impeccable polish`

## Detaylı Bulgular

### P0 — Bloke Edici

**[P0] Kaydet çubuğu klavye açıkken erişilemez/örtüşür olabilir**
- **Konum:** `src/app/dashboard/profile/edit/page.module.css:247-258`, `src/app/dashboard/settings/page.module.css:247-258`
- **Kategori:** Responsive Design
- **Etki:** Her iki sayfa da mobilde `.saveBar { position:fixed; left:0; right:0; bottom:0; ... }` kullanıyor — `bottom:0` SABİT, `--keyboard-inset` hiç referans edilmiyor. Kullanıcı formdaki bir alana dokunup klavye açtığında (özellikle profil düzenleme formunda — sayfada en az 3 doğrudan `<input>` var), bu birincil "Kaydet" CTA'sı ya klavyenin ALTINDA kalır (görünmez) ya da (tarayıcıya göre) input'un üstüne biner. Kullanıcının bildirdiği "klavye açılınca arama/buton kayboluyor" şikayetiyle BİREBİR aynı hata sınıfı — proje bunu `BottomNavbar`, `BottomSheet`, `StickyActionBar`, `AkifChat` için ZATEN çözmüş (`useKeyboardInset()` hook'u + `--keyboard-inset` CSS değişkeni ile), ama bu iki sayfa o çözümü hiç kullanmıyor.
- **WCAG/Standart:** WCAG 2.1 SC 1.4.10 (Reflow) ruhuna aykırı — birincil eylem klavye açıkken erişilemez hale geliyor.
- **Öneri:** `.saveBar`'ı projenin kendi `src/components/mobile/StickyActionBar.tsx` bileşenine taşı (zaten `useKeyboardInset()` kullanıyor, `bottom: var(--keyboard-inset, 0px)` deseni hazır) — bespoke CSS'i silip mevcut bileşeni tüket.
- **Önerilen komut:** `/impeccable adapt`

### P1 — Önemli

**[P1] `.saveBar` CSS bloğu iki dosyada bit-bit kopya (DRY ihlali)**
- **Konum:** `src/app/dashboard/profile/edit/page.module.css:247-258` ↔ `src/app/dashboard/settings/page.module.css:247-258`
- **Kategori:** Implementation Integrity
- **Etki:** Aynı 12 satırlık kural bloğu (özellik-özellik, değer-değer aynı) iki ayrı dosyada duruyor. Bu, P0 bulgusunun neden İKİ yerde birden yaşandığını açıklıyor — kaynak tek bir bileşen olsaydı (StickyActionBar), fix de tek yerden gelirdi. Gelecekte bir üçüncü form sayfası eklenirse bu kopyalama deseni muhtemelen tekrar edecek.
- **Öneri:** P0'ın önerdiği `StickyActionBar` geçişi bu bulguyu da otomatik kapatır — ayrı bir fix gerekmez.
- **Önerilen komut:** `/impeccable adapt` (P0 ile birlikte)

### P2 — Minor

**[P2] Studio diyaloglarında (mobilde de kullanılıyor) input + klavye-farkındalık yok**
- **Konum:** `src/components/studio/StudioSaveDialog.tsx`/`.module.css:1-10`, `src/components/studio/ShareProposalDialog.tsx`/`.module.css:1-10`
- **Kategori:** Responsive Design
- **Etki:** İkisi de `position:fixed;inset:0;display:flex;align-items:center;justify-content:center` ile ortalanmış, içlerinde `<input>` var, `useKeyboardInset`/`visualViewport` hiç referans edilmiyor. `layout.tsx`'te `viewport.interactiveWidget` ayarlanmadığı için (bkz. Sistemik Bulgular) tarayıcı varsayılan davranışına bağlı olarak diyalog içeriği klavye açıkken kısmen kapanabilir. `ParcelVerificationSheet`'te AYNI sınıf hata daha önce bulunup düzeltilmişti (kod içi yorum bunu belgeliyor) — bu iki diyalog o düzeltmeden önce mi yazıldı yoksa sonradan mı eklendi belirsiz, ama aynı tedaviyi almamışlar.
- **Öneri:** `ParcelVerificationSheet`'in düzeltmesindeki deseni (`--keyboard-inset`'i `max-height`/pozisyona dahil etme) buraya da uygula.
- **Önerilen komut:** `/impeccable adapt`

**[P2] Detector: bounce/elastic easing**
- **Konum:** `src/components/mobile/MobileState.module.css:58` (`cubic-bezier(.34, 1.56, .64, 1)`)
- **Kategori:** Implementation Integrity (detector, "slop")
- **Etki:** Düşük — estetik bir "AI-üretimi görünüm" işareti, işlevsel bir hata değil.
- **Önerilen komut:** `/impeccable polish`

**[P2] Detector: side-tab accent border (2 yerde)**
- **Konum:** `src/app/dashboard/dashboard.module.css:216`, `src/app/dashboard/page.module.css:99` (`border-left: 4px solid var(--primary)`)
- **Kategori:** Implementation Integrity (detector, "slop")
- **Etki:** Düşük — token kullanımı doğru (hardcoded renk değil), yalnızca desen kalıbı "tanıdık AI-UI" işareti sayılıyor.
- **Önerilen komut:** `/impeccable polish`

### P3 — Cila

**[P3] Accessibility/Performance boyutları bu turda sınırlı denetlendi**
- **Kategori:** Kapsam notu
- Bu audit özellikle kullanıcının bildirdiği klavye/arama-butonu şikayetine odaklandı. Kontrast oranları, tam ARIA etiket taraması, gereksiz re-render/memoization analizi bu kapsama dahil edilmedi — ayrı, kendi başına bir `/impeccable audit` (mobil formlar/erişilebilirlik odaklı) veya `/impeccable critique` bu boşluğu kapatabilir.

## Sistemik Bulgular

- **`viewport.interactiveWidget` hiç ayarlanmamış** (`src/app/layout.tsx:23-27`) — proje bu boşluğu BİLİNÇLİ olarak `useKeyboardInset()` manuel çözümüyle kapatmayı seçmiş (tercih, hata değil), ama bu seçim ancak HER bottom-fixed/ortalanmış-diyalog bileşeni hook'u tükettiğinde işe yarar. Kopyalanmış/bypass edilmiş bileşenler (yukarıdaki P0/P2) bu sözleşmeyi kırıyor.
- **Yeniden-kullanılabilir bileşen varken bespoke CSS yazma deseni** — `StickyActionBar` tam olarak `.saveBar`'ın ihtiyacını karşılıyor ama kullanılmamış. Gelecekte yeni bir "sabit alt CTA" ihtiyacı doğduğunda önce `StickyActionBar`'a bakılması iyi bir refleks olur.

## Olumlu Bulgular

- `useKeyboardInset()` hook'u (`src/components/mobile/useKeyboardInset.ts`) örnek düzeyde belgelenmiş — hem "klavye açılır" hem "Safari araç çubuğu kaybolur" senaryosunu tek bir ölçümle kapsıyor, kırpma yapmama kararının gerekçesi kod içinde açık.
- `BottomNavbar`, `BottomSheet`, `StickyActionBar`, `AkifChat`, `inbox/[userId]` bu hook'u zaten doğru tüketiyor — deseni bilen ve doğru uygulayan gerçek bir emsal var, bu P0 bulgusunu düzeltmek yeni bir tasarım gerektirmiyor, sadece mevcut deseni tüketmek yeterli.
- `ParcelVerificationSheet`'teki geçmiş klavye-taşma hatası gerçek bir Playwright ölçümüyle teşhis edilip düzeltilmiş, kök neden kod içi yorumlarla belgelenmiş — iyi bir mühendislik pratiği örneği.
- `--m-*` mobil tasarım token sistemi (glassmorphism) tüm incelenen dosyalarda tutarlı, hardcoded değer neredeyse yok.
- `--touch-target: 44px` (Apple HIG minimum) global token olarak tanımlı ve saveButton gibi yerlerde gerçekten kullanılıyor.

## Önerilen Aksiyonlar (öncelik sırası)

1. **[P0] `/impeccable adapt`** — `dashboard/profile/edit` ve `dashboard/settings`'in `.saveBar`'ını `StickyActionBar` bileşenine taşı (P0+P1'i birlikte kapatır).
2. **[P2] `/impeccable adapt`** — `StudioSaveDialog`/`ShareProposalDialog`'a `ParcelVerificationSheet` deseninde klavye-farkındalığı ekle.
3. **[P2] `/impeccable polish`** — detector'ın 3 düşük-önem "slop" bulgusunu (bounce-easing, 2× side-tab border) gözden geçir.
4. **[Sıradaki] `/impeccable critique`** — kullanıcının "genel olarak mobil UI profesyonel değil" değerlendirmesini bu audit'in kapsamadığı heuristik/UX boyutuyla tamamla.

Fix'ler uygulandıktan sonra `/impeccable audit`'i tekrar çalıştırıp skorun yükseldiğini doğrula.
