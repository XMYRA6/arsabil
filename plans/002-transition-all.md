# 002 — Replace `transition: all` with explicit properties

- **Status**: TODO
- **Commit**: a8235e4
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 6 files, 21 sites — 22 `transition: all` declarations total (20 CSS rules + 2 inline JSX `style` props)
- **Depends on**: plan 001 (adds `--ease-out` and `--ease-in-out` to the `:root` block in `src/app/globals.css`). This plan assumes those tokens already exist. Do not apply this plan before plan 001 is applied — any target snippet below that uses `var(--ease-out)` / `var(--ease-in-out)` will reference an undefined token otherwise.

All 21 sites and their exact line numbers were re-read from the current worktree at commit `a8235e4` immediately before writing this plan. Every cited line number matched the finding with zero drift. However, for 4 sites (marked **CORRECTED** below) the finding's summary of "what changes on hover" undercounted the actual properties in the paired rule — this plan uses the real paired-rule content, not the finding's summary, per the task's own instruction to verify live rather than trust the description. These corrections are called out explicitly so they can be sanity-checked.

## Problem

### File 1/6: `src/app/admin/admin.module.css`

**1. `.navItem` — line 77**
```css
.navItem {
    ...
    transition: all 0.2s ease;
}
```
Paired rule (lines 80-82):
```css
.navItem:hover {
    background: var(--panel-2);
}
```
Only `background` changes.

**2. `.segmentTab, .segmentTabActive` — line 370**
```css
.segmentTab,
.segmentTabActive {
    ...
    transition: all 0.2s;
    border-right: 1px solid var(--border);
}
```
Paired rules: `.segmentTab:hover` (line 379-381) changes `background` only; the separate state-class rule `.segmentTabActive` (lines 383-387) sets `background: var(--admin-accent); color: #0F2A43; font-weight: 700;`. Per the finding, `font-weight` is excluded (unreliable to interpolate, treated as instant swap). Union: `background`, `color`.

**3. `.iconBtn` — line 401 — CORRECTED**
```css
.iconBtn {
    ...
    transition: all 0.2s;
}
```
Paired rule (lines 404-407):
```css
.iconBtn:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, .15);
}
```
The finding said "transform only," but the base rule has no `box-shadow`, so the hover value is a real 0→value change too. Both `transform` and `box-shadow` must stay animated or the shadow will pop in instantly (a visible regression). Union: `transform`, `box-shadow`.

**4. `.defaultBadge` — line 555**
```css
.defaultBadge {
    ...
    transition: all 0.2s;
}
```
Paired rule (lines 558-560):
```css
.defaultBadge:hover {
    transform: scale(1.1);
}
```
Only `transform` changes. Matches finding.

**5. `.deleteBtn` — line 579 — CORRECTED**
```css
.deleteBtn {
    ...
    transition: all 0.2s;
    color: var(--text);
}
```
Paired rule (lines 583-588):
```css
.deleteBtn:hover {
    background: rgba(var(--red-rgb), 0.1);
    border-color: var(--red);
    color: var(--red);
    transform: scale(1.1);
}
```
The finding said `background` + `border-color` only, but the real rule also changes `color` (text → red) and `transform` (scale 1.1, not present in the base rule). All 4 must transition or `color`/`transform` will snap. Union: `background`, `border-color`, `color`, `transform`.

**6. `.addLevelBtn` — line 606**
```css
.addLevelBtn {
    ...
    transition: all 0.2s;
}
```
Paired rule (lines 609-613):
```css
.addLevelBtn:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(var(--primary-rgb), 0.05);
}
```
Changes `border-color`, `color`, `background`. Matches finding.

### File 2/6: `src/app/dashboard/dashboard.module.css`

**7. `.navItem` — line 89**
```css
.navItem {
    ...
    transition: all 0.2s ease;
}
```
Paired rule (lines 92-94): `.navItem:hover { background: var(--panel-2); }` — only `background`. Matches finding.

**8. `.reportCard` — line 231**
```css
.reportCard {
    ...
    transition: all 0.2s ease;
}
```
Paired rule (lines 234-237):
```css
.reportCard:hover {
    box-shadow: var(--shadow2);
    transform: translateY(-2px);
}
```
Changes `box-shadow`, `transform`. Matches finding.

