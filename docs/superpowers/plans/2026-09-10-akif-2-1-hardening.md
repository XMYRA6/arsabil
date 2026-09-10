# Akif-2.1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two deferred Akif-2 final-review findings — server-side voice-session registry (griefing fix) and transcript-preserving mid-session reconnect.

**Architecture:** A new `AkifVoiceSession` Prisma row is written when `/api/akif/voice/session` mints a session and finalized when `/usage` reports it; `/usage` and `/tool` verify the caller owns the session before touching the DB. `useRealtimeVoice` gains one automatic reconnect that reuses the same `sessionId` (so billing stays one row) and re-seeds the fresh Realtime session with a compact client-built summary.

**Tech Stack:** Next.js 16 App Router (route handlers, `runtime = 'nodejs'`), Prisma + PostgreSQL, React 19 hooks, WebRTC, Jest + Testing Library (jsdom for hooks/components).

**Spec:** `docs/superpowers/specs/2026-09-10-akif-2-1-hardening-design.md`

## Global Constraints

- Branch `codex/professional-ui-and-land-cost`; **no push/deploy** — migration is dev-only (`prisma migrate dev`), joins the unapplied Akif batch.
- Migrations in this repo are **hand-written** SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` (see `20260909140654_add_akif_voice_logs`).
- Route handlers narrow `prisma` with `as unknown as <DI interface>` — never import `PrismaClient` types directly. Do **not** rely on `npx prisma generate` succeeding (Windows EPERM is known); DI interfaces make it unnecessary for `tsc`.
- `AkifVoiceSessionLog` schema and the F-C cost-clamp logic in `/usage` (`usageCap = sessionMaxSec * 200`, duration clamp, `startedAtMs` 24h window) **must not change** — only add around them.
- Every task ends green: `npx tsc --noEmit` 0 errors, the task's jest files pass, and (Tasks 3-9) `npm run build` clean.
- Turkish is the code-comment / UI-copy language, matching surrounding files.
- Do not touch `toolRegistry` / `gateway` / `orchestrator` / `voiceCost` / `voiceQuota` / `voiceEvents` / `voiceToolBridge` / `realtimeSession` — Akif-1 and Akif-2 suites must stay fully green.

---

### Task 1: Prisma model + dev migration

**Files:**
- Modify: `prisma/schema.prisma` (add model next to `AkifVoiceSessionLog`, ~line 541)
- Create: `prisma/migrations/<timestamp>_add_akif_voice_session/migration.sql`

**Interfaces:**
- Consumes: nothing
- Produces: table `AkifVoiceSession(id TEXT PK, userId TEXT, status TEXT default 'active', reconnectCount INT default 0, createdAt TIMESTAMP(3) default now, endedAt TIMESTAMP(3) null)` + index `(userId, createdAt)`

- [ ] **Step 1: Add the model to `schema.prisma`**

```prisma
model AkifVoiceSession {
  id             String    @id
  userId         String
  status         String    @default("active")
  reconnectCount Int       @default(0)
  createdAt      DateTime  @default(now())
  endedAt        DateTime?

  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Create the migration SQL**

Pick a timestamp after the last migration (`20260909140654`), e.g. `20260910120000`. Create `prisma/migrations/20260910120000_add_akif_voice_session/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AkifVoiceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reconnectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AkifVoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifVoiceSession_userId_createdAt_idx" ON "AkifVoiceSession"("userId", "createdAt");
```

- [ ] **Step 3: Apply to dev DB**

Run: `npx prisma migrate deploy`
Expected: `1 migration applied` (the new one). If the dev Postgres container isn't running, start it: `npm run dev:db` then retry.
Then: `npx prisma migrate status` → "Database schema is up to date!"

- [ ] **Step 4: Regenerate client (best-effort)**

Run: `npx prisma generate`
Expected: success, OR Windows `EPERM` on `.prisma/client` — if EPERM, continue (DI interfaces don't need it; note it in the commit body).

- [ ] **Step 5: Verify tsc still clean**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260910120000_add_akif_voice_session
git commit -m "feat(akif-2.1): AkifVoiceSession modeli + dev migration"
```

---

### Task 2: `voiceSession.ts` — registry helpers (pure, DI)

**Files:**
- Create: `src/lib/ai/akif/voice/voiceSession.ts`
- Test: `src/lib/ai/akif/voice/__tests__/voiceSession.test.ts`

**Interfaces:**
- Consumes: `ToolResultCard` not needed here; only a DI db shape.
- Produces:
  - `interface VoiceSessionRow { id: string; userId: string; status: string; reconnectCount: number; createdAt: Date }`
  - `interface VoiceSessionDb { akifVoiceSession: { findUnique(a:{where:{id:string}}): Promise<VoiceSessionRow|null>; create(a:{data:{id:string;userId:string}}): Promise<unknown>; update(a:{where:{id:string};data:Record<string,unknown>}): Promise<unknown>; updateMany(a:{where:Record<string,unknown>;data:Record<string,unknown>}): Promise<unknown> } }`
  - `const STALE_SLACK_SEC = 60`
  - `type VoiceSessionCheck = { ok: true; status: 'active' | 'ended' } | { ok: false; code: 'unknown_session' | 'forbidden_session' }`
  - `type ResumeResolution = { ok: true } | { ok: false; reason: 'not_found' | 'forbidden' | 'not_active' | 'already_reconnected' | 'stale' }`
  - `createVoiceSession(db: VoiceSessionDb, id: string, userId: string): Promise<void>`
  - `endStaleCallerSessions(db: VoiceSessionDb, userId: string, now: Date, sessionMaxSec: number): Promise<void>`
  - `checkVoiceSessionOwner(db: VoiceSessionDb, sessionId: string, userId: string): Promise<VoiceSessionCheck>`
  - `resolveResumableSession(db: VoiceSessionDb, sessionId: string, userId: string, now: Date, sessionMaxSec: number): Promise<ResumeResolution>`
  - `bumpReconnectCount(db: VoiceSessionDb, sessionId: string): Promise<void>`
  - `endVoiceSession(db: VoiceSessionDb, sessionId: string, now: Date): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/akif/voice/__tests__/voiceSession.test.ts`:

```ts
import {
  createVoiceSession,
  endStaleCallerSessions,
  checkVoiceSessionOwner,
  resolveResumableSession,
  bumpReconnectCount,
  endVoiceSession,
  STALE_SLACK_SEC,
  type VoiceSessionRow,
} from '../voiceSession'

function makeDb(row: VoiceSessionRow | null) {
  return {
    findUnique: jest.fn().mockResolvedValue(row),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    updateMany: jest.fn().mockResolvedValue(undefined),
  }
}
const wrap = (m: ReturnType<typeof makeDb>) => ({ akifVoiceSession: m }) as never

const base: VoiceSessionRow = {
  id: 's1',
  userId: 'u1',
  status: 'active',
  reconnectCount: 0,
  createdAt: new Date('2026-09-10T12:00:00Z'),
}
const now = new Date('2026-09-10T12:05:00Z') // 5 min later

it('createVoiceSession → create({data:{id,userId}})', async () => {
  const m = makeDb(null)
  await createVoiceSession(wrap(m), 's1', 'u1')
  expect(m.create).toHaveBeenCalledWith({ data: { id: 's1', userId: 'u1' } })
})

it('endStaleCallerSessions → updateMany with createdAt cutoff', async () => {
  const m = makeDb(null)
  await endStaleCallerSessions(wrap(m), 'u1', now, 600)
  const arg = m.updateMany.mock.calls[0][0]
  expect(arg.where).toMatchObject({ userId: 'u1', status: 'active' })
  const cutoff = arg.where.createdAt.lt as Date
  expect(cutoff.getTime()).toBe(now.getTime() - (600 + STALE_SLACK_SEC) * 1000)
  expect(arg.data).toMatchObject({ status: 'ended' })
})

it('checkVoiceSessionOwner: no row → unknown_session', async () => {
  expect(await checkVoiceSessionOwner(wrap(makeDb(null)), 's1', 'u1')).toEqual({
    ok: false,
    code: 'unknown_session',
  })
})

it('checkVoiceSessionOwner: wrong user → forbidden_session', async () => {
  expect(
    await checkVoiceSessionOwner(wrap(makeDb({ ...base, userId: 'other' })), 's1', 'u1'),
  ).toEqual({ ok: false, code: 'forbidden_session' })
})

it('checkVoiceSessionOwner: active row (even if old — no coercion) → status active', async () => {
  const old = { ...base, createdAt: new Date('2026-09-01T00:00:00Z') }
  expect(await checkVoiceSessionOwner(wrap(makeDb(old)), 's1', 'u1')).toEqual({
    ok: true,
    status: 'active',
  })
})

it('checkVoiceSessionOwner: ended row → status ended', async () => {
  expect(
    await checkVoiceSessionOwner(wrap(makeDb({ ...base, status: 'ended' })), 's1', 'u1'),
  ).toEqual({ ok: true, status: 'ended' })
})

it('resolveResumableSession: happy path → ok', async () => {
  expect(await resolveResumableSession(wrap(makeDb(base)), 's1', 'u1', now, 600)).toEqual({
    ok: true,
  })
})

it('resolveResumableSession: not found / forbidden / not_active / already_reconnected / stale', async () => {
  expect(await resolveResumableSession(wrap(makeDb(null)), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'not_found',
  })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, userId: 'x' })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'forbidden' })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, status: 'ended' })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'not_active' })
  expect(
    await resolveResumableSession(wrap(makeDb({ ...base, reconnectCount: 1 })), 's1', 'u1', now, 600),
  ).toEqual({ ok: false, reason: 'already_reconnected' })
  const stale = { ...base, createdAt: new Date('2026-09-10T11:40:00Z') } // 25 min old, max 600+60s
  expect(await resolveResumableSession(wrap(makeDb(stale)), 's1', 'u1', now, 600)).toEqual({
    ok: false,
    reason: 'stale',
  })
})

