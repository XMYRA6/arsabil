# Akif-3 (Arsa Dosyası — Kalıcı Hafıza) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Akif remember, across separate conversations, what it has learned about a user's specific arsa/project — without a raw conversation transcript — by attaching a short, model-maintained summary ("Arsa Dosyası") to the existing `Project` record, that a user can view and clear.

**Architecture:** One new nullable text column on `Project` (`akifMemory`). The existing structured `/api/akif/turn` response gains one more field, `memory_updates: string | null`, that the model fills with the FULL replacement summary when it learns something new (or `null` otherwise) — no extra LLM call. The route reads the current file into the system prompt (via a new prompt layer) before the turn and writes the model's replacement back after, only when a `projectId` the caller actually owns was supplied. Anonymous/no-project chat is untouched — every new code path is additive and only triggers when `projectId` is present.

**Tech Stack:** Next.js 16 App Router (route handlers, `runtime='nodejs'`), Prisma + PostgreSQL, OpenAI structured outputs (`json_schema`, strict), React 19 + `next-auth/react` (`useSession`), Jest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-15-akif-3-arsa-dosyasi-design.md`

## Global Constraints

- Branch `codex/professional-ui-and-land-cost`; **no push/deploy** — migration is dev-only (`prisma migrate deploy` against the dev DB), joins the unapplied Akif batch (see spec §8).
- Migrations are **hand-written** SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` (reference: `20260910120100_add_akif_pending_action`).
- `AkifTurn`'s JSON schema is `strict:true` — **every key in `properties` must also be in `required`** (nullable fields use `type: [X, 'null']` instead of being omitted from `required`). `contract.test.ts`'s `AKIF_TURN_JSON_SCHEMA` test already asserts `required` (sorted) equals `Object.keys(properties)` (sorted) — adding a field to both keeps that assertion green with no test change needed there.
- Anonymous/no-`projectId` Akif-1 text chat **must not change behavior at all**. Every task's tests must include an explicit regression check: existing calls/props/output are byte-identical when the new optional field is absent.
- Ownership checks use the project's own existing pattern: `findFirst({ where: { id, userId } })` for a scoped read (matches `src/app/api/projects/[id]/scenarios/route.ts`), `updateMany({ where: { id, userId } })` for a scoped write with a `count` check (matches Akif-2-Aksiyon's TOCTOU-safe writes).
- An invalid/unowned `projectId` on `POST /api/akif/turn` is **silently ignored** (200, memory-less turn) — never a 403/400, so a stale client-side selection never breaks the chat.
- Route handlers import `prisma` directly (`@/lib/prisma`) for the new `project.*` calls — this route already does that for the DI-narrowed audit/tool path (`prisma as unknown as AuditDb & DispatchDeps['db']`); the new calls use the real client, matching `src/app/api/projects/route.ts`'s existing style.
- `MAX_MEMORY_CHARS = 2000` — server-side hard cap, applied only when writing `akifMemory` (the model is prompted to self-consolidate; this is a safety net, not the primary control).
- Turkish for code comments and UI copy, matching surrounding files.
- Every task ends green: `npx tsc --noEmit` 0 errors, the task's jest files pass, and (route/React tasks) `npm run build` clean. `public/sw.js` regenerates on build — never stage it.

## Reference: exact current shapes (verified against current code)

- `Project` model (`prisma/schema.prisma:218-227`): `id, name, description?, userId, createdAt, updatedAt, user, scenarios[]`.
- `AkifTurn` (`src/lib/ai/akif/contract.ts`): `intent, speech, state, facts_used, assumptions, missing_fields, tool_result?, needs_confirmation?, risk_level`. `AKIF_TURN_JSON_SCHEMA` strict, `additionalProperties:false`. `parseAkifTurn(raw): AkifTurn | null`.
- `assembleSystemPrompt(ctx: { hasHistory: boolean }): string` (`src/lib/ai/akif/prompts/assemble.ts`) — joins 7 fixed `LAYERS` with `'\n\n---\n\n'`, conditionally appends `FIRST_MESSAGE_NOTE`.
- `runAkifTurn(input: RunAkifTurnInput, deps: RunAkifTurnDeps): Promise<AkifTurn>` (`src/lib/ai/akif/orchestrator.ts`) — `RunAkifTurnInput = { conversationId, history, userMessage }`. Pure/DI — never touches Prisma.
- `POST /api/akif/turn` (`src/app/api/akif/turn/route.ts`) — body `{ conversationId, history, userMessage }`, no `getServerSession` call today (anonymous-capable). Rate-limit → body validation → env guard → monthly budget guard → OpenAI client → `runAkifTurn` → JSON response.
- `GET /api/projects` (`src/app/api/projects/route.ts`) — session-gated, returns `{ projects: Project[] }` (each with `scenarios`, `_count`).
- `src/app/api/projects/[id]/scenarios/route.ts` — the project's own ownership pattern: `prisma.project.findFirst({ where: { id: projectId, userId } })`, `params: Promise<{ id: string }>` (Next 16 async params).
- `/akif` page (`src/app/akif/page.tsx`) — client component, `conversationId`/`entries`/`pending`/`mode` state, `send(text)` POSTs `{ conversationId, history, userMessage }`.
- Dashboard Projelerim (`src/app/dashboard/projects/page.tsx`) — client component, fetches `GET /api/projects` on mount when `useSession().status === 'authenticated'`, renders a card per project with `_count`/`scenarios`/`description`.

---

### Task 1: Prisma — `Project.akifMemory` + dev migration

