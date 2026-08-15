# Emsal/Karsilastirmali Arsa Maliyeti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `engine_v2` icindeki mevcut orantisal arsa maliyeti modeline, ilce bazli emsal arsa m2 fiyatiyla calisan ikinci bir model eklemek. Kullanici `/hesapla` ekraninda **Orantisal / Emsal** secimi yapabilir; Emsal yalnizca secili il/ilcede `avgLandPricePerM2` varsa aktif olur.

**Architecture:** Prisma `DistrictPrice` kaydina nullable `avgLandPricePerM2` eklenir. Saf hesap motoru DB bilmeden `landCostModel` ve `districtLandPricePerM2` girdilerini tuketir. Admin fiyat ekranlari ve `/api/district-prices` endpoint'leri yeni alani tasir. `/hesapla` UI'i secili ilce kaydindan arsa m2 fiyatini alir, Emsal modda `Aa * avgLandPricePerM2` ile hesaplanan `Ma` sonucunu kullanir; veri eksikse Orantisal moda geri doner.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, Jest + Testing Library.

## Global Constraints

- Geriye donuk uyumluluk korunacak: `landCostModel` verilmezse mevcut orantisal model birebir calismali.
- `engine_v2.ts` saf kalacak; DB/API/Prisma erisimi eklenmeyecek.
- `Report` semasina model bilgisi eklenmeyecek; mevcut `landShareRatio` ve `landCost` nihai degerleri saklamaya devam eder.
- PDF rapor sablonlari bu planda degismeyecek.
- Emsal verisi olmayan ilcede kullanici Emsal moda gecemeyecek; motor yine de savunmali fallback yapacak.
- Mevcut `avgSalesPricePerM2` daire satis m2 fiyatidir; yeni `avgLandPricePerM2` arsa m2 fiyatidir. Etiketler bu farki acik tutacak.

---

## Dosya Yapisi

- **Modify:** `prisma/schema.prisma`
- **Add:** `prisma/migrations/<timestamp>_add_avg_land_price_per_m2/migration.sql`
- **Modify:** `src/components/LocationSelector.tsx`
- **Modify:** `src/lib/data/trProvinces.ts`
- **Modify:** `src/lib/districtPrices/data.ts`
- **Modify:** `src/lib/districtPrices/validate.ts`
- **Modify/Test:** `src/lib/districtPrices/__tests__/validate.test.ts`
- **Modify:** `src/app/api/district-prices/route.ts`
- **Modify:** `src/app/api/district-prices/[id]/route.ts`
- **Modify/Test:** `src/app/admin/district-prices/page.tsx`
- **Modify/Test:** `src/app/admin/district-prices/AdminDistrictPrices.test.tsx`
- **Modify/Test:** `src/lib/calculator/engine_v2.ts`
- **Modify/Test:** `src/lib/calculator/engine_v2.test.ts`
- **Modify/Test:** `src/app/hesapla/page.tsx`
- **Modify/Test:** `src/app/hesapla/page.test.tsx`
- **Modify (olasi):** `src/app/hesapla/page.module.css`
- **Modify:** `src/lib/calculator/SPEC.md`

---

### Task 1: Veri modeli, API ve admin ekranina `avgLandPricePerM2` ekle

**Files:**
- Modify: `prisma/schema.prisma`
- Add: `prisma/migrations/<timestamp>_add_avg_land_price_per_m2/migration.sql`
- Modify: `src/components/LocationSelector.tsx`
- Modify: `src/lib/data/trProvinces.ts`
- Modify: `src/lib/districtPrices/data.ts`
- Modify: `src/lib/districtPrices/validate.ts`
- Test: `src/lib/districtPrices/__tests__/validate.test.ts`
- Modify: `src/app/api/district-prices/route.ts`
- Modify: `src/app/api/district-prices/[id]/route.ts`
- Modify/Test: `src/app/admin/district-prices/page.tsx`, `src/app/admin/district-prices/AdminDistrictPrices.test.tsx`

**Interfaces:**
- Produces: `DistrictPrice.avgLandPricePerM2?: number | null`
- Consumes: mevcut `DistrictPriceEntry` tipi; yeni alan opsiyonel kalir.

- [x] **Step 1: Basarisiz veri dogrulama testlerini yaz**

`src/lib/districtPrices/__tests__/validate.test.ts` icinde:
- `avgLandPricePerM2` yoksa kayit gecerli kalir.
- `avgLandPricePerM2: null` gecerli kalir.
- `avgLandPricePerM2` pozitif sayiysa gecerli kalir.
- `0`, negatif, `NaN` gelirse hata uretir.

