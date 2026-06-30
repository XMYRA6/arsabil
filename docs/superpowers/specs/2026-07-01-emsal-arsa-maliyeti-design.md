# Emsal/Karşılaştırmalı Arsa Maliyeti (Ma) Modeli — Tasarım

**Tarih:** 2026-07-01
**Durum:** Onaylandı, implementasyon bekliyor
**İlgili dosya:** `src/lib/calculator/SPEC.md` §Adım B — `Ma: [TBD - 3 alternatif geliştirilecek]` notunun ilk alternatifi

---

## 1. Bağlam ve Problem

`src/lib/calculator/engine_v2.ts` içindeki Arsa Maliyeti (Ma) hesaplaması şu anda tek bir modele dayanıyor:

```
Geçici Standart Model (Orantısal): M = Mi / (1 - x), Ma = M - Mi
```

Burada `x` (arsa payı oranı) kullanıcı tarafından bir slider ile seçilen bir **girdi**, `Ma` ise bu orandan **türetilen bir çıktı**. Bu model, müteahhit ile arsa sahibinin kat karşılığı oranı üzerinden anlaştığı senaryolar için doğru, ama arsanın bağımsız bir piyasa değeri (emsal) üzerinden değerlendirilmesi gereken senaryoları desteklemiyor.

`SPEC.md` bunu açıkça bilinen bir eksik olarak işaretliyor: *"Ma: [TBD - Antigravity tarafından 3 alternatif geliştirilecek]"*. Bu tasarım, 3 alternatiften ilkini (emsal/karşılaştırmalı model) tanımlar.

---

## 2. Veri Modeli Değişikliği

`DistrictPrice` tablosuna yeni, nullable bir alan eklenir:

```prisma
model DistrictPrice {
  id                       String   @id @default(cuid())
  il                       String
  ilce                     String
  avgSalesPricePerM2       Float
  avgUnitConstructionPrice Float
  avgLandPricePerM2        Float?   // YENİ — arsa m² birim fiyatı, opsiyonel
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([il, ilce])
  @@index([il])
}
```