it('bumpReconnectCount → update increment', async () => {
  const m = makeDb(base)
  await bumpReconnectCount(wrap(m), 's1')
  expect(m.update).toHaveBeenCalledWith({
    where: { id: 's1' },
    data: { reconnectCount: { increment: 1 } },
  })
})

it('endVoiceSession → update status ended + endedAt', async () => {
  const m = makeDb(base)
  await endVoiceSession(wrap(m), 's1', now)
  const arg = m.update.mock.calls[0][0]
  expect(arg.where).toEqual({ id: 's1' })
  expect(arg.data.status).toBe('ended')
  expect((arg.data.endedAt as Date).getTime()).toBe(now.getTime())
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx jest src/lib/ai/akif/voice/__tests__/voiceSession.test.ts`
Expected: FAIL — `Cannot find module '../voiceSession'`.

- [ ] **Step 3: Write `voiceSession.ts`**

```ts
// Akif-2.1 — sunucu-taraflı sesli-oturum kaydı. Yaşam döngüsü + sahiplik.
// /session yazar, /usage finalize eder, /usage + /tool sahiplik doğrular.
// Maliyet kaydı ayrı: AkifVoiceSessionLog (voiceAudit.ts) — bu tablo onu değiştirmez.

export interface VoiceSessionRow {
  id: string
  userId: string
  status: string
  reconnectCount: number
  createdAt: Date
}

export interface VoiceSessionDb {
  akifVoiceSession: {
    findUnique(a: { where: { id: string } }): Promise<VoiceSessionRow | null>
    create(a: { data: { id: string; userId: string } }): Promise<unknown>
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>
    updateMany(a: {
      where: Record<string, unknown>
      data: Record<string, unknown>
    }): Promise<unknown>
  }
}

export const STALE_SLACK_SEC = 60

export type VoiceSessionCheck =
  | { ok: true; status: 'active' | 'ended' }
  | { ok: false; code: 'unknown_session' | 'forbidden_session' }

export type ResumeResolution =
  | { ok: true }
  | {
      ok: false
      reason: 'not_found' | 'forbidden' | 'not_active' | 'already_reconnected' | 'stale'
    }

function staleCutoff(now: Date, sessionMaxSec: number): Date {
  return new Date(now.getTime() - (sessionMaxSec + STALE_SLACK_SEC) * 1000)
}

export async function createVoiceSession(
  db: VoiceSessionDb,
  id: string,
  userId: string,
): Promise<void> {
  await db.akifVoiceSession.create({ data: { id, userId } })
}

export async function endStaleCallerSessions(
  db: VoiceSessionDb,
  userId: string,
  now: Date,
  sessionMaxSec: number,
): Promise<void> {
  await db.akifVoiceSession.updateMany({
    where: { userId, status: 'active', createdAt: { lt: staleCutoff(now, sessionMaxSec) } },
    data: { status: 'ended', endedAt: now },
  })
}

export async function checkVoiceSessionOwner(
  db: VoiceSessionDb,
  sessionId: string,
  userId: string,
): Promise<VoiceSessionCheck> {
  const row = await db.akifVoiceSession.findUnique({ where: { id: sessionId } })
  if (!row) return { ok: false, code: 'unknown_session' }
  if (row.userId !== userId) return { ok: false, code: 'forbidden_session' }
  return { ok: true, status: row.status === 'ended' ? 'ended' : 'active' }
}

export async function resolveResumableSession(
  db: VoiceSessionDb,
  sessionId: string,
  userId: string,
  now: Date,
  sessionMaxSec: number,
): Promise<ResumeResolution> {
  const row = await db.akifVoiceSession.findUnique({ where: { id: sessionId } })
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.userId !== userId) return { ok: false, reason: 'forbidden' }
  if (row.status !== 'active') return { ok: false, reason: 'not_active' }
  if (row.reconnectCount >= 1) return { ok: false, reason: 'already_reconnected' }
  if (new Date(row.createdAt) < staleCutoff(now, sessionMaxSec)) {
    return { ok: false, reason: 'stale' }
  }
  return { ok: true }
}

export async function bumpReconnectCount(db: VoiceSessionDb, sessionId: string): Promise<void> {
  await db.akifVoiceSession.update({
    where: { id: sessionId },
    data: { reconnectCount: { increment: 1 } },
  })
}

export async function endVoiceSession(
  db: VoiceSessionDb,
  sessionId: string,
  now: Date,
): Promise<void> {
  await db.akifVoiceSession.update({
    where: { id: sessionId },
    data: { status: 'ended', endedAt: now },
  })
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx jest src/lib/ai/akif/voice/__tests__/voiceSession.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/akif/voice/voiceSession.ts src/lib/ai/akif/voice/__tests__/voiceSession.test.ts
git commit -m "feat(akif-2.1): voiceSession registry helpers"
```

---

### Task 3: `/api/akif/voice/session` — mint registry + resume path

**Files:**
- Modify: `src/app/api/akif/voice/session/route.ts` (whole `POST`)
- Test: `src/app/api/akif/voice/session/__tests__/route.test.ts` (extend)

**Interfaces:**
- Consumes: `createVoiceSession`, `endStaleCallerSessions`, `resolveResumableSession`, `bumpReconnectCount`, `VoiceSessionDb` (Task 2); `createVoiceAuditLogger` / `VoiceAuditDb` (existing).
- Produces: response body unchanged shape `{ token, expiresAt, sessionId, model, sessionMaxSec }`. New: reads optional JSON body `{ resumeSessionId?: string }`. New status `409 { error: 'resume_denied', reason }`.

- [ ] **Step 1: Write the failing tests (extend existing file)**

Add to `src/app/api/akif/voice/session/__tests__/route.test.ts`. First extend the mocks block:

```ts
// add near the other jest.mock calls:
const createVoiceSessionMock = jest.fn()
const endStaleCallerSessionsMock = jest.fn()
const resolveResumableSessionMock = jest.fn()
const bumpReconnectCountMock = jest.fn()
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({
  createVoiceSession: (...a: unknown[]) => createVoiceSessionMock(...a),
  endStaleCallerSessions: (...a: unknown[]) => endStaleCallerSessionsMock(...a),
  resolveResumableSession: (...a: unknown[]) => resolveResumableSessionMock(...a),
  bumpReconnectCount: (...a: unknown[]) => bumpReconnectCountMock(...a),
}))
```

Extend the `createVoiceAuditLogger` mock to expose `voiceMonthSpendUsd`:

```ts
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({
    voiceMonthSpendUsd: jest.fn().mockResolvedValue(0),
    voiceUserMonthSeconds: jest.fn(),
  }),
}))
```

In `beforeEach` add: `resolveResumableSessionMock.mockResolvedValue({ ok: true })`.

Add a `resumeReq` helper and tests:

```ts
const resumeReq = (id: string) =>
  new Request('http://x/api/akif/voice/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeSessionId: id }),
  })

