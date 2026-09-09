// Akif-2 — gerçek Realtime API dumanı. CI'da KOŞMAZ.
// OPENAI_API_KEY ile: config (tool şeması + semantic_vad + ses adı) API tarafından
// reddedilmiyor mu? Efemeral token dönüyor mu?
import { readVoiceEnv } from '@/lib/ai/akif/voice/voiceEnv'
import { buildRealtimeSessionConfig } from '@/lib/ai/akif/voice/realtimeSession'

export interface VoiceSmokeResult {
  skipped: boolean
  ok?: boolean
  status?: number
  detail?: string
}

export async function runVoiceSmoke(deps: {
  env?: Record<string, string | undefined>
  fetchFn?: typeof fetch
}): Promise<VoiceSmokeResult> {
  const env = deps.env ?? process.env
  const fetchFn = deps.fetchFn ?? fetch
  if (!env.OPENAI_API_KEY) return { skipped: true }

  const cfg = readVoiceEnv(env)
  const session = buildRealtimeSessionConfig({ model: cfg.model, voiceName: cfg.voiceName })

  const res = await fetchFn('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_after: { ttl: '2m' }, session }),
  })

  if (!res.ok) {
    return { skipped: false, ok: false, status: res.status, detail: (await res.text()).slice(0, 300) }
  }
  const data = (await res.json()) as { value?: string }
  return { skipped: false, ok: Boolean(data.value) }
}

if (require.main === module) {
  runVoiceSmoke({})
    .then((r) => {
      if (r.skipped) {
        console.log('⏭  OPENAI_API_KEY yok — smoke atlandı.')
        process.exit(0)
      }
      if (r.ok) {
        console.log('✅ Realtime config kabul edildi, efemeral token alındı.')
        process.exit(0)
      }
      console.error(`❌ Realtime config reddedildi (HTTP ${r.status}): ${r.detail}`)
      process.exit(1)
    })
    .catch((e) => {
      console.error('❌ smoke fırlattı:', e)
      process.exit(1)
    })
}
