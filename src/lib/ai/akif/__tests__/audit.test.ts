import { createAuditLogger, AuditEntry, AuditDb } from '../audit';

describe('audit', () => {
  describe('logTurn', () => {
    it('calls db.akifTurnLog.create with { data: entry }', async () => {
      const entry: AuditEntry = {
        conversationId: 'conv-1',
        turn: 1,
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        estCostUsd: 0.005,
        intent: 'classify',
        tool: 'classifier',
      };

      const mockCreate = jest.fn().mockResolvedValue({});
      const db: AuditDb = {
        akifTurnLog: {
          create: mockCreate,
          aggregate: jest.fn(),
        },
      };

      const logger = createAuditLogger(db);
      await logger.logTurn(entry);

      expect(mockCreate).toHaveBeenCalledWith({ data: entry });
    });

    it('swallows errors from create and calls console.error', async () => {
      const entry: AuditEntry = {
        conversationId: 'conv-1',
        turn: 1,
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        estCostUsd: 0.005,
        intent: 'classify',
        tool: 'classifier',
      };

      const error = new Error('DB error');
      const mockCreate = jest.fn().mockRejectedValue(error);
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

      const db: AuditDb = {
        akifTurnLog: {
          create: mockCreate,
          aggregate: jest.fn(),
        },
      };

      const logger = createAuditLogger(db);
      await expect(logger.logTurn(entry)).resolves.toBeUndefined();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('audit'),
        error
      );
    });
  });

  describe('monthSpendUsd', () => {
    it('returns the sum of estCostUsd for this calendar month', async () => {
      const now = new Date('2026-08-15T12:00:00Z');
      const expectedMonthStart = new Date(Date.UTC(2026, 7, 1));

      const mockAggregate = jest.fn().mockResolvedValue({
        _sum: { estCostUsd: 42.5 },
      });

      const db: AuditDb = {
        akifTurnLog: {
          create: jest.fn(),
          aggregate: mockAggregate,
        },
      };

      const logger = createAuditLogger(db);
      const spent = await logger.monthSpendUsd(now);

      expect(spent).toBe(42.5);
      expect(mockAggregate).toHaveBeenCalledWith({
        _sum: { estCostUsd: true },
        where: {
          createdAt: { gte: expectedMonthStart },
        },
      });
    });

    it('returns 0 when _sum.estCostUsd is null', async () => {
      const now = new Date('2026-08-15T12:00:00Z');

      const mockAggregate = jest.fn().mockResolvedValue({
        _sum: { estCostUsd: null },
      });

      const db: AuditDb = {
        akifTurnLog: {
          create: jest.fn(),
          aggregate: mockAggregate,
        },
      };

      const logger = createAuditLogger(db);
      const spent = await logger.monthSpendUsd(now);

      expect(spent).toBe(0);
    });

    it('conversationIdPrefix verilirse aggregate WHERE\'ine startsWith eklenir', async () => {
      const now = new Date('2026-08-15T12:00:00Z')
      const expectedMonthStart = new Date(Date.UTC(2026, 7, 1))
      const mockAggregate = jest.fn().mockResolvedValue({ _sum: { estCostUsd: 5 } })
      const db: AuditDb = { akifTurnLog: { create: jest.fn(), aggregate: mockAggregate } }
      const logger = createAuditLogger(db, { conversationIdPrefix: 'wa:' })
      await logger.monthSpendUsd(now)
      expect(mockAggregate).toHaveBeenCalledWith({
        _sum: { estCostUsd: true },
        where: { createdAt: { gte: expectedMonthStart }, conversationId: { startsWith: 'wa:' } },
      })
    })

    it('excludeConversationIdPrefix verilirse aggregate WHERE\'ine not-startsWith eklenir', async () => {
      const now = new Date('2026-08-15T12:00:00Z')
      const expectedMonthStart = new Date(Date.UTC(2026, 7, 1))
      const mockAggregate = jest.fn().mockResolvedValue({ _sum: { estCostUsd: 5 } })
      const db: AuditDb = { akifTurnLog: { create: jest.fn(), aggregate: mockAggregate } }
      const logger = createAuditLogger(db, { excludeConversationIdPrefix: 'wa:' })
      await logger.monthSpendUsd(now)
      expect(mockAggregate).toHaveBeenCalledWith({
        _sum: { estCostUsd: true },
        where: { createdAt: { gte: expectedMonthStart }, conversationId: { not: { startsWith: 'wa:' } } },
      })
    })

    it('conversationIdPrefix verilmezse WHERE\'e conversationId eklenmez (regresyon)', async () => {
      const now = new Date('2026-08-15T12:00:00Z')
      const mockAggregate = jest.fn().mockResolvedValue({ _sum: { estCostUsd: 5 } })
      const db: AuditDb = { akifTurnLog: { create: jest.fn(), aggregate: mockAggregate } }
      const logger = createAuditLogger(db)
      await logger.monthSpendUsd(now)
      const call = mockAggregate.mock.calls[0][0] as { where: Record<string, unknown> }
      expect(call.where.conversationId).toBeUndefined()
    })
  });
});
