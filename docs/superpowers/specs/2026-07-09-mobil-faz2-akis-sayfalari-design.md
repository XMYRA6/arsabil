# Mobil UI Faz 2 — Akış Sayfaları (Yapısal Refactor) Tasarım Dokümanı

**Tarih:** 2026-07-09
**Durum:** Onaylandı
**Kapsam:** `listings/new` (wizard), `listings/[id]/edit`, `inbox`, `login`/`register` — 4 akış/sayfa
**Görsel dil:** Değişmez (salt yapısal refactor, Faz 1 ile aynı yaklaşım — bkz. `docs/superpowers/specs/2026-07-03-mobile-ui-redesign-design.md` §6 Kapsam Dışı). Bir sonraki iş olarak ayrı bir görsel-kimlik fazı (hesapla/dashboard/profile'da olduğu gibi) düşünülebilir, bu fazın parçası değil.

---

## 1. Bağlam

Bu, `2026-07-03-mobile-ui-redesign-design.md`'nin Faz 2'sidir. Faz 0 (primitifler: `AppBar`, `DataCard`/`CardList`, `BottomSheet`, `StickyActionBar`, `SegmentedTabs`, `SwipeGallery`) ve Faz 1 (hesapla/marketplace/listing/dashboard) tamamlanıp main'e merge edildi. Faz 1.5 (görsel kimlik — Mühür Lacivert/Airbnb) hesapla/dashboard/profile'a ayrıca uygulandı, bu fazın kapsamı DIŞINDA.

## 2. Mevcut Durum (keşif bulguları)

### 2.1 Wizard (`listings/new/page.tsx`, 115 satır) + Edit (`listings/[id]/edit/page.tsx`, 158 satır)

- **Neredeyse birebir kopya**: aynı 4 step bileşenini (`WizardStep1Location`/`2Detail`/`3Photos`/`4Feasibility`) ve aynı `page.module.css`'i (`edit` dosyası `../../new/page.module.css`'i relative import ediyor) paylaşıyorlar. Fark: edit'te veri yükleme `useEffect`'i + `PATCH` (new'de `POST`) + Step5 edit'te custom/inline (new'de `WizardStep5Preview` bileşeni kullanılıyor).
- 5 adım, tamamen client-side state (`useState(1)`), route değişmiyor.
- `WizardProgress.tsx` (48 satır) **tamamen inline stil**, CSS module yok — 5 numaralı daire + bağlantı çizgisi, responsive davranışı yok.
- Step nav (Geri/İleri) `.nav` flex satırı, sayfa içeriğiyle birlikte scroll oluyor — `StickyActionBar` değil.
- `page.module.css`'te tek mobil kural var (`@media max-width:768px` — kart padding'i).
- Fotoğraf adımında sıralama/kapak seçimi YOK (ilk yüklenen kapak oluyor) — bu fazda eklenmiyor (kullanıcı kararı).
- Global `Navbar` bu iki route'ta mobilde hâlâ görünür (`Navbar.tsx`'in `isHiddenOnMobile` listesinde yok).

### 2.2 Inbox (`inbox/page.tsx`, 324 satır + `inbox.module.css`, 453 satır)

