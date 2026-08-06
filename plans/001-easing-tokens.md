# 001 — Introduce shared easing tokens, consolidate duplicate cubic-beziers

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 6 files (`src/app/globals.css`, `src/components/ui/Toggle.module.css`, `src/components/ui/RangeSlider.module.css`, `src/app/hesapla/page.module.css`, `src/app/hesapla/SmartContextCard.module.css`, `src/components/auth/AuthModal.tsx`) — 13 cubic-bezier replacements + 1 new token block

## Problem

No `--ease-*` CSS custom properties exist anywhere in the codebase. 13 occurrences of 3 distinct hand-typed `cubic-bezier(...)` curves are scattered across 5 files, with two of the curves being near-identical drift of the same intended "weak ease-out" feel rather than intentional variation.

**Curve A — `cubic-bezier(0.25, 0.8, 0.25, 1)`** (7 occurrences, weak ease-out, used on hover/press feedback):

`src/components/ui/Toggle.module.css:54`
```css
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
```

`src/components/ui/Toggle.module.css:69`
```css
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
```

`src/components/ui/RangeSlider.module.css:58`
```css
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s;
```

`src/app/hesapla/page.module.css:185` (`.luxBox`)
```css
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
```

`src/app/hesapla/page.module.css:286` (`.stepperRight button`)
```css
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
```

`src/app/hesapla/page.module.css:928` (`.primaryActionBtn`)
```css
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
```

`src/app/hesapla/SmartContextCard.module.css:9` (`.container`)
```css
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
```

**Curve B — `cubic-bezier(0.2, 0.8, 0.2, 1)`** (4 occurrences, drifted variant of Curve A, same weak-ease-out intent, all in `AuthModal.tsx` inline styles):

`src/components/auth/AuthModal.tsx:30` (inside the `<style dangerouslySetInnerHTML>` template string, `.ios-sheet` rule)
```css
                    animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
```

`src/components/auth/AuthModal.tsx:37` (inside the same `<style>` string, `@media (max-width: 768px) .ios-sheet` rule)
```css
                        animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
```

`src/components/auth/AuthModal.tsx:74` (inline `style={{...}}` on the "Vazgeç" button — note: no spaces in the literal here, unlike the `<style>` block above)
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)' }}
```

`src/components/auth/AuthModal.tsx:83` (inline `style={{...}}` on the "Giriş Yap" button — same no-spaces literal)
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)', boxShadow: '0 8px 20px var(--primary-glow)' }}
```

**Curve C — `cubic-bezier(0.4, 0, 0.2, 1)`** (2 occurrences, Material Design "standard" curve, used where an element visually moves/morphs on screen):

`src/app/hesapla/page.module.css:376` (`.segmentItem` — segmented control's selected-indicator style transition)
```css
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
```

`src/app/hesapla/page.module.css:1132` (`.pagerDot` — pager dot state change)
```css
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

All 13 locations above were re-read at commit `a8235e4` and match verbatim what is quoted here — no drift detected.

## Target

**`src/app/globals.css`** — add exactly 2 new custom properties to the theme-independent top-level `:root { ... }` block (the "MARKA ÇEKİRDEĞİ" block, lines 7–51), appended right after the existing `--z-sheet` token and before that block's closing `}` (line 51), so they land before the `@media (max-width: 768px)` mobile-only block that starts at line 191:

```css
  --z-topnav: 1050;
  --z-bottomnav: 999;
  --z-sheet-backdrop: 1100;
  --z-sheet: 1101;

  /* Motion easing tokens — shared, replaces hand-typed cubic-beziers */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

**`src/components/ui/Toggle.module.css:54`**
- Before: `    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.3s var(--ease-out);`

**`src/components/ui/Toggle.module.css:69`**
- Before: `    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.3s var(--ease-out);`

**`src/components/ui/RangeSlider.module.css:58`**
- Before: `    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s;`
- After: `    transition: transform 0.2s var(--ease-out), box-shadow 0.2s;`

**`src/app/hesapla/page.module.css:185`**
- Before: `    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.3s var(--ease-out);`

**`src/app/hesapla/page.module.css:286`**
- Before: `    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.2s var(--ease-out);`

**`src/app/hesapla/page.module.css:928`**
- Before: `    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.3s var(--ease-out);`

**`src/app/hesapla/page.module.css:376`**
- Before: `    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);`
- After: `    transition: all 0.25s var(--ease-in-out);`

**`src/app/hesapla/page.module.css:1132`**
- Before: `    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`
- After: `    transition: all 0.3s var(--ease-in-out);`

**`src/app/hesapla/SmartContextCard.module.css:9`**
- Before: `    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);`
- After: `    transition: all 0.3s var(--ease-out);`

**`src/components/auth/AuthModal.tsx:30`**
- Before: `                    animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);`
- After: `                    animation: fadeSlideIn 0.4s var(--ease-out);`

**`src/components/auth/AuthModal.tsx:37`**
- Before: `                        animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);`
- After: `                        animation: slideUpBottomSheet 0.45s var(--ease-out);`

**`src/components/auth/AuthModal.tsx:74`**
- Before (`transition` value only): `'all 0.2s cubic-bezier(0.2,0.8,0.2,1)'`
- After (`transition` value only): `'all 0.2s var(--ease-out)'`
- Full line before:
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)' }}
```
- Full line after:
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s var(--ease-out)' }}
```