### File 3/6: `src/app/hesapla/mobile/mobile.module.css`

**9. `.openParcelBtnMobile` — line 180**
```css
.openParcelBtnMobile {
    ...
    transition: all 0.2s;
}
```
Paired rule (lines 183-185): `.openParcelBtnMobile:active { background-color: rgba(...); }` — only `background-color`. Matches finding.

### File 4/6: `src/app/hesapla/SmartContextCard.module.css`

**10. `.container` — line 9**
```css
.container {
    background: var(--card-bg, #fff);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
```
No paired `:hover`/`:active`/state rule for `.container` exists anywhere in this file, and `SmartContextCard.tsx` applies it as a static className (confirmed by reading the file). Nothing observably animates through this class today. Narrowing cannot cause a visible regression. Curve `cubic-bezier(0.25, 0.8, 0.25, 1)` matches plan 001's `--ease-out` token.

### File 5/6: `src/app/hesapla/page.module.css`

**11. `.luxBox` — line 185 (finding cited "line 185, a step/tab-like button" — confirmed class is `.luxBox`, the daire-standardı segmented selector)**
```css
.luxBox {
    border-radius: 12px;
    padding: 0.8rem 0.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    background: transparent;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid transparent;
}
```
Paired rules found (the finding's "if not found, fallback" branch does not apply — a paired rule exists):
```css
.luxBox:hover:not(.luxBoxActive) {
    background: rgba(0, 0, 0, 0.04);
    color: var(--text);
}
.luxBoxActive {
    background: white;
    color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);
}
```
`.luxBoxActive` is a sibling class toggled onto the same element (base has `border: 1px solid transparent`, active swaps only the color via `border-color`). Union of real changes: `background`, `color`, `box-shadow`, `border-color`, `transform`. Curve matches `--ease-out`.

**12. `.stepperInput` — line 227**
```css
.stepperInput {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 16px;
    height: 56px;
    transition: all 0.2s ease;
    padding: 4px;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
}
```
Paired rule (lines 252-254):
```css
.stepperInput:focus-within {
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.05), 0 0 0 2px var(--primary-glow);
}
```
Only `box-shadow` changes (an outer ring is added to the existing inset shadow).

**13. `.stepperRight button` — line 286**
```css
.stepperRight button {
    background: white;
    border: none;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    font-size: 1.4rem;
    cursor: pointer;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
```
Paired rules:
```css
.stepperRight button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: transparent;
}
[data-theme="dark"] .stepperRight button:hover {
    background: var(--primary);
    color: white;
}
.stepperRight button:active {
    transform: scale(0.95);
}
```
Union across light/dark hover + active: `transform`, `box-shadow`, `border-color`, `background`, `color`. Curve matches `--ease-out`.

**14. `.openParcelBtn` — line 339**
```css
.openParcelBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 12px;
  background-color: var(--input-bg);
  border: 1px solid var(--border);
  color: var(--brand-blue, #1f6feb);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
```
Paired rule (lines 342-345):
```css
.openParcelBtn:hover {
  background-color: var(--brand-blue, #1f6feb);
  color: #fff;
}
```
Changes `background-color`, `color`.

**15. `.segmentItem` — line 376**
```css
.segmentItem {
    flex: 1;
    text-align: center;
    padding: 0.6rem 0;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--muted);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 10px;
    font-weight: 600;
}
```
Paired rules:
```css
.segmentItem:hover:not(.segmentItemActive) {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
}
.segmentItemActive {
    background: var(--primary);
    color: white;
    font-weight: 800;
    box-shadow: 0 4px 15px var(--primary-glow);
    transform: translateY(-1px);
}
```
Same `font-weight` pattern as site 2 (600→800 state swap) — excluded from the transition for the same reason (unreliable interpolation, treated as instant swap). Union: `background`, `color`, `box-shadow`, `transform`. Curve `cubic-bezier(0.4, 0, 0.2, 1)` matches plan 001's `--ease-in-out`.

**16. `.statCard` — line 508 — CORRECTED**
```css
.statCard {
    padding: 14px 16px;
    border-radius: var(--radius);
    background: var(--stat-bg);
    border: 1px solid var(--border);
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
}
```
The finding assumed no paired rule exists in this file and suggested a `box-shadow, border-color` fallback. That assumption was wrong — a paired rule does exist (lines 513-516):
```css
.statCard:hover {
    box-shadow: var(--shadow2);
    transform: translateY(-1px);
}
```
Use the real properties, not the fallback: `box-shadow`, `transform`.

**17. `.hesapOzetiPiyasaInput` — line 785 — flagged exception (see Boundaries)**
```css
.hesapOzetiPiyasaInput {
    width: 100px;
    padding: 4px 8px;
    border-radius: 12px;
    border: 1px solid var(--seal-border-soft);
    background: rgba(255, 255, 255, 0.05);
    color: var(--seal-text);
    font-size: 0.85rem;
    transition: all 0.2s ease;
}
```
Paired rule (lines 788-793):
```css
.hesapOzetiPiyasaInput:focus {
    width: 120px;
    border-color: var(--primary);
    outline: none;
    background: var(--input-bg);
}
```
Real changes on focus: `width` (100px→120px), `border-color`, `background`. `width` is a layout property; this plan's Boundaries forbid adding `width` to any transition except the documented pager-dot exception (site 20), so `width` is deliberately dropped here even though it currently animates under `all`. This is a **known, accepted micro-regression**: the input's width will snap instantly on focus instead of easing over 0.2s. Flagged explicitly for the feel-check step.

**18. `.digerAyarlarBtn` — line 904**
```css
.digerAyarlarBtn {
    background: transparent;
    border: none;
    color: var(--primary);
    width: calc(100% - 32px);
    padding: 12px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin: 0 12px;
}
```
Paired rule (lines 908-911):
```css
.digerAyarlarBtn:hover {
    background: var(--primary-glow);
    transform: translateY(-1px);
}
```
Changes `background`, `transform`.

**19. `.primaryActionBtn` — line 928**
```css
.primaryActionBtn {
    background: linear-gradient(135deg, var(--green) 0%, #0d9668 100%);
    color: white;
    border: none;
    width: calc(100% - 24px);
    padding: 14px;
    border-radius: 16px;
    font-weight: 800;
    font-size: 1.05rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(var(--green-rgb), 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    margin: 8px 12px 16px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
}
```
Paired rules (lines 954-962):
```css
.primaryActionBtn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 14px 30px rgba(var(--green-rgb), 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.4);
}
.primaryActionBtn:active {
    transform: scale(0.97);
    box-shadow: 0 4px 10px rgba(var(--green-rgb), 0.3);
}
```
Changes `transform`, `box-shadow`. Curve matches `--ease-out`.

**20. `.pagerDot` — line 1132 (documented pager-dot exception applies)**
```css
.pagerDot {
    width: 8px;
    height: 8px;
    border-radius: 10px;
    border: none;
    background: var(--muted);
    opacity: 0.4;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
}
```
Paired state rule (lines 1136-1140):
```css
.pagerDotActive {
    width: 20px;
    background: var(--primary);
    opacity: 1;
}
```
Changes `width` (8px→20px, growing into a pill — the documented pager-dot exception applies since the base size is well under 20px), `background`, `opacity`. Curve matches `--ease-in-out`.

### File 6/6: `src/components/auth/AuthModal.tsx`

**21. Two inline `style` props — lines 74 and 83**

Line 74 (Vazgeç / cancel button):
```tsx
style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)' }}
```
Line 83 (Giriş Yap / login button):
```tsx
style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)', boxShadow: '0 8px 20px var(--primary-glow)' }}
```
Both buttons are plain inline-styled elements with no separate `:hover`/`:active` CSS rule anywhere in the codebase (confirmed by reading the full file) — feedback is driven entirely by the `onMouseDown`/`onMouseUp`/`onMouseLeave` handlers on the same lines, which set `e.currentTarget.style.transform`. Since there is no paired rule to narrow against, and these are pressable CTA buttons, narrow to the standard press-feedback trio `transform, box-shadow, background-color` per the finding's explicit instruction, using `var(--ease-out)` (curve `cubic-bezier(0.2,0.8,0.2,1)` is plan 001's documented near-duplicate of the `--ease-out` curve). Only the `transition` string changes — all other style values (colors, `boxShadow`, etc.) are left untouched.

