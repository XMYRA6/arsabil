# Akif-2-Aksiyon (Sesli "Senaryo Kaydet") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One voice action — after a computed kat-karşılığı comparison, the user says "bunu kaydet"; Akif shows an on-screen confirm card with the numbers; on explicit confirm (button or voice "evet") the scenario is written to a project (creating the project by voice if the user has none), with a 30-second undo.

**Architecture:** Two-phase. `prepareScenarioSave` (a voice-only tool) validates, resolves the target project, deterministically recomputes the chosen row's full engine result, writes a single-use short-TTL `AkifPendingAction` row, and returns a confirm-card payload — it never persists a scenario. Commit runs through one server function (`commitPendingAction`) reachable from a browser POST (`/api/akif/voice/action/commit`) or a `commitPendingAction` voice tool; it re-checks plan limits, creates project+scenario (nested, no orphans), and issues an `undoToken`. Undo (`/api/akif/voice/action/undo`) deletes the scenario and, only if this action created it, the empty project.

**Tech Stack:** Next.js 16 App Router (route handlers, `runtime='nodejs'`), Prisma + PostgreSQL, React 19 hooks, WebRTC/OpenAI Realtime, Jest + Testing Library (jsdom for hook/component).

**Spec:** `docs/superpowers/specs/2026-09-10-akif-2-aksiyon-design.md`

## Global Constraints

