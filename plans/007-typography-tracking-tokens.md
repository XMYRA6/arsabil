# 007 — Introduce typography tracking scale tokens

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: LOW
- **Category**: Typography & cohesion
- **Estimated scope**: Additive CSS-only change. Add 4 custom properties to `src/app/globals.css`'s root token block. Migrate 9 of the 13 cited `letter-spacing` declarations to `var()` references across 2 files (`page.module.css`: 6/6 sites migrate cleanly; `mobile.module.css`: 3/7 sites migrate cleanly, 4/7 left as documented literals). No visual output changes. ~15 minutes of mechanical edits + verification.

## Problem

No centralized type-scale/tracking token system exists in this repo (confirmed: no `typography.ts`/`typography.css` file, no Tailwind config). `letter-spacing` is declared ad hoc across CSS Modules with no shared scale tied to font-size, making it easy for a new component to pick an arbitrary value that breaks the existing (mostly-correct) size-tracking relationship, and leaving no single place to tune the whole scale.

All 13 cited sites were re-read directly from the worktree at commit `a8235e4` to confirm current values and their surrounding font-size context (none had drifted from the audit):

**`src/app/hesapla/page.module.css`**

| Line | Selector | font-size | letter-spacing | Role |
|---|---|---|---|---|
| 69 | `.logo h1` | `1.6rem` (25.6px) | `-0.5px` | Large heading (site logo/title) |
| 532 | `.statCardValue` | `1.35rem` (21.6px) | `-0.5px` | Stat card large numeric value |
| 747 | `.hesapOzetiFiyatLabel` | `0.75rem` (12px), `text-transform: uppercase` | `0.5px` | Small uppercase label |
| 850 | `.topResultLabel` | `0.85rem` (13.6px), `text-transform: uppercase` | `1.5px` | Small uppercase badge/emphasis label inside the hero result card |
| 868 | `.topResultValue` | `2.2rem` (35.2px) | `-0.5px` | Large hero numeric value |
| 1290 | `.mobileCardTitle` | `1.35rem` (21.6px) | `-0.5px` | Large heading (mobile card title) |

**`src/app/hesapla/mobile/mobile.module.css`**

| Line | Selector | font-size | letter-spacing | Role |
|---|---|---|---|---|
| 45 | `.headerTitle` | `17px` (via `font: 800 17px Inter`) | `-.2px` | Mid-size heading (mobile header title) |
| 88 | `.sonucEtiket` | `10.5px` (via `font: 700 10.5px Inter`), uppercase | `.8px` | Small uppercase label |
| 97 | `.sonucFiyat` | `31px` | `-.8px` | Large hero numeric value (mobile) |
| 127 | `.metrikEtiket` | `9.5px` (via `font: 700 9.5px Inter`), uppercase | `.5px` | Small uppercase label |
| 212 | `.girdiEtiket` | `10.5px` (via `font: 700 10.5px Inter`), uppercase | `.5px` | Small uppercase label |
| 444 | `.karsEtiketMetin` | `10.5px` (via `font: 700 10.5px Inter`), uppercase | `.5px` | Small uppercase label |
| 1005 | `.analizBaslik` | `12.5px` (via `font: 800 12.5px Inter`), no uppercase | `.3px` | Small section heading (not a label/caps element) |

Grouping the 13 values by literal amount shows three tight, exactly-matching clusters and four outliers that don't cleanly fit any cluster (all four are in `mobile.module.css`):