Run: `npx jest src/lib/districtPrices/__tests__/validate.test.ts`
Expected: FAIL.

- [x] **Step 2: Prisma semasini ve migration'i ekle**

`prisma/schema.prisma` icindeki `DistrictPrice` modeline ekle:

```prisma
avgLandPricePerM2        Float?
```

Migration SQL:

```sql
ALTER TABLE "DistrictPrice" ADD COLUMN "avgLandPricePerM2" DOUBLE PRECISION;
```

Not: nullable oldugu icin mevcut veriler etkilenmez.

- [x] **Step 3: Paylasilan tipleri genislet**

`src/components/LocationSelector.tsx`:

```ts
avgLandPricePerM2?: number | null;
```

`src/lib/data/trProvinces.ts` ve `src/lib/districtPrices/data.ts` tiplerinde de ayni alan opsiyonel olarak tanimlanir. Seed/default dataset'e zorunlu veri eklenmez; alan bos kalabilir.

- [x] **Step 4: Validator'i genislet**

`src/lib/districtPrices/validate.ts` icinde yeni alan icin yalnizca deger verildiginde pozitif sayi kontrolu yap:

```ts
if (k.avgLandPricePerM2 !== undefined && k.avgLandPricePerM2 !== null && !fiyatGecerli(k.avgLandPricePerM2)) {
  hatalar.push({ indeks, mesaj: `avgLandPricePerM2 pozitif olmali: ${k.avgLandPricePerM2}` })
}
```

Run: `npx jest src/lib/districtPrices/__tests__/validate.test.ts`
Expected: PASS.

- [x] **Step 5: API POST/PATCH body'lerine alan ekle**

`src/app/api/district-prices/route.ts`:
- body destructuring'e `avgLandPricePerM2` ekle.
- zorunlu alan kontrolune ekleme; opsiyonel kalir.
- create data'sina sadece `avgLandPricePerM2 !== undefined` ise `Number(avgLandPricePerM2)` veya `null` yaz.

`src/app/api/district-prices/[id]/route.ts`:
- PATCH data'sina `avgLandPricePerM2` ekle.
- `null` geldiyse DB'de `null` yapilabilmeli; bos string gelirse admin formunda `null`'a normalize edilmeli.

- [x] **Step 6: Admin ilce fiyatlari ekranina ucuncu fiyat alani ekle**

`src/app/admin/district-prices/page.tsx` icinde mevcut `avgSalesPricePerM2` ve `avgUnitConstructionPrice` pattern'ini takip et:
- form alanlari: `Arsa fiyatı (TL/m²)` veya `Arsa m² fiyatı`
- tablo kolonu: `Arsa (TL/m²)`
- mobil DataCard satiri: `Arsa (TL/m²)`
- bos deger gosterimi: `-`
- kaydetmeden once bos string/null degeri `null`, dolu degeri `Number(...)`.

- [x] **Step 7: Admin testlerini guncelle**

`AdminDistrictPrices.test.tsx` fixtures'ina en az bir kayitta `avgLandPricePerM2` ekle, bir kayitta bos birak. Testler:
- masaustu/mobil gorunumde arsa m2 fiyati gorunur.
- bos deger `-` olarak gorunur.
- create/edit payload'inda dolu deger sayi, bos deger `null` gider.

- [x] **Step 8: Dogrulama**

Run:

```bash
npx prisma generate
npx jest src/lib/districtPrices src/app/admin/district-prices
npx tsc --noEmit
```

- [x] **Step 9: Commit**

```bash
git add prisma src/components/LocationSelector.tsx src/lib/data/trProvinces.ts src/lib/districtPrices src/app/api/district-prices src/app/admin/district-prices
git commit -m "feat(district-prices): emsal arsa m2 fiyati alani eklendi"
```

---

### Task 2: `engine_v2` icine Emsal arsa maliyeti modelini ekle

**Files:**
- Modify/Test: `src/lib/calculator/engine_v2.ts`
- Modify/Test: `src/lib/calculator/engine_v2.test.ts`
- Modify: `src/lib/calculator/SPEC.md`

**Interfaces:**
- `CalculationInput.landCostModel?: 'proportional' | 'comparable'`
- `CalculationInput.districtLandPricePerM2?: number`
- `CalculationOutput.derivedX: number`

- [x] **Step 1: Basarisiz motor testlerini yaz**