## Target

**1.** `src/app/admin/admin.module.css:77`
```css
    transition: background-color 0.2s ease;
```

**2.** `src/app/admin/admin.module.css:370`
```css
    transition: background-color 0.2s, color 0.2s;
```

**3.** `src/app/admin/admin.module.css:401`
```css
    transition: transform 0.2s, box-shadow 0.2s;
```

**4.** `src/app/admin/admin.module.css:555`
```css
    transition: transform 0.2s;
```

**5.** `src/app/admin/admin.module.css:579`
```css
    transition: background-color 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
```

**6.** `src/app/admin/admin.module.css:606`
```css
    transition: border-color 0.2s, color 0.2s, background-color 0.2s;
```

**7.** `src/app/dashboard/dashboard.module.css:89`
```css
    transition: background-color 0.2s ease;
```

**8.** `src/app/dashboard/dashboard.module.css:231`
```css
    transition: box-shadow 0.2s ease, transform 0.2s ease;
```

**9.** `src/app/hesapla/mobile/mobile.module.css:180`
```css
        transition: background-color 0.2s;
```

**10.** `src/app/hesapla/SmartContextCard.module.css:9`
```css
    transition: box-shadow 0.3s var(--ease-out), border-color 0.3s var(--ease-out);
```

**11.** `src/app/hesapla/page.module.css:185`
```css
    transition: background-color 0.3s var(--ease-out), color 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out), border-color 0.3s var(--ease-out), transform 0.3s var(--ease-out);
```

