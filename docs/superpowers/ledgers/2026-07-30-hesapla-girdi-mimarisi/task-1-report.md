# Task 1 Report: Birim maliyet kaynağı ve öncelik kuralı

## Implementation Summary

Created a pure TypeScript layer that makes the construction unit price source explicit to the UI. Two files implement and test three exported functions and one exported type.

## Files Changed

- **Created:** `src/app/hesapla/mobile/unitPriceSource.ts` (53 lines)
- **Created:** `src/app/hesapla/mobile/unitPriceSource.test.ts` (46 lines)

## TDD Evidence

### RED: Test fails before implementation
```
npm run: npx jest src/app/hesapla/mobile/unitPriceSource.test --no-coverage
Result:
  Cannot find module './unitPriceSource' from 'src/app/hesapla/mobile/unitPriceSource.test.ts'
Expected: FAIL — module not found (✓ correct reason)
```

### GREEN: Tests pass after implementation
```
npm run: npx jest src/app/hesapla/mobile/unitPriceSource.test --no-coverage
Result:
  PASS src/app/hesapla/mobile/unitPriceSource.test.ts
  kaynakEtiketi
    √ ilceden gelen degerin kaynagini soyler (4 ms)
    √ elle girilen degeri boyle isaretler
    √ varsayilan degeri boyle isaretler
    √ rakamlari ondalik basmaz
  ilceSecildi
    √ birim maliyeti ve piyasa fiyatini birlikte doldurur (2 ms)
    √ piyasa fiyatini Turkce bicimde ve tam sayi olarak verir
  konumTemizlendi
    √ yonetici varsayilanina doner

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### TypeScript Verification
```
npm run: npx tsc --noEmit
Result: (no output — 0 errors)
```

### Full Test Suite
```
npm run: npx jest --no-coverage
Result: Test Suites: 94 passed, 94 total
        Tests:       671 passed, 671 total
        (664 baseline + 7 new tests ✓)
```

## Exports Implemented

### Type: `BirimMaliyetKaynagi`
Three-variant union type:
- `{ tur: 'varsayilan' }` — engine default
- `{ tur: 'ilce'; ilce: string }` — district average
- `{ tur: 'elle' }` — manually entered

### Type: `IlceFiyatGirdisi`
Input structure for district selection with three numeric fields.

### Function: `kaynakEtiketi(kaynak, deger): string`
Renders source label below unit price in UI. Formatting uses `Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })`.

Test outputs verified character-for-character:
- District: `"Kadıköy ortalaması 12.000 TL/m²"`
- Manual: `"Elle girildi · 14.500 TL/m²"`
- Default: `"Varsayılan 12.000 TL/m²"`
- Rounding: `14500.7` → `"Elle girildi · 14.501 TL/m²"`

### Function: `ilceSecildi(entry, apartmentSize): { birimMaliyet, piyasaFiyati, kaynak }`
District selection fills two values unconditionally (implementing precedence rule from Spec 4):
- `birimMaliyet`: direct assignment from `avgUnitConstructionPrice`
- `piyasaFiyati`: Turkish formatted (e.g., `"5.740.000"` for 41000 × 140)
- `kaynak`: source object with district name

Verified arithmetic:
- `41000 × 140 = 5,740,000` ✓
- `41333.4 × 140 = 5,786,676` (rounded) ✓

### Function: `konumTemizlendi(varsayilanBirimMaliyet): { birimMaliyet, kaynak }`
Location cleared → reset to engine default.

## Self-Review

### Completeness
- ✓ All three exported functions present and tested
- ✓ Both exported types (`BirimMaliyetKaynagi`, `IlceFiyatGirdisi`) defined
- ✓ All 7 test cases from brief present and passing
- ✓ Test suite total: 671 (664 + 7)

### Correctness
- ✓ `kaynakEtiketi` outputs match brief exactly (including Turkish text and `·` separator)
- ✓ `ilceSecildi` correctly multiplies market price by apartment size and rounds
- ✓ All three source types render correctly in labels
- ✓ `konumTemizlendi` returns correct default state
- ✓ Rounding (14500.7 → 14501) produces expected output

### Purity
- ✓ No React imports; no DOM dependencies
- ✓ No side effects; all pure functions
- ✓ Single external dependency: `Intl.NumberFormat` (language API)
- ✓ All parameters passed explicitly; no global state mutations

### Formatting
- ✓ Turkish NumberFormat configured with `maximumFractionDigits: 0`
- ✓ Thousand separators (`.`) applied correctly
- ✓ Decimal point never appears in output (as required)

## Commit

```
f7d4c6f feat(hesapla): birim maliyet kaynagi ve oncelik kurali
```

Files staged explicitly (no `git add -A` to avoid pulling in stale PNGs):
```
git add src/app/hesapla/mobile/unitPriceSource.ts src/app/hesapla/mobile/unitPriceSource.test.ts
```

## Concerns

None. All tests green, TypeScript clean, implementation follows brief exactly.
