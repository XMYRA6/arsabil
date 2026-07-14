# Admin Panel — Mobil UX Düzeltmeleri + Mühür Kimliği (Faz 4)

## Bağlam

Admin Panel Kabuk Ayrımı (2026-07-12/13) admin'i ayrı bir kabuğa taşıdı (`SiteChrome`+`AdminTopBar`, koyu Mühür Lacivert + pirinç), ama 7 admin sayfasının **içeriği** o işin kapsamı dışında bırakılmıştı (bkz. [[project_arsabil]]). Bu spec o "Faz 4" işini kapsıyor: `src/app/admin/{page,listings,offers,analytics,users,settings,district-prices}/page.tsx` + paylaşılan `admin.module.css`.

Bu oturumda gerçek Docker+dev server+admin girişiyle (`admin@arsabil.com`/`admin123`) Playwright ekran görüntüleri alınarak masaüstü ve mobil (390×844) durum incelendi. Bulgular:

- **Masaüstü:** 7 sayfa da tutarlı çalışıyor (stat-grid + toolbar + tablo deseni), ama düz koyu-lacivert kutular — Mühür Lacivert cam/blur kimliği hiç yok, aktif nav/segment/birincil buton vurgusu standart marka mavisi (`var(--primary)`), AdminTopBar'ın pirinciyle tutarsız.
- **Mobil — gerçek kullanılabilirlik sorunları** (sadece estetik değil):
  - `admin.module.css`'in `.table`/`.tableWrap`'i (L228-241) mobilde herhangi bir sütun gizleme/kart dönüşümü yapmıyor; tablo `overflow-x:auto` ile yatay kaydırılabilir ama **hiçbir görsel ipucu yok** — Kullanıcılar sayfasında ilk görünümde sadece İsim+E-posta görünüyor, Rol/Durum/Doğrulandı/Plan/Rapor/İlan/Teklif/Kayıt/İşlemler sütunları keşfedilmeden kaydırma dışında ulaşılamıyor.
  - `district-prices/page.tsx`'te sayfa genelinde native yatay scrollbar'lar görünüyor (nav-tab satırı + tablo + sayfa altı) — tablonun `width:100%` olmasına rağmen (L243) `table-layout`/`white-space` kontrolü olmadığı için intrinsic içerik genişliği viewport'u aşıyor.
  - `analytics/page.tsx`'te "Dönüşüm Hunisi" (L75) ve "Rol Dağılımı"/"İl Dağılımı" (L95) inline `gridTemplateColumns: 'repeat(3,1fr)'` / `'1fr 1fr'` ile **sabit** — mobilde de yan yana kalıp daralıyor.
  - Sidebar→yatay-sekme-çubuğu dönüşümü (`admin.module.css` L405-430, zaten var) kenarda sert kesiliyor, kaydırma ipucu yok — marketplace'te 2026-07-08'de (`fix/marketplace-topbar-scroll-fade`) düzeltilen aynı desen, admin'e hiç uygulanmamış.
  - `settings/page.tsx` istisna: mobilde zaten iyi çalışıyor (form kartları tek kolon, `.profitLevelRow`'un kendi 900px grid-fix'i zaten var).
- **Kullanılmayan primitif:** Faz 0'da (`2026-07-03`) inşa edilen `src/components/mobile/DataCard.tsx` (`DataCard`/`CardList`) tam bu "tablo→mobil kayıt listesi" problemi için tasarlanmış ama şu ana kadar **kod tabanının hiçbir yerinde kullanılmamış**.

## Kullanıcı Kararları (brainstorming oturumu, 2026-07-14)

