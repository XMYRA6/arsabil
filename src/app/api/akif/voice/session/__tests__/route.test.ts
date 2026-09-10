const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const readVoiceEnvMock = jest.fn()
const checkVoiceQuotaMock = jest.fn()
const fetchMock = jest.fn()
const createVoiceSessionMock = jest.fn()
const endStaleCallerSessionsMock = jest.fn()
const claimReconnectMock = jest.fn()
const voiceMonthSpendUsdMock = jest.fn().mockResolvedValue(0)
const voiceUserMonthSecondsMock = jest.fn()

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
  createVoiceAuditLogger: () => ({
    voiceMonthSpendUsd: voiceMonthSpendUsdMock,
    voiceUserMonthSeconds: voiceUserMonthSecondsMock,
  }),
}))
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({
  createVoiceSession: (...a: unknown[]) => createVoiceSessionMock(...a),
  endStaleCallerSessions: (...a: unknown[]) => endStaleCallerSessionsMock(...a),
  claimReconnect: (...a: unknown[]) => claimReconnectMock(...a),
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
  jest.spyOn(console, 'error').mockImplementation(() => {})
  global.fetch = fetchMock as never
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  readVoiceEnvMock.mockReturnValue(OK_ENV)
  checkVoiceQuotaMock.mockResolvedValue({ ok: true })
  claimReconnectMock.mockResolvedValue({ ok: true })
  voiceMonthSpendUsdMock.mockResolvedValue(0)
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ value: 'ek_abc', expires_at: 1756310470 }),
  })
})

const req = () => new Request('http://x/api/akif/voice/session', { method: 'POST' })

const resumeReq = (id: string) =>
  new Request('http://x/api/akif/voice/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeSessionId: id }),
  })

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

it('OpenAI token çağrısı başarısız (!ok) → 502', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
  const res = await POST(req())
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'upstream' })
})

it('fetch throw eder → 502 upstream', async () => {
  fetchMock.mockRejectedValue(new Error('net'))
  const res = await POST(req())
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'upstream' })
})

it('OpenAI 200 ama value yok → 502 upstream', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
  const res = await POST(req())
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'upstream' })
})

it('mutlu yol → 200 token + sessionId + model + OpenAI isteği', async () => {
  const res = await POST(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.token).toBe('ek_abc')
  expect(body.model).toBe('gpt-realtime-mini')
  expect(body.sessionMaxSec).toBe(600)
  expect(typeof body.sessionId).toBe('string')

  // OpenAI'ye giden isteğin tamamı — ham anahtar YALNIZ header'da olmalı.
  const call = fetchMock.mock.calls[0]
  expect(call[0]).toBe('https://api.openai.com/v1/realtime/client_secrets')
  expect(call[1].method).toBe('POST')
  expect(call[1].headers.Authorization).toBe('Bearer sk-x')
  expect(call[1].headers['Content-Type']).toBe('application/json')
  const sent = JSON.parse(call[1].body)
  expect(sent.expires_after.ttl).toBe('2m')
  expect(sent.session.type).toBe('realtime')
})

it('mint: kayıt satırı create edilir + bayat sweep çağrılır', async () => {
  const res = await POST(req())
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(createVoiceSessionMock).toHaveBeenCalledWith(expect.anything(), body.sessionId, 'u1')
  expect(endStaleCallerSessionsMock).toHaveBeenCalled()
})

it('resume: geçerli → aynı sessionId + atomik reconnect claim, quota kontrol edilmez', async () => {
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.sessionId).toBe('sess-abc')
  expect(claimReconnectMock).toHaveBeenCalledWith(
    expect.anything(),
    'sess-abc',
    'u1',
    expect.any(Date),
    600,
  )
  expect(checkVoiceQuotaMock).not.toHaveBeenCalled()
  expect(createVoiceSessionMock).not.toHaveBeenCalled()
})

it('resume: claimReconnect ön-kontrolde reddeder (stale) → 409 resume_denied', async () => {
  claimReconnectMock.mockResolvedValue({ ok: false, reason: 'stale' })
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(409)
  const j = await res.json()
  expect(j.error).toBe('resume_denied')
  expect(j.reason).toBe('stale')
})

it('resume: eşzamanlı yarışı kaybeden (claimReconnect already_reconnected) → 409', async () => {
  claimReconnectMock.mockResolvedValue({ ok: false, reason: 'already_reconnected' })
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(409)
  const j = await res.json()
  expect(j.error).toBe('resume_denied')
  expect(j.reason).toBe('already_reconnected')
})

it('resume: global bütçe aşıldı → 503, kullanıcı kotası aşıksa bile 200', async () => {
  voiceMonthSpendUsdMock.mockResolvedValueOnce(999)
  const res = await POST(resumeReq('sess-abc'))
  expect(res.status).toBe(503)
})
