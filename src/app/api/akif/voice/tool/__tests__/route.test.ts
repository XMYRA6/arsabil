const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const validateArgsMock = jest.fn()
const dispatchToolMock = jest.fn()
const logVoiceTurnMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: { AKIF_TURN: { limit: 8, windowMs: 60_000 } },
}))
jest.mock('@/lib/ai/akif/gateway/toolRegistry', () => ({
  validateArgs: (...a: unknown[]) => validateArgsMock(...a),
  dispatchTool: (...a: unknown[]) => dispatchToolMock(...a),
}))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ logVoiceTurn: (...a: unknown[]) => logVoiceTurnMock(...a) }),
}))

import { POST } from '../route'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  validateArgsMock.mockReturnValue({ ok: true })
})

const req = (body: unknown) =>
  new Request('http://x/api/akif/voice/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(401)
})

it('geçersiz gövde → 400', async () => {
  const res = await POST(req({ toolName: 'explainTerm' }))
  expect(res.status).toBe(400)
})

it('gövde JSON değil → 400', async () => {
  const res = await POST(
    new Request('http://x/api/akif/voice/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }),
  )
  expect(res.status).toBe(400)
})

it('validateArgs başarısız → 200 invalid_args (HTTP hatası DEĞİL)', async () => {
  validateArgsMock.mockReturnValue({ ok: false, field: 'emsal', reason: 'geçersiz aralık' })
  const res = await POST(req({ sessionId: 's', toolName: 'compareContractorOffers', args: {} }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ error: 'invalid_args', field: 'emsal', reason: 'geçersiz aralık' })
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('bilinmeyen toolName → 200 invalid_args field=name', async () => {
  const res = await POST(req({ sessionId: 's', toolName: 'wipeDatabase', args: {} }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    error: 'invalid_args',
    field: 'name',
    reason: 'bilinmeyen araç',
  })
  expect(validateArgsMock).not.toHaveBeenCalled()
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('mutlu yol → doğrulanmış kart + audit', async () => {
  const card = { kind: 'term', term: 'emsal', shortDef: '...', example: '...' }
  dispatchToolMock.mockResolvedValue(card)
  const res = await POST(req({ sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual(card)
  expect(logVoiceTurnMock).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: 'sess-1', tool: 'explainTerm' }),
  )
})

it('dispatch fırlatırsa → 502 tool_unavailable, audit yazılmaz', async () => {
  dispatchToolMock.mockRejectedValue(new Error('engine boom'))
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'tool_unavailable' })
  expect(logVoiceTurnMock).not.toHaveBeenCalled()
})

it('rate-limit aşıldı → 429', async () => {
  checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 })
  const res = await POST(req({ sessionId: 's', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(429)
})
