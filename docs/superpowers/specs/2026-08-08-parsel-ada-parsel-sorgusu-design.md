# Ada/Parsel ile Gerçek TKGM Sorgusu — Tasarım

**Tarih:** 2026-08-08
**Durum:** Onaylandı (brainstorming), implementasyon planı bekliyor.

## Problem

`ManualParcelEntryForm`'daki (paylaşılan bileşen, `ParcelVerificationSheet` üzerinden hem `/hesapla` hem ilan
sihirbazı `WizardStep1Location`'da kullanılıyor) **ada/parsel alanları dekoratif** — kullanıcı tapu/senetten
ada/parsel numarasını girse bile bu değerler hiçbir TKGM endpoint'ine gönderilmiyor. "Sorgula" butonu yalnızca
seçilen mahalle/ilçenin merkez noktasına (centroid) ya da (centroid yoksa) Nominatim adres aramasına gidiyor,
ardından kullanıcıyı haritaya bırakıyor — doğru ada/parsel numarasını girmiş olsa bile kullanıcı hangi
poligonun kendi parseli olduğunu görsel olarak bulup elle tıklamak zorunda.

Bu, 2026-07-29'dan beri hafızada "TKGM ada/parsel uç noktası `mahalleId` istiyor, ayrı araştırma gerekiyor"
notuyla bekleyen bir kalemdi. `mahalleId` ihtiyacı aradan geçen sürede `/api/tkgm/mahalle` (il/ilçe/mahalle
kademeli arama) ile zaten çözülmüş durumda; geriye kalan tek eksik gerçek ada/parsel endpoint'inin şeklini
bulmaktı.

## Teknik doğrulama (bu oturumda canlı TKGM API'sine karşı yapıldı)

`GET {TKGM_BASE}/parsel/{mahalleId}/{ada}/{parsel}` gerçek, çalışan bir endpoint. Round-trip ile doğrulandı:
İstanbul (id 56) → Kadıköy (id 521) → Göztepe (mahalleId 147964) altında, nokta-tabanlı sorgu (`/parsel/{lat}/{lng}`)
ile bulunan gerçek bir parsel (Ada 398, Parsel 19) aynı mahalleId + ada + parsel ile geri sorgulandığında
**birebir aynı GeoJSON Feature'ı** (aynı `properties`, aynı `geometry.type: Polygon`) döndü. Bulunamayan
kombinasyonlar için `404` + `{"Message":"Parsel Bulunamadı: Mahalle Id = ... - Ada = ... - Parsel = ..."}`
dönüyor — mevcut `fetchParcelByPoint`'in 404 işleme deseniyle birebir aynı şekilde ele alınabilir.

Önemli detay: ada/parsel sorgusunun `alan` alanı **virgüllü** format kullanıyor (`"965,85"`), nokta-tabanlı
sorgununki **noktalı** (`"965.85"`). Mevcut `parseTkgmArea` (`src/lib/tkgm/parcel.ts`) bu ayrımı zaten
öngörüp iki formatı da destekliyor (kod içi yorum bunu daha önceden not düşmüş) — **hiçbir değişiklik
gerekmiyor**, `toParcelInfo` aynen yeniden kullanılabilir.

## Karar: Mevcut "Elle Gir" akışını gerçek veriye bağla — yeni sayfa/bileşen yok

Yeni bir "parsel sorgu ekranı" inşa etmek yerine, mevcut `ManualParcelEntryForm` → `ParcelVerificationSheet`
akışını gerçekten çalışır hale getiriyoruz. `ParcelVerificationSheet` paylaşılan bir bileşen olduğu için bu
değişiklik hem `/hesapla` hem ilan sihirbazını aynı anda kazanır.

**Akış (mahalle + ada + parsel doluyken):**
1. Kullanıcı "Elle Gir" modunda il/ilçe/mahalle seçer (mevcut TKGM doğrulamalı autocomplete) ve ada/parsel
   numaralarını girer.
2. "Sorgula"ya basınca, mahalle gerçek bir TKGM öğesiyse (`.id` mevcut) VE ada/parsel doluysa, **önce** yeni
   ada/parsel-exact endpoint'i denenir.
3. Eşleşme bulunursa: parselin gerçek poligonundan hesaplanan bir temsili nokta (centroid) + tam `ParcelInfo`
   üst bileşene iletilir, `parcelValue` doğrudan `status: 'verified'` yapılır. Kullanıcı haritaya hiç
   dokunmadan zaten var olan "doğrulandı" UI'ını (parsel sınırı çizimi, özet kart) görür.
