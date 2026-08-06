# 004 — Unify "Canlı Mühür" seal/stamp reveal animations

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: MEDIUM
- **Category**: Cohesion
- **Estimated scope**: 1 new file (~5 lines) + 3 edited files (~2-6 lines each). No new dependencies, no CSS changes, no test changes expected.

## Problem

Three components implement the same conceptual moment — "something stamps/settles into its final confirmed state" (each one's own doc comment or code calls this the **"Canlı Mühür" / Live Seal**) — using two different, uncoordinated animation techniques with an inconsistent bounce character.

**1. `src/app/hesapla/SealBadge.tsx` (line 24-26)** — one-time stamp-in for a market-comparison badge:

```tsx
initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
animate={{ scale: 1, rotate: 0, opacity: 1 }}
transition={{ type: 'spring', duration: 0.18 }}
```

**2. `src/app/listing/[id]/ScoreRevealBadge.tsx` (line 18-20)** — same "Canlı Mühür" concept (per its own doc comment) for a listing score badge, currently identical code:

```tsx
initial={shouldReduceMotion ? false : { scale: 1.4, rotate: -6, opacity: 0 }}
animate={{ scale: 1, rotate: 0, opacity: 1 }}
transition={{ type: 'spring', duration: 0.18 }}
```

**3. `src/components/listing-wizard/WizardProgress.tsx` (line 30-35)** — a wizard step's "done" checkmark circle, also a settle/stamp moment (a step completing), but implemented as a hand-authored 3-keyframe scale array with a flat non-spring easing:

```tsx
variants={{
  idle: { scale: 1 },
  active: { scale: 1 },
  done: reduceMotion ? { scale: 1 } : { scale: [1.35, 0.94, 1] },
}}
transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
```

Both `type: 'spring'` uses in (1) and (2) specify `duration` but never `bounce`. In the installed framer-motion version (`framer-motion: ^12.42.2`, confirmed in `package.json`), an unspecified `bounce` on a duration-based spring defaults to `0.25` — an implicit, undocumented-in-code value. Meanwhile (3) is not a spring at all: it's a flat-eased tween across 3 fixed keyframes, so per this project's `apple-design` skill principle "Behavior over animation — use springs" ("A pre-scripted, fixed-duration animation can't respond to new input. A spring can."), it can't be interrupted/redirected mid-motion, and its overshoot shape (1.35 → 0.94 → 1) is an arbitrary hand-tuned guess rather than a physically derived spring curve. The net effect: three UI moments meant to feel like the same "stamp" gesture currently have three unrelated, uncoordinated bounce characters.

## Target

Introduce one shared, named spring constant and use it in all three components — no duplicated literal.

Per this project's `apple-design` skill Quick Reference and its Motion/Framer Motion translation table ("the bounce + duration spring API maps closely to Apple's damping + response... reserve bounce for momentum-driven, physical interactions"; "Keep bounce subtle (0.1-0.3)"; worked example `animate(el, { y: target }, { type: 'spring', bounce: 0.2, duration: 0.4 })`), a "momentum-driven, celebratory settle" (damping ~0.8, response 0.3-0.4s) maps to:

```ts
{ type: 'spring' as const, duration: 0.35, bounce: 0.2 }
```

(0.35s sits in Apple's 0.3-0.4s recommended response range; 0.2 bounce sits mid-range in Apple's 0.1-0.3 subtle-bounce band.)

### New file: `src/lib/motion.ts`

`src/lib/` already holds small, single-purpose, flat cross-cutting modules imported via the `@/lib/...` path alias (e.g. `src/lib/plan.ts`, `src/lib/notifications.ts`, `src/lib/rate-limit.ts`, `src/lib/sse.ts`, `src/lib/auth.ts`) — subdirectories (`calculator/`, `listing/`, `risk/`, `tkgm/`, `districtPrices/`) are reserved for domains with several related files, which does not apply here. A single shared UI-motion constant fits the flat-file convention, not a new `motion/` subdirectory.

```ts
/** Shared spring transition for "Canlı Mühür" (Live Seal) stamp/settle moments —
 *  used wherever something stamps into its final confirmed state (a badge reveal,
 *  a wizard step completing). Values follow this project's apple-design skill
 *  guidance: damping ~0.8 / response 0.3-0.4s -> bounce 0.2 / duration 0.35s. */
export const sealTransition = { type: 'spring' as const, duration: 0.35, bounce: 0.2 };
```

### `src/app/hesapla/SealBadge.tsx`

Add import:
```tsx
import { sealTransition } from '@/lib/motion';
```
Replace line 26:
```tsx
// before
transition={{ type: 'spring', duration: 0.18 }}
// after
transition={sealTransition}
```
`initial`/`animate` (scale, rotate, opacity) are unchanged.

### `src/app/listing/[id]/ScoreRevealBadge.tsx`

Add import:
```tsx
import { sealTransition } from '@/lib/motion';
```
Replace line 20:
```tsx
// before
transition={{ type: 'spring', duration: 0.18 }}
// after
transition={sealTransition}
```
`initial`/`animate` (scale, rotate, opacity) are unchanged.

### `src/components/listing-wizard/WizardProgress.tsx`

This one needs more care than a literal swap, because a spring animates a value change (from wherever it currently is TO a target) and overshoots *around the target* — it does not replay a fixed keyframe sequence. Animating `active: { scale: 1 }` -> `done: { scale: 1 }` is not a value change at all, so a spring there would produce zero visible motion; simply dropping in `sealTransition` on the existing variants would silently kill the animation.

Resolution: `src/components/listing-wizard/WizardProgress.module.css` was read in full — `.circleDone` (both the desktop rule at line 36-40 and the mobile override at line 93-96) only sets `background`/`border-color`/`color`, never `transform` or `scale`. There is no existing CSS to conflict with a scale change. So the correct, spring-native equivalent is to give `done` a real target value distinct from `active`'s resting `scale: 1` — a small, deliberate, permanent 1.12x resting scale for completed steps — and let the spring's own `bounce: 0.2` produce the overshoot naturally while animating 1 -> 1.12, instead of hand-authoring a peak-then-return array. This is a small intentional visual change (completed step circles end up very slightly larger than idle/active ones, matching the original animation's "peak overshoot then settle" intent) rather than a bug — call this out explicitly in the PR/commit description.

Replace lines 30-35:
```tsx
// before
variants={{
  idle: { scale: 1 },
  active: { scale: 1 },
  done: reduceMotion ? { scale: 1 } : { scale: [1.35, 0.94, 1] },
}}
transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
// after
variants={{
  idle: { scale: 1 },
  active: { scale: 1 },
  done: reduceMotion ? { scale: 1 } : { scale: 1.12 },
}}
transition={sealTransition}
```
Add import:
```tsx
import { sealTransition } from '@/lib/motion'
```
(alongside the existing `import { motion, useReducedMotion } from 'framer-motion'` on line 4 — match this file's existing no-semicolon style for its own import lines, per the file's current formatting.)

Reduced-motion behavior is unchanged: `done` still collapses to `{ scale: 1 }` (no visible motion, no resting-scale change) when `useReducedMotion()` is true, matching today's behavior exactly.

## Repo conventions to follow

- Preserve the existing `useReducedMotion()` pattern exactly in all 3 files: `shouldReduceMotion`/`reduceMotion` still gates `initial`/variant values, collapsing to no motion (`initial={false}` in the two badges, `{ scale: 1 }` in WizardProgress). Do not touch this gating logic.
- Import the new constant via the `@/*` -> `./src/*` path alias already defined in `tsconfig.json` (`"paths": { "@/*": ["./src/*"] }`), matching how sibling files already import from `src/lib` (e.g. `import { CalculationOutput } from '@/lib/calculator/engine_v2'` in `src/app/hesapla/page.tsx`). Use a named export (`sealTransition`), matching this repo's prevailing named-export style in `src/lib/*.ts`.
- `WizardProgress.tsx` uses no-semicolon style; `SealBadge.tsx` and `ScoreRevealBadge.tsx` use semicolons. Match each file's own existing style when adding the import line — do not reformat the rest of the file.

## Steps

1. Create `src/lib/motion.ts` exporting `sealTransition` exactly as specified above.
2. Update `src/app/hesapla/SealBadge.tsx`: add the import, replace the `transition` prop value on line 26 with `sealTransition`. Do not touch `initial`/`animate`.
3. Update `src/app/listing/[id]/ScoreRevealBadge.tsx`: add the import, replace the `transition` prop value on line 20 with `sealTransition`. Do not touch `initial`/`animate`.
4. Update `src/components/listing-wizard/WizardProgress.tsx`: add the import, replace the `done` variant's `scale: [1.35, 0.94, 1]` with `scale: 1.12` (reduced-motion branch stays `{ scale: 1 }`, unchanged), and replace the `transition` prop with `sealTransition`.

## Boundaries

- Do NOT touch any other animation in these files (e.g. `SealBadge`'s `AnimatePresence` wrapper, `ScoreRevealBadge`'s child `FizibiliteScoreBadge`, `WizardProgress`'s connector-line styling or step-label rendering).
- Do NOT change the `initial`/`rotate`/`opacity` values in `SealBadge.tsx`/`ScoreRevealBadge.tsx` — only the `transition` prop.
- Do NOT add new dependencies (framer-motion is already installed at `^12.42.2`).
- Do NOT change `WizardProgress.module.css` — the plan's `done`-scale change is applied purely via the `motion.div` variant, no CSS edit is needed or wanted.
- If a cited line's current content doesn't match what's quoted here (drift since commit a8235e4), STOP that file and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from repo root (expect all suites pass). Existing test files for these components were read and confirmed to assert only on rendered text/DOM structure/`data-seal-state` attributes — none assert on `transition`/`scale`/`variants` prop values, so no test changes are expected: `src/app/hesapla/SealBadge.test.tsx`, `src/app/listing/[id]/ScoreRevealBadge.test.tsx`, `src/components/listing-wizard/WizardProgress.test.tsx`, `src/components/listing-wizard/WizardProgress.scope.test.ts`, `src/components/listing-wizard/WizardShell.scope.test.ts` (the last two are CSS-scope guards reading `WizardProgress.module.css`/`WizardShell.module.css` as text — unaffected since no CSS is edited).
- **Feel check**: trigger each badge (market comparison threshold cross on `/hesapla`, listing score reveal on `/listing/[id]`, wizard step completion in the listing wizard) in a real browser, slow down playback via DevTools Animations panel to ~10%, and confirm all three now share the same settle character (a visible small pop past the target, then a smooth stop) rather than looking different from each other. For the wizard, additionally confirm the completed-step circle's new, very slightly larger (1.12x) resting size reads as intentional and not visually broken against `.circleDone`'s background/border styling, in both the desktop and the mobile (`max-width: 768px`) layout.
- **Done when**: all three components import and use `sealTransition` from `src/lib/motion.ts`, `WizardProgress`'s `done` variant uses a spring-native `scale: 1.12` target instead of the hand-authored 3-point array, `tsc` and `jest` are green.