it('mint: kayıt satırı create edilir + bayat sweep çağrılır', async () => {
  const res = await POST(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(createVoiceSessionMock).toHaveBeenCalledWith(expect.anything(), body.sessionId, 'u1')
  expect(endStaleCallerSessionsMock).toHaveBeenCalled()
})

it('resume: geçerli → aynı sessionId + reconnect bump, quota kontrol edilmez', async () => {
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.sessionId).toBe('sess-abc')
  expect(bumpReconnectCountMock).toHaveBeenCalledWith(expect.anything(), 'sess-abc')
  expect(checkVoiceQuotaMock).not.toHaveBeenCalled()
  expect(createVoiceSessionMock).not.toHaveBeenCalled()
})

it('resume: resolveResumableSession reddeder → 409 resume_denied', async () => {
  resolveResumableSessionMock.mockResolvedValue({ ok: false, reason: 'already_reconnected' })
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('resume_denied')
})

it('resume: global bütçe aşıldı → 503, kullanıcı kotası aşıksa bile 200', async () => {
  // build an audit mock returning high spend just for this test
  const mod = jest.requireMock('@/lib/ai/akif/voice/voiceAudit') as {
    createVoiceAuditLogger: () => { voiceMonthSpendUsd: jest.Mock }
  }
  jest
    .spyOn(mod, 'createVoiceAuditLogger')
    .mockReturnValue({ voiceMonthSpendUsd: jest.fn().mockResolvedValue(999) } as never)
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(503)
})
```

> Note: if spying on the module object is awkward under this repo's jest config, instead make `voiceMonthSpendUsd` a module-level `jest.fn` (`const voiceMonthSpendUsdMock = jest.fn().mockResolvedValue(0)`) referenced by the `createVoiceAuditLogger` mock, and set `voiceMonthSpendUsdMock.mockResolvedValueOnce(999)` in the budget test. Use whichever the existing file style supports.

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx jest src/app/api/akif/voice/session`
Expected: new tests FAIL (resume path returns 200 with a random uuid / `createVoiceSessionMock` not called).

- [ ] **Step 3: Rewrite `session/route.ts` POST**

```ts
// Akif-2 — POST /api/akif/voice/session
// mint: rate-limit → auth → env → kota → token → AkifVoiceSession satırı → tarayıcı.
// resume: {resumeSessionId} → kaydı doğrula → yalnız global bütçe → taze token → aynı sessionId.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { readVoiceEnv, type VoiceEnvConfig } from '@/lib/ai/akif/voice/voiceEnv'
import { checkVoiceQuota } from '@/lib/ai/akif/voice/voiceQuota'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'
import { buildRealtimeSessionConfig } from '@/lib/ai/akif/voice/realtimeSession'
import {
  createVoiceSession,
  endStaleCallerSessions,
  resolveResumableSession,
  bumpReconnectCount,
  type VoiceSessionDb,
} from '@/lib/ai/akif/voice/voiceSession'

export const runtime = 'nodejs'

const TOKEN_TTL = '2m'

async function mintRealtimeToken(
  env: VoiceEnvConfig,
): Promise<{ value: string; expiresAt: number } | null> {
  const sessionConfig = buildRealtimeSessionConfig({ model: env.model, voiceName: env.voiceName })
  let upstream: Response
  try {
    upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires_after: { ttl: TOKEN_TTL }, session: sessionConfig }),
    })
  } catch (e) {
    console.error('[akif-voice] token fetch threw', e)
    return null
  }
  if (!upstream.ok) {
    console.error(
      '[akif-voice] token fetch not ok',
      upstream.status,
      await upstream.text().catch(() => ''),
    )
    return null
  }
  const data = (await upstream.json()) as { value?: string; expires_at?: number }
  if (!data.value) return null
  return { value: data.value, expiresAt: data.expires_at ?? 0 }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit('akif-voice:user:' + userId, RATE_LIMITS.AKIF_VOICE_SESSION)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  let env: VoiceEnvConfig
  try {
    env = readVoiceEnv()
  } catch {
    return Response.json({ error: 'akif_unavailable' }, { status: 503 })
  }

  // Opsiyonel gövde: {resumeSessionId} → resume yolu.
  let resumeSessionId: string | undefined
  try {
    const text = await req.text()
    if (text) {
      const parsed = JSON.parse(text) as { resumeSessionId?: unknown }
      if (typeof parsed?.resumeSessionId === 'string' && parsed.resumeSessionId) {
        resumeSessionId = parsed.resumeSessionId
      }
    }
  } catch {
    /* gövde yok / bozuk → mint */
  }

  const db = prisma as unknown as VoiceAuditDb & VoiceSessionDb
  const audit = createVoiceAuditLogger(db)
  const now = new Date()

  // --- resume yolu ---
  if (resumeSessionId) {
    const r = await resolveResumableSession(db, resumeSessionId, userId, now, env.sessionMaxSec)
    if (!r.ok) {
      return Response.json({ error: 'resume_denied', reason: r.reason }, { status: 409 })
    }
    const spent = await audit.voiceMonthSpendUsd(now)
    if (spent >= env.monthlyBudgetUsd) {
      return Response.json({ error: 'akif_unavailable', reason: 'monthly_budget' }, { status: 503 })
    }
    const token = await mintRealtimeToken(env)
    if (!token) return Response.json({ error: 'upstream' }, { status: 502 })
    await bumpReconnectCount(db, resumeSessionId)
    return Response.json({
      token: token.value,
      expiresAt: token.expiresAt,
      sessionId: resumeSessionId,
      model: env.model,
      sessionMaxSec: env.sessionMaxSec,
    })
  }

  // --- mint yolu ---
  const quota = await checkVoiceQuota(userId, {
    voiceMonthSpendUsd: audit.voiceMonthSpendUsd,
    voiceUserMonthSeconds: audit.voiceUserMonthSeconds,
    monthlyBudgetUsd: env.monthlyBudgetUsd,
    userMonthlyMinutes: env.userMonthlyMinutes,
    now: () => new Date(),
  })
  if (!quota.ok) {
    if (quota.reason === 'monthly_budget') {
      return Response.json({ error: 'akif_unavailable', reason: 'monthly_budget' }, { status: 503 })
    }
    return Response.json(
      { error: 'quota', reason: 'user_quota', remainingSec: quota.remainingSec },
      { status: 429 },
    )
  }

  await endStaleCallerSessions(db, userId, now, env.sessionMaxSec)

  const token = await mintRealtimeToken(env)
  if (!token) return Response.json({ error: 'upstream' }, { status: 502 })

  const sessionId = crypto.randomUUID()
  await createVoiceSession(db, sessionId, userId)

  return Response.json({
    token: token.value,
    expiresAt: token.expiresAt,
    sessionId,
    model: env.model,
    sessionMaxSec: env.sessionMaxSec,
  })
}
```