- **`-0.5px`** (large text, negative tracking): lines 69, 532, 868, 1290 — 4 sites, font-size range 21.6px–35.2px. Exact match, no rounding needed.
- **`0.5px`** (small uppercase labels, positive tracking): lines 747, 127, 212, 444 — 4 sites, font-size range 9.5px–12px. Exact match, no rounding needed.
- **`1.5px`** (emphasis/badge uppercase label): line 850 — 1 site, 13.6px. Exact match, no rounding needed.
- **Outliers, no clean token match** (nearest cluster is >0.1px away, so forcing them would visibly shift the text):
  - Line 45: `-.2px` — nearest cluster is `-0.5px`, a 0.3px shift. Leave as literal.
  - Line 88: `.8px` — nearest cluster is `0.5px`, a 0.3px shift. Leave as literal. (Notably this is the same 10.5px font-size as lines 212/444, which use `.5px` — this is exactly the kind of unenforced drift the finding describes.)
  - Line 97: `-.8px` — nearest cluster is `-0.5px`, a 0.3px shift. Leave as literal.
  - Line 1005: `.3px` — nearest cluster is `0.5px`, a 0.2px shift. Leave as literal.

This confirms the finding: the *direction* of tracking (negative on large text, positive on small labels) is consistently correct, but the *magnitude* has already drifted in 4 of 13 places with no scale to catch it.

## Target

Add to `src/app/globals.css`, inside the existing brand-core `:root { }` block at the top of the file (lines 7–51 in the current file — the same block plan 001 would extend with `--ease-*` tokens, if that plan has already run; if not, just append these before the closing `}` on line 51):

```css
  /* ===== TYPOGRAPHY TRACKING SCALE (Faz 4 — typography/cohesion audit) =====
     Tracking (letter-spacing) is size-specific — never one value for all
     sizes (Apple HIG). Large display text wants negative tracking; small
     text wants slightly positive tracking. These values were chosen to
     exactly match the tightest existing clusters of letter-spacing values
     already in use across hesapla/page.module.css and
     hesapla/mobile/mobile.module.css — this is a consolidation of the
     current (mostly-correct) pattern, not a redesign. A handful of sites
     use values that don't cleanly fit this scale (drifted independently);
     those are intentionally left as literals rather than forced in — see
     plans/007-typography-tracking-tokens.md. */
  --tracking-display: -0.5px;  /* large headings/hero numeric values, ~1.35rem/21.6px+ */
  --tracking-body: 0;          /* body text — no adjustment */
  --tracking-label: 0.5px;     /* small uppercase labels, ~9.5px-12px (0.6-0.75rem) */
  --tracking-caps: 1.5px;      /* small uppercase badge/emphasis text, e.g. hero-card callout labels */
```

Note: `--tracking-body: 0` is not applied to any of the 13 cited sites (none currently use `0`) — it is included so the scale is complete and documented for future components that need explicit "no adjustment" body tracking, consistent with the Apple HIG guidance quoted in the finding.

Exact before/after for every site, file by file:

**`src/app/hesapla/page.module.css`** (all 6 sites migrate cleanly)

| Line | Before | After |
|---|---|---|
| 69 | `letter-spacing: -0.5px;` | `letter-spacing: var(--tracking-display);` |
| 532 | `letter-spacing: -0.5px;` | `letter-spacing: var(--tracking-display);` |
| 747 | `letter-spacing: 0.5px;` | `letter-spacing: var(--tracking-label);` |
| 850 | `letter-spacing: 1.5px;` | `letter-spacing: var(--tracking-caps);` |
| 868 | `letter-spacing: -0.5px;` | `letter-spacing: var(--tracking-display);` |
| 1290 | `letter-spacing: -0.5px;` | `letter-spacing: var(--tracking-display);` |

**`src/app/hesapla/mobile/mobile.module.css`** (3 of 7 sites migrate cleanly; 4 left as literals)

