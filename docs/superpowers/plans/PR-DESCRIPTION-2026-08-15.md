# PR Description — Plan Archive Coverage Pass

## Summary

This PR closes the documentation gap between `docs/superpowers/specs` and
`docs/superpowers/plans`.

It adds:

- missing detailed implementation plans
- umbrella/pointer/closure plans for specs already covered by sub-plans
- a human-readable coverage index
- an execution queue
- a next-dispatch brief
- an audit checklist
- a machine-readable coverage manifest
- a PowerShell coverage checker
- session/runbook/commit-prep documentation

No application source code is changed.

## Key Files

- `docs/superpowers/plans/README.md`
- `docs/superpowers/plans/EXECUTION-QUEUE.md`
- `docs/superpowers/plans/NEXT-DISPATCH.md`
- `docs/superpowers/plans/RUNBOOK.md`
- `docs/superpowers/plans/AUDIT-CHECKLIST.md`
- `docs/superpowers/plans/coverage-manifest.json`
- `docs/superpowers/plans/check-coverage.ps1`
- `docs/superpowers/plans/SESSION-SUMMARY-2026-08-15.md`
- `docs/superpowers/plans/COMMIT-PREP-2026-08-15.md`

## New Detailed Plans

- `docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md`
- `docs/superpowers/plans/2026-06-08-arsabil-professional-ui-redesign.md`

## New Umbrella / Pointer / Closure Plans

- `docs/superpowers/plans/2026-06-07-arsabil-gelistirme-yol-haritasi.md`
- `docs/superpowers/plans/2026-06-07-arsabil-faz2.md`
- `docs/superpowers/plans/2026-06-07-arsabil-faz3b.md`
- `docs/superpowers/plans/2026-06-07-mobile-ui-premium-redesign.md`
- `docs/superpowers/plans/2026-06-08-arsabil-ui-design-system.md`
- `docs/superpowers/plans/2026-07-03-mobile-ui-redesign.md`
- `docs/superpowers/plans/2026-07-28-mobil-premium-liquid-glass.md`
- `docs/superpowers/plans/2026-07-29-hesapla-girdi-mimarisi.md`

## Recommended Next Implementation

Start with:

```text
docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md
Task 1: Veri modeli, API ve admin ekranina avgLandPricePerM2 ekle
```

## Verification

Ran:

```powershell
.\docs\superpowers\plans\check-coverage.ps1
```

Result:

```text
Plan coverage OK
```

Also verified JSON output:

```json
{
  "missingPlanNames": [],
  "manifestProblems": [],
  "ok": true
}
```

## Scope

Documentation/planning only:

- no app source changes
- no Prisma schema changes
- no generated files
- no package changes
- no runtime behavior changes
