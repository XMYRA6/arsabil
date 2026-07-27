# Parsel Kimliği ve TKGM Doğrulama — Tasarım (T0 + T1)

**Tarih:** 2026-07-27
**Durum:** Onay bekliyor
**Kapsam:** Yalnızca ilan akışı (wizard → kaydetme → ilan detayı → marketplace haritası). `/hesapla` bu spec'in dışında.
**Kaynak:** `docs/rekabet/2026-07-27-yerimden-analiz-ve-kazanim-plani.md` — T0 ve T1 maddeleri.

---

## 1. Problem

ArsaBil'in `Listing` modelinde **koordinat alanı yok**. Sonuç olarak `MapView.tsx:246` her ilanı rastgele bir İstanbul koordinatına yerleştiriyor:

```ts
const lat = listing.lat ?? ISTANBUL_COORDS[idx % ISTANBUL_COORDS.length][0] + (Math.random() - 0.5) * 0.01;
```

`listing.lat` hiçbir zaman dolmadığı için marketplace haritası **tamamen uydurma**. Arsa satın alma kararı verilen bir üründe bu, yalnızca bir görsel kusur değil.

Ayrıca ilanlarda parsel kimliği (ada/parsel/mahalle) hiç tutulmuyor. Bu, ileride imar planı katmanı, deprem verisi ve resmi alan doğrulaması gibi her şeyin önkoşulu.

## 2. Hedef

1. Her yeni ilan **gerçek bir koordinat** taşısın.
2. Koordinattan TKGM parsel kaydı çekilip ilana **snapshot** olarak yazılsın.
3. İlan detayında parsel kimliği, resmi alan ve gerçek parsel sınırı gösterilsin.
4. Beyan edilen m² ile tapudaki alan **şeffaf biçimde karşılaştırılsın**.
5. Harita uydurma koordinat üretmeyi bıraksın.

## 3. Doğrulanmış dış servis

Canlı olarak test edildi (2026-07-27):

```
GET https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/parsel/{lat}/{lon}
```

Örnek cevap (Tekirdağ / Muratlı):

```json
{"type":"Feature",
 "geometry":{"type":"Polygon","coordinates":[[[27.58337,41.16781], ...]]},
 "properties":{"ilAd":"Tekirdağ","ilceAd":"Muratli","mahalleAd":"Kirkkepenekli",
   "adaNo":"0","parselNo":"1871","alan":"830.00","nitelik":"Arsa",
   "mevkii":"Köyiçi","pafta":"16","mahalleId":12038,"durum":"1",
   "zeminKmdurum":"Ana Taşınmaz"}}
```

Parsel yoksa **404** + `{"Message":"Parsel Bulunamadı: Enlem = … - Boylam=…"}`.

### 3.1 Bilinen tuzaklar (ölçüldü, varsayım değil)

**Ondalık ayracı tutarsız.** Aynı API'nin ada/parsel ile sorgulanan biçimi (`/api/parsel/{mahalleId}/{ada}/{parsel}`, bu spec'in kapsamı dışında ama doğrulandı) aynı parsel için `"alan":"830,00"` döndürüyor — **virgüllü**. Koordinat yolu ise `"830.00"` — noktalı. Asıl tehlike, hatanın küçük parsellerde görünmemesi: `parseFloat` virgülde durduğu için `"830,00"` tesadüfen doğru sonuç verir (`830`). Binlik ayracı olan değerde ise patlar — `parseFloat("1.240,50")` → **`1.24`**. Yani 1.240 m²'lik bir parsel sessizce 1 m² kaydedilir ve alan karşılaştırması her seferinde "mismatch" der. **Alan parse'ı her iki formatı da tolere etmek ZORUNDA** ve her iki formatın da testi olacak.

**Türkçe karakterler koordinat yolunda düşük kaliteli.** Koordinat sorgusu `"Muratli"` / `"Kirkkepenekli"` döndürürken, ada/parsel sorgusu `"Muratlı"` / `"Kırkkepenekli"` döndürüyor. `ilAd` her iki yolda da doğru (`"Tekirdağ"`).

