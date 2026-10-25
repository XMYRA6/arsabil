import { runAkifTurn, type RunAkifTurnDeps, type RunAkifTurnInput } from '../orchestrator'
import type { AkifTurn, ScenarioCard, TermCard } from '../contract'
import type { ToolName } from '../gateway/toolRegistry'

// --- Fakes ------------------------------------------------------------------

const VALID_TURN_RAW = {
  intent: 'explain_term',
  speech: 'Emsal, arsaya yapılabilecek toplam inşaat alanı katsayısıdır.',
  state: 'EXPLAINING',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
  needs_confirmation: null,
}

const TERM_CARD: TermCard = {
  kind: 'term',
  term: 'emsal',
  shortDef: 'Arsaya yapılabilecek toplam inşaat alanı katsayısı.',
  example: '1000 m² arsa, emsal 2 → 2000 m² inşaat.',
}

const SCENARIO_CARD: ScenarioCard = {
  kind: 'contractor_offers',
  rows: [
    {
      label: 'Müteahhit %50',
      arsaPayiX: 0.5,
      arsaSahibiDaireSayisi: 6.333333,
      arsaSahibiDegeriTL: 1000000,
      daireSatisFiyatiTL: 2000000,
    },
  ],
  defaultsUsed: ['Birim maliyet: 18000 TL/m²', 'Kalite: orta'],
  assumptions: ['Yapılaşma alanı = arsa alanı × emsal'],
  emsalNote: 'Emsal alanı = 500 × 2 = 1000 m²',
}

function makeDeps(over: Partial<RunAkifTurnDeps> = {}): {
  deps: RunAkifTurnDeps
  chatWithTools: jest.Mock
  finalStructured: jest.Mock
  dispatch: jest.Mock
  validateArgs: jest.Mock
  logTurn: jest.Mock
} {
  const chatWithTools = jest.fn(async () => ({
    kind: 'text' as const,
    text: '',
    usage: { promptTokens: 100, completionTokens: 10 },
  }))
  const finalStructured = jest.fn(async () => ({
    turnRaw: VALID_TURN_RAW,
    usage: { promptTokens: 200, completionTokens: 40 },
  }))
  const dispatch = jest.fn(async () => TERM_CARD)
  const validateArgs = jest.fn(() => ({ ok: true }))
  const logTurn = jest.fn(async () => undefined)

  const deps: RunAkifTurnDeps = {
    model: { chatWithTools, finalStructured } as unknown as RunAkifTurnDeps['model'],
    modelName: 'gpt-4o-mini',
    dispatch: dispatch as unknown as RunAkifTurnDeps['dispatch'],
    validateArgs: validateArgs as unknown as RunAkifTurnDeps['validateArgs'],
    audit: { logTurn } as unknown as RunAkifTurnDeps['audit'],
    checkConversationBudget: () => ({ ok: true }),
    now: () => new Date('2026-09-01T00:00:00Z'),
    ...over,
  }
  return { deps, chatWithTools, finalStructured, dispatch, validateArgs, logTurn }
}

const INPUT: RunAkifTurnInput = {
  conversationId: 'c1',
  history: [],
  userMessage: 'emsal nedir?',
}

// --- Scenarios -------------------------------------------------------------

