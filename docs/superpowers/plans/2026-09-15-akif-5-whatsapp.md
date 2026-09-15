# Akif-5 (WhatsApp Entegrasyonu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WhatsApp bot's deterministic ada/parsel state-machine (5a) with full conversational Akif — same LLM orchestrator, contract, and prompt stack as `/akif` — while preserving parsel lookup (as a new Akif tool, `lookupParcel`) and the post-lookup subscribe invite. 5b (the outbound digest/alert cron) is untouched.

**Architecture:** A brand-new handler (`akifHandleMessage.ts`) replaces `handleMessage.ts` as the webhook's dispatch target. It reuses `runAkifTurn` (Akif-1 orchestrator, unmodified in its own logic) with three small, additive, backward-compatible extensions to shared Akif files (an optional tool-list override in `openaiClient.ts`, an optional extra-prompt field threaded through `assemble.ts`/`orchestrator.ts`, and an optional conversation-id-prefix filter in `audit.ts`) so WhatsApp gets its own tool set and cost-budget pool without changing web or voice Akif's behavior. `lookupParcel` is a new pure tool wrapping the existing `resolveLocation`/`buildDegerCard` (both untouched). Per-phone conversation history reuses the existing `WhatsappConversation` table (now generic over its stored state shape) instead of a new model. Dead code from the old rule-based flow is deleted, not left unreferenced.

