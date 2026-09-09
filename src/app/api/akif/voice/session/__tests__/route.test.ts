const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const readVoiceEnvMock = jest.fn()
const checkVoiceQuotaMock = jest.fn()
const fetchMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: { AKIF_VOICE_SESSION: { limit: 5, windowMs: 3_600_000 } },
}))
jest.mock('@/lib/ai/akif/voice/voiceEnv', () => ({ readVoiceEnv: (...a: unknown[]) => readVoiceEnvMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceQuota', () => ({ checkVoiceQuota: (...a: unknown[]) => checkVoiceQuotaMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ voiceMonthSpendUsd: jest.fn(), voiceUserMonthSeconds: jest.fn() }),
}))
jest.mock('@/lib/ai/akif/voice/realtimeSession', () => ({
  buildRealtimeSessionConfig: () => ({ type: 'realtime', model: 'gpt-realtime-mini' }),
}))

import { POST } from '../route'

const OK_ENV = {
  apiKey: 'sk-x', model: 'gpt-realtime-mini', voiceName: 'marin',
  monthlyBudgetUsd: 30, userMonthlyMinutes: 30, sessionMaxSec: 600, smokeBudgetUsd: 1,
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchMock as never
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  readVoiceEnvMock.mockReturnValue(OK_ENV)
  checkVoiceQuotaMock.mockResolvedValue({ ok: true })
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ value: 'ek_abc', expires_at: 1756310470 }),
  })
})

const req = () => new Request('http://x/api/akif/voice/session', { method: 'POST' })

it('rate-limit aşılınca 429', async () => {
  checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 120 })
  const res = await POST(req())
  expect(res.status).toBe(429)
})

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  const res = await POST(req())
  expect(res.status).toBe(401)
})

it('env yoksa 503 akif_unavailable', async () => {
  readVoiceEnvMock.mockImplementation(() => { throw new Error('akif_unavailable') })
  const res = await POST(req())
  expect(res.status).toBe(503)
  expect(await res.json()).toEqual({ error: 'akif_unavailable' })
})

it('global bütçe aşıldı → 503 monthly_budget', async () => {
  checkVoiceQuotaMock.mockResolvedValue({ ok: false, reason: 'monthly_budget' })
  const res = await POST(req())
  expect(res.status).toBe(503)
  expect((await res.json()).reason).toBe('monthly_budget')
})

it('kullanıcı kotası aşıldı → 429 user_quota', async () => {
  checkVoiceQuotaMock.mockResolvedValue({ ok: false, reason: 'user_quota', remainingSec: 0 })
  const res = await POST(req())
  expect(res.status).toBe(429)
  expect((await res.json()).reason).toBe('user_quota')
})

it('OpenAI token çağrısı başarısız → 502', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
  const res = await POST(req())
  expect(res.status).toBe(502)
})

it('mutlu yol → 200 token + sessionId + model', async () => {
  const res = await POST(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.token).toBe('ek_abc')
  expect(body.model).toBe('gpt-realtime-mini')
  expect(body.sessionMaxSec).toBe(600)
  expect(typeof body.sessionId).toBe('string')
  // OpenAI'ye doğru endpoint + body
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.openai.com/v1/realtime/client_secrets',
    expect.objectContaining({ method: 'POST' }),
  )
})
