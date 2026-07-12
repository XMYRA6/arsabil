# Admin Panel — Kabuk Ayrımı ve Giriş Deneyimi (Design Spec)

## Problem

Admin paneli (`/admin/*`), kök layout'un (`src/app/layout.tsx`) tüm route'lar için koşulsuz render ettiği müşteri kabuğu (`Navbar` + `Footer` + `BottomNavbar`) içinde açılıyor. `admin/layout.tsx` bu kabuğun İÇİNE yalnızca bir sidebar+içerik ekliyor — admin, müşteri kabuğunu hiç terk etmiyor. Sonuç: admin paneli görsel olarak "müşteri sitesine eklenmiş bir bölüm" gibi hissettiriyor, ayrı ve profesyonel bir yönetim aracı gibi değil.

Giriş noktası da benzer şekilde iyileştirmeye açık: kullanıcı avatar dropdown'ında (masaüstü) düz bir liste öğesi, mobil menüde ise çıkış butonuyla aynı kırmızı `dangerText` class'ını paylaşan bir link — kazara "admin=tehlikeli işlem" gibi okunuyor.

## Kapsam

**Dahil:** Admin kabuğunun müşteri kabuğundan (Navbar/Footer/BottomNavbar) tamamen ayrılması; admin'e özgü bir üst bar (AdminTopBar); müşteri arayüzünden admin'e geçiş noktasının (dropdown/mobil menü linki) yeniden tasarımı.

**Dışında (bilinçli):** 7 admin sayfasının (Genel Bakış/İlan Yönetimi/Teklifler/Analitik/Kullanıcılar/Motor Ayarları/İlçe Fiyatları) içerik/tablo/form tasarımı — bu ayrı, daha büyük bir iş (gelecekteki "Faz 4" mobil/masaüstü admin redesign'i). Mobil admin deneyiminin özel olarak optimize edilmesi — admin masaüstü-öncelikli bir araç, mobilde kırılmadan çalışır ama kendine özgü mobil kabuk (çekmece/bottom-sheet vb.) tasarlanmaz.

## Yaklaşım: Pathname-Bazlı Koşullu Kabuk (Route Group Yerine)

Next.js route group'larıyla (`app/(admin)/layout.tsx` kendi `<html>/<body>`'siyle) tam mimari ayrım mümkün, ama bu tüm route ağacının yeniden düzenlenmesini gerektirir (invaziv, "ilgisiz refactor yapma" ilkesine aykırı). Bunun yerine: `BottomNavbar`'ın zaten `/login`/`/register`'da kendini gizlediği **self-gating pathname deseni** genişletiliyor.

Yeni `SiteChrome` client bileşeni `Navbar`/`main`/`Footer`/`BottomNavbar`'ı sarar; `usePathname().startsWith('/admin')` ise üçünü de render etmez, yalnızca `children`'ı geçirir. Kök layout değişikliği tek satırlık bir sarmalama.

## Görsel Kimlik: "Aynı Marka, Ayrı Kabuk"

Mevcut Mühür Lacivert renk değerleri (`#0F2A43` mürekkep lacivert, `#C9A15A` pirinç sarısı — bu projede zaten kurulu bir desen: `globals.css`'e değil, her sayfanın kendi scope'una tanımlanan bir token seti, bkz. `hesapla`/`compare`/`profile`/`dashboard` sayfalarındaki `--seal-*` örüntüsü) `AdminTopBar.module.css`'e kendi `--admin-ink`/`--admin-accent` adlarıyla scope'lanır — globals.css'e sızmaz, aynı isimlendirme konvansiyonu (`--seal-*` yerine `--admin-*`, çünkü bu artık "Mühür" temalı bir sayfa değil, ayrı bir ürün kabuğu) izlenir.

