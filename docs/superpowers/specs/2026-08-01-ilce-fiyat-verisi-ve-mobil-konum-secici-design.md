# İlçe fiyat verisi + mobil konum seçici — tasarım

**Tarih:** 2026-08-01
**Durum:** onaylandı (brainstorming, 2026-08-01)
**Branch hedefi:** yeni feature branch, `main` (`783ac3c` sonrası) üzerinden

## Problem

`/hesapla` ekranındaki il/ilçe seçicisinin "mobilde yok" sanılması yanlış bir teşhisti.
2026-08-01 denetimi bunu ölçtü:

- Seçici **iki platformda da mevcut ve çalışıyor.** Canlı doğrulama (Playwright, 390×844 ve
  1440×900): İstanbul → Kadıköy seçilince birim maliyet "Kadıköy ortalaması 24.500 TL/m²" olur,
  piyasa fiyatı `118.000 × 140 = 16.520.000` değerine düşer, seçim özet kartı görünür,
  "Konumu temizle" varsayılana döndürür. Mobilde de masaüstünde de.
- **Gerçek engel veri:** `DistrictPrice` tablosu **0 satır** ve `prisma/` altında bu tabloyu
  dolduran hiçbir seed yok. Her iki platform da seçiciyi `districtPrices.length > 0` koşuluna
  bağladığı için (`page.tsx:1132`, `mobile/KonumBlogu.tsx:51`), temiz bir kurulumda seçici
  **hiç render edilmiyor**; mobilde yerine "İlçe fiyat verisi henüz yok" notu çıkıyor.
