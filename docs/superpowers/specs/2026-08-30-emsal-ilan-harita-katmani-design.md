# Emsal İlan + Harita Katmanı — Tasarım (v1)

**Tarih:** 2026-08-30
**Durum:** Onaylandı (brainstorming), uygulama planı bekliyor
**Alt-proje:** 3 / 6 (bkz. "Bağlam" — rakip kapatma yol haritası)

---

## Bağlam ve Amaç

Alt-proje 2 (Ücretsiz Arsa Değer Kartı) `/deger` sayfasını ve `DegerKarti`
bileşenini shipledi. Kartta "Emsal ilanlar" bir **üye-duvarı arkası "yakında"
placeholder'ı** olarak duruyor ve `DegerKarti`'nin mini-haritası boş bir
placeholder. Bu alt-proje ikisini de dolduruyor:

- Bir parsel için **bölgedeki emsal ilanların listesi** (üye içeriği) —
  `MarketListing` verisinden mesafe + alan + tarih filtresiyle.
- `DegerKarti`'de **gerçek mahalle sınır poligonu** olan bir mini-harita, ve
  talep üzerine üyeye açılan **tam etkileşimli emsal haritası**.

### Veri kaynağı gerçeği (2026-08-30, crawler fixture incelemesi)

| Portal | Detay sayfasında konum |
|---|---|
| **Emlakjet** (crawler v1'in çekebildiği) | Hassas ilan koordinatı **YOK**. `neighborhoodGeometry` (gerçek mahalle multipolygon sınırı) + `earthquakeRiskScore` var. |
| **Sahibinden** (PerimeterX engelli, proxy alt-projesi) | `data-lat="..."` hassas ilan koordinatı **VAR**. |

Sonuç: v1'de emsal pinleri **mahalle centroid'inde** (TKGM merkezi, `MarketListing`
zaten böyle geocode ediyor — 387/450 satır `neighborhood` hassasiyette, sadece
~168 farklı koordinat). Hassas pinler Sahibinden/proxy alt-projesine kalıyor.
Ama Emlakjet'in `neighborhoodGeometry`'si Nominatim'e gerek bırakmadan gerçek
mahalle sınırı veriyor.

### Yol haritasındaki yeri (bilgi amaçlı, bu spec'in kapsamı DEĞİL)

| # | Alt-proje | Bağımlı |
|---|---|---|
| 1 | İlan Crawler + Veri Hattı | — |
| 2 | Ücretsiz "Arsa Değer Kartı" | 1 |
| **3** | **Emsal ilan + harita katmanı** ← bu spec | 1, 2 |
| 4 | AI "Uzman Görüşü" (Akif) | 2, 3 |
| 5 | WhatsApp botu | 2 |
| 6 | Derinlik: TÜİK demografi, fiyat trendi, SEO mahalle sayfaları | 1–4 |

---

## Sabitlenen Kararlar

| # | Konu | Karar |
|---|---|---|
| 1 | v1 şekli | Tam paket: crawler `neighborhoodGeometry`+`earthquakeRiskScore` çıkarımı, emsal liste motoru, üye payload, `DegerKarti` liste + mini-harita, tam `EmsalMap`. **Hassas nokta çıkarımı YOK** (Emlakjet vermiyor). |
| 2 | Yüzey | `/deger` + `DegerKarti`'ye özel. **Marketplace haritası kapsam DIŞI** (ayrı ürün yüzeyi). |
| 3 | Eşleştirme | Mesafe öncelikli + basit filtreler: aktif + arsa tipleri + koordinatlı + alan benzerliği (0.25×–4×) + 5 km yarıçap → mesafeye göre sırala → ilk 8. Ağırlıklı skor değil. |
| 4 | Sınır/risk saklama | Yeni `Neighborhood` tablosu (mahalle başına tekil): `geojson`, `emlakjetRiskScore`, `source`. `MarketListing`'e denormalize etme. |
| 5 | Emsal liste alanları | ₺/m², alan, toplam fiyat, mesafe, `listedAt`, kaynak adı + link. **YOK:** başlık, foto, açıklama. En fazla 8 (üye). Anonim: sadece `comparableCount` teaser. |
| 6 | Harita UX | Mini-harita her zaman hafif (parsel + sınır, etkileşimsiz). "Emsalları haritada gör →" → tam `EmsalMap` **dinamik import**, yalnız üye + emsal varsa. |
| 7 | Canlı crawl turu | **Ayrı operasyon adımı** (plan sonunda, kullanıcı onayıyla) — SDD task'ları canlı DB'ye bağlı kalmaz. |

---

## Mimari

### Yeni Prisma modeli

```prisma
model Neighborhood {
  id                String   @id @default(cuid())
  il                String              // normalizeAreaName
  ilce              String
  mahalle           String
  geojson           Json?               // Emlakjet neighborhoodGeometry, normalize MultiPolygon
  emlakjetRiskScore Float?              // Emlakjet earthquakeRiskScore (0-1) — bilgi amaçlı, saklanır, gösterilmez
  source            String              // "emlakjet"
  updatedAt         DateTime @updatedAt

  @@unique([il, ilce, mahalle])
}
```

Elle yazılan migration (proje deseni). Üç metin alanı da NOT NULL → `AreaPriceStat`'taki
`COALESCE` functional index'e gerek yok; düz `@@unique` yeter.

### Yeni / değişen dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Crawler | `crawler/adapters/emlakjet.ts` | `extractNeighborhood(html)` yardımcısı: kaçışlı JSON blob'undan `neighborhoodGeometry` + `earthquakeRiskScore`; `type` → `MultiPolygon` normalize, koordinat `[lng,lat]` dokunma. `parseDetailPage` sonucuna opsiyonel alanlar. |
| Crawler | `crawler/adapters/types.ts` | `RawListing`'e `neighborhoodGeojson?: unknown`, `neighborhoodRiskScore?: number` |
| Crawler | `crawler/pipeline/upsert.ts` (+ `run.ts` DI) | ilan upsert'ten sonra, geojson varsa `Neighborhood` upsert (`normalizeAreaName`'li anahtar). Delisting kilidinden bağımsız (silme yok). Yeni DI `client.neighborhood.upsert`. |
| Geo (saf) | `src/lib/geo/haversine.ts` | `haversineMeters(a, b): number` |
| Motor (saf) | `src/lib/deger/comparables.ts` | `selectComparables(input): { items: Comparable[]; total: number }` — filtre + sıralama + 8 sınırı. I/O yok. |
| Orkestrasyon | `src/lib/deger/card.ts` | yeni DI `findListingsNear(il, ilce)` + `findNeighborhood(il, ilce, mahalle)`; `selectComparables` çağrısı; DTO'ya üye: `comparables` + `comparableCount` + `neighborhoodGeojson`; anonim: `comparableCount` + `neighborhoodGeojson`. |
| API | `src/app/api/deger/kart/route.ts` | iki yeni inline DI sorgusu (`marketListing.findMany` ilçe-scope aktif+koordinatlı+arsa; `neighborhood.findUnique`). il/ilçe/mahalle `normalizeAreaName`'den geçer. Rate-limit değişmez. |
| Bileşen | `src/components/deger/DegerKarti.tsx` (+ css) | (a) `.map` placeholder → statik Leaflet (parsel + mahalle sınırı); (b) "Emsal ilanlar" bloğu (üye liste / anon bulanık+count / count=0 mesajı); (c) "Emsalları haritada gör →"; (d) `.soon` satırından "Emsal ilanlar" çıkar. |
| Bileşen | `src/components/deger/EmsalMap.tsx` (+ css) | tam etkileşimli Leaflet, `dynamic(ssr:false)` + tıklamayla lazy. `useLeafletMap` hook. parsel poligonu + mahalle sınırı + `markerClusterGroup` emsal pinleri (popup: ₺/m², alan, tarih, link). Kapat → unmount. |

