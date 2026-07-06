# Hesapla Mobil Görsel Kimlik — "Mühür Lacivert" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the mobile view of `src/app/hesapla` a "Mühür Lacivert" (ink navy + brass seal) visual identity — colors, typography, and two signature motifs (Canlı Mühür badge animation, kat-dilimi accordion strip) — without touching desktop or any other page.

**Architecture:** All new rules live inside the *existing* `@media (max-width: 768px)` block in `src/app/hesapla/page.module.css` (starts at the `.container { padding: calc(...) ... }` rule). This is the same block Faz 1 already used to override shared-class properties for mobile only (e.g. `.blueBoxTop h2 { font-size: 2rem }`), so gating by this media query is a proven, already-accepted way to change a shared element's mobile appearance without affecting desktop. Two elements live in other files (`Button.module.css`, `RangeSlider.module.css`) and are shared with the rest of the app; those are overridden from *inside* the same hesapla media query using higher-specificity selectors (`button.sealPrimaryBtn`, `.sealRangeSlider input[type="range"]`) rather than edited in place — this is the exact pattern already used and documented for the `+Karşılaştır` button (`button.compareBtn`, see comment at `page.module.css:1164-1166`) after a real specificity bug was found there.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, CSS Modules, framer-motion (already a dependency), Jest + React Testing Library.

## Global Constraints