**`src/components/auth/AuthModal.tsx:83`**
- Before (`transition` value only): `'all 0.2s cubic-bezier(0.2,0.8,0.2,1)'`
- After (`transition` value only): `'all 0.2s var(--ease-out)'`
- Full line before:
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)', boxShadow: '0 8px 20px var(--primary-glow)' }}
```
- Full line after:
```tsx
                        style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s var(--ease-out)', boxShadow: '0 8px 20px var(--primary-glow)' }}
```

## Repo conventions to follow

- Global CSS custom properties for this app live in `src/app/globals.css` inside the top-level `:root { ... }` block (the theme-independent "MARKA ÇEKİRDEĞİ" block, lines 7–51). Insert the 2 new tokens right after the existing `--z-sheet` token, still inside that block's closing `}`. Do NOT put them inside the `@media (max-width: 768px)` mobile-only `:root` block starting at line 191 — that block is deliberately mobile-scoped (`--m-*` glass tokens), and `globalsMobile.scope.test.ts` enforces nothing global leaks in or out of it. The new `--ease-*` tokens must apply to desktop and mobile alike, so they belong in the always-active block.
- Add a one-line comment directly above the two new tokens: `/* Motion easing tokens — shared, replaces hand-typed cubic-beziers */`.
- CSS Modules reference root tokens via `var(--token-name)` directly, matching existing usages of `var(--radius)`, `var(--shadow)`, `var(--touch-target)`, etc. elsewhere in these same files.
- In `AuthModal.tsx`, the `<style dangerouslySetInnerHTML>` block is plain CSS text — `var(--ease-out)` works there exactly as in a `.module.css` file. The inline `style={{ ... }}` objects are plain JS objects — `transition: 'all 0.2s var(--ease-out)'` is a valid string value; CSS custom properties resolve fine when interpolated into an inline style string. Keep the rest of the `transition`/`animation` property list exactly as it is today (e.g. keep `all`, keep `box-shadow 0.2s` alongside `transform`) — narrowing `transition: all` to specific properties is out of scope for this plan.

## Steps

1. **`src/app/globals.css`** — after line 50 (`  --z-sheet: 1101;`) and before line 51 (`}`), insert:
   ```css

     /* Motion easing tokens — shared, replaces hand-typed cubic-beziers */
     --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
     --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
   ```
2. **`src/components/ui/Toggle.module.css:54`** — replace `transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.3s var(--ease-out);`.
3. **`src/components/ui/Toggle.module.css:69`** — replace `transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.3s var(--ease-out);`.
4. **`src/components/ui/RangeSlider.module.css:58`** — replace `transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s;` with `transition: transform 0.2s var(--ease-out), box-shadow 0.2s;`.
5. **`src/app/hesapla/page.module.css:185`** — replace `transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.3s var(--ease-out);`.
6. **`src/app/hesapla/page.module.css:286`** — replace `transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.2s var(--ease-out);`.
7. **`src/app/hesapla/page.module.css:928`** — replace `transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.3s var(--ease-out);`.
8. **`src/app/hesapla/page.module.css:376`** — replace `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);` with `transition: all 0.25s var(--ease-in-out);`.
9. **`src/app/hesapla/page.module.css:1132`** — replace `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` with `transition: all 0.3s var(--ease-in-out);`.
10. **`src/app/hesapla/SmartContextCard.module.css:9`** — replace `transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);` with `transition: all 0.3s var(--ease-out);`.
11. **`src/components/auth/AuthModal.tsx:30`** — replace `animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);` with `animation: fadeSlideIn 0.4s var(--ease-out);`.
12. **`src/components/auth/AuthModal.tsx:37`** — replace `animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);` with `animation: slideUpBottomSheet 0.45s var(--ease-out);`.
13. **`src/components/auth/AuthModal.tsx:74`** — within the inline `style={{...}}` object, replace `transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)'` with `transition: 'all 0.2s var(--ease-out)'`, leaving every other property in the object untouched.
14. **`src/components/auth/AuthModal.tsx:83`** — within the inline `style={{...}}` object, replace `transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)'` with `transition: 'all 0.2s var(--ease-out)'`, leaving every other property in the object untouched.

## Boundaries

- Do NOT change any duration value — only the cubic-bezier function/token (`0.3s`, `0.2s`, `0.25s`, `0.4s`, `0.45s` all stay exactly as they are today).
- Do NOT touch colors, spacing, or any non-motion property.
- Do NOT add new dependencies.
- Do NOT touch any file not explicitly listed above — in particular, do NOT touch `src/components/ui/RangeSlider.module.css:80` (`.slider::-moz-range-thumb`), which also contains `cubic-bezier(0.25, 0.8, 0.25, 1)` but was not in the vetted finding's location list; leave it as-is and flag it for a follow-up finding instead.
- Do NOT narrow any `transition: all` to a specific property list — that is a separate concern from a separate plan.
- If a cited line's current content doesn't match what's quoted here (drift since commit a8235e4), STOP that file and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expected: 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from the repo root (expected: all suites still pass — this is a pure CSS/token value swap, no test should reference the literal cubic-bezier strings, but if one does, STOP and report rather than editing the test).
- **Feel check**: open `/hesapla` in a browser, hover/press a Toggle and a stepper button; the easing should look identical to before (this is a value-for-value swap, not a redesign) — confirm nothing looks different in normal-speed playback.
- **Done when**: all 13 listed cubic-bezier occurrences are replaced with the appropriate token, `globals.css` has exactly 2 new custom properties, tsc and jest are green.
