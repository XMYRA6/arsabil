// Akif-2 — Realtime maliyet tahmini. Kaynak: OpenAI Realtime tarifesi (2026-07).
// gpt-realtime-2.1: $32/$64 per Mtok audio ; gpt-realtime-mini: $10/$20 per Mtok.
// Süre-bazlı yaklaşık: ~600 input tok/dk + ~1200 output tok/dk (tipik ajan).

export interface RealtimeUsage {
  inputAudioTokens: number
  outputAudioTokens: number
}

interface Rate {
  inPerMTok: number
  outPerMTok: number
}

export const VOICE_RATES: Record<string, Rate> = {
  'gpt-realtime': { inPerMTok: 32, outPerMTok: 64 },
  'gpt-realtime-mini': { inPerMTok: 10, outPerMTok: 20 },
}

const FALLBACK_MODEL = 'gpt-realtime-mini'
const APPROX_IN_TOK_PER_MIN = 600
const APPROX_OUT_TOK_PER_MIN = 1200

function rateFor(model: string): Rate {
  return VOICE_RATES[model] ?? VOICE_RATES[FALLBACK_MODEL]
}

export function estimateVoiceCostUsd(args: {
  model: string
  durationSec: number
  usage?: RealtimeUsage | null
}): number {
  const rate = rateFor(args.model)
  if (args.usage) {
    return (
      (args.usage.inputAudioTokens / 1e6) * rate.inPerMTok +
      (args.usage.outputAudioTokens / 1e6) * rate.outPerMTok
    )
  }
  const minutes = args.durationSec / 60
  return (
    (minutes * APPROX_IN_TOK_PER_MIN / 1e6) * rate.inPerMTok +
    (minutes * APPROX_OUT_TOK_PER_MIN / 1e6) * rate.outPerMTok
  )
}