> `readVoiceEnv` currently has no exported `VoiceEnvConfig`? It does — `export interface VoiceEnvConfig` in `voiceEnv.ts`. Import it as shown.

- [ ] **Step 4: Run tests, verify pass**

Run: `npx jest src/app/api/akif/voice/session`
Expected: PASS — all old + new tests. (Old "mutlu yol" test still sees a string `sessionId`.)

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 tsc errors; build clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/akif/voice/session
git commit -m "feat(akif-2.1): /voice/session mint kaydı + resume yolu"
```

---

### Task 4: `/api/akif/voice/usage` — ownership guard + idempotent finalize

**Files:**
- Modify: `src/app/api/akif/voice/usage/route.ts`
- Test: `src/app/api/akif/voice/usage/__tests__/route.test.ts` (extend)

**Interfaces:**
- Consumes: `checkVoiceSessionOwner`, `endVoiceSession`, `VoiceSessionDb` (Task 2).
- Produces: new `403 { error: 'unknown_session' | 'forbidden_session' }`; `ended` session → `200 { ok: true }` with **no** `logVoiceSession` call. Happy path additionally calls `endVoiceSession`.

- [ ] **Step 1: Write failing tests (extend)**

Add mocks to `usage/__tests__/route.test.ts`:

```ts
const checkVoiceSessionOwnerMock = jest.fn()
const endVoiceSessionMock = jest.fn()
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({
  checkVoiceSessionOwner: (...a: unknown[]) => checkVoiceSessionOwnerMock(...a),
  endVoiceSession: (...a: unknown[]) => endVoiceSessionMock(...a),
}))
```

In `beforeEach`: `checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'active' })`.

Tests:

```ts
it('bilinmeyen session → 403, kayıt yazılmaz', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'unknown_session' })
  const res = await POST(body({}))
  expect(res.status).toBe(403)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
  expect(endVoiceSessionMock).not.toHaveBeenCalled()
})

it('başkasının session → 403', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'forbidden_session' })
  const res = await POST(body({}))
  expect(res.status).toBe(403)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('zaten ended session → 200, ikinci kez yazılmaz', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'ended' })
  const res = await POST(body({}))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('mutlu yol → logVoiceSession + endVoiceSession(status ended)', async () => {
  const res = await POST(body({}))
  expect(res.status).toBe(200)
  expect(logVoiceSessionMock).toHaveBeenCalled()
  expect(endVoiceSessionMock).toHaveBeenCalledWith(expect.anything(), 'sess-1', expect.any(Date))
})
```

The existing "forge just under cap" / "durationSec clamp" / etc. tests stay unchanged (they now pass through `checkVoiceSessionOwnerMock` default `{ ok: true, status: 'active' }`).

- [ ] **Step 2: Run, verify fail**

Run: `npx jest src/app/api/akif/voice/usage`
Expected: new tests FAIL (403 tests get 200; endVoiceSession never called).

- [ ] **Step 3: Edit `usage/route.ts`**

Add imports:

```ts
import {
  checkVoiceSessionOwner,
  endVoiceSession,
  type VoiceSessionDb,
} from '@/lib/ai/akif/voice/voiceSession'
```

Immediately after the `startedAtMs` sanity-window block (the `if (startedAtMs > now + 60_000 || startedAtMs < now - DAY_MS)` return), insert:

```ts
  const db = prisma as unknown as VoiceAuditDb & VoiceSessionDb
  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) {
    return Response.json({ error: owner.code }, { status: 403 })
  }
  if (owner.status === 'ended') {
    return Response.json({ ok: true })
  }
```

Then in the existing tail, the current code does:

```ts
  const db = prisma as unknown as VoiceAuditDb
  await createVoiceAuditLogger(db).logVoiceSession({ ... })
  return Response.json({ ok: true })
```

Change it to reuse the `db` declared above and finalize the registry row:

```ts
  await createVoiceAuditLogger(db).logVoiceSession({
    sessionId,
    userId,
    startedAt: new Date(startedAtMs),
    durationSec: roundedDuration,
    toolCalls: Math.max(0, Math.round(toolCalls)),
    estCostUsd,
    endReason: END_REASONS.has(String(endReason)) ? String(endReason) : 'error',
  })
  await endVoiceSession(db, sessionId, new Date())

  return Response.json({ ok: true })
```

(Delete the now-duplicate `const db = prisma as unknown as VoiceAuditDb` line further down.)

- [ ] **Step 4: Run, verify pass**

Run: `npx jest src/app/api/akif/voice/usage`
Expected: PASS — all old + new. The F-C forge test still asserts the clamp.

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/akif/voice/usage
git commit -m "feat(akif-2.1): /voice/usage sahiplik guard + idempotent finalize"
```

---

### Task 5: `/api/akif/voice/tool` — ownership guard + session_over

**Files:**
- Modify: `src/app/api/akif/voice/tool/route.ts`
- Test: `src/app/api/akif/voice/tool/__tests__/route.test.ts` (extend)

**Interfaces:**
- Consumes: `checkVoiceSessionOwner`, `VoiceSessionDb` (Task 2).
- Produces: new `403 { error: 'unknown_session' | 'forbidden_session' }` and `403 { error: 'session_over' }`. Happy path unchanged.

- [ ] **Step 1: Write failing tests (extend)**

Add mocks:

```ts
const checkVoiceSessionOwnerMock = jest.fn()
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({
  checkVoiceSessionOwner: (...a: unknown[]) => checkVoiceSessionOwnerMock(...a),
}))
```

`beforeEach`: `checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'active' })`.

Tests:

```ts
const okBody = { sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }

it('bilinmeyen session → 403', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'unknown_session' })
  const res = await POST(req(okBody))
  expect(res.status).toBe(403)
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('başkasının session → 403', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'forbidden_session' })
  const res = await POST(req(okBody))
  expect(res.status).toBe(403)
})

it('bitmiş session → 403 session_over', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'ended' })
  const res = await POST(req(okBody))
  expect(res.status).toBe(403)
  expect((await res.json()).error).toBe('session_over')
  expect(dispatchToolMock).not.toHaveBeenCalled()
})
```

Ensure `dispatchToolMock` has a default in `beforeEach` if not already: `dispatchToolMock.mockResolvedValue({ kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' })`.

- [ ] **Step 2: Run, verify fail**

Run: `npx jest src/app/api/akif/voice/tool`
Expected: new tests FAIL (403 → currently 200).

- [ ] **Step 3: Edit `tool/route.ts`**

Add import:

```ts
import { checkVoiceSessionOwner, type VoiceSessionDb } from '@/lib/ai/akif/voice/voiceSession'
```