**Files:**
- Modify: `prisma/schema.prisma:218-227` (`Project` model)
- Create: `prisma/migrations/20260915090000_add_project_akif_memory/migration.sql`

**Interfaces:**
- Produces: `Project.akifMemory` column, `String?` (nullable `TEXT`), no default. Later tasks read/write it via the real Prisma client (`prisma.project.findFirst(...)`, `prisma.project.updateMany(...)`).

- [ ] **Step 1: Add the field**

In `prisma/schema.prisma`, inside `model Project { ... }`, add `akifMemory` after `updatedAt` and before the `user` relation line:

```prisma
model Project {
  id          String     @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  akifMemory  String?
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarios   Scenario[]
}
```

- [ ] **Step 2: Migration SQL**

Create `prisma/migrations/20260915090000_add_project_akif_memory/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "akifMemory" TEXT;
```

- [ ] **Step 3: Apply to dev DB**

Run: `npm run dev:db` (if the container isn't already up), then `npx prisma migrate deploy`
Expected: 1 migration applied. `npx prisma migrate status` → up to date.

- [ ] **Step 4: Regenerate the Prisma Client**

Run: `npx prisma generate`
Expected: succeeds, `Project` type now includes `akifMemory: string | null`. (Windows note: if this fails with `EPERM` on the `.prisma/client` DLL, stop any running `npm run dev` / `jest --watch` process holding the file lock, then retry.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors (this is a pure additive nullable column — nothing currently references it).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260915090000_add_project_akif_memory
git commit -m "feat(akif-3): Project.akifMemory alanı + dev migration"
```

---

### Task 2: `contract.ts` — `memory_updates` field

**Files:**
- Modify: `src/lib/ai/akif/contract.ts`
- Test: `src/lib/ai/akif/__tests__/contract.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AkifTurn.memory_updates?: string` (present only when the model returned a non-null string). `AKIF_TURN_JSON_SCHEMA.properties.memory_updates = { type: ['string', 'null'] }`, added to `required`. `parseAkifTurn` sets `turn.memory_updates` iff `typeof raw.memory_updates === 'string'`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ai/akif/__tests__/contract.test.ts`, add inside `describe('parseAkifTurn', ...)`:

```ts
  it('memory_updates string ise korunur', () => {
    const r = parseAkifTurn({ ...valid, memory_updates: 'Bütçe üst sınırı 5M TL.' })
    expect(r!.memory_updates).toBe('Bütçe üst sınırı 5M TL.')
  })
  it('memory_updates null ise turn nesnesine hiç eklenmez', () => {
    const r = parseAkifTurn({ ...valid, memory_updates: null })
    expect(r!.memory_updates).toBeUndefined()
  })
  it('memory_updates alanı hiç yoksa turn nesnesine eklenmez', () => {
    const r = parseAkifTurn(valid)
    expect(r!.memory_updates).toBeUndefined()
  })
```

Add inside `describe('AKIF_TURN_JSON_SCHEMA', ...)`:

```ts
  it('memory_updates alanı string|null olarak tanımlı ve required listesinde', () => {
    const props = (AKIF_TURN_JSON_SCHEMA as any).properties
    expect(props.memory_updates).toEqual({ type: ['string', 'null'] })
    const req: string[] = (AKIF_TURN_JSON_SCHEMA as any).required
    expect(req).toContain('memory_updates')
  })
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/ai/akif/__tests__/contract.test.ts`
Expected: the 4 new tests FAIL (`memory_updates` undefined/schema key missing); the pre-existing tests still PASS.

- [ ] **Step 3: Implement**

In `src/lib/ai/akif/contract.ts`:

1. Add the field to the interface, after `risk_level`:

```ts
export interface AkifTurn {
  intent: AkifIntent
  speech: string
  state: AkifState
  facts_used: string[]
  assumptions: string[]
  missing_fields: string[]
  tool_result?: ToolResultCard
  needs_confirmation?: { field: string; heard: string; question: string }
  risk_level: 'low' | 'medium' | 'high'
  memory_updates?: string
}
```

2. Add to `AKIF_TURN_JSON_SCHEMA.required` (append `'memory_updates'` to the array) and to `properties`:

```ts
  required: [
    'intent',
    'speech',
    'state',
    'facts_used',
    'assumptions',
    'missing_fields',
    'risk_level',
    'needs_confirmation',
    'memory_updates',
  ],
  properties: {
    intent: { type: 'string', enum: [...INTENTS] },
    speech: { type: 'string' },
    state: { type: 'string', enum: [...STATES] },
    facts_used: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    missing_fields: { type: 'array', items: { type: 'string' } },
    risk_level: { type: 'string', enum: [...RISK_LEVELS] },
    needs_confirmation: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['field', 'heard', 'question'],
      properties: {
        field: { type: 'string' },
        heard: { type: 'string' },
        question: { type: 'string' },
      },
    },
    memory_updates: { type: ['string', 'null'] },
  },
```

3. In `parseAkifTurn`, right after the `needs_confirmation` block and before `// tool_result: kasıtlı olarak yok sayılır.`, add:

```ts
  if (typeof r.memory_updates === 'string') {
    turn.memory_updates = r.memory_updates
  }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx jest src/lib/ai/akif/__tests__/contract.test.ts`
Expected: all tests PASS, including the pre-existing `required.sort() === Object.keys(properties).sort()` check.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/contract.ts src/lib/ai/akif/__tests__/contract.test.ts
git commit -m "feat(akif-3): AkifTurn sözleşmesine memory_updates alanı"
```

---

### Task 3: `memoryPolicy.ts` prompt layer + `assemble.ts`

**Files:**
- Create: `src/lib/ai/akif/prompts/memoryPolicy.ts`
- Modify: `src/lib/ai/akif/prompts/assemble.ts`
- Test: `src/lib/ai/akif/__tests__/prompts.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MEMORY_POLICY_PROMPT: string`. `PromptContext.projectMemory?: string | null` (new, optional). `assembleSystemPrompt(ctx)`: when `ctx.projectMemory === undefined`, output is **byte-identical** to today; when defined (even `null`), appends `MEMORY_POLICY_PROMPT`, and additionally appends `` `Bu proje hakkında bildiklerin:\n${ctx.projectMemory}` `` when `ctx.projectMemory` is a non-empty string.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ai/akif/__tests__/prompts.test.ts`, add the import at the top:

```ts
import { MEMORY_POLICY_PROMPT } from '../prompts/memoryPolicy'
```

Add a new `describe` block at the end of the file:

```ts
describe('MEMORY_POLICY_PROMPT (Akif-3)', () => {
  it('dolu bir string', () => {
    expect(typeof MEMORY_POLICY_PROMPT).toBe('string')
    expect(MEMORY_POLICY_PROMPT.trim().length).toBeGreaterThan(80)
  })
})

describe('assembleSystemPrompt — Arsa Dosyası (Akif-3)', () => {
  it('projectMemory verilmezse çıktı MEVCUT davranışla birebir aynı (regresyon kilidi)', () => {
    const out = assembleSystemPrompt({ hasHistory: true })
    expect(out).not.toContain('ARSA DOSYASI')
    expect(out).not.toContain('Bu proje hakkında bildiklerin')
  })

  it('projectMemory: null → politika katmanı var, dinamik blok yok', () => {
    const out = assembleSystemPrompt({ hasHistory: true, projectMemory: null })
    expect(out).toContain('ARSA DOSYASI')
    expect(out).not.toContain('Bu proje hakkında bildiklerin')
  })

  it('projectMemory: dolu metin → politika katmanı + dosya içeriği eklenir', () => {
    const out = assembleSystemPrompt({
      hasHistory: true,
      projectMemory: 'Bütçe üst sınırı 5M TL.',
    })
    expect(out).toContain('ARSA DOSYASI')
    expect(out).toContain('Bu proje hakkında bildiklerin:')
    expect(out).toContain('Bütçe üst sınırı 5M TL.')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/ai/akif/__tests__/prompts.test.ts`
Expected: FAIL — `Cannot find module '../prompts/memoryPolicy'` (the 3 new `assembleSystemPrompt` tests would also fail once the import resolves, since the behavior doesn't exist yet).

- [ ] **Step 3: Implement `memoryPolicy.ts`**

Create `src/lib/ai/akif/prompts/memoryPolicy.ts`:

```ts
// Akif-3 — Arsa Dosyası (kalıcı hafıza) prompt politikası.
// Yalnızca bir proje aktifken (assemble.ts tarafından) sisteme eklenir.

export const MEMORY_POLICY_PROMPT = `
ARSA DOSYASI POLİTİKASI:
Bu konuşmada bir Arsa Dosyası aktif olabilir. Aşağıda "Bu proje hakkında bildiklerin:" başlığıyla bir blok görüyorsan dosya doludur; görmüyorsan dosya boştur ama YİNE DE AKTİFTİR.
- Kullanıcı hakkında (bütçe üst sınırı, tercih ettiği daire büyüklüğü, risk toleransı, arsa/parsel detayı gibi) yeni ve somut bir bilgi öğrendiğinde, memory_updates alanına dosyanın GÜNCEL TAM halini yaz (kısa, madde veya kısa paragraf, ~150 kelimeyi geçme). Var olan dosyayı da dikkate alıp kendin konsolide et, aynı bilgiyi tekrar etme.
- Hiçbir yeni veya değişen bilgi yoksa memory_updates alanını null bırak.
- Bu blok hiç görünmüyorsa (Arsa Dosyası aktif değilse) memory_updates HER ZAMAN null olmalı.
`.trim()
```

- [ ] **Step 4: Implement `assemble.ts` changes**

In `src/lib/ai/akif/prompts/assemble.ts`, add the import:

```ts
import { MEMORY_POLICY_PROMPT } from './memoryPolicy'
```

Extend the interface:

```ts
export interface PromptContext {
  hasHistory: boolean
  projectMemory?: string | null
}
```

Update the function body:

```ts
export function assembleSystemPrompt(ctx: PromptContext): string {
  const parts = LAYERS.map((layer) => layer.trim())
  if (ctx.projectMemory !== undefined) {
    parts.push(MEMORY_POLICY_PROMPT)
    if (ctx.projectMemory) {
      parts.push(`Bu proje hakkında bildiklerin:\n${ctx.projectMemory}`)
    }
  }
  if (!ctx.hasHistory) {
    parts.push(FIRST_MESSAGE_NOTE)
  }
  return parts.join(SEPARATOR)
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx jest src/lib/ai/akif/__tests__/prompts.test.ts`
Expected: all PASS, including the pre-existing `assembleSystemPrompt` tests (they call it with `{ hasHistory: ... }` only, so `ctx.projectMemory` is `undefined` and the new branch never triggers).

- [ ] **Step 6: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/akif/prompts/memoryPolicy.ts src/lib/ai/akif/prompts/assemble.ts src/lib/ai/akif/__tests__/prompts.test.ts
git commit -m "feat(akif-3): memoryPolicy prompt katmanı + assembleSystemPrompt projectMemory"
```

---

### Task 4: Orchestrator — `projectMemory` passthrough

**Files:**
- Modify: `src/lib/ai/akif/orchestrator.ts`
- Test: `src/lib/ai/akif/__tests__/orchestrator.test.ts`

**Interfaces:**
- Consumes: `assembleSystemPrompt(ctx: { hasHistory: boolean; projectMemory?: string | null })` (Task 3).
- Produces: `RunAkifTurnInput.projectMemory?: string | null` (new, optional). No other signature changes; `runAkifTurn` still never touches Prisma.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ai/akif/__tests__/orchestrator.test.ts`, add inside `describe('runAkifTurn', ...)`, after test `(h)`:

```ts
  it('(i) projectMemory verilirse sistem promptuna eklenir', async () => {
    const { deps } = makeDeps()
    await runAkifTurn({ ...INPUT, projectMemory: 'Bütçe üst sınırı 5M TL.' }, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{
      role: string
      content: string
    }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).toContain('Bütçe üst sınırı 5M TL.')
  })

  it('(j) projectMemory verilmezse sistem promptunda Arsa Dosyası bloğu yok (regresyon)', async () => {
    const { deps } = makeDeps()
    await runAkifTurn(INPUT, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{
      role: string
      content: string
    }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).not.toContain('Bu proje hakkında bildiklerin')
  })
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/ai/akif/__tests__/orchestrator.test.ts`
Expected: `(i)` FAILS (system prompt doesn't contain the memory text — `projectMemory` isn't wired yet); `(j)` PASSES already (nothing to regress yet) — that's fine, it becomes the permanent regression guard.

- [ ] **Step 3: Implement**

In `src/lib/ai/akif/orchestrator.ts`:

1. Extend the input interface:

```ts
export interface RunAkifTurnInput {
  conversationId: string
  history: AkifMessage[]
  userMessage: string
  projectMemory?: string | null
}
```

2. Update the destructure and the `assembleSystemPrompt` call:

```ts
  const { conversationId, history, userMessage, projectMemory } = input
  const turnNumber = Math.floor(history.length / 2) + 1

  const systemPrompt = assembleSystemPrompt({
    hasHistory: history.length > 0,
    projectMemory,
  })
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx jest src/lib/ai/akif/__tests__/orchestrator.test.ts`
Expected: all PASS (including `(a)`-`(h)`, unaffected since they don't pass `projectMemory`).

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/orchestrator.ts src/lib/ai/akif/__tests__/orchestrator.test.ts
git commit -m "feat(akif-3): orchestrator projectMemory'i sistem promptuna iletir"
```

---

### Task 5: `/api/akif/turn` route — `projectId` + ownership + Arsa Dosyası read/write

**Files:**
- Modify: `src/app/api/akif/turn/route.ts`
- Test: `src/app/api/akif/turn/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `runAkifTurn(input: RunAkifTurnInput, deps)` (Task 4, `projectMemory` field). `prisma.project.findFirst({ where, select })`, `prisma.project.updateMany({ where, data })`.
- Produces: request body gains optional `projectId: string`. No response shape change (still the raw `AkifTurn` JSON — `memory_updates` rides along if present, harmless for the client).

- [ ] **Step 1: Write the failing tests**

In `src/app/api/akif/turn/__tests__/route.test.ts`, add near the top (after the other `const ...Mock = jest.fn()` lines):

```ts
const getServerSessionMock = jest.fn()
const projectFindFirstMock = jest.fn()
const projectUpdateManyMock = jest.fn()
```

Replace the `jest.mock('@/lib/prisma', ...)` line with:

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    __brand: 'prisma',
    project: {
      findFirst: (...a: unknown[]) => projectFindFirstMock(...a),
      updateMany: (...a: unknown[]) => projectUpdateManyMock(...a),
    },
  },
}))
jest.mock('next-auth/next', () => ({
  getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
```

In the top-level `beforeEach`, add:

```ts
    getServerSessionMock.mockReset().mockResolvedValue(null)
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
```

Add a new `describe` block at the end of the file (before the final closing of the outer `describe`, i.e. as a sibling block after it):

```ts
describe('POST /api/akif/turn — Arsa Dosyası (Akif-3)', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    runAkifTurnMock.mockReset().mockResolvedValue(TURN)
    readAkifEnvMock
      .mockReset()
      .mockReturnValue({ apiKey: 'sk-x', model: 'gpt-4o-mini', maxTurnTokens: 6000, monthlyBudgetUsd: 20 })
    createAkifModelMock.mockReset().mockReturnValue({ chatWithTools: jest.fn(), finalStructured: jest.fn() })
    createAuditLoggerMock
      .mockReset()
      .mockReturnValue({ logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) })
    checkMonthlyBudgetMock.mockReset().mockResolvedValue({ ok: true, spent: 0 })
    checkConversationBudgetMock.mockReset().mockReturnValue({ ok: true })
    getServerSessionMock.mockReset().mockResolvedValue(null)
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
  })

  it('projectId gönderilmezse oturum/proje sorgusu hiç yapılmaz', async () => {
    await POST(req(validBody))
    expect(getServerSessionMock).not.toHaveBeenCalled()
    expect(projectFindFirstMock).not.toHaveBeenCalled()
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
  })

  it('projectId var ama oturum yok -> sessizce yok sayılır, 200 döner', async () => {
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(projectFindFirstMock).not.toHaveBeenCalled()
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
  })

  it('projectId var, oturum var, proje bulunamaz (başkasının projesi) -> sessizce yok sayılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue(null)
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(projectFindFirstMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      select: { akifMemory: true },
    })
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
    expect(projectUpdateManyMock).not.toHaveBeenCalled()
  })

  it('projectId geçerli -> akifMemory projectMemory olarak orchestrator\'a geçirilir', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: 'Bütçe üst sınırı 5M TL.' })
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBe('Bütçe üst sınırı 5M TL.')
  })

  it('turn.memory_updates yoksa (undefined) project.updateMany hiç çağrılmaz', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    runAkifTurnMock.mockResolvedValue({ ...TURN })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).not.toHaveBeenCalled()
  })

  it('turn.memory_updates 2000 karakterden uzunsa kırpılarak yazılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    const longText = 'x'.repeat(2500)
    runAkifTurnMock.mockResolvedValue({ ...TURN, memory_updates: longText })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      data: { akifMemory: 'x'.repeat(2000) },
    })
  })

  it('turn.memory_updates boşluk-only ise akifMemory null yazılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: 'eski özet' })
    runAkifTurnMock.mockResolvedValue({ ...TURN, memory_updates: '   ' })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      data: { akifMemory: null },
    })
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/app/api/akif/turn/__tests__/route.test.ts`
Expected: the original test `'gecerli POST -> 200, ...'` still PASSES (its `toEqual` ignores the not-yet-existing `projectId` field); all 7 new tests in the Akif-3 `describe` block FAIL (no session/project lookups happen yet, `projectMemory` is never set).

- [ ] **Step 3: Implement**

Replace `src/app/api/akif/turn/route.ts` in full:

```ts
// Akif-1 — /api/akif/turn: tek LLM danışma turu.
// Akış: rate-limit → gövde doğrulama → (opsiyonel) Arsa Dosyası sahiplik
// doğrulama (Akif-3) → env guard → aylık bütçe guard → OpenAI client +
// orchestrator bağımlılıkları → runAkifTurn → (opsiyonel) Arsa Dosyası
// güncelle → AkifTurn JSON.
//
// `readAkifEnv` / `new OpenAI(...)` YALNIZCA handler İÇİNDE çağrılır —
// modül kapsamında değil — böylece `npm run build` OPENAI_API_KEY istemez.
import OpenAI from 'openai'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { runAkifTurn } from '@/lib/ai/akif/orchestrator'
import { createAkifModel, readAkifEnv } from '@/lib/ai/akif/openaiClient'
import { createAuditLogger, type AuditDb } from '@/lib/ai/akif/audit'
import { checkConversationBudget, checkMonthlyBudget } from '@/lib/ai/akif/costGuard'
import {
  dispatchTool,
  validateArgs,
  type ToolName,
  type DispatchDeps,
} from '@/lib/ai/akif/gateway/toolRegistry'
import type { AkifMessage } from '@/lib/ai/akif/contract'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_HISTORY = 40
const MAX_MEMORY_CHARS = 2000

