import { runWhatsappAkifTurn, type AkifHandleDeps, type WaAkifState } from '../akifHandleMessage'
import type { InboundMessage } from '../types'

const TURN = {
  intent: 'smalltalk',
  speech: 'Merhaba, nasıl yardımcı olabilirim?',
  state: 'FRIENDLY',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

const DTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
  value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
  neighborhood: { geojson: null },
  comparables: { count: 3 },
  demographicsAvailable: false,
} as never

const runAkifTurnMock = jest.fn()
jest.mock('@/lib/ai/akif/orchestrator', () => ({
  runAkifTurn: (...a: unknown[]) => runAkifTurnMock(...a),
}))

function makeDeps(over: Partial<AkifHandleDeps> = {}): {
  deps: AkifHandleDeps
  sent: string[]
  saved: { state: WaAkifState; lastMessageId: string }[]
} {
  const sent: string[] = []
  const saved: { state: WaAkifState; lastMessageId: string }[] = []
  const deps: AkifHandleDeps = {
    store: {
      loadConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockImplementation(async (_p, s, id) => {
        saved.push({ state: s, lastMessageId: id })
      }),
    },
    model: { chatWithTools: jest.fn(), finalStructured: jest.fn() } as never,
    modelName: 'gpt-4o-mini',
    dispatch: jest.fn(),
    validateArgs: jest.fn(),
    audit: { logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) } as never,
    checkConversationBudget: () => ({ ok: true }),
    checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: true, spent: 0 }),
    sendText: jest.fn().mockImplementation(async (_to: string, b: string) => { sent.push(b) }),
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
    hasSubscription: jest.fn().mockResolvedValue(false),
    upsertSubscription: jest.fn().mockResolvedValue(undefined),
    deleteSubscriptions: jest.fn().mockResolvedValue(0),
    loadMemoryContext: jest.fn().mockResolvedValue(''),
    toolPolicy: 'TEST_POLICY',
    now: () => new Date('2026-09-16T00:00:00Z'),
    ...over,
  }
  return { deps, sent, saved }
}

const msg = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  from: '905321234567',
  text: 'merhaba',
  messageId: 'wamid.1',
  timestamp: 1,
  type: 'text',
  ...over,
})

