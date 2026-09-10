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

const TOKEN_TTL = '2m' // efemeral — WebRTC handshake'e yeter, kısa

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
