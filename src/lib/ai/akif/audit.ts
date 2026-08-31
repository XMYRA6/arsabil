export interface AuditEntry {
  conversationId: string;
  turn: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  intent: string;
  tool: string | null;
}

export interface AuditDb {
  akifTurnLog: {
    create(a: { data: AuditEntry }): Promise<unknown>;
    aggregate(a: unknown): Promise<{ _sum: { estCostUsd: number | null } }>;
  };
}

export function createAuditLogger(db: AuditDb) {
  return {
    async logTurn(entry: AuditEntry): Promise<void> {
      try {
        await db.akifTurnLog.create({ data: entry });
      } catch (err) {
        console.error('[audit] failed to log turn:', err);
      }
    },

    async monthSpendUsd(now: Date): Promise<number> {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );

      const result = await db.akifTurnLog.aggregate({
        _sum: { estCostUsd: true },
        where: {
          createdAt: { gte: monthStart },
        },
      });

      return result._sum.estCostUsd ?? 0;
    },
  };
}
