# ArsaBil — İlçe Bazlı Fiyat Entegrasyonu

**Tarih:** 2026-06-06  
**Kapsam:** Admin panelinde il/ilçe bazlı fiyat yönetimi + hesapla sayfasında otomatik fiyat doldurma

---

## Hedef

Admin, ilçe bazlı ortalama piyasa satış fiyatı (TL/m²) ve inşaat birim fiyatı (TL/m²) girer. Kullanıcı `/hesapla` sayfasında konum seçince `manualMarketPrice` ve `globalUnitPrice` state'leri otomatik güncellenir.

---

## Kararlar

| Konu | Karar |
|------|-------|
| Veri kaynağı | Admin manuel giriş (ilerisi için scraper altyapısı hazır) |
| Granülarite | İl + İlçe düzeyi |
| Hesapla UI konumu | Sonuç panelinde kompakt konum barı (action butonlarının üstü) |
| Admin UI | Tablo + Modal (A seçeneği) |
| API yetki | GET herkese açık, POST/PUT/DELETE sadece ADMIN |
| Client strateji | Sayfa açılışında tüm liste bir kerede çekilir, client-side filtrelenir |

---

## Mimari

```
prisma/schema.prisma                         ← DistrictPrice modeli
src/app/api/district-prices/route.ts         ← GET (liste) + POST
src/app/api/district-prices/[id]/route.ts    ← PUT + DELETE
src/app/admin/district-prices/page.tsx       ← Admin CRUD sayfası
src/components/LocationSelector.tsx          ← Yeni bileşen: İl→İlçe cascade
src/app/hesapla/page.tsx                     ← Konum state + LocationSelector
```

---

## DB Şeması

```prisma
model DistrictPrice {
  id                       String   @id @default(cuid())
  il                       String
  ilce                     String
  avgSalesPricePerM2       Float    // TL/m² — piyasa satış fiyatı
  avgUnitConstructionPrice Float    // TL/m² — inşaat birim fiyatı
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([il, ilce])
  @@index([il])
}
```

`@@unique([il, ilce])` — aynı kombinasyon iki kez girilemiyor.  
`@@index([il])` — "İstanbul'un tüm ilçeleri" sorgusu hızlı çalışır.

---

## API Uç Noktaları

### `GET /api/district-prices`
Tüm kayıtları döner. Opsiyonel `?il=X` query param ile filtreler.

```json
[
  { "id": "...", "il": "İstanbul", "ilce": "Kadıköy", "avgSalesPricePerM2": 95000, "avgUnitConstructionPrice": 14500 },
  { "id": "...", "il": "İstanbul", "ilce": "Beşiktaş", "avgSalesPricePerM2": 180000, "avgUnitConstructionPrice": 15000 }
]
```

### `POST /api/district-prices` (ADMIN)
Body: `{ il, ilce, avgSalesPricePerM2, avgUnitConstructionPrice }`  
Yanıt: 201 + oluşturulan kayıt. `@@unique` ihlalinde 409.

### `PUT /api/district-prices/[id]` (ADMIN)
Body: kısmi veya tam güncelleme.  
Yanıt: 200 + güncel kayıt. Bulunamazsa 404.

### `DELETE /api/district-prices/[id]` (ADMIN)
Yanıt: 200. Bulunamazsa 404.

---

## Admin Sayfası — `/admin/district-prices`

### Yapı

```
İlçe Fiyatları                              [+ Yeni Ekle]
─────────────────────────────────────────────────────────
🔍 İl ara...                        [ Tüm İller ▾ ]

┌────────────┬──────────────┬─────────────────┬───────────────────┬────────┐
│ İl         │ İlçe         │ Piyasa (TL/m²)  │ İnşaat (TL/m²)   │ Eylem  │
├────────────┼──────────────┼─────────────────┼───────────────────┼────────┤
│ İstanbul   │ Kadıköy      │ 95.000          │ 14.500            │ ✏  ✕  │
│ İstanbul   │ Beşiktaş     │ 180.000         │ 15.000            │ ✏  ✕  │
│ Ankara     │ Çankaya      │ 42.000          │ 12.500            │ ✏  ✕  │
└────────────┴──────────────┴─────────────────┴───────────────────┴────────┘
```

### Modal (Ekle / Düzenle)

4 alan: İl (text input), İlçe (text input), Piyasa TL/m² (number), İnşaat TL/m² (number).  
Kaydet: POST veya PUT çağrısı, başarıda modal kapanır + liste yenilenir.  
İl/İlçe alanları serbest metin — dropdown değil (veri girişi ilk aşamada, standart liste yokken esnek olsun).

### Silme