**12.** `src/app/hesapla/page.module.css:227`
```css
    transition: box-shadow 0.2s ease;
```

**13.** `src/app/hesapla/page.module.css:286`
```css
    transition: transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), border-color 0.2s var(--ease-out), background-color 0.2s var(--ease-out), color 0.2s var(--ease-out);
```

**14.** `src/app/hesapla/page.module.css:339`
```css
  transition: background-color 0.2s, color 0.2s;
```

**15.** `src/app/hesapla/page.module.css:376`
```css
    transition: background-color 0.25s var(--ease-in-out), color 0.25s var(--ease-in-out), box-shadow 0.25s var(--ease-in-out), transform 0.25s var(--ease-in-out);
```

**16.** `src/app/hesapla/page.module.css:508`
```css
    transition: box-shadow 0.25s ease, transform 0.25s ease;
```

**17.** `src/app/hesapla/page.module.css:785`
```css
    transition: border-color 0.2s ease, background-color 0.2s ease;
```

**18.** `src/app/hesapla/page.module.css:904`
```css
    transition: background-color 0.2s, transform 0.2s;
```

**19.** `src/app/hesapla/page.module.css:928`
```css
    transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
```

**20.** `src/app/hesapla/page.module.css:1132`
```css
    transition: width 0.3s var(--ease-in-out), background-color 0.3s var(--ease-in-out), opacity 0.3s var(--ease-in-out);
```

**21a.** `src/components/auth/AuthModal.tsx:74` — change only the `transition` value inside the existing style object:
```tsx
transition: 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), background-color 0.2s var(--ease-out)'
```

**21b.** `src/components/auth/AuthModal.tsx:83` — change only the `transition` value inside the existing style object:
```tsx
transition: 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out), background-color 0.2s var(--ease-out)'
```

## Repo conventions to follow

- CSS Modules: keep the `transition: prop1 <duration> <easing>, prop2 <duration> <easing>;` multi-property syntax exactly as the rest of the codebase already writes multi-property transitions — see `src/components/mobile/BottomSheet.module.css` and `src/components/ui/RangeSlider.module.css:58` (`transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s;`) for the repo's comma-separated transition list style.
- Where the original declaration had no easing keyword at all (bare `all 0.2s;`), do not introduce one — keep the replacement bare too (e.g. `background-color 0.2s, color 0.2s;`), matching plan 001's rule of never forcing a token (or an easing) where none existed.
- Where the original had the literal keyword `ease` (not a cubic-bezier), keep `ease` verbatim — do not swap it for a plan-001 token.
- Only replace a cubic-bezier with a plan-001 token when it is one of the three duplicate curves plan 001 already tokenized: `cubic-bezier(0.25, 0.8, 0.25, 1)` and `cubic-bezier(0.2, 0.8, 0.2, 1)` → `var(--ease-out)`; `cubic-bezier(0.4, 0, 0.2, 1)` → `var(--ease-in-out)`.
- Do not change indentation style per file — admin/dashboard/SmartContextCard/page CSS Modules use 4-space indents inside rule blocks; `mobile.module.css` rules sit inside a top-level `@media` block so their declarations are indented 8 spaces; `openParcelBtn` in `page.module.css` uses 2-space indentation (pre-existing inconsistency in that one rule — preserve it, do not "fix" it as part of this plan).

