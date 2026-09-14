// Akif-2-Aksiyon — POST /api/akif/voice/action/commit
// Ekrandaki onay kartını (prepareScenarioSave'in ürettiği pending action)
// kullanıcı sözlü/butonla onayladığında yazar. auth → rate-limit → gövde
// doğrulama → sahiplik → commitPendingAction → 409 (typed hata) | 200.
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { checkVoiceSessionOwner, type VoiceSessionDb } from '@/lib/ai/akif/voice/voiceSession'
import { commitPendingAction, type PendingActionDb } from '@/lib/ai/akif/voice/pendingAction'
import { checkPlanLimit } from '@/lib/plan'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rl = checkRateLimit('akif-voice-action:user:' + userId, RATE_LIMITS.AKIF_TURN)
  if (!rl.ok) {
    return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } })
  }

  let body: { pendingActionId?: unknown; sessionId?: unknown; projectId?: unknown; projectName?: unknown; scenarioName?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'bad_request' }, { status: 400 }) }
  const { pendingActionId, sessionId } = body
  if (typeof pendingActionId !== 'string' || !pendingActionId || typeof sessionId !== 'string' || !sessionId) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const db = prisma as unknown as VoiceSessionDb & PendingActionDb & {
    project: { findUnique(a: { where: { id: string } }): Promise<{ name: string } | null> }
  }
  const owner = await checkVoiceSessionOwner(db, sessionId, userId)
  if (!owner.ok) return Response.json({ error: owner.code }, { status: 403 })

  const overrides = {
    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
    scenarioName: typeof body.scenarioName === 'string' ? body.scenarioName : undefined,
  }
  const r = await commitPendingAction(db, { pendingActionId, userId, sessionId, overrides }, { checkPlanLimit })
  if (!r.ok) return Response.json({ error: r.reason, message: r.message }, { status: 409 })

  let projectName = r.projectName
  if (!projectName) {
    projectName = (await db.project.findUnique({ where: { id: r.projectId } }))?.name ?? ''
  }
  return Response.json({ ok: true, scenarioId: r.scenarioId, projectId: r.projectId, projectName, undoToken: r.undoToken, undoUntil: r.undoUntil })
}
