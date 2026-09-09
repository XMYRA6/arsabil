// Akif-2 — POST /api/akif/voice/usage
// Oturum kapanınca (sendBeacon) çağrılır. Süre + tool sayısı + (varsa) gerçek usage →
// maliyet → AkifVoiceSessionLog (idempotent). Kayıp POST kabul (v1, gece uzlaştırma yok).
//
// sendBeacon `Content-Type: text/plain;charset=UTF-8` gönderir; bu yüzden
// `req.json()` yerine `req.text()` + `JSON.parse` kullanılır.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { estimateVoiceCostUsd } from '@/lib/ai/akif/voice/voiceCost'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'

export const runtime = 'nodejs'

const FALLBACK_MODEL = 'gpt-realtime-mini'
const END_REASONS = new Set(['user_ended', 'timeout', 'error', 'quota', 'disconnect'])

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  let body: {
    sessionId?: unknown
    startedAtMs?: unknown
    durationSec?: unknown
    toolCalls?: unknown
    realtimeUsage?: unknown
    endReason?: unknown
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (body == null || typeof body !== 'object') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { sessionId, startedAtMs, durationSec, toolCalls, realtimeUsage, endReason } = body
  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof startedAtMs !== 'number' ||
    !Number.isFinite(startedAtMs) ||
    typeof durationSec !== 'number' ||
    !Number.isFinite(durationSec) ||
    durationSec < 0 ||
    typeof toolCalls !== 'number' ||
    !Number.isFinite(toolCalls)
  ) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // env yoksa (anahtar yok) bile kaydı yaz — fallback model tarifesiyle.
  let model = FALLBACK_MODEL
  try {
    model = readVoiceEnv().model
  } catch {
    /* fallback */
  }

  const usage =
    realtimeUsage != null &&
    typeof realtimeUsage === 'object' &&
    typeof (realtimeUsage as { inputAudioTokens?: unknown }).inputAudioTokens === 'number' &&
    typeof (realtimeUsage as { outputAudioTokens?: unknown }).outputAudioTokens === 'number'
      ? {
          inputAudioTokens: (realtimeUsage as { inputAudioTokens: number }).inputAudioTokens,
          outputAudioTokens: (realtimeUsage as { outputAudioTokens: number }).outputAudioTokens,
        }
      : null

  const roundedDuration = Math.round(durationSec)
  const estCostUsd = estimateVoiceCostUsd({ model, durationSec: roundedDuration, usage })

  const db = prisma as unknown as VoiceAuditDb
  await createVoiceAuditLogger(db).logVoiceSession({
    sessionId,
    userId,
    startedAt: new Date(startedAtMs),
    durationSec: roundedDuration,
    toolCalls: Math.max(0, Math.round(toolCalls)),
    estCostUsd,
    endReason: END_REASONS.has(String(endReason)) ? String(endReason) : 'error',
  })

  return Response.json({ ok: true })
}
