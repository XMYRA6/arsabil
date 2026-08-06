# 005 — Move AuthModal inline motion styles into a CSS Module

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: LOW
- **Category**: Convention & easing
- **Estimated scope**: 2 files (1 new, 1 edited)

## Problem

`src/components/auth/AuthModal.tsx` renders its motion via a raw `<style dangerouslySetInnerHTML>` block plus an inline `style={{...}}` object, instead of a CSS Module like every other component in this codebase (`BottomSheet.tsx` → `BottomSheet.module.css`, `ParcelVerificationSheet.tsx`, all `page.tsx` files). This plan covers only two of the file's motion spots — the `@keyframes`/`.ios-sheet` animation block and the backdrop's transition — per the Phase 4 dispatch split with plan 002 (button transitions, lines 74/83) and plan 001 (easing tokens). Plan 002's output file does not exist yet at the time this plan was written, so this plan does not assume anything about it beyond staying off lines 74/83.

**Current code, verbatim at commit `a8235e4`** (`src/components/auth/AuthModal.tsx`):

Lines 20–44 — the raw `<style>` block, containing the `.ios-sheet` rule (with the `fadeSlideIn` animation reference), its mobile override, and the `slideUpBottomSheet` keyframes:
```tsx
            <style dangerouslySetInnerHTML={{
                __html: `
                .ios-sheet {
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 90%; max-width: 420px; background: var(--panel);
                    border-radius: 30px; padding: 36px; z-index: 999999;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
                    display: flex; flex-direction: column; align-items: center; text-align: center;
                    animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                @media (max-width: 768px) {
                    .ios-sheet {
                        top: auto; left: 0; bottom: 0; transform: none; width: 100%; max-width: 100%;
                        border-bottom-left-radius: 0; border-bottom-right-radius: 0;
                        padding-bottom: calc(36px + env(safe-area-inset-bottom, 20px));
                        animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
                    }
                }
                @keyframes slideUpBottomSheet { 
                    from { transform: translateY(100%); opacity: 0; } 
                    to { transform: translateY(0); opacity: 1; } 
                }
            `}} />
```

Line 47 — the backdrop's inline style, with the bare-`ease` transition:
```tsx
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 999998, transition: 'all 0.4s ease' }}
                onClick={onClose}
            />
```

Line 51 — the modal container's `className` usage (a plain string, not a CSS Module reference):
```tsx
            <div className="ios-sheet">
```

**Important gap discovered while re-reading the file (not something to silently fix or paper over):** the `.ios-sheet` rule references `animation: fadeSlideIn 0.4s cubic-bezier(...)`, but **no `@keyframes fadeSlideIn` is defined anywhere reachable by this `<style>` block** — not in `AuthModal.tsx` itself, not in `globals.css` (checked, no matches), and not globally anywhere in `src/`. The only `@keyframes fadeSlideIn` in the whole repo lives in `src/components/layout/Navbar.module.css:385`, which is a CSS Module — Next.js's CSS Modules loader locally scopes (hashes) `@keyframes` names, so that definition is invisible to AuthModal's plain, unscoped `<style dangerouslySetInnerHTML>` tag. Concretely, this means on desktop (viewport ≥ 768px) `.ios-sheet`'s `animation-name: fadeSlideIn` currently resolves to nothing — the browser silently drops the invalid animation and the modal just appears with no animation. Only the mobile branch (`slideUpBottomSheet`, which **is** defined in this same block) actually animates today. **This plan does not fix that gap** — inventing `@keyframes fadeSlideIn` percentages/values that were never specified would be a redesign, which is explicitly out of scope (see Boundaries). The plan preserves this exact behavior (reference without definition) when it moves the code into the module, and flags the gap as a candidate for a separate future finding.

**Why the whole `.ios-sheet` rule has to move, not just the bare `@keyframes` blocks:** CSS Modules locally scope keyframe names — an `animation: slideUpBottomSheet ...` declaration and its matching `@keyframes slideUpBottomSheet { ... }` block must live in the *same* module file for the build tool to rewrite both consistently. Extracting only the `@keyframes` blocks into `AuthModal.module.css` while leaving `.ios-sheet`'s `animation:` declaration behind in the raw `<style>` tag would silently break the one animation (`slideUpBottomSheet`, mobile) that currently works. So this plan moves the entire `<style dangerouslySetInnerHTML>` block's content (the `.ios-sheet` rule, its media-query override, and the `slideUpBottomSheet` keyframes) into the module, renaming `.ios-sheet` → `.sheet` to match this repo's CSS Module naming convention (see `BottomSheet.module.css`, which also uses `.sheet`).

## Target

**New file `src/components/auth/AuthModal.module.css`:**

```css
.sheet {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 420px;
    background: var(--panel);
    border-radius: 30px;
    padding: 36px;
    z-index: 999999;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: fadeSlideIn 0.4s var(--ease-out);
}

@media (max-width: 768px) {
    .sheet {
        top: auto;
        left: 0;
        bottom: 0;
        transform: none;
        width: 100%;
        max-width: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        padding-bottom: calc(36px + env(safe-area-inset-bottom, 20px));
        animation: slideUpBottomSheet 0.45s var(--ease-out);
    }
}

@keyframes slideUpBottomSheet {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    z-index: 999998;
    transition: background-color 0.4s var(--ease-out), backdrop-filter 0.4s var(--ease-out);
}
```

Notes on this target:
- `var(--ease-out)` is used here (instead of the literal `cubic-bezier(0.2, 0.8, 0.2, 1)`) because plan 001 introduces `--ease-out`/`--ease-in-out` in `globals.css` and separately rewrites these exact two lines (`AuthModal.tsx:30` and `:37`) to `var(--ease-out)`, and plans in this batch execute in numeric order (001 before 005). **If, at execution time, plan 001 has not actually run yet** (i.e. `src/app/globals.css` has no `--ease-out` token and `AuthModal.tsx:30`/`:37` still read the literal `cubic-bezier(0.2, 0.8, 0.2, 1)`), use the literal cubic-bezier value in the migrated CSS instead of the token, and leave a one-line note in the commit message that plan 001's token pass will need to touch the new `.module.css` file instead of `AuthModal.tsx` for those two lines. Do not block this plan on plan 001 either way.
- No `@keyframes fadeSlideIn` block is added — see the "Important gap discovered" note in Problem above. The `animation: fadeSlideIn 0.4s var(--ease-out);` line is carried over verbatim (mechanism only, name and duration unchanged), preserving today's behavior (inert on desktop, unaffected on mobile) exactly.
- `.ios-sheet` is renamed to `.sheet` — this is a CSS class rename (needed because dash-case class names require awkward bracket access, `styles['ios-sheet']`, in JS/TSX; every other module in this repo uses camelCase-friendly names, e.g. `BottomSheet.module.css`'s `.sheet`). This is **not** a keyframe rename and does not fall under the "do not rename keyframes" boundary below.
- The backdrop's `transition` property list is narrowed from `all` to `background-color, backdrop-filter` — those are the only two properties on this specific rule that could plausibly change. However: re-reading `AuthModal.tsx`, the backdrop `<div>` has no state-driven style changes after mount — `isOpen`/`mounted` gate whether the component renders at all (`if (!isOpen || !mounted) return null`), there is no `AnimatePresence`/exit-animation equivalent, and no other code path mutates this element's `background`/`backdropFilter` after it mounts. That means this `transition` is very likely **currently inert** — a freshly-mounted DOM node has no prior frame to interpolate from, so there is nothing for `transition: all 0.4s ease` to visibly animate today. This plan still narrows the property list and fixes the easing (both are correct, low-risk, purely mechanical changes consistent with `improve-animations` AUDIT.md §2's rule against bare `ease` on entrances), but does **not** claim this makes a currently-invisible transition suddenly visible — if a future change adds a real state transition to the backdrop (e.g. an exit-fade), this property list already covers the two properties that rule declares.

**Diff to `src/components/auth/AuthModal.tsx`:**

1. Add the import, after the existing `useRouter` import:
```diff
 import { useRouter } from "next/navigation";
+import styles from "./AuthModal.module.css";
```

2. Delete the entire `<style dangerouslySetInnerHTML>` block (current lines 20–44) — no replacement markup, the CSS now lives entirely in the module:
```diff
-            <style dangerouslySetInnerHTML={{
-                __html: `
-                .ios-sheet {
-                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
-                    width: 90%; max-width: 420px; background: var(--panel);
-                    border-radius: 30px; padding: 36px; z-index: 999999;
-                    box-shadow: 0 30px 60px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15);
-                    border: 1px solid rgba(255,255,255,0.1);
-                    backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
-                    display: flex; flex-direction: column; align-items: center; text-align: center;
-                    animation: fadeSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
-                }
-                @media (max-width: 768px) {
-                    .ios-sheet {
-                        top: auto; left: 0; bottom: 0; transform: none; width: 100%; max-width: 100%;
-                        border-bottom-left-radius: 0; border-bottom-right-radius: 0;
-                        padding-bottom: calc(36px + env(safe-area-inset-bottom, 20px));
-                        animation: slideUpBottomSheet 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
-                    }
-                }
-                @keyframes slideUpBottomSheet { 
-                    from { transform: translateY(100%); opacity: 0; } 
-                    to { transform: translateY(0); opacity: 1; } 
-                }
-            `}} />
             {/* Backdrop */}
```

3. Replace the backdrop's inline `style` with the module class (current line 47):
```diff
             <div
-                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 999998, transition: 'all 0.4s ease' }}
+                className={styles.backdrop}
                 onClick={onClose}
             />
```

4. Replace the modal container's `className` (current line 51):
```diff
-            <div className="ios-sheet">
+            <div className={styles.sheet}>
```

Everything else in the file — the drag-handle `<div>`, the icon circle `<div>`, the `<h3>`/`<p>`, the button-row wrapper `<div>`, and both `<button>` elements with their inline `style`/`transition`/`onMouseDown`/etc. — is left completely untouched. Those are either out of this plan's scope (drag handle, icon, heading, paragraph, button wrapper) or explicitly plan 002's territory (the two buttons' `transition` at lines 74/83).

## Repo conventions to follow

- CSS Module import/usage pattern, copied from `src/components/mobile/BottomSheet.tsx`:
  ```tsx
  import styles from './BottomSheet.module.css';
  ...
  className={styles.backdrop}
  ...
  className={`${styles.sheet} ${className || ''}`}
  ```
  AuthModal.tsx has no extra `className` prop to merge, so its usage is the simpler `className={styles.backdrop}` / `className={styles.sheet}` form.
- `BottomSheet.module.css` formatting convention: one property per line, 4-space indent, trailing semicolons, selectors in the order they're used in the component. `AuthModal.module.css` follows the same layout.
- Keep the `@keyframes` rule name `slideUpBottomSheet` identical (confirmed via repo-wide search: it is not referenced anywhere outside `AuthModal.tsx` itself, so no external reference risk). The `fadeSlideIn` reference is also kept identical in name for the same reason (confirmed: the only other `fadeSlideIn` occurrences in the repo — `ThemeToggle.tsx:138`, `Navbar.tsx:143`, `Navbar.tsx:213`, `Navbar.module.css:280`, `Navbar.module.css:385` — are unrelated to `AuthModal.tsx` and out of scope for this plan; do not touch them).

## Steps

1. Create `src/components/auth/AuthModal.module.css` with the exact content shown in Target above (adjust the two `var(--ease-out)` occurrences to the literal `cubic-bezier(0.2, 0.8, 0.2, 1)` only if plan 001 has not run yet at execution time — check `src/app/globals.css` for a `--ease-out` token first).
2. In `src/components/auth/AuthModal.tsx`, add `import styles from "./AuthModal.module.css";` after the `next/navigation` import.
3. Delete the `<style dangerouslySetInnerHTML>` block entirely (diff step 2 above).
4. Replace the backdrop `<div>`'s inline `style={{...}}` with `className={styles.backdrop}` (diff step 3 above).
5. Replace the modal `<div>`'s `className="ios-sheet"` with `className={styles.sheet}` (diff step 4 above).
6. Save both files. Do not touch any other line in `AuthModal.tsx`.

## Boundaries

- Do NOT touch the button transitions at lines 74/83 — those are covered by plan 002.
- Do NOT change any keyframe percentage, duration, or transform value — only the property list on the backdrop transition and the mechanism (inline → module).
- Do NOT rename the `@keyframes` rules (`fadeSlideIn`, `slideUpBottomSheet`). Renaming the `.ios-sheet` CSS *class* to `.sheet` is allowed and expected (see Target) — that is a class name, not a keyframe name.
- Do NOT add a `@keyframes fadeSlideIn` definition. It does not exist today (see Problem's "Important gap discovered" note) and inventing one is a redesign decision outside this plan's scope. Carry the existing `animation: fadeSlideIn ...` reference over as-is.
- Do NOT touch the drag-handle, icon-circle, heading, paragraph, or button-row-wrapper inline styles — out of scope for this plan.
- Do NOT touch `ThemeToggle.tsx`, `Navbar.tsx`, or `Navbar.module.css`, even though they also reference `fadeSlideIn` — unrelated files, out of scope.
- Do NOT change the `z-index` values (`999999`, `999998`) or introduce `--z-sheet`/`--z-sheet-backdrop` tokens here — that is a separate, unvetted concern.
- If the cited lines' current content doesn't match what's quoted here (drift since commit `a8235e4`), STOP and report instead of improvising — **except** for the one expected exception called out above: `AuthModal.tsx:30`/`:37` reading `var(--ease-out)` instead of the literal `cubic-bezier(0.2, 0.8, 0.2, 1)` is expected if plan 001 already ran, and is not a stop condition.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from repo root (expect all suites pass). Confirmed while writing this plan: no `AuthModal.test.tsx` exists, and the only test file referencing `AuthModal` (`src/app/hesapla/page.test.tsx`) only mocks `next-auth/react` and `next/navigation` around it — it does not assert on inline `style` props or `className` values, so no test changes are anticipated. If jest still fails after this change, STOP and report rather than editing a test to match.
- **Feel check**: open the app, trigger the "Giriş Yapmanız Gerekiyor" modal (any gated action while logged out), and confirm:
  - Desktop viewport (≥768px): modal still appears the same way as before this change (given the "Important gap" note above, this is expected to remain a non-animated pop-in — verify it looks the same as it did *before* this plan, not that it suddenly animates).
  - Mobile viewport (<768px): the bottom-sheet slide-up animation still plays identically (same 0.45s duration, same curve character) as before this change.
  - Backdrop still shows the same dim + blur appearance as before this change.
- **Done when**: `AuthModal.tsx` contains no inline `@keyframes`/`animation:`/`transition:` motion strings and no `<style dangerouslySetInnerHTML>` block, all such motion lives in `AuthModal.module.css`, both `.ios-sheet` renamed to `.sheet` and the backdrop use `styles.*` class references, and tsc and jest are green.
