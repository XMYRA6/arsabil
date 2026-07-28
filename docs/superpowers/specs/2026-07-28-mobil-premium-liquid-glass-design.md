# ArsaBil Mobil — "Premium Liquid Glass" Tasarım Uygulaması

**Tarih:** 2026-07-28
**Durum:** Onay bekliyor
**Kapsam:** Yalnızca mobil (`max-width: 768px`). `≥769px` masaüstü düzeni DEĞİŞMEZ.
**Kaynak tasarım:** Claude Design projesi `335abf14-0488-4741-a438-275c4c421a28` — `ArsaBil Mobil.dc.html` + `design_handoff_arsabil_mobile/README.md`
**Önkoşul:** main `97e194e`

---

## 1. Bu spec ne yapar, ne yapmaz

Tasarım paketindeki **24 ekranın tamamını** ArsaBil'in mevcut ortamında yeniden inşa eder: Next.js App Router sayfaları + React bileşenleri + **CSS Modules** (projede Tailwind yok), `globals.css` token sistemi ve `src/components/mobile/*` primitifleri üzerinden.

Prototip HTML'i **kopyalanmaz**. Orada her şey satır içi stildir çünkü tek dosyada canlı akış içindir; üretimde CSS Modules sınıflarına ve token'lara çevrilir.

**Yapmaz:**
- Hesaplama motoru (`src/lib/calculator/engine_v2.ts`) değişmez. `4a` yalnızca sunum katmanıdır.
- Masaüstü düzenine dokunulmaz.
- Koyu tema mobil varyantı çizilmedi — bu spec **yalnızca açık tema** getirir (§4.3).

## 2. Alınan kararlar (insan onaylı, 2026-07-28)

**(a) İki fazlı görünürlük KALDIRILIYOR.** `isResultsRevealed` state'i ve "Sonuçları Göster" butonu silinir; sonuç kartı her zaman görünür ve canlıdır.

Bu, 2026-07-06'da kullanıcının açık talebiyle yapılmış bir tasarımın geri alınmasıdır ve sessizce yapılmamıştır. Özgün gerekçe "sayfa açılır açılmaz sessiz varsayılanlarla anlamsız bir sonuç gösteriliyor" idi. Yeni tasarımda bu endişe **kart tasarımıyla** karşılanıyor: sonuç ekranın en üstünde, girdilerin üstünde duruyor ve her girdi değişiminde canlı güncelleniyor, yani "gizli varsayılanla hesaplanmış eski sonuç" hissi oluşmuyor. Karar kullanıcıya bu gerekçeyle sunuldu ve onaylandı.

**(b) Faz 2.5 (akış sayfalarına mühür kimliği) İPTAL.** O işin tamamı koyu lacivert `--seal-*` kimliğini login/register/wizard/inbox'a taşımaktı. Bu tasarım `--seal-*` lacivert yüzeyleri mobilde kullanmıyor ve tam o ekranları farklı bir dille yeniden çiziyor. Donmuş worktree (`.claude/worktrees/faz2-5-muhur-kimlik`, branch `worktree-faz2-5-muhur-kimlik`, Task 4 staged-commitsiz) kapatılacak.

**(c) Uydurma veri etiketleri KALIR.** `fizibiliteSkoru`/`arsaPayiMin/Max`/`imarDurumu`/`emsal` Prisma şemasında yok; 2026-07-28'de alınan karar gereği mock veri kalıyor ama "Örnek veri" uyarılarıyla işaretli. Yeni tasarımda bu uyarılar **cam kart dilinde yeniden çizilir, kaldırılmaz**.

## 3. Doğrulanmış kod gerçekleri

Tasarımın varsaydığı altyapının mevcut durumu ölçüldü (2026-07-28):

