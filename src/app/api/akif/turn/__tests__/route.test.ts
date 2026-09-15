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
const getServerSessionMock = jest.fn()
const projectFindFirstMock = jest.fn()
const projectUpdateManyMock = jest.fn()

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
jest.mock('@/lib/prisma', () => ({
  prisma: {
    __brand: 'prisma',
    project: {
      findFirst: (...a: unknown[]) => projectFindFirstMock(...a),
      updateMany: (...a: unknown[]) => projectUpdateManyMock(...a),
    },
  },
}))
jest.mock('next-auth/next', () => ({
  getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
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
    getServerSessionMock.mockReset().mockResolvedValue(null)
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
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

describe('POST /api/akif/turn — Arsa Dosyası (Akif-3)', () => {
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
    getServerSessionMock.mockReset().mockResolvedValue(null)
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
  })

  it('projectId gönderilmezse oturum/proje sorgusu hiç yapılmaz', async () => {
    await POST(req(validBody))
    expect(getServerSessionMock).not.toHaveBeenCalled()
    expect(projectFindFirstMock).not.toHaveBeenCalled()
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
  })

  it('projectId var ama oturum yok -> sessizce yok sayılır, 200 döner', async () => {
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(projectFindFirstMock).not.toHaveBeenCalled()
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
  })

  it('projectId var, oturum var, proje bulunamaz (başkasının projesi) -> sessizce yok sayılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue(null)
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(projectFindFirstMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      select: { akifMemory: true },
    })
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
    expect(projectUpdateManyMock).not.toHaveBeenCalled()
  })

  it('projectId geçerli -> akifMemory projectMemory olarak orchestrator\'a geçirilir', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: 'Bütçe üst sınırı 5M TL.' })
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBe('Bütçe üst sınırı 5M TL.')
    expect(getServerSessionMock).toHaveBeenCalledTimes(1)
  })

  it('turn.memory_updates yoksa (undefined) project.updateMany hiç çağrılmaz', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    runAkifTurnMock.mockResolvedValue({ ...TURN })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).not.toHaveBeenCalled()
  })

  it('turn.memory_updates 2000 karakterden uzunsa kırpılarak yazılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    const longText = 'x'.repeat(2500)
    runAkifTurnMock.mockResolvedValue({ ...TURN, memory_updates: longText })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      data: { akifMemory: 'x'.repeat(2000) },
    })
  })

  it('turn.memory_updates boşluk-only ise akifMemory null yazılır', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: 'eski özet' })
    runAkifTurnMock.mockResolvedValue({ ...TURN, memory_updates: '   ' })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(projectUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      data: { akifMemory: null },
    })
  })
})