**Karar:** TKGM'den gelen isim olduğu gibi saklanır. Türkçeleştirme denenmez — `"Kirkkepenekli"` değerini `"Kırkkepenekli"` yapmak tahmindir ve resmi kaydı tahrif eder. Kullanıcının seçtiği `city` / `district` alanları zaten ayrı ve düzgündür; gösterimde onlar esas alınır, TKGM adı yalnızca parsel kimlik satırında görünür.

## 4. Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| K1 | **Kayıt anında doğrula, sonucu sakla** (canlı proxy değil) | İlan detayı ürünün en kritik sayfası; SLA'sı bizde olmayan bir devlet servisine bağlanmamalı. TKGM kesintisi yayındaki ilanları etkilemez. |
| K2 | **Koordinat zorunlu, doğrulama zorunlu değil** | İstanbul merkez koordinatı (41.0082, 28.9784) TKGM'de 404 döndü — her nokta parsele oturmuyor. Doğrulamayı zorunlu tutmak gerçek ilanları bloklar. |
| K3 | **Beyan ve resmi alan birlikte gösterilir, fark işaretlenir** | Hisseli tapuda fark meşrudur; TKGM değerini tek doğru kabul etmek satıcıyı haksız yere yanlış gösterir. Şeffaflık, hükümden iyidir. |
| K4 | **İstemcinin gönderdiği parsel verisine güvenilmez** | Rozet güven satıyorsa taklit edilemez olmalı. Snapshot'ı sunucu kendisi çeker. |
| K5 | **Ada/parsel ile sorgu bu spec'te yok** | Doğrulandı ve çalışıyor, ama `mahalleId` gerektiriyor → il/ilçe/mahalle listeleme endpoint'leri + ikinci bir UI yolu. Ayrı spec. |
| K6 | **PostGIS kurulmaz** | Poligon yalnızca çiziliyor, üzerinde uzamsal sorgu yapılmıyor. `Json?` yeterli. |

## 5. Veri modeli

`Listing` modeline 10 alan — **hepsi nullable**, mevcut kayıtlar bozulmaz:

```prisma
lat                 Float?      // pin koordinatı (WGS84)
lng                 Float?
neighborhood        String?     // TKGM mahalleAd
adaNo               String?     // TKGM adaNo
parselNo            String?     // TKGM parselNo
parcelAreaSqm       Float?      // TKGM alan — resmi m²
parcelQuality       String?     // TKGM nitelik ("Arsa" / "Tarla" …)
parcelGeometry      Json?       // GeoJSON Polygon
parcelVerifiedAt    DateTime?   // null ise doğrulanmamış
parcelLookupStatus  String?     // 'verified' | 'not_found' | 'unavailable'
```

**`parcelVerifiedAt` tek doğruluk kaynağıdır.** Ayrı bir boolean eklenmez; hem rozeti hem tarihi tek alan taşır. (`User.isVerified` ayrı bir kavramdır, isim çakışması da böylece önlenir.)

**`parcelLookupStatus` analiz içindir.** Başarısız denemeler sessizce kaybolmasın: bir hafta sonra "kaç ilan doğrulanamadı, hangi bölgelerde?" sorusu tahminle değil sorguyla cevaplanabilsin.

**`landSizeSqm` (beyan) dokunulmaz.** `parcelAreaSqm` onun yerine değil, yanına gelir.

Ada/parsel alanları TKGM'nin kendi isimleriyle bırakılıyor (`adaNo`, `parselNo`). Kodun geri kalanı İngilizce (`landSizeSqm`, `titleDeed`) ancak bunlar Türk kadastro terimleridir; `blockNo`/`parcelNo` çevirisi TKGM cevabıyla eşleştirmeyi her okuyanda bir zihinsel adım pahalı hale getirir.

## 6. Bileşenler

