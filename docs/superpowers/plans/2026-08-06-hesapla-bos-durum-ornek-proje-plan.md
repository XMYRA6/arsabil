# Hesapla — Boş Durum + "Örnek Proje ile Dene" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/hesapla` no longer auto-computes a fake result from hardcoded defaults on load. It starts empty, shows an explanatory empty state, and offers an optional "Örnek Proje ile Dene" button that fills only the missing fields with demo values and marks them with a visible, unmissable "Örnek Veri" badge.

**Architecture:** `apartmentSize` and `globalUnitPrice` — the two numeric inputs `CalculatorEngineV2.calculate` cannot produce a real result without — become `number | null` in `page.tsx`, starting at `null`. A gate (`apartmentSize !== null && globalUnitPrice !== null`) short-circuits the existing calculation `useEffect` to `setResult(null)` instead of calling the engine with garbage. Nullability then has to be threaded through every component that currently assumes these two are always real numbers: the desktop stepper input, `BirimMaliyetField` (+ its `kaynakEtiketi` helper), the mobile `GirdiKarti` stepper, and the mobile `FiyatAciklamasi` receipt screen. A new `isDemoData` flag tracks whether the currently-shown numbers came from the demo button rather than the user, and is cleared the instant the user edits either field by hand.

**Tech Stack:** Next.js (App Router, client component), React `useState`/`useEffect`, Jest + Testing Library, existing `CalculatorEngineV2` (untouched).

## Global Constraints

- Demo values are `apartmentSize: 140`, `globalUnitPrice: 12000` — the exact numbers the old hardcoded defaults used. Define them **once** as exported constants; nothing else hardcodes `140`/`12000` for this purpose.
- The gate is always `apartmentSize !== null && globalUnitPrice !== null` — parcel selection does **not** independently open it (confirmed by reading `handleParcelConfirm`, which only ever touches `arsaAlani`/`riskLevel`/`riskKaynagi`).
- "Örnek Proje ile Dene" fills **only the fields that are currently `null`** — never overwrites a value the user already typed.
- Any direct user edit to `apartmentSize` or `globalUnitPrice` (typing, stepper click, valid commit from `BirimMaliyetField`) sets `isDemoData` to `false`. There is no separate "clear demo" control.
- Stepper edge case: from `null`, `+` jumps to the demo default; `−` is a no-op (does not call the setter at all).
- No new dependencies. No changes to `CalculatorEngineV2` or `engine_v2.ts` — the gate lives entirely in the UI layer, before the engine is ever called.
- `npx tsc --noEmit` and `npx jest --no-coverage` must stay green after every task.

---

## File Map

| File | Change |
|---|---|
| `src/app/hesapla/calculatorUiHelpers.ts` | + `ORNEK_APARTMENT_SIZE`, `ORNEK_GLOBAL_UNIT_PRICE`, `ornekProjeIleDeneDoldur()` |
| `src/app/hesapla/calculatorUiHelpers.test.ts` | + tests for the above |
| `src/app/hesapla/mobile/unitPriceSource.ts` | `kaynakEtiketi(kaynak, deger: number \| null)` |
| `src/app/hesapla/mobile/unitPriceSource.test.ts` | + null case |
| `src/app/hesapla/AdvancedSettingsSections.tsx` | `BirimMaliyetFieldProps.globalUnitPrice: number \| null` + null-safe buffer |
| `src/app/hesapla/AdvancedSettingsSections.test.tsx` | + null case |
| `src/app/hesapla/mobile/GirdiKarti.tsx` | `apartmentSize: number \| null` + stepper edge cases + `—` display |
| `src/app/hesapla/mobile/GirdiKarti.test.tsx` | + null cases |
| `src/app/hesapla/mobile/FiyatAciklamasi.tsx` | `apartmentSize`/`unitPrice: number \| null` + null-safe render |
| `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx` | + null case |
| `src/app/hesapla/page.tsx` | core wiring: nullable state, gate, `isDemoData`, handlers, empty-state JSX (desktop), Rapor Kaydet fix (3 sites), Page 1 empty guard |
| `src/app/hesapla/page.test.tsx` | + empty-state / demo-button / badge tests |
| `src/app/hesapla/page.module.css` | + `.resultsEmptyState`, `.resultsEmptyText`, `.demoBadge`, `.pagerEmptyText` |
| `src/app/hesapla/mobile/SonucKarti.tsx` | + `hasEnoughDataForResult`, `isDemoData`, `onOrnekProjeIleDene` props + empty-state JSX |
| `src/app/hesapla/mobile/SonucKarti.test.tsx` | + empty-state / badge tests |
| `src/app/hesapla/mobile/mobile.module.css` | + `.sonucBosWrap`, `.sonucBosMetin`, `.ornekProjeBtnMobil`, `.ornekVeriRozeti` |

**Not touched, verified already null-safe by reading the code:**
- `HesapFisi.tsx` — already renders `—` for every row when `result === null`.
- `CostBreakdownChart.tsx` — already shows "Hesaplama bekleniyor..." when `total <= 0` (which is what all-zero fallback inputs produce).
- `AnalizSekmesi.tsx` (mobile "Analiz" screen) — already has an `if (!result)` branch with a friendly empty message.
- `FinancialDashboard` usage — already conditionally rendered only `{result && <FinancialDashboard .../>}`.

---

### Task 1: Pure helpers — demo-fill constants + fill function

**Files:**
- Modify: `src/app/hesapla/calculatorUiHelpers.ts`
- Test: `src/app/hesapla/calculatorUiHelpers.test.ts`

**Interfaces:**
- Produces: `ORNEK_APARTMENT_SIZE: number` (140), `ORNEK_GLOBAL_UNIT_PRICE: number` (12000), `ornekProjeIleDeneDoldur(input: { apartmentSize: number | null; globalUnitPrice: number | null }): { apartmentSize: number; globalUnitPrice: number }` — consumed by Task 5's `page.tsx` wiring.

- [ ] **Step 1: Write the failing tests**

Read `src/app/hesapla/calculatorUiHelpers.test.ts` first to match its existing style, then append:

```ts
describe('ornekProjeIleDeneDoldur', () => {
  it('her iki alan da null iken ikisini de demo degerleriyle doldurur', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: null, globalUnitPrice: null }))
      .toEqual({ apartmentSize: ORNEK_APARTMENT_SIZE, globalUnitPrice: ORNEK_GLOBAL_UNIT_PRICE });
  });

  it('yalnizca bos olan alani doldurur, dolu olana dokunmaz', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: 180, globalUnitPrice: null }))
      .toEqual({ apartmentSize: 180, globalUnitPrice: ORNEK_GLOBAL_UNIT_PRICE });
    expect(ornekProjeIleDeneDoldur({ apartmentSize: null, globalUnitPrice: 15000 }))
      .toEqual({ apartmentSize: ORNEK_APARTMENT_SIZE, globalUnitPrice: 15000 });
  });

  it('ikisi de doluysa hicbirini degistirmez', () => {
    expect(ornekProjeIleDeneDoldur({ apartmentSize: 200, globalUnitPrice: 20000 }))
      .toEqual({ apartmentSize: 200, globalUnitPrice: 20000 });
  });
});
```

