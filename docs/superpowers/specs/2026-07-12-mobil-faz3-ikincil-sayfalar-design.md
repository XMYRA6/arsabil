# Mobil Faz 3 — İkincil Sayfalar (board temizliği, compare, profile, dashboard alt sayfaları, mesaj badge)

**Tarih:** 2026-07-12
**Durum:** Onaylandı, implementasyon planı bekleniyor

## 1. Bağlam

Mobil UI redesign'ın master spec'i (`docs/superpowers/specs/2026-07-03-mobile-ui-redesign-design.md`) 4 fazlı bir yol haritası tanımlamıştı: Faz 0 (primitifler), Faz 1 (çekirdek sayfalar: hesapla/marketplace/listing/dashboard), Faz 2 (akış sayfaları: wizard/inbox/login/register), Faz 3 (ikincil sayfalar), Faz 4 (admin). Faz 0-2 tamamlanıp main'e merge edildi (main artık `7d7b4ac`). Faz 1 sonrası kullanıcı geri bildirimiyle "Mühür Lacivert" görsel kimliği (cam panel + tabular-nums + `--seal-*` token deseni) doğdu ve hesapla/listing/marketplace/dashboard'a uygulandı — Faz 3 bu kimliği ikincil sayfalara taşıyan ilk faz olacak (önceki fazlar salt yapısaldı, bu kez baştan görsel kimlikle birlikte).

Bu spec, master spec'in Faz 3 satırlarını (`compare/[token]`, `profile/[userId]`, `dashboard/projects`, `dashboard/reports`, `board`, `BottomNavbar` badge, landing denetimi) güncel kod durumuna göre somutlaştırır.

## 2. Kapsam

**Dahil:**
1. `/board` sayfasının ve middleware kaydının silinmesi.
2. `ScenarioCompare` bileşeninin mobil kart-kaydırma dönüşümü (hesapla/dashboard-projects/compare üç tüketicisini birden etkiler).
3. `compare/[token]` sayfası: Mühür kimliği + yapısal denetim.
4. `profile/[userId]` sayfası: Mühür kimliği + dokunma hedefleri.
5. `dashboard/projects`: inline stil temizliği + mobil DataCard düzeni + Mühür kimliği.
6. `dashboard/reports`: mobil DataCard düzeni + Mühür kimliği.
7. `BottomNavbar`'a gerçek okunmamış-mesaj sayısı rozeti.
8. Landing sayfası (`/`) taşma/dokunma-hedefi denetimi (kod değişikliği beklenmiyor, yalnızca doğrulama).

**Kapsam dışı:**
- `dashboard/profile` (Airbnb-tarzı yeniden tasarımla zaten tamamlandı, dokunulmayacak).
- Masaüstü görsel/davranışsal değişiklikler (tüm işler `@media max-width:768px` içinde kalır).
- Admin sayfaları (Faz 4).
- Yeni özellik ekleme, badge dışında (roadmap M5'ten öne alınan tek istisna, master spec'te zaten onaylı).
- Native app / PWA, performans optimizasyonu — ayrı işler.

## 3. `/board` Silme

**Gerekçe:** `/board` (`src/app/board/page.tsx`) marketplace'in daha eski, daha az işlevli bir kopyası — filtre, harita, favoriler, mühür kimliği yok, ilan detayına link vermiyor, teklif akışı ayrı bir modal olarak tekrar implemente edilmiş. Uygulama içinde hiçbir yerden bu sayfaya link verilmiyor (Navbar/BottomNavbar'da rota yok); yalnızca `middleware.ts:16`'da auth koruması kaydı var.

**Yapılacak:**
- `src/app/board/page.tsx` silinir.
- `middleware.ts:16`'daki `"/board", "/board/:path*"` girdileri kaldırılır.
- Silmeden önce repo genelinde `/board` string referansı (import, link, test, e2e dahil) grep ile taranır; bulunursa değerlendirilip temizlenir.
- `/api/offers` POST endpoint'i board'un teklif modalı tarafından da kullanılıyordu ama marketplace'in kendi teklif akışı zaten aynı endpoint'i kullanıyor — endpoint'e dokunulmaz.

## 4. ScenarioCompare Mobil Kart Dönüşümü

**Neden bileşen seviyesinde:** `ScenarioCompare` üç yerden tüketiliyor (`hesapla/page.tsx`, `dashboard/projects/page.tsx` içindeki modal, `compare/[token]/page.tsx`). Bileşende yapılacak tek bir mobil dönüşüm üçünü birden kapsar.