`src/lib/calculator/engine_v2.test.ts` icine su senaryolari ekle:
- `landCostModel: 'comparable'`, `Aa: 500`, `districtLandPricePerM2: 20000` ise `Ma = 10_000_000`, `M = Mi + Ma`, `derivedX = Ma / M`.
- `comparable` secili ama `Aa` eksikse mevcut orantisal modelle ayni sonuc.
- `comparable` secili ama `districtLandPricePerM2` eksikse mevcut orantisal modelle ayni sonuc.
- `landCostModel` verilmezse mevcut testlerdeki sonuc degismez ve `derivedX === input.landShareRatio`.

Run: `npx jest src/lib/calculator/engine_v2.test.ts`
Expected: FAIL.

- [x] **Step 2: Input/output tiplerini genislet**

`engine_v2.ts` icinde:

```ts
type LandCostModel = 'proportional' | 'comparable';
```

`CalculationInput`:

```ts
landCostModel?: LandCostModel;
districtLandPricePerM2?: number;
```

`CalculationOutput`:

```ts
derivedX: number;
```

- [x] **Step 3: `computeLandCostAndTotal` fonksiyonunu genislet**

Mevcut `computeLandCostAndTotal(Mi, x)` imzasini su mantiga cikar:

```ts
function computeLandCostAndTotal(
  Mi: number,
  x: number,
  model: LandCostModel = 'proportional',
  Aa?: number,
  districtLandPricePerM2?: number
): { M: number; Ma: number; derivedX: number } {
  if (model === 'comparable' && typeof Aa === 'number' && Aa > 0 && typeof districtLandPricePerM2 === 'number' && districtLandPricePerM2 > 0) {
    const Ma = Aa * districtLandPricePerM2;
    const M = Mi + Ma;
    return { M, Ma, derivedX: M > 0 ? Ma / M : 0 };
  }

  const safeX = Math.min(Math.max(x, 0), 0.999);
  const M = Mi / (1 - safeX);
  const Ma = M - Mi;
  return { M, Ma, derivedX: x };
}
```

`calculate` icinde `derivedX` output'a eklenir. Var olan `x` girdisi diger hesaplarda kullaniliyorsa, Emsal modelin gercek arsa payi icin `derivedX` kullanilmasi gerekip gerekmedigini satir satir kontrol et; `Ma/M` bilgisi kullaniciya ve rapora gidecek nihai pay olmalidir.

- [x] **Step 4: SPEC.md guncelle**

`src/lib/calculator/SPEC.md` icindeki `Ma: [TBD ...]` notunu kaldir. Orantisal ve Emsal modellerin formullerini, fallback kuralini ve `derivedX` alanini ekle.

- [x] **Step 5: Dogrulama**

Run:

```bash
npx jest src/lib/calculator/engine_v2.test.ts
npx tsc --noEmit
```

- [x] **Step 6: Commit**

```bash
git add src/lib/calculator/engine_v2.ts src/lib/calculator/engine_v2.test.ts src/lib/calculator/SPEC.md
git commit -m "feat(calculator): emsal arsa maliyeti modeli eklendi"
```

---

### Task 3: `/hesapla` UI'inda Orantisal/Emsal model secimi

**Files:**
- Modify/Test: `src/app/hesapla/page.tsx`
- Modify/Test: `src/app/hesapla/page.test.tsx`
- Modify (olasi): `src/app/hesapla/page.module.css`

**Interfaces:**
- Consumes: `DistrictPriceEntry.avgLandPricePerM2`
- Consumes: `CalculatorEngineV2.calculate({ landCostModel, districtLandPricePerM2 })`
- Produces: UI state `landCostModel`

- [x] **Step 1: Basarisiz UI testlerini yaz**

`src/app/hesapla/page.test.tsx` icine yeni describe ekle:
- secili ilcede `avgLandPricePerM2` yoksa `Emsal` secenegi disabled gorunur ve Orantisal mod kalir.
- secili ilcede `avgLandPricePerM2` varsa kullanici `Emsal`'e gecebilir; arsa payi slider'i kaybolur, `Bu emsale göre arsa payı` notu gorunur.
- Emsal moddayken ilce degisip yeni kayitta `avgLandPricePerM2` yoksa mod otomatik Orantisal'a doner.
- Emsal modda `isAaEnabled` otomatik acilir ve Arsa Alani kapatilamaz.

Mock district price fixture'larina bir kayitta `avgLandPricePerM2`, bir kayitta `null` ekle.

Run: `npx jest src/app/hesapla/page.test.tsx -t "Emsal arsa maliyeti"`
Expected: FAIL.

- [x] **Step 2: State ve secili emsal degerini ekle**

`page.tsx`:

