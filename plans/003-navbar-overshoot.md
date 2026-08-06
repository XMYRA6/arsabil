# 003 — Remove misapplied overshoot easing from BottomNavbar

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: MEDIUM-HIGH
- **Category**: Physicality & cohesion
- **Estimated scope**: 1 file, 1 rule

## Problem
`src/components/layout/BottomNavbar.module.css:39`, inside the `.iconWrap` rule:

```css
.iconWrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 28px;
    border-radius: var(--m-r-chip);
    transition: background .22s cubic-bezier(.34, 1.56, .64, 1);
}
```

`cubic-bezier(.34, 1.56, .64, 1)` is a bouncy overshoot easing curve — the control point `1.56` exceeds `1`, meaning the eased value overshoots past its target before settling back, a spring-like "pop" character. It's applied to a plain `background` (color) transition on a bottom navigation item's icon chip.

Per this project's `apple-design` skill (Apple's WWDC-derived interface design principles), section "Behavior over animation — use springs":

> Add bounce only when the gesture itself carried momentum (a flick, a throw, a drag release). Overshoot on a menu that just faded in feels wrong; overshoot on a card you flicked feels right.

A bottom-nav item's background-color fill on tap/selection has NO momentum — it's a static state change, not a gesture. Per the AUDIT.md frequency table, bottom-nav taps are a "tens of times/day" interaction (frequent), which the audit playbook says should get REDUCED motion character, not added character. The overshoot here is both physically unmotivated (a color has no mass/momentum to overshoot with) and misapplied to a high-frequency element.

## Target
```css
.iconWrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 28px;
    border-radius: var(--m-r-chip);
    transition: background-color .22s var(--ease-out);
}
```

Only the `transition` declaration changes: the property narrows from `background` to `background-color`, and the easing function changes from `cubic-bezier(.34, 1.56, .64, 1)` to `var(--ease-out)`. The duration (`.22s`) stays exactly as-is.

## Repo conventions to follow
- `var(--ease-out)` is defined in `src/app/globals.css`'s root `:root { }` block by plan 001 (assume it already exists when this plan runs — do not redefine it here; if it's missing, plan 001 has not landed yet and this plan cannot proceed — see Boundaries).
- Match this file's existing formatting style (4-space indent as already used in `BottomNavbar.module.css`, no trailing semicolon changes beyond what's needed).
- Prefer the specific `background-color` property over the `background` shorthand when only the color is what's animating, consistent with this codebase's pattern (see plan 002) of narrowing transitions to the exact property that changes.

## Steps
1. In `src/components/layout/BottomNavbar.module.css`, inside the `.iconWrap` rule (line 39), replace:
   ```css
   transition: background .22s cubic-bezier(.34, 1.56, .64, 1);
   ```
   with:
   ```css
   transition: background-color .22s var(--ease-out);
   ```

## Boundaries
- Do NOT touch any other rule in this file.
- Do NOT change the duration.
- Do NOT touch colors.
- If the cited line's current content doesn't match what's quoted here (drift since commit a8235e4), STOP and report instead of improvising.
- If `var(--ease-out)` is not yet defined in `src/app/globals.css` (i.e. plan 001 has not been applied), STOP and report instead of improvising a substitute easing value.

## Verification
- **Mechanical**: `npx tsc --noEmit` (expect 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from repo root (expect all suites pass — check specifically whether `BottomNavbar.scope.test.ts` exists and still passes, since it's referenced elsewhere in this project's docs as a CSS-scope test).
- **Feel check**: open the app at a mobile viewport width, tap between bottom-nav items repeatedly, and confirm the background fill now settles smoothly with no "pop"/overshoot — it should look calm and instant, not springy. In DevTools Animations panel (if the transition is visible there) or by eye at normal speed, confirm no visible overshoot past the final color.
- **Done when**: the overshoot cubic-bezier is gone from this file, tsc and jest are green.
