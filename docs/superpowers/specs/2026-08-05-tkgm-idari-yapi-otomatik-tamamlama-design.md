# TKGM İdari Yapı Otomatik Tamamlama (Tasarım)

**Tarih:** 2026-08-05
**Durum:** Onaylandı, implementasyon planı bekliyor.
**Bağlam:** Kullanıcı canlıda `ManualParcelEntryForm`u ("Elle gir" modu) test ederken bildirdi:
mahalle adını harfi harfine doğru yazsa bile TKGM/Nominatim sorgusu başarısız oluyor — eksik
harf, büyük/küçük harf farkı veya TKGM'nin kendi resmi yazımından ufak bir sapma yeterli.
Kullanıcının isteği: "TKGM'den il, ilçe, mahalle verilerini almalıyız... birkaç harf girdiğimizde
bile seçenekleri gösterebilmeli."

## Kök neden

Bugünkü akış: kullanıcı İl/İlçe/Mahalle'yi SERBEST METİN olarak yazıyor →
`ManualParcelEntryForm.handleSearch` bu metni `Nominatim` (OpenStreetMap) adres aramasına
gönderiyor → dönen yaklaşık lat/lng haritaya pin olarak konuyor. İki bağımsız hata kaynağı var:
(1) kullanıcının yazdığı metin TKGM'nin resmi mahalle adıyla birebir eşleşmeyebilir (kullanıcı
hatası), (2) Nominatim'in kendi adres indeksi TKGM'nin idari sınırlarıyla bağımsız bir kaynak —
ikisi arasında sistemik bir tutarsızlık payı var (bizim kontrolümüzde olmayan hata kaynağı).

## Araştırma bulgusu: TKGM'nin gerçek idari yapı API'si

TKGM'nin kendi genel parsel sorgu sitesi (`parselsorgu.tkgm.gov.tr`, "İdari Sorgu" sekmesi)
il→ilçe→mahalle basamaklı dropdown'larını CORS'a açık (`Access-Control-Allow-Origin: *`),
kimliksiz üç uç noktadan besliyor (bu oturumda canlı doğrulandı):

| Uç nokta | Döndürdüğü |
|---|---|
| `GET {TKGM_BASE}/idariYapi/ilListe` | Tüm 81 il: GeoJSON `FeatureCollection`, her `feature.properties = { id: number, text: string }` |
| `GET {TKGM_BASE}/idariYapi/ilceListe/{ilId}` | Seçilen ilin ilçeleri, aynı `{id, text}` şekli |
| `GET {TKGM_BASE}/idariYapi/mahalleListe/{ilceId}` | Seçilen ilçenin mahalleleri, aynı `{id, text}` + **her mahallenin gerçek sınır poligonu** (`geometry`) |

`id` alanları TKGM'nin kendi iç numaralandırması (il plaka kodu DEĞİL — ör. Adana`id=23`,
Aksaray `id=90`) — `fetchParcelByPoint`'in kullandığı nokta-tabanlı sorguyla doğrudan ilişkisi
yok, yalnızca bu üç uç nokta arasında zincirleme (`ilId` → ilçeListe, `ilceId` → mahalleListe)
için kullanılıyor. Bu kapsam dışında hiçbir yerde saklanmaz/kullanılmaz.

## Kapsam