- Branch `codex/professional-ui-and-land-cost`; **no push/deploy** — migration is dev-only (`prisma migrate deploy` against the dev DB), joins the unapplied Akif batch.
- Migrations are **hand-written** SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` (reference: `20260910120000_add_akif_voice_session`).
- Route handlers narrow `prisma` with `as unknown as <DI interface>` — never import `PrismaClient` types. Do not rely on `npx prisma generate` succeeding (Windows EPERM is known); DI interfaces make it unnecessary for `tsc`.
- **The engine, `Scenario`/`Project` models, `checkPlanLimit`, and Akif-1's `ToolName`/`dispatchTool`/`AKIF_TOOL_DEFS` calculator path must not change** except: `compareContractorOffers.ts`/`compareApartmentSizes.ts` switch their private `baseInput` to a shared `buildScenarioEngineInput` (behavior-identical), and `AKIF_TOOL_DEFS` in `realtimeSession.ts` is composed with new `ACTION_TOOL_DEFS`.
- Action tools (`prepareScenarioSave`, `commitPendingAction`) are exposed **only** on the voice tool path — never in Akif-1 text mode (`/api/akif/turn`).
- `AkifPendingAction`: 5-minute code-enforced TTL, single-use (`consumedAt`), `undoToken` single-use, undo window 30s.
- Reuse Akif-2.1's `checkVoiceSessionOwner` on every action route (session ownership).
- Every task ends green: `npx tsc --noEmit` 0 errors, the task's jest files pass, and (route/React tasks) `npm run build` clean. `public/sw.js` regenerates on build — never stage it.
- Turkish for code comments and UI copy, matching surrounding files.

## Reference: engine + model shapes (verified against current code)

- `CalculatorEngineV2.calculate(input: CalculationInput): CalculationOutput` (`src/lib/calculator/engine_v2.ts`).
  - `CalculationOutput` fields: `Mi_base, Mz, Z, Mi, Ma, M, derivedX, FD_total, FD_per_m2, Sdx (number|null), FA (number|null), FAbirim (number|null), x_max (number|null)`.
- `buildCalculationInput(params)` (`src/app/hesapla/calculatorUiHelpers.ts`) maps UI-shaped fields → `CalculationInput`. `compareContractorOffers.ts`'s private `baseInput(...)` already calls it.
- `Scenario` model columns: `name, projectId, luxLevel, apartmentSize, landShareRatio, totalApartments (Int?), arsaAlani (Float?), riskLevel, builderProfit, iksaMode, iksaPercentage, iksaManualTL, marketPrice, fdTotal, fdPerM2, mi, ma, totalCost, fa (Float?), fabirim (Float?), sdx (Float?)`.
- **Scenario field map** (from engine): `landShareRatio ← input.x`, `luxLevel ← input.L`, `apartmentSize ← input.Ad`, `arsaAlani ← input.Aa`, `totalApartments ← input.Sd ?? null`, `riskLevel ← 0`, `builderProfit ← input.K`, `iksaMode ← 'off'`, `iksaPercentage ← 0`, `iksaManualTL ← 0`, `marketPrice ← 0`, `fdTotal ← out.FD_total`, `fdPerM2 ← out.FD_per_m2`, `mi ← out.Mi`, `ma ← out.Ma`, `totalCost ← out.M`, `fa ← out.FA`, `fabirim ← out.FAbirim`, `sdx ← out.Sdx`.
- `RANGES` (`src/lib/ai/akif/numberSafety.ts`): `percent {1,99}`, `area {100,50000}`, `emsal {0.1,5}`, `daire {30,500}`, `birimMaliyet {1000,200000}`. `validateRange(field, v): boolean`.
- `EngineDefaults = { P, K, qualityLevels: {standart,orta,luks} }`; `resolveEngineDefaults(db)`, `lValue(tier, levels)` (`src/lib/ai/akif/gateway/engineDefaults.ts`).
- `checkPlanLimit(userId, 'scenarios'): Promise<{ allowed, reason?, current, limit }>` (`src/lib/plan.ts`). FREE cap = 3 scenarios total.
- `RATE_LIMITS.AKIF_TURN = { limit: 8, windowMs: 60_000 }` (`src/lib/rate-limit.ts`).
- Voice tool result flow: `voiceToolBridge.runVoiceToolCall` POSTs `/api/akif/voice/tool` `{sessionId, toolName, args}`; if response `data.kind` is a string it's treated as a `ToolResultCard`, else raw-to-model.

---

### Task 1: Prisma model + dev migration

**Files:**
- Modify: `prisma/schema.prisma` (add model near `AkifVoiceSession`, ~line 553)
- Create: `prisma/migrations/<timestamp>_add_akif_pending_action/migration.sql`

**Interfaces:**
- Produces: table `AkifPendingAction(id TEXT PK, userId TEXT, sessionId TEXT, kind TEXT, payload JSONB, createdAt TIMESTAMP(3) default now, consumedAt TIMESTAMP(3) null, undoToken TEXT null unique, undoUntil TIMESTAMP(3) null, createdScenarioId TEXT null, createdProjectId TEXT null)` + index `(userId, createdAt)`.

- [ ] **Step 1: Add the model**

```prisma
model AkifPendingAction {
  id                String    @id @default(cuid())
  userId            String
  sessionId         String
  kind              String
  payload           Json
  createdAt         DateTime  @default(now())
  consumedAt        DateTime?
  undoToken         String?   @unique
  undoUntil         DateTime?
  createdScenarioId String?
  createdProjectId  String?

  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Migration SQL**

Timestamp after the last migration. Create `prisma/migrations/<ts>_add_akif_pending_action/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AkifPendingAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "undoToken" TEXT,
    "undoUntil" TIMESTAMP(3),
    "createdScenarioId" TEXT,
    "createdProjectId" TEXT,

    CONSTRAINT "AkifPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AkifPendingAction_undoToken_key" ON "AkifPendingAction"("undoToken");

-- CreateIndex
CREATE INDEX "AkifPendingAction_userId_createdAt_idx" ON "AkifPendingAction"("userId", "createdAt");
```

- [ ] **Step 3: Apply to dev DB**

Run: `npm run dev:db` (if the container isn't up) then `npx prisma migrate deploy`
Expected: 1 migration applied. `npx prisma migrate status` → up to date.

- [ ] **Step 4: `npx prisma generate`** (best-effort; EPERM acceptable — note in commit).

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/<ts>_add_akif_pending_action
git commit -m "feat(akif-2-aksiyon): AkifPendingAction modeli + dev migration"
```

---

### Task 2: `scenarioEngine.ts` — shared engine input + full recompute

**Files:**
- Create: `src/lib/ai/akif/gateway/scenarioEngine.ts`
- Test: `src/lib/ai/akif/gateway/__tests__/scenarioEngine.test.ts`
- Modify: `src/lib/ai/akif/gateway/compareContractorOffers.ts` (replace private `baseInput`)

**Interfaces:**
- Consumes: `buildCalculationInput` (`@/app/hesapla/calculatorUiHelpers`), `CalculatorEngineV2` + `CalculationInput` (`@/lib/calculator/engine_v2`), `lValue` + `EngineDefaults` (`./engineDefaults`).
- Produces:
  - `interface ScenarioEngineArgs { x: number; apartmentSize: number; totalApartments: number; birimMaliyet: number | undefined; kaliteSinifi: 'standart'|'orta'|'luks'|undefined; arsaAlani: number; defaults: EngineDefaults }`
  - `buildScenarioEngineInput(args: ScenarioEngineArgs): CalculationInput` — **identical** to the current private `baseInput` in `compareContractorOffers.ts`
  - `interface ScenarioFields` — the `Scenario`-model input+output columns (no `name`/`projectId`): `{ luxLevel, apartmentSize, landShareRatio, totalApartments, arsaAlani, riskLevel, builderProfit, iksaMode, iksaPercentage, iksaManualTL, marketPrice, fdTotal, fdPerM2, mi, ma, totalCost, fa, fabirim, sdx }`
  - `interface ScenarioDisplay { arsaPayiPct: number; sahibineDaire: number | null; sahibineTL: number | null; toplamMaliyet: number; satisFiyati: number }`
  - `computeFullScenario(args: ScenarioEngineArgs): { output: CalculationOutput; scenarioFields: ScenarioFields; display: ScenarioDisplay }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/akif/gateway/__tests__/scenarioEngine.test.ts`:

```ts
import { buildScenarioEngineInput, computeFullScenario } from '../scenarioEngine'
import type { EngineDefaults } from '../engineDefaults'

const defaults: EngineDefaults = {
  P: 12000,
  K: 1.3,
  qualityLevels: { standart: 1.0, orta: 1.2, luks: 1.4 },
}

const args = {
  x: 0.55, // müteahhit %45
  apartmentSize: 100,
  totalApartments: 20,
  birimMaliyet: undefined,
  kaliteSinifi: undefined as 'orta' | undefined,
  arsaAlani: 2000,
  defaults,
}

it('buildScenarioEngineInput maps to engine CalculationInput', () => {
  const input = buildScenarioEngineInput(args)
  expect(input.x).toBe(0.55)
  expect(input.L).toBe(1.2) // lValue('orta')
  expect(input.Ad).toBe(100)
  expect(input.P).toBe(12000) // birimMaliyet undefined → defaults.P
  expect(input.K).toBe(1.3)
  expect(input.Sd).toBe(20)
  expect(input.Aa).toBe(2000)
  expect(input.isRiskEnabled).toBe(false)
  expect(input.isExcavationEnabled).toBe(false)
})

it('totalApartments < 1 → count disabled (Sd undefined)', () => {
  const input = buildScenarioEngineInput({ ...args, totalApartments: 0 })
  expect(input.Sd).toBeUndefined()
})

it('computeFullScenario returns output + mapped scenarioFields + display', () => {
  const r = computeFullScenario(args)
  expect(r.output.FD_total).toBeGreaterThan(0)
  // scenarioFields mapped from engine
  expect(r.scenarioFields.landShareRatio).toBe(0.55)
  expect(r.scenarioFields.luxLevel).toBe(1.2)
  expect(r.scenarioFields.apartmentSize).toBe(100)
  expect(r.scenarioFields.arsaAlani).toBe(2000)
  expect(r.scenarioFields.totalApartments).toBe(20)
  expect(r.scenarioFields.riskLevel).toBe(0)
  expect(r.scenarioFields.builderProfit).toBe(1.3)
  expect(r.scenarioFields.iksaMode).toBe('off')
  expect(r.scenarioFields.marketPrice).toBe(0)
  expect(r.scenarioFields.fdTotal).toBe(r.output.FD_total)
  expect(r.scenarioFields.mi).toBe(r.output.Mi)
  expect(r.scenarioFields.ma).toBe(r.output.Ma)
  expect(r.scenarioFields.totalCost).toBe(r.output.M)
  expect(r.scenarioFields.sdx).toBe(r.output.Sdx)
  expect(r.scenarioFields.fa).toBe(r.output.FA)
  expect(r.scenarioFields.fabirim).toBe(r.output.FAbirim)
  // display
  expect(r.display.arsaPayiPct).toBeCloseTo(45, 5) // (1 - 0.55) * 100
  expect(r.display.satisFiyati).toBe(r.output.FD_total)
  expect(r.display.toplamMaliyet).toBe(r.output.M)
  expect(r.display.sahibineDaire).toBe(r.output.Sdx)
})

it('kaliteSinifi luks → L from defaults', () => {
  const input = buildScenarioEngineInput({ ...args, kaliteSinifi: 'luks' })
  expect(input.L).toBe(1.4)
})
```

- [ ] **Step 2: Run, verify fail** — `npx jest src/lib/ai/akif/gateway/__tests__/scenarioEngine.test.ts` → module not found.

- [ ] **Step 3: Write `scenarioEngine.ts`**

Copy the current `baseInput` body from `compareContractorOffers.ts` verbatim into `buildScenarioEngineInput` (same `buildCalculationInput({...})` call, same `countEnabled = totalApartments >= 1` guard, same `lValue(kaliteSinifi ?? 'orta', defaults.qualityLevels)`, `globalUnitPrice: birimMaliyet ?? defaults.P`, `builderProfit: defaults.K`, `riskLevel: 0`, `iksaMode: 'off'` etc.). Then:

```ts
import { CalculatorEngineV2 } from '@/lib/calculator/engine_v2'
import type { CalculationInput, CalculationOutput } from '@/lib/calculator/engine_v2'
import { buildCalculationInput } from '@/app/hesapla/calculatorUiHelpers'
import { lValue } from './engineDefaults'
import type { EngineDefaults } from './engineDefaults'

export interface ScenarioEngineArgs {
  x: number
  apartmentSize: number
  totalApartments: number
  birimMaliyet: number | undefined
  kaliteSinifi: 'standart' | 'orta' | 'luks' | undefined
  arsaAlani: number
  defaults: EngineDefaults
}

export function buildScenarioEngineInput(args: ScenarioEngineArgs): CalculationInput {
  const countEnabled = args.totalApartments >= 1
  return buildCalculationInput({
    x: args.x,
    luxLevel: lValue(args.kaliteSinifi ?? 'orta', args.defaults.qualityLevels),
    apartmentSize: args.apartmentSize,
    globalUnitPrice: args.birimMaliyet ?? args.defaults.P,
    builderProfit: args.defaults.K,
    isApartmentCountEnabled: countEnabled,
    totalApartments: countEnabled ? args.totalApartments : 0,
    isAaEnabled: true,
    arsaAlani: args.arsaAlani,
    riskLevel: 0,
    iksaMode: 'off',
    iksaPercentage: 0,
    iksaManualTL: 0,
  })
}

export interface ScenarioFields {
  luxLevel: number
  apartmentSize: number
  landShareRatio: number
  totalApartments: number | null
  arsaAlani: number | null
  riskLevel: number
  builderProfit: number
  iksaMode: string
  iksaPercentage: number
  iksaManualTL: number
  marketPrice: number
  fdTotal: number
  fdPerM2: number
  mi: number
  ma: number
  totalCost: number
  fa: number | null
  fabirim: number | null
  sdx: number | null
}

export interface ScenarioDisplay {
  arsaPayiPct: number
  sahibineDaire: number | null
  sahibineTL: number | null
  toplamMaliyet: number
  satisFiyati: number
}

export function computeFullScenario(args: ScenarioEngineArgs): {
  output: CalculationOutput
  scenarioFields: ScenarioFields
  display: ScenarioDisplay
} {
  const input = buildScenarioEngineInput(args)
  const output = CalculatorEngineV2.calculate(input)
  const scenarioFields: ScenarioFields = {
    luxLevel: input.L,
    apartmentSize: input.Ad,
    landShareRatio: input.x,
    totalApartments: input.Sd ?? null,
    arsaAlani: input.Aa ?? null,
    riskLevel: 0,
    builderProfit: input.K,
    iksaMode: 'off',
    iksaPercentage: 0,
    iksaManualTL: 0,
    marketPrice: 0,
    fdTotal: output.FD_total,
    fdPerM2: output.FD_per_m2,
    mi: output.Mi,
    ma: output.Ma,
    totalCost: output.M,
    fa: output.FA,
    fabirim: output.FAbirim,
    sdx: output.Sdx,
  }
  const display: ScenarioDisplay = {
    arsaPayiPct: (1 - input.x) * 100,
    sahibineDaire: output.Sdx,
    sahibineTL: output.FA,
    toplamMaliyet: output.M,
    satisFiyati: output.FD_total,
  }
  return { output, scenarioFields, display }
}
```

> If `CalculationOutput` is not exported from `engine_v2.ts`, add `export` to its `interface CalculationOutput` declaration (type-only, no behavior change) — this counts as an allowed engine touch.

- [ ] **Step 4: Update `compareContractorOffers.ts`**

Delete the private `baseInput` function. `import { buildScenarioEngineInput } from './scenarioEngine'`. Replace the two `baseInput({...})` call sites with `buildScenarioEngineInput({...})` (identical arg object). No other changes.

- [ ] **Step 5: Run tests**

Run: `npx jest src/lib/ai/akif/gateway src/lib/ai/akif/__tests__/compareScenarios.test.ts`
Expected: new `scenarioEngine` tests pass; **existing `compareContractorOffers`/`compareApartmentSizes` tests unchanged and green** (behavior-identical extraction).

- [ ] **Step 6: `npx tsc --noEmit` → 0.**

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/akif/gateway/scenarioEngine.ts src/lib/ai/akif/gateway/__tests__/scenarioEngine.test.ts src/lib/ai/akif/gateway/compareContractorOffers.ts src/lib/calculator/engine_v2.ts
git commit -m "feat(akif-2-aksiyon): scenarioEngine — paylaşılan motor girdisi + tam yeniden hesap"
```

---

### Task 3: `prepareScenarioSave` tool + action tool defs/validation

**Files:**
- Create: `src/lib/ai/akif/gateway/prepareScenarioSave.ts`
- Create: `src/lib/ai/akif/gateway/actionTools.ts` (defs + validation for the two action tools)
- Test: `src/lib/ai/akif/gateway/__tests__/prepareScenarioSave.test.ts`
- Test: `src/lib/ai/akif/gateway/__tests__/actionTools.test.ts`

**Interfaces:**
- Consumes: `computeFullScenario` + `ScenarioFields`/`ScenarioDisplay` (Task 2); `resolveEngineDefaults` + `EngineDefaultsDb` (`./engineDefaults`); `validateRange` (`../numberSafety`); `checkPlanLimit` (`@/lib/plan`).
- Produces:
  - `actionTools.ts`:
    - `type ActionToolName = 'prepareScenarioSave' | 'commitPendingAction'`
    - `const ACTION_TOOL_DEFS: OpenAiToolDef[]` (import `OpenAiToolDef` from `./toolRegistry`)
    - `validateActionArgs(name: ActionToolName, args: unknown): ValidateResult` (import `ValidateResult` from `./toolRegistry`)
  - `prepareScenarioSave.ts`:
    - `interface PrepareScenarioSaveArgs { arsaAlani: number; emsal: number; muteahhitPayi: number; daireBuyuklugu?: number; birimMaliyet?: number; kaliteSinifi?: 'standart'|'orta'|'luks'; projectName?: string; scenarioName?: string }`
    - `interface PrepareScenarioSaveDb extends EngineDefaultsDb { project: { findMany(a: { where: { userId: string }; select: { id: true; name: true } }): Promise<{ id: string; name: string }[]> }; scenario: { count(a: { where: { project: { userId: string } } }): Promise<number> }; akifPendingAction: { deleteMany(a: { where: Record<string, unknown> }): Promise<unknown>; create(a: { data: Record<string, unknown> }): Promise<{ id: string }> } }`
    - `interface SaveScenarioPayload { projectRef: { existingId: string } | { newName: string | null }; scenarioName: string; scenarioFields: ScenarioFields; display: ScenarioDisplay }`
    - `type PrepareResult = { kind: 'pending_action'; pendingActionId: string; confirmCard: { projectRef: SaveScenarioPayload['projectRef']; projectCandidates?: { id: string; name: string }[]; scenarioName: string; display: ScenarioDisplay } } | { kind: 'blocked'; reason: 'plan_limit'; message: string } | { kind: 'needs_project_choice'; pendingActionId: string; candidates: { id: string; name: string }[]; scenarioName: string; display: ScenarioDisplay }`
    - `prepareScenarioSave(args: PrepareScenarioSaveArgs, deps: { db: PrepareScenarioSaveDb; userId: string; sessionId: string; plan: { checkPlanLimit: typeof import('@/lib/plan').checkPlanLimit } }): Promise<PrepareResult>`

  > `checkPlanLimit` is injected via `deps.plan.checkPlanLimit` so the unit test can stub it without a DB.

- [ ] **Step 1: Write the failing tests**

`actionTools.test.ts`:

```ts
import { validateActionArgs, ACTION_TOOL_DEFS } from '../actionTools'

it('ACTION_TOOL_DEFS has the two action tools', () => {
  const names = ACTION_TOOL_DEFS.map((d) => d.function.name)
  expect(names).toEqual(['prepareScenarioSave', 'commitPendingAction'])
})

it('prepareScenarioSave: valid args ok', () => {
  expect(
    validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45 }),
  ).toEqual({ ok: true })
})

it('prepareScenarioSave: out-of-range → fail with field', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 10, emsal: 2, muteahhitPayi: 45 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 99, muteahhitPayi: 45 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 0 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 100 }).ok).toBe(false)
})

it('prepareScenarioSave: bad optional daireBuyuklugu / kaliteSinifi / birimMaliyet → fail', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, daireBuyuklugu: 5 }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, kaliteSinifi: 'altin' }).ok).toBe(false)
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, birimMaliyet: 10 }).ok).toBe(false)
})

it('prepareScenarioSave: over-long name → fail', () => {
  expect(validateActionArgs('prepareScenarioSave', { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45, projectName: 'x'.repeat(200) }).ok).toBe(false)
})

it('commitPendingAction: requires pendingActionId string', () => {
  expect(validateActionArgs('commitPendingAction', { pendingActionId: 'abc' })).toEqual({ ok: true })
  expect(validateActionArgs('commitPendingAction', {}).ok).toBe(false)
  expect(validateActionArgs('commitPendingAction', { pendingActionId: 123 }).ok).toBe(false)
})
```

`prepareScenarioSave.test.ts`:

```ts
import { prepareScenarioSave } from '../prepareScenarioSave'

const engineDefaultsRows = {
  globalSettings: { findUnique: async () => null },
  profitLevel: { findFirst: async () => null },
}

function makeDb(over: Partial<Record<string, unknown>> = {}) {
  return {
    ...engineDefaultsRows,
    project: { findMany: jest.fn().mockResolvedValue([]) },
    scenario: { count: jest.fn().mockResolvedValue(0) },
    akifPendingAction: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'pa_1' }),
    },
    ...over,
  } as never
}

const okPlan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true, current: 0, limit: 3 }) }
const baseArgs = { arsaAlani: 2000, emsal: 2, muteahhitPayi: 45 }
const deps = (db = makeDb(), plan = okPlan) => ({ db, userId: 'u1', sessionId: 's1', plan })

it('0 projects, no projectName → newName:null, writes one pending row', async () => {
  const db = makeDb()
  const r = await prepareScenarioSave(baseArgs, deps(db))
  expect(r.kind).toBe('pending_action')
  if (r.kind !== 'pending_action') return
  expect(r.pendingActionId).toBe('pa_1')
  expect(r.confirmCard.projectRef).toEqual({ newName: null })
  expect(r.confirmCard.display.arsaPayiPct).toBeCloseTo(55, 5)
  expect(db.akifPendingAction.create).toHaveBeenCalledTimes(1)
  expect(db.akifPendingAction.deleteMany).toHaveBeenCalled() // stale sweep
})

it('exactly one project + no name → existingId', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Trabzon' }]) } })
  const r = await prepareScenarioSave(baseArgs, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ existingId: 'p1' })
})

it('projectName matches one → existingId', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Trabzon Arsa' }, { id: 'p2', name: 'Rize' }]) } })
  const r = await prepareScenarioSave({ ...baseArgs, projectName: 'trabzon arsa' }, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ existingId: 'p1' })
})

it('projectName matches none → newName', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Rize' }]) } })
  const r = await prepareScenarioSave({ ...baseArgs, projectName: 'Yeni Proje' }, deps(db))
  if (r.kind !== 'pending_action') throw new Error(r.kind)
  expect(r.confirmCard.projectRef).toEqual({ newName: 'Yeni Proje' })
})

it('≥2 projects, no name → needs_project_choice with candidates', async () => {
  const db = makeDb({ project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }]) } })
  const r = await prepareScenarioSave(baseArgs, deps(db))
  expect(r.kind).toBe('needs_project_choice')
  if (r.kind !== 'needs_project_choice') return
  expect(r.candidates).toHaveLength(2)
  expect(r.pendingActionId).toBe('pa_1')
})

it('plan limit exceeded → blocked, no pending row', async () => {
  const db = makeDb()
  const plan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: false, reason: 'Senaryo hakkın dolmuş', current: 3, limit: 3 }) }
  const r = await prepareScenarioSave(baseArgs, deps(db, plan))
  expect(r.kind).toBe('blocked')
  expect(db.akifPendingAction.create).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Write `actionTools.ts`**

```ts
// Akif-2-Aksiyon — sesle mutasyon tool tanımları + argüman doğrulaması.
// dispatchTool/ToolName'e DOKUNMAZ (Akif-1 hesaplayıcı yolu ayrı kalır).
// Yalnız ses tool yolunda expose edilir.
import type { OpenAiToolDef, ValidateResult } from './toolRegistry'
import { validateRange } from '../numberSafety'

export type ActionToolName = 'prepareScenarioSave' | 'commitPendingAction'

const KALITE = ['standart', 'orta', 'luks'] as const

export const ACTION_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'prepareScenarioSave',
      description:
        'Az önce karşılaştırılan senaryolardan kullanıcının seçtiği TEK oranı bir projeye kaydetmeye HAZIRLA. Yazmaz — ekranda onay kartı gösterir. Kullanıcı "kaydet" dediğinde çağır.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['arsaAlani', 'emsal', 'muteahhitPayi'],
        properties: {
          arsaAlani: { type: 'number' },
          emsal: { type: 'number' },
          muteahhitPayi: { type: 'number' },
          daireBuyuklugu: { type: 'number' },
          birimMaliyet: { type: 'number' },
          kaliteSinifi: { type: 'string', enum: [...KALITE] },
          projectName: { type: 'string' },
          scenarioName: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'commitPendingAction',
      description:
        'Ekrandaki onay kartını kullanıcı SÖZLÜ olarak ("evet", "kaydet", "tamam") onayladığında çağır. Kullanıcı onaylamadıysa ASLA çağırma.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['pendingActionId'],
        properties: { pendingActionId: { type: 'string' } },
      },
    },
  },
]

