# Task 7 Report: Analiz drill-down + finansal panel

Commit: `16e3b23` — feat(hesapla): analiz drill-down + finansal ozet
Fix-round commit: `b77aa66` — fix(hesapla): analiz kapat satirini AnalizSekmesi tek sahibi yap

## Worktree verification

```
git rev-parse --show-toplevel -> C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass
git branch --show-current      -> feature/mobil-liquid-glass
HEAD before work                -> 892ab70 (matches brief)
```

## What I implemented

`src/app/hesapla/mobile/AnalizSekmesi.tsx`:
- `AnalizSekmesiProps` gained `onKapat: () => void`.
- Confirmed (per controller's note) that `SekmeSecici`/`MobilSekme`/`SEGMENTLER`/
  `SegmentedTabs` were already gone from this file (Task 6's work) — nothing to
  delete here.
- Added a close row (`kapatSatiri`) rendered above both branches (empty-state
  and populated-state), reusing the existing `.analizKapatSatiri` CSS class
  (already present in `mobile.module.css`, itself documented as the same
  pattern as `FiyatAciklamasi`'s `.aciklamaBaslik` header but carrying its own
  horizontal margin because it sits directly in the flat column rather than
  inside a bordered card) plus `.aciklamaBaslikMetin` / `.aciklamaKapat` for
  the title and button, exactly matching `FiyatAciklamasi`'s pattern as the
  brief asked.
- Added a fourth card, `role="group" aria-label="Finansal özet"`, rendering
  `<FinancialDashboard totalInvestment={result.M} totalRevenue={result.FD_total} />`.
- No changes to `src/lib/calculator/engine_v2.ts`. No new touch-target or media
  query rules added (reused existing classes only). No emoji introduced by me
  (`FinancialDashboard.tsx` itself contains pre-existing emoji from before this
  plan; it is a consumed, unmodified component, out of this task's scope).

`src/app/hesapla/mobile/Analiz.test.tsx`:
- Confirmed (per controller's note) the `SekmeSecici` tests were already
  removed (Task 6).
- Added `onKapat={jest.fn()}` to the three pre-existing `AnalizSekmesi` renders
  (now a required prop).
- Mocked `@/components/FinancialDashboard`.
- Strengthened the `CostBreakdownChart` mock to capture props (`costProps`).
- Added the three tests specified in the brief verbatim: "finansal ozet de
  gosterilir", "kapat butonu onKapat i cagirir", "maliyet dagilimi proplari
  motor alanlarindan dogru turetilir".

`src/app/hesapla/page.tsx`:
- Per the controller's resolved ambiguity #3, updated the `analiz={{ ... }}`
  call site to add `onKapat: () => setMobilAnalizAcik(false)`. No other change
  made to this file (the pre-existing `onAnalizKapat={() => setMobilAnalizAcik(false)}`
  line passed to `HesaplaMobile` was left untouched — see Concern below).

`src/app/hesapla/mobile/HesaplaMobile.test.tsx`:
- Not in the brief's file list, but `tsc` failed without this change: the
  test fixture's `analiz: { result: null, baseInput: BASE_INPUT, marketPrice: 0 }`
  object no longer satisfied `AnalizSekmesiProps` once `onKapat` became
  required. Added `onKapat: jest.fn()` to the fixture. This is a pure type-
  fixture fix, not a behavior change — `HesaplaMobile.test.tsx` mocks
  `AnalizSekmesi` entirely, so no new assertions were needed or added.

## TDD Evidence

**RED** — `npx jest src/app/hesapla/mobile/Analiz --no-coverage`, run after
writing the three new tests and the `onKapat` prop additions to existing
renders, before touching `AnalizSekmesi.tsx`:

```
Tests:       2 failed, 5 passed, 7 total
```
Failures: `getByRole('button', { name: /Kapat/ })` found nothing (no close
row yet) and (from the earlier failure in the same run) `getByRole('group',
{ name: 'Finansal özet' })` found nothing (no fourth card yet). This is
exactly the expected failure — the two new behaviors did not exist yet. The
"maliyet dagilimi proplari" test passed trivially at this point since prop
capture doesn't depend on new behavior (expected — it's a strengthened
existing assertion, not new behavior).

**GREEN** — `npx jest src/app/hesapla/mobile/Analiz --no-coverage`, after
implementing `AnalizSekmesi.tsx`:

```
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

## Verification

```
npx jest src/app/hesapla/mobile --no-coverage
  Test Suites: 11 passed, 11 total
  Tests:       92 passed, 92 total

npx tsc --noEmit
  (no output — 0 errors, after also fixing HesaplaMobile.test.tsx fixture)

npx jest --no-coverage   (full suite)
  Test Suites: 97 passed, 97 total
  Tests:       698 passed, 698 total
  (baseline 695 + 3 new tests = 698, matches)

npx eslint src
  12 problems (2 errors, 10 warnings) — matches baseline exactly, none in
  files touched by this task.
```

## Files changed

- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\AnalizSekmesi.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\Analiz.test.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\HesaplaMobile.test.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\page.tsx`

## Self-review

- Completeness: all three brief tests present verbatim; `onKapat` prop wired
  end to end from `page.tsx` state down through `HesaplaMobile` to
  `AnalizSekmesi`; fourth card added with correct `result.M`/`result.FD_total`
  derivation matching `FinancialDashboard`'s actual prop names
  (`totalInvestment`, `totalRevenue` — verified against
  `src/components/FinancialDashboard.tsx:6-9`).
- Quality: close row reuses the pre-existing `.analizKapatSatiri` class
  rather than inventing new CSS, consistent with the established pattern
  (checked `mobile.module.css:825-838`, whose own comment describes it as
  the `.aciklamaBaslik`-equivalent for this exact context).
- Discipline: did not touch `engine_v2.ts`, did not add any `min-height`
  outside the existing (already-scoped) media query, did not introduce
  emoji, did not touch `page.tsx` beyond the one authorized line.
- Testing: RED confirmed genuine absence of the two new behaviors before
  implementing; GREEN confirmed after. Full suite + tsc + eslint all clean
  against baseline.

## Concern — DONE_WITH_CONCERNS

**A duplicate "Analiz" close affordance now exists in the composed app**,
though every automated test still passes (each level tests its own
component in isolation with mocks, so nothing catches the composition).

Sequence of evidence:
1. Task 6's brief (`task-6-brief.md` Step 2, and plan lines 1074-1075)
   explicitly had `HesaplaMobile.tsx` render its own close header above
   `AnalizSekmesi`, using an `onAnalizKapat` prop — described as "the same
   pattern as `FiyatAciklamasi`'s kapat button." This is implemented at
   `HesaplaMobile.tsx:76-85` (title "Analiz" + "Kapat" button) and tested in
   `HesaplaMobile.test.tsx:91-96`.
2. Task 7's brief (this task) adds an *independent* `onKapat` prop to
   `AnalizSekmesi` itself with its *own* "Analiz" title + "Kapat" button,
   described the same way ("reuse `FiyatAciklamasi`'s `.aciklamaBaslik`
   pattern").
3. `FiyatAciklamasi` itself is the precedent for how a drill-down should
   work: it owns its close row entirely; `HesaplaMobile` does NOT render a
   separate header for it. The natural reading is that `AnalizSekmesi`
   should work the same way once Task 7 lands, making `HesaplaMobile`'s
   Task-6-era close row (and its `onAnalizKapat` prop / the `page.tsx`
   `onAnalizKapat={...}` line) dead, duplicate code.
4. I did not remove `HesaplaMobile.tsx`'s close row / `onAnalizKapat` prop,
   because: (a) neither the brief nor the controller's resolved ambiguities
   listed `HesaplaMobile.tsx` as in scope for this task, (b) the controller's
   instructions explicitly say "don't restructure anything outside your
   task" and to make no other change to `page.tsx` beyond the one line, and
   (c) doing so would also require editing `HesaplaMobile.test.tsx`'s
   "analiz Kapat butonu onAnalizKapat i cagirir" test and possibly
   `HesaplaMobileProps`, which is a larger footprint than authorized.

**Net effect if left as-is:** when a user opens Analiz on the real running
page, they will see two stacked "Analiz" headings and two "Kapat" buttons
(one from `HesaplaMobile`, one from `AnalizSekmesi` itself) — a visible bug
that contradicts the plan's own "tek kapı" (single door) principle (spec K4/K5).
No test in the suite catches this because `HesaplaMobile.test.tsx` mocks
`AnalizSekmesi` out entirely and `Analiz.test.tsx` renders `AnalizSekmesi` in
isolation.

**Recommendation:** a small follow-up should remove `HesaplaMobile.tsx`'s
`analizKapatSatiri` block (lines 71-88's header) and the `onAnalizKapat`
prop from `HesaplaMobileProps`/`HesaplaMobile.test.tsx`/`page.tsx`, letting
`AnalizSekmesi` own the close affordance exclusively — mirroring
`FiyatAciklamasi` exactly. I left this for human/controller decision rather
than doing it myself, since it touches files outside this task's authorized
scope.

---

## Fix round (on top of `16e3b23`)

The coordinator escalated the concern to the human partner. Ruling: `AnalizSekmesi`
is the sole owner of the "Analiz" + "Kapat" row; Task 6's row in `HesaplaMobile.tsx`
was the stale one and is now explicitly in scope to remove.

### What I changed

1. **`src/app/hesapla/mobile/HesaplaMobile.tsx`** — deleted the `.analizKapatSatiri`
   block (the `<h2>Analiz</h2>` + "Kapat" button that used to sit above
   `<AnalizSekmesi {...analiz} />`). The `analizAcik` branch now renders
   `<AnalizSekmesi {...analiz} />` directly with no wrapping fragment (the
   fragment was only needed to hold two siblings; with one child it's
   unnecessary).
2. **`src/app/hesapla/mobile/HesaplaMobile.tsx`** — removed the now-dead
   `onAnalizKapat: () => void` from `HesaplaMobileProps`, its destructured
   parameter, and its JSDoc line. Replaced the JSDoc on `analiz` with a note
   that the close affordance now lives in `AnalizSekmesi.onKapat`.
3. **`src/app/hesapla/page.tsx`** — removed the `onAnalizKapat={() => setMobilAnalizAcik(false)}`
   line passed to `HesaplaMobile` (the prop no longer exists on
   `HesaplaMobileProps`). No other line in `page.tsx` touched — `analiz.onKapat`
   (added in the first commit of this task) already supplies the identical
   behaviour, so this is a pure removal of a now-redundant call-site line, not
   a behaviour change.
4. **Orphan check (grep-verified):** `.analizKapatSatiri` CSS class is NOT
   orphaned — it is now the class used by `AnalizSekmesi.tsx`'s own close row
   (added in the first commit), so it stays in `mobile.module.css`. Grepped
   `onAnalizKapat` across `src/` after all edits — zero remaining references.
   No other dead code was orphaned by this removal.
5. **`src/app/hesapla/mobile/AnalizSekmesi.tsx`** — rewrote the stale
   module-level comment (was: "analiz artik `HesaplaMobile`de etiketli bir
   'Kapat' satiriyla acilip kapanan bir derinlestirme yapragi"). It now states
   that the close affordance lives in this component itself (`onKapat`, same
   pattern as `FiyatAciklamasi`) and that `HesaplaMobile` only conditionally
   renders this component — it does not carry its own separate close row —
   noting this is the Task 7 fix-round correction of what Task 6 left behind.
6. **`src/app/hesapla/mobile/mobile.module.css`** — tightened the comment
   above `.analizKapatSatiri` (was ambiguous about who renders the row after
   the ownership change: "`AnalizSekmesi`nin ustundeki baslik" could be read
   as "someone else renders it above AnalizSekmesi"). Now explicit: "`AnalizSekmesi`nin
   KENDI render ettigi baslik + Kapat satiri ... bilesen kapatma affordance'ini
   kendisi tasir, `FiyatAciklamasi` gibi." No CSS rules changed, comment only.
7. **`src/app/hesapla/mobile/HesaplaMobile.test.tsx`** (test blind-spot fix,
   coordinator's point 4):
   - Removed `onAnalizKapat: jest.fn()` from the `props()` fixture (prop no
     longer exists).
   - Removed the stale test `'analiz Kapat butonu onAnalizKapat i cagirir'`
     (tested a prop that no longer exists).
   - Removed the now-unused `userEvent` import (only that removed test used it).
   - Wrapped the top-level `AnalizSekmesi` mock in a typed `jest.fn` (`mockAnalizSekmesi`,
     typed `jest.fn<ReactElement, [AnalizSekmesiProps]>`, "mock"-prefixed so
     `babel-plugin-jest-hoist` allows referencing it inside the `jest.mock`
     factory) instead of an inline stub, so a single test can swap in the
     real `AnalizSekmesi` implementation via `jest.requireActual` without
     un-mocking it for the rest of the file.
   - Added one new test: `'analiz yapraginda TEK "Analiz" basligi ve TEK
     "Kapat" butonu doner (yinelenen satir donmez)'`. It swaps
     `mockAnalizSekmesi`'s implementation to the real `AnalizSekmesi` (via
     `jest.requireActual`), renders `HesaplaMobile` with `analizAcik: true`,
     and asserts `getAllByRole('heading', { name: 'Analiz' })` and
     `getAllByRole('button', { name: 'Kapat' })` each have length 1 — then
     restores the stub in a `finally` block regardless of assertion outcome.
     I deliberately did NOT add a second test re-verifying `onKapat` wiring
     end-to-end through `HesaplaMobile`, since `Analiz.test.tsx`'s existing
     `'kapat butonu onKapat i cagirir'` test already covers that; the
     coordinator asked for exactly one discriminating assertion, and adding
     more would be scope creep.

### Proving the new test is actually discriminating (not just passing because a mock swallowed the real markup)

Before finalizing, I temporarily reintroduced the exact duplicate block into
`HesaplaMobile.tsx` (the old `.analizKapatSatiri` header rendered a second
time, above `<AnalizSekmesi {...analiz} />`) and reran only the new test to
confirm it fails:

```
$ npx jest src/app/hesapla/mobile/HesaplaMobile --no-coverage
FAIL src/app/hesapla/mobile/HesaplaMobile.test.tsx
  ● HesaplaMobile — tek kapi › analiz yapraginda TEK "Analiz" basligi ve TEK "Kapat" butonu doner (yinelenen satir donmez)

    expect(received).toHaveLength(expected)

    Expected length: 1
    Received length: 2
    Received array:  [<h2 class="aciklamaBaslikMetin">Analiz</h2>, <h2 class="aciklamaBaslikMetin">Analiz</h2>]

Test Suites: 1 failed, 1 passed, 2 total
Tests:       1 failed, 13 passed, 14 total
```

This confirms the test genuinely catches the regression it was written to
catch. I then reverted `HesaplaMobile.tsx` back to the fixed version (no
duplicate) before continuing.

### Fix-round TDD/verification evidence

**Confirmed RED for the fix itself** (implicit — the reintroduction test
above IS the RED case for this specific assertion; there was no separate
"write test first" cycle here since this was a targeted removal + one
discriminating test added per the coordinator's explicit instructions,
verified by deliberately reintroducing the bug and watching the new test
fail, then removing the bug and watching it pass).

**GREEN — focused suite**, `npx jest src/app/hesapla --no-coverage`, run
after all fix-round edits:

```
Test Suites: 17 passed, 17 total
Tests:       154 passed, 154 total
```

**`npx tsc --noEmit`** — no output (0 errors). Two intermediate `tsc` errors
were caught and fixed during this round before reaching 0:
- `TS2554: Expected 0 arguments, but got 1` / `TS2345` — the initial
  `mockAnalizSekmesi = jest.fn(() => ...)` had an inferred zero-arg type,
  which conflicted with both the mock factory calling it with `props` and
  the later `mockImplementation(GercekAnalizSekmesi)` (which takes
  `AnalizSekmesiProps`). Fixed by typing the mock explicitly as
  `jest.fn<ReactElement, [AnalizSekmesiProps]>`.
- `TS2503: Cannot find namespace 'JSX'` — first attempt used `JSX.Element`
  as the return type without a React import providing that global
  namespace in this test file's scope; switched to `import type { ReactElement }
  from 'react'` instead.

**`npx eslint src`** — after the two tsc fixes, an eslint warning appeared
that was not present before (`'_props' is defined but never used`) because
my first fix attempt named a required-but-unused parameter `_props`. Removed
the named parameter entirely by using `jest.fn<ReactElement, [AnalizSekmesiProps]>()`
(generic-only, no runtime parameter), which resolved it. Final result:

```
✖ 12 problems (2 errors, 10 warnings)
```
Matches the documented baseline exactly (same 2 errors / 10 warnings, none
in files touched by this task).

**GREEN — full suite**, `npx jest --no-coverage`, run after all fixes:

```
Test Suites: 97 passed, 97 total
Tests:       698 passed, 698 total
```
698/698 — matches the baseline from the first commit of this task exactly
(net test count unchanged: removed 1 stale test, added 1 discriminating
test).

### Files changed in the fix round

- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\HesaplaMobile.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\HesaplaMobile.test.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\AnalizSekmesi.tsx`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\mobile\mobile.module.css`
- `C:\Users\emre\Desktop\arsabil-main\.claude\worktrees\mobil-liquid-glass\src\app\hesapla\page.tsx`

### Fix-round self-review

- Completeness: all 4 numbered coordinator instructions addressed (delete
  duplicate row; remove dead prop + verify no other orphaned code via grep;
  update the stale `AnalizSekmesi.tsx` comment; add the discriminating test,
  rendering the real component since the mock was the blind spot).
- Quality: proved the new test is discriminating by deliberately
  reintroducing the bug and watching it fail (not just trusting the
  assertion looks right).
- Discipline: did not add a second, redundant onKapat-wiring test (that
  behavior is already covered in `Analiz.test.tsx`); did not touch any
  other `page.tsx` line; did not change any CSS rule, only a comment.
- Testing: RED/GREEN cycle for the discriminating test was verified by
  bug-reintroduction rather than assumed from reading the assertion.

### Concerns

None remaining. The duplicate-close-row concern from the first round is now
resolved and covered by a test that would fail if it regressed.