| Line | Before | After |
|---|---|---|
| 45 | `letter-spacing: -.2px;` | **Left as literal — no clean token match** (nearest token `--tracking-display: -0.5px` is 0.3px away; forcing it would visibly tighten this 17px header title). |
| 88 | `letter-spacing: .8px;` | **Left as literal — no clean token match** (nearest token `--tracking-label: 0.5px` is 0.3px away; forcing it would visibly loosen this label). |
| 97 | `letter-spacing: -.8px;` | **Left as literal — no clean token match** (nearest token `--tracking-display: -0.5px` is 0.3px away; forcing it would visibly loosen this 31px price value). |
| 127 | `letter-spacing: .5px;` | `letter-spacing: var(--tracking-label);` |
| 212 | `letter-spacing: .5px;` | `letter-spacing: var(--tracking-label);` |
| 444 | `letter-spacing: .5px;` | `letter-spacing: var(--tracking-label);` |
| 1005 | `letter-spacing: .3px;` | **Left as literal — no clean token match** (nearest token `--tracking-label: 0.5px` is 0.2px away; forcing it would visibly tighten this section heading). |

## Repo conventions to follow

- Insert the new tokens into the existing brand-core `:root { }` block at the top of `globals.css` (lines 7–51) — the same insertion point discipline as plan 001's `--ease-*` tokens — not into the theme-specific `[data-theme="dark"], :root { }` block (line 55) or the mobile-only `@media` block (line 196). Tracking values are not theme- or viewport-dependent.
- CSS Modules reference root tokens via `var(--token-name)`, matching every other token usage in this codebase (e.g. `var(--label-color)`, `var(--m-ink)`).
- Do not reformat surrounding lines; change only the `letter-spacing` value on each targeted line.

## Steps

1. **Add the tracking token block to `src/app/globals.css`.** Insert the 4 `--tracking-*` custom properties (plus the explanatory comment) into the root brand-core block (lines 7–51), immediately before the closing `}` on line 51 — or alongside plan 001's `--ease-*` tokens if that plan has already been applied to this file. Verify no existing `--tracking-*` name collision first.

2. **Migrate `src/app/hesapla/page.module.css` (6 sites).** Before editing each line, re-read it to confirm it still matches the "Before" value in the table above (drift check). Replace lines 69, 532, 868, 1290 (`-0.5px` → `var(--tracking-display)`), line 747 (`0.5px` → `var(--tracking-label)`), and line 850 (`1.5px` → `var(--tracking-caps)`). Touch nothing else on these lines or elsewhere in the file.

3. **Migrate `src/app/hesapla/mobile/mobile.module.css` (3 sites; 4 explicitly skipped).** Before editing each line, re-read it to confirm it still matches the "Before" value in the table above. Replace lines 127, 212, 444 (`.5px` → `var(--tracking-label)`) only. Leave lines 45, 88, 97, 1005 untouched — they are documented exceptions, not omissions.

## Boundaries

- Do NOT change any value's visual effect — token values must match (or be within 0.1px of) the current literal at each migrated site.
- Do NOT touch font-size, font-weight, line-height, or any other property.
- Do NOT force a site into a token if it doesn't cleanly match — leave it as a literal and say so (this plan already identifies the 4 exceptions: `mobile.module.css` lines 45, 88, 97, 1005).
- Do NOT touch any file not explicitly listed (only `globals.css`, `page.module.css`, and `mobile.module.css`).
- If a cited line's current content doesn't match what's quoted here (drift since commit `a8235e4`), STOP that specific site and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from repo root (expect all suites pass — pay special attention to any `.scope.test.ts` files for `hesapla`/`mobile` pages, since this repo has CSS-scope regression tests per its own conventions; read at least one before assuming this change is test-safe, since some scope tests may assert on literal `letter-spacing` values rather than computed output).
- **Feel check**: take a before/after screenshot of `/hesapla` (desktop) and the mobile calculator view, diff them pixel-by-pixel or by eye, and confirm NO visible text spacing change anywhere — every migrated token value is an exact literal match to what was there before, so any visible diff means something else broke (e.g. a typo in the token name) and must be fixed before merging.
- **Done when**: the `--tracking-*` token block exists in `globals.css`'s root brand-core block, all 9 cleanly-matchable sites (6 in `page.module.css`, 3 in `mobile.module.css`) use a token, the 4 exceptions in `mobile.module.css` (lines 45, 88, 97, 1005) remain untouched literals, tsc/jest are green, and the before/after screenshots are visually identical.