function fail(field: string, reason: string): ValidateResult {
  return { ok: false, field, reason }
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function validateActionArgs(name: ActionToolName, args: unknown): ValidateResult {
  const o: Record<string, unknown> =
    args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}

  if (name === 'commitPendingAction') {
    if (typeof o.pendingActionId !== 'string' || !o.pendingActionId) {
      return fail('pendingActionId', 'eksik')
    }
    return { ok: true }
  }

  // prepareScenarioSave
  if (!isNum(o.arsaAlani) || !validateRange('area', o.arsaAlani)) return fail('arsaAlani', 'geçersiz aralık')
  if (!isNum(o.emsal) || !validateRange('emsal', o.emsal)) return fail('emsal', 'geçersiz aralık')
  if (!isNum(o.muteahhitPayi) || !validateRange('percent', o.muteahhitPayi)) return fail('muteahhitPayi', 'geçersiz aralık')
  if (o.daireBuyuklugu !== undefined) {
    if (!isNum(o.daireBuyuklugu) || !validateRange('daire', o.daireBuyuklugu)) return fail('daireBuyuklugu', 'geçersiz aralık')
  }
  if (o.birimMaliyet !== undefined) {
    if (!isNum(o.birimMaliyet) || !validateRange('birimMaliyet', o.birimMaliyet)) return fail('birimMaliyet', 'geçersiz birim maliyet')
  }
  if (o.kaliteSinifi !== undefined) {
    if (typeof o.kaliteSinifi !== 'string' || !KALITE.includes(o.kaliteSinifi as (typeof KALITE)[number])) {
      return fail('kaliteSinifi', 'geçersiz kalite sınıfı')
    }
  }
  for (const f of ['projectName', 'scenarioName'] as const) {
    if (o[f] !== undefined) {
      if (typeof o[f] !== 'string') return fail(f, 'metin olmalı')
      if ((o[f] as string).length > 120) return fail(f, 'çok uzun')
    }
  }
  return { ok: true }
}
```

> Confirm `ValidateResult` and `OpenAiToolDef` are `export`ed from `toolRegistry.ts`. `OpenAiToolDef` is (`export interface OpenAiToolDef`); `ValidateResult` is (`export type ValidateResult`). Good.

- [ ] **Step 4: Write `prepareScenarioSave.ts`**

```ts
// Akif-2-Aksiyon — "senaryo kaydet" HAZIRLIK adımı. YAZMAZ (tek AkifPendingAction hariç).
import { resolveEngineDefaults, type EngineDefaultsDb } from './engineDefaults'
import { computeFullScenario, type ScenarioFields, type ScenarioDisplay } from './scenarioEngine'
import type { checkPlanLimit as CheckPlanLimit } from '@/lib/plan'

export interface PrepareScenarioSaveArgs {
  arsaAlani: number
  emsal: number
  muteahhitPayi: number
  daireBuyuklugu?: number
  birimMaliyet?: number
  kaliteSinifi?: 'standart' | 'orta' | 'luks'
  projectName?: string
  scenarioName?: string
}

export interface PrepareScenarioSaveDb extends EngineDefaultsDb {
  project: {
    findMany(a: {
      where: { userId: string }
      select: { id: true; name: true }
    }): Promise<{ id: string; name: string }[]>
  }
  akifPendingAction: {
    deleteMany(a: { where: Record<string, unknown> }): Promise<unknown>
    create(a: { data: Record<string, unknown> }): Promise<{ id: string }>
  }
}

export type ProjectRef = { existingId: string } | { newName: string | null }

export interface SaveScenarioPayload {
  projectRef: ProjectRef
  scenarioName: string
  scenarioFields: ScenarioFields
  display: ScenarioDisplay
}

export type PrepareResult =
  | {
      kind: 'pending_action'
      pendingActionId: string
      confirmCard: {
        projectRef: ProjectRef
        scenarioName: string
        display: ScenarioDisplay
      }
    }
  | {
      kind: 'needs_project_choice'
      pendingActionId: string
      candidates: { id: string; name: string }[]
      scenarioName: string
      display: ScenarioDisplay
    }
  | { kind: 'blocked'; reason: 'plan_limit'; message: string }

const STALE_MS = 5 * 60 * 1000

function trNormalize(s: string): string {
  return s.trim().toLocaleLowerCase('tr-TR')
}

