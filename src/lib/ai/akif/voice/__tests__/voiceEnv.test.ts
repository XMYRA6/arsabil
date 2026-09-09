import { readVoiceEnv } from '../voiceEnv'

describe('readVoiceEnv', () => {
  it('apiKey yoksa akif_unavailable fırlatır', () => {
    expect(() => readVoiceEnv({})).toThrow('akif_unavailable')
  })

  it('varsayılanları döndürür', () => {
    const c = readVoiceEnv({ OPENAI_API_KEY: 'sk-x' })
    expect(c).toEqual({
      apiKey: 'sk-x',
      model: 'gpt-realtime-mini',
      voiceName: 'marin',
      monthlyBudgetUsd: 30,
      userMonthlyMinutes: 30,
      sessionMaxSec: 600,
      smokeBudgetUsd: 1,
    })
  })

  it('boş string env varsayılana düşer (Coolify unset)', () => {
    const c = readVoiceEnv({
      OPENAI_API_KEY: 'sk-x',
      AKIF_VOICE_MONTHLY_BUDGET_USD: '',
      AKIF_VOICE_SESSION_MAX_SEC: '0',
    })
    expect(c.monthlyBudgetUsd).toBe(30)
    expect(c.sessionMaxSec).toBe(600)
  })

  it('geçerli override okur', () => {
    const c = readVoiceEnv({
      OPENAI_API_KEY: 'sk-x',
      AKIF_VOICE_MODEL: 'gpt-realtime',
      AKIF_VOICE_NAME: 'verse',
      AKIF_VOICE_USER_MONTHLY_MINUTES: '15',
    })
    expect(c.model).toBe('gpt-realtime')
    expect(c.voiceName).toBe('verse')
    expect(c.userMonthlyMinutes).toBe(15)
  })
})
