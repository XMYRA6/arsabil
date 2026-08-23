# Paylaşılan Leaflet Harita Kurulum Hook'u — Design Spec

## Problem

Projede 3 ayrı Leaflet harita bileşeni var (`ParcelPicker.tsx`,
`MapView.tsx`, `MiniMap.tsx`), ve her biri AYNI kurulum desenini kendi
başına, ayrı ayrı yazmış: `useEffect(() => { const L = await
import('leaflet'); ...; setMapReady(true); }, [])` + temizlik + (çoğunda)
`ResizeObserver`. Bu desen KOPYALANMADI diye değil, her seferinde SIFIRDAN
yazıldığı için, aynı hata sınıfı — async harita kurulumunun, ona bağımlı
diğer effect'lerle (marker, poligon, katman) YARIŞMASI — bu projede
**dördüncü kez** ortaya çıktı (kaynak:
`ParcelPicker.map.test.tsx:12-16`'daki yorum: "MapView marker'lari,
MiniMap katman ref'leri, ParcelPicker marker+poligon" — hepsi aynı sınıf
bug, ayrı ayrı `mapReady` bayrağıyla ayrı ayrı çözülmüş).

Ayrıca `MapView.tsx` ve `MiniMap.tsx`'in ikisi de `_leaflet_id` sıfırlama
korumasına sahip (React StrictMode'un dev'de mount→unmount→remount
döngüsünde AYNI DOM node'un Leaflet'in kendi initialize-marker'ını hâlâ
taşıması, `L.map(container)`'ı "Map container is already initialized"
hatasıyla patlatması), ama `ParcelPicker.tsx` bu korumaya SAHİP DEĞİL —
gözden kaçmış bir tutarsızlık.

## Goals

- Üç bileşenin ortak KURULUM iskeletini (async `leaflet` import'u, harita
  instance'ı oluşturma, `mapReady` bayrağı, `ResizeObserver`, unmount
  temizliği) tek bir `useLeafletMap` hook'unda topla.
- Üç bileşeni de bu hook'u kullanacak şekilde taşı — **davranış SIFIR
  değişir**, yalnızca kod tekrarı kalkar. Mevcut test suite'lerinin
  (`ParcelPicker.map.test.tsx`, `MapView.markers.test.tsx`,
  `MiniMap.test.tsx`) HİÇBİRİ değişmeden yeşil kalmalı.
- `_leaflet_id` sıfırlama korumasını hook'un İÇİNE koyarak `ParcelPicker`
  bu korumayı bedavaya kazansın (konsolidasyonun yan ürünü olarak
  kapanan gerçek bir açık, kapsam dışı bir "ekstra" değil).

## Non-Goals

- Tile katmanı/sağlayıcı mantığını birleştirmek. Üçü de farklı: `MapView`
  çalışma-zamanında değiştirilebilir `TILES` sözlüğü + `localStorage`
  kalıcılığı taşıyor; `MiniMap` aynı `localStorage` anahtarını yalnızca
  İLK seçim için okuyor, hiç değiştirmiyor; `ParcelPicker` Esri'yi sabit
  kodluyor. Bu, ayrı bir ürün kararı — bu spec'in kapsamında değil.
- Marker, poligon, WMS risk katmanları, ısı haritası, mesafe/bölge çizim
  araçları, marker cluster, il sınırı — bunların HİÇBİRİ taşınmıyor veya
  değiştirilmiyor. Her bileşenin kendi özel effect'leri aynen kalır,
  yalnızca artık hook'un verdiği `mapRef`/`LRef`/`mapReady`'yi tüketirler.
- Yeni bir harita özelliği eklenmiyor. Bu SALT bir refactor.

## Hook Design

`src/lib/hooks/useLeafletMap.ts` (yeni dosya):