Move the `db` declaration up (currently at ~line 69) to just after the body-shape validation (`if (typeof sessionId !== 'string' ...)` return), and widen its type:

```ts
  const db = prisma as unknown as VoiceAuditDb & DispatchDeps['db'] & VoiceSessionDb

  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) {
    return Response.json({ error: owner.code }, { status: 403 })
  }
  if (owner.status === 'ended') {
    return Response.json({ error: 'session_over' }, { status: 403 })
  }
```

Remove the later `const db = prisma as unknown as VoiceAuditDb & DispatchDeps['db']` line and keep using the one declared above (`const audit = createVoiceAuditLogger(db)` and `dispatchTool(name, args, { db })` unchanged).

- [ ] **Step 4: Run, verify pass**

Run: `npx jest src/app/api/akif/voice/tool`
Expected: PASS — old + new.

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/akif/voice/tool
git commit -m "feat(akif-2.1): /voice/tool sahiplik guard + session_over"
```

---

### Task 6: `voiceResume.ts` — `buildResumeContext` (pure)

**Files:**
- Create: `src/components/akif/voice/voiceResume.ts`
- Test: `src/components/akif/voice/__tests__/voiceResume.test.ts`

**Interfaces:**
- Consumes: `ToolResultCard` from `@/lib/ai/akif/contract` (union of `TermCard { kind:'term'; term; shortDef; example }` and `ScenarioCard { kind:'contractor_offers'|'apartment_sizes'; rows: ScenarioRow[]; ... }` where `ScenarioRow = { label; arsaPayiX: number; arsaSahibiDaireSayisi: number|null; arsaSahibiDegeriTL: number|null; daireSatisFiyatiTL: number }`).
- Produces:
  - `interface ResumeTranscriptItem { role: 'user' | 'akif'; text: string; card?: ToolResultCard }`
  - `buildResumeContext(transcript: ResumeTranscriptItem[]): string`
  - `const RESUME_MAX_TURNS = 8`

- [ ] **Step 1: Write failing test**

Create `src/components/akif/voice/__tests__/voiceResume.test.ts`:

```ts
import { buildResumeContext, type ResumeTranscriptItem } from '../voiceResume'

it('boş transkript → sarmalayıcı + "henüz konuşma yok"', () => {
  const out = buildResumeContext([])
  expect(out).toContain('Bağlantı koptu ve yeniden kuruldu')
  expect(out).toContain('henüz konuşma yok')
  expect(out).toContain('Kaldığın yerden devam et')
})

it('turları rol etiketiyle render eder, boş metinli/kart-only satırları atlar', () => {
  const t: ResumeTranscriptItem[] = [
    { role: 'user', text: '1200 metrekare arsam var' },
    { role: 'akif', text: 'Anladım, emsal kaç?' },
    { role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' } },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('Kullanıcı: 1200 metrekare arsam var')
  expect(out).toContain('Akif: Anladım, emsal kaç?')
  expect(out).toContain('("emsal" terimi açıklandı)')
})

it('son 8 turla sınırlar', () => {
  const t: ResumeTranscriptItem[] = Array.from({ length: 12 }, (_, i) => ({
    role: 'user' as const,
    text: `mesaj ${i}`,
  }))
  const out = buildResumeContext(t)
  expect(out).not.toContain('mesaj 3')
  expect(out).toContain('mesaj 4')
  expect(out).toContain('mesaj 11')
})

it('ScenarioCard tek satıra düzleşir, null alanlar "?"', () => {
  const t: ResumeTranscriptItem[] = [
    {
      role: 'akif',
      text: '',
      card: {
        kind: 'contractor_offers',
        rows: [
          {
            label: 'Müteahhit %50',
            arsaPayiX: 0.45,
            arsaSahibiDaireSayisi: null,
            arsaSahibiDegeriTL: null,
            daireSatisFiyatiTL: 3_000_000,
          },
        ],
        defaultsUsed: [],
        assumptions: [],
        emsalNote: '',
      },
    },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('Son hesap: contractor_offers')
  expect(out).toContain('"Müteahhit %50"')
  expect(out).toContain('%45')
  expect(out).toContain('? daire')
})

it('birden çok kart → sadece sonuncusu', () => {
  const t: ResumeTranscriptItem[] = [
    { role: 'akif', text: '', card: { kind: 'term', term: 'kaks', shortDef: 'x', example: 'y' } },
    { role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' } },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('"emsal" terimi açıklandı')
  expect(out).not.toContain('"kaks" terimi açıklandı')
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx jest src/components/akif/voice/__tests__/voiceResume.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `voiceResume.ts`**

```ts
// Akif-2.1 — yeniden bağlanmada yeni Realtime oturumuna verilecek kompakt bağlam.
// Saf fonksiyon; ek LLM çağrısı yok. İstemcideki transkript + son karttan üretilir.
import type { ToolResultCard } from '@/lib/ai/akif/contract'

export const RESUME_MAX_TURNS = 8

export interface ResumeTranscriptItem {
  role: 'user' | 'akif'
  text: string
  card?: ToolResultCard
}

function cardLine(card: ToolResultCard): string {
  if (card.kind === 'term') {
    return `("${card.term}" terimi açıklandı)`
  }
  const r = card.rows[0]
  if (!r) return `(Son hesap: ${card.kind})`
  const pct = Math.round(r.arsaPayiX * 100)
  const daire = r.arsaSahibiDaireSayisi ?? '?'
  const deger = r.arsaSahibiDegeriTL ?? '?'
  return `(Son hesap: ${card.kind}, ilk satır "${r.label}" — arsa payı %${pct}, sahibine ${daire} daire / ${deger} TL)`
}

export function buildResumeContext(transcript: ResumeTranscriptItem[]): string {
  const turns = transcript
    .filter((it) => it.text.trim().length > 0)
    .slice(-RESUME_MAX_TURNS)
    .map((it) => `${it.role === 'user' ? 'Kullanıcı' : 'Akif'}: ${it.text.trim()}`)

  const lastCard = [...transcript].reverse().find((it) => it.card)?.card

  const lines = ['[Bağlantı koptu ve yeniden kuruldu. Buraya kadarki konuşma:]']
  lines.push(turns.length ? turns.join('\n') : '(henüz konuşma yok)')
  if (lastCard) lines.push(cardLine(lastCard))
  lines.push('[Kaldığın yerden devam et. Kullanıcıya bilgileri baştan sordurma.]')
  return lines.join('\n')
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx jest src/components/akif/voice/__tests__/voiceResume.test.ts`
Expected: PASS.

- [ ] **Step 5: tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/akif/voice/voiceResume.ts src/components/akif/voice/__tests__/voiceResume.test.ts
git commit -m "feat(akif-2.1): buildResumeContext"
```

---

### Task 7: `useRealtimeVoice` — extract `establishConnection` (pure refactor)

**Files:**
- Modify: `src/components/akif/voice/useRealtimeVoice.ts`
- Test: `src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx` (no new tests — all existing must stay green)

**Interfaces:**
- Consumes: nothing new.
- Produces (internal, for Task 8): `establishConnection(sess: SessionInfo, opts: { resume: boolean; refetch: () => Promise<SessionInfo | null> }): Promise<boolean>` — creates the PC, wires handlers, runs the 2-attempt SDP loop, and on success starts the elapsed timer + sets status `listening` and returns `true`; on failure returns `false` **without** calling `stop()`. When `opts.resume` is true it must NOT reset `startedAtRef`/`transcript` and injects `buildResumeContext` on the data-channel `open` (wired in Task 8 — in this task `resume` is always `false`).

**Context:** This is a **behavior-preserving** extraction. The observable state machine, fetch call counts, beacon payloads, and timer semantics must be identical. The existing 11 tests in `useRealtimeVoice.test.tsx` are the acceptance gate.

- [ ] **Step 1: Run the existing suite to capture the green baseline**

Run: `npx jest src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`
Expected: PASS (11 tests). If not green, stop — the branch is already broken.

- [ ] **Step 2: Refactor `start()` — extract PC setup + SDP + timer into `establishConnection`**

In `useRealtimeVoice.ts`, add `SessionInfo` a `token` field usage note (it already has `token`). Introduce the helper as a `useCallback` defined **before** `start` (it needs `handleEvent`, `safeSend`, `stop`, `clearGrace`, `opts`, `fetchFn`). Replace lines ~285-404 of `start` with a call to it.

```ts
type RefetchSession = () => Promise<SessionInfo | null>

const establishConnection = useCallback(
  async (sess: SessionInfo, cfg: { resume: boolean; refetch: RefetchSession }): Promise<boolean> => {
    maxSecRef.current = sess.sessionMaxSec

    const pc = opts?.rtcFactory ? opts.rtcFactory() : new RTCPeerConnection()
    pcRef.current = pc
    pc.ontrack = (e: RTCTrackEvent) => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
        audioRef.current.autoplay = true
      }
      audioRef.current.srcObject = (e.streams && e.streams[0]) || null
      void audioRef.current.play?.().catch(() => {})
    }
    pc.onconnectionstatechange = () => {
      if (stoppedRef.current) return
      const st = pc.connectionState
      if (st === 'connected') {
        clearGrace()
        return
      }
      if (st === 'failed') {
        setErrorText('Bağlantı koptu.')
        stop('disconnect')
        return
      }
      if (st === 'disconnected') {
        if (graceTimerRef.current) return
        graceTimerRef.current = setTimeout(() => {
          graceTimerRef.current = null
          if (!stoppedRef.current && pcRef.current?.connectionState !== 'connected') {
            setErrorText('Bağlantı koptu.')
            stop('disconnect')
          }
        }, ICE_GRACE_MS)
      }
    }
    micStreamRef.current?.getTracks().forEach((tr) => pc.addTrack(tr, micStreamRef.current!))

    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.addEventListener('message', (e: MessageEvent) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(e.data)
      } catch {
        return
      }
      void handleEvent(parsed)
    })

    let offerSdp: string | undefined
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      offerSdp = offer.sdp
    } catch {
      return false
    }

    let connected = false
    let curToken = sess.token
    let curModel = sess.model
    for (let attempt = 0; attempt < 2 && !connected && !stoppedRef.current; attempt++) {
      if (attempt > 0) {
        const j = await cfg.refetch()
        if (!j) break
        curToken = j.token
        curModel = j.model
        sessionIdRef.current = j.sessionId
        if (stoppedRef.current) break
      }
      try {
        const sdpRes = await fetchFn(`${CALLS_URL}?model=${encodeURIComponent(curModel)}`, {
          method: 'POST',
          body: pc.localDescription?.sdp ?? offerSdp,
          headers: { Authorization: `Bearer ${curToken}`, 'Content-Type': 'application/sdp' },
        })
        if (!sdpRes.ok) throw new Error('sdp')
        const answer = await sdpRes.text()
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        connected = true
      } catch {
        /* retry veya vazgeç */
      }
    }

    if (!connected || stoppedRef.current) return false

    if (cfg.resume) {
      safeSend({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [{ type: 'input_text', text: resumeContextRef.current ?? '' }],
        },
      })
    }

    setStatus('listening')
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000)
      setElapsedSec(sec)
      if (!warnedRef.current && sec >= maxSecRef.current - WARN_BEFORE_SEC) {
        warnedRef.current = true
        safeSend({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [{ type: 'input_text', text: 'Süremiz doluyor, kısa bir kapanış yap.' }],
          },
        })
      }
      if (sec >= maxSecRef.current) stop('timeout')
    }, 1000)
    return true
  },
  [opts, fetchFn, handleEvent, safeSend, stop, clearGrace],
)
```

Add the ref used above near the other refs:

```ts
const resumeContextRef = useRef<string | null>(null)
```

Now rewrite the tail of `start()` (after `micStreamRef.current = mic` and setting `sessionIdRef`/`startedAtRef`):

```ts
    sessionIdRef.current = sess.sessionId
    startedAtRef.current = Date.now()

    const refetch: RefetchSession = async () => {
      try {
        const r = await fetchFn(SESSION_URL, { method: 'POST' })
        if (!r.ok) return null
        return (await r.json()) as SessionInfo
      } catch {
        return null
      }
    }

    const ok = await establishConnection(sess, { resume: false, refetch })
    if (!ok) {
      setStatus('error')
      setErrorText('Bağlantı kurulamadı, tekrar dene.')
      stop('error')
    }
  }, [status, opts, fetchFn, establishConnection, stop, clearGrace])
