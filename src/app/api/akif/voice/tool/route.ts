// Akif-2 — POST /api/akif/voice/tool
// Realtime bir function-call ürettiğinde tarayıcı buraya iletir.
// auth → rate-limit → gövde doğrulama → validateRichArgs → dispatchRichTool → audit
// → doğrulanmış ToolResultCard.
// invalid_args = 200 (Realtime'a function_call_output olarak beslenir, HTTP
// hatası değil — sözleşme hatası).
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { DispatchDeps } from '@/lib/ai/akif/gateway/toolRegistry'
import {
  isRichToolName,
  validateRichArgs,
  dispatchRichTool,
} from '@/lib/ai/akif/gateway/richTools'
import { createParcelLookupDeps } from '@/lib/ai/akif/gateway/parcelLookupDeps'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'
import { checkVoiceSessionOwner, type VoiceSessionDb } from '@/lib/ai/akif/voice/voiceSession'
import { validateActionArgs, type ActionToolName } from '@/lib/ai/akif/gateway/actionTools'
import { prepareScenarioSave, type PrepareScenarioSaveDb } from '@/lib/ai/akif/gateway/prepareScenarioSave'
import { commitPendingAction, type PendingActionDb } from '@/lib/ai/akif/voice/pendingAction'
import { checkPlanLimit } from '@/lib/plan'

export const runtime = 'nodejs'

// Akif-2-Aksiyon — sesle mutasyon araçları. Yalnız bu ses tool yolunda
// expose edilir; Akif-1'in TOOL_NAMES/dispatchTool'una (metin modu) DOKUNMAZ.
const ACTION_NAMES: ActionToolName[] = ['prepareScenarioSave', 'commitPendingAction']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rl = checkRateLimit('akif-voice-tool:user:' + userId, RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const { sessionId, toolName, args } = (body ?? {}) as {
    sessionId?: unknown
    toolName?: unknown
    args?: unknown
  }
  if (typeof sessionId !== 'string' || !sessionId || typeof toolName !== 'string') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // Prisma client, audit/gateway'in dar DI arayüzlerine yapısal olarak uyar;
  // Prisma imzalarındaki opsiyonel alanlar yüzünden tsc eşleşmiyor — tek
  // noktada daraltıyoruz (bkz. /api/akif/turn).
  const db = prisma as unknown as VoiceAuditDb & DispatchDeps['db'] & VoiceSessionDb

  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) {
    return Response.json({ error: owner.code }, { status: 403 })
  }
  if (owner.status === 'ended') {
    return Response.json({ error: 'session_over' }, { status: 403 })
  }

  const audit = createVoiceAuditLogger(db)

  // Akif-2-Aksiyon — sesle mutasyon araçları (prepareScenarioSave / commitPendingAction).
  // Akif-1'in hesaplayıcı TOOL_NAMES kontrolünden ÖNCE dallanır, ayrı doğrulama
  // (validateActionArgs) ve ayrı dispatch kullanır; dispatchTool/ToolRegistry'ye dokunmaz.
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

  // Bilinmeyen araç: HTTP hatası değil — Realtime'a geri beslenir.
  if (!isRichToolName(toolName)) {
    return Response.json({ error: 'invalid_args', field: 'name', reason: 'bilinmeyen araç' })
  }
  const name = toolName

  // compareParcels harici veri (TKGM/emsal) çeker — ek, daha sıkı limit.
  if (name === 'compareParcels') {
    const crl = checkRateLimit('akif-compare-parcels:user:' + userId, RATE_LIMITS.AKIF_COMPARE_PARCELS)
    if (!crl.ok) {
      return Response.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(crl.retryAfterSec ?? 60) } },
      )
    }
  }

  const v = validateRichArgs(name, args)
  if (!v.ok) {
    return Response.json({ error: 'invalid_args', field: v.field, reason: v.reason })
  }

  // Ses yolu giriş şart koşar → üye görünümü.
  const memberView = true
  let card
  try {
    card = await dispatchRichTool(name, args, {
      db,
      parcelDeps: createParcelLookupDeps({ memberView }),
      memberView,
    })
  } catch (e) {
    console.error('[akif-voice] dispatch failed', e)
    return Response.json({ error: 'tool_unavailable' }, { status: 502 })
  }

  await audit.logVoiceTurn({
    sessionId,
    tool: name,
    intent: null,
    estCostUsd: 0,
  })

  return Response.json(card)
}
