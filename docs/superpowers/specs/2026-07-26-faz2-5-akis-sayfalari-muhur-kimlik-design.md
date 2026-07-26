# Faz 2.5 — Akış Sayfalarına Mühür Kimliği (Design)

Tarih: 2026-07-26 · Durum: kullanıcı onaylı, plan yazılmadı
Kapsam: `listings/new` + `listings/[id]/edit` (ortak `WizardShell`), `inbox`, `login`, `register`

## 1. Neden

Mobil UI yol haritasının yapısal fazları tamamlandı: Faz 0 (primitifler), Faz 1 (hesapla/marketplace/listing/dashboard), Faz 2 (bu dört akış sayfası, `docs/superpowers/specs/2026-07-09-mobil-faz2-akis-sayfalari-design.md`, 9 task, 2026-07-09/10'da merge edildi). Görsel kimlik (Mühür Lacivert → cam + aurora aksan) ise ayrı ayrı 6 sayfaya uygulandı.

Sonuç: kimlik bugün 9 CSS modülünde tanımlı (hesapla 51 tanım, listing 22, ScenarioCompare 21, marketplace 16, dashboard 12+6, profile 9, admin 8, compare 6) ama **wizard, inbox, login ve register'da sıfır**. Bu dört sayfa yapısal geçişi aldı, görsel geçişi hiç almadı.

Bu boşluk sürpriz değil; Faz 2 spec'i kendi §7'sinde ilan etmişti:

> "Görsel kimlik/renk paleti değişikliği (ayrı, gelecekteki bir Faz 2.5 olabilir)."

Bu doküman o Faz 2.5'tir.

## 2. Onaylanan kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Kırılım kapsamı | **Yalnızca mobil** (`@media max-width: 768px`) | listing/marketplace/dashboard/profile/admin'in deseni. Masaüstü byte-for-byte değişmez → regresyon yüzeyi minimum. (hesapla tek istisna: orada kimlik sayfa geneline yayılmış; bu fazda o örnek izlenmiyor.) |
| Derinlik | **Kapsamlı + imza öge** | Bu dört sayfanın baskın görsel öğeleri panel değil form kontrolleri. Yalnızca panel yüzeylerini boyamak 2026-07-06'daki "sadece renk değişimi mi yapıyoruz?" geri bildirimini tekrar üretirdi. |
| Sohbet balonları | **Yalnızca `.bubbleMine`** | Kimlik sohbette görünür olur; `.bubbleTheirs` nötr kalır, kaydırılan mesaj listesine `backdrop-filter` katı girmez, kontrast riski doğmaz. |
| Canlı Mühür kopyası | **Sayfa-local üçüncü kopya kabul** | Ortak bileşene çıkarmak stabil olan hesapla ve listing'e dokunmayı gerektirir. Borç §8'de açıkça kayıtlı. |

## 3. Token mimarisi

Her sayfa kendi `--seal-*` setini **kendi mobil media query'si içinde**, sayfa kökü sınıfında tanımlar. `globals.css`'e hiçbir tanım sızmaz.

Token isimleri mevcut sayfalarla birebir aynı olmalı (yeni isim icat edilmeyecek):

```
--seal-surface       panel/kart yüzeyi (cam)
--seal-recessed      panel içindeki bir kademe geri hücre
--seal-border        kenarlık
--seal-border-soft   ikincil/iç kenarlık
--seal-text          birincil metin
--seal-text-muted    ikincil metin
--seal-text-faint    üçüncül metin
--seal-accent        var(--aurora-cyan) = #2b7cff (tek aksan)
--seal-accent-rgb    43, 124, 255
```

**Aksan değeri koddan doğrulandı:** altı modülün altısı da (`hesapla:22`, `dashboard:262`, `listing/[id]:532`, `marketplace:242`, `ScenarioCompare:154,162`) `--seal-accent: var(--aurora-cyan)` yazıyor; `--aurora-cyan` `globals.css:10`'da `#2b7cff`. Yeni sayfalar bu kanonik değeri kullanacak, literal hex yazılmayacak. (Bilinen sapma: hesapla'nın *kenarlık* rgba'sı `76, 141, 255`, diğer sayfalar `43, 124, 255` kullanıyor. Yeni sayfalar **çoğunluğu**, yani `43, 124, 255`'i izler.)

Tema duyarlılığı, hesapla'nın cam-aurora işinden gelen kanıtlanmış yapıyla kurulur — aynı mobil `@media` bloğu içinde iki tema dalı. Referans (`hesapla/page.module.css:26-39`):

