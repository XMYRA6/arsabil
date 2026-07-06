# Hesapla Mobil — Cam Kart Düzeltmesi + Aurora Mavi Vurgu

## Durum

**Tasarım onaylandı, plan yazılacak.** Bu spec, Mühür Lacivert (bkz. `2026-07-06-hesapla-mobil-muhur-lacivert-design.md`) sonrası kullanıcının light temada bulduğu bir kontrast hatasını ve bir renk/görsel tercihini ele alır. Mühür Lacivert planı **iptal edilmiyor** — bu spec onun üzerine bir düzeltme/revizyon katmanıdır.

## Bağlam ve Problem

Mühür Lacivert planı, mobil hesapla'daki kartları (`topResultCard`, `blueBox`, `statCard`, `accordion`) her temada **sabit** koyu lacivert arka plana (`--seal-ink`/`--seal-ink-2`, hardcoded hex) geçirdi. Bu kartların içindeki bazı metinler (`accordionSummary`, `topResultLabel/Value`, `statCard h5/Value`) açıkça `--seal-paper` (krem) rengine zorlandı ve bu yüzden sorunsuz görünüyor. Ama accordion **içeriği** (`AdvancedSettingsSections.tsx`'teki `.drawerRowLabel`, `.luxBox`, `.stepperInput` vb.) hiç dokunulmadı — bunlar hâlâ tema-duyarlı `--label-color`/`--muted`/`--card-title` kullanıyor.

Kök neden: light temada `--label-color: #19324f` neredeyse `--seal-ink-2: #16324F` ile aynı ton — yani "Formül Parametreleri", "Proje Maliyet ve Riskleri" (özellikle içindeki "Risk Payı" satırı) accordion'ları açıldığında etiket ve değerler koyu lacivert zemin üstünde koyu lacivert metin olarak render oluyor, pratikte görünmüyor.

Ayrıca kullanıcı `--seal-accent` (pirinç/mühür sarısı `#C9A15A`) rengini beğenmedi ve site genelinde zaten kullanılan Aurora kimliğine (mor→mavi→cyan marka gradienti, `--primary` mavi) daha yakın, daha "doğal" bir tona dönülmesini istedi.

## Kullanıcı Kararları (netleştirme oturumu, 2026-07-06)

1. **Kart arka planları temaya göre ayrışır:**
   - **Light tema:** Sabit koyu lacivert yerine, sitenin zaten kullandığı beyaz buzlu cam deseni — `.unifiedGlassPanel`/`.drawerCard`'da kurulu `var(--shell-bg)` + `var(--shell-border)` + `backdrop-filter: blur(24px)` konvansiyonunun aynısı. Yeni bir rgba değeri icat edilmez, mevcut token yeniden kullanılır.
   - **Dark tema:** Mevcut koyu lacivert gradient (`--seal-ink` → `--seal-ink-2`) **aynen korunur** (kullanıcı "zaten harika duruyor" dedi) — yalnızca kozmetik bir `backdrop-filter: blur()` eklenerek gerçek cam hissi hafifçe güçlendirilebilir, yapısal değişiklik yok.
2. **`--seal-accent` tek ton açık Aurora mavisine döner:** `#4C8DFF` civarı (kesin hex implementasyon sırasında ince ayar yapılabilir), gradient değil düz ton. Bu, mevcut `--primary` (`#1F6FEB`) ile **kasıtlı olarak farklı/daha açık** bir mavi — Mühür Lacivert planındaki "hesapla mobilde `--primary` hiç kullanılmaz" kararı ruh olarak korunur, ama artık pirinç yerine kendi başına açık bir mavi vurgu tonu kullanılır. Bu tek token her iki temada da aynı kalır (yalnızca kart *arka planı* temaya göre değişir, *vurgu rengi* değişmez).
3. **Buton "reverse" (dolgu) deseni PDF İndir ve Karşılaştır'a genişletilir, yalnızca mobilde:**
   - **PDF İndir:** `sealOutlineBtn` → `sealPrimaryBtn` deseni (dolu `--seal-accent` arka plan + koyu/beyaz metin), Rapor Kaydet ile birebir aynı görsel dil.
   - **Karşılaştır:** `compareBtn` şu an media query **dışında** tanımlı (masaüstü + mobil ortak, yeşil outline). Reverse edilmiş (dolu yeşil arka plan + beyaz metin) hâli **yalnızca mobil media query içinde** yeni bir override olarak eklenir — masaüstü `compareBtn` outline stilinde **değişmeden kalır**. Karşılaştır kendi yeşil kimliğini korur, maviye dönüşmez.

## Kapsam

