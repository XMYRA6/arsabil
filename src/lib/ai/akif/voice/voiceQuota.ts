// Akif-2 — sesli mod guard'ları. Sıra: global aylık USD → kullanıcı aylık dakika.
export interface VoiceQuotaDeps {
  voiceMonthSpendUsd: (now: Date) => Promise<number>
  voiceUserMonthSeconds: (userId: string, now: Date) => Promise<number>
  monthlyBudgetUsd: number
  userMonthlyMinutes: number
  now: () => Date
}

export type VoiceQuotaResult =
  | { ok: true }
  | { ok: false; reason: 'monthly_budget' }
  | { ok: false; reason: 'user_quota'; remainingSec: number }

export async function checkVoiceQuota(
  userId: string,
  deps: VoiceQuotaDeps,
): Promise<VoiceQuotaResult> {
  const now = deps.now()

  const spent = await deps.voiceMonthSpendUsd(now)
  if (spent >= deps.monthlyBudgetUsd) return { ok: false, reason: 'monthly_budget' }

  const usedSec = await deps.voiceUserMonthSeconds(userId, now)
  const limitSec = deps.userMonthlyMinutes * 60
  if (usedSec >= limitSec) return { ok: false, reason: 'user_quota', remainingSec: 0 }

  return { ok: true }
}
