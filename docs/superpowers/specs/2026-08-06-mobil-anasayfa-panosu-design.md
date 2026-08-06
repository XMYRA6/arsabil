# Mobil Ana Sayfa — Giriş Yapmış Kullanıcı Panosu — Tasarım

**Tarih:** 2026-08-06
**Durum:** Onaylandı (brainstorming, görsel companion ile mockup karşılaştırması), implementasyon planı bekliyor.

## Problem

`src/app/page.tsx` (kök `/` rotası) hiç `session` kontrolü yapmıyor: hem ilk kez gelen anonim
ziyaretçi hem de zaten giriş yapmış, `BottomNavbar`'dan "Ana sayfa" sekmesine her dokunan kullanıcı
**aynı tam pazarlama sayfasını** görüyor — Hero → İstatistik şeridi → Özellikler bento grid → Nasıl
Çalışır → Vizyon/Misyon → ilan/blog/testimonial → CTA, mobilde tek dar sütuna sıkıştırılmış ~10.900px
uzunluğunda bir scroll. Kullanıcının kendi ifadesiyle: *"web UI'dakini baz almış ama sanki bana
uyumsuz... mobil tarafında daha farklı şeyler sunmamız gerekiyor."*

İki somut kanıt bu hissi doğruluyor:
- **Hero özellik kartlarındaki mouse-tilt/spotlight efekti** (`onMouseMove`/`onMouseLeave`,
  `e.clientX`/`e.clientY` ile 3D tilt) tamamen mouse-hover'a bağlı — touch cihazda hiçbir zaman
  tetiklenmiyor, tamamen ölü kod.
- Sayfa mobilde masaüstü pazarlama sitesinin dar sütuna sıkıştırılmış hali; her açılışta aynı
  tanıtım içeriği tekrar tekrar gösteriliyor, "uygulama içi ana sayfa" hissi vermiyor.

Ayrıca kod incelemesi bir fırsat ortaya çıkardı: **`/dashboard` rotası zaten var** ve tam olarak bir
"giriş yapmış kullanıcı panosu"nun ihtiyaç duyduğu veriyi içeriyor — `stats`
(reportCount/activeListingCount/offerCount/unreadMessageCount), `recentReports`, `recentMessages`,
`recentOffers`, hepsi gerçek bir API'den (`/api/user/dashboard`). Ama `BottomNavbar.tsx:23`'teki
"Ana sayfa" linki `/dashboard`'a değil `/`'ye gidiyor — yani bu ekran zaten var ama bottom nav'dan
erişilemiyor. `/dashboard` kendisi de Profil sayfasıyla aynı mimari sorunu taşıyor: kodun kendi
yorumu "Sol: Son raporlar / Sağ: Mesajlar + Teklifler" diyor — masaüstü iki-sütun düzeni, mobilde
muhtemelen sıkıştırılmış.

## Karar: Sıfırdan, mobil-özel yeni bir ana sayfa (auth-koşullu)

`/dashboard`'ı yamalamak yerine — kullanıcının açık kararıyla — **sıfırdan tasarlanmış, sadece
mobil** yeni bir ana sayfa bileşeni. Alttaki veri modeli `/dashboard`'ın zaten kullandığı
`/api/user/dashboard` endpoint'inden geliyor (yeni backend işi yok), ama ekranın kendisi
(`HomeMobile`), bileşenleri, düzeni tamamen yeni — `/dashboard/page.tsx`'in JSX'inden miras
almıyor.

### Reddedilen alternatifler

- **`/dashboard`'ı olduğu gibi bırakıp yalnızca `BottomNavbar`'ın linkini değiştirmek:** En küçük
  değişiklik olurdu ama `/dashboard`'ın kendi mobil-uyum sorununu (masaüstü iki-sütun düzeni) hiç
  çözmezdi — kullanıcı açıkça "sıfırdan yeni" istedi, reddedildi.
- **Anonim pazarlama sayfasının mobildeki ölü hover efektlerini de bu round'da düzeltmek:**
  Kullanıcı bu round'un kapsamını yalnızca giriş yapmış kullanıcı deneyimiyle sınırladı; anonim
  sayfa şimdilik dokunulmadan kalıyor, ayrı bir bulgu olarak not düşüldü (ileride ayrı bir
  spec/round).
