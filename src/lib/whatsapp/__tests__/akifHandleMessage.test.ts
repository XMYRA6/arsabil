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

describe('runWhatsappAkifTurn — proje kartı (5c)', () => {
  const URL = 'https://www.arsabil.com/akif/baglan?t=abcDEF0123456789abcDEF0123456789abcDEF01234'
  const card = (op: string, data?: Record<string, unknown>) => ({ kind: 'project', op, data })

  beforeEach(() => { runAkifTurnMock.mockReset().mockResolvedValue(TURN) })

  // Bir konuşmayı sırayla koşturur: her turdan sonra kaydedilen state bir sonrakine yüklenir.
  function conversation() {
    let stored: { state: WaAkifState; lastMessageId: string } | null = null
    const { deps, sent } = makeDeps({
      store: {
        loadConversation: jest.fn().mockImplementation(async () => stored),
        saveConversation: jest.fn().mockImplementation(async (_p, s, id) => { stored = { state: s, lastMessageId: id } }),
      },
    })
    let n = 0
    const say = (text: string) => runWhatsappAkifTurn(msg({ text, messageId: 'wamid.c' + ++n }), deps)
    return { deps, sent, say, state: () => stored!.state }
  }

  describe('F1 — needs_signup bağlantısı deterministik', () => {
    it('konuşma metninde URL yoksa mesajın sonuna eklenir (tek kez)', async () => {
      runAkifTurnMock.mockResolvedValue({ ...TURN, speech: 'Önce üye olmalısın.', tool_result: card('needs_signup', { url: URL }) })
      const { deps, sent } = makeDeps()
      await runWhatsappAkifTurn(msg(), deps)
      expect(sent[0]).toBe('Önce üye olmalısın.\n\n' + URL)
      expect(sent[0].split(URL)).toHaveLength(2)
    })

    it('konuşma metni URL yi zaten içeriyorsa tekrarlanmaz', async () => {
      runAkifTurnMock.mockResolvedValue({ ...TURN, speech: 'Buradan üye ol: ' + URL, tool_result: card('needs_signup', { url: URL }) })
      const { deps, sent } = makeDeps()
      await runWhatsappAkifTurn(msg(), deps)
      expect(sent[0]).toBe('Buradan üye ol: ' + URL)
    })

    it('needs_signup dışı proje kartları hiçbir şey eklemez', async () => {
      for (const op of ['found', 'summary', 'created', 'updated', 'fact_saved', 'not_found', 'rate_limited', 'failed']) {
        runAkifTurnMock.mockResolvedValue({ ...TURN, speech: 'Tamam.', tool_result: card(op, { url: URL }) })
        const { deps, sent } = makeDeps()
        await runWhatsappAkifTurn(msg({ messageId: 'wamid.' + op }), deps)
        expect(sent[0]).toBe('Tamam.')
      }
    })
  })

  describe('F2 — recentProjects turlar arası taşınır', () => {
    it('found: adaylar kaydedilir ve sonraki turun extraSystemPrompt unda görünür', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({
        ...TURN,
        speech: 'Hangisi?',
        tool_result: card('found', { adaylar: [{ id: 'pA', ad: 'Maçka' }, { id: 'pB', ad: null }], dahaFazlaVar: false }),
      })
      await c.say('geçen ay')
      expect(c.state().recentProjects).toEqual([{ id: 'pA', name: 'Maçka' }, { id: 'pB', name: null }])

      await c.say('ilki')
      const prompt: string = runAkifTurnMock.mock.calls[1][0].extraSystemPrompt
      expect(prompt).toContain('TEST_POLICY')
      expect(prompt).toContain('SON ETKİLEŞİM PROJELERİ')
      expect(prompt).toContain('- id=pA | "Maçka"')
      expect(prompt).toContain('- id=pB | "Adsız proje"')
    })

    it('summary sonra updated: ad önceki girdiden korunur', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p1', ad: 'Ev' }) })
      await c.say('özet')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])

      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('updated', { projectId: 'p1' }) })
      await c.say('emsali 2 yap')
      expect(runAkifTurnMock.mock.calls[1][0].extraSystemPrompt).toContain('- id=p1 | "Ev"')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
    })

    it('updated bilinmeyen id: name null; created başa eklenir; tekrarlar elenir; en çok 5', async () => {
      const c = conversation()
      for (let i = 1; i <= 6; i++) {
        runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('created', { projectId: 'p' + i, ad: 'A' + i }) })
        await c.say('yeni ' + i)
      }
      expect(c.state().recentProjects!.map((p) => p.id)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2'])

      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('updated', { projectId: 'zz' }) })
      await c.say('güncelle')
      expect(c.state().recentProjects![0]).toEqual({ id: 'zz', name: null })

      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p4', ad: 'A4' }) })
      await c.say('özet')
      const ids = c.state().recentProjects!.map((p) => p.id)
      expect(ids[0]).toBe('p4')
      expect(ids.filter((i) => i === 'p4')).toHaveLength(1)
      expect(ids).toHaveLength(5)
    })

    it('calculated: data.ad ile başa eklenir', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('calculated', { projectId: 'p9', ad: 'Maçka' }) })
      await c.say('hesapla')
      expect(c.state().recentProjects![0]).toEqual({ id: 'p9', name: 'Maçka' })
    })

    it('price_estimate / price_unavailable: ad önceki girdiden, yoksa null', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('price_estimate', { projectId: 'p9' }) })
      await c.say('fiyat')
      expect(c.state().recentProjects![0]).toEqual({ id: 'p9', name: null })

      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p8', ad: 'Ev' }) })
      await c.say('özet')
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('price_unavailable', { projectId: 'p8' }) })
      await c.say('fiyat')
      expect(c.state().recentProjects![0]).toEqual({ id: 'p8', name: 'Ev' })
    })

    it('proje dışı turlar (not_found, kartsız) mevcut listeyi korur', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p1', ad: 'Ev' }) })
      await c.say('özet')
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('not_found') })
      await c.say('bulamadın mı')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
      await c.say('merhaba')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
    })

    it('DURDUR erken dönüşü recentProjects i taşır', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p1', ad: 'Ev' }) })
      await c.say('özet')
      await c.say('DURDUR')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
    })

    it('abonelik evet erken dönüşü recentProjects i taşır', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('summary', { projectId: 'p1', ad: 'Ev' }) })
      await c.say('özet')
      runAkifTurnMock.mockResolvedValueOnce({
        ...TURN,
        tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' },
      })
      await c.say('parsel')
      expect(c.state().awaitingFollowup).toBeDefined()
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
      await c.say('evet')
      expect(c.state().recentProjects).toEqual([{ id: 'p1', name: 'Ev' }])
    })

    it('bozuk recentProjects (yanlış şekil) güvenle yok sayılır', async () => {
      const { deps } = makeDeps({
        store: {
          loadConversation: jest.fn().mockResolvedValue({
            state: { history: [], recentProjects: [{ id: 5 }, null, 'x', { id: 'ok', name: 'Tamam' }] },
            lastMessageId: 'wamid.0',
          }),
          saveConversation: jest.fn(),
        },
      })
      await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
      const prompt: string = runAkifTurnMock.mock.calls[0][0].extraSystemPrompt
      expect(prompt).toContain('- id=ok | "Tamam"')
      expect(prompt).not.toContain('id=5')
    })
  })

  describe('pendingPrice — onay turunda fiyat verisi taşınır', () => {
    const PRICE = {
      projectId: 'p1',
      daireM2: 150,
      tahminiFiyatTL: 7_000_000,
      parsel: { il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'UĞURLU', ada: '101', parsel: '5' },
    }
    const estimate = () => ({ ...TURN, tool_result: card('price_estimate', PRICE) })

    it('price_estimate state e yazar; sonraki turun extraSystemPrompt unda blok görünür', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce(estimate())
      await c.say('fiyat')
      expect(c.state().pendingPrice).toEqual({
        projectId: 'p1', parsel: PRICE.parsel, daireM2: 150, tahminiFiyatTL: 7_000_000,
      })
      await c.say('evet')
      const prompt: string = runAkifTurnMock.mock.calls[1][0].extraSystemPrompt
      expect(prompt).toContain('BEKLEYEN FİYAT TAHMİNİ')
      expect(prompt).toContain('tahminiFiyatTL=7000000')
      expect(prompt).toContain('ada=101 parsel=5')
    })

    it.each(['fact_saved', 'calculated', 'price_unavailable'])('%s kartı temizler', async (op) => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce(estimate())
      await c.say('fiyat')
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card(op, { projectId: 'p1' }) })
      await c.say('evet')
      expect(c.state().pendingPrice).toBeUndefined()
    })

    it('yeni price_estimate öncekini değiştirir; ilgisiz kartlar korur', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce(estimate())
      await c.say('fiyat')
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('not_found') })
      await c.say('x')
      expect(c.state().pendingPrice!.tahminiFiyatTL).toBe(7_000_000)
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: card('price_estimate', { ...PRICE, tahminiFiyatTL: 8_000_000 }) })
      await c.say('yeniden')
      expect(c.state().pendingPrice!.tahminiFiyatTL).toBe(8_000_000)
    })

    it('DURDUR ve abone-daveti erken dönüşleri taşır', async () => {
      const c = conversation()
      runAkifTurnMock.mockResolvedValueOnce(estimate())
      await c.say('fiyat')
      await c.say('DURDUR')
      expect(c.state().pendingPrice?.projectId).toBe('p1')
      runAkifTurnMock.mockResolvedValueOnce({ ...TURN, tool_result: { kind: 'parcel', status: 'resolved', dto: DTO, siteUrl: 'https://x' } })
      await c.say('parsel')
      expect(c.state().pendingPrice).toBeDefined() // ilgisiz kart korur
      await c.say('evet') // abonelik evet erken dönüşü
      expect(c.state().pendingPrice?.projectId).toBe('p1')
    })

    it('bozuk saklı pendingPrice yok sayılır', async () => {
      for (const bad of [{ projectId: 'p1' }, { ...PRICE, daireM2: 0 }, { ...PRICE, tahminiFiyatTL: '7' }, { ...PRICE, parsel: { il: 'x' } }, 'x', null]) {
        runAkifTurnMock.mockReset().mockResolvedValue(TURN)
        const { deps } = makeDeps({
          store: {
            loadConversation: jest.fn().mockResolvedValue({ state: { history: [], pendingPrice: bad }, lastMessageId: 'wamid.0' }),
            saveConversation: jest.fn(),
          },
        })
        await runWhatsappAkifTurn(msg({ messageId: 'wamid.1' }), deps)
        expect(runAkifTurnMock.mock.calls[0][0].extraSystemPrompt).not.toContain('BEKLEYEN')
      }
    })
  })
})
