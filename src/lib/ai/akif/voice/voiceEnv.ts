// Akif-2 — sesli mod yapılandırması. OPENAI_API_KEY yoksa sesli mod tamamen kapalı.
// numEnv: boş string / NaN / pozitif-olmayan → fallback (Coolify unset '' tuzağı).
import { numEnv } from '../openaiClient'

export interface VoiceEnvConfig {
  apiKey: string
  model: string
  voiceName: string
  monthlyBudgetUsd: number
  userMonthlyMinutes: number
  sessionMaxSec: number
  smokeBudgetUsd: number
}

type EnvLike = Record<string, string | undefined>

export function readVoiceEnv(env: EnvLike = process.env): VoiceEnvConfig {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) throw new Error('akif_unavailable')
  return {
    apiKey,
    model: env.AKIF_VOICE_MODEL || 'gpt-realtime-mini',
    voiceName: env.AKIF_VOICE_NAME || 'marin',
    monthlyBudgetUsd: numEnv(env.AKIF_VOICE_MONTHLY_BUDGET_USD, 30),
    userMonthlyMinutes: numEnv(env.AKIF_VOICE_USER_MONTHLY_MINUTES, 30),
    sessionMaxSec: numEnv(env.AKIF_VOICE_SESSION_MAX_SEC, 600),
    smokeBudgetUsd: numEnv(env.AKIF_VOICE_SMOKE_BUDGET_USD, 1),
  }
}