### Veri akışı

```
crawler (geliştirilmiş)
  → MarketListing (koordinat = mahalle centroid, değişmedi)
  → Neighborhood (gerçek sınır + emlakjetRiskScore)   [YENİ]

kullanıcı /deger'de parsel çözer → GET /api/deger/kart
  → TKGM parsel + WMS risk + AreaPriceStat
    + MarketListing (ilçe-scope, aktif, koordinatlı, arsa)   [YENİ]
    + Neighborhood (mahalle)                                  [YENİ]
  → valuation() + selectComparables()
  → DTO:
      üye  : { …, comparables: Comparable[≤8], comparableCount, neighborhoodGeojson }
      anon : { …, comparableCount, neighborhoodGeojson }
→ DegerKarti: mini-harita (sınır) + emsal listesi (üye) / bulanık teaser (anon)
→ "haritada gör" → EmsalMap dinamik yüklenir (üye + emsal varsa)
```

### `comparables.ts` sözleşmesi

```ts
export interface ComparableInput {
  parcel: { lat: number; lng: number; areaSqm: number | null }
  listings: Array<{
    id: string
    pricePerSqm: number | null
    areaSqm: number | null
    price: number | null
    lat: number | null
    lng: number | null
    geoPrecision: string | null
    listedAt: Date | null
    source: string
    sourceUrl: string
    listingType: string
  }>
}
export interface Comparable {
  pricePerSqm: number | null
  areaSqm: number | null
  price: number | null
  distanceM: number
  approxDistance: boolean   // geoPrecision !== 'exact'
  lat: number             // haritada pin için (filtre zaten koordinatsızları eledi)
  lng: number
  listedAt: Date | null
  source: string
  sourceUrl: string
}
export function selectComparables(input: ComparableInput): { items: Comparable[]; total: number }
```

