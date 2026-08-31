import {
  estimateHistoryTokens,
  checkConversationBudget,
  checkMonthlyBudget,
  MonthlyGuardDeps,
} from '../costGuard';

describe('costGuard', () => {
  describe('estimateHistoryTokens', () => {
    it('estimates tokens as roughly 1 token per 4 characters', () => {
      const messages = [{ content: 'a'.repeat(400) }];
      const estimate = estimateHistoryTokens(messages);
      expect(estimate).toBe(100);
    });

    it('sums across multiple messages', () => {
      const messages = [
        { content: 'a'.repeat(400) },
        { content: 'b'.repeat(200) },
      ];
      const estimate = estimateHistoryTokens(messages);
      expect(estimate).toBe(150); // 400/4 + 200/4
    });

    it('rounds up', () => {
      const messages = [{ content: 'a'.repeat(401) }];
      const estimate = estimateHistoryTokens(messages);
      expect(estimate).toBe(101); // ceil(401/4) = 101
    });
  });

  describe('checkConversationBudget', () => {
    it('returns ok: true when under maxTurnTokens', () => {
      const messages = [{ content: 'a'.repeat(400) }];
      const result = checkConversationBudget(messages, 200);
      expect(result).toEqual({ ok: true });
    });

    it('returns ok: false when over maxTurnTokens', () => {
      const messages = [{ content: 'a'.repeat(1000) }];
      const result = checkConversationBudget(messages, 200);
      expect(result).toEqual({ ok: false });
    });

    it('returns ok: true when exactly at maxTurnTokens', () => {
      const messages = [{ content: 'a'.repeat(400) }];
      const result = checkConversationBudget(messages, 100);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('checkMonthlyBudget', () => {
    it('returns ok: true and spent when spent < budgetUsd', async () => {
      const deps: MonthlyGuardDeps = {
        monthSpendUsd: jest.fn().mockResolvedValue(25),
        budgetUsd: 50,
        now: () => new Date('2026-08-15T12:00:00Z'),
      };

      const result = await checkMonthlyBudget(deps);

      expect(result).toEqual({ ok: true, spent: 25 });
    });

    it('returns ok: false and spent when spent >= budgetUsd', async () => {
      const deps: MonthlyGuardDeps = {
        monthSpendUsd: jest.fn().mockResolvedValue(50),
        budgetUsd: 50,
        now: () => new Date('2026-08-15T12:00:00Z'),
      };

      const result = await checkMonthlyBudget(deps);

      expect(result).toEqual({ ok: false, spent: 50 });
    });

    it('calls monthSpendUsd with deps.now()', async () => {
      const now = new Date('2026-08-15T12:00:00Z');
      const mockMonthSpend = jest.fn().mockResolvedValue(10);

      const deps: MonthlyGuardDeps = {
        monthSpendUsd: mockMonthSpend,
        budgetUsd: 50,
        now: () => now,
      };

      await checkMonthlyBudget(deps);

      expect(mockMonthSpend).toHaveBeenCalledWith(now);
    });
  });
});
