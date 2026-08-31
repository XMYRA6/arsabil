export function estimateHistoryTokens(messages: { content: string }[]): number {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
}

export function checkConversationBudget(
  messages: { content: string }[],
  maxTurnTokens: number
): { ok: boolean } {
  const estimated = estimateHistoryTokens(messages);
  return { ok: estimated <= maxTurnTokens };
}

export interface MonthlyGuardDeps {
  monthSpendUsd: (now: Date) => Promise<number>;
  budgetUsd: number;
  now: () => Date;
}

export async function checkMonthlyBudget(
  deps: MonthlyGuardDeps
): Promise<{ ok: boolean; spent: number }> {
  const spent = await deps.monthSpendUsd(deps.now());
  return { ok: spent < deps.budgetUsd, spent };
}
