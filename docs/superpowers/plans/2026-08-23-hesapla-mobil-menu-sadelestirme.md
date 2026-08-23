# /hesapla Mobil Menü Sadeleştirmesi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the mobile `/hesapla` result card's 7 flat, equal-weight
menu buttons down to 3 (Sonuç Detayı, Tasarım Stüdyosu, Arsa Sahibi
Teklifi), removing a real content duplication (Hesap Fişi vs. Analiz's
cost-breakdown chart) and a naming collision (two unrelated features
both called "senaryo").

**Architecture:** No new state-management pattern, no new backend. Two
existing full-screen "leaf" components (`FiyatAciklamasi`,
`AnalizSekmesi`) lose their own headers and get merged into one new
tabbed leaf (`SonucDetayiMobileLeaf`). Four existing leaves
(`Studio2DMobileLeaf`, `ProgramMixMobileLeaf`, `StudioMobileLeaf`,
`StudioScenarioMobileLeaf`) are left completely untouched internally
and get a new nested-menu entry point (`TasarimStudyosuHub`) in front of
them. `SonucKarti.tsx` and `HesaplaMobile.tsx`'s ternary chain are
updated to match. `page.tsx`'s `mobilFisAcik`+`mobilAnalizAcik` merge
into one `mobilSonucDetayiAcik`; a new `mobilStudioHubAcik` is added;
the four existing studio-leaf flags are untouched.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Jest +
React Testing Library, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-08-23-hesapla-mobil-menu-sadelestirme-design.md`

## Global Constraints

- Masaüstü (desktop) JSX is never touched — everything in this plan is
  under `src/app/hesapla/mobile/`, plus one file (`page.tsx`) where
  only mobile-prefixed (`mobil*`) state is touched.
- The calculation-scenario system (pill row, "+ Karşılaştır" CTA,
  `SenaryoKarsilastirmaSekmesi.tsx`, `karsilastirmaAcik` state) is never
  touched.
- No component that renders real business logic
  (`StudioPreview`, `Studio2DPreview`, `StudioLayoutControls`,
  `ProgramMixPanel`, `LandownerOfferPanel`, `StudioScenarioBar`,
  `ScenarioComparison`, `CostBreakdownChart`, `SensitivityChart`,
  `BreakEvenChart`, `FinancialDashboard`, `HesapFisi`) is modified —
  only how they're wrapped/entered.
- Every task ends green on: `npx tsc --noEmit` (0 errors) and
  `npx jest src/app/hesapla` (or the specific files touched).
- Turkish variable/label conventions in this codebase use ASCII in code
  (`Acik`, not `Açık`) but full Turkish diacritics in UI copy and test
  strings — follow exactly what's already there.

---

### Task 1: Strip FiyatAciklamasi's own header/Kapat

**Files:**
- Modify: `src/app/hesapla/mobile/FiyatAciklamasi.tsx`
- Test: `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FiyatAciklamasi` component whose prop type
  (`FiyatAciklamasiProps`) no longer has `onKapat`. All other props
  (`result`, `apartmentSize`, `unitPrice`, `landSharePercent`,
  `profitLabel`, `profitMultiplier`, `onKarDegistir`) are unchanged.
  The component's root JSX no longer renders a `<header>`/"Kapat"
  button — it starts directly at the `<ol>` of price-breakdown rows.
  Task 3 depends on this shape.

- [ ] **Step 1: Update the test file — remove the Kapat test, add a "no own header" test**

Edit `src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`:

Remove `onKapat: jest.fn(),` from the `props()` helper (line 15), so it reads:

```ts
function props(patch = {}) {
    return {
        result: RESULT, apartmentSize: 140, unitPrice: 12000,
        landSharePercent: 33, profitLabel: 'Orta', profitMultiplier: 1.3,
        onKarDegistir: jest.fn(), ...patch,
    }
}
```

Delete this entire test block (lines 77-82):

```ts
    it('kapat butonu onKapat i cagirir', async () => {
        const onKapat = jest.fn()
        render(<FiyatAciklamasi {...props({ onKapat })} />)
        await userEvent.click(screen.getByRole('button', { name: /Kapat/ }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })
```

Add this new test right after the `describe('FiyatAciklamasi', () => {` line:

```ts
    it('kendi basligini/Kapat butonunu render ETMEZ — sarmalayan yaprak sahiplenir', () => {
        render(<FiyatAciklamasi {...props()} />)
        expect(screen.queryByRole('button', { name: /Kapat/ })).toBeNull()
        expect(screen.queryByText('Bu fiyat nereden geliyor?')).toBeNull()
    })
```

- [ ] **Step 2: Run the test file, verify the new test fails**

Run: `npx jest src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`
Expected: the new "kendi basligini/Kapat butonunu render ETMEZ" test
FAILS (the header/button still render). All other tests still pass.

- [ ] **Step 3: Remove the header from the component**

In `src/app/hesapla/mobile/FiyatAciklamasi.tsx`:

Remove `onKapat: () => void;` from the `FiyatAciklamasiProps` type
(line 19).

Remove `onKapat,` from the destructured props in the function signature
(line 57).

Delete this block (lines 82-87):

```tsx
            <header className={styles.aciklamaBaslik}>
                <h2 className={styles.aciklamaBaslikMetin}>Bu fiyat nereden geliyor?</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

```

The `<section className={styles.fiyatAciklamasi} aria-label="Bu fiyat nereden geliyor?">` opening tag stays (harmless a11y label, no visible header), so the section now opens directly into the `<ol className={styles.aciklamaSatirlar}>`.

- [ ] **Step 4: Run the test file, verify it passes**

Run: `npx jest src/app/hesapla/mobile/FiyatAciklamasi.test.tsx`
Expected: PASS, all tests green.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` — expect errors in `page.tsx` and
`HesaplaMobile.tsx` (they still pass `onKapat` to `FiyatAciklamasi`) —
**this is expected and fixed in Task 6**. Confirm no OTHER unrelated
type errors were introduced.

```bash
git add src/app/hesapla/mobile/FiyatAciklamasi.tsx src/app/hesapla/mobile/FiyatAciklamasi.test.tsx
git commit -m "refactor(hesapla-mobile): strip FiyatAciklamasi's own header/Kapat"
```

---

### Task 2: Strip AnalizSekmesi's own header/Kapat and remove the duplicate Maliyet Dağılımı panel

**Files:**
- Modify: `src/app/hesapla/mobile/AnalizSekmesi.tsx`
- Test: `src/app/hesapla/mobile/Analiz.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AnalizSekmesi` component whose prop type
  (`AnalizSekmesiProps`) no longer has `onKapat`. `result`, `baseInput`,
  `marketPrice` are unchanged. The component renders exactly 3 chart
  panels now (Hassasiyet, Kırılma Noktası, Finansal Özet) — the
  Maliyet Dağılımı panel and its `CostBreakdownChart` usage are
  removed entirely (that data is now only shown, as a list, in
  `FiyatAciklamasi`'s Özet content). No own `<header>`/"Kapat" button.
  Task 3 depends on this shape.

- [ ] **Step 1: Update the test file**

Edit `src/app/hesapla/mobile/Analiz.test.tsx`.

Remove the now-unused `CostBreakdownChart` mock and `costProps` array
(lines 10-13):

```ts
const costProps: Record<string, unknown>[] = []
jest.mock('@/components/charts/CostBreakdownChart', () => ({
    CostBreakdownChart: (p: Record<string, unknown>) => { costProps.push(p); return <div data-testid="cost-breakdown" /> },
}))
```

Change this test (lines 52-58) to drop `onKapat` and the
`cost-breakdown` assertion:

```ts
    it('grafikleri cam kart icinde render eder', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByTestId('sensitivity')).toBeInTheDocument()
        expect(screen.getByTestId('break-even')).toBeInTheDocument()
    })
```

Change this test (lines 60-65) to drop the Maliyet dağılımı group and
`onKapat`:

```ts
    it('her grafik erisilebilir bir basliga sahip', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByRole('group', { name: 'Hassasiyet' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Kırılma noktası' })).toBeInTheDocument()
    })
```

Change this test (lines 67-73) to drop `onKapat` and simplify the
empty-state assertion (no `cost-breakdown` testid exists anymore to
assert absent):

```ts
    it('sonuc yoksa grafik yerine aciklama gosterir', () => {
        render(<AnalizSekmesi result={null} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByText(/Hesap sonucu oluşunca/)).toBeInTheDocument()
    })
```

Change this test (lines 75-78) to drop `onKapat`:

```ts
    it('finansal ozet de gosterilir', () => {
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.getByRole('group', { name: 'Finansal özet' })).toBeInTheDocument()
    })
```

Delete the "kapat butonu" test entirely (lines 80-85):

```ts
    it('kapat butonu onKapat i cagirir', async () => {
        const onKapat = jest.fn()
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} onKapat={onKapat} />)
        await userEvent.click(screen.getByRole('button', { name: /Kapat/ }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })
```

Delete the "maliyet dagilimi proplari" test entirely (lines 87-96):

```ts
    it('maliyet dagilimi proplari motor alanlarindan dogru turetilir', () => {
        costProps.length = 0
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={0} onKapat={jest.fn()} />)
        expect(costProps[0]).toEqual({
            constructionCost: RESULT.Mi_base + RESULT.Mz,
            landValue: RESULT.Ma,
            profit: RESULT.FD_total - RESULT.M,
            risk: RESULT.Mi - RESULT.Mi_base - RESULT.Mz,
        })
    })
```

Add this new test right after the `describe('AnalizSekmesi', () => {` line:

```ts
    it('kendi basligini/Kapat butonunu ve Maliyet Dagilimi panelini render ETMEZ', () => {
        // Maliyet Dagilimi FiyatAciklamasi'nin (Ozet sekmesi) ayni veriyi
        // liste olarak zaten gosterdigi icin kasitli olarak buradan
        // kaldirildi (2026-08-23 IA sadelestirmesi) — kopyalanmadi.
        render(<AnalizSekmesi result={RESULT} baseInput={BASE_INPUT} marketPrice={10000000} />)
        expect(screen.queryByRole('button', { name: /Kapat/ })).toBeNull()
        expect(screen.queryByText('Analiz')).toBeNull()
        expect(screen.queryByRole('group', { name: 'Maliyet dağılımı' })).toBeNull()
        expect(screen.queryByTestId('cost-breakdown')).toBeNull()
    })
```

- [ ] **Step 2: Run the test file, verify the new test fails**

Run: `npx jest src/app/hesapla/mobile/Analiz.test.tsx`
Expected: several tests fail — the new "kendi basligini..." test (header/panel still present), and the modified tests that no longer pass `onKapat`/expect `cost-breakdown` will fail against the CURRENT unmodified component (which still requires `onKapat` and still renders `cost-breakdown`). The unrelated `'sabit P: 10000 kalintisi YOK'` test still passes (it doesn't touch AnalizSekmesi's props).

- [ ] **Step 3: Remove the header and Maliyet Dağılımı panel from the component**

In `src/app/hesapla/mobile/AnalizSekmesi.tsx`:

Remove the import (line 3):

```tsx
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
```

Remove `onKapat: () => void;` from `AnalizSekmesiProps` (line 26, plus
its preceding comment on line 25).

Change the function signature (line 37) from:

```tsx
export function AnalizSekmesi({ result, baseInput, marketPrice, onKapat }: AnalizSekmesiProps) {
```

to:

```tsx
export function AnalizSekmesi({ result, baseInput, marketPrice }: AnalizSekmesiProps) {
```

Delete the `kapatSatiri` variable and its usage entirely (lines 42-49,
54, 67):

```tsx
    const kapatSatiri = (
        <header className={styles.analizKapatSatiri}>
            <h2 className={styles.aciklamaBaslikMetin}>Analiz</h2>
            <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                Kapat
            </button>
        </header>
    );
```

The `if (!result)` branch (lines 51-63) becomes:

```tsx
    if (!result) {
        return (
            <section className={styles.analizBos}>
                <p className={styles.analizBosMetin}>
                    Hesap sonucu oluşunca grafikler burada görünecek. Girdileri
                    tamamlayıp sonucun hesaplanmasını bekleyin.
                </p>
            </section>
        );
    }
```

The main return (lines 65-95) becomes — Maliyet Dağılımı `<section>`
(lines 69-77 of the original) removed, `kapatSatiri` removed, outer
`<>...</>` fragment no longer needed since there's one root now (wrap
in a `<div className={styles.analizGovde}>` directly, no fragment):

```tsx
    return (
        <div className={styles.analizGovde}>
            <section className={styles.analizKart} role="group" aria-label="Hassasiyet">
                <h3 className={styles.analizBaslik}>Hassasiyet</h3>
                <SensitivityChart baseInput={baseInput} />
            </section>

            <section className={styles.analizKart} role="group" aria-label="Kırılma noktası">
                <h3 className={styles.analizBaslik}>Kırılma noktası</h3>
                <BreakEvenChart baseInput={baseInput} marketPrice={marketPrice} />
            </section>

            <section className={styles.analizKart} role="group" aria-label="Finansal özet">
                <h3 className={styles.analizBaslik}>Finansal özet</h3>
                <FinancialDashboard totalInvestment={result.M} totalRevenue={result.FD_total} />
            </section>
        </div>
    );
```

- [ ] **Step 4: Run the test file, verify it passes**

Run: `npx jest src/app/hesapla/mobile/Analiz.test.tsx`
Expected: PASS, all tests green (including the untouched
`'sabit P: 10000 kalintisi YOK'` regression guard).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` — expect the same kind of pre-existing errors
in `page.tsx`/`HesaplaMobile.tsx` as Task 1 (fixed in Task 6). Confirm
no other unrelated errors.

```bash
git add src/app/hesapla/mobile/AnalizSekmesi.tsx src/app/hesapla/mobile/Analiz.test.tsx
git commit -m "refactor(hesapla-mobile): strip AnalizSekmesi's header and drop duplicate Maliyet Dağılımı panel"
```

---

### Task 3: New SonucDetayiMobileLeaf (merges Task 1 + Task 2 outputs behind 2 tabs)

**Files:**
- Create: `src/app/hesapla/mobile/SonucDetayiMobileLeaf.tsx`
- Create: `src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: `FiyatAciklamasi` (from Task 1, no `onKapat`), `AnalizSekmesi`
  (from Task 2, no `onKapat`).
- Produces: `SonucDetayiMobileLeaf` component and its prop type
  `SonucDetayiMobileLeafProps = { fiyatAciklamasi: FiyatAciklamasiProps; analiz: AnalizSekmesiProps; onKapat: () => void }`.
  Renders its own header ("Sonuç Detayı" + Kapat), a 2-tab segmented
  control (Özet / Grafikler, defaulting to Özet), and the selected
  tab's content. Task 6 depends on this component and its prop shape.

- [ ] **Step 1: Add the CSS for a 2-column segment variant**

In `src/app/hesapla/mobile/mobile.module.css`, immediately after the
existing `.segmentAktif` block (currently ending at line 582), add:

```css
    /* ── Segment (2 sutunlu varyant — Sonuc Detayi Ozet/Grafikler) ──
       `.segment`/`.segmentAktif` PAYLASILIR (ayni gorsel dil), yalnizca
       grid sutun sayisi farkli. `.hesaplaMobilKok`in duz sutununda
       dogrudan durur, `.analizKapatSatiri` ile AYNI 14px yatay
       margin — dikey aralik `.hesaplaMobilKok`in `gap: 12px`inden
       gelir (bkz. .girdiKarti'nin yorumu, satir 244-246). */
    .segmentKap2 {
        margin: 0 14px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px;
        padding: 4px;
        border-radius: 17px;
        background: var(--m-fill);
    }
```

- [ ] **Step 2: Write the failing test**

Create `src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucDetayiMobileLeaf } from './SonucDetayiMobileLeaf'
import type { CalculationOutput } from '@/lib/calculator/engine_v2'

const RESULT = {
    Mi_base: 1500000, Mz: 0, Mi: 1680000, Ma: 4216000, M: 5896000,
    derivedX: 4216000 / 5896000,
    FD_total: 8964000, FD_per_m2: 64028, Z: 0, Sdx: null, FA: null, FAbirim: null, x_max: null,
} as unknown as CalculationOutput

const BASE_INPUT = {
    x: 0.33, L: 1.2, Ad: 140, P: 12000, K: 1.3,
    isRiskEnabled: false, R: 1,
    isExcavationEnabled: false, excavationMode: 'percentage' as const,
    Z: 0, MzOriginal: 0,
}

jest.mock('@/components/charts/SensitivityChart', () => ({
    SensitivityChart: () => <div data-testid="sensitivity" />,
}))
jest.mock('@/components/charts/BreakEvenChart', () => ({
    BreakEvenChart: () => <div data-testid="break-even" />,
}))
jest.mock('@/components/FinancialDashboard', () => ({
    FinancialDashboard: () => <div data-testid="financial" />,
}))

function props(patch = {}) {
    return {
        fiyatAciklamasi: {
            result: RESULT, apartmentSize: 140, unitPrice: 12000,
            landSharePercent: 33, profitLabel: 'Orta', profitMultiplier: 1.3,
            onKarDegistir: jest.fn(),
        },
        analiz: { result: RESULT, baseInput: BASE_INPUT, marketPrice: 10000000 },
        onKapat: jest.fn(),
        ...patch,
    }
}

beforeEach(() => {
    localStorage.clear()
})

describe('SonucDetayiMobileLeaf', () => {
    it('basligi ve Kapat butonunu render eder, Kapat tiklaninca onKapat cagirir', async () => {
        const onKapat = jest.fn()
        render(<SonucDetayiMobileLeaf {...props({ onKapat })} />)
        expect(screen.getByRole('heading', { name: 'Sonuç Detayı' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('varsayilan olarak Ozet sekmesi acik gelir (FiyatAciklamasi icerigi gorunur)', () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        expect(screen.getByText(/Daireyi inşa etmek/)).toBeInTheDocument()
        expect(screen.queryByTestId('sensitivity')).toBeNull()
    })

    it('Grafikler sekmesine gecince AnalizSekmesi icerigi gorunur, Ozet gizlenir', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        expect(screen.getByTestId('sensitivity')).toBeInTheDocument()
        expect(screen.getByTestId('break-even')).toBeInTheDocument()
        expect(screen.getByTestId('financial')).toBeInTheDocument()
        expect(screen.queryByText(/Daireyi inşa etmek/)).toBeNull()
    })

    it('Grafikler sekmesinde Maliyet Dagilimi TEKRARLANMAZ (Ozet ile ayni veri)', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        expect(screen.queryByRole('group', { name: 'Maliyet dağılımı' })).toBeNull()
    })

    it('Ozet -> Grafikler -> Ozet gecisinde fiyat dokumu geri gelir', async () => {
        render(<SonucDetayiMobileLeaf {...props()} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
        await userEvent.click(screen.getByRole('tab', { name: 'Özet' }))
        expect(screen.getByText(/Daireyi inşa etmek/)).toBeInTheDocument()
    })
})
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx jest src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx`
Expected: FAIL with "Cannot find module './SonucDetayiMobileLeaf'".

- [ ] **Step 4: Create the component**

Create `src/app/hesapla/mobile/SonucDetayiMobileLeaf.tsx`:

```tsx
"use client";

import { useState } from 'react';
import { FiyatAciklamasi, type FiyatAciklamasiProps } from './FiyatAciklamasi';
import { AnalizSekmesi, type AnalizSekmesiProps } from './AnalizSekmesi';
import styles from './mobile.module.css';

export type SonucDetayiMobileLeafProps = {
    fiyatAciklamasi: FiyatAciklamasiProps;
    analiz: AnalizSekmesiProps;
    onKapat: () => void;
};

type Sekme = 'ozet' | 'grafikler';

/**
 * Mobil "Sonuç Detayı" derinleştirme yaprağı — eski ayrı Hesap
 * Fişi/Analiz menü öğelerinin birleşimi (2026-08-23 IA sadeleştirmesi,
 * bkz. docs/superpowers/specs/2026-08-23-hesapla-mobil-menu-sadelestirme-design.md).
 * `FiyatAciklamasi`/`AnalizSekmesi` KOPYALANMAZ, aynen sarmalanır —
 * yalnızca kendi başlıkları kaldırılmış halleriyle iki sekme içinde
 * gösterilirler.
 */
export function SonucDetayiMobileLeaf({ fiyatAciklamasi, analiz, onKapat }: SonucDetayiMobileLeafProps) {
    const [sekme, setSekme] = useState<Sekme>('ozet');

    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Sonuç Detayı</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

            <div className={styles.segmentKap2} role="tablist" aria-label="Sonuç Detayı görünümü">
                <button
                    type="button"
                    role="tab"
                    aria-selected={sekme === 'ozet'}
                    className={`${styles.segment} ${sekme === 'ozet' ? styles.segmentAktif : ''}`}
                    onClick={() => setSekme('ozet')}
                >
                    Özet
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={sekme === 'grafikler'}
                    className={`${styles.segment} ${sekme === 'grafikler' ? styles.segmentAktif : ''}`}
                    onClick={() => setSekme('grafikler')}
                >
                    Grafikler
                </button>
            </div>

            {sekme === 'ozet'
                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                : <AnalizSekmesi {...analiz} />}
        </>
    );
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit` — same pre-existing `page.tsx`/`HesaplaMobile.tsx`
errors as before (fixed in Task 6), no new unrelated errors.

```bash
git add src/app/hesapla/mobile/SonucDetayiMobileLeaf.tsx src/app/hesapla/mobile/SonucDetayiMobileLeaf.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla-mobile): add SonucDetayiMobileLeaf merging Hesap Fişi + Analiz behind 2 tabs"
```

---

### Task 4: New TasarimStudyosuHub + rename StudioScenarioMobileLeaf's title

**Files:**
- Create: `src/app/hesapla/mobile/TasarimStudyosuHub.tsx`
- Create: `src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx`
- Modify: `src/app/hesapla/mobile/StudioScenarioMobileLeaf.tsx`
- Modify: `src/app/hesapla/mobile/StudioScenarioMobileLeaf.test.tsx`
- Modify: `src/app/hesapla/mobile/mobile.module.css`

**Interfaces:**
- Consumes: nothing (pure callback-forwarding component — it does not
  import `Studio2DMobileLeaf`/`ProgramMixMobileLeaf`/`StudioMobileLeaf`/
  `StudioScenarioMobileLeaf` itself; `HesaplaMobile.tsx` still owns
  which leaf renders, per the existing ternary pattern).
- Produces: `TasarimStudyosuHub` component and its prop type
  `TasarimStudyosuHubProps = { onKapat: () => void; onYerlesimAc: () => void; onProgramAc: () => void; on3DAc: () => void; onSenaryolarAc: () => void }`.
  Task 6 depends on this component and wires its 4 callbacks to the
  existing `onStudio2DAc`/`onProgramMixAc`/`onStudioAc`/`onStudioScenarioAc`
  handlers already in `page.tsx`.

- [ ] **Step 1: Add CSS for the hub's button list**

In `src/app/hesapla/mobile/mobile.module.css`, immediately after the
`.fisButonu` block (currently ending at line 216), add:

```css
    /* ═══ Tasarım Stüdyosu hub (2026-08-23 IA sadelestirmesi) ═══════════
       `.fisButonu` beyaz-cam/beyaz-metin AYNI mavi degrade `.sonucKarti`
       arka planina gore tasarlandi, duz sayfa arka planinda kullanilamaz
       (beyaz metin beyaz zeminde kaybolur). Bu yuzden `.gelismisAyarlarBtn`
       ile AYNI koyu-mürekkep/acik-cam renk paletiyle, ama `.fisButonu`nun
       satir-ici (etiket solda + chevron sagda) yerlesimiyle yeni bir
       varyant. */
    .hubButonListesi {
        margin: 0 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .hubButonu {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 44px;
        padding: 10px 13px;
        border-radius: var(--m-r-input);
        border: 1px solid rgba(255, 255, 255, .9);
        background: rgba(255, 255, 255, .55);
        backdrop-filter: var(--m-glass-blur);
        -webkit-backdrop-filter: var(--m-glass-blur);
        box-shadow: 0 8px 24px rgba(20, 70, 150, .1), inset 0 1px 0 rgba(255, 255, 255, .95);
        color: var(--m-on-glass);
        font: 700 11.5px Inter, sans-serif;
        cursor: pointer;
    }
```

- [ ] **Step 2: Write the failing test**

Create `src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasarimStudyosuHub } from './TasarimStudyosuHub'

function props(patch = {}) {
    return {
        onKapat: jest.fn(),
        onYerlesimAc: jest.fn(),
        onProgramAc: jest.fn(),
        on3DAc: jest.fn(),
        onSenaryolarAc: jest.fn(),
        ...patch,
    }
}

describe('TasarimStudyosuHub', () => {
    it('basligi ve Kapat butonunu render eder, Kapat tiklaninca onKapat cagirir', async () => {
        const onKapat = jest.fn()
        render(<TasarimStudyosuHub {...props({ onKapat })} />)
        expect(screen.getByRole('heading', { name: 'Tasarım Stüdyosu' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
        expect(onKapat).toHaveBeenCalledTimes(1)
    })

    it('Yerlesim satiri onYerlesimAc i cagirir', async () => {
        const onYerlesimAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onYerlesimAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Yerleşim/ }))
        expect(onYerlesimAc).toHaveBeenCalledTimes(1)
    })

    it('Program satiri onProgramAc i cagirir', async () => {
        const onProgramAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onProgramAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Program/ }))
        expect(onProgramAc).toHaveBeenCalledTimes(1)
    })

    it('3D Gorunum satiri on3DAc i cagirir', async () => {
        const on3DAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ on3DAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /3D Görünüm/ }))
        expect(on3DAc).toHaveBeenCalledTimes(1)
    })

    it('Tasarim Senaryolari satiri onSenaryolarAc i cagirir', async () => {
        const onSenaryolarAc = jest.fn()
        render(<TasarimStudyosuHub {...props({ onSenaryolarAc })} />)
        await userEvent.click(screen.getByRole('button', { name: /Tasarım Senaryoları/ }))
        expect(onSenaryolarAc).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx jest src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx`
Expected: FAIL with "Cannot find module './TasarimStudyosuHub'".

- [ ] **Step 4: Create the component**

Create `src/app/hesapla/mobile/TasarimStudyosuHub.tsx`:

```tsx
"use client";

import { IconChevronRight } from '@/components/icons';
import styles from './mobile.module.css';

export type TasarimStudyosuHubProps = {
    onKapat: () => void;
    onYerlesimAc: () => void;
    onProgramAc: () => void;
    on3DAc: () => void;
    onSenaryolarAc: () => void;
};

/**
 * Mobil "Tasarım Stüdyosu" iç-içe hub menüsü (2026-08-23 IA
 * sadeleştirmesi) — 2D Yerleşim, Program Dağılımı, 3D Önizleme ve
 * Tasarım Senaryoları aynı "aktif tasarım denemesi" üzerinde çalışan
 * bağlı bir iş akışı olduğu için tek bir giriş noktasında toplanır
 * (bkz. spec). Sekme şeridi DEĞİL, projenin "tek kapı" bir seviye daha
 * derinde tekrarlanan iç-içe menü deseni — `AnalizSekmesi.tsx`'te
 * belgelenmiş K4/K5 kararıyla tutarlı.
 *
 * Bu bileşen hiçbir alt-yaprağı kendisi render ETMEZ — yalnızca 4
 * callback'i çağırır, `HesaplaMobile.tsx`'in mevcut ternary zinciri
 * hangi alt-yaprağın göründüğüne (bilinmeyen bir yeni state olmadan)
 * karar vermeye devam eder.
 */
export function TasarimStudyosuHub({
    onKapat,
    onYerlesimAc,
    onProgramAc,
    on3DAc,
    onSenaryolarAc,
}: TasarimStudyosuHubProps) {
    return (
        <>
            <header className={styles.analizKapatSatiri}>
                <h2 className={styles.aciklamaBaslikMetin}>Tasarım Stüdyosu</h2>
                <button type="button" className={styles.aciklamaKapat} onClick={onKapat}>
                    Kapat
                </button>
            </header>

            <div className={styles.hubButonListesi}>
                <button type="button" className={styles.hubButonu} onClick={onYerlesimAc}>
                    Yerleşim · footprint, çekme, cephe
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={onProgramAc}>
                    Program · daire tipleri, dükkan
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={on3DAc}>
                    3D Görünüm · bina kütlesi
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>

                <button type="button" className={styles.hubButonu} onClick={onSenaryolarAc}>
                    Tasarım Senaryoları · alternatifler, geçmiş
                    <IconChevronRight size={15} strokeWidth={2.4} />
                </button>
            </div>
        </>
    );
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Rename StudioScenarioMobileLeaf's title (write failing test first)**

Edit `src/app/hesapla/mobile/StudioScenarioMobileLeaf.test.tsx`: find
the line asserting the old title:

```ts
    expect(screen.getByText('Senaryolar & Karşılaştırma')).toBeInTheDocument();
```

Change it to:

```ts
    expect(screen.getByText('Tasarım Senaryoları')).toBeInTheDocument();
```

Run: `npx jest src/app/hesapla/mobile/StudioScenarioMobileLeaf.test.tsx`
Expected: FAIL (component still renders the old title).

- [ ] **Step 7: Implement the rename**

In `src/app/hesapla/mobile/StudioScenarioMobileLeaf.tsx`, change:

```tsx
        <h2 className={styles.aciklamaBaslikMetin}>Senaryolar & Karşılaştırma</h2>
```

to:

```tsx
        <h2 className={styles.aciklamaBaslikMetin}>Tasarım Senaryoları</h2>
```

Also update the component's own doc comment (currently "Mobil
'Senaryolar & Karşılaştırma' derinleştirme yaprağı...") to say
"Mobil 'Tasarım Senaryoları' derinleştirme yaprağı..." — cosmetic,
but keep comments truthful.

Run: `npx jest src/app/hesapla/mobile/StudioScenarioMobileLeaf.test.tsx`
Expected: PASS.

- [ ] **Step 8: Type-check and commit**

Run: `npx tsc --noEmit` — same pre-existing `page.tsx`/`HesaplaMobile.tsx`
errors as before (fixed in Task 6), no new unrelated errors.

```bash
git add src/app/hesapla/mobile/TasarimStudyosuHub.tsx src/app/hesapla/mobile/TasarimStudyosuHub.test.tsx src/app/hesapla/mobile/StudioScenarioMobileLeaf.tsx src/app/hesapla/mobile/StudioScenarioMobileLeaf.test.tsx src/app/hesapla/mobile/mobile.module.css
git commit -m "feat(hesapla-mobile): add TasarimStudyosuHub, rename Studio senaryoları to fix naming collision with Senaryo Karşılaştırması"
```

---

### Task 5: SonucKarti.tsx — 7 buttons down to 3

**Files:**
- Modify: `src/app/hesapla/mobile/SonucKarti.tsx`
- Modify: `src/app/hesapla/mobile/SonucKarti.test.tsx`

**Interfaces:**
- Consumes: nothing new (pure callback-forwarding, same as before).
- Produces: `SonucKarti` component whose prop type `SonucKartiProps`
  drops `onFisAc`, `onAnalizAc`, `onStudioAc`, `onProgramMixAc`,
  `onStudio2DAc`, `onStudioScenarioAc` and adds `onSonucDetayiAc: () => void`
  and `onStudioHubAc: () => void`. `onLandownerOfferAc` is unchanged.
  Task 6 depends on this new prop shape.

- [ ] **Step 1: Update the test file**

Edit `src/app/hesapla/mobile/SonucKarti.test.tsx`.

Change the `BASE` object (lines 6-24) — remove
`onFisAc`/`onAnalizAc`/`onStudioAc`/`onProgramMixAc`/`onStudio2DAc`,
add `onSonucDetayiAc`/`onStudioHubAc`:

```ts
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
    onSonucDetayiAc: jest.fn(),
    onStudioHubAc: jest.fn(),
    onLandownerOfferAc: jest.fn(),
}
```

Replace these five tests (lines 75-117):

```ts
    it('fis butonu onFisAc i cagirir', async () => {
        const onFisAc = jest.fn()
        render(<SonucKarti {...BASE} onFisAc={onFisAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Hesap fişi/ }))
        expect(onFisAc).toHaveBeenCalledTimes(1)
    })

    it('Analiz satiri onAnalizAc i cagirir', async () => {
        const onAnalizAc = jest.fn()
        render(<SonucKarti {...BASE} onAnalizAc={onAnalizAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Analiz/ }))
        expect(onAnalizAc).toHaveBeenCalledTimes(1)
    })

    // Bilinen bosluk kapatildi: Studio 3D onizleme mobilde artik erisilebilir
    // (onceden yalnizca masaustunde kabloluydu).
    it('3D Onizleme satiri onStudioAc i cagirir', async () => {
        const onStudioAc = jest.fn()
        render(<SonucKarti {...BASE} onStudioAc={onStudioAc} />)
        await userEvent.click(screen.getByRole('button', { name: /3D Önizleme/ }))
        expect(onStudioAc).toHaveBeenCalledTimes(1)
    })

    it('Program Dagilimi satiri onProgramMixAc i cagirir', async () => {
        const onProgramMixAc = jest.fn()
        render(<SonucKarti {...BASE} onProgramMixAc={onProgramMixAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Program Dağılımı/ }))
        expect(onProgramMixAc).toHaveBeenCalledTimes(1)
    })

    it('Arsa Sahibi Teklifi satiri onLandownerOfferAc i cagirir', async () => {
        const onLandownerOfferAc = jest.fn()
        render(<SonucKarti {...BASE} onLandownerOfferAc={onLandownerOfferAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Arsa Sahibi Teklifi/ }))
        expect(onLandownerOfferAc).toHaveBeenCalledTimes(1)
    })

    it('2D Yerleşim Tahtası satiri onStudio2DAc i cagirir', async () => {
        const onStudio2DAc = jest.fn()
        render(<SonucKarti {...BASE} onStudio2DAc={onStudio2DAc} />)
        await userEvent.click(screen.getByRole('button', { name: /2D Yerleşim/ }))
        expect(onStudio2DAc).toHaveBeenCalledTimes(1)
    })
