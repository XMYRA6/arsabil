# Hesapla Mobil Görsel Kimlik — "Mühür Lacivert" (Faz 1.5)

## Durum

**Tamamlandı.** Bu plan `feature/hesapla-muhur-lacivert` branch'inde uygulandı ve 7 görevin tamamı (token temeli, palet uygulaması, kat-dilimi şeridi, brass CTA/slider override, SealBadge animasyonu, sticky CTA SVG ikonu, final doğrulama) bitti. Commit aralığı: `2940a48..fbf89f8` (6 uygulama commit'i) + bu final doğrulama commit'i. Bu spec artık açık iş değil — gelecekteki oturumlar bunu bekleyen bir plan olarak yeniden açmamalı.

## Bağlam ve Problem

Faz 0+1 (2026-07-03 — 2026-07-06, `feature/mobil-ui-faz0`, main'e merge `a6397ed`) hesapla, listing, marketplace ve dashboard sayfalarını mobil-first olarak **yapısal** biçimde yeniden kurdu: inline stiller CSS module'e taşındı, dokunma hedefleri düzeltildi, `StickyActionBar`/`SegmentedTabs`/`BottomSheet` gibi primitifler entegre edildi. Bu iş ekranda görünmeyen bir refactor'dü — kullanıcı sonucu canlı ortamda gördüğünde ("yatay carousel → dikey tek kolon" dışında bir şey görmedim) hayal kırıklığına uğradı ve gerçek bir **görsel kimlik** talep etti.

Bu spec, sadece **hesapla sayfasının mobil görünümü** için o görsel kimliği tanımlar. Diğer 3 sayfa (listing/[id], marketplace, dashboard) ve masaüstü görünüm kasıtlı olarak kapsam dışıdır (bkz. "Kapsam Dışı").

## Konsept: Kadastro/Mühür

ArsaBil bir "fintech hesap makinesi" değil; arsa sahibinin tapu/kadastro/imar diliyle yüksek bahisli bir mülk-takas kararı verdiği yer. "Premium" burada parlaklık değil **güven + kesinlik** anlamına gelir. Üç renk yönü (Mühür Lacivert / Tapu Yeşili / Kiremit Toprak) mockup olarak sunuldu; kullanıcı **Mühür Lacivert**'i seçti: mürekkep lacivert + pirinç mühür sarısı.

## Kapsam

- **Sayfa:** yalnızca `src/app/hesapla/page.tsx` mobil görünümü (`.mobileSidebar`, `.mainPanel`/`.summaryPanel` mobil render yolu, `.mobileAccordions`, `StickyActionBar`).
- **Cihaz:** yalnızca mobil (`@media (max-width: 768px)` — Faz 1'de kurulmuş eşik). Masaüstü (`.desktopSidebar`, masaüstü `.blueBox`/`.statCard` görünümü) **değişmez**.
- Değişiklikler `src/app/hesapla/page.module.css`, `src/app/hesapla/page.tsx`, `src/app/hesapla/AdvancedSettingsSections.tsx` dosyalarıyla sınırlıdır. `globals.css`'e yeni **global** token eklenmez — tüm yeni renk token'ları hesapla'nın kendi CSS module'ünde, mobil media query içinde tanımlanır.

## Renk ve Tipografi Token'ları

Yeni token'lar `hesapla/page.module.css` içinde, mevcut mobil `@media (max-width: 768px)` bloklarının izlediği desenle (Faz 1 Task 2/8/9'da doğrulanan "mobil-only kural = media query içinde" kuralı) tanımlanır:

```css
@media (max-width: 768px) {
  .container {
    --seal-ink: #0F2A43;
    --seal-ink-2: #16324F;
    --seal-accent: #C9A15A;
    --seal-accent-rgb: 201, 161, 90;
    --seal-paper: #F4F0E6;
  }
}
```

- Mevcut semantik renkler (`--green`, `--orange`, `--red`, piyasa karşılaştırma rengi) **değişmez** — sadece marka/vurgu rengi değişir.
- Mevcut mavi marka rengi (`--primary` #1F6FEB) hesapla mobil görünümünde **hiç kullanılmaz** (ne buton ne slider); genel navbar/logo gibi sayfa-dışı yerlerde olduğu gibi kalır.
- `--seal-accent` (pirinç sarısı) **tek vurgu rengi** olur: birincil butonlar (Rapor Kaydet, sticky CTA), slider dolgusu, mühür rozeti, kat-dilimi şeridi hep bu tonu kullanır.
- Yeni bir display/serif font paketi **eklenmez** (data-URI `@font-face` yükü ve marka tutarlılığı riski gerekçesiyle kullanıcı onayıyla kapsam dışı bırakıldı) — mevcut başlık fontu korunur.
- Tüm parasal/yüzde/m² rakamları (`.topResultValue`, `.blueBoxTop h2`, `.statCardValue`, stat card `.v` değerleri) `font-variant-numeric: tabular-nums` alır; ayrıca bir mono/data font stack'e geçilir: `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (sistemde zaten mevcut, yeni paket gerekmez).

## "Canlı Mühür" — Sonuç Rozeti

- Mevcut `.topResultBadge` (yalnızca `manualMarketPrice > FD_total` iken, yani proje piyasaya göre daha ucuzken görünen "Piyasaya Göre: %X DAHA UCUZ" rozeti) görsel olarak güçlendirilir: küçük bir mühür/onay SVG ikonu + `--seal-accent`'in düşük opaklıklı arkaplanı.
- Rozet ilk görünür hâle geldiği anda (koşulun `false → true` geçişi — input her değiştiğinde değil, yalnızca eşik geçildiğinde) framer-motion ile tek seferlik bir "damga oturma" animasyonu oynar: `initial={{ scale: 1.4, rotate: -6, opacity: 0 }}` → `animate={{ scale: 1, rotate: 0, opacity: 1 }}`, ~180ms, spring easing. framer-motion zaten proje bağımlılığı (Faz 1 `StatsStrip`/`FeaturesGrid`'de kullanıldı) — yeni paket eklenmez.
- `prefers-reduced-motion` altında animasyon oynamaz, rozet doğrudan son hâliyle render edilir (projede zaten kurulu pattern).
- Koşul `false → false` veya `true → true` geçişlerinde (ör. iki rakam değişip rozet true kalmaya devam ederse) animasyon **tekrar tetiklenmez** — yalnızca görünürlük durumunun kendisi değiştiğinde.

## "Kat Dilimi" Accordion

- 3 mobil accordion (`Formül Parametreleri`, `Proje Maliyet ve Riskleri`, `Piyasa Analizi`, `<details>/<summary>` yapısı korunur, JS eklenmez):
  - `summary` içindeki ok/chevron ikonu açık durumda 90° döner (mevcut `[open]` selector deseni).
  - İçerideki her `.drawerRow` (bkz. `AdvancedSettingsSections.tsx`) solunda ince (~2.5px) dikey `--seal-accent` şeridi belirir — kat planı kesiti hissi.
  - **Scope önemli:** `.drawerRow` hem mobil accordion'larda hem masaüstü ayarlar drawer'ında paylaşılan bir class. Şerit doğrudan `.drawerRow`'a değil, `.mobileAccordions .drawerRow::before` gibi kapsayıcı-scope'lu bir selector'a eklenir — böylece masaüstü drawer'ı ve component'lerin kendisi (`AdvancedSettingsSections.tsx`) değişmeden kalır, sadece CSS scope'u genişler.

## Buton/İkon Rolleri

- Birincil aksiyonlar: `StickyActionBar` içindeki "Özet Rapor Oluştur" ve `actionBottomRow`'daki "Rapor Kaydet" → `--seal-accent` dolgulu, koyu ink metin (`--seal-ink`) — kontrast için.
- İkincil aksiyonlar ("PDF İndir", "+ Karşılaştır") → mevcut `outline` stilinde kalır, border/hover tonu `--seal-accent`'e kayar.
- Emoji ikonlar: `page.tsx` içinde 5 yerde emoji var ama **yalnızca biri gerçekten mobil-only** — `StickyActionBar` (`display: none` masaüstünde, `StickyActionBar.module.css`), içindeki "📄 Özet Rapor Oluştur" ince çizgi SVG ikonla değiştirilir.
  - `.blueBoxTop` (📐), `.pagerLabel` (📊/📈/💰) **aynı JSX masaüstüyle paylaşılıyor** (ayrı bir `.desktopX`/`.mobileX` çifti yok, sadece CSS media query ile yeniden düzenleniyor) — bunlara **dokunulmaz**, kullanıcı kararıyla kapsam dışı bırakıldı; masaüstü bu şekilde hiçbir emoji/ikon değişikliği görmeyecek.

## Kapsam Dışı

- Masaüstü görünüm (`.desktopSidebar`, masaüstü `.blueBox`) — dokunulmaz.
- `.blueBoxTop` (📐) ve `.pagerLabel` (📊/📈/💰) emoji'leri — masaüstüyle paylaşılan JSX oldukları için bu round'da değiştirilmez.
- listing/[id], marketplace, dashboard sayfaları — ayrı bir sonraki round'da, aynı palet/tipografi ile ele alınabilir.
- Yeni serif/display font paketi eklenmesi.
- `globals.css` seviyesinde token değişikliği.

## Test Planı

- Mevcut jest paketi (103/103) kırılmadan geçmeli.
- Yeni testler: (1) Canlı Mühür rozetinin yalnızca `false→true` geçişinde animasyon prop'larıyla render edildiği, `true→true`/`false→false`'da tekrar tetiklenmediği; (2) `prefers-reduced-motion: reduce` altında animasyonsuz/son-hal render; (3) kat-dilimi şeridinin `.mobileAccordions` dışında (ör. masaüstü drawer render'ında) görünmediği.
- Mobil e2e smoke (390×844, Faz 0'da kurulan harness) genişletilerek hesapla ekranının yeni renk/animasyon durumuyla yatay taşma yaratmadığı doğrulanır.
- Gerçek "premium his" doğrulaması yine insan gözlemine bırakılır (Faz 1'in 3 bekleyen insan-doğrulama kalemine ek bir kalem olarak not düşülür, bloklayıcı değildir).
