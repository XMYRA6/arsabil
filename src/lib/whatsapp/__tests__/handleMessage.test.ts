import { handleMessage, type HandleDeps } from '../handleMessage'
import type { InboundMessage } from '../types'

const CARD_OK = {
  ok: true as const,
  card: {
    parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
    risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
    value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
    neighborhood: { geojson: null },
    comparables: { count: 3 },
  },
}

function makeDeps(over: Partial<HandleDeps> = {}): { deps: HandleDeps; sent: string[]; saved: unknown[] } {
  const sent: string[] = []
  const saved: unknown[] = []
  const deps: HandleDeps = {
    store: {
      loadConversation: jest.fn().mockResolvedValue(null),
      saveConversation: jest.fn().mockImplementation(async (_p, s) => { saved.push(s) }),
    },
    understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '123', parsel: '45' }) },
    resolveDeps: {} as never,
    buildCard: jest.fn().mockResolvedValue(CARD_OK),
    sendText: jest.fn().mockImplementation(async (_to: string, b: string) => { sent.push(b) }),
    siteUrlFor: () => 'https://www.arsabil.com/deger?x=1',
    checkRateLimit: jest.fn().mockReturnValue({ ok: true }),
    ...over,
  }
  // resolveLocation gerçek modül; resolveDeps'i onun beklediği şekilde sahle
  return { deps, sent, saved }
}

const msg = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  from: '905321234567', text: 'Trabzon Ortahisar Uğurlu 123/45',
  messageId: 'wamid.1', timestamp: 1, type: 'text', ...over,
})

jest.mock('../resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }),
}))
import { resolveLocation } from '../resolveLocation'