| Varsayım | Gerçek |
|---|---|
| 5 sekmeli düz alt çubuk, FAB yok | ❌ `BottomNavbar.tsx:71-75` ortada FAB'lı — kaldırılacak |
| Açık tema token'ları | Kısmen: `globals.css:98` `[data-theme="light"]` var, ama cam/mesh/degrade token'ları yok |
| JetBrains Mono | ❌ yok, eklenecek (`globals.css:4` yalnızca Inter) |
| Mobil primitifler | ✅ `AppBar`, `BottomSheet`, `SegmentedTabs`, `StickyActionBar`, `DataCard`, `SwipeGallery` mevcut |
| Ekranların API'leri | ✅ **hepsi mevcut** — `api/favorites`, `api/notifications`, `api/offers`, `api/user/profile`, `api/user/account`, `api/admin` |

**Eksik route'lar (6 adet, hepsi mevcut API üzerinde ince sayfa):** `/dashboard/favorites`, `/dashboard/listings`, `/dashboard/profile/edit`, `/dashboard/settings`, `/listing/[id]/offers`, `/notifications`. Ayrıca `/offline` (+`sw.js` önbellek kuralı).

**Tasarım dosyası kısıtı:** `ArsaBil Mobil.dc.html` 265 KB ve MCP okuma sınırı 256 KiB olduğu için **kırpılmış geldi**; son kart `4u` (çevrimdışı + 404) markup'ı elde yok. README'de metinsel tarifi var (§"4s Bildirimler · 4t Admin · 4l Boş/iskelet · 4u Çevrimdışı/404") ve o tarif yeterlidir; görsel doğrulama gerekirse dosya parça parça yeniden çekilir.

## 4. Temel (Faz 0) — her ekranın bağlı olduğu katman

Tek başına gösterilemez ama onsuz hiçbir ekran doğru görünmez. İlk fazla birlikte teslim edilir.

### 4.1 Token katmanı

README'nin "Design Tokens" bölümündeki **literal değerler** `globals.css`'e mobil-kapsamlı token olarak eklenir. Değerler nihaidir, birebir uygulanır: renkler, mesh zemin (4 radyal degrade), cam reçetesi (`blur(30px) saturate(190%)` + `rgba(255,255,255,.66)` + `inset 0 1px 0 #fff`), yarıçap ölçeği (8→999), gölge ölçeği, tipografi ölçeği.

**Adlandırma:** yeni token'lar `--m-*` (mobile) ön ekiyle tanımlanır ve `@media (max-width: 768px)` içinde uygulanır. Mevcut `--seal-*` token'ları SİLİNMEZ (masaüstü hesapla sayfası onları kullanıyor, `e81faca`), yalnızca mobil ekranlarda kullanılmaz.

### 4.2 Tipografi

- **Inter** zaten var.
- **JetBrains Mono** eklenir. Kural: **tüm rakamlar** mono + `font-variant-numeric: tabular-nums` — para, yüzde, m², skor, tarih, sayaç. Proje bu deseni `ListingCard.module.css` ve `page.module.css`'te zaten kullanıyor; genelleştirilir.

### 4.3 Tema

Mobil tasarım açık tema için üretildi; koyu varyantı **çizilmedi**. Mobilde varsayılan `light`. Kullanıcının koyu tema tercihi masaüstünde aynen çalışmaya devam eder. Mobilde koyu tema seçilirse ne olacağı §9'da açık kalem.

### 4.4 İkonlar

24×24 viewBox, `stroke="currentColor"`, `stroke-width:2` (aktif sekme `2.4`), yuvarlak uçlar, ekranda 17–23px. **Emoji kullanılmaz** — mevcut koddaki `📍 🏗️ ⚙ 🔥 ❤️ 🤍 ✏️ 🗺 📄 📐 📊 📈 💰` hepsi çizgi ikona çevrilir. Harici paket eklenmez; satır içi SVG bileşen seti (`src/components/icons/`).

### 4.5 Alt navigasyon + layout

5 sekme, **FAB yok**: `Pazar · Raporlar · Ana sayfa · Mesajlar · Profil`. Yükseklik 74px + 22px home indicator; cam zemin; aktif sekmede degrade kapsül.

**Kritik:** içerik alt çubuğun altında kalmamalı. README bu hatanın prototipte üç kez tekrarlandığını söylüyor. Üretimde **tek bir layout bileşeninde** çözülür: kaydırılabilir alan `padding-bottom: calc(74px + 22px + var(--safe-bottom))`, sabit CTA da varsa `+ 72px`. Her sayfada elle tekrarlanmaz.

