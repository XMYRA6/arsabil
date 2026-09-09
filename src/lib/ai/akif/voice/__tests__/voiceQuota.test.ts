import { checkVoiceQuota } from '../voiceQuota'

const base = {
  monthlyBudgetUsd: 30,
  userMonthlyMinutes: 30,
  now: () => new Date('2026-09-10T00:00:00Z'),
}

it('her şey altında → ok', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 10,
    voiceUserMonthSeconds: async () => 600,
  })
  expect(r).toEqual({ ok: true })
})

it('global bütçe aşıldı → monthly_budget', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 30,
    voiceUserMonthSeconds: async () => 0,
  })
  expect(r).toEqual({ ok: false, reason: 'monthly_budget' })
})

it('kullanıcı dakikası aşıldı → user_quota', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 5,
    voiceUserMonthSeconds: async () => 1800, // 30 dk
  })
  expect(r).toEqual({ ok: false, reason: 'user_quota', remainingSec: 0 })
})

it('global bütçe kullanıcı kotasından önce kontrol edilir', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 100,
    voiceUserMonthSeconds: async () => 9999,
  })
  expect(r).toEqual({ ok: false, reason: 'monthly_budget' })
})

it('kullanıcı sınıra yakın ama altında → ok', async () => {
  const r = await checkVoiceQuota('u1', {
    ...base,
    voiceMonthSpendUsd: async () => 5,
    voiceUserMonthSeconds: async () => 1740, // 29 dk
  })
  expect(r).toEqual({ ok: true })
})