export async function prepareScenarioSave(
  args: PrepareScenarioSaveArgs,
  deps: {
    db: PrepareScenarioSaveDb
    userId: string
    sessionId: string
    plan: { checkPlanLimit: typeof CheckPlanLimit }
  },
): Promise<PrepareResult> {
  const { db, userId, sessionId, plan } = deps

  // 1) Plan limiti ön-kontrol (yazmadan).
  const limit = await plan.checkPlanLimit(userId, 'scenarios')
  if (!limit.allowed) {
    return { kind: 'blocked', reason: 'plan_limit', message: limit.reason ?? 'Senaryo hakkın dolmuş.' }
  }

  // 2) Motor — seçilen tek satır.
  const defaults = await resolveEngineDefaults(db)
  const x = 1 - args.muteahhitPayi / 100
  const apartmentSize = args.daireBuyuklugu ?? 100
  const totalApartments = Math.floor((args.arsaAlani * args.emsal) / apartmentSize)
  const { scenarioFields, display } = computeFullScenario({
    x,
    apartmentSize,
    totalApartments,
    birimMaliyet: args.birimMaliyet,
    kaliteSinifi: args.kaliteSinifi,
    arsaAlani: args.arsaAlani,
    defaults,
  })

  const scenarioName = (args.scenarioName?.trim() || `Akif — Müteahhit %${args.muteahhitPayi}`).slice(0, 120)

  // 3) Proje hedefi.
  const projects = await db.project.findMany({ where: { userId }, select: { id: true, name: true } })
  let projectRef: ProjectRef
  let candidates: { id: string; name: string }[] | null = null

  if (args.projectName && args.projectName.trim()) {
    const target = trNormalize(args.projectName)
    const matches = projects.filter((p) => trNormalize(p.name) === target)
    if (matches.length === 1) projectRef = { existingId: matches[0].id }
    else if (matches.length === 0) projectRef = { newName: args.projectName.trim().slice(0, 120) }
    else {
      projectRef = { newName: null }
      candidates = matches
    }
  } else if (projects.length === 0) {
    projectRef = { newName: null }
  } else if (projects.length === 1) {
    projectRef = { existingId: projects[0].id }
  } else {
    projectRef = { newName: null }
    candidates = projects
  }

  // 4) Stale/consumed satırları temizle.
  await db.akifPendingAction.deleteMany({
    where: {
      userId,
      OR: [{ consumedAt: { not: null } }, { createdAt: { lt: new Date(Date.now() - STALE_MS) } }],
    },
  })

  // 5) Pending satırı yaz.
  const payload: SaveScenarioPayload = { projectRef, scenarioName, scenarioFields, display }
  const row = await db.akifPendingAction.create({
    data: { userId, sessionId, kind: 'save_scenario', payload: payload as unknown as Record<string, unknown> },
  })

  if (candidates) {
    return { kind: 'needs_project_choice', pendingActionId: row.id, candidates, scenarioName, display }
  }
  return { kind: 'pending_action', pendingActionId: row.id, confirmCard: { projectRef, scenarioName, display } }
}
```

- [ ] **Step 5: Run tests** — both files green.

- [ ] **Step 6: `npx tsc --noEmit` → 0.**

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/akif/gateway/prepareScenarioSave.ts src/lib/ai/akif/gateway/actionTools.ts src/lib/ai/akif/gateway/__tests__/prepareScenarioSave.test.ts src/lib/ai/akif/gateway/__tests__/actionTools.test.ts
git commit -m "feat(akif-2-aksiyon): prepareScenarioSave tool + action tool defs/validation"
```

---

### Task 4: `commitPendingAction` (lib)

**Files:**
- Create: `src/lib/ai/akif/voice/pendingAction.ts`
- Test: `src/lib/ai/akif/voice/__tests__/pendingAction.test.ts`

**Interfaces:**
- Consumes: `SaveScenarioPayload` (Task 3); `checkPlanLimit` (`@/lib/plan`, injected).
- Produces:
  - `interface PendingActionDb { akifPendingAction: { findUnique(a:{where:{id:string}}): Promise<PendingRow|null>; update(a:{where:{id:string};data:Record<string,unknown>}): Promise<unknown> }; project: { findFirst(a:{where:{id:string;userId:string}}): Promise<{id:string}|null>; create(a:{data:Record<string,unknown>}): Promise<{ id: string; name: string; scenarios: { id: string }[] }> }; scenario: { create(a:{data:Record<string,unknown>}): Promise<{ id: string }> } }`
  - `interface PendingRow { id: string; userId: string; sessionId: string; kind: string; payload: unknown; createdAt: Date; consumedAt: Date | null }`
  - `type CommitResult = { ok: true; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string } | { ok: false; reason: 'unknown'|'forbidden'|'already_consumed'|'expired'|'plan_limit'|'needs_project_name'; message: string }`
  - `commitPendingAction(db: PendingActionDb, input: { pendingActionId: string; userId: string; sessionId: string; overrides?: { projectId?: string; projectName?: string; scenarioName?: string } }, planDep: { checkPlanLimit: typeof import('@/lib/plan').checkPlanLimit }): Promise<CommitResult>`

- [ ] **Step 1: Write the failing test**

```ts
import { commitPendingAction } from '../pendingAction'

const fields = {
  luxLevel: 1.2, apartmentSize: 100, landShareRatio: 0.55, totalApartments: 20, arsaAlani: 2000,
  riskLevel: 0, builderProfit: 1.3, iksaMode: 'off', iksaPercentage: 0, iksaManualTL: 0, marketPrice: 0,
  fdTotal: 5000000, fdPerM2: 50000, mi: 2000000, ma: 800000, totalCost: 2800000, fa: 900000, fabirim: 450, sdx: 9,
}
const display = { arsaPayiPct: 45, sahibineDaire: 9, sahibineTL: 900000, toplamMaliyet: 2800000, satisFiyati: 5000000 }
const payload = { projectRef: { existingId: 'p1' }, scenarioName: 'Akif — Müteahhit %45', scenarioFields: fields, display }

function row(over: Partial<Record<string, unknown>> = {}) {
  return { id: 'pa_1', userId: 'u1', sessionId: 's1', kind: 'save_scenario', payload, createdAt: new Date(), consumedAt: null, ...over }
}
function makeDb(r: unknown) {
  return {
    akifPendingAction: { findUnique: jest.fn().mockResolvedValue(r), update: jest.fn().mockResolvedValue({}) },
    project: {
      findFirst: jest.fn().mockResolvedValue({ id: 'p1' }),
      create: jest.fn().mockResolvedValue({ id: 'pNew', name: 'Yeni', scenarios: [{ id: 'sc_new' }] }),
    },
    scenario: { create: jest.fn().mockResolvedValue({ id: 'sc_1' }) },
  } as never
}
const okPlan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true, current: 0, limit: 3 }) }
const inp = (o = {}) => ({ pendingActionId: 'pa_1', userId: 'u1', sessionId: 's1', ...o })

it('happy: existing project → scenario.create + consumed + undoToken', async () => {
  const db = makeDb(row())
  const r = await commitPendingAction(db, inp(), okPlan)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.scenarioId).toBe('sc_1')
  expect(r.projectId).toBe('p1')
  expect(db.scenario.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ projectId: 'p1', name: 'Akif — Müteahhit %45', fdTotal: 5000000, landShareRatio: 0.55 }) }),
  )
  const upd = db.akifPendingAction.update.mock.calls[0][0].data
  expect(upd.consumedAt).toBeInstanceOf(Date)
  expect(typeof upd.undoToken).toBe('string')
  expect(upd.createdScenarioId).toBe('sc_1')
  expect(upd.createdProjectId).toBeNull()
})

it('happy: new project (newName) → nested project.create, createdProjectId set', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: 'Yeni Proje' } } }))
  const r = await commitPendingAction(db, inp(), okPlan)
  if (!r.ok) throw new Error(r.reason)
  expect(db.project.create).toHaveBeenCalled()
  expect(db.scenario.create).not.toHaveBeenCalled()
  const upd = db.akifPendingAction.update.mock.calls[0][0].data
  expect(upd.createdProjectId).toBe('pNew')
  expect(upd.createdScenarioId).toBe('sc_new')
})

it('override projectId wins, verified for ownership', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: null } } }))
  db.project.findFirst = jest.fn().mockResolvedValue({ id: 'p9' })
  const r = await commitPendingAction(db, inp({ overrides: { projectId: 'p9' } }), okPlan)
  if (!r.ok) throw new Error(r.reason)
  expect(db.project.findFirst).toHaveBeenCalledWith({ where: { id: 'p9', userId: 'u1' } })
  expect(db.scenario.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ projectId: 'p9' }) }))
})

it('newName null and no override → needs_project_name', async () => {
  const db = makeDb(row({ payload: { ...payload, projectRef: { newName: null } } }))
  const r = await commitPendingAction(db, inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'needs_project_name' })
})

it('not found → unknown', async () => {
  const r = await commitPendingAction(makeDb(null), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'unknown' })
})
it('wrong user → forbidden', async () => {
  const r = await commitPendingAction(makeDb(row({ userId: 'other' })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'forbidden' })
})
it('wrong session → forbidden', async () => {
  const r = await commitPendingAction(makeDb(row({ sessionId: 'other' })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'forbidden' })
})
it('already consumed → already_consumed', async () => {
  const r = await commitPendingAction(makeDb(row({ consumedAt: new Date() })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'already_consumed' })
})
it('older than 5 min → expired', async () => {
  const r = await commitPendingAction(makeDb(row({ createdAt: new Date(Date.now() - 6 * 60 * 1000) })), inp(), okPlan)
  expect(r).toMatchObject({ ok: false, reason: 'expired' })
})
it('plan limit re-check fails → plan_limit, no write', async () => {
  const db = makeDb(row())
  const plan = { checkPlanLimit: jest.fn().mockResolvedValue({ allowed: false, reason: 'dolu', current: 3, limit: 3 }) }
  const r = await commitPendingAction(db, inp(), plan)
  expect(r).toMatchObject({ ok: false, reason: 'plan_limit' })
  expect(db.scenario.create).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Write `pendingAction.ts`**

```ts
// Akif-2-Aksiyon — commit + undo. İki giriş (buton POST + sesli tool) tek fonksiyona iner.
import type { SaveScenarioPayload } from '../gateway/prepareScenarioSave'
import type { checkPlanLimit as CheckPlanLimit } from '@/lib/plan'

export interface PendingRow {
  id: string
  userId: string
  sessionId: string
  kind: string
  payload: unknown
  createdAt: Date
  consumedAt: Date | null
  undoToken?: string | null
  undoUntil?: Date | null
  createdScenarioId?: string | null
  createdProjectId?: string | null
}