- Scope is **hesapla page, mobile only** (`@media (max-width: 768px)`). Desktop (`.desktopSidebar`, masaüstü `.blueBox`) must render byte-identical to before this plan.
- No new tokens in `src/app/globals.css`. All new custom properties are defined inside `src/app/hesapla/page.module.css`'s mobile media query.
- No new npm dependency. No new display/serif font — only a `tabular-nums` + system/mono stack change on digit-heavy elements.
- Existing semantic colors (`--green`, `--orange`, `--red`) and the app's blue brand color (`--primary` #1F6FEB, used outside this page) are untouched.
- The mobile hesapla surface becomes a **fixed dark "ink" appearance regardless of the user's light/dark theme toggle** — this is a direct, approved consequence of the mockup the user picked (a deliberately single-visual-world premium surface, same as `.blueBox` already hardcodes `color: white` today regardless of theme). Do not make the new ink/brass colors theme-reactive.
- `.compareBtn` ("+ Karşılaştır") keeps its existing green color — it is intentionally excluded from the brass-accent sweep (its green is tied to the scenario-compare feature's own color coding, not the general outline-button blue).
- `.blueBoxTop` (📐) and `.pagerLabel` (📊/📈/💰) emoji are **out of scope** — they live in JSX shared verbatim with desktop. Only `StickyActionBar`'s 📄 (a genuinely mobile-only component, `display: none` on desktop per `StickyActionBar.module.css:3`) is replaced with an SVG icon.
- Run after every task: `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npx jest --no-coverage`. All three must stay clean/green.

---

## File Structure

- **Modify** `src/app/hesapla/page.module.css` — add mobile-scoped tokens, recolor mobile-only + mobile-gated-shared surfaces, add kat-dilimi strip, add brass button/slider override selectors.
- **Modify** `src/app/hesapla/page.tsx` — swap inline `topResultBadge` JSX for the new `<SealBadge>` component, add `className` props to the two Button usages that get brass styling, add `className` to the mobile `RangeSlider`, replace the `📄` emoji with inline SVG.
- **Create** `src/app/hesapla/SealBadge.tsx` — small presentational component wrapping the "Piyasaya Göre" badge in a framer-motion enter animation, respecting `prefers-reduced-motion`.
- **Create** `src/app/hesapla/SealBadge.test.tsx` — RTL tests for `SealBadge`.
- **Create** `src/app/hesapla/pageStyles.scope.test.ts` — plain Node/Jest tests that read the raw CSS text and guard against the two known leak risks (new tokens escaping into global scope, kat-dilimi strip escaping into the desktop drawer).

**Interfaces:**
- `SealBadge` (new, Task 5) — `interface SealBadgeProps { show: boolean; percentage: number }`, default export none, named export `SealBadge`. Renders nothing when `show` is `false`; renders the badge (icon + `Piyasaya Göre: %{percentage} DAHA UCUZ`) when `true`.
- No other new shared interfaces — all other changes are CSS + inline JSX edits with no new exported symbols.

---

### Task 1: Mobile-scoped Kadastro tokens + scope-guard test

**Files:**
- Modify: `src/app/hesapla/page.module.css:1362-1369`
- Test: `src/app/hesapla/pageStyles.scope.test.ts` (create)

**Interfaces:**
- Produces: CSS custom properties `--seal-ink`, `--seal-ink-2`, `--seal-accent`, `--seal-accent-rgb`, `--seal-paper`, scoped to `.container` inside the mobile media query. Every later task in this plan reads these tokens.

- [ ] **Step 1: Write the failing scope-guard test**

Create `src/app/hesapla/pageStyles.scope.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(
  path.join(__dirname, '../globals.css'),
  'utf8'
);

describe('hesapla mobil Mühür Lacivert token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|paper)/);
  });

  it('--seal-accent token\'ı page.module.css içinde tanımlı olmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*#C9A15A/);
  });

  it('--seal-accent tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(lastMobileMediaIndex);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — `--seal-accent` not found (`pageCss` doesn't contain it yet).

- [ ] **Step 3: Add the tokens to the existing mobile media query**

In `src/app/hesapla/page.module.css`, find (around line 1362):

```css
@media (max-width: 768px) {
    .container {
        padding: calc(12px + env(safe-area-inset-top, 40px)) 0 calc(var(--bottomnav-height) + 76px) !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        min-height: 100dvh !important;
    }
```

Replace with:

```css
@media (max-width: 768px) {
    .container {
        padding: calc(12px + env(safe-area-inset-top, 40px)) 0 calc(var(--bottomnav-height) + 76px) !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        min-height: 100dvh !important;

        /* Faz 1.5 — Mühür Lacivert: mobil-only kimlik token'ları (bkz. docs/superpowers/specs/2026-07-06-hesapla-mobil-muhur-lacivert-design.md) */
        --seal-ink: #0F2A43;
        --seal-ink-2: #16324F;
        --seal-accent: #C9A15A;
        --seal-accent-rgb: 201, 161, 90;
        --seal-paper: #F4F0E6;
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): Mühür Lacivert mobil token temeli + kapsam guard testi"
```

---

### Task 2: Palette + tabular-nums typography on result surfaces

**Files:**
- Modify: `src/app/hesapla/page.module.css` (mobile media query block, several rule additions listed below)

**Interfaces:**
- Consumes: `--seal-ink`, `--seal-ink-2`, `--seal-accent`, `--seal-accent-rgb`, `--seal-paper` from Task 1.

This task recolors the two "result" surfaces that appear on mobile — `.topResultCard` (mobile-only) and `.blueBox` (shared with desktop, but only touched here inside the mobile media query so desktop is unaffected) — plus `.statCard` and the digit-heavy values, so the whole mobile results area reads as one coherent ink+brass surface instead of a mix of the old blue gradient and the new ink card.

- [ ] **Step 1: Recolor `.topResultCard` and `.topResultBadge` for mobile**

In `src/app/hesapla/page.module.css`, find the exact spot where Task 1 closed `.container` (this is right before the `.desktopSidebar` override):

```css
        --seal-paper: #F4F0E6;
    }

    /* Mobilde: desktop sidebar gizli, mobil form + accordion görünür */
    .desktopSidebar {
        display: none !important;
    }
```

Insert the new rules between the `.container` closing `}` and the `.desktopSidebar` comment, so it reads:

```css
        --seal-paper: #F4F0E6;
    }

    .topResultCard {
        background: linear-gradient(160deg, var(--seal-ink) 0%, var(--seal-ink-2) 100%);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.08);
        border-color: rgba(var(--seal-accent-rgb), 0.25);
    }

    .topResultLabel {
        color: rgba(244, 240, 230, 0.7);
    }

    .topResultValue {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        color: var(--seal-paper);
    }

    .topResultBadge {
        background: rgba(var(--seal-accent-rgb), 0.16);
        border-color: rgba(var(--seal-accent-rgb), 0.4);
        color: var(--seal-paper);
    }