```

with:

```ts
    it('Sonuc Detayi satiri onSonucDetayiAc i cagirir', async () => {
        const onSonucDetayiAc = jest.fn()
        render(<SonucKarti {...BASE} onSonucDetayiAc={onSonucDetayiAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Sonuç Detayı/ }))
        expect(onSonucDetayiAc).toHaveBeenCalledTimes(1)
    })

    it('Tasarim Studyosu satiri onStudioHubAc i cagirir', async () => {
        const onStudioHubAc = jest.fn()
        render(<SonucKarti {...BASE} onStudioHubAc={onStudioHubAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Tasarım Stüdyosu/ }))
        expect(onStudioHubAc).toHaveBeenCalledTimes(1)
    })

    it('Arsa Sahibi Teklifi satiri onLandownerOfferAc i cagirir', async () => {
        const onLandownerOfferAc = jest.fn()
        render(<SonucKarti {...BASE} onLandownerOfferAc={onLandownerOfferAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Arsa Sahibi Teklifi/ }))
        expect(onLandownerOfferAc).toHaveBeenCalledTimes(1)
    })

    it('yalnizca UC buton render edilir (7 degil)', () => {
        render(<SonucKarti {...BASE} />)
        const butonlar = screen.getAllByRole('button').filter(b =>
            /Sonuç Detayı|Tasarım Stüdyosu|Arsa Sahibi Teklifi/.test(b.textContent ?? '')
        )
        expect(butonlar).toHaveLength(3)
    })