export interface PendingActionDb {
  akifPendingAction: {
    findUnique(a: { where: { id: string } }): Promise<PendingRow | null>
    findFirst?(a: { where: { undoToken: string } }): Promise<PendingRow | null>
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>
  }
  project: {
    findFirst(a: { where: { id: string; userId: string } }): Promise<{ id: string } | null>
    create(a: { data: Record<string, unknown> }): Promise<{ id: string; name: string; scenarios: { id: string }[] }>
  }
  scenario: {
    create(a: { data: Record<string, unknown> }): Promise<{ id: string }>
    deleteMany?(a: { where: Record<string, unknown> }): Promise<{ count: number }>
    count?(a: { where: Record<string, unknown> }): Promise<number>
  }
}

const STALE_MS = 5 * 60 * 1000
const UNDO_MS = 30 * 1000

export type CommitResult =
  | { ok: true; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string }
  | { ok: false; reason: 'unknown' | 'forbidden' | 'already_consumed' | 'expired' | 'plan_limit' | 'needs_project_name'; message: string }

const MSG: Record<Exclude<CommitResult, { ok: true }>['reason'], string> = {
  unknown: 'İşlem bulunamadı, tekrar söyle.',
  forbidden: 'Bu işlemi yapamıyorum.',
  already_consumed: 'Bu zaten kaydedildi.',
  expired: 'Süre doldu, tekrar söyle.',
  plan_limit: 'Bu ayki senaryo hakkın dolmuş.',
  needs_project_name: 'Proje için bir ad söyle.',
}

function toScenarioData(p: SaveScenarioPayload, name: string) {
  const f = p.scenarioFields
  return {
    name,
    luxLevel: f.luxLevel,
    apartmentSize: f.apartmentSize,
    landShareRatio: f.landShareRatio,
    totalApartments: f.totalApartments,
    arsaAlani: f.arsaAlani,
    riskLevel: f.riskLevel,
    builderProfit: f.builderProfit,
    iksaMode: f.iksaMode,
    iksaPercentage: f.iksaPercentage,
    iksaManualTL: f.iksaManualTL,
    marketPrice: f.marketPrice,
    fdTotal: f.fdTotal,
    fdPerM2: f.fdPerM2,
    mi: f.mi,
    ma: f.ma,
    totalCost: f.totalCost,
    fa: f.fa,
    fabirim: f.fabirim,
    sdx: f.sdx,
  }
}

export async function commitPendingAction(
  db: PendingActionDb,
  input: {
    pendingActionId: string
    userId: string
    sessionId: string
    overrides?: { projectId?: string; projectName?: string; scenarioName?: string }
  },
  planDep: { checkPlanLimit: typeof CheckPlanLimit },
): Promise<CommitResult> {
  const row = await db.akifPendingAction.findUnique({ where: { id: input.pendingActionId } })
  if (!row) return { ok: false, reason: 'unknown', message: MSG.unknown }
  if (row.userId !== input.userId || row.sessionId !== input.sessionId) {
    return { ok: false, reason: 'forbidden', message: MSG.forbidden }
  }
  if (row.consumedAt) return { ok: false, reason: 'already_consumed', message: MSG.already_consumed }
  if (Date.now() - new Date(row.createdAt).getTime() > STALE_MS) {
    return { ok: false, reason: 'expired', message: MSG.expired }
  }

  const limit = await planDep.checkPlanLimit(input.userId, 'scenarios')
  if (!limit.allowed) return { ok: false, reason: 'plan_limit', message: limit.reason ?? MSG.plan_limit }

  const payload = row.payload as SaveScenarioPayload
  const scenarioName = (input.overrides?.scenarioName?.trim() || payload.scenarioName).slice(0, 120)
  const scenarioData = toScenarioData(payload, scenarioName)

  // Proje çöz.
  const overrideName = input.overrides?.projectName?.trim()
  const payloadNewName = 'newName' in payload.projectRef ? payload.projectRef.newName : null
  const newName = overrideName || payloadNewName || null

  let projectId: string
  let projectName: string
  let createdProjectId: string | null = null
  let createdScenarioId: string

  if (input.overrides?.projectId) {
    const owned = await db.project.findFirst({ where: { id: input.overrides.projectId, userId: input.userId } })
    if (!owned) return { ok: false, reason: 'forbidden', message: MSG.forbidden }
    projectId = owned.id
    projectName = ''
    createdScenarioId = (await db.scenario.create({ data: { ...scenarioData, projectId } })).id
  } else if ('existingId' in payload.projectRef) {
    const owned = await db.project.findFirst({ where: { id: payload.projectRef.existingId, userId: input.userId } })
    if (!owned) return { ok: false, reason: 'forbidden', message: MSG.forbidden }
    projectId = owned.id
    projectName = ''
    createdScenarioId = (await db.scenario.create({ data: { ...scenarioData, projectId } })).id
  } else {
    if (!newName) return { ok: false, reason: 'needs_project_name', message: MSG.needs_project_name }
    const proj = await db.project.create({
      data: { name: newName, userId: input.userId, scenarios: { create: scenarioData } },
    })
    projectId = proj.id
    projectName = proj.name
    createdProjectId = proj.id
    createdScenarioId = proj.scenarios[0].id
  }

  const undoToken = crypto.randomUUID()
  const undoUntil = new Date(Date.now() + UNDO_MS)
  await db.akifPendingAction.update({
    where: { id: row.id },
    data: { consumedAt: new Date(), undoToken, undoUntil, createdScenarioId, createdProjectId },
  })

  return { ok: true, scenarioId: createdScenarioId, projectId, projectName, undoToken, undoUntil: undoUntil.toISOString() }
}
```

> `projectName: ''` for the existing-project branch means the confirm/committed card should fall back to showing "projene eklendi" without a name, OR the route can look the name up. **Ruling for the plan:** the commit route looks up `project.name` when `projectName` is empty (one extra `findUnique`), so the "saved" card always shows a name. Add that in Task 6.

- [ ] **Step 4-6: tests green, `tsc` 0, commit**

```bash
git add src/lib/ai/akif/voice/pendingAction.ts src/lib/ai/akif/voice/__tests__/pendingAction.test.ts
git commit -m "feat(akif-2-aksiyon): commitPendingAction — iki fazlı kaydet"
```

---

### Task 5: `undoAction` (lib)

**Files:**
- Modify: `src/lib/ai/akif/voice/pendingAction.ts` (add `undoAction`)
- Modify: `src/lib/ai/akif/voice/__tests__/pendingAction.test.ts` (add cases)

**Interfaces:**
- Produces: `undoAction(db: PendingActionDb & { scenario: { delete(a:{where:{id:string}}): Promise<unknown>; count(a:{where:Record<string,unknown>}): Promise<number> }; project: { delete(a:{where:{id:string}}): Promise<unknown> } }, input: { undoToken: string; userId: string }): Promise<{ ok: true; undid: { scenario: boolean; project: boolean } } | { ok: false; reason: 'unknown'|'forbidden'|'window_closed'; message: string }>`

**Verified:** `Project` relates only to `Scenario[]` (no `StudioScenario` link — `StudioScenario` is user-scoped, has no `projectId`). So "is the created project now empty" is just `scenario.count({ where: { projectId } }) === 0`.

- [ ] **Step 1: Failing tests (append)**

```ts
import { undoAction } from '../pendingAction'

function undoDb(r: unknown, scenCountAfter = 0) {
  return {
    akifPendingAction: { findFirst: jest.fn().mockResolvedValue(r), update: jest.fn().mockResolvedValue({}) },
    scenario: { delete: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(scenCountAfter) },
    project: { delete: jest.fn().mockResolvedValue({}) },
  } as never
}
const committedRow = (over = {}) => ({
  id: 'pa_1', userId: 'u1', sessionId: 's1', kind: 'save_scenario', payload: {}, createdAt: new Date(),
  consumedAt: new Date(), undoToken: 'ut_1', undoUntil: new Date(Date.now() + 20000),
  createdScenarioId: 'sc_1', createdProjectId: null, ...over,
})

it('undo: deletes the scenario, not the project (existing project)', async () => {
  const db = undoDb(committedRow())
  const r = await undoAction(db, { undoToken: 'ut_1', userId: 'u1' })
  expect(r).toEqual({ ok: true, undid: { scenario: true, project: false } })
  expect(db.scenario.delete).toHaveBeenCalledWith({ where: { id: 'sc_1' } })
  expect(db.project.delete).not.toHaveBeenCalled()
})

it('undo: deletes the created project too when it is now empty', async () => {
  const db = undoDb(committedRow({ createdProjectId: 'pNew' }), 0)
  const r = await undoAction(db, { undoToken: 'ut_1', userId: 'u1' })
  expect(r).toEqual({ ok: true, undid: { scenario: true, project: true } })
  expect(db.project.delete).toHaveBeenCalledWith({ where: { id: 'pNew' } })
})

it('undo: keeps the created project if it somehow has other scenarios', async () => {
  const db = undoDb(committedRow({ createdProjectId: 'pNew' }), 2)
  const r = await undoAction(db, { undoToken: 'ut_1', userId: 'u1' })
  expect(r).toEqual({ ok: true, undid: { scenario: true, project: false } })
})

it('undo: window closed → window_closed', async () => {
  const db = undoDb(committedRow({ undoUntil: new Date(Date.now() - 1000) }))
  expect(await undoAction(db, { undoToken: 'ut_1', userId: 'u1' })).toMatchObject({ ok: false, reason: 'window_closed' })
})

it('undo: token not found → unknown; wrong user → forbidden', async () => {
  expect(await undoAction(undoDb(null), { undoToken: 'x', userId: 'u1' })).toMatchObject({ ok: false, reason: 'unknown' })
  expect(await undoAction(undoDb(committedRow({ userId: 'other' })), { undoToken: 'ut_1', userId: 'u1' })).toMatchObject({ ok: false, reason: 'forbidden' })
})
```

- [ ] **Step 2-3: implement `undoAction`**

```ts
export async function undoAction(
  db: PendingActionDb & {
    scenario: {
      delete(a: { where: { id: string } }): Promise<unknown>
      count(a: { where: Record<string, unknown> }): Promise<number>
    }
    project: { delete(a: { where: { id: string } }): Promise<unknown> }
  },
  input: { undoToken: string; userId: string },
): Promise<
  | { ok: true; undid: { scenario: boolean; project: boolean } }
  | { ok: false; reason: 'unknown' | 'forbidden' | 'window_closed'; message: string }