- **Dosyalar:** `src/app/hesapla/page.module.css` (ana değişiklik), gerekirse `src/app/hesapla/page.tsx` (className eklemesi, örn. Karşılaştır butonuna mobil-reverse sınıfı).
- **Cihaz:** yalnızca mobil (`@media (max-width: 768px)`), Mühür Lacivert'teki eşikle aynı. Masaüstü kartlar, masaüstü Karşılaştır butonu **değişmez**.
- `globals.css`'e yeni **global** token eklenmez (Mühür Lacivert kuralı korunur) — ama mevcut global `--shell-bg`/`--shell-border` token'ları mobil hesapla scope'u içinde *okunur/kullanılır* (yeni token icat etmek yerine).
- `AdvancedSettingsSections.tsx` (`.drawerRow`, `.luxBox`, `.stepperInput` içerikleri) **değişmez** — light temada kart arka planı beyaz cam olduğunda, bu içeriklerin zaten kullandığı tema-duyarlı `--label-color`/`--muted`/`--card-title` token'ları otomatik olarak doğru kontrastı sağlar. Bu spec'in "kontrast düzeltmesi" kısmı, içerik CSS'ine dokunmadan sadece kart arka planını doğru temaya bağlayarak çözülür.

## Teknik Yaklaşım (illüstratif — kesin uygulama planında netleşir)

Mevcut sabit `--seal-ink`/`--seal-ink-2` tanımı, tema bazlı iki ayrı bloğa bölünür (ikisi de aynı mobil media query içinde):

```css
@media (max-width: 768px) {
  .container {
    --seal-accent: #4C8DFF;
    --seal-accent-rgb: 76, 141, 255;
  }

  [data-theme="dark"] .container {
    --seal-ink: #0F2A43;
    --seal-ink-2: #16324F;
    --seal-surface: linear-gradient(160deg, var(--seal-ink) 0%, var(--seal-ink-2) 100%);
    --seal-text: #F4F0E6;
    --seal-text-rgb: 244, 240, 230;
    --seal-border: rgba(var(--seal-accent-rgb), 0.25);
  }

  [data-theme="light"] .container {
    --seal-surface: var(--shell-bg);
    --seal-text: var(--card-title);
    --seal-border: var(--shell-border);
  }
}
```

`.topResultCard`, `.blueBox`, `.statCard`, `.accordion` gibi sınıflar artık sabit `var(--seal-ink)`/`var(--seal-ink-2)` yerine `var(--seal-surface)`/`var(--seal-text)`/`var(--seal-border)` kullanır — sınıf isimleri ve JSX değişmez, sadece token kaynağı temaya göre dallanır. `accordionBody` içeriğine (drawerRow vb.) **hiçbir yeni renk kuralı eklenmez** — onlar zaten kendi tema-duyarlı token'larını kullanıyor ve artık arka planla senkron olacaklar.

Kesin özellik listesi (hangi selector'ların `--seal-ink`'ten `--seal-surface`'e geçeceği, `--seal-paper`'ın nerede kaldırılıp nerede korunacağı, blur değerinin dark temada tam olarak ne olacağı) uygulama planında (writing-plans) task bazında netleştirilir.

## Kapsam Dışı

- Mühür Lacivert planının "Canlı Mühür" rozeti, kat-dilimi şeridi, tabular-nums, iki fazlı UX akışı gibi diğer tüm kararları — **değişmeden kalır**, bu spec sadece renk/arka plan katmanını revize eder.
- Masaüstü görünüm, masaüstü Karşılaştır butonu.
- listing/[id], marketplace, dashboard sayfaları.
- `globals.css` seviyesinde yeni token.
- `--seal-accent-rgb` hex'inin nihai/tam tonu — `#4C8DFF` bir başlangıç noktası, uygulama sırasında gerçek ekran görüntüsüyle (light beyaz cam + dark lacivert üstünde) kontrast/estetik doğrulaması yapılıp gerekirse küçük ayar yapılabilir.

## Test Planı

- Mevcut jest paketi (125/125) kırılmadan geçmeli.
- `pageStyles.scope.test.ts` (mevcut kapsam-guard deseni) genişletilir: (1) `compareBtn` reverse override'ının yalnızca `@media (max-width:768px)` içinde olduğu, masaüstü selector'ına sızmadığı; (2) `--seal-surface`/`--seal-text`/`--seal-border`'ın hem `[data-theme="dark"]` hem `[data-theme="light"]` bloklarında tanımlı olduğu (biri eksik kalırsa card arka plansız/transparent kalır — regresyon).
- Playwright mobil smoke: light temada accordion'lar açılıp "Risk Payı" gibi etiketlerin görünür (yeterli kontrast) olduğu, dark temada mevcut görünümün bozulmadığı manuel/görsel olarak doğrulanır (bu proje genelinde kurulu "gerçek tarayıcı kontrolü" pattern'i).
- Manuel doğrulama: light ve dark temada hesapla sayfası açılıp 3 accordion + üst sonuç kartı + 4 aksiyon butonu ekran görüntüsüyle karşılaştırılır.