```

- [ ] **Step 2: Run the test file, verify it fails**

Run: `npx jest src/app/hesapla/mobile/SonucKarti.test.tsx`
Expected: FAIL — the new/changed tests can't find buttons named "Sonuç
Detayı"/"Tasarım Stüdyosu" against the current 7-button component.

- [ ] **Step 3: Rewrite the component's prop type and button list**

In `src/app/hesapla/mobile/SonucKarti.tsx`:

Replace the prop type block (lines 14-27):

```ts
    onFisAc: () => void;
    onAnalizAc: () => void;
    /** Bilinen bosluk kapatildi: Studio 3D onizleme oncesi yalnizca
        masaustunde erisilebilirdi (bkz. Faz1B QA bulgusu). */
    onStudioAc: () => void;
    /** Faz 2A Task 3: Program Dagilimi paneli. */
    onProgramMixAc: () => void;
    /** Faz 2B Task 3: Arsa Sahibi Teklifi paneli. */
    onLandownerOfferAc: () => void;
    /** Faz 3A: 2D Yerleşim Tahtası paneli. */
    onStudio2DAc: () => void;
    /** Faz 3B: Senaryolar & Karsilastirma paneli. */
    onStudioScenarioAc?: () => void;
```

with:

```ts
    /** "Sonuç Detayı" yaprağını açar — Hesap Fişi + Analiz birleşimi
        (2026-08-23 IA sadeleştirmesi). */
    onSonucDetayiAc: () => void;
    /** "Tasarım Stüdyosu" iç-içe hub menüsünü açar — 2D Yerleşim,
        Program Dağılımı, 3D Önizleme, Tasarım Senaryoları buradan
        erişilir (2026-08-23 IA sadeleştirmesi). */
    onStudioHubAc: () => void;
    /** Faz 2B Task 3: Arsa Sahibi Teklifi paneli. Standalone kalır —
        tasarım geometrisi iş akışıyla gevşek bağlı, farklı bir amaç
        (arsa sahibiyle pazarlık) için var. */
    onLandownerOfferAc: () => void;
