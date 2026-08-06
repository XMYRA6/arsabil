# 006 — Materialize glass sheets on enter (blur+scale)

- **Status**: NOT APPLICABLE
- **Commit**: a8235e4
- **Severity**: LOW (missed opportunity)
- **Category**: Materials & depth
- **Estimated scope**: N/A

## Problem

The finding assumes `BottomSheet` (or a consumer of it) renders a translucent/glass surface that a blur-radius+scale entrance animation could enhance. Reading the actual code shows this is not the case for any of the three real consumers today.

**1. `BottomSheet.tsx` itself is Y-slide only, no filter animation.**
`src/components/mobile/BottomSheet.tsx:126-129` — the sheet's `motion.div` animates only `y` (`initial={{ y: '100%' }}` → `animate={{ y: 0 }}`, or `opacity` under reduced motion), using `sheetTransition(reduceMotion)` (`BottomSheet.tsx:36-40`, spring `damping: 32, stiffness: 320`). No `filter`, `scale`, or `backdrop-filter` transition exists anywhere in the file.

**2. `BottomSheet`'s own default surface is fully opaque — not glass.**
`src/components/mobile/BottomSheet.module.css:8-23` — `.sheet` has `background: var(--panel)` and no `backdrop-filter` property at all. `--panel` resolves to `#0f2a4a` (dark theme) and `#ffffff` (light theme) — both hex colors with no alpha channel (`src/app/globals.css:62` and `:112`). This is a solid, opaque surface by construction; animating `filter: blur()` on it would produce no visible effect (dead code), since there is no transparency for a blur to reveal.

**3. All real consumers were checked — none apply a glass surface to the sheet.**
Grepped the repo for `<BottomSheet` usage (5 hits: the component itself, its test file, and 3 real consumers):
- `src/app/marketplace/page.tsx:305` — `<BottomSheet open={filterOpen} onClose={...} title="Filtreler">` — no `className` prop passed at all. Uses the default opaque `.sheet` from `BottomSheet.module.css` verbatim.
- `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx:79` — `<BottomSheet open={open} onClose={onClose} title="Gelişmiş ayarlar">` — likewise no `className` prop. Default opaque `.sheet`.
- `src/components/listing-wizard/ParcelVerificationSheet.tsx:228-233` — the only consumer that does pass `className` (`styles.sheet` / `styles.sheet + styles.sheetPicking` from its own `ParcelVerificationSheet.module.css`), but that override is not glass either (see next point). Note this is the mobile branch only (`if (!isDesktopViewport)`); the desktop branch renders a separate, unrelated `.modal`/`.overlay` pair (`ParcelVerificationSheet.module.css:1-27`) that isn't a `BottomSheet` at all.

**4. `ParcelVerificationSheet`'s `.sheet` override is translucent-in-light-theme only, and never blurred.**
`ParcelVerificationSheet.module.css:188-213` (the `@media (max-width: 768px)` block that targets the mobile `BottomSheet` instance): `.sheet { background: var(--seal-surface) !important; ... }` where `--seal-surface` is set per theme —
- dark theme (`:189-194`): `--seal-surface: linear-gradient(160deg, #0F2A43 0%, #16324F 100%)` — a solid two-stop gradient of two opaque hex colors, no alpha, not glass.
- light theme (`:196-201`): `--seal-surface: var(--shell-bg)`, and `--shell-bg: rgba(255, 255, 255, .65)` in the light-theme root block (`:119`) — this IS translucent (65% alpha), but I read the entire `ParcelVerificationSheet.module.css` file and confirmed **no `backdrop-filter` is declared anywhere for `.sheet` or `.sheetPicking`**. The only `backdrop-filter` in the file is on `.overlay` (`:8`, `blur(8px)`), which is the *desktop* modal's backdrop — a completely separate code path (`isDesktopViewport` branch), not part of the mobile `BottomSheet` render at all. So in light theme this surface is semi-transparent but shows whatever is directly behind it (the dark `rgba(0,0,0,.45)` `BottomSheet` backdrop, per `BottomSheet.module.css:1-6`) completely unblurred — a plain alpha fade, not a "material," per the `apple-design` skill's own distinction ("materialize, don't just fade").

**5. The real "Deep Glass" (`mGlass`) system is confirmed unconnected to `BottomSheet`.**
`src/app/globals.css:247-253` defines `.mGlass { background: var(--m-glass-bg); backdrop-filter: var(--m-glass-blur); ... }` where `--m-glass-blur: blur(42px) saturate(220%)` (`globals.css:214`). Repo-wide grep for `mGlass` and `backdrop-filter` (34 files) turned up zero references to `.mGlass` in `BottomSheet.tsx`, `BottomSheet.module.css`, `ParcelVerificationSheet.tsx/.module.css`, `GelismisAyarlarSheet.tsx`, or `marketplace/page.tsx`. The Deep Glass material is applied to cards and other surfaces elsewhere, never to any sheet.

**Conclusion**: no consumer currently renders `BottomSheet` (or a `BottomSheet`-based sheet) with a true blur-backed glass surface. One consumer (`ParcelVerificationSheet`, light theme, mobile) has an alpha-translucent-but-unblurred background, which is arguably the "plain fade" the skill explicitly warns against rather than a "material" worth animating further — and adding a `filter: blur()` ramp to it would still be inert since there's no `backdrop-filter` present to ramp. Forcing this finding into a real change would mean inventing a glass surface that doesn't exist today (out of scope for a LOW "missed opportunity" polish pass) rather than enhancing one that does.

## Target

N/A — no qualifying glass-surfaced sheet exists; see Problem.

## Repo conventions to follow

N/A

## Steps

N/A

## Boundaries

- Do NOT change `sheetTransition`'s damping/stiffness values (already correctly tuned).
- Do NOT touch drag-to-dismiss behavior.
- Do NOT touch any consumer's layout/markup.
- Do NOT touch colors.
- Do NOT add `backdrop-filter`/`.mGlass` to `BottomSheet` or any consumer as a side effect of this plan — that would be scope invention (a new glass surface), not a motion fix, and is explicitly out of scope here.
- If a future spec introduces a genuinely translucent+blurred `BottomSheet` variant (e.g. an `.mGlass`-backed sheet), this finding should be revisited then, applying the blur+scale-on-enter treatment described in the original finding, on the same `sheetTransition(reduceMotion)` spring already centralized in `BottomSheet.tsx:36-40`.

## Verification

N/A