| Birim | Sorumluluk | Bağımlılık |
|---|---|---|
| `src/lib/tkgm/parcel.ts` | TKGM'yi çağır, cevabı normalize et, tiplenmiş sonuç dön | fetch |
| `src/lib/listing/areaComparison.ts` | Beyan vs resmi alan → durum + fark yüzdesi | yok (saf) |
| `src/lib/listing/listingCoords.ts` | `splitListingsByCoords()` → `{ placed, unplaced }` | yok (saf) |
| `src/app/api/parcel/lookup/route.ts` | Auth'lu proxy + rate limit | `lib/tkgm` |
| `src/components/listing-wizard/ParcelPicker.tsx` | Pin at, doğrula, sonucu göster | lookup API |
| `src/components/listing-wizard/WizardStep1Location.tsx` | ParcelPicker'ı akışa yerleştir, geçişi kilitle | ParcelPicker |
| `src/app/api/listings/route.ts` + `[id]` | Snapshot'ı **sunucuda** yaz | `lib/tkgm` |
| `src/app/listing/[id]/page.tsx` | Parsel kimliği, alan karşılaştırma, gerçek sınır | veri |
| `src/components/marketplace/MapView.tsx` | Rastgele koordinat fallback'ini kaldır | `listingCoords` |

### 6.1 Arayüzler

```ts
// lib/tkgm/parcel.ts
export type ParcelInfo = {
  il: string; ilce: string; mahalle: string;
  adaNo: string; parselNo: string;
  areaSqm: number; quality: string;
  geometry: GeoJSONPolygon;
};
export type ParcelLookupResult =
  | { ok: true;  parcel: ParcelInfo }
  | { ok: false; reason: 'not_found' | 'unavailable' };

export function fetchParcelByPoint(lat: number, lng: number): Promise<ParcelLookupResult>;
```

```ts
// lib/listing/areaComparison.ts
export type AreaComparison = {
  status: 'match' | 'minor' | 'mismatch' | 'unknown';
  diffPct: number | null;
};
export function compareArea(declaredSqm: number | null, officialSqm: number | null): AreaComparison;
```

Eşikler, `diffPct = |declared − official| / official × 100` üzerinden:

| `diffPct` | `status` | Kullanıcıya |
|---|---|---|
| < 1 | `match` | Sessiz (rozet yeter) |
| 1 ≤ d < 5 | `minor` | Tapu değeri bilgi olarak gösterilir |
| ≥ 5 | `mismatch` | Uyarı rozeti |
| — | `unknown` | Karşılaştırma satırı hiç gösterilmez |

`unknown`: taraflardan biri `null` **veya** `officialSqm === 0` (sıfıra bölme). `diffPct` yalnızca `unknown` durumunda `null` olur.

**TKGM'ye tarayıcıdan gidilmez.** Proxy zorunludur: CORS bir yana, kullanıcının IP'sini devlet servisine açmamak, rate limit'i bizim kontrol etmemiz ve ileride cache koyabilmek için tek giriş noktası gerekir.

`ParcelPicker`'ın dış arayüzü yalnızca `{ value, onChange }`. Wizard onun içini bilmez, o da wizard'ı. Leaflet dinamik import deseni `MapView`'daki mevcut kullanımı izler.

## 7. Veri akışı

**İlan verme:**

1. Adım 1: il/ilçe seçilir (mevcut alanlar korunur) → `ParcelPicker` haritası o ilçeye uçar
2. Haritaya tıklama → pin düşer, önceki parsel sonucu temizlenir
3. "Parseli Doğrula" → `GET /api/parcel/lookup?lat=…&lng=…`
4. Başarıda sonuç kartı: **Ada 0 · Parsel 1871 · Kırkkepenekli · Arsa · 830 m²** + poligon haritada
5. **Pin yoksa Adım 2'ye geçilemez** (K2). Doğrulanmamış olmak engel değildir.
6. Adım 2'de `landSizeSqm` girilirken, parsel doğrulanmışsa altında ipucu: *"Tapu kaydı: 830 m²"*. Fark `mismatch` ise uyarı orada anında görünür — ilan detayını beklemez.
7. Yayınla → sunucu `lat/lng` ile TKGM'yi **kendisi** çağırır, snapshot + `parcelLookupStatus` + `parcelVerifiedAt` yazar. Gövdeden gelen parsel alanları **yok sayılır** (K4).

**Düzenleme (PATCH):** koordinat değiştiyse doğrulama yeniden yapılır; değişmediyse mevcut snapshot korunur.

**Görüntüleme:**

