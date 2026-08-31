import { mergeFields, createPrismaConversationStore, TTL_MS } from '../conversation'

describe('mergeFields', () => {
  it('yeni dolu alanlar eskiyi ezer, boşlar korur', () => {
    const r = mergeFields(
      { ilText: 'Trabzon', ilId: 61, ada: '1' },
      { ilceText: 'Of', ada: undefined },
    )
    expect(r).toEqual({ ilText: 'Trabzon', ilId: 61, ada: '1', ilceText: 'Of' })
  })
  it('ilText değişince alt seviye id\'leri korunur (çağıran temizler)', () => {
    const r = mergeFields({ ilText: 'Trabzon', ilId: 61 }, { ilText: 'Rize' })
    expect(r.ilText).toBe('Rize')
    expect(r.ilId).toBe(61)
  })
})

describe('createPrismaConversationStore', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    state: { fields: { ilText: 'Trabzon' } },
    lastMessageId: 'wamid.X',
    updatedAt: new Date(1_000_000),
    ...over,
  })
  it('taze satır döner', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(row()), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never, () => 1_000_000 + TTL_MS - 1)
    const r = await store.loadConversation('905321234567')
    expect(r?.lastMessageId).toBe('wamid.X')
  })
  it('TTL dolmuşsa null', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(row()), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never, () => 1_000_000 + TTL_MS + 1)
    expect(await store.loadConversation('905321234567')).toBeNull()
  })
  it('satır yoksa null', async () => {
    const db = { whatsappConversation: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() } }
    const store = createPrismaConversationStore(db as never)
    expect(await store.loadConversation('x')).toBeNull()
  })
  it('saveConversation upsert çağırır', async () => {
    const upsert = jest.fn().mockResolvedValue({})
    const db = { whatsappConversation: { findUnique: jest.fn(), upsert } }
    const store = createPrismaConversationStore(db as never)
    await store.saveConversation('905321234567', { fields: { ada: '1' } }, 'wamid.Y')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone: '905321234567' },
      create: expect.objectContaining({ phone: '905321234567', lastMessageId: 'wamid.Y' }),
      update: expect.objectContaining({ lastMessageId: 'wamid.Y' }),
    }))
  })
})