`ManualParcelEntryForm`daki İl/İlçe/Mahalle serbest-metin alanlarının, TKGM'nin bu üç
uç noktasından beslenen **basamaklı otomatik-tamamlama** alanlarına dönüştürülmesi — kullanıcı
birkaç harf yazınca eşleşen TKGM kayıtları listelenir, kullanıcı listeden seçer (serbest metin
girişi TKGM'ye hiç ulaşmaz). Mahalle seçildiğinde, TKGM'nin döndürdüğü gerçek sınır
poligonundan bir merkez nokta hesaplanıp **doğrudan** haritayı o noktaya taşımak için
kullanılır — bugünkü Nominatim adres araması bu durumda devre dışı kalır (il+ilçe seçili ama
mahalle boşsa, mevcut Nominatim yol kalır — geriye dönük uyumlu, kapsam daraltılmıyor).

**Kapsam dışı:** Ada/Parsel alanları (TKGM'nin bunlar için bir enumerasyon ucu yok, serbest
metin kalır — mevcut `fetchParcelByPoint` zaten nokta-tabanlı). Harita modu, TKGM parsel
doğrulama (`fetchParcelByPoint`), risk sorgusu — hiçbiri değişmiyor.

## Mimari

### Sunucu tarafı (yeni)

Mevcut kural aynen korunuyor: TKGM yalnızca sunucudan çağrılır (CORS açık olsa da — kullanıcı
IP'sinin bir devlet servisine açılmaması ve kendi rate-limit kontrolümüz için, bkz.
`src/lib/tkgm/parcel.ts`'in kendi üstteki yorumu).

**`src/lib/tkgm/idariYapi.ts`** (yeni dosya, `parcel.ts`'e paralel):

```ts
export type IdariYapiItem = { id: number; text: string }
export type MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }

export async function fetchIlListesi(): Promise<IdariYapiItem[]>
export async function fetchIlceListesi(ilId: number): Promise<IdariYapiItem[]>
export async function fetchMahalleListesi(ilceId: number): Promise<MahalleItem[]>
```

- Her fonksiyon `{TKGM_BASE}/idariYapi/...` çağırır, GeoJSON `features[].properties`'i
  `{id, text}`'e indirger (poligon geometrisi il/ilçe seviyesinde İSTEMCİYE HİÇ gönderilmez).
- `fetchMahalleListesi`, her feature'ın `geometry.coordinates`'ini düzleştirip (Polygon VEYA
  MultiPolygon — ikisi de düzleştirilerek tüm köşe noktaları tek listede toplanır) basit
  aritmetik ortalamayla bir yaklaşık merkez (`centroid`) hesaplar. Bu **alan-ağırlıklı gerçek
  centroid DEĞİL** — haritayı kabaca doğru mahalleye ortalamak için yeterli bir yaklaşıklık
  (kullanıcı zaten pini haritada ince ayarlıyor, mevcut akışla aynı ilke). Geometri
  bulunamazsa/parse edilemezse `centroid: null` döner, çağıran taraf bugünkü Nominatim yoluna
  düşer (sessiz veri kaybı yerine açık fallback).
- Ağ hatası / TKGM 4xx-5xx → boş dizi `[]` döner (mevcut `fetchParcelByPoint`'in `unavailable`
  desenine benzer şekilde sessizce boş liste; otomatik-tamamlama alanı "sonuç yok" gösterir,
  sayfa çökmez).
- `TIMEOUT_MS = 8000` (parcel.ts ile aynı sabit, `AbortController` ile).

**Yeni API route'ları** (`parcel/lookup/route.ts`'teki desenle birebir — session/anon rate
limit ayrımı, `getClientIp`):

| Route | Metod | Parametre | Rate limit (yeni `RATE_LIMITS` girdisi) |
|---|---|---|---|
| `src/app/api/tkgm/il/route.ts` | GET | — | `TKGM_IDARI_YAPI` / `TKGM_IDARI_YAPI_ANON` |
| `src/app/api/tkgm/ilce/route.ts` | GET | `?ilId=` (sayı, zorunlu) | aynı |
| `src/app/api/tkgm/mahalle/route.ts` | GET | `?ilceId=` (sayı, zorunlu) | aynı |

`ilId`/`ilceId` sayıya çevrilemezse `400`. `RATE_LIMITS`'e eklenecek:
```ts
TKGM_IDARI_YAPI: { limit: 30, windowMs: 60_000 },      // kullanıcı başına 30/dk
TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60_000 }, // IP başına 10/dk
```
(`PARCEL_LOOKUP`/`PARCEL_LOOKUP_ANON` ile aynı büyüklük mertebesi — bu uçlar da TKGM'ye gidiyor.)

**Önbellekleme:** İl listesi pratikte hiç değişmiyor, ilçe/mahalle listeleri de gün içinde
değişmez. Next.js'in kendi `fetch` önbelleğinden yararlanılır:
`fetch(url, { next: { revalidate: 86400 } })` (24 saat) — ayrı bir önbellek katmanı
(Redis/Map) İCAT EDİLMİYOR, mevcut altyapı yeterli ve YAGNI'ye uygun.

### İstemci tarafı

**Yeni paylaşılan bileşen: `src/components/listing-wizard/TkgmAutocompleteField.tsx`**

İl/İlçe/Mahalle'nin ÜÇÜ DE aynı bileşeni kullanır (yalnızca `items`/`onSelect`/`disabled`
farklı) — kod tekrarı yerine tek, test edilmiş bir combobox:

```ts
interface Props {
    id: string
    label: string
    required?: boolean
    items: IdariYapiItem[]      // üst bileşen zaten fetch etti, bu bileşen yalnızca filtreler
    value: string               // gösterilen metin (serbest yazılabilir, ama seçim zorunlu)
    onInputChange: (text: string) => void
    onSelect: (item: IdariYapiItem) => void
    disabled?: boolean
    placeholder?: string
}
```

- Kullanıcı yazdıkça `items` Türkçe-duyarlı büyük/küçük harf normalizasyonuyla
  (`.toLocaleLowerCase('tr')` — düz `.toLowerCase()` "İ"/"I" için YANLIŞ sonuç verir, bilinen
  bir JS/Türkçe tuzağı) alt-dize eşleşmesine göre filtrelenir, açılır bir liste (`<ul role="listbox">`)
  gösterilir (en fazla 8 sonuç, taşan liste kendi içinde `overflow-y:auto`).
  Filtreleme İSTEMCİDE yapılır (her seviyenin listesi zaten bir kerede çekildi) — sunucuya
  tuş başına istek YOK.
- Klavye: yukarı/aşağı ok gezinme, `Enter` seçili öğeyi uygular, `Escape` listeyi kapatır.
  Fare: bir öğeye tıklamak seçer.
- Bir öğe seçilince `onSelect(item)` çağrılır; üst bileşen bunu state'e yazar VE (İl/İlçe için)
  bir sonraki seviyenin listesini fetch eder.
- Kullanıcı seçim yapmadan başka bir alana geçerse (`onBlur`), girilen serbest metin YOK
  SAYILIR değil — TKGM listesinde tam metin eşleşmesi varsa otomatik o öğe seçilir (kullanıcı
  tam doğru yazıp Enter'a basmayı unutabilir); yoksa alan boşa döner ve bir sonraki seviye
  devre dışı kalır. Bu, "serbest metin asla TKGM'ye ulaşmaz" ilkesini blur durumunda da korur.

**`ManualParcelEntryForm.tsx` değişiklikleri:**

- `il`/`ilce`/`mahalle` `useState<string>` yerine `useState<IdariYapiItem | null>` (seçilen
  TKGM kaydı — id dahil). Serbest metin artık bir state değil, `TkgmAutocompleteField`'ın
  kendi iç görüntü state'i.
- Mount olduğunda `fetchIlListesi` sonucu bir kere çekilir (`useEffect([], ...)`), `il`
  seçilince o ilin `ilceListesi`si (`ilId`) çekilir, `ilce` seçilince o ilçenin
  `mahalleListesi`si (`ilceId`, **centroid dahil**) çekilir. Her fetch kendi `useState` içinde
  (`ilOptions`, `ilceOptions`, `mahalleOptions`), yükleniyor/hata durumları mevcut
  `searching`/`error` desenine benzer ayrı bayraklarla (`ilceLoading`, `mahalleLoading`)
  yönetilir.
- İl değişirse ilçe VE mahalle seçimleri sıfırlanır (kademeli — tutarsız bir "Ankara ili,
  Muratlı ilçesi" gibi çapraz seçim state'te asla oluşmaz). İlçe değişirse mahalle sıfırlanır.
- `handleSearch` (buton adı "Sorgula" aynen kalır) mantığı:
  1. Mahalle seçiliyse VE `centroid !== null` → Nominatim'e HİÇ gidilmez, doğrudan
     `onLocationFound(centroid.lat, centroid.lng, { il: il.text, ilce: ilce.text, mahalle:
     mahalle.text, ada, parsel })`.
  2. Mahalle seçili değilse (veya centroid `null` döndüyse) → bugünkü Nominatim akışı, ama
     artık `il.text`/`ilce.text` TKGM'nin kendi resmi yazımı olduğu için (kullanıcı asla
     serbest yazmadı) sorgu isabeti bugünkünden daha güvenilir.
- `canSearch`: `il !== null && ilce !== null && !searching` (bugünkü `.trim() !== ''`
  kontrolünün seçilmiş-öğe karşılığı).

## Test ve doğrulama yaklaşımı

1. **TDD, RED→GREEN.** `TkgmAutocompleteField.test.tsx` (yeni, izole: filtreleme, Türkçe
   büyük/küçük harf, klavye gezinme, blur-tam-eşleşme davranışı) + `ManualParcelEntryForm.test.tsx`
   güncellenir (bugünkü serbest-metin testleri seçim-tabanlı hale gelir) + `idariYapi.test.ts`
   (yeni — `parcel.test.ts`'teki `fetch` mock desenini izler: başarı, 404/5xx, ağ hatası,
   centroid hesaplama — Polygon VE MultiPolygon için ayrı test, geometri eksikse `null`).
2. **API route testleri** (`src/app/api/tkgm/*/route.test.ts`) mevcut
   `src/app/api/parcel/lookup/__tests__/route.test.ts` desenini izler: rate-limit, eksik/geçersiz
   parametre → 400, başarı → 200.
3. **Canlı doğrulama zorunlu** (bu oturumun tekrar eden dersi): gerçek TKGM uçlarına karşı en
   az bir manuel Playwright kontrolü — bir il seçilince ilçe listesinin gerçekten dolduğunu,
   bir mahalle seçilince "Sorgula"nın haritayı merkeze GERÇEKTEN o mahalleye taşıdığını
   (Nominatim'e hiç gitmeden, network sekmesinde doğrulanarak) kanıtla.
4. **Türkçe casing regresyon testi zorunlu.** "ı" yazınca "İstanbul" eşleşmemeli (İ≠I/ı
   farkı) ama "ist" yazınca "İstanbul" eşleşmeli — `.toLocaleLowerCase('tr')` kullanılmazsa bu
   test kırılır, bilinçli seçilen bu yaklaşımı sabitler.

## Dosya değişiklikleri (özet)

| Dosya | İşlem |
|---|---|
| `src/lib/tkgm/idariYapi.ts` | **Yeni** |
| `src/lib/tkgm/idariYapi.test.ts` | **Yeni** |
| `src/lib/rate-limit.ts` | `TKGM_IDARI_YAPI` / `TKGM_IDARI_YAPI_ANON` eklenir |
| `src/app/api/tkgm/il/route.ts` | **Yeni** |
| `src/app/api/tkgm/ilce/route.ts` | **Yeni** |
| `src/app/api/tkgm/mahalle/route.ts` | **Yeni** |
| İlgili `route.test.ts` dosyaları | **Yeni** (3 adet) |
| `src/components/listing-wizard/TkgmAutocompleteField.tsx` | **Yeni** |
| `src/components/listing-wizard/TkgmAutocompleteField.module.css` | **Yeni** |
| `src/components/listing-wizard/TkgmAutocompleteField.test.tsx` | **Yeni** |
| `src/components/listing-wizard/ManualParcelEntryForm.tsx` | Serbest metin → autocomplete alanlarına geçiş |
| `src/components/listing-wizard/ManualParcelEntryForm.test.tsx` | Güncellenir |
| `src/components/listing-wizard/ManualParcelEntryForm.module.css` | Autocomplete açılır listesi için stil eklenir |

## Açık bırakılan (bilinçli) kararlar

- Centroid hesaplaması alan-ağırlıklı gerçek bir centroid DEĞİL, basit köşe-ortalaması — harita
  merkezleme amacı için yeterli, `turf.js` gibi yeni bir bağımlılık eklemeye değmez (YAGNI).
- Mahalle listesi bazı büyükşehir ilçelerinde büyük olabilir (yüzlerce mahalle) — yine de tek
  seferde çekilip istemcide filtrelenir; sunucu-taraflı arama ucu (ör. `?q=`) eklenmez çünkü
  liste boyutu (~KB mertebesinde metin, geometri sunucuda ayıklandığı için) bunu gerektirmiyor.
- `il`/`ilce`/`mahalle` TKGM `id`'leri yalnızca bu akış içinde, bir sonraki seviyeyi çekmek için
  kullanılır — veritabanına/ilan kaydına YAZILMAZ (bugünkü gibi yalnızca `il`/`ilce`/`mahalle`
  metinleri `ManualParcelReference` üzerinden akar, şema değişmiyor).
