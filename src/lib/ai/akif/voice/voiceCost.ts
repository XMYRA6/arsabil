// Akif-2 — Realtime maliyet tahmini. Kaynak: OpenAI Realtime tarifesi (2026-07).
// `gpt-realtime*` (tam, ör. gpt-realtime / gpt-realtime-2.x): $32/$64 per Mtok audio.
// `gpt-realtime-mini*`: $10/$20 per Mtok audio.
// Para guard'ı: bilinmeyen model = TAM (pahalı) tarife — fail closed.
// Süre-bazlı yaklaşık: ~600 input tok/dk + ~1200 output tok/dk (tipik ajan).

export interface RealtimeUsage {
  inputAudioTokens: number
  outputAudioTokens: number
}

interface Rate {
  inPerMTok: number
  outPerMTok: number
}

export const VOICE_RATES: Record<'full' | 'mini', Rate> = {
  full: { inPerMTok: 32, outPerMTok: 64 },
  mini: { inPerMTok: 10, outPerMTok: 20 },
}

const APPROX_IN_TOK_PER_MIN = 600
const APPROX_OUT_TOK_PER_MIN = 1200

// Prefix eşleşmesi: `gpt-realtime-mini*` → mini; diğer `gpt-realtime*` → full;
// tanınmayan → full (pahalı) — para guard'ı fail-closed olmalı.
function rateFor(model: string): Rate {
  if (model.startsWith('gpt-realtime-mini')) return VOICE_RATES.mini
  return VOICE_RATES.full
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