```ts
export type UseLeafletMapOptions = {
    /** Harita ilk açılışta nereye baksın. Yalnızca kurulum anında BİR KEZ
        okunur (mevcut üç bileşenin de zaten yaptığı gibi) — reaktif
        senkronizasyon istenmiyorsa `deps`e eklenmemelidir. */
    center: [number, number];
    zoom: number;
    /** `L.map(container, {...})`e AYNEN geçilir — zoomControl, dragging,
        scrollWheelZoom, doubleClickZoom, attributionControl gibi
        tüketiciye özgü bayraklar buradan verilir. */
    leafletMapOptions?: Record<string, unknown>;
    /** Harita + Leaflet modülü hazır olur olmaz (setMapReady(true)'dan
        HEMEN ÖNCE) bir kez çağrılır — taban tile katmanı, zoom kontrolü,
        `moveend` dinleyicisi gibi "L ve map'in birlikte gerektiği"
        tek-seferlik kurulumlar burada yapılır. Opsiyonel bir temizlik
        fonksiyonu döndürebilir (hook'un kendi unmount temizliğinde
        çağrılır). ASYNC olabilir (örn. `MapView`'in
        `leaflet.markercluster` dinamik import'u) — hook bu değeri HER
        ZAMAN `await` eder (senkron bir değer için `await` no-op'tur),
        yani `mapReady` yalnızca `onReady` tamamen bittikten SONRA
        `true` olur. */
    onReady?: (map: LeafletMap, L: typeof import('leaflet')) =>
        void | (() => void) | Promise<void | (() => void)>;
    /** ResizeObserver bağlansın mı — varsayılan true. `MiniMap` gibi sabit
        boyutlu, animasyonlu bir konteynerde asla açılmayan haritalar
        false geçebilir. */
    observeResize?: boolean;
    /** Kurulum effect'inin bağımlılık dizisi — varsayılan `[]` (bir kez
        kurulur, asla yeniden kurulmaz — ParcelPicker/MapView'in bugünkü
        davranışı). `MiniMap` `[lat, lng]` geçerek "koordinat değişince
        haritayı YIK, YENİDEN KUR" davranışını KORUR (bu, mevcut test
        `MiniMap.test.tsx:73`'ün doğruladığı, BİLİNÇLİ farklı bir
        davranış — hook'un bunu değiştirmesi DEĞİL, desteklemesi gerekir). */
    deps?: unknown[];
};

export type UseLeafletMapResult = {
    mapRef: MutableRefObject<LeafletMap | null>;
    LRef: MutableRefObject<typeof import('leaflet') | null>;
    mapReady: boolean;
};

export function useLeafletMap(
    containerRef: RefObject<HTMLDivElement | null>,
    options: UseLeafletMapOptions,
): UseLeafletMapResult
```

Hook'un içinde (tek effect, `[containerRef, ...deps]`'e bağlı — `deps`
varsayılan `[]` olduğu için normalde bir kez çalışır):

1. `cancelled` bayrağı + async `leaflet` import'u (3 bileşende de aynı desen).
2. `container._leaflet_id` varsa sıfırla (bugün yalnızca `MapView`/`MiniMap`'te var — `ParcelPicker`'a da BEDAVA gelir).
3. `L.map(container, { center, zoom, ...leafletMapOptions })`.
4. `onReady?.(map, L)` çağrılır, dönen temizlik fonksiyonu (varsa) saklanır.
5. `mapRef.current = map`, `LRef.current = L`, `setMapReady(true)`.
6. `observeResize !== false` ise `ResizeObserver` bağlanır, ilk `invalidateSize()` çağrılır.
7. Temizlik: `onReady`'nin döndürdüğü fonksiyon (varsa) → `ResizeObserver.disconnect()` → `map.remove()` → tüm ref'ler `null` → `setMapReady(false)`.

## Migration Per Component

### ParcelPicker.tsx