- İlan detayı: parsel kimlik satırı, rozet (*"TKGM ile doğrulandı · 27.07.2026"* / *"Doğrulanmadı"*), beyan-tapu alan karşılaştırması, haritada gerçek sınır (poligon yoksa pin).
- Marketplace haritası: koordinatsız ilanlar **gösterilmez**; harita üstünde dürüst not — *"3 ilanın konumu belirtilmemiş"*.

## 8. Hata yönetimi

| Durum | Kullanıcı görür | `parcelLookupStatus` |
|---|---|---|
| Parsel bulundu | Sonuç kartı + yeşil poligon | `verified` |
| TKGM 404 | "Bu noktada kayıtlı parsel bulunamadı — pini parselin içine taşıyın" | `not_found` |
| Timeout / 5xx | "TKGM şu an yanıt vermiyor; ilanınız doğrulanmadan yayınlanabilir" | `unavailable` |
| Geçersiz/eksik cevap (geometry yok) | Aynı mesaj | `unavailable` |

Kurallar: hiçbir hata yayınlamayı engellemez · timeout **8 sn** · lookup kullanıcı başına **dakikada 20** çağrı.

## 9. Test stratejisi

**TDD ile yazılacak saf birimler:**

`lib/tkgm/parcel.test.ts` (fetch mock'lanır, gerçek servise gidilmez):
- `"alan":"830.00"` → `830`
- `"alan":"830,00"` → `830` ← §3.1'deki virgül tuzağının kilidi
- `"alan":"1.240,50"` → `1240.5`
- 404 → `not_found`
- 5xx / timeout → `unavailable`
- Bozuk JSON veya `geometry` içermeyen cevap → `unavailable`

`lib/listing/areaComparison.test.ts`: dört durum + sıfıra bölme + `null` beyan.

`lib/listing/listingCoords.test.ts`: koordinatsız ilan `unplaced`'a düşer, koordinatlı `placed`'a.

**Entegrasyon:**

- **`api/listings` POST güvenlik testi (kritik):** gövdeye elle `parcelVerifiedAt` + sahte `adaNo` konursa yok sayılmalı. K4 testi olmadan karar değil temennidir.
- `api/parcel/lookup`: oturumsuz istek → 401, limit aşımı → 429.
- `ParcelPicker` (RTL): pin → doğrula → kart görünür; 404'te uyarı çıkar ve kullanıcı yine de devam edebilir.

**Kapanış:** gerçek TKGM'ye karşı tek canlı Playwright turu — Tekirdağ koordinatıyla uçtan uca ilan verme, poligonun çizildiği ve rozetin doğru göründüğü ekran görüntüsüyle doğrulanır.

**MapView için tasarım notu:** koordinat kararı haritanın içinden saf `splitListingsByCoords()` yardımcısına taşınıyor. Leaflet'i jsdom'da test etmek kırılgandır; korunması gereken kural ("koordinatsız ilan haritaya konmaz") saf bir fonksiyonda üç satırlık testle kalıcı olarak kilitlenir.

## 10. Kapsam dışı

- `/hesapla` entegrasyonu (resmi alanın `Ma` girdisine otomatik dolması)
- Ada/parsel yazarak sorgulama (K5 — doğrulandı, ayrı spec)
- e-Plan / TUCBS imar katmanı (rekabet planında T2)
- AFAD deprem verisi (T7)
- Mevcut koordinatsız ilanlara toplu koordinat atama
- TKGM snapshot'ının periyodik tazelenmesi (ifraz/tevhid) — `parcelVerifiedAt` tarih gösterimi şimdilik yeterli

## 11. Başarı ölçütü

- Yeni ilan koordinatsız kaydedilemez.
- Marketplace haritasında rastgele koordinat üreten kod yolu kalmadı.
- Doğrulanmış bir ilanın detayında TKGM parsel sınırı çiziliyor ve ada/parsel/mahalle görünüyor.
- Beyan ile tapu alanı arasında %5'i aşan fark kullanıcıya hem ilan verirken hem ilan detayında görünüyor.
- `parcelLookupStatus` üzerinden doğrulanamayan ilanların oranı sorgulanabiliyor.