## Steps

1. **`src/app/admin/admin.module.css`** — replace the `transition` line in 6 rules: `.navItem` (line 77), `.segmentTab, .segmentTabActive` (line 370), `.iconBtn` (line 401), `.defaultBadge` (line 555), `.deleteBtn` (line 579), `.addLevelBtn` (line 606). Use Target snippets 1-6 above.
2. **`src/app/dashboard/dashboard.module.css`** — replace the `transition` line in 2 rules: `.navItem` (line 89), `.reportCard` (line 231). Use Target snippets 7-8 above.
3. **`src/app/hesapla/mobile/mobile.module.css`** — replace the `transition` line in 1 rule: `.openParcelBtnMobile` (line 180). Use Target snippet 9 above.
4. **`src/app/hesapla/SmartContextCard.module.css`** — replace the `transition` line in 1 rule: `.container` (line 9). Use Target snippet 10 above.
5. **`src/app/hesapla/page.module.css`** — replace the `transition` line in 10 rules: `.luxBox` (line 185), `.stepperInput` (line 227), `.stepperRight button` (line 286), `.openParcelBtn` (line 339), `.segmentItem` (line 376), `.statCard` (line 508), `.hesapOzetiPiyasaInput` (line 785), `.digerAyarlarBtn` (line 904), `.primaryActionBtn` (line 928), `.pagerDot` (line 1132). Use Target snippets 11-20 above.
6. **`src/components/auth/AuthModal.tsx`** — replace the `transition:` value inside the two inline `style={{ ... }}` objects at lines 74 and 83 only; do not touch any other key in either style object. Use Target snippets 21a-21b above.

## Boundaries

- Do NOT change any duration value.
- Do NOT touch colors, spacing, layout, or any property not explicitly named in this plan's Target section.
- Do NOT add `width` to the transition property list anywhere except the one documented pager-dot exception (site 20). Site 17 (`.hesapOzetiPiyasaInput`) genuinely animates `width` today via `transition: all` — per this rule, `width` is deliberately dropped there, meaning the input's width-on-focus change will snap instantly after this plan lands. This is an accepted, documented trade-off, not an oversight — call it out by name during the feel-check for that file.
- Do NOT add `font-weight` to any transition (sites 2 and 15 both have a font-weight state-swap that is deliberately excluded).
- Do NOT touch any file not explicitly listed above.
- Do NOT reorder or reformat any code outside the single `transition` declaration being changed in each rule.
- If a cited line's current content doesn't match what you find (drift since commit a8235e4), STOP that specific site, leave it unmodified, and report it — do not improvise a fix for content you weren't told about. (As of writing this plan, all 21 sites were re-verified against the live worktree and matched exactly — but re-verify again immediately before editing, since time may have passed.)

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect 0 errors) and `npx jest --no-coverage --roots "<rootDir>/src"` from repo root (expect all suites pass).
- **Feel check**: for each of the 6 files, trigger the interaction (hover/press/focus the relevant element) in a real browser at normal speed and confirm the visual feedback looks IDENTICAL to before this change (this is a narrowing, not a redesign — nothing should look different), with the one accepted exception of site 17's width-on-focus snap (documented above — confirm it's the ONLY visible difference, and that it's genuinely minor). Then open DevTools Performance panel, hover rapidly over 5-10 `.navItem`/`.iconBtn` elements in a row, and confirm no layout thrashing warnings appear (there shouldn't have been any before either, but this narrowing should make it structurally impossible for hidden properties to trigger one).
- **Done when**: none of the 21 sites listed still contain the literal string `transition: all` (or `transition: 'all` in the AuthModal.tsx inline styles), tsc and jest are green, and manual feel-check confirms no visual regression beyond the one documented `.hesapOzetiPiyasaInput` width exception.