> {
  const row = await db.akifPendingAction.findFirst!({ where: { undoToken: input.undoToken } })
  if (!row) return { ok: false, reason: 'unknown', message: 'İşlem bulunamadı.' }
  if (row.userId !== input.userId) return { ok: false, reason: 'forbidden', message: 'Bu işlemi geri alamıyorum.' }
  if (!row.undoUntil || Date.now() > new Date(row.undoUntil).getTime()) {
    return { ok: false, reason: 'window_closed', message: 'Geri alma süresi doldu.' }
  }

  if (row.createdScenarioId) await db.scenario.delete({ where: { id: row.createdScenarioId } })

  let projectDeleted = false
  if (row.createdProjectId) {
    const scen = await db.scenario.count({ where: { projectId: row.createdProjectId } })
    if (scen === 0) {
      await db.project.delete({ where: { id: row.createdProjectId } })
      projectDeleted = true
    }
  }

  await db.akifPendingAction.update({ where: { id: row.id }, data: { undoToken: null, undoUntil: null } })
  return { ok: true, undid: { scenario: Boolean(row.createdScenarioId), project: projectDeleted } }
}
```

> Verified against `prisma/schema.prisma`: `Project` relates only to `Scenario[]`; `StudioScenario` is user-scoped with no `projectId`. So the empty-check is `scenario.count` alone.

- [ ] **Step 4-6: tests green, tsc 0, commit**

```bash
git commit -am "feat(akif-2-aksiyon): undoAction — senaryo + (oluşturulmuşsa boş) proje sil"
```

---

### Task 6: action routes `/commit` + `/undo` + voice/tool wiring

**Files:**
- Create: `src/app/api/akif/voice/action/commit/route.ts`
- Create: `src/app/api/akif/voice/action/undo/route.ts`
- Modify: `src/app/api/akif/voice/tool/route.ts` (action-tool branch)
- Modify: `src/lib/ai/akif/voice/realtimeSession.ts` (compose `ACTION_TOOL_DEFS`)
- Tests: `src/app/api/akif/voice/action/commit/__tests__/route.test.ts`, `.../undo/__tests__/route.test.ts`, extend `src/app/api/akif/voice/tool/__tests__/route.test.ts`, extend `src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts`

**Interfaces:**
- Consumes: `commitPendingAction`/`undoAction` (Tasks 4-5); `checkVoiceSessionOwner` (Akif-2.1 `voiceSession.ts`); `prepareScenarioSave` (Task 3); `validateActionArgs`/`ACTION_TOOL_DEFS` (Task 3); `checkRateLimit`/`RATE_LIMITS.AKIF_TURN`.
- Produces: `POST /api/akif/voice/action/commit` (`{ pendingActionId, sessionId, projectId?, projectName?, scenarioName? }` → 200 `{ ok, scenarioId, projectId, projectName, undoToken, undoUntil }` | 401 | 429 | 409 `{ error, message }`); `POST /api/akif/voice/action/undo` (`{ undoToken }` → 200 `{ ok, undid }` | 401 | 429 | 409).

- [ ] **Step 1: Write failing tests**

`commit/__tests__/route.test.ts` (mock `commitPendingAction`, `checkVoiceSessionOwner`, `getServerSession`, `checkRateLimit`, `prisma`):

```ts
const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const checkOwnerMock = jest.fn()
const commitMock = jest.fn()
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { project: { findUnique: jest.fn().mockResolvedValue({ name: 'Trabzon' }) } } }))
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a), RATE_LIMITS: { AKIF_TURN: { limit: 8, windowMs: 60000 } } }))
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({ checkVoiceSessionOwner: (...a: unknown[]) => checkOwnerMock(...a) }))
jest.mock('@/lib/ai/akif/voice/pendingAction', () => ({ commitPendingAction: (...a: unknown[]) => commitMock(...a) }))
jest.mock('@/lib/plan', () => ({ checkPlanLimit: jest.fn() }))
import { POST } from '../route'

const req = (b: unknown) => new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  checkRateLimitMock.mockReturnValue({ ok: true })
  checkOwnerMock.mockResolvedValue({ ok: true, status: 'active' })
  commitMock.mockResolvedValue({ ok: true, scenarioId: 'sc_1', projectId: 'p1', projectName: '', undoToken: 'ut', undoUntil: '2026-01-01T00:00:00Z' })
})

it('401 no auth', async () => { getServerSessionMock.mockResolvedValue(null); expect((await POST(req({ pendingActionId: 'pa', sessionId: 's1' }))).status).toBe(401) })
it('429 rate limited', async () => { checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 60 }); expect((await POST(req({ pendingActionId: 'pa', sessionId: 's1' }))).status).toBe(429) })
it('403 session not owned', async () => { checkOwnerMock.mockResolvedValue({ ok: false, code: 'forbidden_session' }); expect((await POST(req({ pendingActionId: 'pa', sessionId: 's1' }))).status).toBe(403) })
it('400 missing pendingActionId', async () => { expect((await POST(req({ sessionId: 's1' }))).status).toBe(400) })
it('happy → 200 + looks up empty project name', async () => {
  const res = await POST(req({ pendingActionId: 'pa', sessionId: 's1' }))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.projectName).toBe('Trabzon') // looked up because commit returned ''
})
it('typed failure → 409', async () => {
  commitMock.mockResolvedValue({ ok: false, reason: 'expired', message: 'Süre doldu.' })
  const res = await POST(req({ pendingActionId: 'pa', sessionId: 's1' }))
  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('expired')
})
```

`undo/__tests__/route.test.ts` — analogous (mock `undoAction`, `checkVoiceSessionOwner` NOT needed — undo carries only `undoToken`; still auth + rate-limit): 401/429/happy 200 `{ok:true, undid}`/409 on `{ok:false}`.

Extend `tool/__tests__/route.test.ts`: mock `prepareScenarioSave` + `commitPendingAction`; assert `toolName: 'prepareScenarioSave'` with valid args → calls `prepareScenarioSave` with `{ db, userId:'u1', sessionId:<body.sessionId>, plan }` and returns its result JSON; `toolName: 'commitPendingAction'` → calls `commitPendingAction`; invalid action args → `{ error: 'invalid_args', field }` (200, contract preserved); the ownership guard (Akif-2.1) still runs first.

Extend `realtimeSession.test.ts`: `buildRealtimeSessionConfig().tools` includes `prepareScenarioSave` and `commitPendingAction` names alongside the three calculator tools.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: `commit/route.ts`**

```ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { checkVoiceSessionOwner, type VoiceSessionDb } from '@/lib/ai/akif/voice/voiceSession'
import { commitPendingAction, type PendingActionDb } from '@/lib/ai/akif/voice/pendingAction'
import { checkPlanLimit } from '@/lib/plan'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rl = checkRateLimit('akif-voice-action:user:' + userId, RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } })
  }

  let body: { pendingActionId?: unknown; sessionId?: unknown; projectId?: unknown; projectName?: unknown; scenarioName?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'bad_request' }, { status: 400 }) }
  const { pendingActionId, sessionId } = body
  if (typeof pendingActionId !== 'string' || !pendingActionId || typeof sessionId !== 'string' || !sessionId) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const db = prisma as unknown as VoiceSessionDb & PendingActionDb & {
    project: { findUnique(a: { where: { id: string } }): Promise<{ name: string } | null> }
  }
  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) return Response.json({ error: owner.code }, { status: 403 })

  const overrides = {
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
    scenarioName: typeof body.scenarioName === 'string' ? body.scenarioName : undefined,
  }
  const r = await commitPendingAction(db, { pendingActionId, userId, sessionId, overrides }, { checkPlanLimit })
  if (!r.ok) return Response.json({ error: r.reason, message: r.message }, { status: 409 })

  let projectName = r.projectName
  if (!projectName) {
    projectName = (await db.project.findUnique({ where: { id: r.projectId } }))?.name ?? ''
  }
  return Response.json({ ok: true, scenarioId: r.scenarioId, projectId: r.projectId, projectName, undoToken: r.undoToken, undoUntil: r.undoUntil })
}
```

- [ ] **Step 4: `undo/route.ts`** — auth → rate-limit → body `{ undoToken }` → `undoAction(prisma as unknown as ..., { undoToken, userId })` → 200 `{ ok:true, undid }` | 409 `{ error: reason, message }`.

- [ ] **Step 5: `tool/route.ts` action branch**

After the ownership guard + before `TOOL_NAMES.includes`, add:

```ts
import { validateActionArgs, type ActionToolName } from '@/lib/ai/akif/gateway/actionTools'
import { prepareScenarioSave, type PrepareScenarioSaveDb } from '@/lib/ai/akif/gateway/prepareScenarioSave'
import { commitPendingAction, type PendingActionDb } from '@/lib/ai/akif/voice/pendingAction'
import { checkPlanLimit } from '@/lib/plan'

const ACTION_NAMES: ActionToolName[] = ['prepareScenarioSave', 'commitPendingAction']
// ...
if (ACTION_NAMES.includes(toolName as ActionToolName)) {
  const an = toolName as ActionToolName
  const v = validateActionArgs(an, args)
  if (!v.ok) return Response.json({ error: 'invalid_args', field: v.field, reason: v.reason })
  const adb = db as unknown as PrepareScenarioSaveDb & PendingActionDb
  if (an === 'prepareScenarioSave') {
    const r = await prepareScenarioSave(args as never, { db: adb, userId, sessionId, plan: { checkPlanLimit } })
    await audit.logVoiceTurn({ sessionId, tool: an, intent: null, estCostUsd: 0 })
    return Response.json(r)
  }
  const r = await commitPendingAction(adb, { pendingActionId: (args as { pendingActionId: string }).pendingActionId, userId, sessionId }, { checkPlanLimit })
  await audit.logVoiceTurn({ sessionId, tool: an, intent: null, estCostUsd: 0 })
  return Response.json(r.ok ? { kind: 'action_committed', ...r } : { error: r.reason, message: r.message })
}
```

(`userId` and `sessionId` are already in scope from the ownership guard / body.)

- [ ] **Step 6: `realtimeSession.ts`** — `import { ACTION_TOOL_DEFS } from '../gateway/actionTools'`; `tools: [...AKIF_TOOL_DEFS, ...ACTION_TOOL_DEFS]`.

- [ ] **Step 7: run all four test files + `tsc` + `npm run build`.**

- [ ] **Step 8: Commit**

```bash
git add src/app/api/akif/voice/action src/app/api/akif/voice/tool src/lib/ai/akif/voice/realtimeSession.ts src/app/api/akif/voice/tool/__tests__ src/lib/ai/akif/voice/__tests__/realtimeSession.test.ts
git commit -m "feat(akif-2-aksiyon): action route'ları /commit + /undo + voice/tool wiring"
```

---

### Task 7: `voiceToolBridge` — recognize action results

**Files:**
- Modify: `src/components/akif/voice/voiceToolBridge.ts`
- Modify: `src/components/akif/voice/__tests__/voiceToolBridge.test.ts`

**Interfaces:**
- Produces: `ToolBridgeResult` gains `pendingAction?: PendingActionSignal` where
  `type PendingActionSignal = { type: 'proposal'; pendingActionId: string; confirmCard: unknown; candidates?: { id: string; name: string }[] } | { type: 'committed'; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string } | { type: 'blocked' | 'error'; message: string }`

- [ ] **Step 1: Failing tests (append)**

```ts
it('prepareScenarioSave result → pendingAction proposal, not a card', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: { scenarioName: 'x', display: {}, projectRef: { newName: null } } }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.card).toBeNull()
  expect(r.pendingAction).toMatchObject({ type: 'proposal', pendingActionId: 'pa_1' })
  expect(r.outputForModel).toContain('pending_action')
})

