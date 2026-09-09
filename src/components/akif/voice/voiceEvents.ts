// Akif-2 — Realtime data-channel olaylarını uygulama olaylarına çevirir. Saf, WebRTC'siz.
// Olay adları: OpenAI Realtime GA (2026).

export type VoiceEvent =
  | { type: 'user_transcript'; text: string }
  | { type: 'akif_transcript_delta'; text: string }
  | { type: 'akif_transcript_done' }
  | { type: 'speech_started' }
  | { type: 'tool_call'; callId: string; name: string; args: unknown }
  | { type: 'response_done'; usage: { inputAudioTokens: number; outputAudioTokens: number } | null }
  | { type: 'error'; message: string }

type Raw = Record<string, unknown>

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null
}

export function parseRealtimeEvent(raw: unknown): VoiceEvent | null {
  if (!isObj(raw) || typeof raw.type !== 'string') return null

  switch (raw.type) {
    case 'conversation.item.input_audio_transcription.completed':
      return typeof raw.transcript === 'string'
        ? { type: 'user_transcript', text: raw.transcript }
        : null

    case 'response.output_audio_transcript.delta':
      return typeof raw.delta === 'string'
        ? { type: 'akif_transcript_delta', text: raw.delta }
        : null

    case 'response.output_audio_transcript.done':
      return { type: 'akif_transcript_done' }

    case 'input_audio_buffer.speech_started':
      return { type: 'speech_started' }

    case 'response.function_call_arguments.done': {
      const callId = typeof raw.call_id === 'string' ? raw.call_id : ''
      const name = typeof raw.name === 'string' ? raw.name : ''
      let args: unknown = {}
      if (typeof raw.arguments === 'string') {
        try {
          args = JSON.parse(raw.arguments)
        } catch {
          args = {}
        }
      }
      return { type: 'tool_call', callId, name, args }
    }

    case 'response.done': {
      const resp = isObj(raw.response) ? raw.response : {}
      const usage = isObj(resp.usage) ? resp.usage : null
      const inDet = usage && isObj(usage.input_token_details) ? usage.input_token_details : null
      const outDet = usage && isObj(usage.output_token_details) ? usage.output_token_details : null
      const parsed =
        inDet || outDet
          ? {
              inputAudioTokens: typeof inDet?.audio_tokens === 'number' ? inDet.audio_tokens : 0,
              outputAudioTokens: typeof outDet?.audio_tokens === 'number' ? outDet.audio_tokens : 0,
            }
          : null
      return { type: 'response_done', usage: parsed }
    }

    case 'error': {
      const err = isObj(raw.error) ? raw.error : {}
      return { type: 'error', message: typeof err.message === 'string' ? err.message : 'bilinmeyen hata' }
    }

    default:
      return null
  }
}