- **İkinci sorun sunum:** `KonumBlogu`, masaüstü `LocationSelector`'ını birebir render ediyor.
  O bileşen tamamen satır içi sabit stillerle yazılmış (`components/LocationSelector.tsx:40-51`)
  ve mobil tasarım sistemine uymuyor. Ölçülen değerler:

  | | ölçülen | olması gereken |
  |---|---|---|
  | `<select>` yüksekliği | **28px** (66px / 71px genişlik) | `--touch-target: 44px` (projenin kendi token'ı) |
  | kart yüzeyi | `rgb(255,255,255)`, `backdrop-filter: none` | kardeş mobil bloklar cam yüzey |
  | font | 13.6px | kardeş parsel satırı 11.5px |

  Yani iki seçici de Apple HIG minimumunun ve projenin kendi token'ının **%36 altında**.

## Kapsam

Bu spec iki parçayı birlikte kapsar: **veri mekanizması** ve **mobil sunum**. Masaüstü
`LocationSelector` **değiştirilmez** — native `<select>` masaüstünde klavye ile hızlı çalışıyor,
oraya sheet getirmek gerekmiyor.

Kapsam dışı: dış kaynaktan otomatik fiyat çekimi (ayrı araştırma kalemi), admin paneline toplu
içe aktarım ekranı (gerekirse ayrı iş), masaüstü yerleşimi (bkz. "Parça 3" spec'i).

## Karar kayıtları

- **Veri kaynağı: repoya seed.** Alternatifler (yalnızca admin paneli / dış kaynak otomasyonu)
  değerlendirilip elendi. Yalnızca admin paneli seçilseydi seçici, veri girilene kadar hiçbir
  kullanıcıda görünmezdi.
- **Rakamların sorumluluğu insanda.** Rakamları kullanıcı sağlar; model uydurmaz. Bu proje daha
  önce "uydurma veri gerçek gibi göründü" sınıfından iki bug yaşadı (sabit "820 m²" ve sabit
  "+%34 net kâr"), ve bu rakamlar doğrudan fizibilite motorunu sürüyor. Dolayısıyla seed'de
  "tahmini" etiketli üretilmiş rakam **yok**.
- **Kapsam hedefi tüm Türkiye (900+ ilçe).** Bu ölçek native `<select>`i elverişsiz kılar ve
  aranabilir sheet'i zorunlu hale getirir.
- **Kısmi kapsam kabul edilir.** Seçici tabloda ne varsa onu listeler; seed eksik ilçeyi
  bekletmez, kullanıcı bulamazsa birim maliyeti elle girme yolu zaten açık.

## Parça A — Veri mekanizması

### A.1 Veri dosyası

`prisma/data/district-prices.ts` — tiplenmiş düz dizi:

```ts
export type IlceFiyatKaydi = {
  il: string
  ilce: string
  avgSalesPricePerM2: number
  avgUnitConstructionPrice: number
}
export const ILCE_FIYATLARI: IlceFiyatKaydi[] = [ /* ... */ ]
```

Rakam güncellemek tek dosya düzenlemesi. Kaynak muhtemelen CSV olacağı için dosya, CSV'den
üretilebilir düz bir biçimde tutulur (satır başına bir nesne, elle okunabilir).

### A.2 Seed scripti

`prisma/seed-district-prices.ts` — mevcut `prisma/seed-users.ts` ve
`prisma/seed-profit-levels.ts` konvansiyonuna birebir uyar (bağımsız script, `package.json`de
`prisma.seed` alanı yok, elle koşulur).

- Şemadaki `@@unique([il, ilce])` üzerinden **upsert**. Script defalarca koşabilir.
- **Silme yok.** Admin panelinden elle girilmiş veya düzeltilmiş satırlar seed tekrar koşunca
  ezilmez; yalnızca veri dosyasındaki (il, ilçe) çiftleri güncellenir. Aksi halde admin'de
  yapılan düzeltme sessizce kaybolurdu.
- Sonunda kaç kayıt eklendi/güncellendi bilgisini basar.

### A.3 Doğrulama (yazmadan önce)

Script, veri dosyasını **yazmaya başlamadan önce** doğrular ve tek bir sorun bulursa hiçbir şey
yazmadan hata ile çıkar — yarım yazılmış bir fiyat tablosu, hiç yazılmamışından kötüdür:

- aynı (il, ilçe) çifti birden fazla kez var mı,
- `avgSalesPricePerM2` ve `avgUnitConstructionPrice` sonlu ve `> 0` mı,
- il/ilçe isimlerinde baştaki/sondaki boşluk var mı, boş dize var mı.

Aynı kurallar bir jest testiyle de korunur (bkz. Test stratejisi), böylece bozuk veri
commit'lenemez.

## Parça B — Mobil konum seçici

### B.1 Entegrasyon kısıtı (tasarımın kritik noktası)

Mevcut `handleIlceChange` (`page.tsx:456-478`) ilçeyi bulmak için `selectedIl`'i **state'ten**
okur:

```ts
const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
if (!entry) return;
```

Düz (il + ilçe aynı anda) bir seçimde `handleIlChange` → `handleIlceChange` sırayla çağrılırsa,
ikincisi closure'daki **eski** `selectedIl`'i görür, `find` başarısız olur ve erken `return`
yüzünden fiyatlar hiç güncellenmez — sessiz bir kusur.

**Çözüm:** `handleKonumSec(il, ilce)` eklenir; aramayı parametreden gelen `il` ile yapar ve iki
state'i birlikte kurar. `handleIlceChange` ona delege eder:

```ts
const handleIlceChange = (ilce: string) => handleKonumSec(selectedIl, ilce);
```

Böylece **masaüstü davranışı birebir korunur**. Fiyat mantığı zaten saf `ilceSecildi()`'de
yaşıyor ve **değiştirilmez**. "Orijinalleri sakla" bloğu yalnızca `originalUnitPrice === null`
iken çalıştığı için ilçeden ilçeye geçiş saklanmış orijinali bozmaz — bu davranış korunur.

### B.2 Bileşen

`src/app/hesapla/mobile/KonumSecici.tsx`. `KonumBlogu` artık `LocationSelector` yerine bunu
render eder. Masaüstü `LocationSelector` dosyasına dokunulmaz.

**Kapalı hal:** cam yüzeyli, **≥44px** tek satır — `IconPin` (mevcut stroke ikon; `📍` emoji
kullanılmaz) + ya "İl / ilçe seçin" ya da "İstanbul / Kadıköy", altında
"Piyasa 118.000 · Birim 24.500 TL/m²" ve chevron. Seçim varken ayrıca **≥44px vuruş alanlı**
temizle butonu; mevcut `onClear` sözleşmesi korunur.

**Açık hal:** mevcut `BottomSheet` (`{ open, onClose, title, children }`; sürükleme ve
`prefers-reduced-motion` orada zaten çözülmüş, `sheetTransition()` kullanılıyor) içinde:

- Üstte arama alanı.
- **Boş sorgu:** il listesi. Bir ile dokununca o ilin ilçelerine iner — yazımı bilmeyen için
  keşif yolu.
- **Sorgu varken:** liste düzleşir, "İl / İlçe" çiftleri arasında arar.
- Her satır **≥44px** ve iki fiyatı da gösterir; kullanıcı bilerek seçsin.
- Render edilen satır sayısı **60 ile sınırlanır** (900 DOM düğümü basılmaz). Sınır aşıldığında
  kullanıcıya "aramayı daraltın" denir — sessizce kesilmez. 60, tek bir ilin en kalabalık ilçe
  listesini (İstanbul 39) rahatça kapsar, yani boş sorgudaki keşif yolunda sınır hiç devreye
  girmez; yalnızca çok genel arama sorgularında görünür.
- Sonuç yoksa "sonuç yok" + birim maliyeti elle girme yoluna işaret.

### B.3 Türkçe-duyarlı arama

Saf fonksiyon olarak yazılır ve doğrudan test edilir:

- `"kadikoy"` → Kadıköy, `"ISTANBUL"` → İstanbul (noktalı-I tuzağı), `"cankaya"` → Çankaya.
- İ/ı/ş/ğ/ü/ö/ç normalizasyonu + `toLocaleLowerCase('tr')`.
- **"Merkez" tuzağı:** bu ilçe adı onlarca ilde tekrar eder, bu yüzden düz arama sonuçları
  **her zaman** "İl / İlçe" biçiminde basılır; yoksa satırlar ayırt edilemez.

### B.4 Veri akışı

Değişmez. Bileşen mevcut `districtPrices` prop'unu alır; yeni fetch yok. 900 satır tek seferde
gelir (~130KB) — istemci tarafı arama zaten hepsine ihtiyaç duyduğu için bu **bilinçli** bir
karardır. API `?il=` filtresini destekliyor, ileride gerekirse yol açık.

## Sınır durumlar

| Durum | Davranış |
|---|---|
| `districtPrices` boş | Mevcut "İlçe fiyat verisi henüz yok…" notu. Seed'den sonra bu normal hal değil, gerçek bir yedek yoldur. |
| Seçili ilçe veriden silinmiş | İsimler gösterilmeye devam eder, fiyat satırı düşer, çökme yok. |
| Arama sonuç vermiyor | "Sonuç yok" + elle girme yoluna işaret. |
| Sheet açıkken masaüstü genişliğine geçiş | `page.tsx` masaüstü ağacına döner, sheet unmount olur. |
| Aynı ilçe adı birden çok ilde | Sonuçlar "İl / İlçe" biçiminde basıldığı için ayırt edilir. |

## Test stratejisi

Ağırlık saf fonksiyonlarda. Gerekçe: bu branch'in whole-branch review'ında çıkan **I5** tam
olarak şuydu — `page.tsx`in garantileri yalnızca kaynak-metin regex'iyle korunuyordu ve I1/I2
bu yüzden gözden kaçmıştı.

1. **Türkçe arama fonksiyonu:** `"kadikoy"`→Kadıköy, `"ISTANBUL"`→İstanbul, `"cankaya"`→Çankaya,
   boş sorgu, sınır aşımı davranışı.
2. **Seed veri bütünlüğü:** tekrarlanan (il, ilçe) yok, tüm rakamlar `> 0`, isimlerde boşluk yok.
   Bozuk veri commit'lenemez.
3. **`handleKonumSec` atomikliği:** karar saf bir yardımcıya çıkarılır ve doğrudan test edilir —
   "il + ilçe birlikte verildiğinde doğru kayıt bulunur" özelliği state'e bağlı kalmaz.
4. **Bileşen testleri (RTL):** sheet açılır, yazılır, satır seçilir → `onSecim(il, ilce)`
   çağrılır; temizle çalışır; boş veri notu render edilir.
5. **Canlı ölçüm turu (390×844):** yeni ekrandaki **her** etkileşimli eleman için
   `document.elementFromPoint` kendine eşleşiyor mu ve yükseklik **≥44px** mi. Repodaki mevcut
   ölçüm scripti kullanılır
   (`docs/superpowers/ledgers/2026-07-30-hesapla-girdi-mimarisi/touch-target-measure.mjs`).
   28px kusuru bugün böyle yakalandı; aynı sınıf kusur bu kez baştan kapanır.

Her test, yazılmadan önce kırmızı görülecek (TDD). Kaynak-metin regex'i **tek başına** kabul
edilebilir kanıt sayılmaz.

## Başarı kriterleri

- Temiz bir kurulumda `prisma/seed-district-prices.ts` koşulduktan sonra seçici hem mobilde hem
  masaüstünde görünür ve çalışır.
- Seed ikinci kez koşulduğunda admin'de düzeltilmiş satırlar bozulmaz.
- Mobil seçicideki her etkileşimli eleman canlı ölçümde ≥44px ve doğru elemana isabet ediyor.
- "kadikoy" yazınca Kadıköy bulunuyor.
- Masaüstü `/hesapla`nın **render çıktısı ve davranışı** değişmemiş. Dikkat: `page.tsx` bu işte
  değişir (`handleKonumSec` eklenir, `handleIlceChange` ona delege eder) — değişmemesi gereken
  `components/LocationSelector.tsx`, `page.module.css`in masaüstü kuralları ve masaüstü JSX
  yerleşimidir. Doğrulama: `git diff` ile bu üçünün dokunulmadığı gösterilir, ayrıca masaüstü
  seçimi canlı olarak yeniden ölçülür (bugünkü turda kaydedilen çıktıyla karşılaştırılır).