```

> The old inline `refetch` re-set `sessionIdRef.current = j.sessionId` inside the loop — preserved in `establishConnection`. The old code's separate `createOffer` failure branch set `'error'` + `stop('error')` + returned; now `establishConnection` returns `false` and `start` does the same thing. Net behavior identical.

- [ ] **Step 3: Run the existing suite**

Run: `npx jest src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`
Expected: PASS — all 11, unchanged. Pay attention to:
- "I6: SDP ilk deneme fail → ... sessionCalls===2" (refetch path)
- "I6: ICE disconnected → grace geçti → stop(disconnect)" (handler still wired)
- "timer: wrap-up at sessionMaxSec-60, timeout at sessionMaxSec"

If any fail, the extraction changed behavior — fix until identical. Do not modify the tests.

- [ ] **Step 4: Full voice + akif regression**

Run: `npx jest src/components/akif src/lib/ai/akif src/app/api/akif`
Expected: all green.

- [ ] **Step 5: tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/akif/voice/useRealtimeVoice.ts
git commit -m "refactor(akif-2.1): establishConnection çıkarımı (davranış değişmedi)"
```

---

### Task 8: `useRealtimeVoice` — `attemptReconnect` + `'reconnecting'` status

**Files:**
- Modify: `src/components/akif/voice/useRealtimeVoice.ts`
- Test: `src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx` (add tests)

**Interfaces:**
- Consumes: `establishConnection` (Task 7), `buildResumeContext` + `ResumeTranscriptItem` (Task 6).
- Produces: `VoiceStatus` gains `'reconnecting'`. Hook return shape unchanged (`{ status, transcript, elapsedSec, errorText, start, stop }`).

- [ ] **Step 1: Write failing tests (add to `useRealtimeVoice.test.tsx`)**