```

Update the function's destructured props (lines 56-63):

```ts
    onOrnekProjeIleDene,
    onFisAc,
    onAnalizAc,
    onStudioAc,
    onProgramMixAc,
    onLandownerOfferAc,
    onStudio2DAc,
    onStudioScenarioAc,
```

to:

```ts
    onOrnekProjeIleDene,
    onSonucDetayiAc,
    onStudioHubAc,
    onLandownerOfferAc,
```

Replace the entire button list (lines 117-152) with:

```tsx
            <button type="button" className={styles.fisButonu} onClick={onSonucDetayiAc}>
                Sonuç Detayı · hesap fişi, analiz
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            <button type="button" className={styles.fisButonu} onClick={onStudioHubAc}>
                Tasarım Stüdyosu · yerleşim, program, 3D
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>

            <button type="button" className={styles.fisButonu} onClick={onLandownerOfferAc}>
                Arsa Sahibi Teklifi · hak ediş
                <IconChevronRight size={15} strokeWidth={2.4} />
            </button>
```

- [ ] **Step 4: Run the test file, verify it passes**

Run: `npx jest src/app/hesapla/mobile/SonucKarti.test.tsx`
Expected: PASS, all tests green.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` — expect errors ONLY in `page.tsx`/
`HesaplaMobile.tsx` (fixed in Task 6). Confirm no other unrelated
errors.

