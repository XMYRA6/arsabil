import { runVoiceToolCall, buildFunctionCallOutputMessages } from '../voiceToolBridge'

const ev = { callId: 'call_1', name: 'explainTerm', args: { term: 'emsal' } }

it('başarı → kart + output modele', async () => {
  const card = { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' }
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => card })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toEqual(card)
  expect(JSON.parse(r.outputForModel)).toEqual(card)
  expect(fetchFn).toHaveBeenCalledWith(
    '/api/akif/voice/tool',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionId: 's1', toolName: 'explainTerm', args: { term: 'emsal' } }),
    }),
  )
})

it('invalid_args → card null, output modele hatayı taşır', async () => {
  const err = { error: 'invalid_args', field: 'emsal', reason: 'geçersiz aralık' }
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => err })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toBeNull()
  expect(JSON.parse(r.outputForModel)).toEqual(err)
})

it('HTTP 502 → tool_unavailable output', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) })
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(r.card).toBeNull()
  expect(JSON.parse(r.outputForModel)).toEqual({ error: 'tool_unavailable' })
})

it('fetch fırlatırsa → tool_unavailable output', async () => {
  const fetchFn = jest.fn().mockRejectedValue(new Error('offline'))
  const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
  expect(JSON.parse(r.outputForModel)).toEqual({ error: 'tool_unavailable' })
})

it('buildFunctionCallOutputMessages iki mesaj üretir', () => {
  const msgs = buildFunctionCallOutputMessages('call_1', '{"ok":1}')
  expect(msgs).toEqual([
    { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: 'call_1', output: '{"ok":1}' } },
    { type: 'response.create' },
  ])
})
