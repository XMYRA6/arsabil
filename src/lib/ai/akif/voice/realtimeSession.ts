// Akif-2 — OpenAI Realtime oturum config'i. Efemeral token basılırken gönderilir.
// Sayı hesabı YOK: Realtime yalnız konuşur + tool çağırır; tool'lar backend'de doğrulanır.
//
// OTURUM SÜRE SINIRI — SUNUCU TARAFI YOK (kabul edilen kalıntı, 2026-09-10):
// GA `/v1/realtime/client_secrets` session objesi `max_session_duration_seconds`
// (veya benzeri) bir alan sunmuyor — yalnız token TTL'i (`expires_after`) var, o da
// oturum BAŞLADIKTAN sonra süreyi kısaltmaz. Bu yüzden `AKIF_VOICE_SESSION_MAX_SEC`
// SADECE istemci sayacıyla (useRealtimeVoice) uygulanır: 9. dk kapanış uyarısı →
// 10. dk `pc.close()`. Kötü niyetli/çökmüş istemci sayacı atlarsa oturum OpenAI'nin
// kendi sert üst sınırına kadar sürebilir; global aylık bütçe + kullanıcı aylık dakika
// + `AKIF_VOICE_SESSION` rate limit bu riski sınırlar. Bkz. insan duman kontrol listesi.
import { assembleSystemPrompt } from '../prompts/assemble'
import { AKIF_TOOL_DEFS } from '../gateway/toolRegistry'
import { ACTION_TOOL_DEFS } from '../gateway/actionTools'
import { VOICE_RHYTHM_PROMPT } from './voiceRhythm'

export interface RealtimeSessionConfig {
  type: 'realtime'
  model: string
  instructions: string
  tools: unknown[]
  tool_choice: 'auto'
  audio: {
    input: {
      turn_detection: { type: 'semantic_vad' }
      // GA Realtime yalnız input transcription açıkça istenirse
      // `conversation.item.input_audio_transcription.completed` yayar.
      transcription: { model: string }
    }
    output: { voice: string }
  }
}

export function buildRealtimeSessionConfig(args: {
  model: string
  voiceName: string
}): RealtimeSessionConfig {
  const base = assembleSystemPrompt({ hasHistory: false })
  return {
    type: 'realtime',
    model: args.model,
    instructions: `${base}\n\n${VOICE_RHYTHM_PROMPT}`,
    tools: [...AKIF_TOOL_DEFS, ...ACTION_TOOL_DEFS],
    tool_choice: 'auto',
    audio: {
      input: {
        turn_detection: { type: 'semantic_vad' },
        transcription: { model: 'gpt-4o-mini-transcribe' },
      },
      output: { voice: args.voiceName },
    },
  }
}
