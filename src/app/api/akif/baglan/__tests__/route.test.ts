const getServerSessionMock = jest.fn()
const consumeClaimMock = jest.fn()
const sendTextMock = jest.fn().mockResolvedValue(undefined)
const checkRateLimitMock = jest.fn().mockReturnValue({ ok: true })

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/akifProje/claim', () => ({ consumeClaim: (...a: unknown[]) => consumeClaimMock(...a) }))
jest.mock('@/lib/whatsapp/config', () => ({ readWhatsappConfig: () => ({}) }))
jest.mock('@/lib/whatsapp/sendMessage', () => ({ createSendText: () => sendTextMock }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
}))

import { POST } from '../route'

const req = (body: unknown) =>
  new Request('http://localhost/api/akif/baglan', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => {
  jest.clearAllMocks()
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  checkRateLimitMock.mockReturnValue({ ok: true })
})

describe('POST /api/akif/baglan', () => {
  it('oturum yoksa 401', async () => {
    getServerSessionMock.mockResolvedValue(null)
    expect((await POST(req({ token: 't' }))).status).toBe(401)
    expect(consumeClaimMock).not.toHaveBeenCalled()
  })

  it('Content-Type application/json değilse 415 (CSRF derinlik savunması), claim tüketilmez', async () => {
    const r = new Request('http://localhost/api/akif/baglan', {
      method: 'POST',
      body: JSON.stringify({ token: 't' }),
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await POST(r)
    expect(res.status).toBe(415)
    expect(typeof (await res.json()).message).toBe('string')
    expect(consumeClaimMock).not.toHaveBeenCalled()
  })

  it('token eksik/uzun ise 400', async () => {
    expect((await POST(req({}))).status).toBe(400)
    expect((await POST(req({ token: 'x'.repeat(300) }))).status).toBe(400)
  })

  it('rate-limit aşılırsa 429', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false })
    expect((await POST(req({ token: 't' }))).status).toBe(429)
  })

  it.each([
    ['invalid', 400],
    ['used', 409],
    ['expired', 410],
    ['phone_taken', 409],
    ['user_has_other_phone', 409],
  ])('claim %s → %i', async (reason, status) => {
    consumeClaimMock.mockResolvedValue({ ok: false, reason })
    const res = await POST(req({ token: 't' }))
    expect(res.status).toBe(status)
    expect(typeof (await res.json()).message).toBe('string')
    expect(sendTextMock).not.toHaveBeenCalled()
  })

  it('başarılı: taslak yoksa genel bağlandı mesajı yollar', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567' })
    const res = await POST(req({ token: 't' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: false, savedProjectName: null })
    expect(sendTextMock).toHaveBeenCalledWith('905321234567', expect.stringContaining('bağlandı'))
  })

  it('başarılı + taslak: proje adı döner ve WhatsApp mesajı projeyi anar', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567', saved: { projectId: 'pk1', name: 'Maçka' } })
    const res = await POST(req({ token: 't' }))
    expect(await res.json()).toEqual({ ok: true, saved: true, savedProjectName: 'Maçka' })
    expect(sendTextMock).toHaveBeenCalledWith('905321234567', expect.stringContaining('Maçka'))
  })

  it('WhatsApp bildirimi başarısız olsa da bağlama başarılı sayılır', async () => {
    consumeClaimMock.mockResolvedValue({ ok: true, phone: '905321234567' })
    sendTextMock.mockRejectedValueOnce(new Error('24 saat penceresi'))
    expect((await POST(req({ token: 't' }))).status).toBe(200)
  })
})