`onReady` içine taşınır: `L.tileLayer(...).addTo(map)` (Esri katmanı),
`map.on('click', ...)` (pin koyma + `verifyAt` — BUGÜN olduğu gibi
kalır, yalnızca hangi effect içinde tanımlandığı değişir). `placePin`
fonksiyonunun kendisi (marker/polygon ref'leri, `onChangeRef` çağrısı)
DEĞİŞMEZ — yalnızca `onReady` closure'ının içine taşınır. `center`/`zoom`:
bugünkü `value.lat != null && value.lng != null ? [value.lat, value.lng]
: TURKEY_CENTER` / `value.lat != null ? 17 : 6` ifadeleri AYNEN, hook'a
geçilen `center`/`zoom` parametreleri olarak. `deps: []` (bugünkü
davranış — bir kez kurulur). `observeResize: true` (bugün zaten var).
`_leaflet_id` koruması artık hook'tan gelir — **davranış değişikliği
DEĞİL, mevcut bir açığın kapanması** (StrictMode'da önceden oluşabilecek
"Map container is already initialized" hatasına karşı).

Kendi `mapReady`/`mapRef` state'i ve `resizeObserverRef` kaldırılır, hook'un
döndürdükleriyle değiştirilir. `placePinRef`, `markerRef`, `polygonRef`,
`verifyAbortRef` AYNEN kalır (hook'un sorumluluğunda değil).

### MiniMap.tsx

`onReady` içine taşınır: tile katmanı (`localStorage`'dan okunan
dark/light seçimi) + pin marker. `deps: [lat, lng]` — **bu bileşenin
kendine özgü "koordinat değişince harita YENİDEN KURULUR" davranışını
korumak için BİLİNÇLİ olarak varsayılandan farklı**. `observeResize:
false` (bugün zaten yok, sabit 180px kutu). `faultRef`/`floodRef`/
`shapeRef` ve onları kullanan iki ayrı effect (parsel sınırı, risk
katmanları) AYNEN kalır — hook'un sorumluluğunda değil, yalnızca artık
`mapReady`/`mapRef`/`LRef`'i hook'tan tüketirler.

**Dikkat:** `MiniMap.test.tsx:73`'teki test, `lat`/`lng` değişince eski
haritanın `remove()` çağrıldığını VE eski katman ref'lerinin yeni
haritaya sızmadığını doğruluyor — hook'un `deps` değiştiğinde ESKİ
effect'in cleanup'ını (mevcut `map.remove()` + ref sıfırlama mantığı)
çalıştırıp YENİ effect'i baştan kurması gerekiyor, react'in normal
effect-dependency semantiği bunu zaten sağlar, ama migration sırasında bu
TEST'İN DEĞİŞMEDEN yeşil kalması bu davranışın korunduğunun kanıtı.

### MapView.tsx

`onReady` içine taşınır: `L.control.zoom({position:'bottomright'})`,
taban tile katmanı (kaydedilmiş `tileKey`'den), `map.on('moveend', ...)`
(`lastView` ref'ini güncelleyen), `leaflet.markercluster` dinamik
import'u + cluster group oluşturma + `map.addLayer(clusterGroup)`.
`clusterGroupRef`'in DIŞARIDAN erişilmesi gerektiği için (marker
effect'i onu okuyor) `onReady` içinde `clusterGroupRef.current =
clusterGroup` atanır — `onReady`'nin dönüş değeri değil, closure'daki
mevcut ref üzerinden (aynı desen, sadece taşınmış).

`center`/`zoom`: `lastView.current.lat/lng/zoom` (mount anında bir kez
okunur — bugünkü davranış). `leafletMapOptions: { zoomControl: false }`.
`deps: []`. `observeResize: true`.

**Dikkat — bu geçiş en riskli olanı:** `MapView`'in kurulum effect'i
`leaflet.markercluster`'ın `await import(...)`'ini de İÇERİYOR (tile
katmanından SONRA, `mapReady`'den ÖNCE) — bu sıra `onReady`'nin kendi
`async` gövdesi içinde AYNEN korunmalı. Hook'un `onReady`'yi her zaman
`await` etmesi kuralı (yukarıdaki Hook Design bölümü) burada ZORUNLU
hale geliyor: `mapReady` yalnızca cluster group GERÇEKTEN hazır
olduktan sonra `true` olmalı — bu, `MapView.markers.test.tsx:94`'teki
"ilanlar sonradan geldiğinde marker oluşturur" testinin hâlâ geçmesi
için şart (marker effect'i `mapReady` VE `clusterGroupRef.current`
ikisine birden bağlı).

## Testing

- Yeni `src/lib/hooks/useLeafletMap.test.ts` — hook'u izole test eder
  (basit bir test bileşeni içinde `renderHook` veya minimal bir wrapper
  ile): kurulum sırası (import→`_leaflet_id` sıfırlama→`L.map`→
  `onReady`→`mapReady=true`→resize observer), `deps` değişince yeniden
  kurulum, unmount'ta temizlik sırası (`onReady`'nin cleanup'ı →
  resize observer disconnect → `map.remove()`).
- `ParcelPicker.map.test.tsx`, `MapView.markers.test.tsx`,
  `MiniMap.test.tsx` — **DEĞİŞTİRİLMEZ**, migration sonrası hepsi
  değişmeden yeşil kalmalı (bu, "davranış sıfır değişti" iddiasının
  kanıtı). Bu üç dosyanın `leaflet` mock'ları birbirinden farklı
  (`ParcelPicker.map.test.tsx` `map.on` çağrısını yakalıyor,
  `MapView.markers.test.tsx` `ResizeObserver`'ı `beforeAll`'da global
  tanımlıyor, `MiniMap.test.tsx` `CRS.EPSG4326` sabitini mock'luyor) —
  hook'un kendi testi bunlardan bağımsız, ayrı bir mock kurar.
- `ParcelPicker.test.tsx` (leaflet MOCK'LANMADAN, gerçek kütüphaneyle
  jsdom'da render eden dosya) de değişmeden yeşil kalmalı — bu, hook'un
  gerçek Leaflet ile de çalıştığının ek kanıtı.

## Doğrulama

Her migration adımından sonra: `npx tsc --noEmit` (0 hata) + ilgili
bileşenin test dosyası + `useLeafletMap.test.ts` yeşil. Üç migration
bittiğinde: `npx jest src/components/listing-wizard/ParcelPicker
src/components/marketplace/MapView src/components/marketplace/MiniMap
src/lib/hooks/useLeafletMap` tam yeşil + tüm proje `npx jest` regresyon
taraması + `npx tsc --noEmit` + gerçek `npm run build` (Turbopack
build-time-only kısıtları için, bkz.
[[feedback_verification_needs_real_build_not_just_dev_or_tests]]).
Görsel doğrulama: `/hesapla` parsel modalı, `/marketplace` harita
görünümü (tile/marker/measure/draw/heatmap butonları), ve bir ilan
sayfasındaki `MiniMap` (risk katmanı checkbox'ları dahil) — Playwright
ile ekran görüntüsü, "öncesi ile davranışsal olarak aynı" doğrulanır.