Alt çubuk **gizlenen** ekranlar: sohbet (`/inbox/[id]`), wizard (`/listings/new`), giriş/kayıt, ilan detay (yerine teklif çubuğu), alt yapraklar.

## 5. Fazlar

Faz 0 dışındaki her faz kendi başına gösterilebilir bir dilimdir.

| Faz | İçerik | Kart kimlikleri | Yeni route |
|---|---|---|---|
| **0** | Temel (§4) | — | — |
| **1** | Hesapla ve alt görünümleri | `2a`, `4a`, `4f`, `4n` | — |
| **2** | Pazar + ilan detay | `2c`, `4h`, `4i`, `4b` | — |
| **3** | Giriş, kayıt, ana ekran | `4k`, `4m`, `4g` | — |
| **4** | Mesajlar + sohbet + teklifler | `4j`, `4d`, `4p` | `/listing/[id]/offers` |
| **5** | Portföy: raporlar, favoriler, ilanlarım, senaryo karşılaştırma | `4c`, `4q`, `4o` | `/dashboard/favorites`, `/dashboard/listings` |
| **6** | Profil, düzenleme, ayarlar, bildirimler | `2d`, `4r`, `4s` | `/dashboard/profile/edit`, `/dashboard/settings`, `/notifications` |
| **7** | İlan sihirbazı (5 adım) | `4e` | — |
| **8** | Admin + motor ayarları | `4t` | — |
| **9** | Durum ekranları: boş, iskelet, çevrimdışı, 404 | `4l`, `4u` | `/offline` |

Her faz kendi implementasyon planını alır. Bu spec fazların **sınırlarını ve ortak kurallarını** tanımlar; ekran içi ayrıntı README'nin "Screens / Views" bölümündedir ve orası tek kaynaktır — buraya kopyalanmaz.

## 6. Faz 1 ayrıntısı (ilk uygulanacak)

Diğer fazlar sırası geldiğinde ayrıntılandırılır.

### 6.1 `2a` Hesapla

Yapı README §"2a Hesapla" ile birebir. Bu spec'e özel notlar:

- **`isResultsRevealed` kaldırılır** (§2a). Buna bağlı CSS attribute gate'i (`.container[data-revealed="true/false"]`) ve mobil `{isResultsRevealed && ...}` dalları da temizlenir. **Masaüstü davranışı değişmez** — o zaten koşulsuz gösteriyordu.
- **State modeli korunur:** `luxLevel`, `apartmentSize`, `isApartmentCountEnabled`, `totalApartments`, `ownerApartmentShare`, `landShareRatio`, `riskLevel`, `builderProfit`, `iksaMode`, `iksaPercentage`, `iksaManualTL`, `isAaEnabled`, `arsaAlani`, `manualMarketPrice`, `result`.
- **`ownerApartmentShare` tek gerçek kaynak kuralı korunur** — `docs/superpowers/specs/2026-07-24-hesapla-uxui-yeniden-tasarim-design.md`'deki davranış aynen kalır. Bu, 2026-07-24'te kapatılan gerçek bir bug'ın (sabit 8/N donması) çözümüdür, tasarım onu bozmaz.
- Karşılaştırma rozeti piyasa fiyatı boşsa **render edilmez** — mevcut `SealBadge` `show` koşuluyla aynı.
- T2'de eklenen risk öneri kartı (`RiskSuggestionCard`) ve `ParcelPicker` bu ekranda **masaüstü-only** idi (`isDesktopViewport`). Faz 1'de mobil yerleşimi `4f` yaprağına taşınır — böylece T2'nin "mobil kapsam dışı" takip kalemi de kapanır.

### 6.2 `4a` "Bu fiyat nereden geliyor?"

`HesapFisi.tsx`'in yerine geçer. Motor değişmez; `result.Mi`, `result.Ma`, `result.FD_total - result.M`, `result.FD_total` alanlarından üç cümle üretilir.

"Mühendis görünümü" toggle'ı mevcut `HesapFisi` satır dizilimini gösterir. Varsayılan **kapalı**, tercih `localStorage: arsabil-engineer-view`.