**Neden nullable:** Mevcut kayıtlarda bu veri yok; admin panelinden kademeli olarak doldurulacak. `Float?` olması, bir bölge için emsal verisi girilmediğinde modelin o bölgede güvenli biçimde devre dışı kalmasını sağlar (bkz. §5 Edge Case'ler).

**Mevcut alanlarla karışmaması için netleştirme:** `avgSalesPricePerM2` **dairenin** satış fiyatıdır (piyasa karşılaştırması, `hesapla/page.tsx:207`), `avgLandPricePerM2` ise **arsanın kendisinin** m² fiyatıdır — iki farklı kavram, isim benzerliği kafa karıştırmamalı.

### Etkilenen dosyalar
- `prisma/schema.prisma` — alan eklenir
- Yeni migration: `npx prisma migrate dev --name add_avg_land_price_per_m2`
- `src/components/LocationSelector.tsx` — `DistrictPriceEntry` interface'ine `avgLandPricePerM2?: number` eklenir
- `src/app/admin/district-prices/page.tsx` — üçüncü input alanı (mevcut iki alanla aynı pattern)
- `src/app/api/district-prices/route.ts` ve `[id]/route.ts` — POST/PATCH body'sine alan eklenir

---

## 3. Hesaplama Mantığı (`engine_v2.ts`)

### 3.1 Yeni Input Alanları

```ts
export interface CalculationInput {
    // ... mevcut alanlar değişmeden kalır ...

    // Arsa Maliyeti Modeli (YENİ)
    landCostModel?: 'proportional' | 'comparable';  // varsayılan: 'proportional'
    districtLandPricePerM2?: number;                 // 'comparable' için zorunlu (çağıran taraf sağlar)
}
```

`landCostModel` opsiyonel ve varsayılanı `'proportional'` olduğu için **geriye dönük uyumluluk korunur** — mevcut tüm çağıranlar (örn. testler, eski rapor görüntüleme) hiçbir değişiklik yapmadan eskisi gibi çalışmaya devam eder.

### 3.2 `computeLandCostAndTotal` Genişlemesi

```ts
function computeLandCostAndTotal(
    Mi: number,
    x: number,
    model: 'proportional' | 'comparable',
    Aa?: number,
    districtLandPricePerM2?: number
): { M: number; Ma: number; derivedX: number } {
    if (model === 'comparable' && typeof Aa === 'number' && Aa > 0
        && typeof districtLandPricePerM2 === 'number' && districtLandPricePerM2 > 0) {
        const Ma = Aa * districtLandPricePerM2;
        const M = Mi + Ma;
        const derivedX = M > 0 ? Ma / M : 0;
        return { M, Ma, derivedX };
    }

    // Mevcut orantısal model — değişmeden, fallback olarak da kullanılır
    const safeX = Math.min(Math.max(x, 0), 0.999);
    const M = Mi / (1 - safeX);
    const Ma = M - Mi;
    return { M, Ma, derivedX: x };
}
```

**Önemli karar:** `comparable` seçili ama gerekli veriler (`Aa`, `districtLandPricePerM2`) eksikse, fonksiyon **sessizce orantısal modele düşer** (hata fırlatmaz). Bu, saf fonksiyonun her zaman bir sonuç üretmesini garanti eder; "veri eksik" durumunun kullanıcıya gösterilmesi UI katmanının sorumluluğudur (§4).

### 3.3 `CalculationOutput`'a Eklenen Alan

```ts
export interface CalculationOutput {
    // ... mevcut alanlar ...
    derivedX: number;  // YENİ — kullanılan modelin x değeri (proportional'da girdiyle aynı, comparable'da hesaplanmış)
}
```

### 3.4 Saflık (Purity) Korunuyor

`engine_v2.ts` hiçbir DB erişimi yapmaz. `districtLandPricePerM2` değeri çağıran taraf (hesapla sayfası, zaten `LocationSelector`'dan `selectedEntry.avgLandPricePerM2` ile elinde) tarafından çözülüp girdi olarak geçirilir. Bu, dosyanın başındaki "UI'dan bağımsız hesaplama makinesi" ilkesini korur.

### 3.5 `SPEC.md` Güncellemesi

`Adım B` bölümündeki `[TBD]` notu kaldırılıp, yukarıdaki iki modelin (`proportional`/`comparable`) formülleri ve seçim mantığı (Adım B'den önce, "Model Seçimi" başlığı altında) eklenir.

---

## 4. UI Akışı (`src/app/hesapla/page.tsx`)

- "Arsa Payı" başlığının yanına, mevcut İksa Masrafı seçicisiyle (Yok/Yüzde/Elle) aynı görsel pattern'de bir model seçici eklenir: **Orantısal** / **Emsal**.
- **Emsal** seçildiğinde:
  - Arsa Payı slider'ı kaybolur, yerine salt-okunur bir sonuç kutusu gelir: *"Bu emsale göre arsa payı: %X"* (`derivedX * 100`).
  - Arsa Alanı (Aa) toggle'ı otomatik açılır ve bu modda kapatılamaz (zorunlu).
  - Seçili il/ilçenin `avgLandPricePerM2` değeri `districtLandPricePerM2` olarak motora geçirilir.
- Seçili il/ilçede `avgLandPricePerM2` boşsa (`null`/`undefined`), **Emsal** seçeneği görsel olarak devre dışı (gri, tıklanamaz) gösterilir; üzerine gelince *"Bu bölgede arsa fiyatı verisi yok"* tooltip'i çıkar. Kullanıcı zaten **Orantısal** modda kalmaya devam eder.
- İl/ilçe değiştirildiğinde (ve yeni seçilen bölgede emsal verisi yoksa), eğer kullanıcı o an Emsal moddaysa otomatik olarak Orantısal moda geri döner ve kısa bir bilgi notu gösterilir.

---

## 5. Edge Case'ler

| Durum | Davranış |
|---|---|
| `comparable` seçili, `Aa` veya `districtLandPricePerM2` eksik | Motor sessizce `proportional`'a düşer (§3.2); UI bu durumu zaten oluşturmamalı (Emsal seçeneği disabled) |
| `Aa = 0` veya negatif | `proportional`'a düşer (mevcut `Aa > 0` kontrolüyle aynı pattern) |
| İl/ilçe değişince emsal verisi kaybolursa | UI otomatik olarak Orantısal moda döner (§4) |
| Eski kayıtlı raporlar (`Report.landShareRatio`) | Etkilenmez — geriye dönük okuma değişmiyor, sadece yeni hesaplamalar için seçenek eklendi |

---

## 6. Kapsam Dışı (YAGNI — bilinçli olarak ertelendi)

- `Report` tablosuna "hangi model kullanıldı" bilgisini kaydeden bir alan **eklenmiyor**. `landShareRatio` ve `landCost` zaten nihai sonucu saklıyor; hangi modelin ürettiği bilgisi şu an hiçbir ekranda gösterilmiyor/kullanılmıyor.
- PDF rapor şablonu (`ReportDocument.tsx`) **değişmiyor**.
- `SPEC.md`'deki diğer 2 alternatif (TBD) bu tasarımın kapsamı dışında — ayrı bir brainstorming/spec gerektirir.
- Toplu/CSV bazlı emsal veri içe aktarma (endeksa vb. entegrasyon) kapsam dışı — admin panelinden elle giriş yeterli.

---

## 7. Test Planı

`src/lib/calculator/engine_v2.test.ts`'e eklenecek senaryolar:

1. **Emsal model, tüm veriler mevcut:** `landCostModel: 'comparable'`, `Aa: 500`, `districtLandPricePerM2: 20000` → `Ma = 10.000.000`, `M = Mi + Ma`, `derivedX = Ma/M` doğru hesaplanmalı.
2. **Emsal seçili ama `Aa` eksik:** fonksiyon hata fırlatmadan orantısal modele düşmeli, sonuç mevcut `proportional` testleriyle aynı olmalı.
3. **Emsal seçili ama `districtLandPricePerM2` eksik:** aynı fallback davranışı.
4. **`landCostModel` hiç verilmemiş (undefined):** varsayılan `proportional` davranışı, mevcut 8 testin hiçbiri bozulmamalı (geriye dönük uyumluluk regresyon testi).

E2E: kapsam dışı (mevcut `auth-hesapla.spec.ts` zaten orantısal modeli kapsıyor; emsal modu için ayrı bir e2e senaryosu bu PR'ın kapsamına dahil edilmedi, ileride eklenebilir).
