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

it('prepareScenarioSave result → pendingAction proposal, not a card', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: { scenarioName: 'x', display: {}, projectRef: { newName: null } } }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.card).toBeNull()
  expect(r.pendingAction).toMatchObject({ type: 'proposal', pendingActionId: 'pa_1' })
  expect(r.outputForModel).toContain('pending_action')
})

it('needs_project_choice → proposal with candidates', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'needs_project_choice', pendingActionId: 'pa_1', candidates: [{ id: 'p1', name: 'A' }], scenarioName: 'x', display: {} }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toMatchObject({ type: 'proposal', candidates: [{ id: 'p1', name: 'A' }] })
})

it('blocked plan_limit → pendingAction blocked', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'blocked', reason: 'plan_limit', message: 'dolu' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'prepareScenarioSave', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toEqual({ type: 'blocked', message: 'dolu' })
})

it('action_committed → pendingAction committed', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'action_committed', ok: true, scenarioId: 'sc', projectId: 'p', projectName: 'T', undoToken: 'ut', undoUntil: 'z' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'commitPendingAction', args: {} }, { sessionId: 's', fetchFn })
  expect(r.pendingAction).toMatchObject({ type: 'committed', undoToken: 'ut' })
})

it('ordinary ScenarioCard still works', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ kind: 'contractor_offers', rows: [], defaultsUsed: [], assumptions: [], emsalNote: '' }) })
  const r = await runVoiceToolCall({ callId: 'c', name: 'compareContractorOffers', args: {} }, { sessionId: 's', fetchFn })
  expect(r.card).not.toBeNull()
  expect(r.pendingAction).toBeUndefined()
})

describe('displayNote', () => {
  const NOTE = 'Kart ekranda gösterildi; satırları okuma, yalnız özet ve öneriyi söyle.'
  it.each(['contractor_offers', 'apartment_sizes', 'parcel_compare'])(
    'comparison card output for model carries displayNote while card object does not (%s)',
    async (kind) => {
      const card = { kind, rows: [1, 2] }
      const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => card })
      const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
      expect(r.card).toEqual(card)
      expect(r.card).not.toHaveProperty('displayNote')
      expect(JSON.parse(r.outputForModel)).toEqual({ ...card, displayNote: NOTE })
    },
  )

  it('term card output has no displayNote', async () => {
    const card = { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' }
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: async () => card })
    const r = await runVoiceToolCall(ev, { sessionId: 's1', fetchFn: fetchFn as never })
    expect(JSON.parse(r.outputForModel)).not.toHaveProperty('displayNote')
  })
})
