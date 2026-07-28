# Resmi Risk Katmanları — Tasarım (T2, kapsamı değiştirilmiş)

**Tarih:** 2026-07-28
**Durum:** Onaylandı (2026-07-28)
**Kapsam:** İlan detayı + `/hesapla`. İlan wizard'ı, marketplace ve admin bu spec'in dışında.
**Kaynak:** `docs/rekabet/2026-07-27-yerimden-analiz-ve-kazanim-plani.md` — T2 maddesi, **kapsamı değiştirilerek** (§2).
**Önkoşul:** T0 + T1 (parsel kimliği + TKGM doğrulama), main `53acb77`'de.

---

## 1. Problem

ArsaBil'in fizibilite motorunda bir **risk katsayısı `R`** var (`engine_v2.ts:20-22`) ve inşaat maliyetini doğrudan çarpıyor (`engine_v2.ts:87` → `Mi = (Mi_base + finalMz) * finalR`). Ama bu katsayının değerini kullanıcı **hiçbir dayanağı olmadan** giriyor. Toggle'ı açan bir kullanıcının "1,05 mi 1,15 mi" sorusuna ürün hiçbir cevap vermiyor.

Aynı anda, arsa kararını gerçekten etkileyen resmi risk verileri (diri fay, taşkın) üründe hiç yok. Rakip yerimden.com'da il düzeyinde bir AFAD PGA rozeti var — parsel düzeyinde değil, ve hiçbir hesaba girmiyor.

## 2. Kapsam değişikliği — neden T2 artık "imar katmanı" değil

Rekabet analizindeki T2 maddesi `/api/imar-proxy?layer=uip|nip` deseniyle **resmi 1/1000 ve 1/5000 imar planı rasterı** öngörüyordu. 2026-07-28'de canlı araştırma bunun **doğrulanabilir bir public kaynağı olmadığını** gösterdi:

- **e-Plan (`eplan.csb.gov.tr`) oturum korumalı bir belediye otomasyon sistemi.** `html/login.html` + `fSession/getSessionInfo` çağrıları mevcut; denenen public harita yollarının (`html/harita.html`, `html/planSorgulama.html`) tamamı 404.
- `e-plan.gov.tr` yalnızca `eplan.csb.gov.tr`'ye yönlendiren bir duyuru sayfası.
- **Public TUCBS GeoServer'ında imar katmanı yok** (katman listesi §3).
- yerimden'in kaynağı **öğrenilemez** — kendi sunucusunda proxy'liyor, tıpkı bizim TKGM proxy'mizin `cbsapi.tkgm.gov.tr`'yi tarayıcıdan gizlemesi gibi.

Belediye bazlı servisler (İBB `planaski.ibb.gov.tr`, `eplan.ibb.istanbul`) var ama **ulusal kapsama vermez** — her belediye ayrı entegrasyon, ve sonuç İstanbul-only bir özellik olur.

Karar: T2, doğrulanmış kaynağı olan **resmi risk katmanlarına** kaydırıldı. İmar kaynağı ayrı bir araştırma kalemi olarak açık kalıyor (§10).

## 3. Doğrulanmış dış servis

Canlı test edildi (2026-07-28):

```
https://ucbp-app8.tucbs.gov.tr/geoserver/tucbs/wms
```

Ulusal Coğrafi Bilgi Platformu'nun (UCBP / TUCBS, Çevre Şehircilik ve İklim Değişikliği Bakanlığı) GeoServer'ı. **Kimlik doğrulaması yok.** Servis adresi UCBP harita uygulamasının kendi JS paketinden çıkarıldı.

`GetCapabilities` ile doğrulanan katmanlar:

| Katman adı | İçerik |
|---|---|
| `diri_fay` | Diri fay hatları |
| `taskin_tehlike_haritasi_q50` / `_q100` / `_q500` | Taşkın tehlike (50/100/500 yıl) |
| `taskin_risk_haritasi_q50` / `_q100` / `_q500` | Taşkın risk |
| `srtm` | Yükseklik |
| `dogaldegerlerharitasi` | Doğal değerler |
| `geoservice_maks_il` / `_ilce` | İdari sınırlar |

**Bu spec yalnızca `diri_fay` ve `taskin_tehlike_haritasi_q100` kullanır.** Diğerleri kapsam dışı.

Doğrulanmış çalışan istek (gerçek PNG döndü, Kuzey Anadolu Fayı doğru render oldu):