### 6.3 `4f` Gelişmiş ayarlar yaprağı

Üç akordeonun (`AdvancedSettingsSections`) yerine tek alt yaprak. İçerik mevcut `FormulParamsFields` / `RiskCostFields` / `MarketField` bileşenlerinden gelir, sade dille. Mevcut `BottomSheet` primitifi kullanılır (`aria-modal`, `--z-sheet`, odak yönetimi zaten var).

### 6.4 `4n` Analiz

Mevcut `src/components/charts/*`. **Bilinen bug düzeltmesi tasarıma gömülü:** grafikler `globalUnitPrice` kullanmalı, sabit `P: 10000` kalmamalı. Bu 2026-07-24'te düzeltildi; regresyon olmadığı doğrulanacak.

## 7. Etkileşim ve erişilebilirlik (tüm fazlar)

- **Canlı hesaplama:** her girdi değişiminde `CalculatorEngineV2.calculate` yeniden çalışır (mevcut `useEffect` deseni). Rakam geçişlerinde 160ms sayı animasyonu opsiyonel.
- **Basma geri bildirimi:** `transform: scale(.96)` 80ms; segment geçişi 220ms `cubic-bezier(.34,1.56,.64,1)`.
- **Alt yapraklar:** 280ms `cubic-bezier(.32,.72,0,1)`; tutamaçtan sürükleyerek kapanır; kapanışta odak açan butona döner.
- **Dokunma hedefi ≥44px** (`--touch-target`). Faz 1'in kurduğu kural korunur: touch-target `min-height` **yalnızca mobil media query içinde** tanımlanır — dışına konursa masaüstü birkaç px büyür (bu hata Faz 1'de üç kez yaşandı).
- **`prefers-reduced-motion: reduce`** altında tüm hareket kapanır. `SealBadge.tsx`'teki `useReducedMotion` deseni genelleştirilir.
- Slider'lar `role="slider"` + `aria-valuenow/min/max`; segmentler `role="tablist"`.
- Cam üzeri metin en az `#5c6b82` (≈4.9:1).

## 8. Test stratejisi

- **Kapsam guard testleri:** projede kurulu desen (`pageStyles.scope.test.ts`, `inbox.scope.test.ts`) — ham CSS metnini okuyup regex ile mobil-only kuralların media query dışına sızmadığını doğrular. Yeni `--m-*` token'ları ve cam sınıfları için aynı desen kullanılır.
- **RTL testleri** `/** @jest-environment jsdom */` pragma'sı gerektirir (repo varsayılanı `node`).
- **Leaflet mock'u** `MiniMap.test.tsx` ve `MapView.markers.test.tsx`'te kurulu; harita içeren ekranlarda yeniden kullanılır.
- **Bu oturumda üç kez çıkan desene dikkat:** async harita kurulumuyla yarışan effect'ler. Leaflet kullanan her yeni bileşende `mapReady` bayrağı + doğru bağımlılık dizisi zorunlu.
- Her faz sonunda: `tsc --noEmit`, tam `jest`, `eslint` (yeni ihlal yok — baseline 12), `npm run build`, ve 390×844'te canlı Playwright turu.

## 9. Açık kalemler / kapsam dışı

- **Koyu tema mobil varyantı yok.** Mobilde koyu tema seçili kullanıcıya ne gösterileceği kararlaştırılmadı — Faz 0'da geçici olarak mobilde açık temaya sabitlenir, kalıcı çözüm ayrı bir tur.
- **Fotoğraflar ve harita karoları** tasarımda placeholder. Gerçek görseller `api/upload`/Cloudinary üzerinden; harita Leaflet + CartoDB (mevcut `MapView`).
- **`4u` markup'ı elde yok** (§3) — README tarifinden uygulanır.
- **Uydurma fizibilite verisi** hâlâ mock (§2c). Kalıcı çözüm (alanları şemaya ekle + sihirbazda topla) bu spec'in dışında.
- **`/offline`** servis worker değişikliği gerektirir (`public/sw.js` → `/hesapla` önbelleğe alınmalı); Faz 9'da ele alınır.