Satır üzerindeki ✕ butonuyla, onay dialog'u göstererek sil.

---

## Hesapla Sayfası Değişiklikleri

### Yeni State

```tsx
const [selectedIl, setSelectedIl] = useState<string>('');
const [selectedIlce, setSelectedIlce] = useState<string>('');
const [districtPrices, setDistrictPrices] = useState<DistrictPriceEntry[]>([]);
const [originalUnitPrice, setOriginalUnitPrice] = useState<number | null>(null);
```

`originalUnitPrice` — konum temizlenince `globalUnitPrice`'ı sıfırlamak için saklanır.

### Veri Yükleme

`useEffect([], [])` içinde (mevcut settings fetch'leriyle birlikte):

```tsx
fetch('/api/district-prices')
  .then(res => res.json())
  .then(data => setDistrictPrices(data))
  .catch(console.error);
```

### Konum Seçim Mantığı

```tsx
const handleIlChange = (il: string) => {
  setSelectedIl(il);
  setSelectedIlce('');
};

const handleIlceChange = (ilce: string) => {
  setSelectedIlce(ilce);
  const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === ilce);
  if (!entry) return;
  if (originalUnitPrice === null) setOriginalUnitPrice(globalUnitPrice);
  setGlobalUnitPrice(entry.avgUnitConstructionPrice);
  const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
  setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
};

const handleClearLocation = () => {
  setSelectedIl('');
  setSelectedIlce('');
  if (originalUnitPrice !== null) {
    setGlobalUnitPrice(originalUnitPrice);
    setOriginalUnitPrice(null);
  }
};
```

### apartmentSize Reaktivitesi

Mevcut `useEffect([...deps])` listesine ek bir `useEffect`:

```tsx
useEffect(() => {
  if (!selectedIlce) return;
  const entry = districtPrices.find(d => d.il === selectedIl && d.ilce === selectedIlce);
  if (!entry) return;
  const market = Math.round(entry.avgSalesPricePerM2 * apartmentSize);
  setManualMarketPrice(market.toLocaleString('tr-TR', { maximumFractionDigits: 0 }));
}, [apartmentSize, selectedIl, selectedIlce, districtPrices]);
```

### LocationSelector Bileşeni

`src/components/LocationSelector.tsx` — props:

```tsx
// DistrictPrice: Prisma'dan import edilir ya da local interface olarak tanımlanır
interface DistrictPriceEntry {
  id: string;
  il: string;
  ilce: string;
  avgSalesPricePerM2: number;
  avgUnitConstructionPrice: number;
}

interface LocationSelectorProps {
  districtPrices: DistrictPriceEntry[];
  selectedIl: string;
  selectedIlce: string;
  onIlChange: (il: string) => void;
  onIlceChange: (ilce: string) => void;
  onClear: () => void;
}
```

**Durum 1 (boş):** Gri bar, "Proje konumunu seç" placeholder, İl dropdown aktif, İlçe disabled.  
**Durum 2 (il seçildi):** İl mavi vurgu, İlçe dropdown populate.  
**Durum 3 (ilçe seçildi):** Yeşil bar, "İstanbul / Kadıköy · Piyasa: X TL · Birim: Y TL/m²", ✕ butonu.

### Yerleşim

`actionBottomRow` div'inin üstüne (`sliderArea`'nın altına) yerleştirilir:

```tsx
{districtPrices.length > 0 && (
  <LocationSelector
    districtPrices={districtPrices}
    selectedIl={selectedIl}
    selectedIlce={selectedIlce}
    onIlChange={handleIlChange}
    onIlceChange={handleIlceChange}
    onClear={handleClearLocation}
  />
)}
```

---

## Davranış Kuralları

| Durum | Davranış |
|-------|----------|
| İlçe seçildi | manualMarketPrice = avgSalesPricePerM2 × apartmentSize |
| İlçe seçildi | globalUnitPrice = avgUnitConstructionPrice |
| apartmentSize değişti + konum seçili | manualMarketPrice yeniden hesaplanır |
| Kullanıcı piyasa fiyatını elle değiştirdi | Konum seçimi korunur, override kabul edilir |
| ✕ temizleme | selectedIl/İlce sıfır, globalUnitPrice orijinal değere döner |
| Veri yoksa | `districtPrices.length === 0` → LocationSelector render edilmez |

---

## Kapsam Dışı

- Otomatik web scraping / harici API entegrasyonu
- İl/ilçe dropdown'ları için standart Türkiye listesi (serbest metin kullanılır)
- Kullanıcıların kendi ilçe fiyatlarını düzenlemesi
- Senaryo kaydetme ile ilçe bilgisinin saklanması