```bash
git add src/app/hesapla/mobile/SonucKarti.tsx src/app/hesapla/mobile/SonucKarti.test.tsx
git commit -m "refactor(hesapla-mobile): SonucKarti — 7 buttons down to 3"
```

---

### Task 6: Wire it all up — page.tsx state + HesaplaMobile.tsx ternary chain

**Files:**
- Modify: `src/app/hesapla/mobile/HesaplaMobile.tsx`
- Modify: `src/app/hesapla/mobile/HesaplaMobile.test.tsx`
- Modify: `src/app/hesapla/page.tsx:152-171,1070-1200` (exact ranges
  given below — this file is 1200+ lines covering unrelated state;
  **touch ONLY the lines specified in this task**, nothing else in the
  file)

**Interfaces:**
- Consumes: `SonucDetayiMobileLeaf` (Task 3), `TasarimStudyosuHub`
  (Task 4), `SonucKarti`'s new prop shape (Task 5).
- Produces: the fully wired `/hesapla` mobile screen. No further tasks
  depend on this — it's the last task.

- [ ] **Step 1: Update HesaplaMobile.test.tsx's props() helper**

Edit `src/app/hesapla/mobile/HesaplaMobile.test.tsx`.

In the `sonuc` block (lines 41-55), replace:

```ts
            onOrnekProjeIleDene: jest.fn(),
            onFisAc: jest.fn(),
            onAnalizAc: jest.fn(),
            onStudioAc: jest.fn(),
            onProgramMixAc: jest.fn(),
            onLandownerOfferAc: jest.fn(),
            onStudio2DAc: jest.fn(),
```

with:

```ts
            onOrnekProjeIleDene: jest.fn(),
            onSonucDetayiAc: jest.fn(),
            onStudioHubAc: jest.fn(),
            onLandownerOfferAc: jest.fn(),
```

Replace the `fisAcik`/`fiyatAciklamasi`/`analizAcik`/`analiz` block
(lines 80-93):

```ts
        fisAcik: false,
        fiyatAciklamasi: {
            result: null,
            apartmentSize: 140,
            unitPrice: 12000,
            landSharePercent: 33,
            profitLabel: 'Orta',
            profitMultiplier: 1.3,
            onKapat: jest.fn(),
            onKarDegistir: jest.fn(),
        },
        onAyarlarAc: jest.fn(),
        analizAcik: false,
        analiz: { result: null, baseInput: BASE_INPUT, marketPrice: 0, onKapat: jest.fn() },
```

with:

```ts
        onAyarlarAc: jest.fn(),
        sonucDetayiAcik: false,
        sonucDetayi: {
            fiyatAciklamasi: {
                result: null,
                apartmentSize: 140,
                unitPrice: 12000,
                landSharePercent: 33,
                profitLabel: 'Orta',
                profitMultiplier: 1.3,
                onKarDegistir: jest.fn(),
            },
            analiz: { result: null, baseInput: BASE_INPUT, marketPrice: 0 },
            onKapat: jest.fn(),
        },
```