describe('runWhatsappAkifTurn', () => {
  beforeEach(() => { runAkifTurnMock.mockReset().mockResolvedValue(TURN) })

  it('hafıza bağlamı extraSystemPrompt\'a eklenir; boşsa yalnız politika', async () => {
    runAkifTurnMock.mockResolvedValue(TURN)
    const { deps } = makeDeps({ loadMemoryContext: jest.fn().mockResolvedValue('BUGÜN: 2026-10-15') })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY\n\nBUGÜN: 2026-10-15')

    runAkifTurnMock.mockClear()
    const { deps: d2 } = makeDeps()
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.2' }), d2)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY')
  })

  it('hafıza bağlamı yüklenemezse tur yine çalışır (yalnız politika)', async () => {
    runAkifTurnMock.mockResolvedValue(TURN)
    const { deps } = makeDeps({ loadMemoryContext: jest.fn().mockRejectedValue(new Error('db down')) })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).toBe('TEST_POLICY')
  })

  it('düz sohbet → runAkifTurn çağrılır, cevap gönderilir, history kaydedilir', async () => {
    const { deps, sent, saved } = makeDeps()
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    expect(runAkifTurnMock.mock.calls[0][0]).toMatchObject({
      conversationId: 'wa:905321234567',
      userMessage: 'merhaba',
      extraSystemPrompt: 'TEST_POLICY',
    })
    expect(sent[0]).toBe('Merhaba, nasıl yardımcı olabilirim?')
    expect(saved[0].state.history).toEqual([
      { role: 'user', content: 'merhaba' },
      { role: 'akif', content: 'Merhaba, nasıl yardımcı olabilirim?' },
    ])
    expect(saved[0].lastMessageId).toBe('wamid.1')
  })

  it('idempotent retry (aynı messageId) → runAkifTurn hiç çağrılmaz', async () => {
    const { deps } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { history: [] }, lastMessageId: 'wamid.1' }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('DURDUR → deleteSubscriptions çağrılır, runAkifTurn HİÇ çağrılmaz', async () => {
    const { deps, sent } = makeDeps({ deleteSubscriptions: jest.fn().mockResolvedValue(2) })
    await runWhatsappAkifTurn(msg({ text: 'DURDUR' }), deps)
    expect(deps.deleteSubscriptions).toHaveBeenCalledWith('905321234567')
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('durduruldu')
  })

  it('spam rate limit aşıldı → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps({
      checkRateLimit: jest.fn().mockReturnValue({ ok: false, retryAfterSec: 60 }),
    })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('Çok fazla sorgu')
  })

  it('aylık bütçe dolu → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps({
      checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: false, spent: 999 }),
    })
    await runWhatsappAkifTurn(msg(), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('Akif şu an kapalı')
  })

  it('non-text → runAkifTurn çağrılmaz', async () => {
    const { deps, sent } = makeDeps()
    await runWhatsappAkifTurn(msg({ type: 'other', text: '' }), deps)
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('yazılı mesaj')
  })

  it('tool_result ParcelCard resolved + abone değil → renderCard + davet eklenir, state.awaitingFollowup set edilir', async () => {
    runAkifTurnMock.mockResolvedValue({
      ...TURN,
      speech: 'İşte sonuç:',
      tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' },
    })
    const { deps, sent, saved } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(false) })
    await runWhatsappAkifTurn(msg({ text: 'trabzon ortahisar uğurlu 123/45' }), deps)
    expect(sent[0]).toContain('İşte sonuç:')
    expect(sent[0]).toContain('Uğurlu Mah., Ortahisar / Trabzon')
    expect(sent[0]).toContain('takip edeyim mi')
    expect(saved[0].state.awaitingFollowup).toEqual({ il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  })

  it('tool_result ParcelCard resolved + zaten abone → davet eklenmez', async () => {
    runAkifTurnMock.mockResolvedValue({
      ...TURN,
      tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' },
    })
    const { deps, sent, saved } = makeDeps({ hasSubscription: jest.fn().mockResolvedValue(true) })
    await runWhatsappAkifTurn(msg(), deps)
    expect(sent[0]).not.toContain('takip edeyim mi')
    expect(saved[0].state.awaitingFollowup).toBeUndefined()
  })

  it('awaitingFollowup varken "evet" → upsertSubscription çağrılır, runAkifTurn ÇAĞRILMAZ', async () => {
    const { deps, sent } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({
          state: { history: [], awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } },
          lastMessageId: 'wamid.0',
        }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ text: 'evet', messageId: 'wamid.1' }), deps)
    expect(deps.upsertSubscription).toHaveBeenCalledWith('905321234567', { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(sent[0]).toContain('takibe alındı')
  })

  it('awaitingFollowup varken "evet" DIŞINDA bir cevap → normal Akif akışına düşer', async () => {
    const { deps } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({
          state: { history: [], awaitingFollowup: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' } },
          lastMessageId: 'wamid.0',
        }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ text: 'hayır teşekkürler', messageId: 'wamid.1' }), deps)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
  })

  it('runAkifTurn fırlarsa → hata yakalanır, kullanıcıya nazik mesaj gider', async () => {
    runAkifTurnMock.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, sent } = makeDeps()
    await runWhatsappAkifTurn(msg(), deps)
    expect(sent[0]).toContain('yardımcı olamıyorum')
    errSpy.mockRestore()
  })

  it('eski şekilli (Akif-5 öncesi) conversation satırı → çökmez, boş history ile normal akışa düşer', async () => {
    const { deps } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({
          state: { fields: { ilText: 'Trabzon' }, pending: 'ilce' },
          lastMessageId: 'wamid.0',
        }),
        saveConversation: jest.fn(),
      },
    })
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    expect(runAkifTurnMock.mock.calls[0][0]).toMatchObject({ history: [] })
  })

  it('history 40 mesajı geçince kırpılır', async () => {
    const longHistory = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? 'user' as const : 'akif' as const, content: `m${i}` }))
    const { deps, saved } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { history: longHistory }, lastMessageId: 'wamid.0' }),
        saveConversation: jest.fn().mockImplementation(async (_p, s, id) => { saved.push({ state: s, lastMessageId: id }) }),
      },
    })
    await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
    expect(saved[0].state.history.length).toBe(40)
  })
})