`Comparable` `lat`/`lng` taşır (filtre koordinatsızları zaten elediği için non-null),
böylece `EmsalMap` doğrudan `comparables`'ı alır — ayrı bir `ComparableWithCoords` tipi yok.

**Algoritma:**
1. Filtre: `lat`+`lng` dolu · `pricePerSqm` sonlu ve `> 0` · `listingType ∈ ARSA_LISTING_TYPES` (`aggregate.ts`'ten paylaşılan)
2. Alan benzerliği: `parcel.areaSqm` doluysa, `areaSqm` parselin `[0.25×, 4×]` aralığı dışını ele (`areaSqm` null olanlar bu filtreyi geçer). `parcel.areaSqm` null → filtre atlanır.
3. Yarıçap: `haversineMeters(parcel, listing) > 5000` olanı ele
4. Kalanları `distanceM` artan sırala
5. `total` = 1–3'ü geçen sayı; `items` = ilk 8
6. `approxDistance = geoPrecision !== 'exact'`

Guard: `parcel.lat/lng` sonlu değilse `{ items: [], total: 0 }`.

### `DegerKarti` emsal bloğu davranışı

- **Üye + `comparableCount > 0`:** başlık "Bölgedeki Emsal İlanlar (N)" + ≤8 satır. Satır: **₺/m²** (kalın) · `alan m²` · `toplam ₺` · `· 1,2 km` (`approxDistance` → `~1,2 km`) · `28 Ağu` · `Emlakjet ↗` (`sourceUrl`, `target="_blank" rel="noopener nofollow"`). Altında "Emsalları haritada gör →".
- **Üye + `comparableCount === 0`:** "Bu bölgede aktif emsal ilan bulunamadı."
- **Anonim:** bulanık 3 örnek satır + örtü "🔒 N emsal ilan · Üye Ol" (`comparableCount` gösterilir). `comparableCount === 0` → teaser yok.
- **Mini-harita:** `neighborhoodGeojson` varsa statik Leaflet (parsel poligonu + mahalle sınırı, `dragging:false zoomControl:false scrollWheelZoom:false`); yoksa mevcut düz kutu. Anonim + üye aynı.
- `.soon` satırı → "Yakında (üyelere): Fiyat trendi · Uzman görüşü"

### `EmsalMap` bileşeni

- `'use client'`; parent'ta `dynamic(() => import('./EmsalMap'), { ssr: false })` + `useState` ile "haritada gör" tıklanınca mount.
- Props: `{ parcelGeometry: GeoJSONPolygon; neighborhoodGeojson: unknown | null; comparables: Comparable[]; center: { lat: number; lng: number }; onClose: () => void }` (`Comparable` zaten `lat`/`lng` taşıyor).
- `useLeafletMap` (`onReady`):
  - taban tile: `MapView`'daki `TILES.light` (aynı CARTO URL/attr)
  - parsel: `L.geoJSON(parcelGeometry)` dolu, ArsaBil mavisi, `fitBounds`
  - mahalle sınırı: `neighborhoodGeojson` varsa `L.geoJSON`, ince kesikli, dolgu yok
  - emsal pinleri: `L.markerClusterGroup` (`MapView` ile aynı import), popup: ₺/m² · alan · tarih · "Emlakjet ↗". `approxDistance` pinleri farklı opaklık + popup "~ yaklaşık konum (mahalle merkezi)"
- Kapat butonu → `onClose` → parent unmount (`useLeafletMap` kendi `map.remove()` temizliğini yapar)

---

## Test stratejisi

Proje TDD deseni — her birim RED→GREEN.

| Birim | Tür | Kapsam |
|---|---|---|
| `haversine.ts` | saf unit | bilinen mesafe çiftleri, aynı nokta = 0, antipod makul |
| `comparables.ts` | saf unit | alan filtresi (50k m² tarla elenir, null alan geçer), 5 km yarıçap, 8 sınırı + `total` doğru, `approxDistance`, koordinatsız/fiyatsız/yanlış-tip elenir, boş sonuç, parsel koordinatı geçersiz → boş |
| `crawler/adapters/emlakjet` | unit (fixture) | `extractNeighborhood` → `MultiPolygon`, ilk koordinat `[39.338…, 41.067…]`, risk `0.198`; alan yoksa `undefined`; mevcut `parseDetailPage` alanları bozulmaz |
| `crawler/pipeline/upsert` | unit (mock client) | geojson varsa `Neighborhood.upsert` çağrılır (normalize anahtar); geojson yoksa çağrılmaz; delisting kilidinden bağımsız |
| `card.ts` | unit (mock DI) | üye: `comparables` + `comparableCount` + `neighborhoodGeojson`; anonim: sadece `comparableCount` + `neighborhoodGeojson`; `insufficientData` / parsel-yok → emsal alanları hiç yok |
| `api/deger/kart` route | entegrasyon (mock prisma) | yeni sorgular çağrılır, `normalizeAreaName`'li il/ilçe geçer, üye/anon payload ayrımı, mevcut testler yeşil |
| `DegerKarti.tsx` | RTL | üye liste (₺/m², link href + rel, `~` approx etiketi), anon bulanık + count, count=0 mesajı, mini-harita geojson var/yok, "haritada gör" → EmsalMap lazy-mount (mock) |
| `EmsalMap.tsx` | RTL (`useLeafletMap` mock, `MapView.test` emsali) | parsel + sınır + cluster katmanları eklenir; `geojson: null` → sınır katmanı yok; kapat → `onClose` |
| migration | — | `Neighborhood` tablosu + unique index, `prisma migrate status` temiz |

Her adım: `tsc --noEmit` + scoped jest. `DegerKarti` / `EmsalMap` / final: `npm run build`.

---

## Canlı Doğrulama (ayrı operasyon adımı — plan sonu, kullanıcı onayıyla)

```
npm run crawl -- --portal=emlakjet --il=trabzon --category=arsa --max-pages=25
```
- `MarketListing` tazelenir; `Neighborhood` dolar
- `--max-pages` gerçek sayfa sayısını aşarsa `complete=true` → **delisting yolu ilk kez test edilir** (alt-proje 1'in açık kalan doğrulaması)
- `npm run prices:aggregate` re-run
- `/deger`'de gerçek Trabzon parseliyle: emsal listesi (üye), mini-harita sınırı, `EmsalMap` — curl (SSR) + Playwright (etkileşim) doğrulaması

---

## Kapsam dışı (v1 — bilinçli YAGNI)

- Hassas emsal pin koordinatı — Emlakjet vermiyor → Sahibinden/proxy alt-projesi
- Marketplace haritasına (`/marketplace?view=map`) emsal katmanı
- Sahibinden / Hepsiemlak emsalları — crawler v1 sadece Emlakjet
- Fiyat trendi / zaman serisi grafiği — alt-proje 6
- `emlakjetRiskScore`'u kullanıcıya göstermek — bizim TBDY/diri-fay motoru otoriter; alan yalnız saklanır (ileride karşılaştırma/QA için)
- Emsal ilan başlığı / fotoğrafı / açıklaması — portal içeriği, hukuki/CSP/çürüme riski
- Nominatim mahalle sınırı fallback'i — Emlakjet geojson yoksa mahalle sınırı boş kalır (çoğu Trabzon mahallesinde gelir)
- `EmsalMap`'te tam ekran modu / paylaşılabilir harita URL state'i
- Ağırlıklı emsal skoru (mesafe+tazelik+alan bileşik) — v1 mesafe öncelikli