Add `studioHubAcik: false,` right after `studioAcik: false,` (line 94).
Leave the `studio`, `programMix`, `landownerOffer`, `studio2D` objects
(including each one's own `onKapat: jest.fn(),`) completely untouched
— those four leaves and their flags are unaffected by this plan.

- [ ] **Step 2: Add HesaplaMobile tests for the new hub + merged leaf**

Replace this test (lines 157-165):

```ts
    it('analizAcik ile sonuc karti yerine analiz gorunumu gelir', () => {
        const { rerender } = render(<HesaplaMobile {...props({ analizAcik: false })} />)
        expect(screen.getByText(/Min\. daire fiyatı/)).toBeInTheDocument()
        expect(screen.queryByTestId('analiz-sekmesi')).toBeNull()

        rerender(<HesaplaMobile {...props({ analizAcik: true })} />)
        expect(screen.getByTestId('analiz-sekmesi')).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })
```

with:

```ts
    it('sonucDetayiAcik ile sonuc karti yerine Sonuc Detayi gorunumu gelir', () => {
        const { rerender } = render(<HesaplaMobile {...props({ sonucDetayiAcik: false })} />)
        expect(screen.getByText(/Min\. daire fiyatı/)).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Sonuç Detayı' })).toBeNull()

        rerender(<HesaplaMobile {...props({ sonucDetayiAcik: true })} />)
        expect(screen.getByRole('heading', { name: 'Sonuç Detayı' })).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })

    it('studioHubAcik ile sonuc karti yerine Tasarim Studyosu hub gorunumu gelir', () => {
        const { rerender } = render(<HesaplaMobile {...props({ studioHubAcik: false })} />)
        expect(screen.getByText(/Min\. daire fiyatı/)).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Tasarım Stüdyosu' })).toBeNull()

        rerender(<HesaplaMobile {...props({ studioHubAcik: true })} />)
        expect(screen.getByRole('heading', { name: 'Tasarım Stüdyosu' })).toBeInTheDocument()
        expect(screen.queryByText(/Min\. daire fiyatı/)).toBeNull()
    })

    it('hub acikken 4 alt-yapraktan biri acilirsa hub yerine o yaprak gorunur (studioAcik ornegi)', () => {
        render(<HesaplaMobile {...props({ studioHubAcik: true, studioAcik: true })} />)
        expect(screen.getByRole('heading', { name: '3D Önizleme' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Tasarım Stüdyosu' })).toBeNull()
    })
```

Update the analiz-mocking test near the bottom (lines 217-233) — it
still targets `AnalizSekmesi` directly and stays conceptually valid,
but must render `SonucDetayiMobileLeaf` (via `sonucDetayiAcik`) to
reach it, and the previously-duplicated header/Kapat check is now
about `SonucDetayiMobileLeaf`'s own header, not `AnalizSekmesi`'s
(`AnalizSekmesi` has no header/Kapat anymore per Task 2). Replace:

```ts
    it('analiz yapraginda TEK "Analiz" basligi ve TEK "Kapat" butonu doner (yinelenen satir donmez)', () => {
        // Bu test SADECE burada gercek `AnalizSekmesi`yi render eder: dosyanin
        // geri kalani onu stub'lar (canvas gerektiren grafikler yuzunden).
        // Stub kullanilsaydi Task 6'nin `HesaplaMobile`de biraktigi yinelenen
        // "Analiz"/"Kapat" satiri geri donse bile testler yesil kalirdi —
        // tam da bu kor noktayi kapatmak icin gercek bilesen kullanilir.
        const { AnalizSekmesi: GercekAnalizSekmesi } = jest.requireActual('./AnalizSekmesi') as typeof import('./AnalizSekmesi')
        mockAnalizSekmesi.mockImplementation(GercekAnalizSekmesi)

        try {
            render(<HesaplaMobile {...props({ analizAcik: true })} />)
            expect(screen.getAllByRole('heading', { name: 'Analiz' })).toHaveLength(1)
            expect(screen.getAllByRole('button', { name: 'Kapat' })).toHaveLength(1)
        } finally {
            mockAnalizSekmesi.mockImplementation(() => <div data-testid="analiz-sekmesi" />)
        }
    })
```

with:

```ts
    it('Sonuc Detayi yapraginda TEK "Kapat" butonu doner (AnalizSekmesi kendi Kapat ini geri getirmez)', () => {
        // Bu test SADECE burada gercek `AnalizSekmesi`yi render eder (dosyanin
        // geri kalani canvas gerektiren grafikler yuzunden stub'lar) — Task 2
        // AnalizSekmesi'nin KENDI Kapat'ini kaldirdi; stub kullanilsaydi bu
        // regresyon (ikisi geri gelse bile) testler yesil kalirdi.
        const { AnalizSekmesi: GercekAnalizSekmesi } = jest.requireActual('./AnalizSekmesi') as typeof import('./AnalizSekmesi')
        mockAnalizSekmesi.mockImplementation(GercekAnalizSekmesi)

        try {
            render(<HesaplaMobile {...props({ sonucDetayiAcik: true })} />)
            fireEvent.click(screen.getByRole('tab', { name: 'Grafikler' }))
            expect(screen.getAllByRole('button', { name: 'Kapat' })).toHaveLength(1)
        } finally {
            mockAnalizSekmesi.mockImplementation(() => <div data-testid="analiz-sekmesi" />)
        }
    })
```

- [ ] **Step 3: Run HesaplaMobile.test.tsx, verify it fails**

Run: `npx jest src/app/hesapla/mobile/HesaplaMobile.test.tsx`
Expected: FAIL — `HesaplaMobileProps` doesn't have `sonucDetayiAcik`/
`studioHubAcik` yet, and the ternary chain doesn't render
`SonucDetayiMobileLeaf`/`TasarimStudyosuHub`.

- [ ] **Step 4: Update HesaplaMobile.tsx's prop type and imports**

In `src/app/hesapla/mobile/HesaplaMobile.tsx`:

Replace the imports (lines 1-17):

```tsx
"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { GirdiKarti, type GirdiKartiProps } from './GirdiKarti';
import { FiyatAciklamasi, type FiyatAciklamasiProps } from './FiyatAciklamasi';
import { AnalizSekmesi, type AnalizSekmesiProps } from './AnalizSekmesi';
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi';
import { StudioMobileLeaf, type StudioMobileLeafProps } from './StudioMobileLeaf';
import { ProgramMixMobileLeaf, type ProgramMixMobileLeafProps } from './ProgramMixMobileLeaf';
import { LandownerOfferMobileLeaf, type LandownerOfferMobileLeafProps } from './LandownerOfferMobileLeaf';
import { Studio2DMobileLeaf, type Studio2DMobileLeafProps } from './Studio2DMobileLeaf';
import { StudioScenarioMobileLeaf, type StudioScenarioMobileLeafProps } from './StudioScenarioMobileLeaf';
import type { Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';
```

with:

```tsx
"use client";

import { MobileScreen } from '@/components/mobile/MobileScreen';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { IconSettings } from '@/components/icons';
import { SonucKarti, type SonucKartiProps } from './SonucKarti';
import { GirdiKarti, type GirdiKartiProps } from './GirdiKarti';
import { SonucDetayiMobileLeaf, type SonucDetayiMobileLeafProps } from './SonucDetayiMobileLeaf';
import { TasarimStudyosuHub } from './TasarimStudyosuHub';
import { SenaryoKarsilastirmaSekmesi } from './SenaryoKarsilastirmaSekmesi';
import { StudioMobileLeaf, type StudioMobileLeafProps } from './StudioMobileLeaf';
import { ProgramMixMobileLeaf, type ProgramMixMobileLeafProps } from './ProgramMixMobileLeaf';
import { LandownerOfferMobileLeaf, type LandownerOfferMobileLeafProps } from './LandownerOfferMobileLeaf';
import { Studio2DMobileLeaf, type Studio2DMobileLeafProps } from './Studio2DMobileLeaf';
import { StudioScenarioMobileLeaf, type StudioScenarioMobileLeafProps } from './StudioScenarioMobileLeaf';
import type { Scenario } from '@/components/ScenarioCompare';
import styles from './mobile.module.css';
```

Replace the prop type block (lines 19-65) — remove `fisAcik`,
`fiyatAciklamasi`, `analizAcik`, `analiz`; add `sonucDetayiAcik`,
`sonucDetayi`, `studioHubAcik`, `onStudioHubAc`, `onStudioHubKapat`:

```ts
export type HesaplaMobileProps = {
    sonuc: SonucKartiProps;
    girdi: GirdiKartiProps;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    /** "Sonuç Detayı" yaprağı açık mı — Hesap Fişi + Analiz birleşimi
        (2026-08-23 IA sadeleştirmesi). Durum `page.tsx`te yaşar. */
    sonucDetayiAcik: boolean;
    sonucDetayi: SonucDetayiMobileLeafProps;
    /** Girdi kartinin altindaki etiketli buton `4f` yapragini acar — gelismis
        ayarlara TEK kapi (spec K4/K5: basliktaki disli ve konum cipi kalkti). */
    onAyarlarAc: () => void;
    /** Studio 3D onizleme derinlestirme yapragi acik mi. Bilinen bosluk
        kapatildi: oncesi Studio yalnizca masaustu dalinda kabloluydu. */
    studioAcik: boolean;
    studio: StudioMobileLeafProps;
    /** Program Dagilimi derinlestirme yapragi acik mi (Faz 2A Task 3). */
    programMixAcik: boolean;
    programMix: ProgramMixMobileLeafProps;
    /** Arsa Sahibi Teklifi derinlestirme yapragi acik mi (Faz 2B Task 3). */
    landownerOfferAcik: boolean;
    landownerOffer: LandownerOfferMobileLeafProps;
    /** 2D Yerleşim Tahtası derinlestirme yapragi acik mi (Faz 3A). */
    studio2DAcik: boolean;
    studio2D: Studio2DMobileLeafProps;
    /** Senaryolar & Karşılaştırma derinlestirme yapragi acik mi (Faz 3B). */
    studioScenarioAcik?: boolean;
    studioScenario?: StudioScenarioMobileLeafProps;
    /** "Tasarım Stüdyosu" iç-içe hub menüsü açık mı — hiçbir alt-yaprak
        (studioAcik/programMixAcik/studio2DAcik/studioScenarioAcik) açık
        DEĞİLKEN ve bu true iken görünür (2026-08-23 IA sadeleştirmesi). */
    studioHubAcik: boolean;
    onStudioHubKapat: () => void;
    /** Hub'ın 4 alt-butonunun açtığı yapraklar — `SonucKarti`'nin eski
        `onStudioAc`/`onProgramMixAc`/`onStudio2DAc`/`onStudioScenarioAc`
        callback'leriyle AYNI setter'lara (`page.tsx`te) bağlanır, yalnızca
        artık `SonucKarti` yerine `TasarimStudyosuHub`'tan çağrılırlar. */
    onYerlesimAc: () => void;
    onProgramAc: () => void;
    on3DAc: () => void;
    onSenaryolarAc: () => void;
    /** Sabit CTA — masaustundeki "Ozet Rapor Olustur" akisinin mobil karsiligi. */
    ctaMetni: string;
    ctaDevreDisi: boolean;
    onCta: () => void;
    /** Masaustundeki savedScenarios ile AYNI state, page.tsx'ten prop olarak akar. */
    savedScenarios: Scenario[];
    onAddScenario: () => void;
    onRemoveScenario: (id: string) => void;
    /** `!!result` — sabit CTA cubugundaki "+ Karsilastir" butonunun etkinlik kosulu. */
    hasResult: boolean;
    /** Karsilastirma derinlestirme yapragi acik mi. Durum `page.tsx`te yasar. */
    karsilastirmaAcik: boolean;
    onKarsilastirmaAc: () => void;
    onKarsilastirmaKapat: () => void;
    onShareRequest: (ids: string[]) => Promise<string | null>;
};
```

(Note: `onStudioHubAc` — the callback that OPENS the hub — is NOT a
new prop here: it's `sonuc.onStudioHubAc`, already part of
`SonucKartiProps` from Task 5, forwarded to `SonucKarti` as before.
What's new on `HesaplaMobileProps` is `onStudioHubKapat` (closes the
hub) plus the four `onYerlesimAc`/`onProgramAc`/`on3DAc`/
`onSenaryolarAc` callbacks the hub's own buttons call.)

Replace the function's destructured props (lines 74-104) — remove
`fisAcik`, `fiyatAciklamasi`, `analizAcik`, `analiz`; add
`sonucDetayiAcik`, `sonucDetayi`, `studioHubAcik`, `onStudioHubKapat`,
`onYerlesimAc`, `onProgramAc`, `on3DAc`, `onSenaryolarAc`:

```ts
export function HesaplaMobile({
    sonuc,
    girdi,
    sonucDetayiAcik,
    sonucDetayi,
    onParselDogrulaAc,
    onAyarlarAc,
    studioAcik,
    studio,
    programMixAcik,
    programMix,
    landownerOfferAcik,
    landownerOffer,
    studio2DAcik,
    studio2D,
    studioScenarioAcik,
    studioScenario,
    studioHubAcik,
    onStudioHubKapat,
    onYerlesimAc,
    onProgramAc,
    on3DAc,
    onSenaryolarAc,
    ctaMetni,
    ctaDevreDisi,
    onCta,
    savedScenarios,
    onAddScenario,
    onRemoveScenario,
    hasResult,
    karsilastirmaAcik,
    onKarsilastirmaAc,
    onKarsilastirmaKapat,
    onShareRequest,
}: HesaplaMobileProps) {
```

- [ ] **Step 5: Rewrite the ternary chain**

Replace the render block (lines 125-187):

```tsx
                {studioScenarioAcik && studioScenario
                    ? <StudioScenarioMobileLeaf {...studioScenario} />
                    : studio2DAcik
                    ? <Studio2DMobileLeaf {...studio2D} />
                    : landownerOfferAcik
                    ? <LandownerOfferMobileLeaf {...landownerOffer} />
                    : programMixAcik
                    ? <ProgramMixMobileLeaf {...programMix} />
                    : studioAcik
                    ? <StudioMobileLeaf {...studio} />
                    : analizAcik
                    ? <AnalizSekmesi {...analiz} />
                    : karsilastirmaAcik
                    ? <SenaryoKarsilastirmaSekmesi scenarios={savedScenarios} onKapat={onKarsilastirmaKapat} onShareRequest={onShareRequest} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            {fisAcik
                                ? <FiyatAciklamasi {...fiyatAciklamasi} />
                                : (
                                    <>
                                        <GirdiKarti {...girdi} onParselDogrulaAc={onParselDogrulaAc} />
                                        {/* Tasarim 2a.html:39 — girdi kartinin ALTINDA birincil
                                            kesif yolu. Baslikaki disli ikonu tek basina kalsaydi
                                            kullanici bu ekrani zor bulurdu. */}
                                        <button
                                            type="button"
                                            className={styles.gelismisAyarlarBtn}
                                            onClick={onAyarlarAc}
                                        >
                                            <span className={styles.gelismisAyarlarIkon}>
                                                <IconSettings size={16} strokeWidth={2.2} />
                                            </span>
                                            Gelişmiş ayarlar · risk, iksa, kâr
                                        </button>
                                        {savedScenarios.length > 0 && (
                                            <div className={styles.senaryoPillSatiri}>
                                                {savedScenarios.map(s => (
                                                    <span key={s.id} className={styles.senaryoPill}>
                                                        {s.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveScenario(s.id)}
                                                            aria-label={`${s.name}'i kaldır`}
                                                            className={styles.senaryoPillKaldir}
                                                        >×</button>
                                                    </span>
                                                ))}
                                                {savedScenarios.length >= 2 && (
                                                    <button
                                                        type="button"
                                                        className={styles.senaryoKarsilastirCip}
                                                        onClick={onKarsilastirmaAc}
                                                    >
                                                        Karşılaştır ({savedScenarios.length}) ›
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                        </>
                    )}
