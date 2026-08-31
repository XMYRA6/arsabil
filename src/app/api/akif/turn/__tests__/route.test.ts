const checkRateLimitMock = jest.fn()
const runAkifTurnMock = jest.fn()
const readAkifEnvMock = jest.fn()
const createAkifModelMock = jest.fn()
const createAuditLoggerMock = jest.fn()
const checkMonthlyBudgetMock = jest.fn()
const checkConversationBudgetMock = jest.fn()
const dispatchToolMock = jest.fn()
const validateArgsMock = jest.fn()
const openAICtor = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    constructor(...a: unknown[]) {
      openAICtor(...a)
    }
    chat = {}
  },
}))
jest.mock('@/lib/ai/akif/orchestrator', () => ({
  runAkifTurn: (...a: unknown[]) => runAkifTurnMock(...a),
}))
jest.mock('@/lib/ai/akif/openaiClient', () => ({
  readAkifEnv: (...a: unknown[]) => readAkifEnvMock(...a),
  createAkifModel: (...a: unknown[]) => createAkifModelMock(...a),
  estimateCostUsd: jest.fn(),
}))
jest.mock('@/lib/ai/akif/audit', () => ({
  createAuditLogger: (...a: unknown[]) => createAuditLoggerMock(...a),
}))
jest.mock('@/lib/ai/akif/costGuard', () => ({
  checkMonthlyBudget: (...a: unknown[]) => checkMonthlyBudgetMock(...a),
  checkConversationBudget: (...a: unknown[]) => checkConversationBudgetMock(...a),
}))
jest.mock('@/lib/ai/akif/gateway/toolRegistry', () => ({
  dispatchTool: (...a: unknown[]) => dispatchToolMock(...a),
  validateArgs: (...a: unknown[]) => validateArgsMock(...a),
}))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.5',
  RATE_LIMITS: { AKIF_TURN: { limit: 8, windowMs: 60_000 } },
}))

import { POST } from '../route'

const TURN = {
  intent: 'consult',
  speech: 'Merhaba, arsanı konuşalım.',
  state: 'NEUTRAL',
  facts_used: [],
  assumptions: [],
  missing_fields: [],
  risk_level: 'low',
}

function req(body: unknown) {
  return new Request('http://localhost/api/akif/turn', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validBody = {
  conversationId: 'c1',
  history: [
    { role: 'user', content: 'selam' },
    { role: 'akif', content: 'merhaba' },
  ],
  userMessage: 'Arsam icin kat karsiligi mantikli mi?',
}

describe('POST /api/akif/turn', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    runAkifTurnMock.mockReset().mockResolvedValue(TURN)
    readAkifEnvMock
      .mockReset()
      .mockReturnValue({ apiKey: 'sk-x', model: 'gpt-4o-mini', maxTurnTokens: 6000, monthlyBudgetUsd: 20 })
    createAkifModelMock.mockReset().mockReturnValue({ chatWithTools: jest.fn(), finalStructured: jest.fn() })
    createAuditLoggerMock
      .mockReset()
      .mockReturnValue({ logTurn: jest.fn(), monthSpendUsd: jest.fn().mockResolvedValue(0) })
    checkMonthlyBudgetMock.mockReset().mockResolvedValue({ ok: true, spent: 0 })
    checkConversationBudgetMock.mockReset().mockReturnValue({ ok: true })
    dispatchToolMock.mockReset()
    validateArgsMock.mockReset()
    openAICtor.mockReset()
  })

  it('gecerli POST -> 200, runAkifTurn bir kez, donen turn body', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    expect(runAkifTurnMock.mock.calls[0][0]).toEqual({
      conversationId: 'c1',
      history: validBody.history,
      userMessage: validBody.userMessage,
    })
    expect(await res.json()).toEqual(TURN)
  })

  it('readAkifEnv throw -> 503 akif_unavailable', async () => {
    readAkifEnvMock.mockImplementation(() => {
      throw new Error('missing OPENAI_API_KEY')
    })
    const res = await POST(req(validBody))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'akif_unavailable' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('history 50 eleman -> 400', async () => {
    const history = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'akif',
      content: 'x',
    }))
    const res = await POST(req({ ...validBody, history }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad_request' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('userMessage bos -> 400', async () => {
    const res = await POST(req({ ...validBody, userMessage: '' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad_request' })
  })

  it('rate limit asildi -> 429 + Retry-After', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
    const res = await POST(req(validBody))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
    expect(await res.json()).toEqual({ error: 'rate_limited' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('runAkifTurn throw -> 502 akif_error', async () => {
    runAkifTurnMock.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(validBody))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'akif_error' })
    errSpy.mockRestore()
  })

  it('checkMonthlyBudget {ok:false} -> 503 monthly_budget', async () => {
    checkMonthlyBudgetMock.mockResolvedValue({ ok: false, spent: 99 })
    const res = await POST(req(validBody))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'akif_unavailable', reason: 'monthly_budget' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
  })

  it('bozuk JSON -> 400', async () => {
    const res = await POST(req('{not json'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad_request' })
  })
})
