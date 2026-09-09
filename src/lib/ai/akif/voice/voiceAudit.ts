// Akif-2 — ses audit. Akif-1 audit.ts deseninin ses eşi.
// HAM METİN / TRANSKRİPT YAZILMAZ — yalnız sayaç/meta.

export interface VoiceTurnEntry {
  sessionId: string
  tool: string | null
  intent: string | null
  estCostUsd: number
}

export interface VoiceSessionEntry {
  sessionId: string
  userId: string
  startedAt: Date
  durationSec: number
  toolCalls: number
  estCostUsd: number
  endReason: string
}

export interface VoiceAuditDb {
  akifVoiceSessionLog: {
    create(a: { data: Record<string, unknown> }): Promise<unknown>
    aggregate(a: unknown): Promise<{ _sum: { durationSec: number | null; estCostUsd: number | null } }>
  }
  akifVoiceTurnLog: {
    create(a: { data: VoiceTurnEntry }): Promise<unknown>
  }
}

function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function createVoiceAuditLogger(db: VoiceAuditDb) {
  return {
    async logVoiceTurn(entry: VoiceTurnEntry): Promise<void> {
      try {
        await db.akifVoiceTurnLog.create({ data: entry })
      } catch (err) {
        console.error('[voice-audit] logVoiceTurn failed:', err)
      }
    },

    async logVoiceSession(entry: VoiceSessionEntry): Promise<void> {
      const { sessionId, ...rest } = entry
      try {
        await db.akifVoiceSessionLog.create({ data: { id: sessionId, ...rest } })
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code === 'P2002') return // idempotent — aynı oturum ikinci kez
        console.error('[voice-audit] logVoiceSession failed:', err)
      }
    },

    async voiceMonthSpendUsd(now: Date): Promise<number> {
      const r = await db.akifVoiceSessionLog.aggregate({
        _sum: { estCostUsd: true },
        where: { startedAt: { gte: monthStartUtc(now) } },
      })
      return r._sum.estCostUsd ?? 0
    },

    async voiceUserMonthSeconds(userId: string, now: Date): Promise<number> {
      const r = await db.akifVoiceSessionLog.aggregate({
        _sum: { durationSec: true },
        where: { userId, startedAt: { gte: monthStartUtc(now) } },
      })
      return r._sum.durationSec ?? 0
    },
  }
}
