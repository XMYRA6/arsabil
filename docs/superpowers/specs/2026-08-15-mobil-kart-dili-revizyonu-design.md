# Mobil Kart Dili Revizyonu — Tasarım Spec'i (2026-08-15)

## Bağlam ve Problem

Kullanıcı "yapay zeka tasarımları slop, tekrar eden benzer yapılar sunuyor" bulgusuyla geldi, `taste-skill` (`redesign-existing-projects` + `high-end-visual-design` checklist'leri) projeye kuruldu. Bu checklist'lerle "Liquid Glass" mobil redesign'i (Ana sayfa, Pazar, Profil, Dashboard, Mesajlar, İlan Teklifleri, Hesapla mobil — bkz. git log'daki `feat(mobile): refresh ... with liquid glass` serisi) denetlendi (fork audit).

**Kök bulgu:** `--m-glass-bg` + `--m-glass-border` + `--m-glass-blur` + `--m-sh-card` (`.mGlass` reçetesi, `globals.css`) 48 dosyada (CSS module + scope test) INLINE olarak kopyalanmış — paylaşılan tek bir bileşen/sınıf yok, her sayfa kendi `.card`/`.panel` benzeri class'ında aynı bloğu elle tekrarlıyor. Sonuç: istatistik kartı, ilan kartı, profil satırı — hepsi görsel olarak birebir aynı, "her sayfa aynı görünüyor" hissi.

**Yan bulgular (aynı denetimde, görsel olmayan):**
- `window.alert()` hâlâ 2 yerde (`src/app/dashboard/profile/page.tsx:209`, `src/app/listings/new/page.tsx:56`)
- `:focus-visible` kod tabanında hiç yok
- `:active` (basma) geri bildirimi yalnızca 2 sayfada (hesapla mobil, mesajlar)
- Skeleton yükleyici yalnızca Pazar'da; diğer sayfalar düz "Yükleniyor…" metni
- Jenerik "Hata oluştu." mesajları (admin panelleri + hesapla, 4+ yer)

**Onaylanan mockup:** https://claude.ai/code/artifact/3b9656aa-a9fa-4bdd-a778-1c9631f5c0e6 ("Kart Dili Revizyonu") — üç gerçek içerik türü üzerinden önce/sonra karşılaştırması, kullanıcı onayladı (dark temada ilan fotoğrafı aurora gradyanına dönecek şekilde bir revizyonla).

## Yaklaşım

Tek bir "glass card" yerine, İÇERİK ROLÜNE göre üç farklı, paylaşılan kart deseni tanımlanır. Bu üç desen `globals.css`'e TEK KAYNAK olarak eklenir (proje zaten `--bottomnav-height` gibi token'larda bu ilkeyi uyguluyor), her sayfa kendi local CSS'inde bu ortak class'ları kullanır; artık kimse `--m-glass-*` blokunu elle kopyalamaz.

