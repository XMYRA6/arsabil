# Next Dispatch Brief

**Recommended next work:** `2026-07-01-emsal-arsa-maliyeti.md`

**Start at:** Task 1 — Veri modeli, API ve admin ekranina `avgLandPricePerM2` ekle.

Bu brief, execution queue'daki ilk isi baslatacak worker icin kisa giris
notudur. Detayli adimlar canonical plan dosyasindadir; burada yalnizca kapsam,
baslangic kontrolleri ve dikkat noktasi var.

## Why This First

Emsal arsa maliyeti modeli hesap motoru ve veri modeli karari. UI siralama,
masaustu denge ve profesyonel redesign isleri bu veri kabiliyeti geldikten sonra
daha az geri alinacak sekilde uygulanir.

## Read First

1. `docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md`
2. `docs/superpowers/specs/2026-07-01-emsal-arsa-maliyeti-design.md`
3. `src/lib/calculator/engine_v2.ts`
4. `prisma/schema.prisma`
5. `src/app/admin/district-prices/page.tsx`
6. `src/app/api/district-prices/route.ts`
7. `src/app/api/district-prices/[id]/route.ts`

## Initial Commands

```powershell
git status --short
npx jest src/lib/districtPrices/__tests__/validate.test.ts
npx tsc --noEmit
```

`git status` temiz olmak zorunda degil; sadece mevcut kullanici degisikliklerini
not et ve ilgisiz dosyalara dokunma.

## Task 1 Scope

Task 1 yalnizca veri/admin/API katmanidir:

- `DistrictPrice.avgLandPricePerM2 Float?`
- migration SQL
- shared `DistrictPriceEntry` tipi
- district price validator
- `/api/district-prices` POST/PATCH support
- admin district prices form/table/mobile card support
- ilgili unit/component testleri

**Do not start yet:**

- `engine_v2` comparable model logic
- `/hesapla` Orantisal/Emsal UI
- professional UI redesign
- masaustu girdi sirasi/sutun dengesi

Those are later tasks.

## Key Decisions

- `avgLandPricePerM2` nullable kalir.
- Bos admin input'u `null` olarak gider.
- `avgSalesPricePerM2` daire satis m2 fiyatidir; `avgLandPricePerM2` arsa m2
  fiyatidir. UI etiketleri bu ayrimi korumali.
- Existing rows migrate without backfill.
- Existing seed/static district data is not forced to include land price data.

## Expected Tests

Task 1 sonunda:

```powershell
npx prisma generate
npx jest src/lib/districtPrices src/app/admin/district-prices
npx tsc --noEmit
```

If Prisma generate fails because dependencies or generated client are stale,
fix that before moving to Task 2.

## Commit

Canonical planin Task 1 commit mesaji:

```text
feat(district-prices): emsal arsa m2 fiyati alani eklendi
```

Commit etmeden once yalnizca Task 1 dosyalarinin staged oldugunu kontrol et.
