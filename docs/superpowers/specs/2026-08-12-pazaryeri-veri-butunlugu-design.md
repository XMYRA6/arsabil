# Pazar Yeri Veri Bütünlüğü ve Filtre Düzeltmeleri

**Tarih:** 2026-08-12
**Durum:** Onaylandı

## Bağlam

Sistematik bir gap taraması (Explore agent, read-only) pazar yeri/harita özelliğinde 5 gerçek defekt buldu — daha önce yalnızca kullanıcının işaret ettiği bulgular (örn. `ListingCard`'ın `photoUrl` yerine `photos[]` okuması gerektiği) düzeltilmişti, feature'ın tamamı hiç sistematik taranmamıştı.

Bulguların kök nedeni ortak: `marketplace/page.tsx`, `FilterSidebar`, `ListingCard` bazı alanları (`type`, `imarDurumu`, `minEmsal`/`maxEmsal`) Prisma şemasında hiç var olmayan veya sihirbazın yazdığı gerçek alanla (`zoning`) uyuşmayan varsayımlarla okuyor/filtreliyor. Sonuç: bazı filtreler sessizce hiçbir şey yapmıyor, bazı UI dallanmaları (Satış vs Kat Karşılığı) gerçek veriyle asla tetiklenemiyor.

## Kapsam

Altı düzeltme, hepsi mevcut `marketplace`/`listing-wizard` alt sistemine dokunuyor:

1. `type` alanı — gerçek şema alanı ekleniyor
2. Emsal filtresi — kaldırılıyor (backing alan hiç yok)
3. Boyut filtresi (`minSize`/`maxSize`) — gerçek `landSizeSqm`'e bağlanıyor
4. İmar Durumu filtresi/gösterimi — gerçek `zoning` alanına ve enum'una hizalanıyor
5. "En Yeniler" sıralaması — gerçek `createdAt`'e bağlanıyor
6. `CitySearch` il/ilçe state bug'ı — ilçe seçince il bilgisinin kaybolması düzeltiliyor

**Kapsam dışı:** `fizibiliteSkoru`, `arsaPayiMin/Max`, `changePercent` — bunlar zaten `demoBanner` ile açıkça "örnek veri" olarak işaretli; gerçek veri toplama/hesaplama ayrı, çok daha büyük bir iştir ve bu spec'in konusu değildir.

## 1) `type` alanı — gerçek şema alanı

**Problem:** `prisma/schema.prisma`'daki `Listing` modelinde `type` alanı yok. Sihirbaz onu hiç toplamıyor, `publishBody.ts`/POST/PATCH route'ları hiç yazmıyor. Ama `marketplace/page.tsx:105` `type: (l.type ?? 'KAT_KARSILIGI') as Listing['type']` yapıyor — `l.type` gerçek verilerde her zaman `undefined` olduğundan **her gerçek ilan sessizce `'KAT_KARSILIGI'`'ye zorlanıyor**. Sonuç: "Satış" filtresi gerçek ilanlarda hep boş döner; `MapView`/`ListingCard`'ın `type === 'SALE'` dallanmaları (fiyat mı arsa payı % mi gösterileceği) hiç tetiklenemez.

**Çözüm:**
- `prisma/schema.prisma`: `Listing` modeline `type String @default("KAT_KARSILIGI")` eklenir; migration (`prisma migrate dev`).
- `listing-wizard/types.ts`: `WizardFormData.type: string`, `emptyFormData.type = 'KAT_KARSILIGI'`.
- `WizardStep2Detail.tsx`: "İmar Durumu" alanının yanına yeni bir select — **"İlan Türü"** — seçenekler: Satış (`SALE`) / Kat Karşılığı (`KAT_KARSILIGI`) / Ortaklık (`ORTAKLIK`), varsayılan `KAT_KARSILIGI`.
- `publishBody.ts`: gövdeye `type: form.type` eklenir.
- POST `/api/listings` (`route.ts`) ve PATCH `/api/listings/[id]` (`route.ts`): `type` alanı gövdeden okunup `prisma.listing.create`/`update`'e yazılır (mevcut `zoning`/`titleDeed` desenini takip eder).
- `marketplace/page.tsx:105`: `type: (l.type ?? 'KAT_KARSILIGI') as Listing['type']` satırındaki zorlama kaldırılır — DB'den gelen gerçek değer olduğu gibi kullanılır (yalnızca DB `default` değeri zaten `KAT_KARSILIGI` olduğundan eski kayıtlar da doğru davranır).
- `listing/[id]/edit/page.tsx`: mevcut `landSizeSqm`/`zoning` gibi alanlarla aynı desende `type` de forma yüklenir ve PATCH gövdesine eklenir.

## 2) Emsal filtresi — kaldırılıyor

**Problem:** `minEmsal`/`maxEmsal` (`FilterSidebar`, `page.tsx` üst bar çipi, `DEFAULT_FILTERS`) hiçbir şemada karşılığı olmayan bir alanı filtreliyormuş gibi davranıyor — `listing/[id]/page.tsx:255`'teki kod yorumu bunu zaten "Prisma şemasında HİÇ yok" diye doğruluyor. Kullanıcı ne girerse girsin sonuç değişmiyor, hiçbir uyarı da yok.

**Çözüm:** UI'dan tamamen kaldırılır:
- `FilterSidebar.tsx`: EMSAL bölümü (başlık + iki input) silinir; `Filters` interface'inden `minEmsal`/`maxEmsal` çıkarılır; `resetAll()`'dan da çıkarılır.
- `page.tsx`: üst bardaki "Emsal: X–Y" çipi (`styles.emsalChip` render bloğu) ve `DEFAULT_FILTERS.minEmsal`/`maxEmsal` silinir.
- `page.module.css`: kullanılmayan `.emsalChip` kuralı(ları) — hem base hem mobil media query içindeki — silinir (importer'ı kalmadığı grep ile doğrulanır).
- `FilterSidebar.test.tsx` (mobile altında) bu alanları artık göndermeyecek şekilde güncellenir.

## 3) Boyut filtresi — gerçek veriyle bağlanıyor

**Problem:** `FilterSidebar`'da `minSize`/`maxSize` girdileri var, üstte gerçek bir backing alan (`Listing.landSizeSqm`) da var — ama `page.tsx:145-150`'deki `filtered` predicate'i bunlara hiç bakmıyor.

**Çözüm:** `filtered` predicate'ine eklenir:
```
if (l.landSizeSqm != null && (l.landSizeSqm < filters.minSize || l.landSizeSqm > filters.maxSize)) return false;
```
`landSizeSqm` alanı `null`/`undefined` olan ilanlar (henüz veri girilmemiş) filtrelemeden geçirilir — eksik veri kullanıcıyı yanlış şekilde cezalandırmasın diye.

`Listing` interface'ine (`ListingCard.tsx`) `landSizeSqm?: number | null` eklenir (şu an yok — API'den geliyor ama tipte tanımlı değil).

## 4) İmar Durumu — gerçek `zoning` alanına hizalanıyor

**Problem:** İki paralel, uyumsuz enum var:
- Sihirbazın gerçek `zoning` alanı (`WizardStep2Detail.tsx`, DB'de persist): `KONUT / TICARI / KARMA / TARIM`
- `FilterSidebar`'ın filtrelediği `imarDurumu` (yalnızca `MOCK_LISTINGS_EXTRA` overlay'inden gelen, DB'de hiç yok): `KONUT / TICARET / KONUT_TICARET / DIGER`

Satıcının gerçekten seçtiği ve DB'ye kaydedilen imar durumu hiçbir yerde geri okunmuyor; onun yerine her zaman mock overlay'in ürettiği sahte değer gösteriliyor/filtreleniyor.

**Çözüm:** Tek enum'a — gerçek `zoning`'e — hizalanır:
- `FilterSidebar.tsx`: `IMAR_OPTS`/`IMAR_VALS` → `['Konut','Ticari','Karma','Tarım']` / `['KONUT','TICARI','KARMA','TARIM']`. `Filters.imar` alanı artık bu değerlerle dolar.
- `page.tsx`: `filtered` predicate'i `l.imarDurumu` yerine `l.zoning`'e bakar: `if (filters.imar.length > 0 && !filters.imar.includes(l.zoning ?? '')) return false;`
- `ListingCard.tsx`: `IMAR_LABEL` aynı enum'a güncellenir (`KONUT: 'Konut', TICARI: 'Ticari', KARMA: 'Karma', TARIM: 'Tarım'`); kart gösterimi `listing.imarDurumu` yerine `listing.zoning` okur. `Listing` interface'inde `imarDurumu?: string` → `zoning?: string` olarak değişir.
- `MOCK_LISTINGS_EXTRA` (`page.tsx`) ve tam-mock listing üretimi: `imarDurumu: 'KONUT_TICARET'` gibi değerler yerine gerçek enum'dan (`KONUT/TICARI/KARMA/TARIM`) değerler üretir — hem gerçek hem mock ilanlar artık aynı alan/enum'u kullanır, tutarlı davranır.
- `listing/[id]/page.tsx`: aynı şekilde `imarDurumu` → `zoning` referansına geçer; satır 255'teki "Prisma şemasında hiç yok" yorumu güncellenir (artık `zoning` gerçek, yalnızca `emsal`/`arsaPayi` için geçerli kalır).

## 5) "En Yeniler" sıralaması

**Problem:** `page.tsx:156`: `if (sortBy === 'newest') return 0; // Would use createdAt` — dropdown'da gerçek bir seçenek olarak sunuluyor ama hiçbir şey yapmıyor.

**Çözüm:**
```
if (sortBy === 'newest') return (new Date(b.createdAt ?? 0).getTime()) - (new Date(a.createdAt ?? 0).getTime());
```
`Listing` interface'ine `createdAt?: string` eklenir (API zaten `orderBy: { createdAt: 'desc' }` ile dönüyor ve Prisma bunu ISO string olarak serialize eder).

## 6) CitySearch il/ilçe state bug'ı

**Problem:** `CitySearch.tsx:195`: `const districts = DISTRICTS[selectedCity] || []` — `selectedCity` prop hem il hem ilçe seçiminde `city.name`'e set ediliyor (`marketplace/page.tsx:174`). Bir ilçe seçildiğinde `selectedCity` o ilçenin adı olur, `DISTRICTS` yalnızca il adlarıyla anahtarlandığından `districts` boşalır → "İlçe ▾" butonu kayboluyor, `showProvinceBorder(district.name)` da eşleşen bir il sınırı bulamıyor.

**Çözüm:** `CitySearch` kendi içinde ilin kimliğini ayrı bir state'te (`provinceName`) tutar, yalnızca bir **il** seçildiğinde günceller (ilçe seçiminde değişmez):
- `onCitySelect` callback tipine opsiyonel `province?: string` eklenir: `(city: { name: string; lat: number; lng: number; zoom: number; province?: string }) => void`.
- İl satırına tıklanınca: `onCitySelect(city)` (province alanı yok/kendi adı — il seçiminde province = seçilen ilin kendisi).
- İlçe satırına tıklanınca: `onCitySelect({ name: d.name, lat: d.lat, lng: d.lng, zoom: d.zoom, province: provinceName })`.
- `districts` artık `DISTRICTS[provinceName] || []` üzerinden hesaplanır, `selectedCity` prop'undan değil.
- `marketplace/page.tsx`'teki `onCitySelect` handler'ı: `mapRef.current?.showProvinceBorder(city.province ?? city.name)` çağırır; `setSelectedCity(city.name)` aynı kalır (badge/görünen isim hâlâ son seçilen il/ilçe).

## Test Yaklaşımı

Her madde TDD ile (RED → GREEN → commit), plan aşamasında task'lara bölünecek. Genel prensip:
- `page.tsx`'in filtre/sıralama mantığı için **yeni bir test dosyası** gerekiyor (şu an sıfır kapsam) — saf bir yardımcı fonksiyona çıkarılıp (`filterListings`, `sortListings` gibi) orada test edilmesi, component'i test etmekten daha güvenilir olur.
- `FilterSidebar.test.tsx`, `ListingCard` testleri, `CitySearch` (varsa) testleri yeni enum/prop'lara göre güncellenir.
- `publishBody.test.ts`'e `type` alanı için assertion eklenir.
- Migration sonrası: `prisma migrate dev` (worktree'de) + `tsc` 0 hata + `jest` tam koşum yeşil.
- Mümkünse Playwright ile canlı doğrulama: gerçek bir ilan yayınlanıp (`type` seçilerek) pazar yerinde doğru filtrelenip doğru rozetle göründüğü, boyut filtresinin gerçekten sonuç sayısını değiştirdiği, ilçe seçiminin il sınırını bozmadığı kontrol edilir.

## Riskler / Açık Notlar

- Migration prod DB'de mevcut satırları etkiler mi? `type` yeni ve `@default("KAT_KARSILIGI")` olduğundan mevcut satırlar otomatik dolar, veri kaybı riski yok.
- `zoning`'e geçişte mock/demo ilanlarının imar dağılımı görsel olarak biraz değişecek (yeni enum etiketleri) — bu kozmetik, fonksiyonel bir regresyon değil.
- `CitySearch`'in tek importer'ı `marketplace/page.tsx` (grep ile doğrulandı) — callback imza genişletmesi başka hiçbir çağıranı etkilemiyor.