4. Eşleşme bulunamazsa (404) ya da mahalle/ada/parsel eksikse: **sessizce** bugünkü davranışa (centroid/Nominatim
   yaklaşık konum, harita moduna dönüp elle onay) düşülür — kullanıcı kararı: hata gösterilmez, mevcut akış
   hiç bozulmaz.

### Reddedilen alternatif

- **Bağımsız, yeni bir "parsel sorgu ekranı" sayfası:** Kullanıcı tercihiyle reddedildi — mevcut akışı
  çalıştırmak hem daha az kapsam hem paylaşılan bileşen sayesinde iki giriş noktasını (hesapla + ilan) aynı
  anda kazanıyor, yeni bir keşif/navigasyon sorunu (BottomNavbar/QuickActionGrid'e yeni giriş noktası) yaratmıyor.
- **Eşleşmezse kullanıcıya bilgi notu göstermek:** Kullanıcı kararıyla reddedildi — sessiz fallback tercih
  edildi, yanlış/eksik ada-parsel girişi bugünkünden farksız bir deneyim üretir.

## Mimari

1. **`src/lib/tkgm/parcel.ts`** — yeni `fetchParcelByAdaParsel(mahalleId: number, ada: string, parsel: string): Promise<ParcelLookupResult>`.
   Mevcut `fetchParcelByPoint` ile aynı fetch/timeout/404/`toParcelInfo` mantığını paylaşır (ortak bir
   `fetchAndParseParcel(url)` yardımcısına çıkarılabilir — küçük, dar kapsamlı bir dedup).
2. **Yeni route `src/app/api/parcel/lookup-by-ada-parsel/route.ts`** — mevcut `src/app/api/parcel/lookup/route.ts`
   ile birebir aynı auth/rate-limit deseni (`getServerSession`, `RATE_LIMITS.PARCEL_LOOKUP`/`_ANON`, oturum
   varsa `parcel:{userId}`, yoksa `parcel:ip:{ip}`). Query param'lar: `mahalleId`, `ada`, `parsel`. `mahalleId`
   pozitif tam sayı değilse 400.
3. **Paylaşılan `polygonCentroid` yardımcı fonksiyonu** — `src/lib/tkgm/idariYapi.ts`'teki `computeCentroid`
   mantığının (poligon köşelerinin düz aritmetik ortalaması) çıkarılmış hali; hem admin-sınır centroid'i hem
   bu yeni parsel-poligon centroid'i tarafından paylaşılır. Konum: `src/lib/geo/` altına (mevcut
   `turkeyBounds.ts` ile aynı dizin).
4. **`ManualParcelEntryForm.tsx`** — `handleSearch` içine, mevcut centroid/Nominatim mantığından ÖNCE, yeni bir
   dal: `if (mahalle && ada.trim() && parsel.trim())` → `fetchParcelByAdaParsel` çağrısı (yeni route üzerinden).
   Başarılıysa `onLocationFound` çağrısına 4. parametre olarak `ParcelInfo` eklenir. `onLocationFound`
   imzası: `(lat: number, lng: number, reference: ManualParcelReference, exactParcel?: ParcelInfo) => void`.