```ts
it('reconnect: connectionState=failed bir kez → reconnecting → listening, transkript korunur, aynı sessionId', async () => {
  let sessionBodies: (string | undefined)[] = []
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes('/api/akif/voice/session')) {
      sessionBodies.push(init?.body as string | undefined)
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  // seed a transcript turn
  await act(async () => {
    pc.dc.emit('message', {
      data: JSON.stringify({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: '1200 metrekare',
      }),
    })
  })

  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  // one resume call with resumeSessionId in the body
  const resumeBody = sessionBodies.find((b) => b && b.includes('resumeSessionId'))
  expect(resumeBody).toBeTruthy()
  expect(JSON.parse(resumeBody as string)).toEqual({ resumeSessionId: 'sess-1' })
  // transcript preserved
  expect(result.current.transcript.some((t) => t.text.includes('1200 metrekare'))).toBe(true)
  // resume context injected on the new data channel
  expect(pc.dc.sent.some((s) => s.includes('Bağlantı koptu ve yeniden kuruldu'))).toBe(true)
})

it('reconnect: ikinci kopma → error + stop(disconnect)', async () => {
  let pc!: FakePC
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('idle'))
  const beaconCall = sendBeaconMock.mock.calls.find((c) =>
    String(c[0]).includes('/api/akif/voice/usage'),
  )
  expect(JSON.parse(beaconCall![1] as string)).toMatchObject({ endReason: 'disconnect' })
})

it('reconnect: resume 409 → error', async () => {
  let pc!: FakePC
  let sessionCalls = 0
  const fetchSpy = jest.fn(async (url: string) => {
    if (String(url).includes('/api/akif/voice/session')) {
      sessionCalls++
      if (sessionCalls >= 2) return { ok: false, status: 409, json: async () => ({}) } as never
      return {
        ok: true,
        json: async () => ({
          token: 'ek_1',
          sessionId: 'sess-1',
          model: 'gpt-realtime-mini',
          sessionMaxSec: 600,
        }),
      } as never
    }
    return { ok: true, text: async () => 'answer-sdp' } as never
  })
  const { result } = renderHook(() =>
    useRealtimeVoice({
      rtcFactory: () => {
        pc = new FakePC()
        return pc as unknown as RTCPeerConnection
      },
      fetchFn: fetchSpy as never,
    }),
  )
  await act(async () => {
    await result.current.start()
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  await act(async () => {
    pc.setConnState('failed')
  })
  await waitFor(() => expect(result.current.status).toBe('idle'))
})
```

> Check `voiceEvents.ts` for the exact event shape that produces a `user` transcript item (`conversation.item.input_audio_transcription.completed` → `user_transcript`). If the real parser key differs, use the shape the existing "tool_call" test uses as the template for a user turn. The assertion that matters is *transcript survives the reconnect*.

- [ ] **Step 2: Run, verify fail**

Run: `npx jest src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx -t reconnect`
Expected: FAIL — `'failed'` currently goes straight to `stop('disconnect')`; status becomes `idle`, no resume call.

- [ ] **Step 3: Implement reconnect**

In `useRealtimeVoice.ts`:

1. Extend the status type:

```ts
export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'reconnecting'
```

2. Add refs near the others:

```ts
const reconnectedRef = useRef(false)
const reconnectRef = useRef<null | (() => void)>(null)
```

3. In `start()`'s ref-reset block, also reset:

```ts
reconnectedRef.current = false
resumeContextRef.current = null
```

4. Define `attemptReconnect` as a `useCallback` **after** `establishConnection` (it uses it):

```ts
const attemptReconnect = useCallback(async () => {
  if (stoppedRef.current || reconnectedRef.current) return
  reconnectedRef.current = true
  clearGrace()
  try {
    pcRef.current?.close()
  } catch {
    /* noop */
  }
  dcRef.current = null
  setStatus('reconnecting')

  // İstemcideki transkriptten kompakt bağlam kur (state closure yerine ref'ten en güncel).
  resumeContextRef.current = buildResumeContext(
    transcriptRef.current as ResumeTranscriptItem[],
  )

  let sess: SessionInfo
  try {
    const res = await fetchFn(SESSION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeSessionId: sessionIdRef.current }),
    })
    if (!res.ok) {
      setErrorText('Bağlantı koptu.')
      stop('disconnect')
      return
    }
    sess = (await res.json()) as SessionInfo
  } catch {
    setErrorText('Bağlantı koptu.')
    stop('disconnect')
    return
  }
  if (stoppedRef.current) return

  const refetch: RefetchSession = async () => {
    try {
      const r = await fetchFn(SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeSessionId: sessionIdRef.current }),
      })
      if (!r.ok) return null
      return (await r.json()) as SessionInfo
    } catch {
      return null
    }
  }

  const ok = await establishConnection(sess, { resume: true, refetch })
  if (!ok && !stoppedRef.current) {
    setErrorText('Bağlantı koptu.')
    stop('disconnect')
  }
}, [clearGrace, fetchFn, establishConnection, stop])

useEffect(() => {
  reconnectRef.current = () => void attemptReconnect()
}, [attemptReconnect])
```