```
GET /geoserver/tucbs/wms?service=WMS&version=1.1.1&request=GetMap
    &layers=diri_fay&styles=&bbox={minLon},{minLat},{maxLon},{maxLat}
    &width=256&height=256&srs=EPSG:4326&format=image/png&transparent=true
```

### 3.1 Bilinen tuzaklar (ölçüldü, varsayım değil)

**WAF yalnızca `GetCapabilities` ve `GetMap`'e izin veriyor.** Ölçülen sonuçlar:

| İstek | Sonuç |
|---|---|
| `GetMap` | **200 image/png** |
| `GetCapabilities` (workspace'li) | **200 text/xml** |
| `GetFeatureInfo` (`info_format` ne olursa olsun) | **406** |
| WFS `GetFeature` | **406** |
| `/geoserver/wms` (workspace'siz) | **406** |
| `/geoserver/{imar,eplan,plan,csb,...}/wms` | **406** |

Sonuç: **vektör veri ve attribute sorgusu yok.** Mesafe/bölge bilgisi yalnızca **raster örnekleme** ile elde edilebilir. Tasarımın tamamı bu kısıtın üzerine kuruludur.

**Tarayıcı User-Agent'ı zorunlu.** Varsayılan `curl` UA'sıyla `GetMap` bile reddedilebiliyor. Sunucu tarafındaki `fetch` çağrısı açık bir tarayıcı UA header'ı göndermek ZORUNDA.

**Yalnızca `EPSG:4326` / `CRS:84`.** Katmanların hiçbiri `EPSG:3857` ilan etmiyor. WMS 1.1.1 + `srs=EPSG:4326` kullanılacak (bbox sırası `lon,lat`). WMS 1.3.0'da `EPSG:4326` eksen sırası `lat,lon`'a döner — **1.3.0 kullanılmayacak**, bu sessiz bir koordinat hatası kaynağıdır.

**Anti-aliasing kenar pikselleri.** Ölçülen örnek piksel değerleri `(255,0,0,1)` ve `(255,0,0,24)` — yani alpha'sı neredeyse sıfır olan AA saçakları var. Ham "alpha > 0" testi **sahte yakınlık** üretir. **Alpha eşiği 64** kullanılacak ve testi olacak.

**Yerel geliştirme makinesinde AVG antivirüs TLS'i MITM ediyor** (`CN=AVG Web/Mail Shield Root`). Bu, `curl`'ün bazı `.gov.tr` adreslerinde sertifika hatası vermesine yol açıyor; Node ve tarayıcı etkilenmiyor. **Bu bir üretim sorunu değildir**, yalnızca elle yapılan `curl` denemelerinde yanıltıcıdır — sertifika hatasını "servis çökmüş" diye yorumlamayın.

## 4. Hedef

1. İlan detayında ve `/hesapla`'da **resmi fay ve taşkın katmanları** harita üzerinde gösterilsin.
2. Parselin **diri faya mesafesi** ölçülsün ve TBDY 2018 `γF` katsayısı hesaplansın.
3. Parselin **Q100 taşkın tehlike bölgesinde olup olmadığı** belirlensin.
4. `/hesapla`'da kullanıcıya **önerilen bir `R` değeri** sunulsun — kabul veya reddedebilsin.
5. Motor matematiğine **dokunulmasın**; yalnızca mevcut `R` girdisi beslensin.

## 5. Dayanak: TBDY 2018 `γF`

Türkiye Bina Deprem Yönetmeliği 2018, fay düzlemine `LF` km mesafedeki yapılar için bir **yakın fay katsayısı `γF`** tanımlar. DD-1 ve DD-2 deprem yer hareketi düzeyleri için:

```
LF ≤ 15 km        →  γF = 1,2
15 < LF ≤ 25 km   →  γF = 1,2 − 0,02·(LF − 15)
LF > 25 km        →  γF = 1,0
```

DD-3 ve DD-4 için `γF = 1,0` sabittir. Katsayı, 1 saniye periyot tasarım spektral ivme katsayısına uygulanır: `S_D1 = S1 · γF · F1`.

### 5.1 İki dürüstlük sınırı — ürün metninde AÇIKÇA belirtilecek

**(a) `γF` tasarım talebini ölçekler, maliyeti değil.** `γF` deprem tasarım spektral ivmesini artırır. Bunun inşaat maliyetine yansıması dolaylıdır (daha fazla donatı/kesit). Dolayısıyla **`R ≠ γF`**. Ürün iki ayrı sayı gösterir:

- **`γF`** — yönetmelik kaynaklı, formülle hesaplanmış, "TBDY 2018" kaynağı belirtilmiş **kesin** değer.
- **Önerilen `R`** — `γF`'den türetilmiş, **"tahmini"** etiketli, kullanıcının kabul/red edebileceği ayrı değer.

**(b) Ölçtüğümüz mesafe fay izidir, fay düzlemi değil.** TBDY'nin `LF`'i fay düzlemine olan mesafedir. Bizim rasterimiz fayın **yüzey izdüşümünü** ölçer. Kuzey Anadolu Fayı gibi dike yakın doğrultu atımlı faylarda fark ihmal edilebilir; eğim atımlı faylarda değildir. Bu, belgelenmiş bir yaklaşımdır ve UI metninde "yaklaşık" ifadesi kullanılacaktır.

`γF` → `R` eşlemesi:

```
R_önerilen = 1 + (γF − 1) · 0,5     →  yani γF=1,2 iken R≈1,10
```

Çarpanın `0,5` olması bir **mühendislik varsayımıdır**, yönetmelik hükmü değildir; sabit tek bir yerde tanımlanır ve yorumla gerekçelendirilir. Taşkın bölgesindeyse `R`'ye ayrıca `+0,03` eklenir (drenaj/temel önlemi payı) — bu da aynı şekilde varsayım olarak işaretlenir.

## 6. Mimari

T0/T1'in kanıtlanmış deseni birebir izlenir: **dış servis asla tarayıcıdan çağrılmaz.** Gerekçeler burada daha da güçlü — WAF tarayıcı UA'sı istiyor, CORS başlığı yok, ve kullanıcı IP'si devlet servisine açılmamalı.

```
tarayıcı
  ├── /api/risk/tiles   ──► TUCBS WMS   (harita katmanı, ham PNG geçişi)
  └── /api/risk/lookup  ──► TUCBS WMS   (ölçüm: PNG indir → piksel örnekle → sayı döndür)
```

### 6.1 `src/lib/risk/wms.ts` — tek dış temas noktası

TUCBS'e giden **yegâne** modül. Sorumluluğu yalnızca "bbox ver, PNG buffer al".

```ts
export type WmsLayer = 'diri_fay' | 'taskin_tehlike_haritasi_q100'
export type WmsResult = { ok: true; png: Buffer } | { ok: false; reason: 'unavailable' }

export async function fetchWmsTile(
    layer: WmsLayer, bbox: BBox, sizePx: number
): Promise<WmsResult>
```

- Tarayıcı UA header'ı (§3.1 gereği).
- 8 sn timeout, `AbortController` — `parcel.ts`'teki desenin aynısı.
- **Asla throw etmez.** Risk verisi opsiyoneldir; TUCBS çökerse ilan detayı ve hesapla normal çalışmaya devam eder.
- İçerik tipi `image/png` değilse (WMS hata XML'i döndürebilir) `{ok:false}`.

### 6.2 `src/lib/risk/sampling.ts` — saf fonksiyonlar

Ağ erişimi yok, dolayısıyla **tamamen TDD ile yazılır**. `calculatorUiHelpers.ts`'in kurduğu desen.

```ts
export function bboxAround(lat: number, lng: number, radiusM: number): BBox
export function metersPerPixel(radiusM: number, sizePx: number): number
export function nearestOpaquePixelPx(rgba: RGBAImage): number | null   // alpha > 64
export function isCenterOpaque(rgba: RGBAImage): boolean               // alpha > 64
```

`bboxAround`, enlem daralmasını hesaba katar: boylam yarıçapı `radiusM / (111320 · cos(lat))`, enlem yarıçapı `radiusM / 111320`.

### 6.3 İki aşamalı örnekleme (ölçümden türedi)

TBDY 25 km'ye kadar bakmayı gerektiriyor. 25 km yarıçapı 256 px'e sığdırmak çözünürlüğü ~195 m/px'e düşürür — yakın faylarda kabul edilemez. Bu yüzden:

| Aşama | Yarıçap | Kutu kenarı | Çözünürlük (256 px) | Amaç |
|---|---|---|---|---|
| 1 | 2 km | 4 km | ~16 m/px | Yakın fayı hassas ölç |
| 2 (yalnızca 1. aşamada isabet yoksa) | 25 km | 50 km | ~195 m/px | 15/25 km bandını belirle |

Çözünürlük daima `kutu kenarı / sizePx` şeklinde hesaplanır — yarıçap değil kenar. Bu, `metersPerPixel`'in testinde açıkça sabitlenecek bir tuzaktır.

İki aşamada da isabet yoksa `LF > 25 km` kabul edilir → `γF = 1,0`.

Ölçülen tutarlılık kanıtı (2026-07-28): fay üzerindeki bir noktada 435 m; aynı nokta 6,1 km kuzeye kaydırıldığında 5.518 m; İstanbul/Fatih'te 20 km kutuda isabet yok (Marmara segmenti daha güneyde). Üçü de beklenen sonuç.

### 6.4 `src/lib/risk/coefficient.ts` — saf, TDD

```ts
export function gammaF(faultDistanceM: number | null): number
export function suggestedR(gammaF: number, inFloodZone: boolean): number
```

`γF` formülü §5'ten birebir. `faultDistanceM === null` (25 km'de isabet yok) → `1,0`. Sınır değerleri (15 km tam, 25 km tam) test edilecek.

### 6.5 `/api/risk/lookup`

`GET /api/risk/lookup?lat=&lng=` → `{ faultDistanceM, gammaF, floodQ100, suggestedR }`

`/api/parcel/lookup/route.ts` deseni birebir: NextAuth oturum kontrolü (401), `RATE_LIMITS.RISK_LOOKUP` (kullanıcı başına 20/dk, `PARCEL_LOOKUP` ile aynı eşik), TR sınır kontrolü, `Retry-After` header'lı 429.

### 6.6 `/api/risk/tiles`

`GET /api/risk/tiles?layers=&bbox=&width=&height=&srs=` → ham `image/png`.

**Parametre adları Leaflet'in gönderdiğiyle birebir aynı olmalı.** `L.tileLayer.wms` standart WMS parametrelerini kendisi üretir — `layers` (**çoğul**), `bbox`, `width`, `height`, `srs`, `format`, `transparent`, `service`, `request`, `version`. Tekil `layer` beklemek entegrasyonda sessizce patlar. Route bu adları aynen kabul eder ve yukarı akışa geçirir.

- `layers` **beyaz listeye** karşı doğrulanır (§3'teki iki katman) — açık proxy olmasın. Tek katman adı kabul edilir; virgüllü çoklu katman reddedilir.
- `srs` yalnızca `EPSG:4326` kabul eder (§3.1 gereği). Leaflet katmanı `crs: L.CRS.EPSG4326` ile kurulmalıdır — varsayılan `EPSG3857`'dir ve TUCBS bunu ilan etmiyor.
- `width`/`height` üst sınırı 512 (kaynak tüketimi).
- `Cache-Control: public, max-age=86400` — fay hatları günlük değişmez, TUCBS'i yormayalım.
- Oturum gerektirmez (harita katmanı ilan detayında herkese açık), ama **IP başına** `RATE_LIMITS.RISK_TILES` uygulanır (300/dk — bir harita görünümü onlarca tile ister, `RISK_LOOKUP` eşiği burada yanlış olur).

`rate-limit.ts`'e iki yeni giriş eklenir: `RISK_LOOKUP` (kullanıcı başına 20/dk) ve `RISK_TILES` (IP başına 300/dk).

### 6.7 Veri kalıcılığı

`Listing` modeline üç alan: `faultDistanceM Int?`, `floodQ100 Boolean?`, `riskSnapshotAt DateTime?`.

T0'ın `parcelSnapshot` deseni aynen geçerli: **değerler sunucuda üretilir, istemciden gelen risk verisi yok sayılır.** İlan kaydedilirken bir kez hesaplanır; ilan detayı her açılışta TUCBS'e gitmez. `riskSnapshotAt` verinin ne zaman alındığını gösterir.

Geriye dönük veri: mevcut ilanlar için alanlar `null` kalır, UI bunu "risk verisi yok" olarak gösterir. Toplu doldurma bu spec'in dışında.

## 7. Kullanıcı arayüzü

### 7.1 İlan detayı

- Mevcut haritaya **katman aç/kapa** kontrolü: "Diri fay" ve "Taşkın (Q100)". Leaflet `L.tileLayer.wms` `/api/risk/tiles`'ı kaynak alır.
- Parsel özetine bir **risk satırı**: "Diri faya yaklaşık 1,2 km · Q100 taşkın bölgesi dışında".
- Veri yoksa satır hiç gösterilmez (boş/şüpheli değer gösterilmez).

### 7.2 `/hesapla`

- Mevcut `LocationSelector` yalnızca il/ilçe tabanlı, **koordinat yok**. T0'da yazılan `ParcelPicker.tsx` (harita pin + TKGM doğrulama) burada yeniden kullanılır.
- Konum seçimi **opsiyoneldir** — seçilmezse hesapla bugünkü gibi çalışır. Bu, mevcut akışı bozmama garantisidir.
- Konum seçilince bir **öneri kartı**:

  > **Yakın fay etkisi** — Parseliniz diri faya yaklaşık **1,2 km**.
  > TBDY 2018 yakın fay katsayısı **γF = 1,20**.
  > *Tahmini* risk katsayısı önerisi: **R = 1,10**  · `[Uygula]`
  >
  > <small>γF, TBDY 2018 uyarınca deprem tasarım talebini ölçekler; maliyet etkisi tahminidir. Mesafe fayın yüzey izine göre hesaplanmıştır. Mühendislik raporu yerine geçmez.</small>

- `[Uygula]` `isRiskEnabled = true` ve `R = önerilen` yapar. Kullanıcı sonrasında `R`'yi elle değiştirebilir — öneri kilit değildir.

### 7.3 Mühür kimliği

`/hesapla` sayfasında `--seal-*` token'ları **sayfa geneline** taşınmış durumda (Faz 2.5 öncesi, `e81faca`). Öneri kartı bu token setini kullanır; yeni renk tanımlanmaz.

## 8. Hata durumları

| Durum | Davranış |
|---|---|
| TUCBS erişilemiyor | Risk kartı/satırı hiç gösterilmez. Hesapla ve ilan detayı normal çalışır. |
| WMS hata XML'i döndürdü | `{ok:false}` — yukarıdakiyle aynı. |
| Koordinat TR sınırları dışında | 400, ölçüm yapılmaz. |
| Rate limit aşıldı | 429 + `Retry-After`. UI "biraz sonra tekrar deneyin" der. |
| Katman beyaz listede değil | 400. |

**Genel ilke:** risk verisi ürünün çalışması için gerekli değildir. Hiçbir hata yolu kullanıcıyı hesap yapmaktan alıkoymaz.

## 9. Test stratejisi

- `sampling.ts` ve `coefficient.ts` **saf** — tam TDD. Sınır değerleri (alpha=64 tam, LF=15 km tam, LF=25 km tam) ayrı testler.
- `wms.ts` — `fetch` mock'lanır; UA header'ının gönderildiği, timeout'un çalıştığı, PNG olmayan cevabın `{ok:false}` verdiği doğrulanır.
- API route'ları — `/api/parcel/lookup/__tests__/route.test.ts` deseni (auth mock, rate-limit mock).
- **Ağ çağrısı içeren gerçek TUCBS testi yazılmaz** — dış servise bağlı test kırılgandır. §3'teki doğrulama elle yapılmış ve bu belgeye kaydedilmiştir.
- Canlı Playwright doğrulaması: katman toggle'ı, öneri kartı, `[Uygula]` sonrası `R` değişimi.

## 10. Kapsam dışı

- **İmar planı (UIP/NIP) katmanı** — kaynak bulunamadı (§2). Ayrı araştırma kalemi: İBB ve birkaç büyükşehir servisinin fizibilitesi ölçülüp ayrı spec yazılacak.
- `srtm` / eğim katmanı ve iksa (`Z`) girdisine bağlanması.
- Taşkın `q50` / `q500` ve `taskin_risk_*` katmanları.
- Mevcut ilanların risk verisiyle toplu doldurulması.
- İlan wizard'ında risk gösterimi (yalnızca kaydetme sırasında snapshot alınır).
- Marketplace haritasında risk katmanı.

## 11. Bağımlılık

Sunucu tarafında PNG çözmek gerekiyor; projede görüntü işleme bağımlılığı **yok** (`package.json`'da `sharp`/`pngjs`/`jimp` bulunmuyor). **`pngjs`** eklenecek — saf JS, native derleme gerektirmez, tek ihtiyacımız olan RGBA piksel erişimini verir. `sharp` bu iş için gereğinden ağırdır (native binary, Docker imajını büyütür).