1. **Kapsam sınıflandırması:** Fonksiyonel mobil düzeltmeler (tablo→kart, grid fix, scroll-fade) ve görsel kimlik (Mühür Lacivert cam yüzeyi) **tek spec+plan** içinde, önceki fazların (Faz 1-3) desenine uygun şekilde ele alınır.
2. **Genel yaklaşım:** Sayfa-bazlı `DataCard`/`CardList` dönüşümü (Faz 0 primitifinin ilk gerçek kullanımı). Paylaşılan generic `AdminDataTable` soyutlaması **kurulmaz** — 4 tablonun (Kullanıcılar/İlanlar/Teklifler/İlçe Fiyatları) sütun/aksiyon şekilleri yeterince farklı (toggle switch, ikili onay/red butonu, renk rozetleri) ki premature bir generic API zorlama riski taşır (YAGNI).
3. **Vurgu rengi:** `.navItemActive`/`.segmentTabActive`/admin birincil butonları **admin.module.css'in paylaşılan (media-query dışı) kısmında** `var(--primary)`'den `var(--admin-accent)` (#C9A15A pirinç, zaten `.adminShell`'de tanımlı) değişir — **hem masaüstü hem mobil**, admin genelinde. Bu, "masaüstü dokunulmaz" kuralının bilinçli ve dar bir istisnasıdır: sadece bu renk token'ı değişir, hiçbir layout/spacing masaüstünde değişmez.
4. **Cam yüzey + `DataCard` dönüşümü:** yalnızca mobil (`@media max-width: 900px` — admin'in kendi mevcut breakpoint'i, diğer sayfaların 768px'inden farklı, aynen korunur).
5. **Semantik renkler dokunulmaz:** rol rozetleri, durum badge'leri (Aktif/Askıda/Onaylı/Bekliyor/Red), yeşil/kırmızı/turuncu anlamları hiç değişmez.

## Kapsam — Sayfa Bazlı Değişiklik Haritası

### 1) Paylaşılan `admin.module.css`

- **Admin geneli (masaüstü+mobil):** `.navItemActive`, `.segmentTabActive` arka planı + ilgili `box-shadow` `var(--primary)`→`var(--admin-accent)`. Birincil "Kaydet" butonları (settings, Button `variant="primary"` kullananlar) admin sayfalarında pirince geçer — `Button` bileşeninin kendisi değişmez, admin'e özel bir override/variant ile (kesin mekanizma uygulama planında).
- **Mobil-only (`@media max-width:900px` içinde):** `--seal-surface`, `--seal-border(-soft)`, tema-duyarlı çift (`[data-theme="dark"] .adminShell` / `[data-theme="light"] .adminShell`, hesapla/listing'teki desenin aynısı). `.statBox`, `.settingsCard`, yeni `DataCard` kartları bu yüzeye + `backdrop-filter: blur(24px)`'e geçer.
- Sidebar/yatay-sekme-çubuğu: sağ kenara scroll-fade `mask-image` (marketplace `.topBar` fix'inin birebir taşınması), mobil-only.

### 2) `admin/page.tsx` (Genel Bakış)

- Sadece stat kartlarına cam yüzey. Layout/markup değişmiyor.

### 3) `admin/users/page.tsx`

- Mobilde tablo yerine `CardList`/`DataCard`: `title`=avatar+isim, `subtitle`=e-posta, `fields`=[Rol, Durum, Doğrulandı, Plan, Rapor/İlan/Teklif sayıları (tabular-nums), Kayıt tarihi], `actions`=[rol seçici `<select>` + askıya al/kaldır butonu]. Masaüstü tablo hiç değişmez (aynı JSX dalı, `CardList` sadece mobil dalda render edilir — Faz 1-3'teki `{isMobile ? ... : ...}` yerine CSS-gate değil, çünkü DataCard ayrı bir DOM yapısı gerektiriyor; kesin JSX dallanma stratejisi uygulama planında netleştirilir).
- En aksiyon-yoğun sayfa — en riskli task.

### 4) `admin/listings/page.tsx`

- Mobilde `DataCard`: `title`=ilan başlığı, `subtitle`=sahibi+konum, `fields`=[Fiyat (tabular-nums), Teklif sayısı, Durum badge, Tarih], `actions`=[Onayla/Reddet (PENDING ise) veya Aktif/Pasif toggle + Sil].

### 5) `admin/offers/page.tsx`

- Mobilde `DataCard`, salt-okunur: `title`=teklif veren, `subtitle`=ilan+konum, `fields`=[Arsa Payı % (tabular-nums), Mesaj, Durum, Tarih]. `actions` slotu kullanılmaz (bu sayfada zaten mutasyon yok).

### 6) `admin/analytics/page.tsx`

- "Dönüşüm Hunisi" (L75-93) ve "Rol Dağılımı"/"İl Dağılımı" (L95-139) inline `gridTemplateColumns` mobilde tek kolona iner. Stat kartları + `.settingsCard` cam yüzeye geçer. "Son Kayıtlar" listesi zaten tek kolon, sadece cam yüzey.

### 7) `admin/settings/page.tsx`

- Sadece cam yüzey (`.settingsCard`, form input'ları dokunulmadan). Layout değişmez — zaten sağlıklı. `.profitLevelRow`/`.profitLevelHeader`'ın kendi 900px grid-fix'i (L552-567) korunur.

### 8) `admin/district-prices/page.tsx`

- Mobilde `DataCard`: `title`=İl/İlçe, `fields`=[Piyasa TL/m², İnşaat TL/m² (tabular-nums)], `actions`=[Düzenle + Sil]. Bu dönüşüm, tablonun mevcut sayfa-geneli yatay taşma bug'ını da örtük olarak gideriyor (tablo mobilde hiç render edilmeyeceği için) — ayrı bir taşma-fix task'ı gerekmiyor, ama implementasyon sırasında kök neden teyit edilecek (mobilde tablo dalının gerçekten hiç mount olmadığından emin olmak için).

## Kapsam Dışı

- Admin sayfalarının bilgi mimarisi/işlevleri (toplu işlem, yeni filtre türü, API/route değişikliği) — sadece mobil sunum + admin-geneli pirinç vurgusu.
- Masaüstü layout/spacing (pirinç renk token'ı hariç — karar #3).
- `globals.css`'e yeni global token eklenmesi — `--seal-*` seti her sayfanın/admin'in kendi mobil media query'sine scope'lanır (hesapla/listing kuralı aynen tekrarlanır).
- Admin dışı sayfalar.
- `DataCard`/`CardList` primitifinin kendi API'sinde değişiklik (mevcut haliyle kullanılabilir durumda, bkz. `src/components/mobile/DataCard.tsx` + `__tests__/DataCard.test.tsx`).

## Test Stratejisi

- Her sayfa için scope-guard jest testi (Faz 1-3 `pageStyles.scope.test.ts` deseni): mobil `--seal-*` override'ların `globals.css`'e sızmadığını, admin-geneli pirinç renk değişikliğinin sadece `.navItemActive`/`.segmentTabActive`/belirlenen birincil buton class'larına uygulandığını doğrulayan regex tabanlı testler.
- `DataCard`'a geçen 4 sayfanın her birinde: mobil görünümde aksiyonların (rol değiştir, askıya al, onayla/reddet, sil, düzenle) gerçekten çalıştığını doğrulayan render+click testi (mevcut `DataCard.test.tsx` altyapısı genişletilir, ağır mock'lama gerektirmiyor çünkü `DataCard` prop-driven bir sunum bileşeni).
- Final doğrulama: gerçek Docker+dev server+admin login (`admin@arsabil.com`/`admin123`) ile Playwright, light/dark tema × masaüstü/mobil viewport, 7 sayfa — bu oturumda kullanılan script (`admin-screenshots.js` deseni) yeniden kullanılabilir.

## Kabul Kriterleri

- 7 admin sayfasının hiçbirinde masaüstü görünüm/layout değişmiyor (pirinç renk token'ı hariç).
- Mobilde Kullanıcılar/İlanlar/İlçe Fiyatları sayfalarında tüm aksiyonlar (rol değiştirme, askıya alma, onaylama/reddetme, silme, düzenleme) ilk ekranda görünür/ulaşılabilir — yatay kaydırmaya bağımlı değil.
- `district-prices` sayfasında mobilde native sayfa-geneli yatay scrollbar kalmıyor.
- Analitik sayfasındaki çok-kolonlu grid'ler mobilde tek kolon.
- tsc 0, eslint 0, jest tam yeşil (mevcut 295/295 + yeni testler).