```

- [ ] **Step 2: Recolor `.blueBox` (shared "Hesap Sonuçları" hero) for mobile only**

In the same media query block, add:

```css
    .blueBox {
        background: linear-gradient(160deg, var(--seal-ink) 0%, var(--seal-ink-2) 100%);
        border-color: rgba(var(--seal-accent-rgb), 0.25);
    }

    .blueBoxTop h2 {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        font-size: 2rem; /* mevcut mobil override ile aynı deger, sadece font eklendi */
    }

    .blueBoxBottom {
        background: rgba(var(--seal-accent-rgb), 0.14);
    }

    .blueCircle {
        background: var(--seal-accent);
    }
```

`.blueBoxTop h2 { font-size: 2rem }` already exists further down in this same media query (around what is currently line 1434) — **delete that older duplicate rule** once this one is added, so there's a single source of truth. Find:

```css
    .blueBoxTop h2 {
        font-size: 2rem;
    }
```

and delete it (the replacement block above already includes `font-size: 2rem`).

- [ ] **Step 3: Recolor `.statCard` and its value typography**

Add to the same media query block:

```css
    .statCard {
        background: var(--seal-ink-2);
        border-color: rgba(var(--seal-accent-rgb), 0.18);
    }

    .statCard h5 {
        color: rgba(244, 240, 230, 0.65);
    }

    .statCardValue {
        font-family: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        color: var(--seal-paper);
    }

    .statCardValue span {
        color: rgba(244, 240, 230, 0.55);
    }
```

- [ ] **Step 4: Recolor the accordion shell for contrast against the ink background**

Add to the same media query block:

```css
    .accordion {
        background: var(--seal-ink-2);
        border-color: rgba(var(--seal-accent-rgb), 0.18);
    }

    .accordionSummary {
        color: var(--seal-paper);
    }
```

- [ ] **Step 5: Run the full check suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: all three clean/green, same pass count as before this task (this step is purely visual CSS — no new test assertions are expected to fail or newly pass).

- [ ] **Step 6: Manual visual check**

Run `npm run dev:next`, open `/hesapla` in a 390×844 mobile viewport (or Chrome DevTools device toolbar), confirm: the top result card, the "Hesap Sonuçları" blue box, stat cards, and the 3 accordions all now share the same ink-navy background with brass-tinted borders, and all TL/m²/% figures line up (tabular numbers) in the mono font. Confirm desktop viewport (≥1100px) is pixel-identical to before this task.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.module.css
git commit -m "feat(hesapla): mobilde sonuç yüzeylerine Mühür Lacivert paleti + tabular-nums"
```

---

### Task 3: "Kat Dilimi" accordion strip (scoped)

**Files:**
- Modify: `src/app/hesapla/page.module.css:1028-1044` region referenced from inside the mobile media query (new rule, not editing the shared `.drawerRow` rule itself)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (add 2 tests)

**Interfaces:**
- Consumes: `--seal-accent` from Task 1.

`.drawerRow` (`page.module.css:1028`) is shared between the mobile accordions and the desktop settings drawer (both render `AdvancedSettingsSections.tsx`, which only imports `page.module.css`). The strip must attach only when a `.drawerRow` is a descendant of `.mobileAccordions`, never to the bare class.

- [ ] **Step 1: Write the failing scope-guard tests**

