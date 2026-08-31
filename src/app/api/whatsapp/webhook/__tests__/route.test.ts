const handleMessageMock = jest.fn()
const verifySignatureMock = jest.fn()
const afterMock = jest.fn((cb: () => void) => cb())

jest.mock('next/server', () => ({ after: (cb: () => void) => afterMock(cb) }))
jest.mock('@/lib/whatsapp/config', () => ({
  readWhatsappConfig: () => ({ verifyToken: 'VT', appSecret: 'AS', accessToken: 'AT', phoneNumberId: 'PN', graphVersion: 'v21.0' }),
}))
jest.mock('@/lib/whatsapp/verifySignature', () => ({ verifySignature: (...a: unknown[]) => verifySignatureMock(...a) }))
jest.mock('@/lib/whatsapp/handleMessage', () => ({ handleMessage: (...a: unknown[]) => handleMessageMock(...a) }))
jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/deger/card', () => ({ buildDegerCard: jest.fn() }))
jest.mock('@/lib/tkgm/parcel', () => ({ fetchParcelByAdaParsel: jest.fn(), fetchParcelByPoint: jest.fn() }))
jest.mock('@/lib/tkgm/idariYapi', () => ({ fetchIlListesi: jest.fn(), fetchIlceListesi: jest.fn(), fetchMahalleListesi: jest.fn() }))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: jest.fn() }))

import { GET, POST } from '../route'

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
  })
  it('bozuk JSON gövde → 200 (Meta retry fırtınası olmasın), handleMessage yok', async () => {
    verifySignatureMock.mockReturnValue(true)
    const res = await POST(new Request('http://x', { method: 'POST', body: 'not json', headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
    expect(handleMessageMock).not.toHaveBeenCalled()
  })
  it('handleMessage reject olsa da POST 200 döner', async () => {
    verifySignatureMock.mockReturnValue(true)
    handleMessageMock.mockRejectedValue(new Error('boom'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(new Request('http://x', { method: 'POST', body: textBody, headers: { 'x-hub-signature-256': 'sha256=ok' } }))
    expect(res.status).toBe(200)
  })
})
