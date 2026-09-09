// Akif-2 — OpenAI Realtime oturum config'i. Efemeral token basılırken gönderilir.
// Sayı hesabı YOK: Realtime yalnız konuşur + tool çağırır; tool'lar backend'de doğrulanır.
import { assembleSystemPrompt } from '../prompts/assemble'
import { AKIF_TOOL_DEFS } from '../gateway/toolRegistry'
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
    tools: AKIF_TOOL_DEFS,
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
