// Akif-2 — POST /api/akif/voice/session
// rate-limit → auth (giriş şart) → env → kota (global USD + kullanıcı dk) →
// OpenAI /v1/realtime/client_secrets ile efemeral token → tarayıcıya.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { checkVoiceQuota } from '@/lib/ai/akif/voice/voiceQuota'
import { createVoiceAuditLogger, type VoiceAuditDb } from '@/lib/ai/akif/voice/voiceAudit'
import { buildRealtimeSessionConfig } from '@/lib/ai/akif/voice/realtimeSession'

export const runtime = 'nodejs'

const TOKEN_TTL = '2m' // efemeral — WebRTC handshake'e yeter, kısa

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

  let env
  try {
    env = readVoiceEnv()
  } catch {
    return Response.json({ error: 'akif_unavailable' }, { status: 503 })
  }

  const db = prisma as unknown as VoiceAuditDb
  const audit = createVoiceAuditLogger(db)
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

  const sessionConfig = buildRealtimeSessionConfig({ model: env.model, voiceName: env.voiceName })

  let upstream: Response
  try {
    upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_after: { ttl: TOKEN_TTL }, session: sessionConfig }),
    })
  } catch (e) {
    console.error('[akif-voice] token fetch threw', e)
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  if (!upstream.ok) {
    console.error(
      '[akif-voice] token fetch not ok',
      upstream.status,
      await upstream.text().catch(() => ''),
    )
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  const data = (await upstream.json()) as { value?: string; expires_at?: number }
  if (!data.value) {
    return Response.json({ error: 'upstream' }, { status: 502 })
  }

  return Response.json({
    token: data.value,
    expiresAt: data.expires_at ?? 0,
    sessionId: crypto.randomUUID(),
    model: env.model,
    sessionMaxSec: env.sessionMaxSec,
  })
}