Add the import at the top of the test file: `import { ornekProjeIleDeneDoldur, ORNEK_APARTMENT_SIZE, ORNEK_GLOBAL_UNIT_PRICE } from './calculatorUiHelpers';` (adjust to match whatever import style the file already uses — check the existing import line before writing this one).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/hesapla/calculatorUiHelpers.test.ts --no-coverage`
Expected: FAIL — `ornekProjeIleDeneDoldur is not a function` (or module has no exported member).

- [ ] **Step 3: Implement**

Append to `src/app/hesapla/calculatorUiHelpers.ts`:

```ts
/** "Örnek Proje ile Dene" demo sabitleri — eski AYAR_VARSAYILANLARI'nin apartmentSize/globalUnitPrice degerleriyle AYNI (140/12000), artik demo amacli. TEK kaynak. */
export const ORNEK_APARTMENT_SIZE = 140;
export const ORNEK_GLOBAL_UNIT_PRICE = 12000;

export interface OrnekProjeDoldurInput {
  apartmentSize: number | null;
  globalUnitPrice: number | null;
}

export interface OrnekProjeDoldurSonuc {
  apartmentSize: number;
  globalUnitPrice: number;
}

/** Yalnizca BOS (null) olan alanlari demo sabitleriyle doldurur; dolu birakir. */
export function ornekProjeIleDeneDoldur({
  apartmentSize,
  globalUnitPrice,
}: OrnekProjeDoldurInput): OrnekProjeDoldurSonuc {
  return {
    apartmentSize: apartmentSize ?? ORNEK_APARTMENT_SIZE,
    globalUnitPrice: globalUnitPrice ?? ORNEK_GLOBAL_UNIT_PRICE,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/hesapla/calculatorUiHelpers.test.ts --no-coverage`
Expected: PASS, all tests including pre-existing ones in that file.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/calculatorUiHelpers.ts src/app/hesapla/calculatorUiHelpers.test.ts
git commit -m "feat(hesapla): örnek proje demo-fill yardımcısı ekle"
```

---

### Task 2: Nullable `globalUnitPrice` in `BirimMaliyetField` + `kaynakEtiketi`

**Files:**
- Modify: `src/app/hesapla/mobile/unitPriceSource.ts`
- Modify: `src/app/hesapla/mobile/unitPriceSource.test.ts`
- Modify: `src/app/hesapla/AdvancedSettingsSections.tsx`
- Modify: `src/app/hesapla/AdvancedSettingsSections.test.tsx`

**Interfaces:**
- Produces: `kaynakEtiketi(kaynak: BirimMaliyetKaynagi, deger: number | null): string` (returns `'—'` when `deger === null`), `BirimMaliyetFieldProps.globalUnitPrice: number | null`.
- Consumed by: Task 5 (`page.tsx` passes `globalUnitPrice: number | null` into both the desktop `BirimMaliyetField` call and the mobile `GelismisAyarlarSheet` call, which passes it through unchanged since its prop type is a spread of `BirimMaliyetFieldProps`).

- [ ] **Step 1: Write the failing tests**

In `src/app/hesapla/mobile/unitPriceSource.test.ts`, inside the existing `describe('kaynakEtiketi', ...)` block, add:

```ts
    it('deger null iken kaynak turunden bagimsiz tire doner', () => {
        expect(kaynakEtiketi({ tur: 'varsayilan' }, null)).toBe('—')
        expect(kaynakEtiketi({ tur: 'elle' }, null)).toBe('—')
    })
```

In `src/app/hesapla/AdvancedSettingsSections.test.tsx`, change the `Sarmalayici` signature to accept `null`:

```tsx
function Sarmalayici({ baslangic = 12000 }: { baslangic?: number | null }) {
  const [fiyat, setFiyat] = React.useState<number | null>(baslangic);
  ...
```

(the rest of `Sarmalayici` is unchanged — `useState<number | null>` just widens the type), then add a new test inside `describe('BirimMaliyetField ...')`:

```tsx
  it('baslangicta null iken alan bos gorunur ve kaynak etiketi tire gosterir', () => {
    render(<Sarmalayici baslangic={null} />);
    const input = screen.getByLabelText('Birim inşaat maliyeti (TL/m²)') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByText('—')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/hesapla/mobile/unitPriceSource.test.ts src/app/hesapla/AdvancedSettingsSections.test.tsx --no-coverage`
Expected: FAIL — TS error on `kaynakEtiketi(..., null)` (arg not assignable to `number`) and/or the null-render test fails because `String(null)` currently renders `"null"` in the input, not `""`.

- [ ] **Step 3: Implement**

In `src/app/hesapla/mobile/unitPriceSource.ts`, update `kaynakEtiketi`:

```ts
export function kaynakEtiketi(kaynak: BirimMaliyetKaynagi, deger: number | null): string {
    if (deger === null) return '—'
    const bicimli = `${trFormat.format(deger)} TL/m²`
    switch (kaynak.tur) {
        case 'ilce':
            return `${kaynak.ilce} ortalaması ${bicimli}`
        case 'elle':
            return `Elle girildi · ${bicimli}`
        case 'varsayilan':
            return `Varsayılan ${bicimli}`
        default: {
            const _tuketilmedi: never = kaynak
            return _tuketilmedi
        }
    }
}
```

In `src/app/hesapla/AdvancedSettingsSections.tsx`:

```ts
export interface BirimMaliyetFieldProps {
  globalUnitPrice: number | null;
  birimMaliyetKaynagi: BirimMaliyetKaynagi;
  onBirimMaliyet: (v: number) => void;
}
```

```ts
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const [girdi, setGirdi] = useState<string>(globalUnitPrice === null ? '' : String(globalUnitPrice));
  const [oncekiFiyat, setOncekiFiyat] = useState<number | null>(globalUnitPrice);
  if (globalUnitPrice !== oncekiFiyat) {
    setOncekiFiyat(globalUnitPrice);
    setGirdi(globalUnitPrice === null ? '' : String(globalUnitPrice));
  }
```

(the rest of the function — the `<input>` and its `onChange` — is unchanged; it already only calls `onBirimMaliyet` for `Number.isFinite(v) && v > 0`, so it already never emits `null`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/hesapla/mobile/unitPriceSource.test.ts src/app/hesapla/AdvancedSettingsSections.test.tsx --no-coverage`
Expected: PASS, all tests in both files (pre-existing + new).

Run: `npx tsc --noEmit`
Expected: New errors will appear at every call site that still passes a bare `number` where the prop is now `number | null` typed as required, OR — more likely at this point — no new errors yet, since `number` is assignable to `number | null`. The errors will instead surface once `page.tsx`'s `globalUnitPrice` state actually becomes nullable in Task 5. Confirm no *new* errors versus the pre-Task-2 baseline.

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/unitPriceSource.ts src/app/hesapla/mobile/unitPriceSource.test.ts src/app/hesapla/AdvancedSettingsSections.tsx src/app/hesapla/AdvancedSettingsSections.test.tsx
git commit -m "feat(hesapla): BirimMaliyetField ve kaynakEtiketi null birim maliyeti destekler"
```

---

### Task 3: Nullable `apartmentSize` in mobile `GirdiKarti`

**Files:**
- Modify: `src/app/hesapla/mobile/GirdiKarti.tsx`
- Modify: `src/app/hesapla/mobile/GirdiKarti.test.tsx`

**Interfaces:**
- Consumes: `ORNEK_APARTMENT_SIZE` from `../calculatorUiHelpers` (Task 1).
- Produces: `GirdiKartiProps.apartmentSize: number | null`; `onApartmentSize: (v: number) => void` signature is **unchanged** — it always emits a real number, never `null`.

- [ ] **Step 1: Write the failing tests**

In `src/app/hesapla/mobile/GirdiKarti.test.tsx`, add:

```tsx
    it('apartmentSize null iken deger yerine tire gosterir', () => {
        render(<GirdiKarti {...props({ apartmentSize: null })} />)
        expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('apartmentSize null iken azalt hicbir sey yapmaz', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: null, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).not.toHaveBeenCalled()
    })

    it('apartmentSize null iken artir varsayilan degere atlar', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: null, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi artır' }))
        expect(onApartmentSize).toHaveBeenCalledWith(140)
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/hesapla/mobile/GirdiKarti.test.tsx --no-coverage`
Expected: FAIL — TS error (`apartmentSize: null` not assignable to `number`) and/or `—` not found (currently renders `null` swallowed by React as nothing, or arithmetic on `null` produces `NaN`/crashes).

- [ ] **Step 3: Implement**

In `src/app/hesapla/mobile/GirdiKarti.tsx`, add the import and update the prop type + the two stepper handlers + the display span:

```ts
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
```

```ts
export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};
```

Replace the "Daire buyuklugu" block's display span and the two stepper buttons:

```tsx
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <span className={`${styles.stepperDeger} mNum`}>
                        {apartmentSize ?? '—'}
                        <span className={styles.stepperBirim}> m²</span>
                    </span>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/hesapla/mobile/GirdiKarti.test.tsx --no-coverage`
Expected: PASS, all tests including the pre-existing "metrekare artir/azalt 5 adimla calisir" and "metrekare minimum 50 nin altina inmez" tests (those still pass `apartmentSize: 140`/`50` via the `props()` default, unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/GirdiKarti.tsx src/app/hesapla/mobile/GirdiKarti.test.tsx
git commit -m "feat(hesapla): GirdiKarti mobil metrekare steppera null durumu ekler"
```

---

### Task 4: Nullable `apartmentSize`/`unitPrice` in `FiyatAciklamasi`

**Files:**
- Modify: `src/app/hesapla/mobile/FiyatAciklamasi.tsx`
- Modify: `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`

**Interfaces:**
- Produces: `FiyatAciklamasiProps.apartmentSize: number | null`, `.unitPrice: number | null`.

- [ ] **Step 1: Write the failing test**

In `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`, add to the `describe` block:

```tsx
    it('apartmentSize/unitPrice null iken insaat satirinda tire gosterir, "null" yazmaz', () => {
        render(<FiyatAciklamasi {...props({ apartmentSize: null, unitPrice: null, result: null })} />)
        expect(screen.getByText(/— m² × — TL\/m²/)).toBeInTheDocument()
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/mobile/FiyatAciklamasi.test.tsx --no-coverage`
Expected: FAIL — TS error (`apartmentSize: null` not assignable to `number`) and, once that's bypassed, the current code would render `"null m² × NaN TL/m²"` (`trFormat.format(null)` throws or produces garbage), not the expected `—`.

- [ ] **Step 3: Implement**

In `src/app/hesapla/mobile/FiyatAciklamasi.tsx`:

```ts
export type FiyatAciklamasiProps = {
    result: CalculationOutput | null;
    apartmentSize: number | null;
    unitPrice: number | null;
    landSharePercent: number;
    profitLabel: string;
    profitMultiplier: number;
    onKapat: () => void;
    onKarDegistir: () => void;
};
```

Replace the render line (the file already defines a local `fmt(n: number | null): string` at the top — reuse it, don't duplicate it):

```tsx
                        <span className={styles.aciklamaAlt}>
                            {fmt(apartmentSize)} m² × {fmt(unitPrice)} TL/m²
                        </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/hesapla/mobile/FiyatAciklamasi.test.tsx --no-coverage`
Expected: PASS, all tests including pre-existing ones (they pass `apartmentSize: 140, unitPrice: 12000` via `props()`, still render `140 m² × 12.000 TL/m²` since `fmt(140)` formats the same as the old direct interpolation for a non-null number).

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/mobile/FiyatAciklamasi.tsx src/app/hesapla/mobile/FiyatAciklamasi.test.tsx
git commit -m "feat(hesapla): FiyatAciklamasi null metrekare/birim fiyati tire ile gosterir"
```

---

### Task 5: Core wiring in `page.tsx` — nullable state, gate, `isDemoData`, handlers

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Test: `src/app/hesapla/page.test.tsx`

**Interfaces:**
- Consumes: `ornekProjeIleDeneDoldur`, `ORNEK_APARTMENT_SIZE`, `ORNEK_GLOBAL_UNIT_PRICE` (Task 1); nullable `BirimMaliyetFieldProps`/`GirdiKartiProps`/`FiyatAciklamasiProps` (Tasks 2–4).
- Produces (new `page.tsx` internals consumed by Tasks 6–8): `hasEnoughDataForResult: boolean`, `isDemoData: boolean`, `handleApartmentSizeChange(v: number | null): void`, `handleGlobalUnitPriceChange(v: number): void`, `handleOrnekProjeIleDene(): void`.

This task does **not** touch JSX beyond what's required to keep the app compiling with the new nullable types (the empty-state visuals are Tasks 6–8). It is the biggest task; work through the steps in order, and run `tsc` after each sub-step group, not just at the end — nullable-state propagation errors are easiest to fix one at a time.

- [ ] **Step 1: Add the failing/guiding test in `page.test.tsx`**

`page.test.tsx` already mocks every chart and heavy dependency (`next-auth`, `next/navigation`, `ScenarioCompare`, all 4 chart components). Add a new `describe` block using the same `viewportKur`/`beforeEach` fixtures already in the file:

```tsx
describe('/hesapla — boş durum + Örnek Proje ile Dene (masaüstü)', () => {
    it('sayfa ilk açıldığında hiçbir TL değeri göstermez, boş durum metni görünür', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        expect(await screen.findByText(/Sonuçları görmek için/)).toBeInTheDocument()
        expect(screen.queryByText(/Min\. Daire Fiyatı \(FD\)/)).not.toBeInTheDocument()
    })

    it('Örnek Proje ile Dene tıklanınca sonuç belirir ve buton kaybolur', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        expect(await screen.findByText(/Min\. Daire Fiyatı \(FD\)/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Örnek Proje ile Dene/i })).not.toBeInTheDocument()
    })

    it('Rapor Kaydet boş durumda devre dışıdır', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const butonlar = await screen.findAllByRole('button', { name: /Rapor Kaydet/i })
        butonlar.forEach(b => expect(b).toBeDisabled())
    })
})
```

(These reference JSX that doesn't exist until Tasks 6/8 land — that's expected; this step's job is to lock in the *behavioral contract* before you build the plumbing. If subagent-driven execution runs Task 5 standalone before Task 6, these three tests will fail for "text not found" reasons; that's fine, they'll go green once Task 6 lands. Do not skip writing them now — write them, watch them fail for the *expected* reason, and move on; Task 6's own steps will re-run this exact file.)

- [ ] **Step 2: Run to confirm the new tests fail for the expected reason**

Run: `npx jest src/app/hesapla/page.test.tsx --no-coverage`
Expected: FAIL on the 3 new tests — "Unable to find an element with the text: /Sonuçları görmek için/" (or similar). Pre-existing tests in the file must still PASS.

- [ ] **Step 3: Add the import and demo/gate state**

In `src/app/hesapla/page.tsx`, update the import line that currently reads:

```ts
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice } from './calculatorUiHelpers';
```

to:

```ts
import { computeEffectiveLandShareX, clampOwnerApartmentShare, parseMarketPrice, ornekProjeIleDeneDoldur } from './calculatorUiHelpers';
```

Change the two state declarations (currently lines 92 and 172):

```ts
  const [apartmentSize, setApartmentSize] = useState<number>(140);
```
→
```ts
  const [apartmentSize, setApartmentSize] = useState<number | null>(null);
```

```ts
  const [globalUnitPrice, setGlobalUnitPrice] = useState<number>(12000);
```
→
```ts
  const [globalUnitPrice, setGlobalUnitPrice] = useState<number | null>(null);
```

Add a new state right after `globalUnitPrice`'s declaration:

```ts
  // "Örnek Proje ile Dene" ile doldurulmus veri mi gosteriliyor. Kullanici
  // apartmentSize/globalUnitPrice alanlarindan birini eliyle degistirdiginde
  // otomatik false olur (bkz. handleApartmentSizeChange/handleGlobalUnitPriceChange).
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
```

- [ ] **Step 4: Add the gate constant and the three handlers**

Directly below the `isDemoData` state (or anywhere before the JSX return — grouping with the other handlers around `handleParcelConfirm` is fine), add:

```ts
  const hasEnoughDataForResult = apartmentSize !== null && globalUnitPrice !== null;

  const handleApartmentSizeChange = (v: number | null) => {
    setApartmentSize(v);
    setIsDemoData(false);
  };

  const handleGlobalUnitPriceChange = (v: number) => {
    setGlobalUnitPrice(v);
    setBirimMaliyetKaynagi({ tur: 'elle' });
    setIsDemoData(false);
  };

  const handleOrnekProjeIleDene = () => {
    const dolu = ornekProjeIleDeneDoldur({ apartmentSize, globalUnitPrice });
    if (apartmentSize === null) setApartmentSize(dolu.apartmentSize);
    if (globalUnitPrice === null) {
      setGlobalUnitPrice(dolu.globalUnitPrice);
      setBirimMaliyetKaynagi({ tur: 'varsayilan' });
    }
    setIsDemoData(true);
  };
```

- [ ] **Step 5: Gate the calculation `useEffect`**

Find the effect (currently starting at line 217):

```ts
  useEffect(() => {
    if (isApartmentCountEnabled) {
      ...
    }

    const activeLandShare = computeEffectiveLandShareX({...});

    const input: CalculationInput = {
      x: activeLandShare,
      ...
      Ad: apartmentSize,
      P: globalUnitPrice,
      ...
    };

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentShare, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);
```

Insert the gate check immediately after the `isApartmentCountEnabled` block, before `computeEffectiveLandShareX` is called:

```ts
  useEffect(() => {
    if (isApartmentCountEnabled) {
      const clamped = clampOwnerApartmentShare(ownerApartmentShare, totalApartments);
      if (clamped !== ownerApartmentShare) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- totalApartments azaltılınca ownerApartmentShare'i sınırlar
        setOwnerApartmentShare(clamped);
        return;
      }
    }

    if (apartmentSize === null || globalUnitPrice === null) {
      setResult(null);
      return;
    }

    const activeLandShare = computeEffectiveLandShareX({
      isApartmentCountEnabled,
      ownerApartmentShare,
      totalApartments,
      landShareRatio,
    });

    const input: CalculationInput = {
      x: activeLandShare,
      L: luxLevel,
      Ad: apartmentSize,
      P: globalUnitPrice,
      K: builderProfit,

      Sd: isApartmentCountEnabled ? totalApartments : undefined,
      Aa: isAaEnabled ? arsaAlani : undefined,

      isRiskEnabled: riskLevel > 0,
      R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,

      isExcavationEnabled: iksaMode !== 'off',
      excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
      Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
      MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
    };

    const res = CalculatorEngineV2.calculate(input);
    setResult(res);
  }, [luxLevel, apartmentSize, totalApartments, ownerApartmentShare, landShareRatio, builderProfit, riskLevel, isApartmentCountEnabled, iksaMode, iksaPercentage, iksaManualTL, isAaEnabled, arsaAlani, globalUnitPrice]);
```

`apartmentSize`/`globalUnitPrice` are narrowed to `number` by the early-return guard for the rest of this closure, so `Ad: apartmentSize, P: globalUnitPrice` type-checks with no cast.

- [ ] **Step 6: Fix the three `!result`-guarded handlers that read `apartmentSize` as a bare `number`**

`handleSaveReport`, `handlePdfDownload`, and `handleAddScenario` all start with `if (!result) return;`. `result` is only ever non-null when `hasEnoughDataForResult` was true at the last effect run (Step 5's gate), so `apartmentSize`/`globalUnitPrice` are runtime-guaranteed non-null inside these functions — but TypeScript can't infer that across unrelated variables, so each read needs a narrow, commented cast.

In `handleSaveReport` (currently `apartmentSizeSqm: apartmentSize,`):

```ts
          // result dolu ise apartmentSize de doludur (hasEnoughDataForResult
          // geçidi ikisini birlikte garanti eder — bkz. useEffect).
          apartmentSizeSqm: apartmentSize as number,
```

In `handlePdfDownload` (currently `apartmentSize,`):

```ts
    await generatePdfReport({
      luxLevel,
      apartmentSize: apartmentSize as number, // result dolu ise apartmentSize de doludur
      landShareRatio: effectiveLandShareRatio,
      ...
```

In `handleAddScenario` (currently `apartmentSize,` inside the pushed `ScenarioItem`):

```ts
      return [...prev, {
        id: Date.now().toString(),
        name: `Senaryo ${prev.length + 1}`,
        luxLevel,
        apartmentSize: apartmentSize as number, // result dolu ise apartmentSize de doludur
        landShareRatio: effectiveLandShareRatio / 100,
        ...
```

- [ ] **Step 7: Fix `chartBaseInput`**

This object feeds `SensitivityChart`/`BreakEvenChart` unconditionally (not gated behind `result`), so it needs a real fallback, not a cast — `0` matches the pattern the file already used for `result ? x : 0` elsewhere:

```ts
  const chartBaseInput: CalculationInput = {
    x: effectiveLandShareRatio / 100,
    L: luxLevel,
    Ad: apartmentSize ?? 0,
    P: globalUnitPrice ?? 0,
    K: builderProfit,
    Sd: isApartmentCountEnabled ? totalApartments : undefined,
    Aa: isAaEnabled ? arsaAlani : undefined,
    isRiskEnabled: riskLevel > 0,
    R: riskLevel > 0 ? 1 + (riskLevel / 100) : 1,
    isExcavationEnabled: iksaMode !== 'off',
    excavationMode: iksaMode === 'manual' ? 'manual' : 'percentage',
    Z: iksaMode === 'percentage' ? (iksaPercentage / 100) : 0,
    MzOriginal: iksaMode === 'manual' ? iksaManualTL : 0,
  };
```

- [ ] **Step 8: Wire the handlers into every call site that sets `apartmentSize`/`globalUnitPrice`**

Desktop stepper input (currently lines ~611-621, "Ortalama Daire Metrekaresi"):

```tsx
            <div className={styles.settingsGroup}>
              <h4>Ortalama Daire Metrekaresi</h4>
              <div className={styles.stepperInput}>
                <input
                  type="number"
                  value={apartmentSize ?? ''}
                  onChange={(e) => handleApartmentSizeChange(e.target.value === '' ? null : Number(e.target.value))}
                />
                <div className={styles.stepperRight}>
                  <span>m²</span>
                  <button onClick={() => { if (apartmentSize !== null) handleApartmentSizeChange(Math.max(50, apartmentSize - 5)); }}>−</button>
                  <button onClick={() => handleApartmentSizeChange(apartmentSize === null ? 140 : apartmentSize + 5)}>+</button>
                </div>
              </div>
            </div>
```

Desktop `BirimMaliyetField` call (currently inside "Piyasa Analizi" group):

```tsx
              <BirimMaliyetField
                globalUnitPrice={globalUnitPrice}
                birimMaliyetKaynagi={birimMaliyetKaynagi}
                onBirimMaliyet={handleGlobalUnitPriceChange}
              />
```

Mobile `GelismisAyarlarSheet` call (currently `onBirimMaliyet={(v: number) => { setGlobalUnitPrice(v); setBirimMaliyetKaynagi({ tur: 'elle' }); }}`):

```tsx
          onBirimMaliyet={handleGlobalUnitPriceChange}
```

Mobile `girdi` prop object passed to `<HesaplaMobile>` (currently `apartmentSize, onApartmentSize: setApartmentSize,`):

```ts
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
```

- [ ] **Step 9: Fix the "Rapor Kaydet" disabled bug (spec's found-and-scoped-in defect)**

Three call sites all wire `handleSaveReport`, all currently disabled only by `isSaving`. Fix all three for consistency with the `!result` pattern `PDF İndir`/`+ Karşılaştır` already use:

`actionsSection`'s Button (currently `disabled={isSaving}`):
```tsx
        <Button variant="primary" onClick={handleSaveReport} disabled={!result || isSaving} className={styles.sealPrimaryBtn}>
```

Desktop `StickyActionBar` button (currently `disabled={isSaving}`):
```tsx
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={!result || isSaving}>
```

Mobile CTA — currently `ctaDevreDisi={isSaving}` in the `<HesaplaMobile>` call:
```tsx
          ctaDevreDisi={!result || isSaving}
```

- [ ] **Step 10: Run typecheck and full test suite**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). If errors remain, they'll point at exactly one of Steps 6–9's call sites — fix in place, don't add a blanket cast anywhere not listed above.

Run: `npx jest --no-coverage`
Expected: The 3 new tests from Step 1 still fail (expected — Task 6 hasn't landed the JSX yet). Every other test file (including `GirdiKarti.test.tsx`, `AdvancedSettingsSections.test.tsx`, `FiyatAciklamasi.test.tsx`, `unitPriceSource.test.ts`, `calculatorUiHelpers.test.ts` from Tasks 1–4, and `HesapFisi.test.tsx`/`SonucKarti.test.tsx` untouched) must PASS.

- [ ] **Step 11: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.test.tsx
git commit -m "feat(hesapla): apartmentSize/globalUnitPrice null baslangicli, sonuc gecidi ve Rapor Kaydet duzeltmesi"
```

---

### Task 6: Desktop "Hesap Sonuçları" panel empty state + "Örnek Veri" badge

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css`
- Test: `src/app/hesapla/page.test.tsx` (the 3 tests from Task 5 Step 1 go green here)

**Interfaces:**
- Consumes: `hasEnoughDataForResult`, `isDemoData`, `handleOrnekProjeIleDene` (Task 5).

- [ ] **Step 1: Confirm the guiding tests from Task 5 are still red**

Run: `npx jest src/app/hesapla/page.test.tsx --no-coverage`
Expected: The 3 tests added in Task 5 Step 1 FAIL (JSX not built yet); all other tests in the file PASS.

- [ ] **Step 2: Add the title badge**

Find the panel title (currently):

```tsx
            <h2 className={styles.mainPanelTitle}>Hesap Sonuçları <span className={`${styles.pill} ${styles.pillSmall}`}>Engine v2</span></h2>
```

Change to:

```tsx
            <h2 className={styles.mainPanelTitle}>
              Hesap Sonuçları <span className={`${styles.pill} ${styles.pillSmall}`}>Engine v2</span>
              {isDemoData && <span className={styles.demoBadge}>Örnek Veri</span>}
            </h2>
```

- [ ] **Step 3: Replace `HesapFisi` + the stats row with a boş-durum / real-content switch**

Find this block (currently right after the title, `<HesapFisi result={result} />` through the closing of the `.statsRow` wrapper — roughly the "Yapisal gruplama sarmalayicisi" comment through its closing `</div>`):

```tsx
            <HesapFisi result={result} />

            {/* Yapisal gruplama sarmalayicisi. ... */}
            <div>
            <div className={styles.statsRow}>
              {isApartmentCountEnabled && (
                <div className={styles.statCard}>
                  ...
                </div>
              )}

              <div className={styles.statCard}>
                <h5>Piyasa Değerine Göre</h5>
                <div className={styles.chartCenter}>
                  <PriceEvaluationChart
                    minPrice={result ? result.FD_total : 0}
                    marketPrice={marketPriceNum}
                  />
                </div>
              </div>
            </div>
            </div>
```

Wrap the whole thing in the gate, keeping the exact JSX above as the "real content" branch and adding an empty-state branch:

```tsx
            {hasEnoughDataForResult ? (
              <>
                <HesapFisi result={result} />

                {/* Yapisal gruplama sarmalayicisi. `.mainPanelResults` sinifi
                    KALDIRILDI: tek kurali Task 5'te silinen `data-revealed`
                    kapisiydi, geriye hicbir CSS kurali olmayan bir sinif adi
                    kalmisti. DOM derinligi bilerek korunuyor. */}
                <div>
                <div className={styles.statsRow}>
                  {/* Arsa Fiyatı — sadece Sd açıkken görünür */}
                  {isApartmentCountEnabled && (
                    <div className={styles.statCard}>
                      <h5>Arsa Fiyatı (Arsa Sahibine)</h5>
                      <div className={styles.statCardValue}>
                        {result?.FA ? result.FA.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '—'}
                        <span>TL</span>
                      </div>
                      <div className={styles.statCardSub}>
                        <span>Daire Payı:</span>
                        <span><strong>{result?.Sdx != null ? Number(result.Sdx).toFixed(1) : '—'}</strong> daire</span>
                      </div>
                      {isAaEnabled && result?.FAbirim != null && (
                        <div className={`${styles.statCardSub} ${styles.statCardSubSpaced}`}>
                          <span>Arsa Birim:</span>
                          <span><strong>{result.FAbirim.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> TL/m²</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.statCard}>
                    <h5>Piyasa Değerine Göre</h5>
                    <div className={styles.chartCenter}>
                      <PriceEvaluationChart
                        minPrice={result ? result.FD_total : 0}
                        marketPrice={marketPriceNum}
                      />
                    </div>
                  </div>
                </div>
                </div>
              </>
            ) : (
              <div className={styles.resultsEmptyState}>
                <p className={styles.resultsEmptyText}>
                  Sonuçları görmek için parsel seçin ya da daire m² ve birim maliyeti girin.
                </p>
                <Button variant="outline" onClick={handleOrnekProjeIleDene}>
                  Örnek Proje ile Dene
                </Button>
              </div>
            )}
```

(`Button` is already imported at the top of `page.tsx`.)

- [ ] **Step 4: Add the CSS**

Append to `src/app/hesapla/page.module.css` (near `.hesapFisi`, e.g. right after its rule block):

```css
.resultsEmptyState {
    margin: 0 16px 16px;
    padding: 24px 16px;
    border-radius: 20px;
    background: var(--seal-surface, var(--m-glass-bg, rgba(255, 255, 255, .66)));
    border: 1px solid var(--seal-border-soft, var(--m-glass-border, rgba(255, 255, 255, .92)));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
}

.resultsEmptyText {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
    max-width: 40ch;
}

.demoBadge {
    font-size: 11px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(var(--seal-accent-rgb, 43, 124, 255), 0.14);
    color: var(--seal-accent, var(--brand-blue, #1f6feb));
    letter-spacing: .2px;
    vertical-align: middle;
}
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/app/hesapla/page.test.tsx --no-coverage`
Expected: PASS — including the 3 tests from Task 5 Step 1 now going green.

Run: `npx tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/page.test.tsx
git commit -m "feat(hesapla): masaüstü Hesap Sonuçları paneli boş durum + Örnek Veri rozeti"
```

---

### Task 7: Desktop "Hassasiyet & Kırılma" pager page — empty guard

**Why this task exists:** before this feature, `apartmentSize`/`globalUnitPrice` could never be `0`/`null`, so `chartBaseInput` (Task 5 Step 7) always carried real numbers into `SensitivityChart`/`BreakEvenChart`. Now, during the empty state, `chartBaseInput.Ad`/`.P` fall back to `0`, and neither chart component has its own zero-guard (confirmed by reading both — unlike `CostBreakdownChart`, which already has one). Without this task, opening the "Hassasiyet & Kırılma" pager page while empty silently shows degenerate zero-value charts instead of the friendly message the mobile equivalent (`AnalizSekmesi`) already shows for the identical scenario. This closes that gap for consistency between the two platforms.

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Modify: `src/app/hesapla/page.module.css`

**Interfaces:**
- Consumes: `hasEnoughDataForResult` (Task 5).

- [ ] **Step 1: Wrap Page 1 of the pager in the gate**

Find (currently inside `.pagerTrack`, the second `.pagerPage`):

```tsx
                {/* Page 1: Hassasiyet + Kırılma Noktası */}
                <div className={styles.pagerPage}>
                  <div className={styles.chartBlock}>
                    <SensitivityChart baseInput={chartBaseInput} />
                  </div>
                  <div className={styles.chartDivider}>
                    <BreakEvenChart
                      baseInput={chartBaseInput}
                      marketPrice={marketPriceNum}
                    />
                  </div>
                </div>
```

Replace with:

```tsx
                {/* Page 1: Hassasiyet + Kırılma Noktası */}
                <div className={styles.pagerPage}>
                  {hasEnoughDataForResult ? (
                    <>
                      <div className={styles.chartBlock}>
                        <SensitivityChart baseInput={chartBaseInput} />
                      </div>
                      <div className={styles.chartDivider}>
                        <BreakEvenChart
                          baseInput={chartBaseInput}
                          marketPrice={marketPriceNum}
                        />
                      </div>
                    </>
                  ) : (
                    <p className={styles.pagerEmptyText}>
                      Hesap sonucu oluşunca grafikler burada görünecek. Girdileri tamamlayıp sonucun hesaplanmasını bekleyin.
                    </p>
                  )}
                </div>
```

(This message intentionally matches `AnalizSekmesi.tsx`'s `.analizBosMetin` wording verbatim — same feature, same platform-neutral copy.)

- [ ] **Step 2: Add the CSS**

Append to `src/app/hesapla/page.module.css`:

```css
.pagerEmptyText {
    margin: 24px 16px;
    color: var(--muted);
    font-size: 0.85rem;
    text-align: center;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors).

There is no dedicated Jest test for this task — `page.test.tsx` mocks `SensitivityChart`/`BreakEvenChart` entirely (they render `<div/>`), so a Jest assertion here would only prove the mock branch works, not real chart behavior. This is verified visually in Task 9's Playwright pass instead (open the "Hassasiyet & Kırılma" pager dot while empty, confirm the message shows and no chart canvas errors appear in the console).

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css
git commit -m "fix(hesapla): masaüstü Hassasiyet & Kırılma sayfası boş durumda grafik yerine mesaj gösterir"
```

---

### Task 8: Mobile `SonucKarti` empty state + "Örnek Veri" badge

**Files:**
- Modify: `src/app/hesapla/mobile/SonucKarti.tsx`
- Modify: `src/app/hesapla/mobile/SonucKarti.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`
- Modify: `src/app/hesapla/page.tsx` (wire the 3 new props through)

**Interfaces:**
- Produces: `SonucKartiProps.hasEnoughDataForResult: boolean`, `.isDemoData: boolean`, `.onOrnekProjeIleDene: () => void`.
- Consumes (in `page.tsx`): `hasEnoughDataForResult`, `isDemoData`, `handleOrnekProjeIleDene` (Task 5).

- [ ] **Step 1: Write the failing tests**

In `src/app/hesapla/mobile/SonucKarti.test.tsx`, update `BASE` to include the 3 new required props, then add new tests:

```tsx
const BASE = {
    minDaireFiyati: 8964000,
    arsaPayiYuzde: 33,
    birimFiyat: 64028,
    karsilastirma: {
        piyasaFiyati: '10.000.000',
        onPiyasaFiyati: jest.fn(),
        farkYuzde: -14,
    },
    hasEnoughDataForResult: true,
    isDemoData: false,
    onOrnekProjeIleDene: jest.fn(),
    onFisAc: jest.fn(),
    onAnalizAc: jest.fn(),
}
```

Add to the `describe('SonucKarti', ...)` block:

```tsx
    it('hasEnoughDataForResult false iken fiyat yerine davet metni ve buton gosterir', () => {
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} />)
        expect(screen.getByText(/Sonuçları görmek için/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Örnek Proje ile Dene/ })).toBeInTheDocument()
        expect(screen.queryByText('Min. daire fiyatı')).not.toBeInTheDocument()
    })

    it('hasEnoughDataForResult false iken metrikler ve karsilastirma blogu gizlenir', () => {
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} />)
        expect(screen.queryByText('Arsa payı')).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/Yaklaşık piyasa fiyatı/)).not.toBeInTheDocument()
    })

    it('Örnek Proje ile Dene tiklaninca onOrnekProjeIleDene cagirilir', async () => {
        const onOrnekProjeIleDene = jest.fn()
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} onOrnekProjeIleDene={onOrnekProjeIleDene} />)
        await userEvent.click(screen.getByRole('button', { name: /Örnek Proje ile Dene/ }))
        expect(onOrnekProjeIleDene).toHaveBeenCalledTimes(1)
    })

    it('hasEnoughDataForResult true iken buton ve davet metni gorunmez', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.queryByRole('button', { name: /Örnek Proje ile Dene/ })).toBeNull()
        expect(screen.queryByText(/Sonuçları görmek için/)).toBeNull()
    })

    it('isDemoData true iken Örnek Veri rozeti gorunur', () => {
        render(<SonucKarti {...BASE} isDemoData={true} />)
        expect(screen.getByText('Örnek Veri')).toBeInTheDocument()
    })

    it('isDemoData false iken Örnek Veri rozeti gorunmez', () => {
        render(<SonucKarti {...BASE} isDemoData={false} />)
        expect(screen.queryByText('Örnek Veri')).toBeNull()
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/hesapla/mobile/SonucKarti.test.tsx --no-coverage`
Expected: FAIL — TS errors (missing required props) and/or missing elements.

- [ ] **Step 3: Implement**

In `src/app/hesapla/mobile/SonucKarti.tsx`:

```ts
export type SonucKartiProps = {
    minDaireFiyati: number | null;
    arsaPayiYuzde: number;
    birimFiyat: number | null;
    karsilastirma: KarsilastirmaBloguProps;
    hasEnoughDataForResult: boolean;
    isDemoData: boolean;
    onOrnekProjeIleDene: () => void;
    onFisAc: () => void;
    onAnalizAc: () => void;
};
```

```tsx
export function SonucKarti({
    minDaireFiyati,
    arsaPayiYuzde,
    birimFiyat,
    karsilastirma,
    hasEnoughDataForResult,
    isDemoData,
    onOrnekProjeIleDene,
    onFisAc,
    onAnalizAc,
}: SonucKartiProps) {
    return (
        <div className={styles.sonucKarti}>
            <div className={styles.sonucIsik} aria-hidden="true" />

            <div className={styles.sonucUst}>
                {hasEnoughDataForResult ? (
                    <div className={styles.sonucFiyatWrap}>
                        <span className={styles.sonucEtiket}>
                            Min. daire fiyatı
                            {isDemoData && <span className={styles.ornekVeriRozeti}>Örnek Veri</span>}
                        </span>
                        <span className={`${styles.sonucFiyat} mNum`}>
                            {fmt(minDaireFiyati)}
                            {minDaireFiyati !== null && <span className={styles.sonucBirim}> TL</span>}
                        </span>
                    </div>
                ) : (
                    <div className={styles.sonucBosWrap}>
                        <p className={styles.sonucBosMetin}>
                            Sonuçları görmek için parsel seçin ya da daire m² ve birim maliyeti girin
                        </p>
                        <button type="button" className={styles.ornekProjeBtnMobil} onClick={onOrnekProjeIleDene}>
                            Örnek Proje ile Dene
                        </button>
                    </div>
                )}
            </div>

            {hasEnoughDataForResult && (
                <>
                    <div className={styles.sonucMetrikler}>
                        <div className={styles.metrikKutu}>
                            <span className={styles.metrikEtiket}>Arsa payı</span>
                            <span className={`${styles.metrikDeger} mNum`}>%{trFormat.format(arsaPayiYuzde)}</span>
                        </div>
                        <div className={styles.metrikKutu}>
                            <span className={styles.metrikEtiket}>Birim</span>
                            <span className={`${styles.metrikDeger} mNum`}>
                                {fmt(birimFiyat)}
                                {birimFiyat !== null && <span className={styles.metrikBirimKucuk}>/m²</span>}
                            </span>
                        </div>
                    </div>

                    <KarsilastirmaBlogu {...karsilastirma} />
                </>
            )}

            <button type="button" className={styles.fisButonu} onClick={onFisAc}>
                Hesap fişi · Mi → Ma → M → ×K → FD
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            <button type="button" className={styles.fisButonu} onClick={onAnalizAc}>
                Analiz · maliyet dağılımı, hassasiyet, kırılma
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
        </div>
    );
}
```

("Hesap fişi"/"Analiz" nav buttons stay visible and enabled in the empty state — both target screens already render their own null-safe empty content, verified while reading `HesapFisi.tsx` and `AnalizSekmesi.tsx`.)

- [ ] **Step 4: Add the CSS**

Append to the `@media (max-width: 768px)` block in `src/app/hesapla/mobile/mobile.module.css` (near `.sonucFiyatWrap`/`.sonucEtiket`, e.g. right after `.sonucBirim`'s rule):

```css
    .sonucBosWrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
    }

    .sonucBosMetin {
        margin: 0;
        font: 600 13px Inter, sans-serif;
        color: rgba(255, 255, 255, .92);
        line-height: 1.4;
    }

    .ornekProjeBtnMobil {
        align-self: flex-start;
        padding: 9px 16px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, .4);
        background: rgba(255, 255, 255, .16);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #fff;
        font: 700 12px Inter, sans-serif;
        cursor: pointer;
    }

    .ornekVeriRozeti {
        display: inline-block;
        margin-left: 6px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, .92);
        color: var(--m-ink);
        font: 800 9px Inter, sans-serif;
        letter-spacing: .3px;
        text-transform: none;
        vertical-align: middle;
    }
```

- [ ] **Step 5: Wire the 3 new props in `page.tsx`**

Find the `sonuc` object passed to `<HesaplaMobile>` (currently):

```tsx
          sonuc={{
            minDaireFiyati: sonucDegeri(result?.FD_total),
            arsaPayiYuzde: Math.round(effectiveLandShareRatio),
            birimFiyat: sonucDegeri(result?.FD_per_m2),
            karsilastirma: {
              piyasaFiyati: manualMarketPrice,
              onPiyasaFiyati: setManualMarketPrice,
              farkYuzde: piyasaFarkiYuzdesi(result?.FD_total, marketPriceNum),
            },
            onFisAc: () => setMobilFisAcik(true),
            onAnalizAc: () => setMobilAnalizAcik(true),
          }}
```

Add the 3 new fields:

```tsx
          sonuc={{
            minDaireFiyati: sonucDegeri(result?.FD_total),
            arsaPayiYuzde: Math.round(effectiveLandShareRatio),
            birimFiyat: sonucDegeri(result?.FD_per_m2),
            karsilastirma: {
              piyasaFiyati: manualMarketPrice,
              onPiyasaFiyati: setManualMarketPrice,
              farkYuzde: piyasaFarkiYuzdesi(result?.FD_total, marketPriceNum),
            },
            hasEnoughDataForResult,
            isDemoData,
            onOrnekProjeIleDene: handleOrnekProjeIleDene,
            onFisAc: () => setMobilFisAcik(true),
            onAnalizAc: () => setMobilAnalizAcik(true),
          }}
```

- [ ] **Step 6: Run tests**

Run: `npx jest src/app/hesapla/mobile/SonucKarti.test.tsx --no-coverage`
Expected: PASS, all tests (pre-existing `BASE`-driven ones now carry the 3 new required props and still pass unchanged).

Run: `npx tsc --noEmit`
Expected: PASS (0 errors).

Run: `npx jest --no-coverage` (full suite)
Expected: PASS across the whole repo.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/mobile/SonucKarti.tsx src/app/hesapla/mobile/SonucKarti.test.tsx src/app/hesapla/mobile/mobile.module.css src/app/hesapla/page.tsx
git commit -m "feat(hesapla): mobil SonucKarti boş durum davet metni, Örnek Proje butonu ve Örnek Veri rozeti"
```

---

### Task 9: Live verification (Playwright, desktop + mobile viewport)

**Files:** none (manual/scripted browser verification only — no code changes).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev:next` (or the project's usual dev command) and open `/hesapla`.

- [ ] **Step 2: Desktop viewport — empty state**

Load the page at a desktop-width viewport (≥769px). Confirm:
- No TL value is shown anywhere on load (no "Hesap Sonuçları" numbers, no "Piyasa Değerine Göre" bar with a nonzero value).
- The "Hesap Sonuçları" panel shows the explanatory text and the "Örnek Proje ile Dene" button.
- The "Hesap Özeti" panel's Dağılım page shows "Hesaplama bekleniyor..." (pre-existing `CostBreakdownChart` behavior, now correctly reached).
- Clicking the "Hassasiyet & Kırılma" pager dot shows the new empty message (Task 7), not degenerate/flat charts.
- "Rapor Kaydet" is visibly disabled (both the panel's action row and, if the viewport is narrow enough to show it, the sticky CTA).

- [ ] **Step 3: Desktop viewport — Örnek Proje ile Dene**

Click "Örnek Proje ile Dene". Confirm:
- The daire metrekaresi field shows `140`, the birim maliyet field (open "Piyasa Analizi") shows `12.000` with kaynak etiketi "Varsayılan 12.000 TL/m²".
- "Hesap Sonuçları" now shows real numbers (`Min. Daire Fiyatı (FD)` etc.).
- The "Örnek Veri" badge appears next to the "Hesap Sonuçları" title.
- The "Örnek Proje ile Dene" button is gone.
- "Rapor Kaydet" is now enabled.

- [ ] **Step 4: Desktop viewport — editing clears the badge**

With the demo data still showing, change the "Ortalama Daire Metrekaresi" field by hand (type a different number or use the +/− buttons). Confirm the "Örnek Veri" badge disappears immediately and the result updates to reflect the new value.

- [ ] **Step 5: Desktop viewport — parcel selection does not fake-fill**

Reload the page (fresh empty state). Click "Haritadan parsel seç" and confirm a parcel (or simulate the flow if a real TKGM lookup isn't available in the dev environment). Confirm:
- Arsa alanı / risk get populated as before.
- The "Hesap Sonuçları" panel **still** shows the empty state (daire m²/birim maliyet are still null) — parcel selection alone does not open the gate.

- [ ] **Step 6: Mobile viewport — repeat Steps 2–4**

Resize to a mobile viewport (≤768px, or use device emulation). Confirm:
- The hero card shows the invite text + "Örnek Proje ile Dene" button instead of "MIN. DAİRE FİYATI".
- The "Arsa payı"/"Birim" metric boxes and the market-comparison block are hidden while empty.
- Tapping the button fills the demo values, shows the "Örnek Veri" badge next to "Min. daire fiyatı", and reveals the metric boxes + comparison block.
- The sticky CTA ("Özet Rapor Oluştur") is disabled while empty, enabled after the demo fill.
- Opening "Hesap fişi" while empty shows `—` rows, not `null`/`NaN`.
- Opening "Analiz" while empty shows the pre-existing friendly empty message (unchanged, verify it still works after the type changes).

- [ ] **Step 7: Report back**

Summarize pass/fail for each step above. If any step fails, that's a real regression this plan introduced — fix the specific task responsible before considering the branch done, not a follow-up item.

---

## Self-Review Notes

- **Spec coverage:** every UI requirement in the approved spec (`docs/superpowers/specs/2026-08-06-hesapla-bos-durum-ornek-proje-design.md`) maps to a task — nullable state model (Task 5), gate condition (Task 5 Step 5), `isDemoData` behavior (Task 5 Step 4 + Tasks 6/8), desktop UI (Task 6), mobile UI (Task 8), Rapor Kaydet fix (Task 5 Step 9), edge cases — stepper null jump/no-op (Tasks 3, 5 Step 8), parcel selection not opening the gate (unchanged by construction, verified in Task 9 Step 5).
- **Beyond the literal spec text, found by reading the code, included because leaving them out would be an inconsistent half-fix:** `kaynakEtiketi`/`BirimMaliyetField` nullability (Task 2), `GirdiKarti` mobile stepper nullability (Task 3), `FiyatAciklamasi` nullability (Task 4), the 3rd Rapor Kaydet site (mobile `ctaDevreDisi`, Task 5 Step 9), and the desktop Page 1 chart guard (Task 7). Each of these has its "why" documented inline in its task.
- **Confirmed already safe, no task needed:** `HesapFisi`, `CostBreakdownChart`, `AnalizSekmesi`, `FinancialDashboard`'s conditional render — all read directly, all already null-tolerant.
- **No "load saved scenario into the form" feature exists in the codebase** (`grep` confirmed `savedScenarios` is only used for `handleAddScenario`/`handleRemoveScenario`/comparison — there's no reverse "load scenario back into inputs" flow), so the spec's note about that interaction is currently moot; no task added for it.