5. Add a `transcriptRef` kept in sync (needed because `attemptReconnect`'s closure would otherwise see a stale `transcript`):

```ts
const transcriptRef = useRef<VoiceTranscriptItem[]>([])
useEffect(() => {
  transcriptRef.current = transcript
}, [transcript])
```

6. In `establishConnection`'s `onconnectionstatechange`, replace **both** `stop('disconnect')` sites (the `failed` branch and the grace-timer callback) with:

```ts
// failed branch:
if (st === 'failed') {
  if (!reconnectedRef.current) {
    reconnectRef.current?.()
  } else {
    setErrorText('Bağlantı koptu.')
    stop('disconnect')
  }
  return
}
```

```ts
// inside the grace setTimeout, replacing the stop('disconnect'):
if (!stoppedRef.current && pcRef.current?.connectionState !== 'connected') {
  if (!reconnectedRef.current) {
    reconnectRef.current?.()
  } else {
    setErrorText('Bağlantı koptu.')
    stop('disconnect')
  }
}
```

7. Import at top:

```ts
import { buildResumeContext } from './voiceResume'
import type { ResumeTranscriptItem } from './voiceResume'
```

8. `establishConnection` on `cfg.resume` must NOT touch `startedAtRef`/`transcript` — confirm it doesn't (Task 7 body already only reads `startedAtRef`). The timer restart in `establishConnection` recomputes `sec` from the preserved `startedAtRef`, so `elapsedSec` continues correctly.

- [ ] **Step 4: Run new + existing tests**

Run: `npx jest src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx`
Expected: PASS — the 11 original + 3 new. In particular the original "I6: ICE disconnected → grace geçti → stop(disconnect)" now goes through **one reconnect first** — update that test's expectation ONLY IF it now legitimately reconnects: it uses a fetch mock that returns a valid session for `/api/akif/voice/session`, so the reconnect will succeed and status returns to `listening`, not `idle`.

Decision for that test: rename it and assert the new behavior —

```ts
it('I6: ICE disconnected → grace geçti → tek reconnect denenir', async () => {
  // ...existing setup...
  act(() => {
    pc.setConnState('disconnected')
  })
  act(() => {
    jest.advanceTimersByTime(6000)
  })
  await waitFor(() => expect(result.current.status).toBe('listening'))
  expect(pc.closed).toBe(true) // old pc closed
})
```

(The "grace içinde connected → oturum yaşar" test is unaffected — it recovers before the grace timer fires, so no reconnect.)

- [ ] **Step 5: Full akif regression + tsc + build**

Run: `npx jest src/components/akif src/lib/ai/akif src/app/api/akif && npx tsc --noEmit && npm run build`
Expected: all green, build clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/akif/voice/useRealtimeVoice.ts src/components/akif/voice/__tests__/useRealtimeVoice.test.tsx
git commit -m "feat(akif-2.1): tek otomatik yeniden bağlanma + resume context"
```

---

### Task 9: `AkifVoicePanel` reconnecting UI + human-smoke checklist

**Files:**
- Modify: `src/components/akif/voice/AkifVoicePanel.tsx`
- Modify: `src/components/akif/voice/AkifVoicePanel.module.css` (reuse existing `.hint` / `.orb` classes; add nothing unless needed)
- Test: `src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx` (add one test)
- Modify: `docs/akif/akif-2-insan-duman-kontrol-listesi.md`

**Interfaces:**
- Consumes: `VoiceStatus` now includes `'reconnecting'`.
- Produces: nothing.

- [ ] **Step 1: Write failing test (add)**

```ts
it('reconnecting: yeniden bağlanma ipucu, hata bandı yok', () => {
  hookState.status = 'reconnecting'
  hookState.errorText = null
  render(<AkifVoicePanel onExit={jest.fn()} />)
  expect(screen.getByText(/yeniden bağlanılıyor/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /tekrar dene/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npx jest src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx -t reconnecting`
Expected: FAIL — no such text.

- [ ] **Step 3: Edit `AkifVoicePanel.tsx`**

Add a branch alongside the `connecting` one:

```tsx
{v.status === 'connecting' && <span className={styles.hint}>Bağlanıyor…</span>}
{v.status === 'reconnecting' && (
  <>
    <span className={`${styles.orb} ${styles.listening}`} aria-hidden />
    <span className={styles.hint}>Bağlantı yeniden kuruluyor…</span>
  </>
)}
```

Also include `reconnecting` in the timer/Bitir cluster so the user can still bail out and the elapsed time keeps showing:

```tsx
{(v.status === 'listening' || v.status === 'speaking' || v.status === 'reconnecting') && (
  <>
    {v.status !== 'reconnecting' && (
      <span className={`${styles.orb} ${styles[v.status]}`} aria-hidden />
    )}
    <span className={styles.timer}>{fmt(v.elapsedSec)}</span>
    <button type="button" className={styles.stop} onClick={() => v.stop('user_ended')}>
      Bitir
    </button>
  </>
)}
```

Reconcile the two snippets — final structure: when `reconnecting`, show the hint + timer + Bitir (no separate orb block duplication). Simplest single form:

```tsx
{v.status === 'connecting' && <span className={styles.hint}>Bağlanıyor…</span>}
{v.status === 'reconnecting' && (
  <span className={styles.hint}>Bağlantı yeniden kuruluyor…</span>
)}
{(v.status === 'listening' || v.status === 'speaking' || v.status === 'reconnecting') && (
  <>
    {v.status !== 'reconnecting' && (
      <span className={`${styles.orb} ${styles[v.status]}`} aria-hidden />
    )}
    <span className={styles.timer}>{fmt(v.elapsedSec)}</span>
    <button type="button" className={styles.stop} onClick={() => v.stop('user_ended')}>
      Bitir
    </button>
  </>
)}
```

- [ ] **Step 4: Run panel tests**

Run: `npx jest src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx`
Expected: PASS — old + new (the "listening: süre ve Bitir" test still finds `1:05` and Bitir).

- [ ] **Step 5: Update human-smoke checklist**

Open `docs/akif/akif-2-insan-duman-kontrol-listesi.md` and add two items under the connection/error section (match the file's existing numbered/checkbox format):

```markdown
- [ ] **Oturum ortasında gerçek ağ kesintisi** — konuşma sürerken Wi-Fi'yi ~5 sn kapatıp aç. Beklenen: panel "Bağlantı yeniden kuruluyor…" gösterir, ardından kendiliğinden `listening`'e döner; süre sayacı sıfırlanmaz; Akif kaldığı yerden devam eder ve daha önce verdiğin arsa alanı / emsal / pay bilgilerini BAŞTAN sormaz.
- [ ] **Zorla çift kopma** — yeniden bağlandıktan sonra Wi-Fi'yi bir daha kapat. Beklenen: bu sefer "Bağlantı koptu." bandı + "Tekrar dene" düğmesi; "Tekrar dene" temiz bir yeni oturum başlatır (transkript sıfırlanır).
```

- [ ] **Step 6: Full suite + tsc + build**

Run: `npx jest && npx tsc --noEmit && npm run build`
Expected: full jest green, tsc 0, build clean. Record the suite/test counts.

- [ ] **Step 7: Commit**

```bash
git add src/components/akif/voice/AkifVoicePanel.tsx src/components/akif/voice/AkifVoicePanel.module.css src/components/akif/voice/__tests__/AkifVoicePanel.test.tsx docs/akif/akif-2-insan-duman-kontrol-listesi.md
git commit -m "feat(akif-2.1): reconnecting UI + insan duman listesi 2 madde"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| §2 `AkifVoiceSession` model + stale rule + dev migration | Task 1 (model/migration), Task 2 (`endStaleCallerSessions`), Task 3 (sweep call) |
| §3 mint path (registry write) | Task 3 |
| §3 resume path (409, same sessionId, global-budget-only, `reconnectCount++`) | Task 2 (`resolveResumableSession`/`bumpReconnectCount`) + Task 3 |
| §4 `checkVoiceSessionOwner` helper | Task 2 |
| §4 `/usage` guard + `ended` idempotent + `status` flip + F-C clamp kept | Task 4 |
| §4 `/tool` guard + `session_over` | Task 5 |
| §5 `establishConnection` refactor | Task 7 |
| §5 `attemptReconnect` + `'reconnecting'` + one-per-session + same sessionId + billing coherence | Task 8 |
| §6 `buildResumeContext` + injection on resumed channel | Task 6 (builder) + Task 8 (injection) |
| §6 edge cases (2nd drop, 409, tab-hidden, SDP fail) | Task 8 tests |
| §7 all unit/route/hook tests | Tasks 2-8 |
| §7 human-smoke 2 items | Task 9 |
| §8 affected files | all covered |
| §9 deploy gate (migration dev-only) | Task 1 Step 3 |

No gaps.

**2. Placeholder scan:** No "TBD"/"handle errors appropriately"/"similar to Task N". Every code step has literal code. Two soft spots, both with concrete fallback instructions: Task 3 Step 1 (module-spy vs module-level-mock for `voiceMonthSpendUsd`) and Task 8 Step 1 (exact user-transcript event key — instruction: verify against `voiceEvents.ts`, assertion goal stated).

**3. Type consistency:**
- `VoiceSessionDb` / `VoiceSessionRow` / `VoiceSessionCheck` / `ResumeResolution` — defined Task 2, consumed Tasks 3/4/5 with matching shapes.
- `checkVoiceSessionOwner` returns `{ ok:true; status:'active'|'ended' }` — Tasks 4/5 branch on `owner.status === 'ended'` and `owner.ok`. Consistent.
- `resolveResumableSession` returns `{ ok:false; reason }` — Task 3 returns `409 { error:'resume_denied', reason: r.reason }`. Consistent.
- `establishConnection(sess, { resume, refetch })` — signature identical in Task 7 (definition) and Task 8 (call with `resume:true`).
- `SessionInfo` (existing type in `useRealtimeVoice.ts`, has `token/sessionId/model/sessionMaxSec`) — `refetch` returns `SessionInfo | null`; `/session` resume response matches it. Consistent.
- `ResumeTranscriptItem` (Task 6) vs `VoiceTranscriptItem` (existing, `{ id; role:'user'|'akif'; text; card? }`) — structurally compatible; Task 8 casts `transcriptRef.current as ResumeTranscriptItem[]`. OK.
- `buildResumeContext` name identical in Task 6, Task 8 import, and Task 8 test assertion string.
- `resumeContextRef` introduced Task 7 (used by `establishConnection`), populated Task 8. Flagged: Task 7 references `resumeContextRef` before Task 8 creates the populating code — Task 7 must declare the ref (`useRef<string | null>(null)`) as shown in its Step 2, so `establishConnection` compiles in Task 7 with `resume` always false. Consistent.

Fix applied inline: Task 7 Step 2 already includes the `resumeContextRef` declaration.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-akif-2-1-hardening.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — tasks run in this session via executing-plans, batched with checkpoints.

Which approach?