- **Zaten çalışan bir mobil iki-panel geçişi var**: `isMobileChatActive` state + `.chatView` `transform: translateX(100%)`→`translateX(0)` (CSS transition), `.sidebar` mobilde `display:none` (chat açıkken). El yazımı SVG geri oku (`.backButton`, sadece mobil media query'de `display:flex`).
- `/inbox` zaten `Navbar.tsx`'in `isHiddenOnMobile` listesinde (`isInbox`) — AppBar eklenirse Navbar tarafında ek değişiklik gerekmez.
- 11 dağınık inline stil: avatar boyut override'ları (3 yerde), unread rozet, timestamp font-size, boş-durum bloğu (ikon+başlık+paragraf).

### 2.3 Login (`login/page.tsx`, 343 satır) + Register (`register/page.tsx`, 101 satır)

- **Login**: CSS module YOK, sayfanın tamamı (60 nokta) inline stil. Odak/blur `onFocus`/`onBlur` içinde `e.target.style` mutasyonu ile JS'te simüle ediliyor (gerçek `:focus` pseudo-class yok). Responsive davranış `dangerouslySetInnerHTML` ile enjekte edilen `<style>` etiketinde, attribute-selector hack'iyle (`div[style*="grid-template-columns"]`) 900px eşiğinde 2 kolon→1 kolona düşüyor — proje standardı 768px değil.
- **Register**: `Card`/`Input`/`Button` (kendi CSS module'leri var) kullanıyor, sadece 10 sayfa-seviyesi layout inline stili var. Hiç mobil media query yok, `maxWidth:450px` ile "doğal olarak" dar ekranda çalışıyor ama input yüksekliği/font-size iOS zoom'a karşı garanti edilmemiş.
- İkisi de global `Navbar`'da `isHiddenOnMobile` listesinde değil (Navbar mobilde görünür).
- **Cross-cutting bulgu**: `BottomNavbar` (`layout.tsx`'te koşulsuz render, `max-width:768px`'te CSS ile görünür) auth kontrolü yapmıyor — login/register'da da "Mesajlar/Profil/Raporlar" gibi auth gerektiren sekmeleri gösteriyor. Bu fazda düzeltiliyor (kullanıcı onayladı).

## 3. Tasarım

### 3.1 Wizard + Edit — ortak `WizardShell`

Yeni `src/components/listing-wizard/WizardShell.tsx`: prop'lar `title`, `step`, `totalSteps`, `onBack`, `canGoNext`, `onNext`, `nextLabel`, `isLastStep`, `children`.
- **Mobilde**: `AppBar` (title=adım başlığı, `showBack` ilk adımda hariç `onBack` ile geri) + kompakt `WizardProgress` + içerik + `StickyActionBar` (Geri/İleri veya Geri/Kaydet, `aboveBottomNav`).
- **Masaüstünde**: mevcut kart + `.nav` düzeni birebir korunur (byte-for-byte, sadece CSS module'e taşınan kısımlar hariç render aynı kalmalı).

Hem `new/page.tsx` hem `edit/page.tsx`, kendi state/veri-yükleme/submit mantığını korur, sadece JSX scaffold'unu bu shell'e devreder — mantıksal davranış (adım geçişleri, validasyon, API çağrıları) değişmez.

`WizardProgress` CSS module'e taşınır: masaüstünde mevcut 5-numaralı-daire görünümü aynen kalır, mobilde nokta/çizgi kompakt varyanta düşer (aynı bileşen, `@media max-width:768px` içinde farklı stil, yeni bileşen icat edilmez).

Fotoğraf adımına (`WizardStep3Photos`) dokunmatik sıralama eklenmiyor; sadece kaldır butonu gibi dokunma hedefleri ≥44px'e çekilir (mobil media query içinde, Faz 1'in "min-height sadece media query içinde" kuralı aynen uygulanır — masaüstü piksel-parite bozulmaz).

`Navbar.tsx`'in `isHiddenOnMobile` ifadesine `/listings/new` ve `/listings/[id]/edit` (yani `pathname.startsWith("/listings/")`) eklenir.

### 3.2 Inbox

Mevcut `isMobileChatActive` + `translateX` geçişi **aynen korunur** (yeniden icat edilmez, iyi çalışıyor). Tek yapısal değişiklik: el yazımı `.backButton` SVG'si `AppBar`'a devredilir (tutarlılık, `Navbar.tsx` tarafında ek değişiklik gerekmiyor çünkü `/inbox` zaten gizli listede). 11 inline stil `inbox.module.css`'e taşınır (avatar boyutları için CSS module varyantları, rozet, boş-durum bloğu).

### 3.3 Login

En büyük iş: yeni `login.module.css`. Kaldırılanlar: `dangerouslySetInnerHTML` `<style>` bloğu, JS `onFocus`/`onBlur` stil mutasyonu, attribute-selector hack'i. Yerine: gerçek `:focus` pseudo-class, gerçek `@media (max-width:768px)` (proje standardı, 900px değil) ile 2 kolon→1 kolon grid, input yüksekliği 48px + font-size ≥16px (iOS input zoom önleme). `@keyframes float`/`fadeSlide` CSS module'e taşınır (CSS module'lerde keyframe tanımlamak sorunsuz çalışır). `view` state (login/register/forgot arası geçiş) ve tüm form mantığı değişmez.

### 3.4 Register

Kalan 10 sayfa-seviyesi inline stil `register.module.css`'e taşınır (dış sarmalayıcı, form flex/gap, hata banner'ı, alt link). `Card`/`Input`/`Button` bileşenlerine dokunulmaz. Mobil padding/spacing için `@media (max-width:768px)` eklenir.

### 3.5 Cross-cutting: BottomNavbar login/register'da gizlenir

`BottomNavbar.module.css`'e (veya `layout.tsx` seviyesinde pathname kontrolüyle) `/login` ve `/register` route'larında `display:none` eklenir — desen, `Navbar.tsx`'in mevcut `isHiddenOnMobile` pathname-kontrol yaklaşımıyla tutarlı olacak şekilde uygulanır.

## 4. Global Kısıtlar

- Masaüstü davranışı/görünümü hiçbir sayfada değişmez (piksel-parite, Faz 1'deki gibi kontrol edilir).
- Breakpoint 768px (proje standardı) — login'in mevcut 900px hack'i bu değere düşürülür.
- Dokunma hedefi ≥44px, form input yüksekliği mobilde 48px, font-size ≥16px (iOS zoom önleme).
- Yeni inline `style={{}}` yazılmaz (mevcutlar temizlenir); tek istisna varsa (dinamik hesaplanan değer) açıkça gerekçelendirilir.
- Fotoğraf sıralama/kapak seçimi bu fazın kapsamı DIŞINDA (backlog notu).
- `WizardShell` sadece bu iki sayfa arasındaki mevcut tekrarı gideriyor — yeni bir soyutlama katmanı/genel amaçlı "her wizard için" çerçevesi kurulmuyor (YAGNI).

## 5. Doğrulama Stratejisi

Faz 1 deseni aynen: her task'ta jest scope-guard testleri (regex tabanlı CSS kapsam kontrolü, dosya-metni okuyan pattern) + masaüstü piksel-parite kontrolü + tam komut paketi (tsc/eslint/jest). Final task'ta gerçek Playwright ile 4 akışın tamamı mobil (390×844) VE masaüstü (1440×900) authenticated olarak doğrulanır (giriş: `manualcheck@local.test`/`Test1234!`, ayrıca login/register akışı oturumsuz test edilir). Yatay taşma kontrolü (`scrollWidth > innerWidth`) her sayfada.

## 6. Görev Sırası (öneri, plan yazımında netleşecek)

1. `WizardShell` + mobil `WizardProgress` (CSS module, izole, henüz hiçbir sayfaya bağlanmadan)
2. `listings/new` entegrasyonu (shell'e geçiş, mevcut davranış korunur)
3. `listings/[id]/edit` entegrasyonu (aynı shell, edit'e özgü Step5/veri-yükleme dokunulmadan)
4. Inbox: AppBar entegrasyonu + inline temizlik
5. Login: CSS module dönüşümü (en riskli/en büyük task)
6. Register: CSS module dönüşümü
7. BottomNavbar login/register gizleme
8. Final: tam komut paketi + Playwright (4 akış × mobil/masaüstü + login/register oturumsuz)

## 7. Kapsam Dışı

- Fotoğraf adımında dokunmatik sıralama/kapak seçimi (yeni özellik, backlog).
- Görsel kimlik/renk paleti değişikliği (ayrı, gelecekteki bir "Faz 2.5" olabilir).
- Wizard step sayısının/akışının değişmesi.
- `forgot` (şifremi unuttum) akışının davranış değişikliği — sadece stil taşınır.
