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
    const { deps, dispatch } = makeDeps()
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
      expect.arrayContaining(['mevcut', 'Birim maliyet: 18000 TL/m²', 'Kalite: orta']),
    )
    const card = turn.tool_result as ScenarioCard
    expect(card.rows[0].arsaSahibiDaireSayisi).toBe(6.3)
  })
})
