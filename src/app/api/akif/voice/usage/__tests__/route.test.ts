const getServerSessionMock = jest.fn()
const logVoiceSessionMock = jest.fn()
const readVoiceEnvMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  RATE_LIMITS: { AKIF_VOICE_USAGE: { limit: 10, windowMs: 3_600_000 } },
}))
jest.mock('@/lib/ai/akif/voice/voiceEnv', () => ({ readVoiceEnv: (...a: unknown[]) => readVoiceEnvMock(...a) }))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ logVoiceSession: (...a: unknown[]) => logVoiceSessionMock(...a) }),
}))

import { POST } from '../route'

// startedAtMs artık 24 saatlik sağduyu penceresine tabi — sabit geçmiş damga yerine dinamik.
const START = Date.now() - 180_000

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  readVoiceEnvMock.mockReturnValue({ model: 'gpt-realtime-mini', sessionMaxSec: 600 })
  logVoiceSessionMock.mockResolvedValue(undefined)
  checkRateLimitMock.mockReturnValue({ ok: true })
})

const body = (o: Record<string, unknown>) =>
  new Request('http://x/api/akif/voice/usage', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      sessionId: 'sess-1',
      startedAtMs: START,
      durationSec: 180,
      toolCalls: 1,
      realtimeUsage: null,
      endReason: 'user_ended',
      ...o,
    }),
  })

it('giriş yoksa 401', async () => {
  getServerSessionMock.mockResolvedValue(null)
  const res = await POST(body({}))
  expect(res.status).toBe(401)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('JSON olmayan gövde → 400', async () => {
  const res = await POST(new Request('http://x', { method: 'POST', body: 'not json' }))
  expect(res.status).toBe(400)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('zorunlu alan eksik/geçersiz → 400', async () => {
  const res = await POST(body({ durationSec: -1 }))
  expect(res.status).toBe(400)
  const res2 = await POST(body({ sessionId: '' }))
  expect(res2.status).toBe(400)
  const res3 = await POST(body({ toolCalls: 'x' }))
  expect(res3.status).toBe(400)
  const res4 = await POST(body({ startedAtMs: 'nope' }))
  expect(res4.status).toBe(400)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('mutlu yol → logVoiceSession çağrılır, maliyet hesaplanır', async () => {
  const res = await POST(body({}))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
  const arg = logVoiceSessionMock.mock.calls[0][0]
  expect(arg).toEqual(
    expect.objectContaining({
      sessionId: 'sess-1',
      userId: 'u1',
      durationSec: 180,
      toolCalls: 1,
      endReason: 'user_ended',
    }),
  )
  expect(arg.startedAt instanceof Date).toBe(true)
  expect(arg.startedAt.getTime()).toBe(START)
  expect(arg.estCostUsd).toBeGreaterThan(0)
})

it('bilinmeyen endReason → error normalize', async () => {
  const res = await POST(body({ endReason: 'garip' }))
  expect(res.status).toBe(200)
  expect(logVoiceSessionMock.mock.calls[0][0].endReason).toBe('error')
})

it('realtimeUsage verilince token-bazlı maliyet', async () => {
  await POST(body({ realtimeUsage: { inputAudioTokens: 60000, outputAudioTokens: 30000 } }))
  expect(logVoiceSessionMock.mock.calls[0][0].estCostUsd).toBeCloseTo(1.2, 3)
})

it('geçersiz şekilli realtimeUsage → yok sayılır (süre-bazlı maliyet)', async () => {
  await POST(body({ realtimeUsage: { inputAudioTokens: 60000 } }))
  // token-bazlı olsaydı 1.2'ye yakın olurdu; süre-bazlı ~0.09
  expect(logVoiceSessionMock.mock.calls[0][0].estCostUsd).toBeLessThan(0.5)
  expect(logVoiceSessionMock.mock.calls[0][0].estCostUsd).toBeGreaterThan(0)
})

it('readVoiceEnv patlar (anahtar yok) → yine de fallback model ile kayıt yazılır', async () => {
  readVoiceEnvMock.mockImplementation(() => {
    throw new Error('akif_unavailable')
  })
  const res = await POST(body({}))
  expect(res.status).toBe(200)
  expect(logVoiceSessionMock.mock.calls[0][0].estCostUsd).toBeGreaterThan(0)
})

// --- I2: forge / griefing koruması ---

it('forge edilmiş devasa realtimeUsage → null a düşer (süre-bazlı maliyet, dev sayı değil)', async () => {
  await POST(
    body({
      durationSec: 120,
      realtimeUsage: { inputAudioTokens: 5_000_000_000, outputAudioTokens: 5_000_000_000 },
    }),
  )
  const cost = logVoiceSessionMock.mock.calls[0][0].estCostUsd
  // token-bazlı olsaydı milyarlarca $ ; süre-bazlı 2 dk mini ~ $0.05
  expect(cost).toBeLessThan(1)
  expect(cost).toBeGreaterThan(0)
})

it('durationSec tavanın çok üstünde → clamp (sessionMaxSec + 30)', async () => {
  await POST(body({ durationSec: 999_999, realtimeUsage: null }))
  expect(logVoiceSessionMock.mock.calls[0][0].durationSec).toBe(630)
})

it('startedAtMs gelecekte → 400', async () => {
  const res = await POST(body({ startedAtMs: Date.now() + 5 * 60 * 60 * 1000 }))
  expect(res.status).toBe(400)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('startedAtMs 24 saatten eski → 400', async () => {
  const res = await POST(body({ startedAtMs: Date.now() - 48 * 60 * 60 * 1000 }))
  expect(res.status).toBe(400)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})

it('rate-limit aşıldı → 429, kayıt yazılmaz', async () => {
  checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 60 })
  const res = await POST(body({}))
  expect(res.status).toBe(429)
  expect(logVoiceSessionMock).not.toHaveBeenCalled()
})
