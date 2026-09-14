// Akif-2-Aksiyon — POST /api/akif/voice/action/undo
// commit sırasında dönen undoToken ile 30 sn içinde geri alma. Sahiplik
// undoToken üzerinden doğrulanır (undoAction içinde) — ayrı bir
// checkVoiceSessionOwner çağrısına gerek yok, undo sessionId taşımıyor.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { undoAction, type PendingActionDb } from '@/lib/ai/akif/voice/pendingAction'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rl = checkRateLimit('akif-voice-action:user:' + userId, RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } })
  }

  let body: { undoToken?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'bad_request' }, { status: 400 }) }
  const { undoToken } = body
  if (typeof undoToken !== 'string' || !undoToken) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const db = prisma as unknown as PendingActionDb & {
    scenario: {
      delete(a: { where: { id: string } }): Promise<unknown>
      count(a: { where: Record<string, unknown> }): Promise<number>
    }
    project: { delete(a: { where: { id: string } }): Promise<unknown> }
  }
  const r = await undoAction(db, { undoToken, userId })
  if (!r.ok) return Response.json({ error: r.reason, message: r.message }, { status: 409 })

  return Response.json({ ok: true, undid: r.undid })
}