- **AdminTopBar:** sabit `background: var(--admin-ink)` (`#0F2A43`) — light/dark temadan bağımsız her zaman koyu, "farklı bir moddasın" sinyali. İçerik: sol tarafta küçük mühür-noktası ikonu + "ArsaBil — Yönetim" wordmark'ı, sağ tarafta admin adı + pirinç sarısı `ADMIN` rozeti (mevcut `--primary` mavisi yerine `--admin-accent`), `ThemeToggle` (artık müşteri Navbar'ı gizlendiği için buraya taşınır), "← Müşteri Paneline Dön" linki (`/dashboard`'a gider — mevcut sidebar-footer'daki `/`'e giden linkin yerini alır, kaldırılır).
- **Sidebar:** mevcut tema-duyarlı `--panel`/`--border` tokenları korunur, sadece üst bar sabit-koyu.
- **`.badge` rengi:** `admin.module.css`'teki mevcut `--primary` (mavi) yerine `--admin-accent` (pirinç sarısı) — marka tutarlılığı.

## Giriş Deneyimi

Akış değişmiyor (normal giriş → admin linkine tıkla → `/admin`'e geç), yalnızca tetikleyici daha kasıtlı hale geliyor:

- **Masaüstü dropdown** (`Navbar.tsx`, ~satır 321): mevcut `dropdownDivider` + düz link yapısı korunur, ama link kendi vurgulu stiline kavuşur (küçük pirinç noktası/ikon + "Yönetim Paneli" — diğer menü öğelerinden [Kontrol Paneli/Raporlarım/İlanlarım/Mesajlarım] görsel olarak ayrışır, ayrıcalık hissi verir, tehlike değil).
- **Mobil menü** (`Navbar.tsx`, ~satır 357): `styles.dangerText` (kırmızı, çıkışla paylaşılan) kaldırılır, yeni nötr/pirinç-vurgulu bir class ile değiştirilir.
- **Geçiş anı:** ekstra animasyon/splash YOK (YAGNI) — AdminTopBar'ın sabit-koyu rengi ve farklı wordmark'ı, sayfa geçişinin kendisini yeterince "mod değişimi" gibi hissettiriyor.

## Dosyalar

**Yeni:**
- `src/components/layout/SiteChrome.tsx` (+ gerekiyorsa `.test.tsx`) — Navbar/main/Footer/BottomNavbar sarmalayıcısı, pathname kontrolü.
- `src/components/layout/AdminTopBar.tsx` + `AdminTopBar.module.css` (+ `.test.tsx`) — wordmark, admin adı+rozet, tema toggle, geri-dön linki.

**Değişecek:**
- `src/app/layout.tsx` — `SiteChrome` kullanımı (Navbar/main/Footer/BottomNavbar doğrudan render yerine).
- `src/app/admin/layout.tsx` — `AdminTopBar` eklenir, sidebar-footer'daki eski geri-dön linki (`backLink`/`/`'e giden) kaldırılır.
- `src/app/admin/admin.module.css` — `.badge` pirinç sarısına, artık kullanılmayan `sidebarFooter`/`backLink` kuralları temizlenir.
- `src/components/layout/Navbar.tsx` + `Navbar.module.css` — admin linkinin stili/konumu (masaüstü dropdown + mobil menü, `dangerText` paylaşımı kaldırılır).

## Test Planı

- `SiteChrome.test.tsx`: `/admin` altında Navbar/Footer/BottomNavbar render EDİLMEDİĞİNİ, diğer route'larda (`/`, `/dashboard` vb.) edildiğini doğrulayan RTL testi (pathname mock'lanarak).
- `AdminTopBar.test.tsx`: temel render + "Müşteri Paneline Dön" linkinin `/dashboard`'a gittiğini doğrulayan test.
- Playwright smoke: `/admin`'e authenticated admin ile girilince Navbar/Footer/BottomNavbar'ın DOM'da hiç bulunmadığını, `/marketplace` gibi müşteri sayfalarında hâlâ bulunduğunu doğrulayan bir test (Docker/dev server gerektirir, mevcut e2e altyapısına eklenir).
- Mevcut `admin/layout.tsx`'in yetki kontrolü (ADMIN olmayan → `/dashboard`'a yönlendirme) DEĞİŞMEZ, dokunulmaz.

## Riskler / Notlar

- `ThemeToggle`'ın AdminTopBar'a taşınması: bileşenin kendisi zaten bağımsız (localStorage + `data-theme` attribute üzerinden çalışıyor, Navbar'a özel bir state'e bağlı değil) — doğrudan yeniden kullanılabilir, yeniden yazılmaz.
- Admin sayfalarının mevcut içerik testleri (`admin/*` altında ayrı bir jest testi yok şu an) bu değişiklikten etkilenmez — yalnızca kabuk/layout değişiyor, sayfa içerikleri (`AdminOverview` vb.) dokunulmuyor.
