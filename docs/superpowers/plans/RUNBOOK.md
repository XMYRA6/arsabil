# Plan Archive Runbook

Bu runbook, plan arşivini kullanan bir worker'ın hangi durumda hangi dosyaya
bakacağını hızlıca tarif eder.

## I Want To Start Work

1. `EXECUTION-QUEUE.md` dosyasini oku.
2. `NEXT-DISPATCH.md` dosyasindaki recommended next work ile basla.
3. Canonical plan dosyasini bastan sona oku.
4. Ilgili spec dosyasini oku.
5. Task 1'in baslangic komutlarini calistir.
6. Task kapsami disina cikma.

Current recommended first dispatch (guncel: 2026-08-22, bkz. `EXECUTION-QUEUE.md`/`NEXT-DISPATCH.md`):

```text
2026-08-19-arsabil-studio-faz3b-senaryo-taslagi-gecmis-ve-karsilastirma.md
Task 1: plan dosyasindaki ilk acik uygulama gorevi
```

Farkli bir AI modeline devir icin: `AGENT-HANDOFF-FAZ3B.md` (bu dizinde) —
bu oturumun ogrendigi kritik dersleri (TDD, gercek build/Playwright
dogrulama zorunlulugu, masaustu+mobil kablolama deseni, cakisma kontrolu)
ozetler.

## I Want To Check Coverage

Run:

```powershell
.\docs\superpowers\plans\check-coverage.ps1
```

Machine-readable output:

```powershell
.\docs\superpowers\plans\check-coverage.ps1 -Json
```

Expected:

```text
Plan coverage OK
```

## I Found A New Spec Without A Plan

1. Check whether a newer canonical plan already covers it.
2. If covered, add a pointer/umbrella/closure plan with the same normalized name.
3. If not covered, write a detailed implementation plan with task-level steps.
4. Update `README.md` if it is an umbrella/closure/pointer exception.
5. Update `coverage-manifest.json` if automation should know about the exception.
6. Run `check-coverage.ps1`.

## I Am Unsure Whether A Plan Is Dispatchable

Do not dispatch directly if the file contains one of these signals:

- `STATUS: OBSOLETE`
- `STATUS: CLOSED`
- `STATUS: IMPLEMENTED VIA CANONICAL PLAN`
- `Orchestration Plan`
- `Canonical Implementation Plan:` pointing elsewhere
- `Sub-plans:` list

Dispatchable plans generally contain concrete task sections such as:

```text
### Task 1: ...
**Files:**
- Modify:
- Test:
```

## I Finished A Plan Task

1. Run the task's required tests.
2. Run `npx tsc --noEmit` unless the task explicitly says otherwise.
3. Commit only the files owned by that task.
4. Add completion evidence to a status file if the plan has one.
5. Re-run `check-coverage.ps1` only if plan/spec files changed.

## I Need To Commit This Archive Pass

Use:

```text
COMMIT-PREP-2026-08-15.md
```

It lists the exact files to stage and the suggested commit message.






