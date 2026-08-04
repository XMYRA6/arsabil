# Mobil "Derin Cam" (B) Varyantı — Gerçek Koda Taşıma (Tasarım)

**Tarih:** 2026-08-04
**Durum:** Onaylandı, implementasyon planı bekliyor.
**Bağlam:** ui-ux-pro-max analizi + üç HTML mockup turu (A/B/C varyantları, ardından pazar
yeri/harita/TKGM sorgulama sayfaları) sonucunda şirket lead'i **B — "Derin Cam"** varyantını
seçti. Bu spec, mockup'taki B token'larını gerçek `--m-*` sistemine taşır.

## Kapsam

**Sadece görsel token güncellemesi.** Elle TKGM sorgulama formu ve konum tespiti (geolocation)
— lead'in aynı oturumda istediği iki yeni özellik — bu spec'in KAPSAMI DIŞINDA; ikisi de yeni
backend işi gerektiriyor (bkz. mockup'ın kendi notu) ve ayrı bir spec/plan hak ediyor.

Bilgi mimarisi değişmiyor — bu, 2026-08-04'teki `hesapla-tkgm-baglam-konsolidasyonu` işinin
(risk/alan tek kaynağı) ÜZERİNE, sadece görsel katman.

## Neden

Mevcut mobil Liquid Glass sistemi (`--m-*` token'ları, `globals.css:195-240`) zaten
onaylanmış/beğenilen bir temel; lead bunun ÜZERİNE inşa edilmesini istedi (bkz. kullanıcı
geri bildirimi: "eski cam tasarım daha güzeldi, onun üzerine tasarımlar yapsak daha iyi
olurdu"). B varyantı bu temeli **kaldırmaz, yoğunlaştırır**: daha derin blur/doygunluk, daha
büyük radius, daha belirgin gölgeler, biraz daha koyu ink tonları — "flagship" bir ağırlık.

## Token değişiklikleri

`globals.css:195-240`, `:root` bloğu içindeki `--m-*` tanımları (mevcut değer → B değeri):

| Token | Mevcut (A) | B |
|---|---|---|
| `--m-glass-blur` | `blur(30px) saturate(190%)` | `blur(42px) saturate(220%)` |
| `--m-glass-bg` | `rgba(255,255,255,.66)` | `rgba(238,246,255,.58)` |
| `--m-glass-border` | `rgba(255,255,255,.92)` | `rgba(255,255,255,.85)` |
| `--m-ink` | `#0b2036` | `#081729` |
| `--m-body` | `#5c6b82` | `#4c5d78` |
| `--m-on-glass` | `#173b63` | `#12325a` |
| `--m-success-text` | `#0a8a63` | `#067a56` |
| `--m-r-chip` | `11px` | `12px` |
| `--m-r-btn` | `13px` | `15px` |
| `--m-r-input` | `16px` | `17px` |
| `--m-r-card` | `26px` | `30px` |
| `--m-sh-card` | `0 14px 36px rgba(20,70,150,.12)` | `0 22px 52px rgba(20,70,150,.20)` |
| `--m-sh-grad-card` | `0 18px 40px rgba(43,124,255,.34)` | `0 26px 64px rgba(31,111,235,.46)` |
| `--m-mesh` (4 radial'ın opaklıkları) | `.42 / .38 / .24 / .22` | `.55 / .5 / .34 / .16` |

Değişmeyenler: `--m-bg` temel rengi (`#f7faff`'e çok yakın kalır, `#f2f7ff`), `--m-grad-accent`/
`--m-grad-btn`'in orta/son durakları (`#1f6feb`, `#22d3ee` — marka rengi sabit, yalnızca ilk
durak `#3b8bff`→`#4f9bff` ile hafif açılır), `--m-danger`, `--m-r-sheet`, `--m-mono` (JetBrains
Mono zaten mockup'ta kullanılan fonttu, değişmiyor).

**Not:** `--m-r-inner` (20px) mockup'ta ayrıca büyütülmedi — kapsam dışı, dokunulmuyor.

## Tokenize edilmemiş iki sapma

`mobile.module.css` içinde ana cam blur'unu **kopyalayan ama token'a bağlı olmayan** iki yer
var — B geçince bunlar eski (A) yoğunlukta donup kalır, sistemin geri kalanıyla tutarsızlık
yaratır:

- `.stepperAzalt` (`mobile.module.css:551-552`): `backdrop-filter: blur(24px) saturate(190%)`
  → `var(--m-glass-blur)` olacak.
- `.gelismisAyarlarBtn` (`mobile.module.css:615-616`): `backdrop-filter: blur(26px) saturate(180%)`
  → `var(--m-glass-blur)` olacak.

**Dokunulmayacaklar (bilerek):** `.metrikKutu` ve `.fisButonu` (`mobile.module.css:118-119,
156-157`, `blur(10px)`) — bunlar `--m-grad-accent` degrade kartının ÜZERİNDEKİ beyaz-cam
katmanı, ana beyaz-cam sisteminden kasıtlı olarak daha hafif. B'nin ana cam yoğunluğuna
bağlanmaları görsel olarak yanlış olur (degrade zemin üzerinde 42px blur çok ağır kalır).
Diğer hardcoded `border-radius` değerleri de (10/12/14/15/17px gibi `--m-r-*` ailesiyle tam
eşleşmeyenler) bu spec'in kapsamı dışında — her biri ayrı bir bileşenin bağımsız tasarım
kararı olabilir, tek tek doğrulanmadan toptan değiştirilmeyecek.

## Yeni bileşen-seviyeli ekleme

**CTA ışık geçişi.** Mockup'ta birincil buton üzerinde çapraz, statik bir parıltı şeridi vardı
(cam yüzeyin ışığı yansıttığı hissi). Gerçek karşılığı: `.mobilCta`
(`mobile.module.css`, `HesaplaMobile.tsx:109-116`'daki "Özet Rapor Oluştur" butonu). Bir
`::after` pseudo-element ile çapraz gradient overlay eklenecek — statik, hareketsiz (mockup'taki
gibi `prefers-reduced-motion` sorunu yok çünkü zaten animasyonsuz).

**Düşürülen flourish:** Mockup'taki "gradient-fill hero rakam" (fiyat metnine gradient-clip-text)
gerçek kodda uygulanmıyor. `SonucKarti.tsx`'in `.sonucFiyat`'ı zaten düz degrade ZEMİN üzerinde
beyaz metin (`mobile.module.css:93-99`, arka plan `--m-grad-accent`) — gradient metin orada
görünmez/kontrastsız kalır, zaten kendi "premium" çözümüne (degrade kart + `.sonucIsik` parıltı
dairesi) sahip. Alternatif hedef `HesapOzetiSeridi` ise kodda hiçbir yerden import edilmiyor
(ölü kod, bu oturumda daha önce tespit edildi) — kimse görmeyecek bir yere flourish eklemenin
anlamı yok.

## Test stratejisi

- Değiştirilen her token için `globals.css`'te değerin gerçekten B'ye eşit olduğunu doğrulayan
  bir `pageStyles`-tarzı kaynak-metin testi (yeni veya mevcut bir `*.scope.test.ts` dosyasına
  eklenir — hangi dosyaya ekleneceği implementasyon planında netleşir).
- `.stepperAzalt`/`.gelismisAyarlarBtn`'in artık `var(--m-glass-blur)` kullandığını, ham
  `blur(24px)`/`blur(26px)` değerlerinin dosyada KALMADIĞINI doğrulayan testler.
- `.metrikKutu`/`.fisButonu`'nun `blur(10px)` ile DEĞİŞMEDEN kaldığını doğrulayan negatif test
  (bu spec'in "bilerek dokunulmuyor" kararını gelecekte sessizce bozacak bir refactor'a karşı
  guardrail).
- `.mobilCta`'nın yeni `::after` ışık overlay'i için bir CSS varlık testi.
- Görsel regresyon: manuel doğrulama (bu bir CSS-token değişikliği, davranış testi yok — mevcut
  jest suite'i zaten CSS içeriğini değil varlığını/yokluğunu test ediyor, bu spec de aynı
  desende kalıyor).

## Kapsam dışı / sonraki adımlar

- Elle TKGM sorgulama formu (il/ilçe/mahalle/ada/parsel) — ayrı spec, yeni backend entegrasyonu.
- Konum tespiti (geolocation) ile haritayı kullanıcı konumuna yakınlaştırma — ayrı spec.
- Masaüstü `/hesapla` — bu spec yalnızca mobil `--m-*` sistemini kapsıyor, masaüstü `--seal-*`
  ayrı bir sistem ve dokunulmuyor.
- Diğer mockup'lanan sayfalar (pazar yeri, harita görünümü) — henüz gerçek koda taşınmıyor,
  yalnızca lead onayı için mockup'landılar.