```

with:

```tsx
                {studioScenarioAcik && studioScenario
                    ? <StudioScenarioMobileLeaf {...studioScenario} />
                    : studio2DAcik
                    ? <Studio2DMobileLeaf {...studio2D} />
                    : landownerOfferAcik
                    ? <LandownerOfferMobileLeaf {...landownerOffer} />
                    : programMixAcik
                    ? <ProgramMixMobileLeaf {...programMix} />
                    : studioAcik
                    ? <StudioMobileLeaf {...studio} />
                    : studioHubAcik
                    ? <TasarimStudyosuHub
                        onKapat={onStudioHubKapat}
                        onYerlesimAc={onYerlesimAc}
                        onProgramAc={onProgramAc}
                        on3DAc={on3DAc}
                        onSenaryolarAc={onSenaryolarAc}
                      />
                    : sonucDetayiAcik
                    ? <SonucDetayiMobileLeaf {...sonucDetayi} />
                    : karsilastirmaAcik
                    ? <SenaryoKarsilastirmaSekmesi scenarios={savedScenarios} onKapat={onKarsilastirmaKapat} onShareRequest={onShareRequest} />
                    : (
                        <>
                            <SonucKarti {...sonuc} />
                            <GirdiKarti {...girdi} onParselDogrulaAc={onParselDogrulaAc} />
                            {/* Tasarim 2a.html:39 — girdi kartinin ALTINDA birincil
                                kesif yolu. Baslikaki disli ikonu tek basina kalsaydi
                                kullanici bu ekrani zor bulurdu. */}
                            <button
                                type="button"
                                className={styles.gelismisAyarlarBtn}
                                onClick={onAyarlarAc}
                            >
                                <span className={styles.gelismisAyarlarIkon}>
                                    <IconSettings size={16} strokeWidth={2.2} />
                                </span>
                                Gelişmiş ayarlar · risk, iksa, kâr
                            </button>
                            {savedScenarios.length > 0 && (
                                <div className={styles.senaryoPillSatiri}>
                                    {savedScenarios.map(s => (
                                        <span key={s.id} className={styles.senaryoPill}>
                                            {s.name}
                                            <button
                                                type="button"
                                                onClick={() => onRemoveScenario(s.id)}
                                                aria-label={`${s.name}'i kaldır`}
                                                className={styles.senaryoPillKaldir}
                                            >×</button>
                                        </span>
                                    ))}
                                    {savedScenarios.length >= 2 && (
                                        <button
                                            type="button"
                                            className={styles.senaryoKarsilastirCip}
                                            onClick={onKarsilastirmaAc}
                                        >
                                            Karşılaştır ({savedScenarios.length}) ›
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
```

`TasarimStudyosuHub` calls the SAME four opener callbacks `SonucKarti`
used to call directly before this plan (`onStudioAc`/`onProgramMixAc`/
`onStudio2DAc`/`onStudioScenarioAc`) — renamed to `on3DAc`/`onProgramAc`/
`onYerlesimAc`/`onSenaryolarAc` and moved from `SonucKartiProps` onto
`HesaplaMobileProps` (added above in this same step), since the hub —
not `SonucKarti` — is what calls them now. `page.tsx` wires all four to
the SAME `setMobilXAcik` setters as before (Step 8, below).

- [ ] **Step 6: Run HesaplaMobile.test.tsx, verify it passes**

Run: `npx jest src/app/hesapla/mobile/HesaplaMobile.test.tsx`
Expected: PASS, all tests green.

- [ ] **Step 7: Wire page.tsx's state — merge fisAcik+analizAcik, add studioHubAcik**

In `src/app/hesapla/page.tsx`, replace these two `useState` lines
(152, 155 — keep everything between/around them, including their
comments, untouched):

```ts
  const [mobilFisAcik, setMobilFisAcik] = useState<boolean>(false);
```
```ts
  const [mobilAnalizAcik, setMobilAnalizAcik] = useState<boolean>(false);
```

with a single:

```ts
  const [mobilSonucDetayiAcik, setMobilSonucDetayiAcik] = useState<boolean>(false);
```

Immediately after line 171 (`const [mobilAyarlarAcik, setMobilAyarlarAcik] = useState(false);`), add:

```ts
  const [mobilStudioHubAcik, setMobilStudioHubAcik] = useState<boolean>(false);
```

- [ ] **Step 8: Wire page.tsx's prop-passing block**

In `src/app/hesapla/page.tsx`, inside the `sonuc={{ ... }}` object
(around line 1069-1076), replace:

```ts
            onOrnekProjeIleDene: handleOrnekProjeIleDene,
            onFisAc: () => setMobilFisAcik(true),
            onAnalizAc: () => setMobilAnalizAcik(true),
            onStudioAc: () => setMobilStudioAcik(true),
            onProgramMixAc: () => setMobilProgramMixAcik(true),
            onLandownerOfferAc: () => setMobilLandownerOfferAcik(true),
            onStudio2DAc: () => setMobilStudio2DAcik(true),
            onStudioScenarioAc: () => setMobilStudioScenarioAcik(true),
```

with:

```ts
            onOrnekProjeIleDene: handleOrnekProjeIleDene,
            onSonucDetayiAc: () => setMobilSonucDetayiAcik(true),
            onStudioHubAc: () => setMobilStudioHubAcik(true),
            onLandownerOfferAc: () => setMobilLandownerOfferAcik(true),
```

Replace the `fisAcik`/`fiyatAciklamasi`/`onAyarlarAc`/`analizAcik`/
`analiz` block (lines 1078-1094):

```ts
          fisAcik={mobilFisAcik}
          fiyatAciklamasi={{
            result,
            apartmentSize,
            unitPrice: globalUnitPrice,
            landSharePercent: Math.round(effectiveLandShareRatio),
            profitLabel: profitLevels.find(p => p.value === builderProfit)?.label ?? 'Özel',
            profitMultiplier: builderProfit,
            onKapat: () => setMobilFisAcik(false),
            onKarDegistir: () => { setMobilAyarBolumu('kar'); setMobilAyarlarAcik(true); },
          }}
          onAyarlarAc={() => { setMobilAyarBolumu(undefined); setMobilAyarlarAcik(true); }}
          analizAcik={mobilAnalizAcik}
          analiz={{
            result, baseInput: chartBaseInput, marketPrice: marketPriceNum,
            onKapat: () => setMobilAnalizAcik(false),
          }}
```

with:

```ts
          onAyarlarAc={() => { setMobilAyarBolumu(undefined); setMobilAyarlarAcik(true); }}
          sonucDetayiAcik={mobilSonucDetayiAcik}
          sonucDetayi={{
            fiyatAciklamasi: {
              result,
              apartmentSize,
              unitPrice: globalUnitPrice,
              landSharePercent: Math.round(effectiveLandShareRatio),
              profitLabel: profitLevels.find(p => p.value === builderProfit)?.label ?? 'Özel',
              profitMultiplier: builderProfit,
              onKarDegistir: () => { setMobilAyarBolumu('kar'); setMobilAyarlarAcik(true); },
            },
            analiz: { result, baseInput: chartBaseInput, marketPrice: marketPriceNum },
            onKapat: () => setMobilSonucDetayiAcik(false),
          }}
```

Immediately after the `studioAcik={mobilStudioAcik}` / `studio={{ ... }}`
block (which ends with `onKapat: () => setMobilStudioAcik(false), }}`
around line 1109), and BEFORE `programMixAcik={mobilProgramMixAcik}`
(line 1110), insert the four new hub-opener props and the hub's own
open/close state — these forward to the SAME setters the removed
`onProgramMixAc`/`onLandownerOfferAc` (wait — `onLandownerOfferAc`
stays on `sonuc`, not the hub) — to be precise, forward to the SAME
setters the removed `onStudioAc`/`onProgramMixAc`/`onStudio2DAc`/
`onStudioScenarioAc` used:

```ts
          studioHubAcik={mobilStudioHubAcik}
          onStudioHubKapat={() => setMobilStudioHubAcik(false)}
          onYerlesimAc={() => setMobilStudio2DAcik(true)}
          onProgramAc={() => setMobilProgramMixAcik(true)}
          on3DAc={() => setMobilStudioAcik(true)}
          onSenaryolarAc={() => setMobilStudioScenarioAcik(true)}
```

- [ ] **Step 9: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: 0 errors. If any remain, they are almost certainly a missed
rename — search for `mobilFisAcik`, `mobilAnalizAcik`, `onFisAc`,
`onAnalizAc`, `onStudioAc`, `onProgramMixAc`, `onStudio2DAc`,
`onStudioScenarioAc` across `page.tsx` and `HesaplaMobile.tsx` and
confirm each remaining reference is intentional (the four
`setMobilXAcik` setters themselves, e.g. `setMobilStudioAcik`, `studio2D`'s
own internal `onKapat`, etc. — these are NOT renamed, only their
former direct callers from `SonucKarti`/`HesaplaMobile` are rewired
through the hub).

- [ ] **Step 10: Run the full mobile test suite**

Run: `npx jest src/app/hesapla`
Expected: all suites PASS, 0 failures.

- [ ] **Step 11: Commit**

```bash
git add src/app/hesapla/mobile/HesaplaMobile.tsx src/app/hesapla/mobile/HesaplaMobile.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(hesapla-mobile): wire SonucDetayiMobileLeaf + TasarimStudyosuHub into page.tsx and HesaplaMobile's ternary chain"
```

---

## Final Verification (after all 6 tasks)

- [ ] **Full project type-check and test suite**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npx jest` (whole project, not just `src/app/hesapla`) — confirm
no unrelated suite broke (nothing outside `src/app/hesapla/mobile/`
and `page.tsx` was touched, so this should already be green, but the
project's own convention — see `[[feedback_verification_needs_real_build_not_just_dev_or_tests]]`
— is to also run a real build for Turbopack/CSS-Modules build-time-only
issues jest/webpack-dev can't catch).

- [ ] **Real production build**

Run: `npm run build`
Expected: succeeds with 0 errors (this catches CSS Modules issues like
`composes` inside `@media` that `next dev --webpack` and jest cannot).

- [ ] **Playwright visual/interaction check (mobile viewport 390×844)**

Write a one-off script (or reuse `output/playwright/` conventions
already in this repo) that, against a real logged-in session with a
result present, verifies:
1. The main screen shows exactly 3 buttons under the result card:
   "Sonuç Detayı", "Tasarım Stüdyosu", "Arsa Sahibi Teklifi".
2. Tapping "Sonuç Detayı" opens a full-screen leaf with "Özet"
   selected by default, showing the price breakdown; tapping
   "Grafikler" switches to the 3 charts (Hassasiyet/Kırılma
   Noktası/Finansal Özet) with no Maliyet Dağılımı panel; "Kapat"
   returns to the main screen.
3. Tapping "Tasarım Stüdyosu" opens the hub with 4 buttons
   (Yerleşim/Program/3D Görünüm/Tasarım Senaryoları); tapping any one
   opens the corresponding EXISTING leaf; that leaf's own "Kapat"
   returns to the HUB (not the main screen); the hub's own "Kapat"
   returns to the main screen.
4. From "Tasarım Senaryoları", triggering a rebalance (if reachable in
   the test data) still jumps directly to "Arsa Sahibi Teklifi" per
   the existing `onRebalanceClick` cross-link — confirms this plan
   didn't disturb it.
5. Screenshot every screen and actually look at them (per this
   project's established verification standard) — not just trust that
   the script exited 0.

Report any deviation before considering this plan complete.
