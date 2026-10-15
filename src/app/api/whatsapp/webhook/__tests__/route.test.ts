const handleMessageMock = jest.fn()
const verifySignatureMock = jest.fn()
const afterMock = jest.fn((cb: () => void) => cb())
const createAkifModelMock = jest.fn((..._a: unknown[]) => ({ chatWithTools: jest.fn(), finalStructured: jest.fn() }))
const createAuditLoggerMock = jest.fn((..._a: unknown[]) => ({ logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) }))

jest.mock('next/server', () => ({ after: (cb: () => void) => afterMock(cb) }))
jest.mock('@/lib/whatsapp/config', () => ({
  readWhatsappConfig: () => ({ verifyToken: 'VT', appSecret: 'AS', accessToken: 'AT', phoneNumberId: 'PN', graphVersion: 'v21.0' }),
}))
jest.mock('@/lib/whatsapp/verifySignature', () => ({ verifySignature: (...a: unknown[]) => verifySignatureMock(...a) }))
jest.mock('@/lib/whatsapp/akifHandleMessage', () => ({ runWhatsappAkifTurn: (...a: unknown[]) => handleMessageMock(...a) }))
jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    chat = {}
  },
}))
jest.mock('@/lib/ai/akif/openaiClient', () => ({
  readAkifEnv: () => ({ apiKey: 'sk-x', model: 'gpt-4o-mini', maxTurnTokens: 6000, monthlyBudgetUsd: 20 }),
  numEnv: (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return v != null && v !== '' && Number.isFinite(n) && n > 0 ? n : fallback
  },
  createAkifModel: (...a: unknown[]) => createAkifModelMock(...a),
}))
jest.mock('@/lib/ai/akif/audit', () => ({
  createAuditLogger: (...a: unknown[]) => createAuditLoggerMock(...a),
}))
jest.mock('@/lib/ai/akif/costGuard', () => ({
  checkConversationBudget: jest.fn().mockReturnValue({ ok: true }),
  checkMonthlyBudget: jest.fn().mockResolvedValue({ ok: true, spent: 0 }),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    whatsappSubscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}))
jest.mock('@/lib/deger/card', () => ({ buildDegerCard: jest.fn() }))
jest.mock('@/lib/tkgm/parcel', () => ({ fetchParcelByAdaParsel: jest.fn(), fetchParcelByPoint: jest.fn() }))
jest.mock('@/lib/tkgm/idariYapi', () => ({ fetchIlListesi: jest.fn(), fetchIlceListesi: jest.fn(), fetchMahalleListesi: jest.fn() }))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: jest.fn() }))

import { GET, POST } from '../route'
import { WA_AKIF_TOOL_DEFS } from '@/lib/whatsapp/akifToolGateway'
import { prisma } from '@/lib/prisma'

const textBody = JSON.stringify({
  entry: [{ changes: [{ value: { messages: [{ from: '905321234567', id: 'wamid.1', timestamp: '1', type: 'text', text: { body: 'Trabzon Of 1/2' } }] } }] }],
})

describe('GET /api/whatsapp/webhook', () => {
  it('doğru verify_token → challenge 200', async () => {
    const res = await GET(new Request('http://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=VT&hub.challenge=42'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('42')
  })
  it('yanlış token → 403', async () => {
    const res = await GET(new Request('http://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=42'))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/whatsapp/webhook', () => {
  beforeEach(() => { handleMessageMock.mockReset(); verifySignatureMock.mockReset() })
  it('geçersiz imza → 403, handleMessage çağrılmaz', async () => {
    verifySignatureMock.mockReturnValue(false)
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=bad' } }))
    expect(res.status).toBe(403)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })
  it('geçerli imza → 200 + handleMessage (after ile) çağrılır', async () => {
    verifySignatureMock.mockReturnValue(true)
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(afterMock).toHaveBeenCalled()
    expect(handleMessageMock).toHaveBeenCalledTimes(1)
    expect(handleMessageMock.mock.calls[0][0]).toMatchObject({ from: '905321234567', messageId: 'wamid.1', type: 'text' })
    expect(typeof handleMessageMock.mock.calls[0][1].loadMemoryContext).toBe('function')
  })
  it('bozuk JSON gövde → 200 (Meta retry fırtınası olmasın), handleMessage yok', async () => {
    verifySignatureMock.mockReturnValue(true)
    const res = await POST(new Request('http://x', { method: 'POST', body: 'not json', headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })
  it('kanal izolasyonu: createAuditLogger wa: prefix ile, createAkifModel WA_AKIF_TOOL_DEFS ile çağrılır', async () => {
    verifySignatureMock.mockReturnValue(true)
    createAuditLoggerMock.mockClear()
    createAkifModelMock.mockClear()
    await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(createAuditLoggerMock).toHaveBeenCalledWith(expect.anything(), { conversationIdPrefix: 'wa:' })
    expect(createAkifModelMock).toHaveBeenCalledTimes(1)
    const modelCallArg = createAkifModelMock.mock.calls[0][0] as { toolDefs?: unknown[] }
    expect(modelCallArg.toolDefs).toBe(WA_AKIF_TOOL_DEFS)
  })

  it('handleMessage reject olsa da POST 200 döner', async () => {
    verifySignatureMock.mockReturnValue(true)
    handleMessageMock.mockRejectedValue(new Error('boom'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
  })

  it('tek POST, iki farklı telefon: her mesajın bağımlılıkları kendi telefonuna bağlı', async () => {
    verifySignatureMock.mockReturnValue(true)
    handleMessageMock.mockReset().mockResolvedValue(undefined)
    const two = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [
        { from: '905000000001', id: 'wamid.a', timestamp: '1', type: 'text', text: { body: 'bir' } },
        { from: '905000000002', id: 'wamid.b', timestamp: '2', type: 'text', text: { body: 'iki' } },
      ] } }] }],
    })
    const findUnique = prisma.user.findUnique as unknown as jest.Mock
    findUnique.mockClear()
    const res = await POST(new Request('http://x', { method: 'POST', body: two, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(handleMessageMock).toHaveBeenCalledTimes(2)
    const [m1, d1] = handleMessageMock.mock.calls[0]
    const [m2, d2] = handleMessageMock.mock.calls[1]
    expect(m1.from).toBe('905000000001')
    expect(m2.from).toBe('905000000002')
    expect(d1).not.toBe(d2)
    expect(d1.dispatch).not.toBe(d2.dispatch)

    // loadMemoryContext: her çağrı kendi mesajının telefonuyla DB'ye gider.
    await d1.loadMemoryContext(m1.from)
    await d2.loadMemoryContext(m2.from)
    expect(findUnique.mock.calls.map((c) => c[0].where.whatsappPhone)).toEqual(['905000000001', '905000000002'])

    // dispatch: projectToolDeps.phone her mesajın kendi telefonu (kullanıcı arama kendi telefonuyla yapılır).
    findUnique.mockClear()
    await d1.dispatch('summarizeProject', { projectId: 'x' }).catch(() => undefined)
    await d2.dispatch('summarizeProject', { projectId: 'x' }).catch(() => undefined)
    expect(findUnique.mock.calls.map((c) => c[0].where.whatsappPhone)).toEqual(['905000000001', '905000000002'])
  })
})