describe('handleMessage', () => {
  beforeEach(() => { (resolveLocation as jest.Mock).mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }) })

  it('tam sorgu → kart mesajı gönderir', async () => {
    const { deps, sent } = makeDeps()
    await handleMessage(msg(), deps)
    expect(deps.buildCard).toHaveBeenCalledWith(5000, '123', '45')
    expect(sent.join('')).toContain('Uğurlu Mah., Ortahisar / Trabzon')
  })

  it('eksik ilçe → soru sorar ve pending kaydeder', async () => {
    const { deps, sent, saved } = makeDeps({
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ada: '1', parsel: '2' }) },
    })
    await handleMessage(msg({ text: 'Trabzon 1/2' }), deps)
    expect(sent[0]).toContain('hangi ilçe')
    expect(saved[0]).toMatchObject({ pending: 'ilce' })
    expect(deps.buildCard).not.toHaveBeenCalled()
  })

  it('belirsiz mahalle → seçim ister, sonra numara ile çözer', async () => {
    ;(resolveLocation as jest.Mock)
      .mockResolvedValueOnce({ kind: 'ambiguous', level: 'mahalle', candidates: [{ id: 5000, text: 'Uğurlu' }, { id: 5001, text: 'Uğurluoğlu' }] })
      .mockResolvedValueOnce({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
    const load = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ state: { candidates: [{ id: 5000, text: 'Uğurlu' }, { id: 5001, text: 'Uğurluoğlu' }], candidateLevel: 'mahalle', fields: { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'uğur', ada: '1', parsel: '2' } }, lastMessageId: 'wamid.1' })
    const { deps, sent } = makeDeps({
      store: { loadConversation: load, saveConversation: jest.fn() },
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'uğur', ada: '1', parsel: '2' }) },
    })
    await handleMessage(msg({ messageId: 'wamid.1' }), deps)
    expect(sent[0]).toContain('1) Uğurlu')
    await handleMessage(msg({ text: '1', messageId: 'wamid.2' }), deps)
    expect(sent[1]).toContain('Uğurlu Mah.')
  })

  it('idempotent retry (aynı messageId) → hiçbir şey yapmaz', async () => {
    const { deps, sent } = makeDeps({
      store: {
        loadConversation: jest.fn().mockResolvedValue({ state: { fields: {} }, lastMessageId: 'wamid.1' }),
        saveConversation: jest.fn(),
      },
    })
    await handleMessage(msg({ messageId: 'wamid.1' }), deps)
    expect(sent).toEqual([])
    expect(deps.sendText).not.toHaveBeenCalled()
  })

  it('non-text → "sadece yazı" mesajı, state kaydetmez', async () => {
    const { deps, sent } = makeDeps()
    await handleMessage(msg({ type: 'other', text: '' }), deps)
    expect(sent[0]).toContain('sadece yazılı')
    expect(deps.store.saveConversation).not.toHaveBeenCalled()
  })

  it('rate limit aşıldı → uyarı, başka iş yok', async () => {
    const { deps, sent } = makeDeps({ checkRateLimit: jest.fn().mockReturnValue({ ok: false, retryAfterSec: 30 }) })
    await handleMessage(msg(), deps)
    expect(sent[0]).toContain('Çok fazla sorgu')
    expect(deps.understanding.understand).not.toHaveBeenCalled()
  })

  it('F1: ilk temas "merhaba nasılsın" → tek help mesajı, pending kaydı yok', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValue({ kind: 'notfound', level: 'il', term: 'merhaba' })
    const { deps, sent, saved } = makeDeps({
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'merhaba', ilceText: 'nasılsın' }) },
    })
    await handleMessage(msg({ text: 'merhaba nasılsın', messageId: 'wamid.h1' }), deps)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('Trabzon Ortahisar Uğurlu 123/45')
    expect(saved.some((s) => (s as { pending?: string }).pending != null)).toBe(false)
    expect(deps.buildCard).not.toHaveBeenCalled()
  })

  it('F2: belirsizlik ortasında yeni sorgu "Rize Merkez İslampaşa 1/2" → eski adaylar düşer', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValue({ kind: 'resolved', mahalleId: 7000, il: 'Rize', ilce: 'Merkez', mahalle: 'İslampaşa' })
    const load = jest.fn().mockResolvedValue({
      state: { candidates: [{ id: 1, text: 'Uğurlu' }, { id: 2, text: 'Uğurluoğlu' }], candidateLevel: 'mahalle', fields: { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'uğur' } },
      lastMessageId: 'wamid.prev',
    })
    const { deps, sent } = makeDeps({
      store: { loadConversation: load, saveConversation: jest.fn() },
      understanding: { understand: jest.fn().mockResolvedValue({ ilText: 'Rize', ilceText: 'Merkez', mahalleText: 'İslampaşa', ada: '1', parsel: '2' }) },
    })
    await handleMessage(msg({ text: 'Rize Merkez İslampaşa 1/2', messageId: 'wamid.new' }), deps)
    expect(deps.buildCard).toHaveBeenCalledWith(7000, '1', '2')
    expect(sent.join('')).not.toContain('birden fazla eşleşme')
  })

  it('F2: pending-ada ortasında "iptal" → help() gönderir, state temizlenir', async () => {
    const load = jest.fn().mockResolvedValue({
      state: { pending: 'ada', fields: { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ilId: 1, ilceId: 2, mahalleId: 3 } },
      lastMessageId: 'wamid.prev',
    })
    const saveMock = jest.fn()
    const { deps, sent } = makeDeps({ store: { loadConversation: load, saveConversation: saveMock } })
    await handleMessage(msg({ text: 'iptal', messageId: 'wamid.cancel' }), deps)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('Trabzon Ortahisar Uğurlu 123/45')
    expect(saveMock).toHaveBeenCalledWith('905321234567', { fields: {} }, 'wamid.cancel')
    expect(deps.buildCard).not.toHaveBeenCalled()
  })

  it('parcel_not_found → ada/parsel sıfırlar, pending ada', async () => {
    const { deps, sent, saved } = makeDeps({
      buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }),
    })
    await handleMessage(msg(), deps)
    expect(sent[0]).toContain('bulunamadı')
    expect(saved[saved.length - 1]).toMatchObject({ pending: 'ada' })
  })
})
