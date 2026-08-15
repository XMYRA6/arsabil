# Commit Prep — Plan Archive Coverage Pass

Bu dosya, 2026-08-15 plan arşivi düzenleme çalışmasını commit'e hazırlamak için
kısa kontrol notudur.

## Intended Commit

```text
docs(plans): spec coverage index, queue, and next dispatch brief
```

## Files To Stage

Stage only the new plan archive documentation/utilities:

```powershell
git add docs/superpowers/plans/2026-06-07-arsabil-faz2.md
git add docs/superpowers/plans/2026-06-07-arsabil-faz3b.md
git add docs/superpowers/plans/2026-06-07-arsabil-gelistirme-yol-haritasi.md
git add docs/superpowers/plans/2026-06-07-mobile-ui-premium-redesign.md
git add docs/superpowers/plans/2026-06-08-arsabil-professional-ui-redesign.md
git add docs/superpowers/plans/2026-06-08-arsabil-ui-design-system.md
git add docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md
git add docs/superpowers/plans/2026-07-03-mobile-ui-redesign.md
git add docs/superpowers/plans/2026-07-28-mobil-premium-liquid-glass.md
git add docs/superpowers/plans/2026-07-29-hesapla-girdi-mimarisi.md
git add docs/superpowers/plans/AUDIT-CHECKLIST.md
git add docs/superpowers/plans/EXECUTION-QUEUE.md
git add docs/superpowers/plans/NEXT-DISPATCH.md
git add docs/superpowers/plans/README.md
git add docs/superpowers/plans/SESSION-SUMMARY-2026-08-15.md
git add docs/superpowers/plans/check-coverage.ps1
git add docs/superpowers/plans/coverage-manifest.json
```

Avoid `git add -A`; this repo often has unrelated generated or untracked files.

## Pre-Commit Checks

```powershell
.\docs\superpowers\plans\check-coverage.ps1
.\docs\superpowers\plans\check-coverage.ps1 -Json
git diff --cached --stat
```

Expected:

```text
Plan coverage OK
```

JSON expected:

```json
{
  "missingPlanNames": [],
  "manifestProblems": [],
  "ok": true
}
```

## Scope Statement

This commit is documentation/planning only:

- no application source changes
- no Prisma schema changes
- no generated files
- no test snapshots
- no package changes

## Suggested Commit Body

```text
Add missing spec-to-plan coverage for umbrella, pointer, closure, and detailed
planning gaps. Introduce a human-readable plan index, execution queue, next
dispatch brief, audit checklist, machine-readable coverage manifest, and a
PowerShell coverage checker.

The recommended next implementation is the comparable land cost model:
docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md Task 1.
```