```css
[data-theme="dark"] .container {
  --seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%);
  --seal-border: rgba(43, 124, 255, 0.25);
  --seal-border-soft: rgba(43, 124, 255, 0.18);
  --seal-text: #F4F0E6;
}
[data-theme="light"] .container {
  --seal-surface: var(--shell-bg);
  --seal-border: var(--shell-border);
  --seal-border-soft: var(--shell-border);
  --seal-text: var(--card-title);
}
```

Light dalında **yeni rgba icat edilmez**, mevcut global cam token'ları (`--shell-bg`, `--shell-border`, `--card-title`) yeniden kullanılır. `--seal-accent` tema-bağımsız tek değerdir.

**Seçici formu:** sayfa-local modüller `[data-theme="dark"] .x` yazıyor (CSS Modules yalnızca sınıf adlarını dönüştürdüğü için attribute seçici zaten global kalır); yalnızca `src/app/page.module.css` `:global([data-theme='light'])` formunu kullanıyor. Her dosya **kendi mevcut konvansiyonunu** izleyecek, karıştırılmayacak.

**Wizard'ın özel durumu:** token'lar `WizardShell.module.css` içinde `.container` üzerinde tanımlanır. Adım içeriklerini stilleyen `wizard.module.css` bunları ayrıca tanımlamaz — CSS custom property'leri dosya sınırından değil **DOM ağacından** miras alır, `.container`'ın altındaki her element `var(--seal-*)` okuyabilir. Böylece `listings/new` ve `listings/[id]/edit` tek kaynaktan beslenir.

## 4. Sayfa bazlı kapsam

Sınıf adları mevcut koddan doğrulanmıştır.

### 4.1 login (`src/app/login/login.module.css`)

Kimliğe giren: `.panel`, `.formSide`, `.formView`, `.input` (+`:focus`), `.submitBtn` (+`:disabled`, `:hover`), `.forgotLink`.

Dokunulmayan: `.brandSide` / `.brandPattern` / `.brandContent` — bunlar sayfanın kendi marka yüzeyi, kimliğin üstüne yazması istenmiyor. `.orbTop` / `.orbBottom` dekoratif orb'lar aynen kalır.

Not: login **paylaşılan bileşen kullanmıyor**, kendi `.input`/`.submitBtn` sınıfları var → doğrudan sınıf stillemesi yeterli.

### 4.2 register (`src/app/register/register.module.css`)

Kimliğe giren: `.column`, `.form`, `.header`, `.subtitle`, `.footerText`/`.footerLink` + paylaşılan `Input`/`Button`'ın **scoped override'ı**.

Dokunulmayan: `.errorBanner` (semantik kırmızı), `.logo`.

**Kritik teknik kural:** register `@/components/ui/{Card,Input,Button}` kullanıyor. Her iki bileşen de `className` prop'unu kendi sınıflarından **sonra** ekliyor:

```tsx
<div className={`${styles.wrapper} ${className}`}>            // Input
const btnClass = `${styles.button} ${styles[variant]} ... ${className}`;  // Button
```

Sınıf sırası attribute'ta değil, **stil sayfasındaki sıra** kazandırır; iki tek-sınıf seçici (0,1,0) eşit specificity'dedir → sıraya bağımlı ve kırılgan olur. Bu yüzden override'lar **bileşik seçici** ile yazılacak:

```css
input.sealInput  { ... }   /* (0,1,1) — tek sınıflı .input'u kesin yener */
button.sealSubmit { ... }
```

Bu, `button.compareBtn` hatasından (Faz 1 Task 6) öğrenilen ve o günden beri iki kez daha uygulanan desendir. Paylaşılan bileşen **dosyalarına** dokunulmaz; mevcut `register.scope.test.ts`'in "Card/Input/Button hâlâ import ediliyor" guard'ı korunur.

### 4.3 WizardShell (`src/components/listing-wizard/WizardShell.module.css` + `WizardProgress.module.css`)

Kimliğe giren: `.card` (cam yüzey), `.stickyNextBtn` (aksan dolgu), `.stickyBackBtn` (aksan outline), `WizardProgress`'in `.circleActive` / `.circleDone` / `.connectorActive` / `.connectorDone` / `.labelActive` (aksan).

Dokunulmayan: `.pageTitle`, `.stepTitle`, `.nav`, `.backBtn`, `.nextBtn` — bunlar masaüstü dalları; mevcut guard testleri bunların mobilde `display:none` olduğunu zaten koruyor ve o testler bozulmamalı.