**Desen:** Kurulu self-gating deseni (WizardShell/AppBar'da kanıtlanmış) izlenir — bileşen HEM mevcut tabloyu HEM yeni mobil kart kaydırıcısını render eder, görünürlüğü JSX koşulu değil CSS media query belirler. Bu, SSR/hydration riskini ortadan kaldırır ve masaüstü DOM'unun/davranışının byte-for-byte aynı kalmasını garanti eder.

**Mobil görünüm (≤768px):**
- Her senaryo tam-genişlik-eksi-peek bir cam kart (`--seal-surface` + blur24px), `scroll-snap-type: x mandatory` ile yatay kaydırma.
- Kart içinde etiket–değer satırları dikey sıralı (Arsa Payı, Daire m², FD Toplam, FD/m², Risk Payı, vb. — mevcut tablonun sütunlarıyla birebir aynı veri, aynı sıra).
- Tüm parasal/yüzde/m² değerler tabular-nums.
- Alt kısımda nokta (dot) göstergesi, aktif kart vurgulu.
- Bir sonraki kartın kenarı görünür kalır (peek), kaydırılabilirlik ipucu.

**Ek iş:** Bileşenin kendi 13 inline stil sitesi bu sırada `ScenarioCompare.module.css`'e taşınır (masaüstü tablo pixel-parite korunarak).

**Guard testi:** Mevcut desenle aynı — mobil blokta seal token'ları VAR, base blokta YOK; ayrıca masaüstü tablo elemanlarının mobilde `display:none`, mobil kart sarmalayıcısının masaüstünde `display:none` olduğunu doğrulayan pozitif+negatif testler.

## 5. Sayfa Şasileri — Mühür Kimliği + Yapısal Temizlik

Kurulu desen (`docs/superpowers/specs/2026-07-07-listing-marketplace-dashboard-muhur-kimlik-design.md`'de tanımlanan) aynen izlenir:
- Her sayfa kendi `--seal-*` token setini kendi mobil `@media(max-width:768px)` bloğunda tanımlar, `globals.css`'e sızmaz.
- Panel-seviyeli yüzeyler cam olur (`--seal-surface` + `backdrop-filter: blur(24px)`).
- Semantik-renksiz hücreler/satırlar `--seal-recessed` tonuna geçer (panelle aynı camda kaybolmasın diye).
- Semantik renkli yüzeyler (durum rozetleri, risk/kâr renkleri) dokunulmaz.
- Parasal/yüzde/m² değerler tabular-nums.
- Dokunma hedefleri (buton/satır min-height) yalnızca mobil media query içinde ≥44px (Faz 1'den beri süregelen kural — base kuralda olursa masaüstü büyür).

### 5.1 `compare/[token]`
Sayfa zaten ince (61 satır, tamamen CSS module, sıfır inline). İş: başlık kartı + CTA butonuna Mühür dokunuşu (cam panel, accent buton). Esas görsel dönüşüm §4'teki ScenarioCompare'den geliyor, bu sayfa onu sarmalıyor.

### 5.2 `profile/[userId]`
Sayfa zaten tek kolon, sıfır inline stil. İş: `.section` panelleri cam yüzeye geçer, liste satırları (`listRow`) dokunma hedefine ve `--seal-recessed`'e uyar, rakamlar (arsa payı %, fiyat) tabular-nums.

### 5.3 `dashboard/projects`
148 satır, 13 inline stil site. İş: inline stiller `dashboard.module.css`'in mobil bloğuna (veya yeni bir sayfa-local module'e — implementasyon planında netleşir) taşınır; proje satırları mobilde DataCard benzeri kart düzenine geçer (proje adı + senaryo sayısı üstte, Excel/detay aksiyonları kart altında buton grubu); boş durum mesajı mobil uyumlu; ScenarioCompare modalı §4'ün mobil kart görünümünü otomatik miras alır.

### 5.4 `dashboard/reports`
78 satır, tek inline site — en hafif iş. Satırlar DataCard/recessed düzenine, tarih/oran değerleri tabular-nums.

## 6. BottomNavbar — Okunmamış Mesaj Rozeti

**Veri kaynağı:** `/api/messages` GET endpoint'i zaten her konuşma için `unreadCount` döndürüyor (`src/app/api/messages/route.ts:34-48`). Masaüstü `Navbar.tsx`'teki mevcut rozet tamamen sahte/statik veriyle çalışıyor (`NOTIFS` sabit dizisi) — bu iş onu düzeltmiyor, yalnızca BottomNavbar'a gerçek veri ekliyor.

**Davranış:**
- BottomNavbar (zaten `"use client"`) oturum varken mount'ta ve `pathname` değiştiğinde `/api/messages`'ı fetch eder, dönen konuşmaların `unreadCount` toplamını hesaplar.
- Mesajlar sekmesinin ikonu üzerinde kırmızı rozet: toplam 0 ise rozet render edilmez, 1-9 arası sayı, 9'dan büyükse "9+".
- SSE (`/api/messages/sse`) kullanılmaz — her sayfada kalıcı bağlantı açmanın maliyeti bu küçük özelliğe göre orantısız; pathname değişimi (özellikle inbox'tan çıkış) sayıyı yeniden tazeler, yeterli tazelik.
- Oturumsuz kullanıcıda fetch hiç yapılmaz, rozet hiç render edilmez.
- Fetch hatası durumunda rozet sessizce gizli kalır (mevcut sessiz-hata deseniyle tutarlı, `dashboard/page.tsx`'teki `r.ok` kontrolü dersinden farklı olarak burada kritik veri değil, best-effort UI zenginleştirmesi).

## 7. Doğrulama Stratejisi

- **CSS guard testleri:** kurulu çift-yönlü desen (mobil blokta seal token'ı VAR + base blokta YOK) her dönüştürülen sayfa için.
- **BottomNavbar badge:** TDD, mock fetch ile 0/tekil/9+ senaryoları + oturumsuz durum.
- **ScenarioCompare:** mevcut tablo/yeni kart ikisinin de doğru koşulda görünür/gizli olduğunu doğrulayan testler.
- **Faz kapanışında tam komut paketi:** `tsc --noEmit`, `eslint`, `jest --no-coverage`, `npm run build`.
- **Playwright mobil smoke (390×844):** compare (test içinde API ile paylaşım token'ı üretilir), profile, dashboard/projects, dashboard/reports eklenir; yatay taşma (`scrollWidth > innerWidth`) assertion'ı her sayfada.
- **Landing denetimi:** kod değişikliği beklenmiyor — Playwright ile taşma/dokunma-hedefi spot-check yeterli.
- **Masaüstü regresyon:** her dönüştürülen sayfa için pixel-diff veya computed-style karşılaştırması (Faz 1/2'de kurulan `pngdiff.js` aracı veya computed-style yöntemi — ekran görüntüsü yorumlamak yerine computed style'a güven dersi, bkz. Faz 2 ledger notu).
- **Ortam notu:** middleware `/dashboard/*` rotalarını auth'a bağlıyor; Docker + `manualcheck@local.test` ile login gerekiyor (bilinen kısıt, önceki fazlardan).

## 8. Riskler

- `ScenarioCompare` üç yerden tüketildiği için değişikliği en riskli parça — hesapla ve dashboard/projects'teki mevcut davranışın (senaryo ekleme/çıkarma, paylaşım linki üretme) hiç bozulmaması gerekiyor. Self-gating CSS deseni bu riski büyük ölçüde azaltıyor ama implementasyon planında bu bileşen ayrı, dikkatli bir task olarak ele alınmalı.
- `/board` silinirken `/api/offers` gibi paylaşılan endpoint'lere yanlışlıkla dokunulmamalı — sadece sayfa+middleware kaydı kaldırılıyor.
- BottomNavbar'ın her pathname değişiminde fetch atması (mesajlaşma dışı sayfalarda bile) gereksiz ağ trafiği yaratabilir — implementasyon planında debounce/interval değerlendirilebilir, ancak spec bunu zorunlu kılmıyor (YAGNI, gerçek bir performans şikayeti yok).

## 9. Kapsam Dışı Bırakılan Alternatifler

- ScenarioCompare için "tablo + yatay kaydırma sarmalayıcı" ve "dikey yığılmış kartlar" seçenekleri değerlendirildi, kullanıcı yatay snap-scroll kart kaydırıcısını seçti.
- `/board` için "mobil redesign yap" ve "dokunma, Faz 3 dışı bırak" seçenekleri değerlendirildi, kullanıcı silme kararını verdi.
- Mesaj rozeti için "sadece kırmızı nokta" seçeneği değerlendirildi, kullanıcı gerçek sayı gösterimini seçti.