### 1. `.statSurface` — istatistik/özet kartı
Düz yüzey (`var(--surface)` benzeri, mevcut `--panel`/`--card-bg` token'ına yakın bir opak zemin), cam/blur/gradyan YOK. Veri `--m-mono` + `tabular-nums` ile büyük ve önde. Kullanım yeri: Dashboard özet kartları, Ana sayfa hızlı istatistikler (`QuickActionGrid` sayısal rozetleri hariç — onlar zaten farklı bir bileşen), Dashboard raporları özet sayıları.

### 2. `.editorialListingCard` — fotoğraf/ilan kartı
Üstte fotoğraf/gradyan alanı (light: mevcut soluk gökyüzü tonu `linear-gradient(120deg, #8FAFD6 0%, #C9D8EC 55%, #EFE7D8 100%)`; dark: aurora gradyanı `linear-gradient(135deg, #3f7fe0 0%, #1f6feb 46%, #22d3ee 118%)` — gerçek foto varsa `background-image` onun yerine geçer, bu yalnızca foto YOKSA placeholder), altta serif başlık (`Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif` — yeni `--font-serif` token'ı) + adres/m²/oran bilgisi. Kullanım yeri: Favoriler listesi, Portföy/İlanlarım listesi, İlan Teklifleri sayfasındaki ilan özeti — yani bugün `.mGlass` içinde METİN olarak ilan bilgisi gösteren her yer. **Pazar'daki gerçek `ListingCard` bileşenine DOKUNULMAZ** — o zaten bu desenin kanıtlanmış, iyi çalışan bir üst kümesi (gerçek fotoğraf, hover/active state, tabular-nums fiyat).

### 3. `.rowList` / `.dataRow` — ayraçlı liste satırı
Kart yok; `border-bottom` ile ayrılan düz satırlar, sol tarafta küçük bir baş harf/ikon rozeti (`--accent-soft` arka plan), sağda tabular değer. Kullanım yeri: Profil altındaki kişi/danışman listeleri, Mesajlar konuşma listesi satırları (BUGÜN `.mGlass` kart olarak render ediliyor).

### Tipografi
Yeni `--font-serif` token'ı yalnızca YUKARIDAKİ `.editorialListingCard` başlığında ve `.rowList` avatar baş harflerinde kullanılır (mockup'ta gösterildiği gibi) — bu genel bir site-geneli font migrasyonu DEĞİLDİR, Inter gövde/UI metninde kalır. Kapsam dışı: tam font değişimi ayrı bir konu, bu spec'te ele alınmaz.

### Görsel-olmayan düzeltmeler (aynı pakette, düşük risk)
- `window.alert()` → mevcut inline `errorNote`/toast deseni (proje zaten başka yerlerde bu deseni kullanıyor, bkz. `ManualParcelEntryForm.tsx`'teki `errorNote`) ile değiştirilir.
- `:focus-visible` — yeni paylaşılan `--focus-ring` kullanımı `.statSurface`/`.editorialListingCard`/`.rowList` ve tıklanabilir elemanlara (buton, link) eklenir. Site-geneli TAM bir a11y taraması bu spec'in kapsamı DIŞINDA — yalnızca bu üç yeni desen + dokunulan dosyalardaki mevcut interaktif elemanlar kapsanır.
- `:active` state — yeni üç desenin hepsine `scale(0.98)` benzeri basma geri bildirimi eklenir.
- Skeleton loader — kapsam dışı bırakılıyor (ayrı, daha büyük bir iş; bu spec'te yalnızca NOT düşülür, uygulanmaz).
- Jenerik hata metinleri — yalnızca bu spec'in dokunduğu dosyalardaki mesajlar (varsa) spesifikleştirilir; site-geneli metin taraması kapsam dışı.

## Dosya Eşlemesi (audit'ten, denetim sırasında görülen gerçek kullanımlar)

| Sayfa/bileşen | Mevcut | Hedef desen |
|---|---|---|
| Dashboard raporları özet | `.mGlass` kart | `.statSurface` |
| Ana sayfa hızlı istatistikler | `.mGlass` kart | `.statSurface` |
| Dashboard favoriler listesi | `.mGlass` kart | `.editorialListingCard` |
| Dashboard ilanlarım listesi | `.mGlass` kart | `.editorialListingCard` |
| İlan Teklifleri özet kartı | `.mGlass` kart | `.editorialListingCard` |
| Mesajlar konuşma listesi | `.mGlass` kart | `.rowList` |

Bu tablo audit sırasında GÖZLEMLENEN kullanımları listeler, TAM bir envanter değildir. Uygulama sırasında implementer önce `grep -rn "m-glass-bg\|m-glass-border\|m-glass-blur" src/` ile güncel/tam listeyi çıkarmalı, sonra her dosyayı açıp içeriğin GERÇEKTEN hangi role (istatistik/ilan/satır) karşılık geldiğini okuyarak karar vermeli — bu tablo bir başlangıç noktası, otorite değil. Üç desenden hiçbirine net oturmayan bir kullanım bulunursa (ör. karma içerik), kod değiştirilmeden önce controller'a danışılmalı.

## Kapsam Dışı (Non-goals)
- Masaüstü tasarımına dokunulmaz (tüm değişiklikler `@media (max-width: 768px)` bloklarında veya zaten mobile-only dosyalarda kalır).
- Pazar/`ListingCard.tsx`/`.module.css` değiştirilmez (referans, hedef değil).
- Genel site-geneli font migrasyonu, tam a11y taraması, skeleton loader yaygınlaştırması — ayrı konular.
- `globals.css`'teki `--brand-gradient`/`--m-grad-accent` token'ları SİLİNMEZ (hâlâ buton/rozet gibi yerlerde kullanılabilir) — yalnızca KART arka planı olarak kullanımı bu üç yeni desenle değiştirilir.

## Test Stratejisi
Proje deseni: her dokunulan `.module.css` için mevcut `*.scope.test.ts` dosyaları güncellenir (regex ile yeni class isimlerini/token kullanımını doğrulayan testler), yeni paylaşılan üç desen için `globalsMobile.scope.test.ts`'e (veya yeni bir `cardPatterns.scope.test.ts`'e) düz metin regex testleri eklenir. Görsel doğrulama Playwright ile (mobil viewport, açık+koyu tema) — bu projenin `--keyboard-inset` ve stepper simetrisi fix'lerinde kullandığı yöntemle aynı.