In `src/app/hesapla/pageStyles.scope.test.ts`, add a new `describe` block:

```ts
describe('kat dilimi şeridi kapsamı', () => {
  it('.mobileAccordions .drawerRow::before selektörü tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\.mobileAccordions\s+\.drawerRow::before/);
  });

  it('çıplak .drawerRow::before (mobileAccordions olmadan) TANIMLI OLMAMALI', () => {
    // .mobileAccordions .drawerRow::before dışında hiçbir yerde bare .drawerRow::before olmamalı
    const bareRulePattern = /(?<!\.mobileAccordions\s)\.drawerRow::before/g;
    const matches = pageCss.match(bareRulePattern) ?? [];
    expect(matches.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — first new test fails (`.mobileAccordions .drawerRow::before` not found yet).

- [ ] **Step 3: Add the scoped strip rule**

In `src/app/hesapla/page.module.css`, inside the `@media (max-width: 768px)` block, add (near the other `.mobileAccordions` mobile rule, currently around line 1382):

```css
    .mobileAccordions .drawerRow {
        position: relative;
        padding-left: 14px;
    }

    .mobileAccordions .drawerRow::before {
        content: '';
        position: absolute;
        left: 0;
        top: 6px;
        bottom: 6px;
        width: 2.5px;
        border-radius: 2px;
        background: var(--seal-accent);
        opacity: 0.55;
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 6: Manual visual check**

In the mobile viewport, open each of the 3 accordions on `/hesapla`; confirm each settings row has a thin brass strip on its left edge. Open the desktop settings drawer (gear icon in `.desktopSidebar`, or resize ≥1100px) and confirm its rows have **no** strip — desktop must be unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): mobil accordion satırlarına kat-dilimi şeridi (scoped)"
```

---

### Task 4: Brass CTA / slider overrides (specificity-safe)

**Files:**
- Modify: `src/app/hesapla/page.tsx` (className additions on 2 `Button` usages and the mobile `RangeSlider`)
- Modify: `src/app/hesapla/page.module.css` (new selectors inside the mobile media query)
- Modify: `src/app/hesapla/pageStyles.scope.test.ts` (add 1 test)

**Interfaces:**
- Consumes: `--seal-accent`, `--seal-ink` from Task 1.
- Consumes: `Button` component (`src/components/ui/Button.tsx`) — accepts a `className` prop, appended after the variant class (`src/components/ui/Button.tsx:16`).
- Consumes: `RangeSlider` component (`src/components/ui/RangeSlider.tsx`) — accepts a `className` prop, applied to the outer wrapper `div` (`RangeSlider.tsx:28`), and internally renders a plain `<input type="range">` (no wrapper class reachable from outside, so override via the `input[type="range"]` element selector).

Both `Button.module.css` and `RangeSlider.module.css` are shared components used elsewhere in the app (or reserved for future reuse) — they must not be edited. `page.module.css:1164-1166` already documents a real bug from a past attempt to override a `Button` variant with a same-specificity class selector (`.compareBtn` losing to `.outline` depending on import order); the fix there was an element+class selector (`button.compareBtn`). This task follows that exact proven pattern.

- [ ] **Step 1: Write the failing scope-guard test**

In `src/app/hesapla/pageStyles.scope.test.ts`, add:

```ts
describe('paylaşılan bileşen override\'larının özgünlük deseni', () => {
  it('Rapor Kaydet/PDF İndir butonları element+class selektörüyle override edilmeli (bkz. compareBtn hata geçmişi)', () => {
    expect(pageCss).toMatch(/button\.sealPrimaryBtn/);
    expect(pageCss).toMatch(/button\.sealOutlineBtn/);
  });

  it('mobil RangeSlider brass override\'ı input\\[type="range"\\] elementine scope\'lanmalı', () => {
    expect(pageCss).toMatch(/\.sealRangeSlider input\[type="range"\]/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: FAIL — none of the 3 selector strings exist yet.

- [ ] **Step 3: Add `className`s in `page.tsx`**

In `src/app/hesapla/page.tsx`, find the action buttons (around line 700):

```tsx
              <Button variant="outline" onClick={handlePdfDownload} disabled={!result}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                PDF İndir
              </Button>
              <Button variant="primary" onClick={handleSaveReport} disabled={isSaving}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
              </Button>
```

Replace with:

```tsx
              <Button variant="outline" onClick={handlePdfDownload} disabled={!result} className={styles.sealOutlineBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                PDF İndir
              </Button>
              <Button variant="primary" onClick={handleSaveReport} disabled={isSaving} className={styles.sealPrimaryBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                {isSaving ? 'Kaydediliyor...' : 'Rapor Kaydet'}
              </Button>
```

(The `+ Karşılaştır` `Button` below keeps its existing `className={styles.compareBtn}` untouched — green stays.)

Now find the mobile `RangeSlider` usage (around line 491):

```tsx
                <RangeSlider
                  min={1}
                  max={100}
                  step={1}
                  value={landShareRatio}
                  onChange={(e) => {
                    setLandShareRatio(Number(e.target.value));
                    setIsApartmentCountEnabled(false);
                  }}
                />
```

Replace with:

```tsx
                <RangeSlider
                  min={1}
                  max={100}
                  step={1}
                  value={landShareRatio}
                  onChange={(e) => {
                    setLandShareRatio(Number(e.target.value));
                    setIsApartmentCountEnabled(false);
                  }}
                  className={styles.sealRangeSlider}
                />
```

- [ ] **Step 4: Add the CSS overrides**

In `src/app/hesapla/page.module.css`, inside the `@media (max-width: 768px)` block, add:

```css
    button.sealPrimaryBtn {
        background: var(--seal-accent);
        color: var(--seal-ink);
        box-shadow: none;
    }

    button.sealPrimaryBtn:hover:not(:disabled) {
        filter: brightness(1.05);
        box-shadow: none;
    }

    button.sealOutlineBtn {
        color: var(--seal-accent);
        border-color: var(--seal-accent);
    }

    button.sealOutlineBtn:hover:not(:disabled) {
        background: rgba(var(--seal-accent-rgb), 0.12);
    }

    .stickyCta {
        background: var(--seal-accent);
        color: var(--seal-ink);
    }

    .sealRangeSlider input[type="range"] {
        background: linear-gradient(to right, var(--seal-accent) var(--progress), rgba(255, 255, 255, 0.12) var(--progress));
    }

    .sealRangeSlider input[type="range"]::-webkit-slider-thumb {
        border-color: var(--seal-accent);
    }

    .sealRangeSlider input[type="range"]::-moz-range-thumb {
        border-color: var(--seal-accent);
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage`
Expected: PASS (all tests)

- [ ] **Step 6: Run the full check suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 7: Manual visual check**

Mobile viewport: confirm "Rapor Kaydet" and the sticky "Özet Rapor Oluştur" button are brass-filled with dark ink text; "PDF İndir" has a brass outline; "+ Karşılaştır" is still green (unchanged); the "Arsa Payı" slider in the top card fills brass as it's dragged. Desktop viewport: confirm all of the above are still blue/green exactly as before (no bleed).

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.module.css src/app/hesapla/pageStyles.scope.test.ts
git commit -m "feat(hesapla): mobil CTA/slider'a brass vurgu (specificity-safe override)"
```

---

### Task 5: "Canlı Mühür" — `SealBadge` component with enter animation

**Files:**
- Create: `src/app/hesapla/SealBadge.tsx`
- Create: `src/app/hesapla/SealBadge.test.tsx`
- Modify: `src/app/hesapla/page.tsx` (replace inline badge JSX, add derived `isCheaperThanMarket`/`cheaperPercentage` values)

**Interfaces:**
- Produces: `SealBadge({ show: boolean; percentage: number })` — named export from `src/app/hesapla/SealBadge.tsx`.
- Consumes: `styles.topResultBadge` from `page.module.css` (already styled by Task 2), `framer-motion`'s `motion`, `AnimatePresence`, `useReducedMotion` (all exported by the `framer-motion` package already in `package.json`).

- [ ] **Step 1: Write the failing tests**

Create `src/app/hesapla/SealBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { SealBadge } from './SealBadge';

describe('SealBadge', () => {
  it('show=false iken hiçbir şey render etmez', () => {
    render(<SealBadge show={false} percentage={0} />);
    expect(screen.queryByText(/DAHA UCUZ/)).not.toBeInTheDocument();
  });

  it('show=true iken yüzdeyi doğru gösterir', () => {
    render(<SealBadge show={true} percentage={33} />);
    expect(screen.getByText(/Piyasaya Göre: %33 DAHA UCUZ/)).toBeInTheDocument();
  });
});

describe('SealBadge — prefers-reduced-motion', () => {
  const setMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  it('prefers-reduced-motion: reduce iken de rozet metni görünür olmalı (animasyonsuz render)', () => {
    setMatchMedia(true);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });

  it('reduced motion kapalıyken de rozet metni görünür olmalı (animasyonlu render)', () => {
    setMatchMedia(false);
    render(<SealBadge show={true} percentage={12} />);
    expect(screen.getByText(/Piyasaya Göre: %12 DAHA UCUZ/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/hesapla/SealBadge.test.tsx --no-coverage`
Expected: FAIL with "Cannot find module './SealBadge'"

- [ ] **Step 3: Implement `SealBadge`**

Create `src/app/hesapla/SealBadge.tsx`:

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './page.module.css';

export interface SealBadgeProps {
  show: boolean;
  percentage: number;
}

/** "Canlı Mühür" — piyasaya göre daha ucuz olduğu andaki tek seferlik damga animasyonu. */
export function SealBadge({ show, percentage }: SealBadgeProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.topResultBadge}
          initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.18 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Piyasaya Göre: %{percentage} DAHA UCUZ
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/app/hesapla/SealBadge.test.tsx --no-coverage`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire `SealBadge` into `page.tsx`**

In `src/app/hesapla/page.tsx`, add the import near the other local imports (around line 22):

```tsx
import { SealBadge } from './SealBadge';
```

Find the mobile top result card block (around line 444):

```tsx
            <div className={styles.topResultCard}>
              <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
              <div className={styles.topResultValue}>
                {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
              </div>
              {parseInt(manualMarketPrice.replace(/\D/g, '') || '0') > 0 && result?.FD_total && parseInt(manualMarketPrice.replace(/\D/g, '') || '0') > result.FD_total ? (
                <div className={styles.topResultBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                  Piyasaya Göre: %{Math.round(((parseInt(manualMarketPrice.replace(/\D/g, '') || '0') - result.FD_total) / parseInt(manualMarketPrice.replace(/\D/g, '') || '0')) * 100)} DAHA UCUZ
                </div>
              ) : null}
            </div>
```

Replace with:

```tsx
            <div className={styles.topResultCard}>
              <div className={styles.topResultLabel}>MİNİMUM DAİRE FİYATI</div>
              <div className={styles.topResultValue}>
                {result?.FD_total ? `${Math.round(result.FD_total).toLocaleString('tr-TR')} TL` : '---'}
              </div>
              <SealBadge
                show={marketPriceNum > 0 && !!result?.FD_total && marketPriceNum > result.FD_total}
                percentage={result?.FD_total ? Math.round(((marketPriceNum - result.FD_total) / marketPriceNum) * 100) : 0}
              />
            </div>
```

Then add the `marketPriceNum` derived value once, right before the `return (` statement (around line 313), so both the badge and any future usage share one parse:

```tsx
  const marketPriceNum = parseInt(manualMarketPrice.replace(/\D/g, '') || '0');

  return (
```

- [ ] **Step 6: Run the full check suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green.

- [ ] **Step 7: Manual visual check**

On `/hesapla` mobile viewport, set a market price above the calculated minimum price (e.g. type `9.000.000` into "Yaklaşık Piyasa Fiyatı"), confirm the badge appears with a one-time settle-in animation; nudge another input slightly (e.g. apartment size) while the badge stays visible and confirm it does **not** replay the animation; lower the market price below the minimum and confirm the badge disappears.

- [ ] **Step 8: Commit**

```bash
git add src/app/hesapla/SealBadge.tsx src/app/hesapla/SealBadge.test.tsx src/app/hesapla/page.tsx
git commit -m "feat(hesapla): Canlı Mühür rozeti - framer-motion damga animasyonu + reduced-motion"
```

---

### Task 6: StickyActionBar icon — emoji → SVG

**Files:**
- Modify: `src/app/hesapla/page.tsx:856-860`

**Interfaces:**
- None new — pure JSX swap inside an already mobile-only component (`StickyActionBar`, `display: none` on desktop per `StickyActionBar.module.css:3`).

- [ ] **Step 1: Replace the emoji with an inline SVG**

In `src/app/hesapla/page.tsx`, find:

```tsx
      <StickyActionBar aboveBottomNav>
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={isSaving}>
          {isSaving ? 'Kaydediliyor...' : '📄 Özet Rapor Oluştur'}
        </button>
      </StickyActionBar>
```

Replace with:

```tsx
      <StickyActionBar aboveBottomNav>
        <button className={styles.stickyCta} onClick={handleSaveReport} disabled={isSaving}>
          {!isSaving && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.btnIcon} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {isSaving ? 'Kaydediliyor...' : 'Özet Rapor Oluştur'}
        </button>
      </StickyActionBar>
```

- [ ] **Step 2: Run the full check suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage`
Expected: clean/green (no behavior change — `onClick`/`disabled` wiring is untouched, only the label content changed).

- [ ] **Step 3: Manual visual check**

On mobile viewport, confirm the sticky bottom button shows a line-art document icon instead of 📄, next to "Özet Rapor Oluştur", and that tapping it still triggers the save flow (toast appears / auth modal appears if logged out).

- [ ] **Step 4: Commit**

```bash
git add src/app/hesapla/page.tsx
git commit -m "feat(hesapla): sticky CTA'daki emoji ikonu SVG ile değiştir"
```

---

### Task 7: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full command suite**

Run: `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --no-coverage && npm run build`
Expected: all four clean/green (build succeeds with no new warnings).

- [ ] **Step 2: Re-run the mobile Playwright smoke harness**

Run the Faz 0 mobile smoke spec (390×844, horizontal-overflow assertion) against `/hesapla`. Confirm no new horizontal overflow was introduced by the ink-card backgrounds, brass borders, or the kat-dilimi strip's `position: absolute` left offset.

- [ ] **Step 3: Full manual pass on a real flow**

Starting from a fresh `/hesapla` load on a 390×844 mobile viewport: change apartment size, land share, risk, and builder profit; enter a market price above and below the computed minimum; open and close all 3 accordions; save a report. Confirm: no layout shift/overflow, ink+brass palette is consistent across every surface touched in Tasks 2-4, the Canlı Mühür badge animates once per threshold crossing, and desktop (≥1100px) is visually identical to the pre-plan baseline.

- [ ] **Step 4: Update the design spec with a completion note**

In `docs/superpowers/specs/2026-07-06-hesapla-mobil-muhur-lacivert-design.md`, add a short "Durum" line at the top noting the plan was implemented and on which commit range, so future sessions don't re-open this as pending work.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-06-hesapla-mobil-muhur-lacivert-design.md
git commit -m "docs(hesapla): Mühür Lacivert speci tamamlandı olarak işaretle"
```