5. **`ParcelVerificationSheet.tsx`** — `handleManualFound`, `exactParcel` parametresi verildiğinde
   `setParcelValue(v => ({ ...v, lat, lng, parcel: exactParcel, status: 'verified' }))` yapar (bugünkü
   `status: 'idle', parcel: null` yerine). Mode yine `'map'`e döner — `ParcelPicker`'ın zaten var olan
   "doğrulanan parselin sınırını çiz" efekti (`value.parcel`'e bağlı) ve `isVerifiedCompact` mobil özet kartı
   otomatik devreye girer. **Yeni UI bileşeni/durumu eklenmiyor.**

## Veri akışı özeti

```
ManualParcelEntryForm (mahalle+ada+parsel dolu)
  → GET /api/parcel/lookup-by-ada-parsel?mahalleId&ada&parsel
    → fetchParcelByAdaParsel → TKGM /parsel/{mahalleId}/{ada}/{parsel}
      → 200: ParcelInfo (gerçek poligon)  →  polygonCentroid(geometry) → onLocationFound(lat,lng,ref,parcelInfo)
      → 404/hata: onLocationFound içine exactParcel geçilmez → mevcut centroid/Nominatim dalı çalışır (değişmedi)
→ ParcelVerificationSheet.handleManualFound
  → exactParcel varsa: parcelValue = {lat,lng,parcel:exactParcel,status:'verified'}  (map moduna döner, poligon çizilir)
  → exactParcel yoksa: parcelValue = {lat,lng,status:'idle',parcel:null}  (bugünkü davranış, kullanıcı elle onaylar)
```

## Kenar durumlar

- **Ada/parsel boş, sadece il/ilçe/mahalle dolu:** Yeni dal hiç tetiklenmez, bugünkü davranış birebir korunur.
- **Mahalle metni yazıldı ama TKGM listesinden gerçekten seçilmedi (`mahalle === null`):** Yeni dal
  tetiklenmez (spec ilkesi zaten korunuyor: serbest metin asla TKGM'ye ulaşmadan sızmaz).
  `ManualParcelEntryForm`'un mevcut invaryantı (`mahalle?.text` yerine yalnızca gerçek seçim) burada da geçerli.
- **Rate limit (429):** Yeni route aynı `RATE_LIMITS.PARCEL_LOOKUP*` sabitlerini kullanır; 429 durumunda
  `ManualParcelEntryForm` sessizce fallback'e düşer (ayrıca bir hata metni EKLENMİYOR — kullanıcı kararına
  uygun, tutarlı sessiz-fallback ilkesi rate limit için de geçerli).
- **401 (oturum yoksa):** Mevcut `/api/parcel/lookup` route'unda kod hiçbir yerde 401 döndürmüyor (session
  yalnızca rate-limit tier'ı için opsiyonel okunuyor) — yeni route da aynı deseni izler, giriş yapmamış
  kullanıcı da (daha sıkı rate limit ile) ada/parsel sorgusu yapabilir. `ParcelPicker.handleVerify`'daki 401
  kontrolü bu route'u etkilemez (ayrı, ilgisiz bir kod yolu).
- **Poligonun ilk halkası bozuk/eksik (`geometry.coordinates[0]` yok/çok kısa):** `polygonCentroid` `null`
  döner; bu durumda `exactParcel` iletilmez, mevcut fallback'e düşülür (ParcelPicker'ın kendi poligon-çizim
  efektinde zaten var olan aynı savunma deseni tekrarlanır).

## Test etkisi

- `fetchParcelByAdaParsel` için birim test (mock `fetch`): 200 + geçerli GeoJSON → `ParcelInfo`, 404 →
  `not_found`, ağ hatası/timeout → `unavailable`, virgüllü `alan` formatının doğru parse edildiği regresyon
  testi.
- Yeni route testi: mevcut `src/app/api/parcel/lookup/__tests__/route.test.ts`'in ada/parsel varyantı (auth
  farklarında rate-limit tier seçimi, 400 geçersiz `mahalleId`, 429 rate limit).
- `polygonCentroid` için birim test (basit kare/dörtgen poligon → beklenen ortalama; boş/eksik halka → `null`).
- `ManualParcelEntryForm.test.tsx`: mahalle+ada+parsel doluyken exact endpoint'in önce denendiği,
  başarılıysa `onLocationFound`'un 4. parametreyle çağrıldığı, 404/hata durumunda mevcut centroid/Nominatim
  dalına sessizce düşüldüğü (yeni hata UI'ı YOK) senaryoları.
- `ParcelVerificationSheet.test.tsx`: `exactParcel` ile çağrılan `handleManualFound`'un `parcelValue.status`'u
  doğrudan `'verified'` yaptığı, `exactParcel` olmadan bugünkü `'idle'` davranışının korunduğu.

## Doğrulama

- Mekanik: `npx tsc --noEmit` + tam jest suite yeşil.
- Canlı (Playwright, gerçek TKGM API'sine karşı — mock değil, çünkü asıl risk gerçek servisin davranışı):
  1. `/hesapla` → Elle Gir → gerçek bir il/ilçe/mahalle + doğru ada/parsel (bu oturumda doğrulanan
     İstanbul/Kadıköy/Göztepe/398/19 kullanılabilir) → Sorgula → harita moduna dönmeden/dönerek doğrudan
     "TKGM kaydıyla eşleşti" özet kartı görünüyor, parsel sınırı çizili.
  2. Aynı akış yanlış bir ada/parsel ile (ör. 1/1) → sessizce mahalle merkezine düşülüyor, hata metni YOK,
     kullanıcı haritadan elle onaylayabiliyor (bugünkü davranış).
  3. İlan sihirbazı (`WizardStep1Location`) üzerinden aynı iki senaryo tekrarlanıyor (paylaşılan bileşen
     doğrulaması).
