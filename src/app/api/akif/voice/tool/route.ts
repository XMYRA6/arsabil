// Akif-2 — POST /api/akif/voice/tool
// Realtime bir function-call ürettiğinde tarayıcı buraya iletir.
// auth → rate-limit → gövde doğrulama → validateArgs → dispatchTool → audit
// → doğrulanmış ToolResultCard.
// invalid_args = 200 (Realtime'a function_call_output olarak beslenir, HTTP
// hatası değil — sözleşme hatası).
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import {
  validateArgs,
  dispatchTool,
  type ToolName,
  type DispatchDeps,
} from '@/lib/ai/akif/gateway/toolRegistry'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'

export const runtime = 'nodejs'

const TOOL_NAMES: ToolName[] = [
  'explainTerm',
  'compareContractorOffers',
  'compareApartmentSizes',
]

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

  // Bilinmeyen araç: HTTP hatası değil — Realtime'a geri beslenir.
  if (!TOOL_NAMES.includes(toolName as ToolName)) {
    return Response.json({ error: 'invalid_args', field: 'name', reason: 'bilinmeyen araç' })
  }
  const name = toolName as ToolName

  const v = validateArgs(name, args)
  if (!v.ok) {
    return Response.json({ error: 'invalid_args', field: v.field, reason: v.reason })
  }

  // Prisma client, audit/gateway'in dar DI arayüzlerine yapısal olarak uyar;
  // Prisma imzalarındaki opsiyonel alanlar yüzünden tsc eşleşmiyor — tek
  // noktada daraltıyoruz (bkz. /api/akif/turn).
  const db = prisma as unknown as VoiceAuditDb & DispatchDeps['db']
  const audit = createVoiceAuditLogger(db)

  let card
  try {
    card = await dispatchTool(name, args, { db })
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