describe('runAkifTurn', () => {
  it('(a) text → final explain_term turn, no dispatch, audit intent explain_term', async () => {
    const { deps, dispatch, logTurn } = makeDeps()
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.intent).toBe('explain_term')
    expect(turn.tool_result).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
    expect(logTurn).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'explain_term', tool: null, conversationId: 'c1' }),
    )
    // token totals from both calls
    expect(logTurn.mock.calls[0][0].promptTokens).toBe(300)
    expect(logTurn.mock.calls[0][0].completionTokens).toBe(50)
  })

  it('(b) tool_call explainTerm, validate ok, dispatch → TermCard injected into turn.tool_result', async () => {
    const { deps, dispatch, validateArgs } = makeDeps({})
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'explainTerm',
      toolArgs: { term: 'emsal' },
      toolCallId: 'call_1',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    const turn = await runAkifTurn(INPUT, deps)
    expect(validateArgs).toHaveBeenCalledWith('explainTerm', { term: 'emsal' })
    expect(dispatch).toHaveBeenCalledWith('explainTerm', { term: 'emsal' })
    expect(turn.tool_result).toEqual(TERM_CARD)
  })

  it('(c) invalid args → dispatch NOT called, returned turn has no tool_result', async () => {
    const { deps, dispatch, finalStructured } = makeDeps()
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'compareContractorOffers',
      toolArgs: { arsaAlani: 500, emsal: 15, muteahhitPaylari: [40, 50] },
      toolCallId: 'call_2',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.validateArgs as unknown as jest.Mock).mockReturnValueOnce({
      ok: false,
      field: 'emsal',
      reason: 'geçersiz aralık',
    })
    ;(deps.model.finalStructured as jest.Mock).mockResolvedValueOnce({
      turnRaw: { ...VALID_TURN_RAW, intent: 'clarify_number' },
      usage: { promptTokens: 200, completionTokens: 40 },
    })
    const turn = await runAkifTurn(INPUT, deps)
    expect(dispatch).not.toHaveBeenCalled()
    expect(turn.intent).toBe('clarify_number')
    expect(turn.tool_result).toBeUndefined()
    // OpenAI kuralı: role:'tool' mesajı MUTLAKA bir tool_calls'lu asistan
    // mesajını takip etmeli — geçersiz argümanda bile.
    const sentMsgs = finalStructured.mock.calls[0][0] as Array<{
      role: string
      tool_calls?: unknown[]
    }>
    const toolIdx = sentMsgs.findIndex((m) => m.role === 'tool')
    expect(toolIdx).toBeGreaterThan(0)
    const prev = sentMsgs[toolIdx - 1]
    expect(prev.role).toBe('assistant')
    expect(Array.isArray(prev.tool_calls)).toBe(true)
  })

  it('(h) budget check includes the assembled system prompt (final review I8)', async () => {
    const seen: { content: string }[][] = []
    const { deps } = makeDeps({
      checkConversationBudget: (m) => {
        seen.push(m)
        return { ok: true }
      },
    })
    await runAkifTurn(INPUT, deps)
    expect(seen).toHaveLength(1)
    // Sistem prompt'u ilk sırada ve gerçekten Akif sistem metni olmalı.
    expect(seen[0][0].content).toContain('Akif Usta')
    expect(seen[0][0].content.length).toBeGreaterThan(800)
    // Kullanıcı mesajı da hâlâ dahil.
    expect(seen[0].some((x) => x.content === INPUT.userMessage)).toBe(true)
  })

  it('(d) budget not ok → out_of_scope, model never called, audit written', async () => {
    const { deps, chatWithTools, finalStructured, logTurn } = makeDeps({
      checkConversationBudget: () => ({ ok: false }),
    })
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn).toEqual({
      intent: 'out_of_scope',
      speech: 'Konuşmamız uzadı, yeni bir sohbet açalım.',
      state: 'NEUTRAL',
      facts_used: [],
      assumptions: [],
      missing_fields: [],
      risk_level: 'low',
    })
    expect(chatWithTools).not.toHaveBeenCalled()
    expect(finalStructured).not.toHaveBeenCalled()
    expect(logTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'out_of_scope',
        tool: null,
        promptTokens: 0,
        completionTokens: 0,
        estCostUsd: 0,
      }),
    )
  })

  it('(e) finalStructured junk → parseAkifTurn null → fallback turn', async () => {
    const { deps } = makeDeps()
    ;(deps.model.finalStructured as jest.Mock).mockResolvedValueOnce({
      turnRaw: { garbage: true },
      usage: { promptTokens: 200, completionTokens: 40 },
    })
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.speech).toBe('Bir sorun oldu, tekrar dener misin?')
    expect(turn.intent).toBe('out_of_scope')
  })

  it('(f) compare tool → turn.assumptions merges tool defaultsUsed + rounds apt counts', async () => {
    const { deps } = makeDeps()
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'compareContractorOffers',
      toolArgs: { arsaAlani: 500, emsal: 2, muteahhitPaylari: [40, 50] },
      toolCallId: 'call_3',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(
      JSON.parse(JSON.stringify(SCENARIO_CARD)),
    )
    ;(deps.model.finalStructured as jest.Mock).mockResolvedValueOnce({
      turnRaw: { ...VALID_TURN_RAW, intent: 'compare_contractor', assumptions: ['mevcut'] },
      usage: { promptTokens: 200, completionTokens: 40 },
    })
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.assumptions).toEqual(
      expect.arrayContaining([
        'mevcut',
        'Birim maliyet: 18000 TL/m²',
        'Kalite: orta',
        'Yapılaşma alanı = arsa alanı × emsal',
      ]),
    )
    const card = turn.tool_result as ScenarioCard
    expect(card.rows[0].arsaSahibiDaireSayisi).toBe(6.3)
    // dispatch result must NOT be mutated in place
    expect(SCENARIO_CARD.rows[0].arsaSahibiDaireSayisi).toBe(6.333333)
  })

  it('(g) chatWithTools rejects → fallback turn, audit written once, no throw', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, finalStructured, logTurn } = makeDeps()
    ;(deps.model.chatWithTools as jest.Mock).mockRejectedValueOnce(
      new Error('rate_limited'),
    )
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.intent).toBe('out_of_scope')
    expect(turn.speech).toBe(
      'Şu an sana yardımcı olamıyorum, birazdan tekrar dener misin?',
    )
    expect(finalStructured).not.toHaveBeenCalled()
    expect(logTurn).toHaveBeenCalledTimes(1)
    expect(logTurn).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'out_of_scope', conversationId: 'c1' }),
    )
    errSpy.mockRestore()
  })

  it('(i) projectMemory verilirse sistem promptuna eklenir', async () => {
    const { deps } = makeDeps()
    await runAkifTurn({ ...INPUT, projectMemory: 'Bütçe üst sınırı 5M TL.' }, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{
      role: string
      content: string
    }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).toContain('Bütçe üst sınırı 5M TL.')
  })

  it('(j) projectMemory verilmezse sistem promptunda Arsa Dosyası bloğu yok (regresyon)', async () => {
    const { deps } = makeDeps()
    await runAkifTurn(INPUT, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{
      role: string
      content: string
    }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).not.toContain('Bu proje hakkında bildiklerin')
  })

  it('(k) tool_result kind:parcel ise dönüşümsüz turn.tool_result\'a atanır (rows.map ile çökmez)', async () => {
    const { deps } = makeDeps()
    const PARCEL_CARD = { kind: 'parcel' as const, status: 'resolved' as const, dto: { parcel: { il: 'Trabzon' } } as never, siteUrl: 'https://x' }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'lookupParcel',
      toolArgs: {},
      toolCallId: 'call_4',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(PARCEL_CARD)
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.tool_result).toEqual(PARCEL_CARD)
  })

  it('(k2) tool_result kind:project ise dönüşümsüz turn.tool_result\'a atanır (rows.map ile çökmez)', async () => {
    const { deps } = makeDeps()
    const PROJECT_CARD = { kind: 'project' as const, op: 'summary' as const, data: { projectId: 'pk1', ad: 'Maçka' } }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'findProjects',
      toolArgs: {},
      toolCallId: 'call_5',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(PROJECT_CARD)
    const turn = await runAkifTurn(INPUT, deps)
    expect(turn.tool_result).toEqual(PROJECT_CARD)
  })

  it('parcel_compare tool result is passed through to turn.tool_result', async () => {
    const { deps } = makeDeps()
    const COMPARE_CARD = {
      kind: 'parcel_compare' as const,
      tier: 'free' as const,
      rows: [{ label: 'A 1/1', status: 'resolved' as const }],
    }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'compareParcels',
      toolArgs: {},
      toolCallId: 'call_cp',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(COMPARE_CARD)
    const turn = await runAkifTurn(INPUT, deps as unknown as RunAkifTurnDeps<'compareParcels'>)
    expect(turn.tool_result).toEqual(COMPARE_CARD)
  })

  it('scenario tool result keeps recommendation after row rounding', async () => {
    const { deps } = makeDeps()
    const card: ScenarioCard = {
      ...JSON.parse(JSON.stringify(SCENARIO_CARD)),
      rows: [
        { ...SCENARIO_CARD.rows[0], label: 'A', arsaSahibiDaireSayisi: 5.55555 },
        { ...SCENARIO_CARD.rows[0], label: 'B', arsaSahibiDaireSayisi: 6.33333 },
      ],
      recommendation: { rowIndex: 1, criterion: 'en çok daire', reason: 'B daha fazla daire verir' },
    }
    ;(deps.model.chatWithTools as jest.Mock).mockResolvedValueOnce({
      kind: 'tool_call',
      toolName: 'compareContractorOffers',
      toolArgs: {},
      toolCallId: 'call_rec',
      usage: { promptTokens: 100, completionTokens: 10 },
    })
    ;(deps.dispatch as unknown as jest.Mock).mockResolvedValueOnce(card)
    const turn = await runAkifTurn(INPUT, deps)
    const out = turn.tool_result as ScenarioCard
    expect(out.recommendation).toEqual(card.recommendation)
    expect(out.rows[out.recommendation!.rowIndex].label).toBe('B')
    expect(out.rows[1].arsaSahibiDaireSayisi).toBe(6.3)
  })

  it('(l) extraSystemPrompt verilirse sistem promptuna eklenir', async () => {
    const { deps } = makeDeps()
    await runAkifTurn({ ...INPUT, extraSystemPrompt: 'EK_POLITIKA_TEST_METNI' }, deps)
    const sentMsgs = (deps.model.chatWithTools as jest.Mock).mock.calls[0][0] as Array<{ role: string; content: string }>
    const sys = sentMsgs.find((m) => m.role === 'system')!
    expect(sys.content).toContain('EK_POLITIKA_TEST_METNI')
  })
})