it('needs_project_choice → proposal with candidates', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'needs_project_choice', pendingActionId: 'pa_1', candidates: [{ id: 'p1', name: 'A' }], scenarioName: 'x', display: {} }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toMatchObject({ type: 'proposal', candidates: [{ id: 'p1', name: 'A' }] })
})

it('blocked plan_limit → pendingAction blocked', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'blocked', reason: 'plan_limit', message: 'dolu' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toEqual({ type: 'blocked', message: 'dolu' })
})

it('action_committed → pendingAction committed', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'action_committed', ok: true, scenarioId: 'sc', projectId: 'p', projectName: 'T', undoToken: 'ut', undoUntil: 'z' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'commitPendingAction', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toMatchObject({ type: 'committed', undoToken: 'ut' })
})

it('ordinary ScenarioCard still works', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'contractor_offers', rows: [], defaultsUsed: [], assumptions: [], emsalNote: '' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'compareContractorOffers', args: {} }, { sessionId: 's', fetchFn })
  expect(r.card).not.toBeNull()
  expect(r.pendingAction).toBeUndefined()
})
```

- [ ] **Step 2-3: implement** — after `const data = await res.json()`, before the `data.kind === string` card check, add:

```ts
if (data && data.kind === 'pending_action') {
  return { card: null, pendingAction: { type: 'proposal', pendingActionId: data.pendingActionId as string, confirmCard: data.confirmCard }, outputForModel: JSON.stringify(data) }
}
if (data && data.kind === 'needs_project_choice') {
  return { card: null, pendingAction: { type: 'proposal', pendingActionId: data.pendingActionId as string, confirmCard: { scenarioName: data.scenarioName, display: data.display, projectRef: { newName: null } }, candidates: data.candidates as { id: string; name: string }[] }, outputForModel: JSON.stringify(data) }
}
if (data && data.kind === 'blocked') {
  return { card: null, pendingAction: { type: 'blocked', message: String(data.message ?? '') }, outputForModel: JSON.stringify(data) }
}
if (data && data.kind === 'action_committed') {
  return { card: null, pendingAction: { type: 'committed', scenarioId: data.scenarioId as string, projectId: data.projectId as string, projectName: data.projectName as string, undoToken: data.undoToken as string, undoUntil: data.undoUntil as string }, outputForModel: JSON.stringify(data) }
}
```

Keep the existing `ScenarioCard`/`TermCard` `kind` check after these (a `contractor_offers`/`apartment_sizes`/`term` kind still returns a `card`). `ToolBridgeResult` interface: add `pendingAction?: PendingActionSignal` + export the type.

- [ ] **Step 4-6: tests green, tsc 0, commit**

```bash
git commit -am "feat(akif-2-aksiyon): voiceToolBridge — pending/committed/blocked sinyalleri"
```

---

### Task 8: `useRealtimeVoice` — pendingAction state + confirm/cancel/undo

**Files:**
- Modify: `src/components/akif/voice/useRealtimeVoice.ts`
- Modify: `src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`

**Interfaces:**
- Consumes: `PendingActionSignal` (Task 7).
- Produces on the hook return:
  - `pendingAction: { phase: 'proposal' | 'saving' | 'saved' | 'error'; pendingActionId?: string; confirmCard?: unknown; candidates?: { id: string; name: string }[]; saved?: { projectName: string; undoToken: string; undoUntil: string }; errorMessage?: string } | null`
  - `confirmPendingAction(overrides?: { projectId?: string; projectName?: string; scenarioName?: string }): Promise<void>`
  - `cancelPendingAction(): void`
  - `undoLastAction(): Promise<void>`

- [ ] **Step 1: Failing tests (append)** — using the existing `FakePC`/`FakeDC` harness:

```ts
it('prepareScenarioSave tool result → pendingAction proposal', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) return { ok: true, json: async () => ({ token: 't', sessionId: 's1', model: 'm', sessionMaxSec: 600 }) } as never
    if (String(url).includes('/api/akif/voice/tool')) return { ok: true, json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: { scenarioName: 'Akif — %45', display: { arsaPayiPct: 45, satisFiyati: 5e6, toplamMaliyet: 28e5, sahibineDaire: 9, sahibineTL: 9e5 }, projectRef: { newName: null } } }) } as never
    return { ok: true, text: async () => 'answer' } as never
  })
  const { result } = renderHook(() => useRealtimeVoice({ rtcFactory: () => { pc = new FakePC(); return pc as never }, fetchFn: fetchSpy as never }))
  await act(async () => { await result.current.start() })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.dc.emit('message', { data: JSON.stringify({ type: 'response.function_call_arguments.done', call_id: 'c1', name: 'prepareScenarioSave', arguments: '{"arsaAlani":2000,"emsal":2,"muteahhitPayi":45}' }) })
  })
  await waitFor(() => expect(result.current.pendingAction?.phase).toBe('proposal'))
  expect(result.current.pendingAction?.pendingActionId).toBe('pa_1')
})

it('confirmPendingAction → POST commit, phase saved, feeds system msg', async () => {
  // set up as above, drive to proposal, then:
  // fetchSpy for /api/akif/voice/action/commit → { ok: true, projectName: 'Trabzon', undoToken: 'ut', undoUntil: <future ISO> }
  // await act(() => result.current.confirmPendingAction())
  // expect pendingAction.phase 'saved', saved.undoToken 'ut'
  // expect pc.dc.sent to contain a conversation.item.create with "onayladı" / "kaydedildi"
})

it('cancelPendingAction → pendingAction null + system msg "vazgeçti"', async () => { /* ... */ })

it('commit 409 → phase error with message', async () => { /* fetchSpy commit → { status: 409, json: { error: 'expired', message: 'Süre doldu.' } } */ })

it('reconnect drops an uncommitted pendingAction', async () => {
  // drive to proposal, then pc.setConnState('failed'), reconnect succeeds → expect result.current.pendingAction to be null
})
```

Fill in the elided bodies following the patterns already in the file (the Task 8/Akif-2.1 reconnect tests are the template for `setConnState` + `fetchSpy` routing).

- [ ] **Step 2-3: implement**

- Add `const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)` and a `pendingActionRef` synced via effect (needed by `confirmPendingAction`).
- In `handleEvent` `case 'tool_call'`: after `runVoiceToolCall`, if `r.pendingAction` is set, map it to state:
  - `type: 'proposal'` → `setPendingAction({ phase: 'proposal', pendingActionId, confirmCard, candidates })`
  - `type: 'committed'` → `setPendingAction({ phase: 'saved', saved: { projectName, undoToken, undoUntil } })`
  - `type: 'blocked'` / `'error'` → `setPendingAction({ phase: 'error', errorMessage })`
  - still send `buildFunctionCallOutputMessages(ev.callId, r.outputForModel)` as today.
- `confirmPendingAction(overrides)`: guard `pendingActionRef.current?.phase === 'proposal'`; `setPendingAction(p => ({ ...p!, phase: 'saving' }))`; `POST /api/akif/voice/action/commit` with `{ pendingActionId, sessionId: sessionIdRef.current, ...overrides }`; on `res.ok` → `setPendingAction({ phase: 'saved', saved: { projectName, undoToken, undoUntil } })` + `safeSend` system msg `"Kullanıcı kaydı onayladı; senaryo <projectName> projesine eklendi."`; on non-ok → `setPendingAction({ phase: 'error', errorMessage: body.message })` + system msg `"Kayıt yapılamadı: <message>."`.
- `cancelPendingAction()`: `setPendingAction(null)` + `safeSend` `"Kullanıcı kaydetmekten vazgeçti."`.
- `undoLastAction()`: guard `pendingActionRef.current?.saved`; `POST /api/akif/voice/action/undo` `{ undoToken }`; on ok → `setPendingAction(null)` + `safeSend` `"Kayıt geri alındı."`; on non-ok → leave the saved card, set a small error (or ignore — window likely closed).
- In `start()`'s reset block: `setPendingAction(null)`.
- In `attemptReconnect` (Akif-2.1): `setPendingAction(null)` before `establishConnection` (drop uncommitted/committed pending on reconnect); add a note to `resumeContextRef` text: `" Önceki kaydetme önerisi iptal oldu; kullanıcı isterse tekrar söylesin."` — append to `buildResumeContext` output OR set a flag; simplest is a one-line append in `attemptReconnect` after `buildResumeContext`.
- Return the four new members.

- [ ] **Step 4: run hook suite + broader akif + tsc + build.**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(akif-2-aksiyon): useRealtimeVoice pendingAction state + confirm/cancel/undo"
```

---

### Task 9: `AkifActionConfirmCard` + panel wiring

**Files:**
- Create: `src/components/akif/voice/AkifActionConfirmCard.tsx` + `.module.css`
- Modify: `src/components/akif/voice/AkifVoicePanel.tsx`
- Test: `src/components/akif/voice/__tests__/AkifActionConfirmCard.test.tsx`
- Modify: `src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx`

**Interfaces:**
- Consumes: the hook's `pendingAction` + `confirmPendingAction`/`cancelPendingAction`/`undoLastAction`.

- [ ] **Step 1: Failing tests**

`AkifActionConfirmCard.test.tsx`:

```ts
/** @jest-environment jsdom */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { AkifActionConfirmCard } from '../AkifActionConfirmCard'

const display = { arsaPayiPct: 45, sahibineDaire: 9, sahibineTL: 900000, toplamMaliyet: 2800000, satisFiyati: 5000000 }
const base = { phase: 'proposal' as const, pendingActionId: 'pa_1', confirmCard: { scenarioName: 'Akif — %45', display, projectRef: { newName: null } } }

it('proposal: shows the facts + Kaydet/Vazgeç', () => {
  render(<AkifActionConfirmCard pending={base} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText(/%45/)).toBeInTheDocument()
  expect(screen.getByText(/9 daire/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /vazgeç/i })).toBeInTheDocument()
})

it('new project (newName null): requires a name before Kaydet fires onConfirm with it', () => {
  const onConfirm = jest.fn()
  render(<AkifActionConfirmCard pending={base} onConfirm={onConfirm} onCancel={jest.fn()} onUndo={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).not.toHaveBeenCalled() // name empty
  fireEvent.change(screen.getByLabelText(/proje adı/i), { target: { value: 'Trabzon Arsam' } })
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).toHaveBeenCalledWith({ projectName: 'Trabzon Arsam', scenarioName: 'Akif — %45' })
})

it('candidates: radio list, Kaydet sends projectId', () => {
  const onConfirm = jest.fn()
  const p = { ...base, candidates: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] }
  render(<AkifActionConfirmCard pending={p} onConfirm={onConfirm} onCancel={jest.fn()} onUndo={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('B'))
  fireEvent.click(screen.getByRole('button', { name: /kaydet/i }))
  expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p2' }))
})

it('saved: shows project name + Geri Al, disabled after undoUntil', () => {
  const past = { phase: 'saved' as const, saved: { projectName: 'Trabzon', undoToken: 'ut', undoUntil: new Date(Date.now() - 1000).toISOString() } }
  render(<AkifActionConfirmCard pending={past} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText(/Trabzon/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /geri al/i })).toBeDisabled()
})

it('error: shows the message', () => {
  render(<AkifActionConfirmCard pending={{ phase: 'error', errorMessage: 'Süre doldu.' }} onConfirm={jest.fn()} onCancel={jest.fn()} onUndo={jest.fn()} />)
  expect(screen.getByText('Süre doldu.')).toBeInTheDocument()
})
```

- [ ] **Step 2-3: implement `AkifActionConfirmCard.tsx`**

A `'use client'` component. Props: `{ pending: PendingAction; onConfirm: (o) => void; onCancel: () => void; onUndo: () => void }`. Local state for the editable project-name input, scenario-name input, and selected candidate id. Render per `pending.phase`. Format numbers with `toLocaleString('tr-TR')`. Facts block: `Arsa payı %{arsaPayiPct} · Sahibine {sahibineDaire} daire · {sahibineTL} ₺ · Toplam maliyet {toplamMaliyet} ₺ · Satış {satisFiyati} ₺`. "Kaydet" builds the overrides object: `{ scenarioName }` always; `{ projectName }` if new-project name entered; `{ projectId }` if a candidate selected; disabled/no-op if new-project and name empty. CSS: match `AkifVoicePanel.module.css` tokens (reuse `#e5e5e7`/`#fff`/`#6e6e73` family — check the file), no `.mGlass`.

`AkifVoicePanel.tsx`: pull `pendingAction`, `confirmPendingAction`, `cancelPendingAction`, `undoLastAction` from the hook. When `v.pendingAction` is set, render `<AkifActionConfirmCard pending={v.pendingAction} onConfirm={v.confirmPendingAction} onCancel={v.cancelPendingAction} onUndo={v.undoLastAction} />` above the `styles.controls` block. Add one test to `AkifVoicePanel.test.tsx` (`hookState.pendingAction = { phase: 'proposal', ... }` → the card renders).

- [ ] **Step 4: panel + card tests green; full `npx jest`; `tsc` 0; `npm run build` clean.**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(akif-2-aksiyon): AkifActionConfirmCard + panel wiring"
```

---

### Task 10: Realtime prompt + human-smoke checklist

**Files:**
- Modify: `src/lib/ai/akif/voice/voiceRhythm.ts` (append an action block to `VOICE_RHYTHM_PROMPT`)
- Modify: `src/lib/ai/akif/voice/__tests__/voiceRhythm.test.ts` (assert the new rules present)
- Modify: `docs/akif/akif-2-insan-duman-kontrol-listesi.md`
- Modify: `docs/superpowers/specs/2026-09-10-akif-2-aksiyon-design.md` §10 note if the smoke wording changed

- [ ] **Step 1: Failing test (append to `voiceRhythm.test.ts`)**

```ts
it('VOICE_RHYTHM_PROMPT carries the save-action rules', () => {
  expect(VOICE_RHYTHM_PROMPT).toMatch(/prepareScenarioSave/)
  expect(VOICE_RHYTHM_PROMPT).toMatch(/commitPendingAction/)
  expect(VOICE_RHYTHM_PROMPT).toMatch(/onaylamadan|görmeden/i) // "don't claim saved before commit success"
})
```

- [ ] **Step 2-3: append to `VOICE_RHYTHM_PROMPT`** (before the closing backtick):

```
Kaydetme (KATI KURAL):
- Kaydetmeyi yalnız ekranda bir karşılaştırma sonucu VARSA teklif et.
- Kullanıcı "kaydet" derse: seçtiği TEK oranı `prepareScenarioSave` ile hazırla (bu YAZMAZ, ekranda onay kartı çıkar).
- Kartın sayılarını (arsa payı, sahibine düşen daire ve tutar, toplam maliyet) sesli oku ki kullanıcı doğrulayabilsin.
- Kullanıcının hangi projeye kaydedeceği belirsizse (birden çok proje) hangisini istediğini sor.
- Kullanıcı SÖZLÜ "evet/kaydet/tamam" derse `commitPendingAction` çağır. Kullanıcı onaylamadıysa ASLA çağırma.
- `commitPendingAction` başarı sonucunu GÖRMEDEN "kaydedildi" DEME. Hata dönerse nedeni sade söyle.
```

- [ ] **Step 4: human-smoke** — add to `docs/akif/akif-2-insan-duman-kontrol-listesi.md` (matching format):

```markdown
### Akif-2-Aksiyon (senaryo kaydet)
- [ ] Sesli "şu yüzde elliyi kaydet" → onay kartı doğru sayılarla çıkar (arsa payı, sahibine daire/tutar, toplam maliyet) → "Kaydet" → proje sayfasında `Scenario` görünür → 30sn içinde "Geri Al" onu siler
- [ ] Akif yüzdeyi yanlış duyar (ör. %15 yerine %50) → kart yanlış değeri gösterir → kullanıcı "Vazgeç" der, hiçbir şey kaydedilmez
- [ ] Hiç proje yok → Akif "hangi ada?" diye sorar → kart proje adı input'uyla çıkar → ad + Kaydet → yeni proje + senaryo birlikte oluşur; Geri Al ikisini de siler
- [ ] Buton yerine sesli "evet" ile commit → kaydedilir, Akif "kaydettim" der
- [ ] Birden çok proje → kart radio listesi → seçim + Kaydet → doğru projeye yazılır
- [ ] FREE planda 3 senaryo dolu → Akif "hakkın dolmuş" der, kart çıkmaz
- [ ] `npm run akif:voice-smoke` (gerçek key) → yeni tool şemaları (`prepareScenarioSave`, `commitPendingAction`) Realtime tarafından reddedilmiyor
```

- [ ] **Step 5: full `npx jest` + `tsc` + `npm run build`; record counts.**

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(akif-2-aksiyon): Realtime prompt kaydet kuralları + insan duman listesi"
```

---

## Self-Review

**1. Spec coverage:**

| Spec § | Task |
|---|---|
| §3 `AkifPendingAction` model | Task 1 |
| §4 `scenarioEngine` extract + `computeFullScenario` | Task 2 |
| §5 `prepareScenarioSave` (validate / resolve project 0-1-≥2-name / plan pre-check / pending write / sweep) | Task 3 |
| §5 action tool defs + validation, voice-only | Task 3 (defs/validation) + Task 6 (route wiring, `TOOL_NAMES`, `realtimeSession` compose) |
| §6 `commitPendingAction` (typed failures, plan re-check, nested new-project, undo fields) | Task 4 |
| §6 two entry points (button route + voice tool) | Task 6 |
| §7 undo (delete scenario + empty created project, single-use, window) | Task 5 + Task 6 (route) |
| §8 `AkifActionConfirmCard` (proposal/saved/error, editable names, candidates radio) | Task 9 |
| §8 `useRealtimeVoice` pendingAction + confirm/cancel/undo + system-msg feedback + reconnect drop | Task 8 |
| §8 Realtime prompt | Task 10 |
| §9 all test files | Tasks 2-10 |
| §9 human-smoke 7 items | Task 10 |
| §10 migration dev-only + smoke note | Task 1 + Task 10 |

No gaps.

**2. Placeholder scan:** Task 8 Step 1 has elided test bodies with explicit "fill following the patterns in the file / the Akif-2.1 reconnect tests are the template" — acceptable (the assertions and fetch-mock shapes are stated; the harness boilerplate is identical to existing tests in the same file). Task 5 / Task 6 carry concrete "verify X exists, else drop Y and note it" fallbacks (StudioScenario.projectId; ValidateResult export). No "TBD"/"add error handling"/"similar to Task N without code".

**3. Type consistency:**
- `ScenarioFields` / `ScenarioDisplay` — defined Task 2, consumed Task 3 (`SaveScenarioPayload`), Task 4 (`toScenarioData`). Field names match the Scenario-model map in the Reference section.
- `SaveScenarioPayload` — Task 3 defines, Task 4 imports (`row.payload as SaveScenarioPayload`).
- `PrepareResult` kinds (`pending_action` / `needs_project_choice` / `blocked`) — Task 3 produces, Task 7 `voiceToolBridge` branches on the same `data.kind` strings, Task 8 maps `PendingActionSignal` → hook state.
- `CommitResult` reasons (`unknown`/`forbidden`/`already_consumed`/`expired`/`plan_limit`/`needs_project_name`) — Task 4 defines, Task 6 route maps `!r.ok` → 409 `{ error: r.reason }`, Task 8 surfaces `body.message`.
- `checkVoiceSessionOwner` — Akif-2.1 export, returns `{ ok: true; status } | { ok: false; code }`; Task 6 commit route branches `!owner.ok → 403 { error: owner.code }`. Consistent with Akif-2.1's `/usage`/`/tool` usage.
- `commitPendingAction` signature identical in Task 4 (def), Task 6 (route call), Task 6 (tool branch call — note: tool branch passes NO `overrides`, matching spec §6 "ses alan düzenleyemez").
- `PendingActionSignal` — Task 7 defines + exports, Task 8 consumes.
- Hook return additions (`pendingAction`, `confirmPendingAction`, `cancelPendingAction`, `undoLastAction`) — Task 8 produces, Task 9 consumes (card props + panel).
- `undoAction` db shape (Task 5) extends `PendingActionDb` (Task 4) with `scenario.delete/count`, `project.delete`, `studioScenario.count` — Task 6 undo route casts `prisma` to the union.

Fixed inline: Task 4's `PendingActionDb` originally lacked `findFirst` for undo; added it as optional so Task 5's `undoAction` (which needs `findFirst` by `undoToken`) type-checks against the same interface.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-akif-2-aksiyon.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks.
2. **Inline Execution** — tasks in this session via executing-plans, batched with checkpoints.

Which approach?
