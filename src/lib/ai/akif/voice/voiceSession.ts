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
