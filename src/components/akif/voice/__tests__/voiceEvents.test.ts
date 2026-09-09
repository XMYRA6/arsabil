import { parseRealtimeEvent } from '../voiceEvents'

it('kullanıcı transkripti', () => {
  expect(
    parseRealtimeEvent({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: '900 metrekare arsam var',
    }),
  ).toEqual({ type: 'user_transcript', text: '900 metrekare arsam var' })
})

it('Akif transkript delta', () => {
  expect(
    parseRealtimeEvent({ type: 'response.output_audio_transcript.delta', delta: 'Tamam, ' }),
  ).toEqual({ type: 'akif_transcript_delta', text: 'Tamam, ' })
})

it('Akif transkript bitti', () => {
  expect(parseRealtimeEvent({ type: 'response.output_audio_transcript.done' })).toEqual({
    type: 'akif_transcript_done',
  })
})

it('kullanıcı konuşmaya başladı (barge-in sinyali)', () => {
  expect(parseRealtimeEvent({ type: 'input_audio_buffer.speech_started' })).toEqual({
    type: 'speech_started',
  })
})

it('tool call — arguments string parse edilir', () => {
  expect(
    parseRealtimeEvent({
      type: 'response.function_call_arguments.done',
      call_id: 'call_1',
      name: 'compareContractorOffers',
      arguments: '{"arsaAlani":900,"emsal":1.5,"muteahhitPaylari":[45,50]}',
    }),
  ).toEqual({
    type: 'tool_call',
    callId: 'call_1',
    name: 'compareContractorOffers',
    args: { arsaAlani: 900, emsal: 1.5, muteahhitPaylari: [45, 50] },
  })
})

it('tool call — bozuk arguments → {}', () => {
  const e = parseRealtimeEvent({
    type: 'response.function_call_arguments.done',
    call_id: 'c',
    name: 'x',
    arguments: '{bozuk',
  })
  expect(e).toEqual({ type: 'tool_call', callId: 'c', name: 'x', args: {} })
})

it('response.done — usage çıkarılır', () => {
  expect(
    parseRealtimeEvent({
      type: 'response.done',
      response: { usage: { input_token_details: { audio_tokens: 100 }, output_token_details: { audio_tokens: 200 } } },
    }),
  ).toEqual({ type: 'response_done', usage: { inputAudioTokens: 100, outputAudioTokens: 200 } })
})

it('response.done — usage yoksa null', () => {
  expect(parseRealtimeEvent({ type: 'response.done', response: {} })).toEqual({
    type: 'response_done',
    usage: null,
  })
})

it('error olayı', () => {
  expect(
    parseRealtimeEvent({ type: 'error', error: { message: 'rate limit' } }),
  ).toEqual({ type: 'error', message: 'rate limit' })
})

it('tanınmayan olay → null', () => {
  expect(parseRealtimeEvent({ type: 'rate_limits.updated' })).toBeNull()
  expect(parseRealtimeEvent(null)).toBeNull()
  expect(parseRealtimeEvent('x')).toBeNull()
})