```tsx
const [landCostModel, setLandCostModel] = useState<'proportional' | 'comparable'>('proportional');
```

Secili ilce kaydindan turetilen deger:

```tsx
const districtLandPricePerM2 = selectedDistrictEntry?.avgLandPricePerM2 ?? null;
const isComparableAvailable = typeof districtLandPricePerM2 === 'number' && districtLandPricePerM2 > 0;
```

Projede secili ilce kaydi farkli isimle tutuluyorsa mevcut `globalUnitPrice`/`manualMarketPrice` dolduran akis izlenir; yeni state o akisla ayni noktadan beslenir.

- [x] **Step 3: Ilce degisiminde guard ekle**

Il/ilce degistiginde:
- Eger yeni kayitta `avgLandPricePerM2` yoksa ve `landCostModel === 'comparable'`, `setLandCostModel('proportional')`.
- Kisa bilgi notu icin mevcut sayfa ici uyari/toast pattern'i varsa onu kullan; yoksa yalnizca modelin geri donmesi yeterli, test bilgi notunu zorunlu kilmaz.

- [x] **Step 4: Emsal modda arsa alani zorunlulugunu uygula**

`landCostModel === 'comparable'` oldugunda:
- `isAaEnabled` true yapilir.
- Arsa Alani toggle'i disabled hale gelir ya da kapatma aksiyonu no-op olur.
- Bu durum UI'da kisa notla aciklanir: `Emsal modelde arsa alanı zorunludur.`

- [x] **Step 5: Calculator input'una yeni alanlari gec**

`CalculatorEngineV2.calculate` cagrilarina:

```tsx
landCostModel,
districtLandPricePerM2: districtLandPricePerM2 ?? undefined,
```

Emsal modda nihai arsa payi gosterimleri icin `result.derivedX` kullan:
- API rapor kaydina giden `landShareRatio`
- proje/senaryo kaydina giden `landShareRatio`
- UI'daki `effectiveLandShareRatio` turevleri

Orantisal modda `derivedX` zaten mevcut oranla ayni oldugu icin davranis degismez.

- [x] **Step 6: Arsa Payi bloguna model secici ekle**

Mevcut `Arsa Payı` bolumunun basligina, `iksaMode` segment pattern'ine benzer iki secenek ekle:
- `Orantısal`
- `Emsal`

Emsal disabled sebebi:

```tsx
disabled={!isComparableAvailable}
title={!isComparableAvailable ? 'Bu bölgede arsa fiyatı verisi yok' : undefined}
```

Emsal seciliyken:
- yuzde slider'i render edilmez.
- salt-okunur kutu render edilir: `Bu emsale göre arsa payı: %${Math.round(result.derivedX * 100)}`
- `Aa * avgLandPricePerM2` degeri yardimci metin olarak gosterilebilir: `Arsa maliyeti: ... TL`.

Orantisal seciliyken mevcut arsa payi slider/toggle davranisi korunur.

- [x] **Step 7: Mobil dal varsa ayni davranisi koru**

`page.tsx` mobil branch'i erken return kullaniyorsa, `HesaplaMobile`/`GirdiKarti` prop zincirine `landCostModel` tasinmadan once scope'u kontrol et. Bu plan masaustu `/hesapla` UI'ini kapsar; mobil girdi mimarisi ayri planlarda ilerledigi icin mobilde Emsal secimi eklenmeyecekse testte mobil kapsam disi acikca korunur.

- [x] **Step 8: Dogrulama**

Run:

```bash
npx jest src/app/hesapla/page.test.tsx
npx jest src/lib/calculator/engine_v2.test.ts
npx tsc --noEmit
```

- [x] **Step 9: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/page.test.tsx
git commit -m "feat(hesapla): emsal arsa maliyeti secimi eklendi"
```

---

## Final Dogrulama

- `npx prisma generate` -> 0 hata.
- `npx tsc --noEmit` -> 0 hata.
- `npx jest src/lib/calculator src/lib/districtPrices src/app/admin/district-prices src/app/hesapla` -> yesil.
- `npx jest` -> tum proje suite'i yesil.
- Playwright 1440x900 `/hesapla`: Orantisal modda mevcut slider davranisi, Emsal verisi olan ilcede Emsal modu, Emsal verisi olmayan ilcede disabled durum.
- Admin `/admin/district-prices`: arsa m2 fiyati ekleme, silme/null'a cekme, mobil DataCard gorunumu.

## Commit Kaydi

- Kod commitleri: c0fe45b (feat: add land cost model and professional UI refresh).

