// Akif-2 — POST /api/akif/voice/usage
// Oturum kapanınca (sendBeacon) çağrılır. Süre + tool sayısı + (varsa) gerçek usage →
// maliyet → AkifVoiceSessionLog (idempotent). Kayıp POST kabul (v1, gece uzlaştırma yok).
//
// sendBeacon `Content-Type: text/plain;charset=UTF-8` gönderir; bu yüzden
// `req.json()` yerine `req.text()` + `JSON.parse` kullanılır.
//
// GÜVENLİK: gövdedeki tüm sayısal alanlar istemci kontrolündedir. `realtimeUsage`
// doğrudan maliyete girer → forge edilmiş dev bir değer global aylık bütçeyi
// yakabilir (griefing). Bu yüzden: per-user rate limit + costing öncesi clamp.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { estimateVoiceCostUsd } from '@/lib/ai/akif/voice/voiceCost'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'
import {
  checkVoiceSessionOwner,
  endVoiceSession,
  type VoiceSessionDb,
} from '@/lib/ai/akif/voice/voiceSession'

export const runtime = 'nodejs'

const FALLBACK_MODEL = 'gpt-realtime-mini'
const FALLBACK_SESSION_MAX_SEC = 600
const DURATION_SLACK_SEC = 30
const DAY_MS = 24 * 60 * 60 * 1000
const END_REASONS = new Set(['user_ended', 'timeout', 'error', 'quota', 'disconnect'])

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit('akif-voice-usage:user:' + userId, RATE_LIMITS.AKIF_VOICE_USAGE)
  if (!rl.ok) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
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

  // startedAtMs sağduyu penceresi: 24 saatten eski ya da gelecekte → reddet.
  const now = Date.now()
  if (startedAtMs > now + 60_000 || startedAtMs < now - DAY_MS) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const db = prisma as unknown as VoiceAuditDb & VoiceSessionDb
  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) {
    return Response.json({ error: owner.code }, { status: 403 })
  }
  // FR-I2: owner.status === 'ended' olabilir çünkü endStaleCallerSessions bayat 'active'
  // satırları /session mint yolunda 'ended'e çevirir. Böyle bir oturum için de kayıt YAZILIR
  // (aşağıda) ki dakikaları faturalanabilsin; yalnız endVoiceSession atlanır (satır zaten
  // ended). Gerçek çift-beacon (meşru finalize sonrası) logVoiceSession'da P2002 ile
  // idempotent olarak sessizce no-op'a düşer — bkz. voiceAudit.ts.

  // env yoksa (anahtar yok) bile kaydı yaz — fallback model/limit tarifesiyle.
  let model = FALLBACK_MODEL
  let sessionMaxSec = FALLBACK_SESSION_MAX_SEC
  try {
    const env = readVoiceEnv()
    if (env.model) model = env.model
    if (Number.isFinite(env.sessionMaxSec) && env.sessionMaxSec > 0) {
      sessionMaxSec = env.sessionMaxSec
    }
  } catch {
    /* fallback */
  }

  // durationSec: 0..(sessionMaxSec + slack) aralığına sıkıştır.
  const roundedDuration = Math.min(
    Math.max(0, Math.round(durationSec)),
    sessionMaxSec + DURATION_SLACK_SEC,
  )

  // realtimeUsage: şekil doğru olsa bile forge edilebilir. Sonlu değilse VEYA
  // makul üst sınırı aşıyorsa → null'a düşür, süre-bazlı tahmin kullanılır.
  // Cap: sessionMaxSec * 200 ≈ 10× tipik per-second rate (~30 tok/s from voiceCost.ts).
  // Forged value at cap → ~$3–6/session, well under monthly budget.
  const usageCap = sessionMaxSec * 200
  let usage: { inputAudioTokens: number; outputAudioTokens: number } | null = null
  if (
    realtimeUsage != null &&
    typeof realtimeUsage === 'object' &&
    typeof (realtimeUsage as { inputAudioTokens?: unknown }).inputAudioTokens === 'number' &&
    typeof (realtimeUsage as { outputAudioTokens?: unknown }).outputAudioTokens === 'number'
  ) {
    const inTok = (realtimeUsage as { inputAudioTokens: number }).inputAudioTokens
    const outTok = (realtimeUsage as { outputAudioTokens: number }).outputAudioTokens
    const sane =
      Number.isFinite(inTok) &&
      Number.isFinite(outTok) &&
      inTok >= 0 &&
      outTok >= 0 &&
      inTok <= usageCap &&
      outTok <= usageCap
    usage = sane ? { inputAudioTokens: inTok, outputAudioTokens: outTok } : null
  }

  const estCostUsd = estimateVoiceCostUsd({ model, durationSec: roundedDuration, usage })

  await createVoiceAuditLogger(db).logVoiceSession({
    sessionId,
    userId,
    startedAt: new Date(startedAtMs),
    durationSec: roundedDuration,
    toolCalls: Math.max(0, Math.round(toolCalls)),
    estCostUsd,
    endReason: END_REASONS.has(String(endReason)) ? String(endReason) : 'error',
  })
  if (owner.status !== 'ended') {
    await endVoiceSession(db, sessionId, new Date())
  }

  return Response.json({ ok: true })
}
