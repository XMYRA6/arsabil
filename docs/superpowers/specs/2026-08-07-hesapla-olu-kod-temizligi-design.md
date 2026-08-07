# Hesapla — Ölü Kod Temizliği (actionsSection dual-slot + ölü CSS breakpoint'leri)

**Tarih:** 2026-08-07
**Durum:** Onaylandı, plan aşamasına geçiliyor.

## Bağlam

2026-08-06/07 gece oturumunda mobil ana sayfa panosu (`HomeMobile`) işi bitirilirken
`/hesapla` sayfasında iki tekrar/ölü-kod bulgusu not edilmişti: `actionsSection`'ın
çift render edilmesi ve bir "dead CSS breakpoint". Bu spec, o bulguların kod
okumasıyla doğrulanmış tam kapsamını ve düzeltme planını tanımlar.

`/hesapla` (`src/app/hesapla/page.tsx`) `isDesktopViewport` state'ine göre erken
dallanıyor: `null` iken nötr bir iskelet, `false` iken tamamen ayrı bir bileşen olan
`<HesaplaMobile>` (kendi dosyaları, kendi `mobile.module.css`'i), yalnızca `true`
iken bu dosyanın geri kalanındaki "masaüstü" JSX ağacı render ediliyor. Bu, dosyanın
geri kalanındaki her şeyin **yalnızca gerçek masaüstü genişliğinde (≥769px)** monte
olduğu, mobil genişlikte (≤768px) hiç DOM'a girmediği anlamına geliyor.

## Bulgu 1 — `actionsSection` çift render

`actionsSection` (satır 399-459, PDF İndir/Rapor Kaydet/Karşılaştır butonları +
senaryo pill'leri + karşılaştırma bloğu) bir JSX değişkeni olarak tanımlanıp iki
ayrı yerde render ediliyor:
- `desktopActionsSlot` sarmalayıcısında (satır 862)
- `mobileActionsSlot` sarmalayıcısında (satır 948)

CSS bu ikisinden birini `display:contents`/`display:none` ile gizliyor
(`page.module.css:704-710` base, `1445-1453` mobil override). Ama yukarıdaki
mimariden dolayı bu JSX ağacı render olduğunda viewport HER ZAMAN gerçek masaüstü
— yani `mobileActionsSlot` kopyası hiçbir zaman görünmüyor, yalnızca DOM'da fazladan
bir kopya (fazladan event listener, fazladan buton) olarak duruyor.

**Düzeltme:** `actionsSection`, eski `desktopActionsSlot`'un olduğu yerde, sarmalayıcısız
tek bir yerde render edilir. `mobileActionsSlot` render'ı ve `<div>`'i kaldırılır.

## Bulgu 2 — Ölü CSS breakpoint'leri

`page.module.css` içinde iki adet `@media (max-width: 768px)` bloğu var:

1. **Satır 74-75: tamamen boş blok.** İçi hiçbir kural içermiyor, eski bir
   refactor artığı. Doğrudan silinir.
2. **Satır 1228-1454: 226 satırlık blok.** İçindeki HER kural (`.container`,
   `.layout`, `.leftSidebar`, `.rightGrid`, `.mainPanel`, `.summaryPanel`,
   `.pagerTrack`, `.sliderArea`, `.desktopActionsSlot`, `.mobileActionsSlot`,
   `.actionBottomRow`, `button.sealPrimaryBtn`/`sealOutlineBtn`/`compareBtn`,
   `.stickyCta` vb.) yalnızca "masaüstü JSX ağacı + ≤768px viewport" kombinasyonunda
   anlamlı olurdu — ama bu kombinasyon yukarıdaki mimari yüzünden asla oluşmuyor
   (o genişlikte ağaç zaten unmount, `<HesaplaMobile>` monte). Blok tamamen ölü.

`@media (max-width: 1100px)` (satır 837, `.layout`/`.rightGrid`/`.statsRow` tablet
sıkıştırması) buna dahil DEĞİL — bu, 769-1100px aralığında gerçek masaüstü ağacını
etkiliyor, canlı ve dokunulmuyor.

**Düzeltme:**
- Satır 74-75 boş blok silinir.
- Satır 1228-1454 blok tamamen silinir.
- `.desktopActionsSlot`/`.mobileActionsSlot` base tanımları (704-710) da silinir
  (Bulgu 1 düzeltmesi sonrası kullanılmıyor).
- `.container`, `.layout` gibi class'ların non-media (base) tanımları KALIR —
  onlar gerçek masaüstü genişliklerinde hâlâ kullanılıyor, yalnızca 768px override'ları ölü.

## Test güncellemeleri

Proje zaten bu deseni kullanıyor: `pageStyles.scope.test.ts:55-61`
(`erisilemez mobil ölü kod kapsami`) eski `.mobileSidebar`/`.mobileAccordions`
ölü kodunun GERİ GELMEDİĞİNİ doğrulayan negatif assertion'lar içeriyor. Aynı
desen burada da uygulanır:

- **`aksiyon butonları dual-slot kapsamı`** describe bloğu (87-101) silinir,
  yerine `.desktopActionsSlot`/`.mobileActionsSlot` class adlarının
  `page.module.css`'te hiç geçmediğini doğrulayan yeni test(ler) eklenir.
- **`.sliderArea mobilde gizlenmeli`** (79-84) ve iki
  **`button.compareBtn` mobil override** testi (138-148) — üçü de artık var
  olmayan ölü blok içeriğini doğruluyordu. Yerine, literal `'@media (max-width: 768px)'`
  string'inin `page.module.css`'te artık geçmediğini doğrulayan tek bir test eklenir
  (en direkt, en gelecek-geçirmez regresyon guard'ı — hem boş bloğun hem büyük
  bloğun geri gelmediğini aynı anda kanıtlar).
- **`page.test.tsx:126-131`** (`Rapor Kaydet boş durumda devre dışıdır`) —
  şu an `findAllByRole(...)` + `.forEach(...)` ile ÇOĞUL buton bekliyor (iki
  kopya render edildiği için). `findByRole(...)` (tekil) olarak güncellenir.

## Kapsam dışı

- `HesaplaMobile` ve `mobile/` dizini — dokunulmuz, zaten ayrı/canlı bir ağaç.
- `@media (max-width: 1100px)` (837) — canlı, dokunulmuyor.
- Anasayfadaki (`MarketingHomePage`) dead-hover efektleri — ayrı bir bulgu,
  bu spec'in kapsamında değil (kullanıcı onayı: yalnızca `/hesapla`).

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil (özellikle
  `src/app/hesapla/**` altındaki testler).
- Gerçek dev server'da `/hesapla`: masaüstü genişlikte (>768px) aksiyon
  butonlarının (PDF İndir/Rapor Kaydet/Karşılaştır) tek kopya render edildiği,
  tıklanabilir olduğu; mobil genişlikte (≤768px, gerçek resize) `HesaplaMobile`
  ekranının değişmeden çalıştığı doğrulanır.