function isValidHistory(v: unknown): v is AkifMessage[] {
  if (!Array.isArray(v) || v.length > MAX_HISTORY) return false
  return v.every((m) => {
    if (m == null || typeof m !== 'object') return false
    const msg = m as { role?: unknown; content?: unknown }
    return (msg.role === 'user' || msg.role === 'akif') && typeof msg.content === 'string'
  })
}

export async function POST(req: Request) {
  // 1. Rate limit — IP başına.
  const rl = checkRateLimit('akif:ip:' + getClientIp(req), RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  // 2. Gövde parse + doğrulama.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (body == null || typeof body !== 'object') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const { conversationId, history, userMessage, projectId } = body as {
    conversationId?: unknown
    history?: unknown
    userMessage?: unknown
    projectId?: unknown
  }
  if (
    typeof conversationId !== 'string' ||
    conversationId.length === 0 ||
    !isValidHistory(history) ||
    typeof userMessage !== 'string' ||
    userMessage.length < 1 ||
    userMessage.length > 2000
  ) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // 3. Arsa Dosyası (Akif-3) — projectId gönderildiyse sahiplik doğrula.
  // Sahipsiz/geçersiz projectId İSTEĞİ REDDETMEZ, sessizce yok sayılır —
  // mevcut anonim/projesiz akışla tutarlı davranış. userId'yi burada bir kez
  // sabitliyoruz — adım 8'de updateMany'nin where'i için tekrar oturum
  // sorgulamaya gerek kalmasın diye.
  let validatedProjectId: string | undefined
  let validatedUserId: string | undefined
  let projectMemory: string | null | undefined
  if (typeof projectId === 'string' && projectId.length > 0) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { akifMemory: true },
      })
      if (project) {
        validatedProjectId = projectId
        validatedUserId = session.user.id
        projectMemory = project.akifMemory ?? null
      }
    }
  }

  // 4. Ortam — OPENAI_API_KEY yoksa Akif kapalı.
  let env
  try {
    env = readAkifEnv()
  } catch {
    return Response.json({ error: 'akif_unavailable' }, { status: 503 })
  }

  // 5. Aylık bütçe guard.
  // Prisma client, audit/gateway'in dar DI arayüzlerine yapısal olarak uyar;
  // Prisma'nın aggregate imzasındaki opsiyonel `_sum` alanları yüzünden tsc
  // eşleşmiyor — tek noktada daraltıyoruz.
  const db = prisma as unknown as AuditDb & DispatchDeps['db']
  const audit = createAuditLogger(db)
  const mb = await checkMonthlyBudget({
    monthSpendUsd: audit.monthSpendUsd,
    budgetUsd: env.monthlyBudgetUsd,
    now: () => new Date(),
  })
  if (!mb.ok) {
    return Response.json({ error: 'akif_unavailable', reason: 'monthly_budget' }, { status: 503 })
  }

  // 6. OpenAI client + model sarmalayıcı.
  const openai = new OpenAI({ apiKey: env.apiKey })
  const model = createAkifModel({ client: openai, model: env.model })

  // 7. Tur akışı.
  try {
    const turn = await runAkifTurn(
      { conversationId, history, userMessage, projectMemory },
      {
        model,
        modelName: env.model,
        dispatch: (n: ToolName, a: unknown) => dispatchTool(n, a, { db }),
        validateArgs,
        audit,
        checkConversationBudget: (m: { content: string }[]) =>
          checkConversationBudget(m, env.maxTurnTokens),
        now: () => new Date(),
      },
    )

    // 8. Arsa Dosyası güncelle (Akif-3) — model yeni bir özet önerdiyse.
    if (validatedProjectId && validatedUserId && turn.memory_updates != null) {
      const trimmed = turn.memory_updates.trim()
      await prisma.project.updateMany({
        where: { id: validatedProjectId, userId: validatedUserId },
        data: { akifMemory: trimmed.length > 0 ? trimmed.slice(0, MAX_MEMORY_CHARS) : null },
      })
    }

    return Response.json(turn)
  } catch (e) {
    console.error('[akif] turn', e)
    return Response.json({ error: 'akif_error' }, { status: 502 })
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx jest src/app/api/akif/turn/__tests__/route.test.ts`
Expected: all tests PASS. Also add `expect(getServerSessionMock).toHaveBeenCalledTimes(1)` to the "projectId geçerli" test (from Step 1) — this locks in that `getServerSession` is called exactly once per request (the `validatedUserId` capture in Step 3 exists precisely to avoid a second call in Step 8).

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: `npm run build`** → clean (route handler change).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/akif/turn/route.ts src/app/api/akif/turn/__tests__/route.test.ts
git commit -m "feat(akif-3): /api/akif/turn projectId + Arsa Dosyası oku/yaz"
```

---

### Task 6: `PATCH /api/projects/[id]` — Arsa Dosyası temizle

**Files:**
- Create: `src/app/api/projects/[id]/route.ts`
- Test: `src/app/api/projects/[id]/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `prisma.project.updateMany({ where, data }): Promise<{ count: number }>`.
- Produces: `PATCH` handler, body `{ action: 'clear_memory' }` → `200 { ok: true }` / `400` (bad action) / `403` (no session) / `404` (not owned).

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/projects/[id]/__tests__/route.test.ts`:

```ts
const getServerSessionMock = jest.fn()
const updateManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        project: {
            updateMany: (...args: unknown[]) => updateManyMock(...args),
        },
    },
}))

import { PATCH } from '../route'

function patchReq(body: unknown) {
    return new Request('http://localhost/api/projects/p1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
}

function ctx(id: string) {
    return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/projects/[id]', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        updateManyMock.mockReset().mockResolvedValue({ count: 1 })
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(403)
        expect(updateManyMock).not.toHaveBeenCalled()
    })

    it('action clear_memory değilse 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await PATCH(patchReq({ action: 'delete_everything' }), ctx('p1'))
        expect(res.status).toBe(400)
        expect(updateManyMock).not.toHaveBeenCalled()
    })

    it('sahiplik id+userId ile filtrelenir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(updateManyMock).toHaveBeenCalledWith({
            where: { id: 'p1', userId: 'u1' },
            data: { akifMemory: null },
        })
    })

    it('başkasının projesi (count:0) -> 404', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        updateManyMock.mockResolvedValue({ count: 0 })
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(404)
    })

    it('başarı -> 200 { ok: true }', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await PATCH(patchReq({ action: 'clear_memory' }), ctx('p1'))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
    })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/app/api/projects/\[id\]/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'` (file doesn't exist yet).

- [ ] **Step 3: Implement**

Create `src/app/api/projects/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — Arsa Dosyası'nı temizle (Akif-3). Tek desteklenen aksiyon: clear_memory.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const body = await req.json();
        if (body?.action !== 'clear_memory') {
            return NextResponse.json({ message: "Geçersiz aksiyon." }, { status: 400 });
        }

        const { id } = await params;
        const result = await prisma.project.updateMany({
            where: { id, userId: session.user.id },
            data: { akifMemory: null },
        });
        if (result.count === 0) {
            return NextResponse.json({ message: "Proje bulunamadı." }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Project memory clear error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/app/api/projects/\[id\]/__tests__/route.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: `npm run build`** → clean (new route added).

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/projects/[id]/route.ts" "src/app/api/projects/[id]/__tests__/route.test.ts"
git commit -m "feat(akif-3): PATCH /api/projects/[id] — Arsa Dosyası temizle"
```

---

### Task 7: `/akif` page — proje seçici

**Files:**
- Modify: `src/app/akif/page.tsx`
- Modify: `src/app/akif/page.module.css`
- Modify: `src/app/akif/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/projects` → `{ projects: { id: string; name: string; ... }[] }` (existing route, unchanged). `POST /api/akif/turn` body gains optional `projectId` (Task 5).
- Produces: no new exports; page-local `projectId` state included in the turn request body only when non-empty.

- [ ] **Step 1: Write the failing tests**

In `src/app/akif/page.test.tsx`:

1. Add near the top, after the existing `jest.mock('@/components/akif/voice/AkifVoicePanel', ...)`:

```ts
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
```

2. Add the import, after `import AkifPage from './page'`:

```ts
import { useSession } from 'next-auth/react'
```

3. Change the existing `beforeEach` to also default the session mock:

```ts
beforeEach(() => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => turn }) as jest.Mock
})
```

4. Add new tests at the end of the file:

```ts
it('oturum açıkken proje listesi çekilir ve seçici görünür', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/projects') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ projects: [{ id: 'p1', name: 'Trabzon Arsa' }] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => turn })
  })
  render(<AkifPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /proje seç/i })).toBeInTheDocument(),
  )
  expect(screen.getByText('Trabzon Arsa')).toBeInTheDocument()
})

it('proje seçilince sonraki istekte projectId gönderilir', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/projects') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ projects: [{ id: 'p1', name: 'Trabzon Arsa' }] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => turn })
  })
  render(<AkifPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /proje seç/i })).toBeInTheDocument(),
  )
  fireEvent.change(screen.getByRole('combobox', { name: /proje seç/i }), {
    target: { value: 'p1' },
  })
  sendText('merhaba')
  await waitFor(() => {
    const calls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => u === '/api/akif/turn')
    expect(calls.length).toBe(1)
  })
  const turnCall = (global.fetch as jest.Mock).mock.calls.find(([u]) => u === '/api/akif/turn')!
  const body = JSON.parse(turnCall[1].body)
  expect(body.projectId).toBe('p1')
})

it('oturum kapalıyken proje seçici görünmez, projectId hiç gönderilmez', async () => {
  ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
  render(<AkifPage />)
  expect(screen.queryByRole('combobox', { name: /proje seç/i })).not.toBeInTheDocument()
  sendText('merhaba')
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0))
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
  expect(body.projectId).toBeUndefined()
})
```

- [ ] **Step 2: Run tests, verify new ones fail**

Run: `npx jest src/app/akif/page.test.tsx`
Expected: the 3 new tests FAIL (no combobox exists yet); all pre-existing tests still PASS (they run with the new default `unauthenticated` mock, which produces no extra fetch calls, so nothing about their fetch-call indexing changes).

- [ ] **Step 3: Implement**

In `src/app/akif/page.tsx`:

1. Update imports:

```ts
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { AkifMessage, AkifTurn } from '@/lib/ai/akif/contract'
import { AkifChat, type AkifChatEntry } from '@/components/akif/AkifChat'
import { AkifVoicePanel } from '@/components/akif/voice/AkifVoicePanel'
import styles from './page.module.css'
```

2. Add a project option type, above `export default function AkifPage()`:

```ts
interface AkifProjectOption {
  id: string
  name: string
}
```

3. Inside the component, add state + effect, right after the existing `useState` calls:

```ts
  const { status } = useSession()
  const [projects, setProjects] = useState<AkifProjectOption[]>([])
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => {})
  }, [status])
```

4. In `send`, include `projectId` in the request body only when set:

```ts
      const res = await fetch('/api/akif/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          history,
          userMessage: text,
          ...(projectId ? { projectId } : {}),
        }),
      })
```

5. Render the selector inside `.headActions`, as the first child:

```tsx
        <div className={styles.headActions}>
          {mode === 'text' && status === 'authenticated' && projects.length > 0 && (
            <select
              className={styles.projectSelect}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Proje seç"
            >
              <option value="">Proje seçilmedi</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {mode === 'text' && (
            <button
              type="button"
              className={styles.voiceToggle}
              onClick={() => setMode('voice')}
            >
              🎙 Sesli konuş
            </button>
          )}
          {mode === 'text' && entries.length > 0 && (
            <button
              type="button"
              className={styles.reset}
              onClick={resetConversation}
              disabled={pending}
            >
              Yeni sohbet
            </button>
          )}
        </div>
```

6. In `src/app/akif/page.module.css`, add (matching the file's existing one-line-per-rule style):

```css
.projectSelect { padding: 5px 10px; border-radius: 999px; border: 1px solid var(--panel-border, #ddd); background: transparent; font-size: 13px; max-width: 180px; }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx jest src/app/akif/page.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: `npm run build`** → clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/akif/page.tsx src/app/akif/page.module.css src/app/akif/page.test.tsx
git commit -m "feat(akif-3): /akif sayfasına proje seçici"
```

---

### Task 8: Dashboard Projelerim — "Akif'in Hatırladıkları" + Temizle

**Files:**
- Modify: `src/app/dashboard/projects/page.tsx`
- Modify: `src/app/dashboard/dashboard.module.css`
- Create: `src/app/dashboard/projects/page.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/projects/[id]` (Task 6), body `{ action: 'clear_memory' }` → `{ ok: true }`.
- Produces: no new exports; local `Project.akifMemory?: string | null` field, local `handleClearMemory(project)` handler.

- [ ] **Step 1: Write the failing tests**

Create `src/app/dashboard/projects/page.test.tsx`:

```tsx
/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
import { useSession } from 'next-auth/react'

const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock('react-hot-toast', () => ({
    toast: {
        success: (...a: unknown[]) => toastSuccess(...a),
        error: (...a: unknown[]) => toastError(...a),
    },
}))

jest.mock('@/lib/export/excel', () => ({ exportToExcel: jest.fn() }))
jest.mock('@/components/ScenarioCompare', () => ({
    ScenarioCompare: () => <div>ScenarioCompare</div>,
}))

import ProjectsPage from './page'

const PROJECT_WITH_MEMORY = {
    id: 'p1',
    name: 'Trabzon Arsa',
    _count: { scenarios: 1 },
    scenarios: [],
    akifMemory: 'Bütçe üst sınırı 5M TL, deprem riskine çok önem veriyor.',
}

const PROJECT_WITHOUT_MEMORY = {
    id: 'p2',
    name: 'Ordu Arsa',
    _count: { scenarios: 0 },
    scenarios: [],
    akifMemory: null,
}

beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
    toastSuccess.mockReset()
    toastError.mockReset()
})

it('akifMemory varsa "Hatırladıkları" bloğu + Temizle butonu görünür', async () => {
    global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) }) as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByText(/Hatırladıkları/)).toBeInTheDocument())
    expect(screen.getByText(/Bütçe üst sınırı 5M TL/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument()
})

it('akifMemory yoksa blok hiç render edilmez', async () => {
    global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ projects: [PROJECT_WITHOUT_MEMORY] }) }) as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByText('Ordu Arsa')).toBeInTheDocument())
    expect(screen.queryByText(/Hatırladıkları/)).not.toBeInTheDocument()
})

it('Temizle -> PATCH /api/projects/:id, başarıyla blok kaybolur + başarı toast\'ı', async () => {
    const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchMock as unknown as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1][0]).toBe('/api/projects/p1')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
        method: 'PATCH',
        body: JSON.stringify({ action: 'clear_memory' }),
    })
    await waitFor(() => expect(screen.queryByText(/Hatırladıkları/)).not.toBeInTheDocument())
    expect(toastSuccess).toHaveBeenCalled()
})

it('Temizle başarısız -> blok kalır + hata toast\'ı', async () => {
    const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [PROJECT_WITH_MEMORY] }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    global.fetch = fetchMock as unknown as jest.Mock
    render(<ProjectsPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.getByText(/Hatırladıkları/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/app/dashboard/projects/page.test.tsx`
Expected: FAIL — no "Hatırladıkları" text, no "Temizle" button exist yet.

- [ ] **Step 3: Implement**

In `src/app/dashboard/projects/page.tsx`:

1. Extend the `Project` interface:

```ts
interface Project {
    id: string;
    name: string;
    description?: string;
    akifMemory?: string | null;
    _count?: { scenarios: number };
    scenarios?: Scenario[];
}
```

2. Add a handler, next to `handleExcel`:

```ts
    const handleClearMemory = async (project: Project) => {
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_memory' }),
            });
            if (!res.ok) {
                toast.error('Temizlenemedi, tekrar dene.');
                return;
            }
            setProjects((prev) =>
                prev.map((p) => (p.id === project.id ? { ...p, akifMemory: null } : p))
            );
            toast.success('Arsa Dosyası temizlendi.');
        } catch {
            toast.error('Bağlantı hatası, tekrar dene.');
        }
    };
```

3. Render the block right after the `project.description` conditional and before the `scenariosBlock` conditional:

```tsx
                            {project.akifMemory && (
                                <div className={styles.memoryBlock}>
                                    <h5 className={styles.memoryTitle}>🎙 Akif&apos;in Hatırladıkları</h5>
                                    <p className={styles.memoryText}>{project.akifMemory}</p>
                                    <Button variant="outline" onClick={() => handleClearMemory(project)}>
                                        Temizle
                                    </Button>
                                </div>
                            )}
```

4. In `src/app/dashboard/dashboard.module.css`, add after `.scenarioMiniMeta` (or any existing rule in that section):

```css
.memoryBlock {
    margin-bottom: 1rem;
    padding: 0.75rem 0.85rem;
    background: var(--panel);
    border-radius: 8px;
}

.memoryTitle {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 0.4rem;
}

.memoryText {
    font-size: 0.85rem;
    white-space: pre-wrap;
    margin-bottom: 0.5rem;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/app/dashboard/projects/page.test.tsx`
Expected: all 4 tests PASS.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: `npm run build`** → clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/projects/page.tsx src/app/dashboard/dashboard.module.css src/app/dashboard/projects/page.test.tsx
git commit -m "feat(akif-3): Projelerim'de Akif'in Hatırladıkları + Temizle"
```

---

## Final verification (after Task 8)

- [ ] Run the full suite: `npx jest` → all green, no regressions outside the files touched above.
- [ ] `npx tsc --noEmit` (project-wide) → 0 errors.
- [ ] `npm run build` → clean, `○ /akif`, `○ /dashboard/projects`, `ƒ /api/akif/turn`, `ƒ /api/projects/[id]` all present in the route output.
- [ ] Update `docs/akif/akif-2-insan-duman-kontrol-listesi.md` with an "Akif-3" section (3 items, per spec §8): (1) gerçek bir projede birkaç tur konuşup `akifMemory`'nin dolduğunu doğrula, (2) yeni bir sohbette Akif'in dosyayı hatırladığını doğrula, (3) "Temizle" butonunun gerçekten temizlediğini doğrula. This is documentation, not code — no test cycle, just append and commit.
- [ ] Hand off to `finishing-a-development-branch` per this project's usual pattern (this branch stays local/unpushed — see spec §8 and Global Constraints).