`WizardProgress.module.css` de token tanımlamaz: bileşen DOM'da `.container`'ın altında render edildiği için `var(--seal-*)` değerlerini miras alır (§3'teki aynı kural). Aynı şey `wizard.module.css` için de geçerlidir — **tek tanım noktası `WizardShell.module.css`'tir**.

### 4.4 inbox (`src/app/inbox/inbox.module.css`)

Kimliğe giren: `.inboxContainer`, `.sidebar`, `.sidebarHeader`, `.searchBox`/`.searchInput`, `.convList`, `.convItem`, `.convItemActive` (aksan), `.chatHeader`, `.inputArea`, `.inputWrapper` (+`:focus-within`), **`.bubbleMine`** (aksan).

Dokunulmayan: `.bubbleTheirs`, `.messagesArea` (blur katmanı eklenmeyecek), `.unreadBadge` (semantik), teklif durum renkleri, `.msgMeta`/`.msgTimestamp`.

**Dikkat:** inbox'ın mobil bloğunda mevcut `!important` kullanımları var (ör. `.sidebar { width: 100% !important }`). Yeni kurallar bunlarla çakışan property'lere dokunmayacak; dokunması gerekiyorsa `!important` zincirini büyütmek yerine mevcut kuralı düzeltmek tercih edilecek.

## 5. İmza öge — Canlı Mühür

Wizard'ın son adımında (`WizardStep5Preview`, "İlanı Yayınla" başarısı) tek seferlik damga oturma animasyonu. Emsaller: `SealBadge.tsx` (hesapla, `false→true` geçişinde) ve `ScoreRevealBadge.tsx` (listing, paylaşılan rozeti sarmalayarak).

Kurallar:
- Yeni bileşen wizard-local olacak (`src/components/listing-wizard/PublishSealBadge.tsx`).
- `framer-motion` + `useReducedMotion` zorunlu; reduced-motion açıkken animasyon yok, son durum doğrudan render edilir.
- Animasyon **yalnızca mobilde** görünür; masaüstünde bileşen render edilse bile `display:none` ile gizlenir (kapsam kuralı).
- TDD ile yazılacak (emsallerinde olduğu gibi).

## 6. Bilinen tuzaklar (plana taşınacak)

1. **Specificity:** `:global([data-theme='…']) .x` = (0,2,0), düz `.x` = (0,1,0). Durum sınıfları (`.convItemActive`, `.bubbleMine`, `.circleActive`) tema override'larıyla aynı property'yi paylaşıyorsa **bileşik seçici** kullanılacak (`.convItem.convItemActive`). Sadece kuralı sona koymak kırılgandır.
2. **Light varsayılan tema** (`src/app/layout.tsx:58`) — light dalındaki bir kusur çoğunluk yolunu etkiler, "sadece tema değiştirenler görür" değildir.
3. **Paylaşılan bileşenler** (§4.2) — element+class zorunlu.
4. **`!important` mirası** (§4.4).
5. **Custom property mirası DOM üzerinden** (§3) — wizard'da ikinci tanım yazılmayacak.

## 7. Doğrulama

**Guard testleri** (mevcut dosyalara ekleme; inbox için yeni `inbox.scope.test.ts`):
- Her `--seal-*` tanımı mobil media query **içinde** mi (masaüstüne sızmadı mı).
- Masaüstü dalları (`.nav`, `.pageTitle`, `.stepTitle`, login `.brandSide`) değişmemiş mi.
- register hâlâ `Card`/`Input`/`Button` import ediyor mu; override'lar bileşik seçici mi.
- `.bubbleTheirs` ve `.messagesArea` `backdrop-filter` **almamış** mı (negatif guard).

**Playwright:** 4 akış × light/dark × 390px, artı masaüstü (1440px) regresyon kontrolü. Her sayfa için ekran görüntüsü + `getComputedStyle` doğrulaması — ekran görüntüsü tek başına yeterli kanıt sayılmayacak.

**Tam paket:** `npx tsc --noEmit`, `npx jest --no-coverage --roots "<rootDir>/src"`, `npx eslint`, `npm run build`.

## 8. Kabul edilen borçlar

- **Canlı Mühür üçüncü kopya:** `SealBadge` (hesapla) / `ScoreRevealBadge` (listing) / `PublishSealBadge` (wizard) aynı animasyon mantığını üç kez taşıyacak. Ortak bileşene çıkarma, üç sayfayı birden riske atmadan yapılabileceği bir zamana ertelendi. Kullanıcı bu borcu onayladı (2026-07-26).
- **Masaüstü tutarsızlığı sürüyor:** hesapla masaüstünde kimliği taşırken diğer sayfalar taşımıyor. Bu faz bu farkı kapatmıyor, büyütmüyor da.

## 9. Kapsam dışı

Masaüstü görünümü · paylaşılan `Card`/`Input`/`Button` dosyalarının kendisi · semantik renkler (hata/başarı/uyarı, teklif durumları) · yeni font · `globals.css` · diğer sayfalar · wizard'ın adım akışı/UX'i (yalnızca görsel dil).