**Tech Stack:** Next.js 16 App Router (route handlers, `runtime='nodejs'`), Prisma + PostgreSQL, OpenAI structured outputs (reusing Akif-1's client), Jest.

**Spec:** `docs/superpowers/specs/2026-09-15-akif-5-whatsapp-design.md`

## Global Constraints

- Branch `codex/professional-ui-and-land-cost`; **no push/deploy** — joins the unapplied Akif batch. No new migration (reused models don't change shape).
- Every additive change to a SHARED Akif file (`openaiClient.ts`, `assemble.ts`, `orchestrator.ts`, `audit.ts`, `contract.ts`) must be **optional-parameter, backward-compatible**: an existing caller that passes nothing new must see byte-identical behavior. Each such task includes an explicit regression test proving this, not just new-behavior tests.
- `lookupParcel` and its OpenAI tool schema are **WhatsApp-only** — never added to the shared `AKIF_TOOL_DEFS` array itself (web `/akif` and voice Akif must never see it). This is why `openaiClient.ts` needs a tool-list override rather than a shared-list edit.
- `AKIF_WHATSAPP_MONTHLY_BUDGET_USD` is a **separate** budget pool from `AKIF_MONTHLY_BUDGET_USD` — enforced by filtering `AkifTurnLog` on a `conversationId` prefix (`wa:`), not a new table.
- `RATE_LIMITS.AKIF_WHATSAPP_TURN` (new, phone-based) is **in addition to** the existing `RATE_LIMITS.WHATSAPP_INBOUND` (spam guard) — never replaces it.
- `DURDUR`/opt-out and the post-lookup subscribe invite (`hasSubscription`/`upsertSubscription`/`deleteSubscriptions`, `renderFollowup.*`) are reused **verbatim**, unmodified.
- Dead code (the old rule-based flow) is **deleted**, including now-unused types — never left as unreferenced code. Files that are only *partially* dead (e.g. `renderError.ts`, `types.ts`) are trimmed, not wholesale-deleted, since other kept modules still use part of them.
- Turkish for code comments and UI/bot copy, matching surrounding files.
- Every task ends green: `npx tsc --noEmit` 0 errors, the task's jest files pass, and (route-touching tasks) `npm run build` clean.

## Reference: exact current shapes (verified against current code)

- `AkifTurn`/`ToolResultCard`/`AKIF_TURN_JSON_SCHEMA`/`parseAkifTurn` — `src/lib/ai/akif/contract.ts`. `ToolResultCard = TermCard | ScenarioCard` today.
- `RunAkifTurnInput = { conversationId, history, userMessage, projectMemory? }`, `runAkifTurn(input, deps): Promise<AkifTurn>` — `src/lib/ai/akif/orchestrator.ts`. Builds `assembleSystemPrompt({ hasHistory, projectMemory })`, then does the tool-call + structured-JSON two-call flow, then injects `toolResult` into `turn.tool_result` (branches on `kind === 'term'` vs. else).
- `assembleSystemPrompt(ctx: { hasHistory, projectMemory? }): string` — `src/lib/ai/akif/prompts/assemble.ts`.
- `createAkifModel(deps: { client, model }): { chatWithTools, finalStructured }`, `readAkifEnv(env): AkifEnvConfig`, `numEnv`, `estimateCostUsd` — `src/lib/ai/akif/openaiClient.ts`. Both `chatWithTools`/`finalStructured` currently send `tools: AKIF_TOOL_DEFS` (imported, hardcoded).
- `AKIF_TOOL_DEFS: OpenAiToolDef[]`, `type ToolName = 'explainTerm'|'compareContractorOffers'|'compareApartmentSizes'`, `validateArgs(name, args)`, `dispatchTool(name, args, deps: { db })` — `src/lib/ai/akif/gateway/toolRegistry.ts`.
- `createAuditLogger(db): { logTurn, monthSpendUsd(now) }` — `src/lib/ai/akif/audit.ts`. `monthSpendUsd` aggregates ALL `AkifTurnLog` rows with `createdAt >= monthStart`, no other filter.
- `checkConversationBudget(messages, maxTurnTokens): {ok}`, `checkMonthlyBudget(deps): Promise<{ok, spent}>` — `src/lib/ai/akif/costGuard.ts`.
- `RATE_LIMITS` — `src/lib/rate-limit.ts`: `WHATSAPP_INBOUND: {limit:10, windowMs:60_000}`, `AKIF_TURN: {limit:8, windowMs:60_000}`. `checkRateLimit(key, limit): {ok, retryAfterSec?}`.
- `resolveLocation(fields: ConvFields, deps: ResolveLocationDeps): Promise<ResolveResult>` — `src/lib/whatsapp/resolveLocation.ts`. `ResolveResult = {kind:'resolved',mahalleId,il,ilce,mahalle} | {kind:'ambiguous',level,candidates:AreaOption[]} | {kind:'notfound',level,term}`.
- `buildDegerCard(input, deps, opts): Promise<DegerCardResult>` — `src/lib/deger/card.ts`. `DegerCardResult = {ok:true,card:DegerCardDTO} | {ok:false,reason:'parcel_not_found'|'parcel_unavailable'}`. `DegerCardDTO.parcel = {il,ilce,mahalle,ada,parsel,areaSqm,geometry}`.
- `createAnonCardDeps()` — `src/lib/deger/anonCardDeps.ts` (used by `route.ts`'s `buildHandleDeps` to build `DegerCardDeps` for `buildDegerCard`).
- `renderCard(dto: DegerCardDTO, siteUrl: string): string` — `src/lib/whatsapp/renderCard.ts` (WhatsApp-text formatting of a resolved card).
- `renderFollowup.{prompt(mahalle), subscribed(mahalle), unsubscribedAll(), noSubscription()}` — `src/lib/whatsapp/renderFollowup.ts`.
- `renderError.{help, textOnly, askFor, chooseFrom, notFound, rateLimited, forCardFailure}` — `src/lib/whatsapp/renderError.ts`. Only `help`/`textOnly`/`rateLimited` (parameterless) survive this plan; the rest are `ConvLevel`/`ConvFields`/`AreaLevel`-typed and become dead once the state machine is deleted.
- `types.ts`: `InboundMessage`, `AreaOption`, `AreaLevel`, `ConvFields`, `ResolveResult` are still needed (by `resolveLocation.ts`/`matchAreaName.ts`/the new `lookupParcel.ts`). `ConvLevel`, `ConvState`, `ParsedQuery` become dead (only the old flow used them).
- `ConversationStore`/`createPrismaConversationStore`/`mergeFields`/`TTL_MS` — `src/lib/whatsapp/conversation.ts`. `createPrismaConversationStore` is generic-izable (its body never touches `ConvState`'s specific fields, only `state: unknown`/`T`); `mergeFields` is `ConvFields`-specific and only used by the old flow — dead.
- `createSendText(deps): (to, body) => Promise<void>` — `src/lib/whatsapp/sendMessage.ts`. Unmodified.
- `WhatsappConversation` Prisma model: `{ id, phone @unique, state: Json, lastMessageId, updatedAt, createdAt }`. No schema change needed — `state`'s *content* shape changes, not its column type.
- `route.ts` (`src/app/api/whatsapp/webhook/route.ts`): `GET` (verify token) untouched. `POST`: signature verify → JSON parse → `parseInbound` → per-message `after(() => handleMessage(m, buildHandleDeps()))` wrapped in try/catch → `200 'ok'` always. `buildHandleDeps()` wires `store`/`understanding`/`resolveDeps`/`buildCard`/`sendText`/`siteUrlFor`/`hasSubscription`/`upsertSubscription`/`deleteSubscriptions`.
- Existing `handleMessage.test.ts` uses a `DegerCardDTO` fixture: `{ parcel: {il,ilce,mahalle,ada,parsel,areaSqm,geometry}, risk: {faultDistanceM,floodQ100,status}, value: {tier,insufficientData,basis,thinData,freeRangeLow,freeRangeHigh,pricePerSqmCoarse}, neighborhood: {geojson}, comparables: {count}, demographicsAvailable }` — reuse this exact shape in new tests needing a `DegerCardDTO`.

---

### Task 1: `contract.ts` `ParcelCard` + `orchestrator.ts` tool-result branch fix

**Files:**
- Modify: `src/lib/ai/akif/contract.ts`
- Modify: `src/lib/ai/akif/orchestrator.ts`
- Test: `src/lib/ai/akif/__tests__/contract.test.ts`
- Test: `src/lib/ai/akif/__tests__/orchestrator.test.ts`

**Interfaces:**
- Produces: `ParcelCard` (new, exported from `contract.ts`), `ToolResultCard = TermCard | ScenarioCard | ParcelCard`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ai/akif/__tests__/contract.test.ts`, add a new `describe` block at the end:

```ts
describe('ParcelCard (Akif-5)', () => {
  it('ToolResultCard birleşimine dahildir — bir ParcelCard değişkene atanabilir', () => {
    const card: import('../contract').ParcelCard = { kind: 'parcel', status: 'location_not_found', level: 'il', term: 'xyz' }
    expect(card.kind).toBe('parcel')
  })
})
```

In `src/lib/ai/akif/__tests__/orchestrator.test.ts`, add inside `describe('runAkifTurn', ...)`, after test `(j)`:

```ts
  it('(k) tool_result kind:parcel ise dönüşümsüz turn.tool_result\'a atanır (rows.map ile çökmez)', async () => {
    const { deps } = makeDeps()
    const PARCEL_CARD = { kind: 'parcel' as const, status: 'resolved' as const, dto: { parcel: { il: 'Trabzon' } } as never, siteUrl: 'https://x' }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'lookupParcel',
      toolArgs: {},
      toolCallId: 'call_4',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(PARCEL_CARD)
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.tool_result).toEqual(PARCEL_CARD)
  })
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/ai/akif/__tests__/contract.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts`
Expected: contract test FAILS (`ParcelCard` doesn't exist — TS compile error surfaces as a jest failure); orchestrator test `(k)` FAILS (`toolResult.rows.map` throws on a card with no `rows`, since the current code's `else` branch assumes `ScenarioCard` shape).

- [ ] **Step 3: Implement `contract.ts`**

Add near the top, after the existing imports (there are none currently — this becomes the file's first import) and before `export interface AkifMessage`:

```ts
import type { DegerCardDTO } from '@/lib/deger/card'
```

Add after the `ScenarioCard` interface, before `export type ToolResultCard = TermCard | ScenarioCard`:

```ts
export interface ParcelCard {
  kind: 'parcel'
  status: 'resolved' | 'ambiguous' | 'location_not_found' | 'parcel_not_found' | 'parcel_unavailable'
  dto?: DegerCardDTO
  siteUrl?: string
  candidates?: string[]
  level?: 'il' | 'ilce' | 'mahalle'
  term?: string
}
```

Change:

```ts
export type ToolResultCard = TermCard | ScenarioCard
```

to:

```ts
export type ToolResultCard = TermCard | ScenarioCard | ParcelCard
```

- [ ] **Step 4: Implement `orchestrator.ts`**

In `src/lib/ai/akif/orchestrator.ts`, find:

```ts
  if (toolResult) {
    if (toolResult.kind === 'term') {
      turn.tool_result = toolResult
    } else {
```

Change to:

```ts
  if (toolResult) {
    if (toolResult.kind === 'term' || toolResult.kind === 'parcel') {
      turn.tool_result = toolResult
    } else {
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx jest src/lib/ai/akif/__tests__/contract.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts`
Expected: all PASS, including every pre-existing test (`(a)`-`(j)`) unchanged.

- [ ] **Step 6: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/akif/contract.ts src/lib/ai/akif/orchestrator.ts src/lib/ai/akif/__tests__/contract.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts
git commit -m "feat(akif-5): ParcelCard tipi + orchestrator tool-result dalı düzeltmesi"
```

---

### Task 2: Foundational additive changes — `openaiClient.ts`, `assemble.ts`/`orchestrator.ts`, `audit.ts`, `rate-limit.ts`

**Files:**
- Modify: `src/lib/ai/akif/openaiClient.ts`
- Modify: `src/lib/ai/akif/prompts/assemble.ts`
- Modify: `src/lib/ai/akif/orchestrator.ts`
- Modify: `src/lib/ai/akif/audit.ts`
- Modify: `src/lib/rate-limit.ts`
- Test: `src/lib/ai/akif/__tests__/openaiClient.test.ts`
- Test: `src/lib/ai/akif/__tests__/prompts.test.ts`
- Test: `src/lib/ai/akif/__tests__/orchestrator.test.ts`
- Test: `src/lib/ai/akif/__tests__/audit.test.ts`

**Interfaces:**
- Produces: `AkifModelDeps.toolDefs?: OpenAiToolDef[]`. `PromptContext.extraSystemPrompt?: string`. `RunAkifTurnInput.extraSystemPrompt?: string`. `createAuditLogger(db, opts?: { conversationIdPrefix?: string })`. `RATE_LIMITS.AKIF_WHATSAPP_TURN: { limit: 8, windowMs: 60_000 }`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ai/akif/__tests__/openaiClient.test.ts`, add inside `describe('createAkifModel.chatWithTools', ...)`:

```ts
  it('toolDefs verilirse AKIF_TOOL_DEFS yerine onu gönderir', async () => {
    const CUSTOM = [{ type: 'function' as const, function: { name: 'x', description: 'd', parameters: {} } }]
    const { deps, calls } = fakeDeps(async () => ({
      choices: [{ message: { content: 'x' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }))
    await createAkifModel({ ...deps, toolDefs: CUSTOM }).chatWithTools(MSGS)
    const arg = calls[0][0] as { tools: unknown }
    expect(arg.tools).toBe(CUSTOM)
  })

  it('toolDefs verilmezse AKIF_TOOL_DEFS kullanılır (regresyon)', async () => {
    const { deps, calls } = fakeDeps(async () => ({
      choices: [{ message: { content: 'x' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }))
    await createAkifModel(deps).chatWithTools(MSGS)
    const arg = calls[0][0] as { tools: unknown }
    expect(Array.isArray(arg.tools)).toBe(true)
    expect((arg.tools as unknown[]).length).toBeGreaterThan(0)
  })
```

In `src/lib/ai/akif/__tests__/prompts.test.ts`, add inside the `describe('assembleSystemPrompt — Arsa Dosyası (Akif-3)', ...)` block (or as a sibling block right after it):

```ts
describe('assembleSystemPrompt — extraSystemPrompt (Akif-5)', () => {
  it('extraSystemPrompt verilmezse çıktı MEVCUT davranışla birebir aynı (regresyon kilidi)', () => {
    const out = assembleSystemPrompt({ hasHistory: true })
    expect(out).not.toContain('EK_POLITIKA_TEST_METNI')
  })

  it('extraSystemPrompt verilirse son katman olarak eklenir', () => {
    const out = assembleSystemPrompt({ hasHistory: true, extraSystemPrompt: 'EK_POLITIKA_TEST_METNI' })
    expect(out).toContain('EK_POLITIKA_TEST_METNI')
  })
})
```

In `src/lib/ai/akif/__tests__/orchestrator.test.ts`, add after test `(k)`:

```ts
  it('(l) extraSystemPrompt verilirse sistem promptuna eklenir', async () => {
    const { deps } = makeDeps()
    await runAkifTurn({ ...INPUT, extraSystemPrompt: 'EK_POLITIKA_TEST_METNI' }, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{ role: string; content: string }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).toContain('EK_POLITIKA_TEST_METNI')
  })
```

In `src/lib/ai/akif/__tests__/audit.test.ts`, add inside `describe('monthSpendUsd', ...)`:

```ts
    it('conversationIdPrefix verilirse aggregate WHERE\'ine startsWith eklenir', async () => {
      const now = new Date('2026-08-15T12:00:00Z')
      const expectedMonthStart = new Date(Date.UTC(2026, 7, 1))
      const mockAggregate = jest.fn().mockResolvedValue({ _sum: { estCostUsd: 5 } })
      const db: AuditDb = { akifTurnLog: { create: jest.fn(), aggregate: mockAggregate } }
      const logger = createAuditLogger(db, { conversationIdPrefix: 'wa:' })
      await logger.monthSpendUsd(now)
      expect(mockAggregate).toHaveBeenCalledWith({
        _sum: { estCostUsd: true },
        where: { createdAt: { gte: expectedMonthStart }, conversationId: { startsWith: 'wa:' } },
      })
    })

    it('conversationIdPrefix verilmezse WHERE\'e conversationId eklenmez (regresyon)', async () => {
      const now = new Date('2026-08-15T12:00:00Z')
      const mockAggregate = jest.fn().mockResolvedValue({ _sum: { estCostUsd: 5 } })
      const db: AuditDb = { akifTurnLog: { create: jest.fn(), aggregate: mockAggregate } }
      const logger = createAuditLogger(db)
      await logger.monthSpendUsd(now)
      const call = mockAggregate.mock.calls[0][0] as { where: Record<string, unknown> }
      expect(call.where.conversationId).toBeUndefined()
    })
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/ai/akif/__tests__/openaiClient.test.ts src/lib/ai/akif/__tests__/prompts.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts src/lib/ai/akif/__tests__/audit.test.ts`
Expected: the new `toolDefs` test, `extraSystemPrompt` test `(l)`, the "verilirse eklenir" prompts test, and the `conversationIdPrefix` test all FAIL. All other new/existing tests PASS already (they're regression guards for behavior that hasn't changed yet).

- [ ] **Step 3: Implement `openaiClient.ts`**

Add the import (alongside the existing `AKIF_TOOL_DEFS` import):

```ts
import { AKIF_TOOL_DEFS, type OpenAiToolDef } from './gateway/toolRegistry'
```

Change `AkifModelDeps`:

```ts
export interface AkifModelDeps {
  client: Pick<OpenAI, 'chat'>
  model: string
  toolDefs?: OpenAiToolDef[]
}
```

In `createAkifModel`, replace both occurrences of `tools: AKIF_TOOL_DEFS,` with `tools: deps.toolDefs ?? AKIF_TOOL_DEFS,`.

- [ ] **Step 4: Implement `assemble.ts`**

Extend the interface:

```ts
export interface PromptContext {
  hasHistory: boolean
  projectMemory?: string | null
  extraSystemPrompt?: string
}
```

Update the function body — after the existing `projectMemory` block, before the `hasHistory` check:

```ts
  if (ctx.projectMemory !== undefined) {
    parts.push(MEMORY_POLICY_PROMPT)
    if (ctx.projectMemory) {
      parts.push(`Bu proje hakkında bildiklerin:\n${ctx.projectMemory}`)
    }
  }
  if (ctx.extraSystemPrompt) {
    parts.push(ctx.extraSystemPrompt)
  }
  if (!ctx.hasHistory) {
    parts.push(FIRST_MESSAGE_NOTE)
  }
```

- [ ] **Step 5: Implement `orchestrator.ts`**

Extend the interface:

```ts
export interface RunAkifTurnInput {
  conversationId: string
  history: AkifMessage[]
  userMessage: string
  projectMemory?: string | null
  extraSystemPrompt?: string
}
```

Update the destructure and `assembleSystemPrompt` call:

```ts
  const { conversationId, history, userMessage, projectMemory, extraSystemPrompt } = input
  const turnNumber = Math.floor(history.length / 2) + 1

  const systemPrompt = assembleSystemPrompt({
    hasHistory: history.length > 0,
    projectMemory,
    extraSystemPrompt,
  })
```

- [ ] **Step 6: Implement `audit.ts`**

Replace the file's `createAuditLogger` export with:

```ts
export function createAuditLogger(
  db: AuditDb,
  opts: { conversationIdPrefix?: string } = {},
) {
  return {
    async logTurn(entry: AuditEntry): Promise<void> {
      try {
        await db.akifTurnLog.create({ data: entry });
      } catch (err) {
        console.error('[audit] failed to log turn:', err);
      }
    },

    async monthSpendUsd(now: Date): Promise<number> {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );

      const where: Record<string, unknown> = {
        createdAt: { gte: monthStart },
      };
      if (opts.conversationIdPrefix) {
        where.conversationId = { startsWith: opts.conversationIdPrefix };
      }

      const result = await db.akifTurnLog.aggregate({
        _sum: { estCostUsd: true },
        where,
      });

      return result._sum.estCostUsd ?? 0;
    },
  };
}
```

- [ ] **Step 7: Implement `rate-limit.ts`**

Add one entry to `RATE_LIMITS`, right after `AKIF_TURN`:

```ts
    AKIF_WHATSAPP_TURN: { limit: 8, windowMs: 60_000 }, // telefon başına 8/dk — LLM turu pahalı (AKIF_TURN'ün IP-bazlı eşdeğeri)
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `npx jest src/lib/ai/akif/__tests__/openaiClient.test.ts src/lib/ai/akif/__tests__/prompts.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts src/lib/ai/akif/__tests__/audit.test.ts`
Expected: all PASS.

- [ ] **Step 9: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ai/akif/openaiClient.ts src/lib/ai/akif/prompts/assemble.ts src/lib/ai/akif/orchestrator.ts src/lib/ai/akif/audit.ts src/lib/rate-limit.ts src/lib/ai/akif/__tests__/openaiClient.test.ts src/lib/ai/akif/__tests__/prompts.test.ts src/lib/ai/akif/__tests__/orchestrator.test.ts src/lib/ai/akif/__tests__/audit.test.ts
git commit -m "feat(akif-5): openaiClient toolDefs + assemble/orchestrator extraSystemPrompt + audit conversationIdPrefix + AKIF_WHATSAPP_TURN limiti"
```

---

### Task 3: `lookupParcel` pure tool

**Files:**
- Create: `src/lib/ai/akif/gateway/lookupParcel.ts`
- Test: `src/lib/ai/akif/gateway/__tests__/lookupParcel.test.ts`

**Interfaces:**
- Consumes: `resolveLocation(fields, deps): Promise<ResolveResult>` (`src/lib/whatsapp/resolveLocation.ts`), `ParcelCard` (Task 1).
- Produces: `LookupParcelArgs`, `LookupParcelDeps`, `lookupParcel(args, deps): Promise<ParcelCard>`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/ai/akif/gateway/__tests__/lookupParcel.test.ts`:

```ts
import { lookupParcel, type LookupParcelDeps } from '../lookupParcel'

const DTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
  value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
  neighborhood: { geojson: null },
  comparables: { count: 3 },
  demographicsAvailable: false,
} as never

function makeDeps(over: Partial<LookupParcelDeps> = {}): LookupParcelDeps {
  return {
    resolveDeps: {} as never,
    buildCard: jest.fn().mockResolvedValue({ ok: true, card: DTO }),
    siteUrlFor: () => 'https://www.arsabil.com/deger?x=1',
    ...over,
  }
}

const ARGS = { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '123', parsel: '45' }

jest.mock('@/lib/whatsapp/resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }),
}))
import { resolveLocation } from '@/lib/whatsapp/resolveLocation'

describe('lookupParcel', () => {
  beforeEach(() => {
    ;(resolveLocation as jest.Mock).mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  })

  it('resolved + buildCard ok → status:resolved, dto+siteUrl dolu', async () => {
    const deps = makeDeps()
    const card = await lookupParcel(ARGS, deps)
    expect(card).toEqual({ kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://www.arsabil.com/deger?x=1' })
    expect(deps.buildCard).toHaveBeenCalledWith(5000, '123', '45')
  })

  it('resolveLocation ambiguous → status:ambiguous, level+candidates dolu', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValueOnce({ kind: 'ambiguous', level: 'mahalle', candidates: [{ id: 1, text: 'Uğurlu' }, { id: 2, text: 'Uğurluoğlu' }] })
    const card = await lookupParcel(ARGS, makeDeps())
    expect(card).toEqual({ kind: 'parcel', status: 'ambiguous', level: 'mahalle', candidates: ['Uğurlu', 'Uğurluoğlu'] })
  })

  it('resolveLocation notfound → status:location_not_found, level+term dolu', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValueOnce({ kind: 'notfound', level: 'ilce', term: 'xyz' })
    const card = await lookupParcel(ARGS, makeDeps())
    expect(card).toEqual({ kind: 'parcel', status: 'location_not_found', level: 'ilce', term: 'xyz' })
  })

  it('buildCard parcel_not_found → status:parcel_not_found', async () => {
    const deps = makeDeps({ buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }) })
    const card = await lookupParcel(ARGS, deps)
    expect(card).toEqual({ kind: 'parcel', status: 'parcel_not_found' })
  })

  it('buildCard parcel_unavailable → status:parcel_unavailable', async () => {
    const deps = makeDeps({ buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_unavailable' }) })
    const card = await lookupParcel(ARGS, deps)
    expect(card).toEqual({ kind: 'parcel', status: 'parcel_unavailable' })
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx jest src/lib/ai/akif/gateway/__tests__/lookupParcel.test.ts`
Expected: FAIL — `Cannot find module '../lookupParcel'`.

- [ ] **Step 3: Implement**

Create `src/lib/ai/akif/gateway/lookupParcel.ts`:

```ts
// Akif-5 — WhatsApp-özel araç: ada/parsel sorgusu.
// resolveLocation.ts (TKGM fuzzy il/ilçe/mahalle) + buildDegerCard (gerçek
// motor) sarar — uydurma sayı YOK. Yalnız WhatsApp tool gateway'inden
// çağrılır (bkz. src/lib/whatsapp/akifToolGateway.ts); paylaşılan
// toolRegistry.ts'e HİÇ eklenmez.

import { resolveLocation, type ResolveLocationDeps } from '@/lib/whatsapp/resolveLocation'
import type { DegerCardResult } from '@/lib/deger/card'
import type { ParcelCard } from '../contract'

export interface LookupParcelArgs {
  ilText: string
  ilceText: string
  mahalleText: string
  ada: string
  parsel: string
}

export interface LookupParcelDeps {
  resolveDeps: ResolveLocationDeps
  buildCard: (mahalleId: number, ada: string, parsel: string) => Promise<DegerCardResult>
  siteUrlFor: (f: {
    il: string
    ilce: string
    mahalle: string
    mahalleId: number
    ada: string
    parsel: string
  }) => string
}

export async function lookupParcel(
  args: LookupParcelArgs,
  deps: LookupParcelDeps,
): Promise<ParcelCard> {
  const r = await resolveLocation(
    { ilText: args.ilText, ilceText: args.ilceText, mahalleText: args.mahalleText },
    deps.resolveDeps,
  )
  if (r.kind === 'ambiguous') {
    return {
      kind: 'parcel',
      status: 'ambiguous',
      level: r.level,
      candidates: r.candidates.map((c) => c.text),
    }
  }
  if (r.kind === 'notfound') {
    return { kind: 'parcel', status: 'location_not_found', level: r.level, term: r.term }
  }
  const res = await deps.buildCard(r.mahalleId, args.ada, args.parsel)
  if (!res.ok) {
    return { kind: 'parcel', status: res.reason }
  }
  return {
    kind: 'parcel',
    status: 'resolved',
    dto: res.card,
    siteUrl: deps.siteUrlFor({
      il: r.il,
      ilce: r.ilce,
      mahalle: r.mahalle,
      mahalleId: r.mahalleId,
      ada: args.ada,
      parsel: args.parsel,
    }),
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx jest src/lib/ai/akif/gateway/__tests__/lookupParcel.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/gateway/lookupParcel.ts src/lib/ai/akif/gateway/__tests__/lookupParcel.test.ts
git commit -m "feat(akif-5): lookupParcel saf aracı"
```

---

### Task 4: WhatsApp-only tool gateway + tool policy prompt

**Files:**
- Create: `src/lib/whatsapp/akifToolGateway.ts`
- Create: `src/lib/whatsapp/akifToolPolicy.ts`
- Test: `src/lib/whatsapp/__tests__/akifToolGateway.test.ts`
- Test: `src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`

**Interfaces:**
- Consumes: `AKIF_TOOL_DEFS`, `ToolName`, `validateArgs`, `dispatchTool`, `DispatchDeps`, `OpenAiToolDef` (`src/lib/ai/akif/gateway/toolRegistry.ts`); `lookupParcel`, `LookupParcelArgs`, `LookupParcelDeps` (Task 3).
- Produces: `WA_AKIF_TOOL_DEFS: OpenAiToolDef[]`, `WaToolName = ToolName | 'lookupParcel'`, `validateArgsWa(name, args)`, `dispatchToolWa(name, args, deps: WaDispatchDeps)`, `AKIF_WHATSAPP_TOOL_POLICY: string`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/whatsapp/__tests__/akifToolGateway.test.ts`:

```ts
jest.mock('@/lib/whatsapp/resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'notfound', level: 'il', term: 'x' }),
}))

import { WA_AKIF_TOOL_DEFS, validateArgsWa, dispatchToolWa } from '../akifToolGateway'
import { AKIF_TOOL_DEFS } from '@/lib/ai/akif/gateway/toolRegistry'

describe('WA_AKIF_TOOL_DEFS', () => {
  it('3 mevcut aracı + lookupParcel içerir', () => {
    expect(WA_AKIF_TOOL_DEFS.length).toBe(AKIF_TOOL_DEFS.length + 1)
    expect(WA_AKIF_TOOL_DEFS.map((d) => d.function.name)).toEqual(
      expect.arrayContaining([...AKIF_TOOL_DEFS.map((d) => d.function.name), 'lookupParcel']),
    )
  })

  it('paylaşılan AKIF_TOOL_DEFS mutasyona uğramaz', () => {
    expect(AKIF_TOOL_DEFS.some((d) => d.function.name === 'lookupParcel')).toBe(false)
  })
})

describe('validateArgsWa', () => {
  it('lookupParcel: 5 alanın hepsi dolu string ise ok', () => {
    expect(
      validateArgsWa('lookupParcel', { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '1', parsel: '2' }),
    ).toEqual({ ok: true })
  })

  it('lookupParcel: bir alan eksikse fail', () => {
    const r = validateArgsWa('lookupParcel', { ilText: 'Trabzon', ilceText: '', mahalleText: 'Uğurlu', ada: '1', parsel: '2' })
    expect(r.ok).toBe(false)
  })

  it('mevcut araç adları paylaşılan validateArgs\'a delege eder', () => {
    expect(validateArgsWa('explainTerm', { term: 'emsal' })).toEqual({ ok: true })
    expect(validateArgsWa('explainTerm', { term: 'bilinmeyen' }).ok).toBe(false)
  })
})

describe('dispatchToolWa', () => {
  it('lookupParcel: lookupParcelDeps ile lookupParcel çağırır', async () => {
    const lookupParcelDeps = {
      resolveDeps: {} as never,
      buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }),
      siteUrlFor: () => 'x',
    }
    const card = await dispatchToolWa(
      'lookupParcel',
      { ilText: 'x', ilceText: 'x', mahalleText: 'x', ada: '1', parsel: '2' },
      { db: {} as never, lookupParcelDeps },
    )
    expect(card.kind).toBe('parcel')
  })

  it('mevcut araç adları paylaşılan dispatchTool\'a delege eder', async () => {
    const card = await dispatchToolWa('explainTerm', { term: 'emsal' }, { db: {} as never, lookupParcelDeps: {} as never })
    expect(card.kind).toBe('term')
  })
})
```

Create `src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`:

```ts
import { AKIF_WHATSAPP_TOOL_POLICY } from '../akifToolPolicy'

describe('AKIF_WHATSAPP_TOOL_POLICY', () => {
  it('dolu bir string, lookupParcel ve belirsiz/bulunamadı durumlarını anlatır', () => {
    expect(typeof AKIF_WHATSAPP_TOOL_POLICY).toBe('string')
    expect(AKIF_WHATSAPP_TOOL_POLICY).toContain('lookupParcel')
    expect(AKIF_WHATSAPP_TOOL_POLICY.trim().length).toBeGreaterThan(80)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/lib/whatsapp/__tests__/akifToolGateway.test.ts src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement `akifToolPolicy.ts`**

Create `src/lib/whatsapp/akifToolPolicy.ts`:

```ts
// Akif-5 — WhatsApp-özel araç politikası. Yalnız WhatsApp Akif'e enjekte
// edilir (assembleSystemPrompt'un extraSystemPrompt alanı üzerinden) —
// web/voice hiç görmez.

export const AKIF_WHATSAPP_TOOL_POLICY = `
WHATSAPP EK ARAÇ POLİTİKASI:
Elinde lookupParcel adında bir araç var — bir arsanın gerçek TKGM verisini ve Değer Kartı'nı getirir.
- Kullanıcıdan il, ilçe, mahalle, ada VE parsel numarasının hepsini topla, sonra çağır. Eksikken çağırma.
- Araç "ambiguous" (belirsiz) dönerse, adayları kendi cümlelerinle listele ve kullanıcıya hangisini kastettiğini sor — sayı uydurma.
- Araç "location_not_found" dönerse, o ismi bulamadığını söyle ve tekrar sor.
- Araç "parcel_not_found" ya da "parcel_unavailable" dönerse, ada/parsel numaralarını kontrol etmesini iste ya da servisin şu an ulaşılamaz olduğunu söyle.
- Araç "resolved" dönerse, kısa bir giriş cümlesi yaz — sayısal detayları TEKRARLAMA, ayrıca bir kart olarak ayrıca gösterilecek.
`.trim()
```

- [ ] **Step 4: Implement `akifToolGateway.ts`**

Create `src/lib/whatsapp/akifToolGateway.ts`:

```ts
// Akif-5 — WhatsApp-özel tool gateway. Paylaşılan toolRegistry.ts'i
// DOKUNMADAN çevreler: 3 mevcut aracı olduğu gibi kullanır + lookupParcel'i
// ekler. Bu dizi/tip SADECE WhatsApp handler'ından import edilir — web/voice
// hâlâ paylaşılan AKIF_TOOL_DEFS/ToolName'i kullanır.

import {
  AKIF_TOOL_DEFS,
  validateArgs,
  dispatchTool,
  type ToolName,
  type OpenAiToolDef,
  type ValidateResult,
  type DispatchDeps,
} from '@/lib/ai/akif/gateway/toolRegistry'
import { lookupParcel, type LookupParcelArgs, type LookupParcelDeps } from '@/lib/ai/akif/gateway/lookupParcel'
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export type WaToolName = ToolName | 'lookupParcel'

const LOOKUP_PARCEL_DEF: OpenAiToolDef = {
  type: 'function',
  function: {
    name: 'lookupParcel',
    description:
      "Bir arsanın ada/parsel numarasıyla TKGM'den gerçek parsel verisini ve Değer Kartı'nı getirir. Kullanıcıdan il, ilçe, mahalle, ada ve parsel numarasının HEPSİNİ topladıktan sonra çağır.",
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['ilText', 'ilceText', 'mahalleText', 'ada', 'parsel'],
      properties: {
        ilText: { type: 'string' },
        ilceText: { type: 'string' },
        mahalleText: { type: 'string' },
        ada: { type: 'string' },
        parsel: { type: 'string' },
      },
    },
  },
}

export const WA_AKIF_TOOL_DEFS: OpenAiToolDef[] = [...AKIF_TOOL_DEFS, LOOKUP_PARCEL_DEF]

function isSharedToolName(name: WaToolName): name is ToolName {
  return name !== 'lookupParcel'
}

export function validateArgsWa(name: WaToolName, args: unknown): ValidateResult {
  if (name === 'lookupParcel') {
    const obj: Record<string, unknown> =
      args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
    for (const field of ['ilText', 'ilceText', 'mahalleText', 'ada', 'parsel'] as const) {
      const v = obj[field]
      if (typeof v !== 'string' || v.trim() === '') {
        return { ok: false, field, reason: 'eksik' }
      }
    }
    return { ok: true }
  }
  return validateArgs(name, args)
}

export interface WaDispatchDeps extends DispatchDeps {
  lookupParcelDeps: LookupParcelDeps
}

export async function dispatchToolWa(
  name: WaToolName,
  args: unknown,
  deps: WaDispatchDeps,
): Promise<ToolResultCard> {
  if (name === 'lookupParcel') {
    return lookupParcel(args as LookupParcelArgs, deps.lookupParcelDeps)
  }
  if (isSharedToolName(name)) {
    return dispatchTool(name, args, deps)
  }
  throw new Error(`dispatchToolWa: bilinmeyen araç "${String(name)}"`)
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx jest src/lib/whatsapp/__tests__/akifToolGateway.test.ts src/lib/whatsapp/__tests__/akifToolPolicy.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/whatsapp/akifToolGateway.ts src/lib/whatsapp/akifToolPolicy.ts src/lib/whatsapp/__tests__/akifToolGateway.test.ts src/lib/whatsapp/__tests__/akifToolPolicy.test.ts
git commit -m "feat(akif-5): WhatsApp-özel tool gateway + araç politikası"
```

---

### Task 5: `conversation.ts` generic store + new `akifHandleMessage.ts` handler

**Files:**
- Modify: `src/lib/whatsapp/conversation.ts`
- Modify: `src/lib/whatsapp/types.ts`
- Create: `src/lib/whatsapp/akifHandleMessage.ts`
- Test: `src/lib/whatsapp/__tests__/conversation.test.ts` (existing — adjust if it references `ConvState` directly)
- Test: `src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`

**Interfaces:**
- Consumes: `runAkifTurn` (Task 2's extended signature), `createAkifModel({..., toolDefs})` (Task 2), `WA_AKIF_TOOL_DEFS`/`validateArgsWa`/`dispatchToolWa` (Task 4), `AKIF_WHATSAPP_TOOL_POLICY` (Task 4), `createAuditLogger(db, {conversationIdPrefix})` (Task 2), `RATE_LIMITS.AKIF_WHATSAPP_TURN`/`WHATSAPP_INBOUND` (Task 2), `renderCard`, `renderFollowup`, `renderError.{help,textOnly,rateLimited}`.
- Produces: `ConversationStore<T>` (generic, was non-generic), `WaAkifState`, `AkifHandleDeps`, `runWhatsappAkifTurn(msg, deps): Promise<void>`.

- [ ] **Step 1: Read the current `conversation.test.ts` first**

Read `src/lib/whatsapp/__tests__/conversation.test.ts` before making any change, to see exactly how it currently imports/exercises `ConversationStore`/`createPrismaConversationStore`/`ConvState`. Its assertions almost certainly don't depend on `ConvState`'s specific field names (the store just round-trips whatever `state` object it's given as `unknown`/generic `T`) — if so, no change to that test file is needed; if it does reference `ConvState`-specific fields, update those references to a generic test fixture object instead, preserving every existing assertion's intent. Note in your report which case applied.

- [ ] **Step 2: Write the new failing test**

Create `src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`:

```ts
import { runWhatsappAkifTurn, type AkifHandleDeps, type WaAkifState } from '../akifHandleMessage'
import type { InboundMessage } from '../types'

const TURN = {
  intent: 'smalltalk',
  speech: 'Merhaba, nasıl yardımcı olabilirim?',
  state: 'FRIENDLY',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

const DTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
  value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
  neighborhood: { geojson: null },
  comparables: { count: 3 },
  demographicsAvailable: false,
} as never

const runAkifTurnMock = jest.fn()
jest.mock('@/lib/ai/akif/orchestrator', () => ({
  runAkifTurn: (...a: unknown[]) => runAkifTurnMock(...a),
}))

function makeDeps(over: Partial<AkifHandleDeps> = {}): {
  deps: AkifHandleDeps
  sent: string[]
  saved: { state: WaAkifState; lastMessageId: string }[]
} {
  const sent: string[] = []
  const saved: { state: WaAkifState; lastMessageId: string }[] = []
  const deps: AkifHandleDeps = {
    store: {
      loadConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockImplementation(async (_p, s, id) => {
        saved.push({ state: s, lastMessageId: id })
      }),
    },
    model: { chatWithTools: jest.fn(), finalStructured: jest.fn() } as never,
    modelName: 'gpt-4o-mini',
    dispatch: jest.fn(),
    validateArgs: jest.fn(),
    audit: { logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) } as never,
    checkConversationBudget: () => ({ ok: true }),
    checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: true, spent: 0 }),
    sendText: jest.fn().mockImplementation(async (_to: string, b: string) => { sent.push(b) }),
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
    hasSubscription: jest.fn().mockResolvedValue(false),
    upsertSubscription: jest.fn().mockResolvedValue(undefined),
    deleteSubscriptions: jest.fn().mockResolvedValue(0),
    toolPolicy: 'TEST_POLICY',
    now: () => new Date('2026-09-16T00:00:00Z'),
    ...over,
  }
  return { deps, sent, saved }
}

const msg = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  from: '905321234567',
  text: 'merhaba',
  messageId: 'wamid.1',
  timestamp: 1,
  type: 'text',
  ...over,
})

describe('runWhatsappAkifTurn', () => {
  beforeEach(() => { runAkifTurnMock.mockReset().mockResolvedValue(TURN) })

  it('düz sohbet → runAkifTurn çağrılır, cevap gönderilir, history kaydedilir', async () => {
    const { deps, sent, saved } = makeDeps()
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    expect(runAkifTurnMock.mock.calls[0][0]).toMatchObject({
      conversationId: 'wa:905321234567',
      userMessage: 'merhaba',
      extraSystemPrompt: 'TEST_POLICY',
    })
    expect(sent[0]).toBe('Merhaba, nasıl yardımcı olabilirim?')
    expect(saved[0].state.history).toEqual([
      { role: 'user', content: 'merhaba' },
      { role: 'akif', content: 'Merhaba, nasıl yardımcı olabilirim?' },
    ])
    expect(saved[0].lastMessageId).toBe('wamid.1')
  })

  it('idempotent retry (aynı messageId) → runAkifTurn hiç çağrılmaz', async () => {
    const { deps } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { history: [] }, lastMessageId: 'wamid.1' }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('DURDUR → deleteSubscriptions çağrılır, runAkifTurn HİÇ çağrılmaz', async () => {
    const { deps, sent } = makeDeps({ deleteSubscriptions: jest.fn().mockResolvedValue(2) })
    await runWhatsappAkifTurn(msg({ text: 'DURDUR' }), deps)
    expect(deps.deleteSubscriptions).toHaveBeenCalledWith('905321234567')
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('durduruldu')
  })

  it('spam rate limit aşıldı → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps({
      checkRateLimit: jest.fn().mockReturnValue({ ok: false, retryAfterSec: 60 }),
    })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('Çok fazla sorgu')
  })

  it('aylık bütçe dolu → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps({
      checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: false, spent: 999 }),
    })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('Akif şu an kapalı')
  })

  it('non-text → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps()
    await runWhatsappAkifTurn(msg({ type: 'other', text: '' }), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('yazılı mesaj')
  })

  it('tool_result ParcelCard resolved + abone değil → renderCard + davet eklenir, state.awaitingFollowup set edilir', async () => {
    runAkifTurnMock.mockResolvedValue({
      ...TURN,
      speech: 'İşte sonuç:',
      tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' },
    })
    const { deps, sent, saved } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(false) })
    await runWhatsappAkifTurn(msg({ text: 'trabzon ortahisar uğurlu 123/45' }), deps)
    expect(sent[0]).toContain('İşte sonuç:')
    expect(sent[0]).toContain('Uğurlu Mah., Ortahisar / Trabzon')
    expect(sent[0]).toContain('takip edeyim mi')
    expect(saved[0].state.awaitingFollowup).toEqual({ il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  })

  it('tool_result ParcelCard resolved + zaten abone → davet eklenmez', async () => {
    runAkifTurnMock.mockResolvedValue({
      ...TURN,
      tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' },
    })
    const { deps, sent, saved } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(true) })
    await runWhatsappAkifTurn(msg(), deps)
    expect(sent[0]).not.toContain('takip edeyim mi')
    expect(saved[0].state.awaitingFollowup).toBeUndefined()
  })

  it('awaitingFollowup varken "evet" → upsertSubscription çağrılır, runAkifTurn ÇAĞRILMAZ', async () => {
    const { deps, sent } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({
          state: { history: [], awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } },
          lastMessageId: 'wamid.0',
        }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ text: 'evet', messageId: 'wamid.1' }), deps)
    expect(deps.upsertSubscription).toHaveBeenCalledWith('905321234567', { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('takibe alındı')
  })

  it('awaitingFollowup varken "evet" DIŞINDA bir cevap → normal Akif akışına düşer', async () => {
    const { deps } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({
          state: { history: [], awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } },
          lastMessageId: 'wamid.0',
        }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ text: 'hayır teşekkürler', messageId: 'wamid.1' }), deps)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
  })

  it('runAkifTurn fırlarsa → hata yakalanır, kullanıcıya nazik mesaj gider', async () => {
    runAkifTurnMock.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, sent } = makeDeps()
    await runWhatsappAkifTurn(msg(), deps)
    expect(sent[0]).toContain('yardımcı olamıyorum')
    errSpy.mockRestore()
  })

  it('history 40 mesajı geçince kırpılır', async () => {
    const longHistory = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? 'user' as const : 'akif' as const, content: `m${i}` }))
    const { deps, saved } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { history: longHistory }, lastMessageId: 'wamid.0' }),
        saveConversation: jest.fn().mockImplementation(async (_p, s, id) => { saved.push({ state: s, lastMessageId: id }) }),
      },
    })
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
    expect(saved[0].state.history.length).toBe(40)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx jest src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`
Expected: FAIL — `Cannot find module '../akifHandleMessage'`.

- [ ] **Step 4: Implement `conversation.ts` (make the store generic)**

Replace the file's exports:

```ts
export const TTL_MS = 30 * 60 * 1000

export interface ConversationStore<T> {
  loadConversation(phone: string): Promise<{ state: T; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: T, lastMessageId: string): Promise<void>
}

type Db = {
  whatsappConversation: {
    findUnique(a: { where: { phone: string } }): Promise<{ state: unknown; lastMessageId: string | null; updatedAt: Date } | null>
    upsert(a: unknown): Promise<unknown>
  }
}

export function createPrismaConversationStore<T>(db: Db, now: () => number = Date.now): ConversationStore<T> {
  return {
    async loadConversation(phone) {
      const row = await db.whatsappConversation.findUnique({ where: { phone } })
      if (!row) return null
      if (now() - row.updatedAt.getTime() > TTL_MS) return null
      return { state: row.state as T, lastMessageId: row.lastMessageId }
    },
    async saveConversation(phone, state, lastMessageId) {
      // Aynı telefondan eşzamanlı mesajlarda last-write-wins — v1 hacminde kabul.
      await db.whatsappConversation.upsert({
        where: { phone },
        create: { phone, state: state as unknown, lastMessageId },
        update: { state: state as unknown, lastMessageId },
      })
    },
  }
}
```

Remove `mergeFields` and its import of `ConvFields`/`ConvState` from this file entirely (it becomes dead once `handleMessage.ts` — its only caller — is deleted in Task 7; deleting it here now would break `handleMessage.ts`'s import before Task 7 removes that file, so leave the removal of `mergeFields` for Task 7 instead — **do not remove `mergeFields` in this task**, only make `ConversationStore`/`createPrismaConversationStore` generic as shown above; keep `mergeFields` exactly as it is for now).

- [ ] **Step 5: Handle `conversation.test.ts` per what Step 1 found**

Apply whatever adjustment Step 1 determined necessary (likely: none, since the store's behavior is unchanged, just its type parameter). Run `npx jest src/lib/whatsapp/__tests__/conversation.test.ts` and confirm it's still fully green.

- [ ] **Step 6: Implement `akifHandleMessage.ts`**

Create `src/lib/whatsapp/akifHandleMessage.ts`:

```ts
// Akif-5 — WhatsApp inbound handler. 5a'nın state-machine'inin YERİNE
// geçer: idempotency + rate-limit + DURDUR/abone-daveti pre-empt'leri
// deterministik kalır, geri kalan her şey Akif-1 orchestrator'ına gider.

import type { InboundMessage } from './types'
import type { AkifMessage, AkifTurn, ToolResultCard } from '@/lib/ai/akif/contract'
import { runAkifTurn } from '@/lib/ai/akif/orchestrator'
import type { createAkifModel } from '@/lib/ai/akif/openaiClient'
import type { createAuditLogger } from '@/lib/ai/akif/audit'
import { renderCard } from './renderCard'
import { renderFollowup } from './renderFollowup'
import { renderError } from './renderError'
import { checkRateLimit as defaultCheckRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { WaToolName } from './akifToolGateway'
import type { ValidateResult } from '@/lib/ai/akif/gateway/toolRegistry'

const MAX_HISTORY = 40

export interface WaAkifState {
  history: AkifMessage[]
  awaitingFollowup?: { il: string; ilce: string; mahalle: string }
}

export interface AkifHandleStore {
  loadConversation(phone: string): Promise<{ state: WaAkifState; lastMessageId: string | null } | null>
  saveConversation(phone: string, state: WaAkifState, lastMessageId: string): Promise<void>
}

export interface AkifHandleDeps {
  store: AkifHandleStore
  model: ReturnType<typeof createAkifModel>
  modelName: string
  dispatch: (name: WaToolName, args: unknown) => Promise<ToolResultCard>
  validateArgs: (name: WaToolName, args: unknown) => ValidateResult
  audit: ReturnType<typeof createAuditLogger>
  checkConversationBudget: (m: { content: string }[]) => { ok: boolean }
  checkMonthlyBudget: () => Promise<{ ok: boolean; spent: number }>
  sendText: (to: string, body: string) => Promise<void>
  checkRateLimit?: typeof defaultCheckRateLimit
  hasSubscription: (phone: string, il: string, ilce: string, mahalle: string) => Promise<boolean>
  upsertSubscription: (phone: string, area: { il: string; ilce: string; mahalle: string }) => Promise<void>
  deleteSubscriptions: (phone: string) => Promise<number>
  toolPolicy: string
  now: () => Date
}

export async function runWhatsappAkifTurn(msg: InboundMessage, deps: AkifHandleDeps): Promise<void> {
  const check = deps.checkRateLimit ?? defaultCheckRateLimit

  // 1. Load state
  const loaded = await deps.store.loadConversation(msg.from)
  const state: WaAkifState = loaded?.state ?? { history: [] }

  // 2. Idempotency — Meta retry'ları tekrar işlenmez.
  if (loaded && loaded.lastMessageId === msg.messageId) return

  // 3. Spam-guard rate limit (mevcut eşik, DEĞİŞMEDİ).
  if (!check('wa:' + msg.from, RATE_LIMITS.WHATSAPP_INBOUND).ok) {
    await deps.sendText(msg.from, renderError.rateLimited())
    return
  }

  // 4. Non-text / boş guard.
  if (msg.type !== 'text') {
    await deps.sendText(msg.from, renderError.textOnly())
    return
  }
  const text = msg.text.trim()
  if (!text) {
    await deps.sendText(msg.from, renderError.help())
    return
  }
  const low = text.toLocaleLowerCase('tr')

  // 5. DURDUR opt-out — Akif'ten ÖNCE, LLM'e hiç gitmeden.
  if (['durdur', 'stop', 'aboneliği iptal', 'abonelikten çık'].includes(low)) {
    const n = await deps.deleteSubscriptions(msg.from)
    await deps.sendText(msg.from, n > 0 ? renderFollowup.unsubscribedAll() : renderFollowup.noSubscription())
    await deps.store.saveConversation(msg.from, { history: state.history }, msg.messageId)
    return
  }

  // 6. Abone-daveti cevabı — kart sonrası "takip edeyim mi?" sorusuna yanıt.
  if (state.awaitingFollowup) {
    const yes = ['evet', 'e', 'olur', 'tamam', 'takip et', 'takip'].includes(low)
    const area = state.awaitingFollowup
    if (yes) {
      await deps.upsertSubscription(msg.from, area)
      await deps.sendText(msg.from, renderFollowup.subscribed(area.mahalle))
      await deps.store.saveConversation(msg.from, { history: state.history }, msg.messageId)
      return
    }
    // "evet" değil → flag temizlenir, mesaj normal Akif akışına düşer.
  }

  // 7. LLM-maliyet rate limit — spam guard'dan AYRI, telefon bazlı.
  if (!check('wa-akif:' + msg.from, RATE_LIMITS.AKIF_WHATSAPP_TURN).ok) {
    await deps.sendText(msg.from, 'Çok sık soru sordun, biraz bekle.')
    return
  }

  // 8. Aylık bütçe guard.
  const mb = await deps.checkMonthlyBudget()
  if (!mb.ok) {
    await deps.sendText(msg.from, 'Akif şu an kapalı, birazdan tekrar dener misin?')
    return
  }

  // 9. Tur akışı.
  let turn: AkifTurn
  try {
    turn = await runAkifTurn(
      {
        conversationId: 'wa:' + msg.from,
        history: state.history,
        userMessage: text,
        extraSystemPrompt: deps.toolPolicy,
      },
      {
        model: deps.model,
        modelName: deps.modelName,
        dispatch: deps.dispatch,
        validateArgs: deps.validateArgs,
        audit: deps.audit,
        checkConversationBudget: deps.checkConversationBudget,
        now: deps.now,
      },
    )
  } catch (e) {
    console.error('[wa-akif] turn', e)
    await deps.sendText(msg.from, 'Şu an sana yardımcı olamıyorum, birazdan tekrar dener misin?')
    return
  }

  // 10. Yanıt oluştur — ParcelCard resolved ise renderCard + (gerekirse) abone daveti eklenir.
  let outgoing = turn.speech
  let newAwaitingFollowup: WaAkifState['awaitingFollowup']
  const card = turn.tool_result
  if (card && card.kind === 'parcel' && card.status === 'resolved' && card.dto && card.siteUrl) {
    outgoing += '\n\n' + renderCard(card.dto, card.siteUrl)
    const { il, ilce, mahalle } = card.dto.parcel
    if (!(await deps.hasSubscription(msg.from, il, ilce, mahalle))) {
      outgoing += '\n\n' + renderFollowup.prompt(mahalle)
      newAwaitingFollowup = { il, ilce, mahalle }
    }
  }
  await deps.sendText(msg.from, outgoing)

  // 11. History + state kaydet.
  const newHistory: AkifMessage[] = [
    ...state.history,
    { role: 'user', content: text },
    { role: 'akif', content: turn.speech },
  ].slice(-MAX_HISTORY)
  await deps.store.saveConversation(
    msg.from,
    newAwaitingFollowup ? { history: newHistory, awaitingFollowup: newAwaitingFollowup } : { history: newHistory },
    msg.messageId,
  )
}
```

- [ ] **Step 7: Run tests, verify they pass**

Run: `npx jest src/lib/whatsapp/__tests__/akifHandleMessage.test.ts src/lib/whatsapp/__tests__/conversation.test.ts`
Expected: all PASS.

- [ ] **Step 8: `npx tsc --noEmit`** → 0 errors. (`handleMessage.ts` still imports the now-generic `createPrismaConversationStore` from `conversation.ts` with its old `ConvState`-shaped usage via `route.ts`'s `buildHandleDeps()` — TypeScript should still infer `T = ConvState` there via the existing call site's context, since `handleMessage.ts` is not deleted until Task 7. If tsc reports an inference error at that call site, add an explicit `createPrismaConversationStore<ConvState>(prisma)` type argument at that one call site as a minimal fix, and note it in your report.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/whatsapp/conversation.ts src/lib/whatsapp/akifHandleMessage.ts src/lib/whatsapp/__tests__/akifHandleMessage.test.ts src/lib/whatsapp/__tests__/conversation.test.ts
git commit -m "feat(akif-5): conversation.ts genericleştirildi + yeni akifHandleMessage.ts"
```

---

### Task 6: Wire `route.ts` to the new handler

**Files:**
- Modify: `src/app/api/whatsapp/webhook/route.ts`
- Test: `src/app/api/whatsapp/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `runWhatsappAkifTurn`, `AkifHandleDeps` (Task 5); `WA_AKIF_TOOL_DEFS`, `validateArgsWa`, `dispatchToolWa`, `WaDispatchDeps` (Task 4); `createAkifModel({client, model, toolDefs})` (Task 2); `createAuditLogger(db, {conversationIdPrefix})` (Task 2); `readAkifEnv`, `numEnv` (existing, `openaiClient.ts`); `checkConversationBudget`, `checkMonthlyBudget` (existing, `costGuard.ts`).

- [ ] **Step 1: Write the failing tests**

In `src/app/api/whatsapp/webhook/__tests__/route.test.ts`, change the mock at the top: replace

```ts
jest.mock('@/lib/whatsapp/handleMessage', () => ({ handleMessage: (...a: unknown[]) => handleMessageMock(...a) }))
```

with

```ts
jest.mock('@/lib/whatsapp/akifHandleMessage', () => ({ runWhatsappAkifTurn: (...a: unknown[]) => handleMessageMock(...a) }))
```

Add the new mocks the deps builder now needs (alongside the existing `jest.mock` calls):

```ts
jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    chat = {}
  },
}))
jest.mock('@/lib/ai/akif/openaiClient', () => ({
  readAkifEnv: () => ({ apiKey: 'sk-x', model: 'gpt-4o-mini', maxTurnTokens: 6000, monthlyBudgetUsd: 20 }),
  numEnv: (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : fallback
  },
  createAkifModel: () => ({ chatWithTools: jest.fn(), finalStructured: jest.fn() }),
}))
jest.mock('@/lib/ai/akif/audit', () => ({
  createAuditLogger: () => ({ logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) }),
}))
jest.mock('@/lib/ai/akif/costGuard', () => ({
  checkConversationBudget: jest.fn().mockReturnValue({ ok: true }),
  checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: true, spent: 0 }),
}))
```

Rename every `handleMessageMock` reference in the rest of the file's assertions to keep referring to the same variable (the `const handleMessageMock = jest.fn()` declaration at the top stays as-is — only the module it's wired to changes, per the `jest.mock` edit above). No other test bodies need to change: the route's own signature-verification/JSON-parse/`after()`-wrapping behavior is untouched, so every existing assertion (`expect(handleMessageMock).toHaveBeenCalledTimes(1)`, the `mock.calls[0][0]` shape check, etc.) still applies to whichever function is now wired in.

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/app/api/whatsapp/webhook/__tests__/route.test.ts`
Expected: FAIL — `route.ts` still imports `handleMessage`/`ruleBasedUnderstanding`, not the new modules; the new mocks target modules the route doesn't use yet.

- [ ] **Step 3: Implement**

Replace `src/app/api/whatsapp/webhook/route.ts` in full:

```ts
import { after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import OpenAI from 'openai'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { verifySignature } from '@/lib/whatsapp/verifySignature'
import { parseInbound } from '@/lib/whatsapp/parseInbound'
import { runWhatsappAkifTurn, type AkifHandleDeps } from '@/lib/whatsapp/akifHandleMessage'
import { createPrismaConversationStore } from '@/lib/whatsapp/conversation'
import { WA_AKIF_TOOL_DEFS, validateArgsWa, dispatchToolWa, type WaDispatchDeps } from '@/lib/whatsapp/akifToolGateway'
import { AKIF_WHATSAPP_TOOL_POLICY } from '@/lib/whatsapp/akifToolPolicy'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { buildDegerCard } from '@/lib/deger/card'
import { createAnonCardDeps } from '@/lib/deger/anonCardDeps'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { readAkifEnv, numEnv, createAkifModel } from '@/lib/ai/akif/openaiClient'
import { createAuditLogger, type AuditDb } from '@/lib/ai/akif/audit'
import { checkConversationBudget, checkMonthlyBudget } from '@/lib/ai/akif/costGuard'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export async function GET(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const u = new URL(req.url)
  if (
    u.searchParams.get('hub.mode') === 'subscribe' &&
    safeEqual(u.searchParams.get('hub.verify_token') ?? '', config.verifyToken)
  ) {
    return new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('forbidden', { status: 403 })
}

function readWhatsappMonthlyBudgetUsd(): number {
  return numEnv(process.env.AKIF_WHATSAPP_MONTHLY_BUDGET_USD, 20)
}

function buildAkifWhatsappDeps(): AkifHandleDeps {
  const config = readWhatsappConfig()
  const env = readAkifEnv()
  const db = prisma as unknown as AuditDb & WaDispatchDeps['db']
  const audit = createAuditLogger(db, { conversationIdPrefix: 'wa:' })
  const openai = new OpenAI({ apiKey: env.apiKey })
  const model = createAkifModel({ client: openai, model: env.model, toolDefs: WA_AKIF_TOOL_DEFS })

  // Paylaşılan `DegerCardDeps` çekirdeği (5a/5b ile ortak, WhatsApp bot trend/demografi göstermez).
  const cardDeps = {
    ...createAnonCardDeps(),
    findAreaTrend: async () => [],
    findDistrictDemographics: async () => null,
  }
  const nk = (il: string, ilce: string, mahalle: string) => ({
    il: normalizeAreaName(il),
    ilce: normalizeAreaName(ilce),
    mahalle: normalizeAreaName(mahalle),
  })

  return {
    store: createPrismaConversationStore(prisma),
    model,
    modelName: env.model,
    dispatch: (n, a) =>
      dispatchToolWa(n, a, {
        db,
        lookupParcelDeps: {
          resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi },
          buildCard: (mahalleId, ada, parsel) =>
            buildDegerCard({ kind: 'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: false }),
          siteUrlFor: (f) =>
            `https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}`,
        },
      }),
    validateArgs: validateArgsWa,
    audit,
    checkConversationBudget: (m) => checkConversationBudget(m, env.maxTurnTokens),
    checkMonthlyBudget: () =>
      checkMonthlyBudget({
        monthSpendUsd: audit.monthSpendUsd,
        budgetUsd: readWhatsappMonthlyBudgetUsd(),
        now: () => new Date(),
      }),
    sendText: createSendText({ fetch, config }),
    hasSubscription: async (phone, il, ilce, mahalle) => {
      const k = nk(il, ilce, mahalle)
      const row = await prisma.whatsappSubscription.findUnique({
        where: { phone_il_ilce_mahalle: { phone, ...k } },
        select: { id: true },
      })
      return !!row
    },
    upsertSubscription: async (phone, area) => {
      const k = nk(area.il, area.ilce, area.mahalle)
      await prisma.whatsappSubscription.upsert({
        where: { phone_il_ilce_mahalle: { phone, ...k } },
        create: { phone, ...k },
        update: {},
      })
    },
    deleteSubscriptions: async (phone) => {
      const r = await prisma.whatsappSubscription.deleteMany({ where: { phone } })
      return r.count
    },
    toolPolicy: AKIF_WHATSAPP_TOOL_POLICY,
    now: () => new Date(),
  }
}

export async function POST(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const raw = await req.text()
  if (!verifySignature(raw, config.appSecret, req.headers.get('x-hub-signature-256'))) {
    return new Response('forbidden', { status: 403 })
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('ok', { status: 200 })
  }
  const messages = parseInbound(payload)
  for (const m of messages) {
    after(async () => {
      try {
        await runWhatsappAkifTurn(m, buildAkifWhatsappDeps())
      } catch (e) {
        console.error('[wa-akif] handle', e)
      }
    })
  }
  return new Response('ok', { status: 200 })
}
```

`AKIF_WHATSAPP_TOOL_POLICY` flows into `AkifHandleDeps.toolPolicy` (already part of the interface from Task 5) → `runAkifTurn`'s `extraSystemPrompt` (already wired in Task 5's implementation) — no further changes needed to `akifHandleMessage.ts` in this task.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx jest src/app/api/whatsapp/webhook/__tests__/route.test.ts src/lib/whatsapp/__tests__/akifHandleMessage.test.ts`
Expected: all PASS.

- [ ] **Step 5: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 6: `npm run build`** → clean, `ƒ /api/whatsapp/webhook` present in output.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/whatsapp/webhook/route.ts src/app/api/whatsapp/webhook/__tests__/route.test.ts src/lib/whatsapp/akifHandleMessage.ts src/lib/whatsapp/__tests__/akifHandleMessage.test.ts
git commit -m "feat(akif-5): webhook route yeni Akif handler'a bağlandı"
```

---

### Task 7: Delete dead code from the old rule-based flow

**Files:**
- Delete: `src/lib/whatsapp/handleMessage.ts`, `src/lib/whatsapp/__tests__/handleMessage.test.ts`
- Delete: `src/lib/whatsapp/understanding.ts`, `src/lib/whatsapp/__tests__/understanding.test.ts`
- Delete: `src/lib/whatsapp/extractParcelQuery.ts`, `src/lib/whatsapp/__tests__/extractParcelQuery.test.ts`
- Modify: `src/lib/whatsapp/conversation.ts` (remove `mergeFields`)
- Modify: `src/lib/whatsapp/types.ts` (remove `ConvLevel`, `ConvState`, `ParsedQuery`)
- Modify: `src/lib/whatsapp/renderError.ts` (trim to `help`/`textOnly`/`rateLimited`)
- Test: check for any test file referencing the trimmed `renderError` functions

**Interfaces:**
- Removes: `handleMessage`, `HandleDeps`, `QueryUnderstanding`, `ruleBasedUnderstanding`, `extractParcelQuery`, `mergeFields`, `ConvLevel`, `ConvState`, `ParsedQuery`, `renderError.askFor/chooseFrom/notFound/forCardFailure`.

- [ ] **Step 1: Confirm nothing else references what's about to be deleted**

Run these greps and read every match before proceeding — do not delete a symbol still referenced somewhere unexpected:

```bash
grep -rn "handleMessage\|ruleBasedUnderstanding\|QueryUnderstanding\|extractParcelQuery" src --include="*.ts" --include="*.tsx" -l
grep -rn "mergeFields\|ConvState\|ConvLevel\|ParsedQuery" src --include="*.ts" --include="*.tsx" -l
grep -rn "renderError\." src --include="*.ts" --include="*.tsx"
```

Expected: the first two greps should only list the files this task is about to delete or modify (plus `route.ts`, which Task 6 already stopped importing them from — confirm `route.ts` has no remaining reference). The third grep's results tell you exactly which `renderError.*` functions are still called anywhere — cross-check against `askFor`/`chooseFrom`/`notFound`/`forCardFailure`; if any of those four still has a live caller outside the files being deleted, STOP and do not remove that specific function from `renderError.ts` (note the exception in your report and keep it) — the other three (or whichever remain unreferenced) still get trimmed.

- [ ] **Step 2: Delete the fully-dead files**

```bash
git rm src/lib/whatsapp/handleMessage.ts src/lib/whatsapp/__tests__/handleMessage.test.ts
git rm src/lib/whatsapp/understanding.ts src/lib/whatsapp/__tests__/understanding.test.ts
git rm src/lib/whatsapp/extractParcelQuery.ts src/lib/whatsapp/__tests__/extractParcelQuery.test.ts
```

- [ ] **Step 3: Trim `conversation.ts`**

Remove the `mergeFields` function and its `ConvFields` import reference from the top of the file (keep the `TTL_MS`/`ConversationStore`/`createPrismaConversationStore` exports from Task 5 exactly as they are). If `conversation.ts` no longer imports anything from `./types` after removing `mergeFields` (check — `ConversationStore<T>`/`createPrismaConversationStore<T>` from Task 5 are already fully generic and don't reference `./types` at all), remove the now-unused `import type { ConvFields, ConvState } from './types'` line entirely.

- [ ] **Step 4: Trim `types.ts`**

Remove `ConvLevel`, `ConvState`, and `ParsedQuery` from `src/lib/whatsapp/types.ts`. Keep `AreaLevel`, `InboundMessage`, `ConvFields`, `AreaOption`, `ResolveResult` exactly as they are (all still used by `resolveLocation.ts`, `matchAreaName.ts`, and `lookupParcel.ts`).

- [ ] **Step 5: Trim `renderError.ts`**

Per Step 1's findings, remove whichever of `askFor`/`chooseFrom`/`notFound`/`forCardFailure` have no remaining caller. If all four are confirmed dead, replace the file with:

```ts
const HELP = 'Merhaba! Bir arsanın değerini öğrenmek için konumu ve ada/parsel numarasını yaz. Örnek: `Trabzon Ortahisar Uğurlu 123/45`'

export const renderError = {
  help: () => HELP,
  textOnly: () => 'Şimdilik sadece yazılı mesaj anlayabiliyorum. ' + HELP,
  rateLimited: () => 'Çok fazla sorgu geldi, 1 dakika sonra tekrar dener misin?',
}
```

If Step 1 found a live caller for one of the four, keep that specific function (and whatever `AreaLevel`/`AreaOption`/`ConvFields` types it still needs from `types.ts` — do not remove those from `types.ts` in Step 4 if this step still needs them) and remove only the confirmed-dead ones.

- [ ] **Step 6: Check `renderError.test.ts` and any other now-orphaned test files**

Read `src/lib/whatsapp/__tests__/renderError.test.ts` — remove test cases for the functions deleted in Step 5, keep test cases for `help`/`textOnly`/`rateLimited` (and any function Step 5 kept for a live caller) unchanged.

- [ ] **Step 7: Run the full whatsapp + akif test scope, verify green**

Run: `npx jest src/lib/whatsapp src/app/api/whatsapp src/lib/ai/akif src/app/api/akif`
Expected: all PASS, no suite references a deleted file.

- [ ] **Step 8: `npx tsc --noEmit`** → 0 errors.

- [ ] **Step 9: `npm run build`** → clean.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore(akif-5): eski rule-based WhatsApp akışının ölü kodu silindi"
```

---

### Task 8: Human smoke-test checklist

**Files:**
- Modify: `docs/akif/akif-2-insan-duman-kontrol-listesi.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Append the Akif-5 section**

Append to the end of the file, matching its existing `##`/`- [ ]` style:

```markdown

## Akif-5 (WhatsApp entegrasyonu)

Gerçek Meta webhook + gerçek telefon numarası gerektirir — hiçbir otomatik test bunu simüle edemez.

- [ ] Gerçek numaraya "merhaba" yaz → Akif serbest sohbetle karşılık verir (eski "hangi il?" state machine'i YOK)
- [ ] "Trabzon Ortahisar Uğurlu 123/45" gibi tam bir sorgu yaz → gerçek Değer Kartı (renderCard formatında) + kısa Akif girişi gelir
- [ ] Belirsiz bir mahalle adı yaz → Akif adayları kendi cümleleriyle sorar, numaralı liste DEĞİL
- [ ] Kart geldikten sonra "evet" yaz → "takibe alındı" mesajı + `WhatsappSubscription` tablosunda satır oluşur
- [ ] DURDUR yaz → abonelikler silinir, Akif'e hiç gitmeden anında yanıt gelir
- [ ] Bir terim sor ("emsal nedir?") → Akif açıklar (lookupParcel'e gitmeden)
- [ ] Aynı numaradan hızlıca çok mesaj gönder → önce spam guard (WHATSAPP_INBOUND), sonra (eğer aşarsa) AKIF_WHATSAPP_TURN limiti devreye girer
- [ ] `AkifTurnLog`'da `conversationId` alanı `wa:<telefon>` formatında satırlar oluştuğunu doğrula (Coolify DB'den)
```

- [ ] **Step 2: Commit**

```bash
git add docs/akif/akif-2-insan-duman-kontrol-listesi.md
git commit -m "docs(akif-5): insan duman kontrol listesine WhatsApp bölümü eklendi"
```

---

## Final verification (after Task 8)

- [ ] Run the full suite: `npx jest` → all green, no regressions outside the files touched above.
- [ ] `npx tsc --noEmit` (project-wide) → 0 errors.
- [ ] `npm run build` → clean.
- [ ] Confirm no remaining reference to any deleted symbol: `grep -rn "handleMessage\|ruleBasedUnderstanding\|extractParcelQuery\|mergeFields" src --include="*.ts" --include="*.tsx"` → only matches inside `akifHandleMessage.ts`'s own name (`handleMessage` substring) or nothing.
- [ ] Hand off to `finishing-a-development-branch` per this project's usual pattern (this branch stays local/unpushed).