- **Görsel companion'da sunulan A seçeneği ("Liquid Glass Akış" — tek dikey kart akışı, istatistikler
  en altta soluk):** Kullanıcı B'yi (istatistik + eylem grid'i üstte) seçti; A reddedildi.

## Kapsam

**Dahil:** giriş yapmış kullanıcının mobil `/` deneyimi (yeni `HomeMobile` bileşeni).
**Dışında (bu round):** masaüstü davranışı (giriş yapmış olsa bile — mevcut pazarlama sayfası aynen
kalır), anonim/giriş yapmamış ziyaretçi deneyimi (platform fark etmeksizin), `/dashboard`,
`/dashboard/reports`, `/dashboard/profile` rotalarının kendisi (dokunulmuyor, sadece veri modeli
referans alınıyor).

## Mimari

`src/app/page.tsx`, `/hesapla/page.tsx`'in zaten kurduğu `matchMedia` tabanlı viewport-dallanma
desenini takip eder, buna bir **auth** ekseni eklenir:

| Durum | Gösterilen |
|---|---|
| Giriş yapmamış (mobil ya da masaüstü) | Mevcut pazarlama sayfası — **değişmiyor** |
| Giriş yapmış + masaüstü | Mevcut pazarlama sayfası — **değişmiyor** |
| Giriş yapmış + mobil | Yeni `HomeMobile` bileşeni |

`BottomNavbar`'ın "Ana sayfa" linki `/`'de kalır (routing değişmiyor) — `/`'nin *içeriği* koşullu
hale gelir. `useSession()` (next-auth) `page.tsx`'e eklenir; viewport kontrolü zaten var olan
`isDesktopViewport` state'i (SSR/hydration-güvenli iskelet dahil) aynen kullanılır.

## Dosya yapısı

`src/app/mobile/` altında (bu klasörde `page.tsx` yok, dolayısıyla yeni bir route açmaz — `/hesapla/mobile/`
ile aynı desen):

- **`HomeMobile.tsx`** — orkestratör. `/api/user/dashboard`'ı `useEffect` ile çeker (aynı fetch
  deseni `/dashboard/page.tsx:57-67`'de zaten var, birebir kopyalanır), loading/error/başarı
  state'lerini yönetir, alt bileşenleri render eder. Başlık için paylaşılan `AppBar`
  (`@/components/mobile/AppBar`) yeniden kullanılır — yeni bir header icat edilmez.
- **`QuickActionGrid.tsx`** — üstte istatistik kartları (Hesaplama/Aktif İlan/Teklif/Okunmamış
  Mesaj sayıları) + altında 4'lü eylem grid'i, her biri `/dashboard/page.tsx:184-189`'daki mevcut
  `quickActions` hedefleriyle birebir aynı rotaya `Link`: **Hesapla** → `/hesapla`, **İlan Ver** →
  `/listings/new`, **Mesajlar** → `/inbox`, **Pazar Yeri** → `/marketplace`.
- **`RecentReportsList.tsx`** — son hesaplamalarım, her satır `/hesapla?reportId=X`'e link.
- **`RecentActivityRows.tsx`** — son mesaj (varsa) + son teklif (varsa), kompakt birer satır,
  `/inbox` ve `/dashboard/projects`'e link.

## Veri akışı

Tek kaynak: `GET /api/user/dashboard` (zaten var, değişmiyor) →
`{ stats, recentReports, recentMessages, recentOffers }`. `HomeMobile` bu veriyi çeker ve prop
olarak alt bileşenlere dağıtır — `/dashboard/page.tsx`'teki `DashboardData` tipi aynen yeniden
kullanılır (kopyalanmaz, ortak bir tip dosyasına taşınabilir ya da import edilir — implementasyon
planı karar verir).

## Boş durumlar

Bu oturumda `/hesapla`'da kurduğumuz "sahte/eksik veri gösterme" ilkesiyle tutarlı:

- **Hiç rapor yok:** "Henüz hesaplama yok. Hesapla →" (`/dashboard/page.tsx:116`'daki metin aynen).
- **Mesaj VE teklif ikisi de yok:** `RecentActivityRows` bölümü tamamen render edilmez (iki ayrı
  boş kutunun üst üste durması "Simplicity" ilkesine aykırı — bkz. apple-design skill §16.6).
- **Biri var, diğeri yok:** Bölüm görünür; `/dashboard/page.tsx:143-144` ve `:164-165`'teki mevcut
  bağımsız desen aynen taşınır — Son Mesaj ve Son Teklif birbirinden bağımsız değerlendirilir, boş
  olan kendi içinde kısa bir metin gösterir (`"Mesaj yok."` / `"Teklif yok."`, aynı metinler),
  yeni bir mikro-kopya icat edilmez.
- **İstatistik kartları:** her zaman görünür — `0` da anlamlı bir sayıdır, gizlenmez.

## Loading / Error

`/dashboard/page.tsx:69-75`'teki mevcut basit desen aynen: `"Yükleniyor..."` /
`"Veriler yüklenemedi. Lütfen sayfayı yenileyin."` — yeni bir loading-skeleton deseni icat
edilmiyor (YAGNI, mevcut app genelinde zaten bu basit metin deseni kullanılıyor).

## Görsel dil

`/hesapla` mobilin (Faz 1.5, "Liquid Glass") zaten kurduğu `--m-*` CSS custom property'leri ve cam
kart görünümü (`backdrop-filter: blur`, yarı saydam beyaz zemin) aynen kullanılır — yeni bir görsel
dil icat edilmez. Görsel companion'da B seçeneği onaylandı: istatistik kartları + 4'lü eylem grid'i
en üstte (iOS ana ekranı benzeri), altında liste bölümleri. Hesapla, diğer üç eylemle (İlan Ver /
Mesajlar / Pazar Yeri) eşit görsel ağırlıkta bir grid kutusu olarak durur — A seçeneğindeki gibi tek
başına büyük bir gradient hero kart değil.

Apple-design skill'in ilgili ilkeleri: **Craft** (istatistik kartları/grid kutuları paylaşılan
`--m-*` token'larından, ad-hoc değer yok), **Simplicity** (boş bölümler gizlenir, göze
gerekmeyen bilgi sokulmaz), **Familiarity** (eylem grid'i iOS ana ekranı metaforunu taşır, yabancı
bir desen icat edilmez), **Reduced motion** (varsa `whileInView`/spring animasyonları
`prefers-reduced-motion` ile uyumlu — `/hesapla`'daki mevcut animasyon desenleri referans alınır).

## Test

- **`HomeMobile.test.tsx`** — `/api/user/dashboard` mock'lanır: eylem grid linkleri doğru rotalara
  gidiyor mu, istatistik sayıları doğru render ediliyor mu, rapor listesi dolu/boş durumları, mesaj
  VE teklif ikisi boşken `RecentActivityRows`'un hiç render edilmediğinin doğrulanması, loading
  metni, error metni.
- **`page.test.tsx`** (kökte, şu an yok — yeni oluşturulacak) — `/hesapla/page.test.tsx`'teki
  `viewportKur`/`useSession` mock deseni takip edilir, 3 durum test edilir: anonim → pazarlama
  sayfası, giriş+masaüstü → pazarlama sayfası (değişmedi), giriş+mobil → `HomeMobile` mount edilir.

## Doğrulama

- Mekanik: `npx tsc --noEmit` + `npx jest --no-coverage --roots "<rootDir>/src"` (ana checkout'ta
  bilinen worktree-collision nedeniyle bu komut kullanılır) yeşil.
- Canlı (Playwright, mobil viewport, giriş yapmış oturum): sayfa açılışında istatistik+eylem grid'i
  görünür, boş veri durumunda ilgili bölümler doğru gizleniyor/boş-durum metni gösteriyor, her
  eylem/link doğru rotaya gidiyor. Anonim + masaüstü + giriş yapmış-masaüstü davranışının
  **değişmediği** ayrıca doğrulanır (regresyon kontrolü).
