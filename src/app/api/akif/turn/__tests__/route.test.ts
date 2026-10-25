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
const assertConversationFreeMock = jest.fn()
const saveTurnPairMock = jest.fn()

jest.mock('@/lib/akif/chat/conversationStore', () => ({
  ConversationOwnershipError: jest.requireActual('@/lib/akif/chat/conversationStore')
    .ConversationOwnershipError,
  getChatDb: () => ({ __brand: 'chatDb' }),
  assertConversationFree: (...a: unknown[]) => assertConversationFreeMock(...a),
  saveTurnPair: (...a: unknown[]) => saveTurnPairMock(...a),
}))
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
  AKIF_TOOL_DEFS: [{ type: 'function', function: { name: 'explainTerm' } }],
}))
const dispatchRichToolMock = jest.fn()
jest.mock('@/lib/ai/akif/gateway/richTools', () => ({
  RICH_EXTRA_TOOL_DEFS: [{ type: 'function', function: { name: 'compareParcels' } }],
  validateRichArgs: jest.fn(),
  dispatchRichTool: (...a: unknown[]) => dispatchRichToolMock(...a),
}))
const createParcelLookupDepsMock = jest.fn()
jest.mock('@/lib/ai/akif/gateway/parcelLookupDeps', () => ({
  createParcelLookupDeps: (...a: unknown[]) => createParcelLookupDepsMock(...a),
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
  RATE_LIMITS: {
    AKIF_TURN: { limit: 8, windowMs: 60_000 },
    AKIF_COMPARE_PARCELS: { limit: 6, windowMs: 60_000 },
    AKIF_COMPARE_PARCELS_ANON: { limit: 2, windowMs: 60_000 },
  },
}))

import { POST } from '../route'
import { COMPARISON_RULES_PROMPT } from '@/lib/ai/akif/prompts/comparisonRules'
import { ConversationOwnershipError } from '@/lib/akif/chat/conversationStore'

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
    dispatchRichToolMock.mockReset()
    createParcelLookupDepsMock.mockReset().mockReturnValue({ __brand: 'parcelDeps' })
    validateArgsMock.mockReset()
    openAICtor.mockReset()
    getServerSessionMock.mockReset().mockResolvedValue(null)
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
    assertConversationFreeMock.mockReset().mockResolvedValue(undefined)
    saveTurnPairMock.mockReset().mockResolvedValue(undefined)
  })

  it('gecerli POST -> 200, runAkifTurn bir kez, donen turn body', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    expect(runAkifTurnMock.mock.calls[0][0]).toEqual({
      conversationId: 'c1',
      history: validBody.history,
      userMessage: validBody.userMessage,
      extraSystemPrompt: COMPARISON_RULES_PROMPT,
    })
    expect(await res.json()).toEqual(TURN)
  })

  it('model gets AKIF_TOOL_DEFS + RICH_EXTRA_TOOL_DEFS', async () => {
    await POST(req(validBody))
    const arg = createAkifModelMock.mock.calls[0][0]
    expect(arg.toolDefs.map((d: { function: { name: string } }) => d.function.name)).toEqual([
      'explainTerm',
      'compareParcels',
    ])
  })

  it('anonymous user gets free-tier card without estimate', async () => {
    dispatchRichToolMock.mockImplementation(async (_n, _a, d) => ({
      kind: 'parcel_compare',
      tier: d.memberView ? 'member' : 'free',
      rows: [{ label: 'A 1/1', status: 'resolved', ...(d.memberView ? { estimate: 1 } : {}) }],
    }))
    await POST(req(validBody))
    const rd = runAkifTurnMock.mock.calls[0][1]
    const card = await rd.dispatch('compareParcels', { parcels: [] })
    expect(createParcelLookupDepsMock).toHaveBeenCalledWith({ memberView: false })
    expect(dispatchRichToolMock.mock.calls[0][2].memberView).toBe(false)
    const json = JSON.stringify(card)
    expect(card.tier).toBe('free')
    for (const k of ['estimate', 'pricePerSqm', 'confidence', 'recommendation']) {
      expect(json).not.toContain(k)
    }
  })

  it('logged-in user gets memberView true', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    dispatchRichToolMock.mockResolvedValue({ kind: 'parcel_compare', tier: 'member', rows: [] })
    await POST(req(validBody))
    const rd = runAkifTurnMock.mock.calls[0][1]
    await rd.dispatch('compareParcels', {})
    expect(createParcelLookupDepsMock).toHaveBeenCalledWith({ memberView: true })
    expect(dispatchRichToolMock.mock.calls[0][2].memberView).toBe(true)
  })

  describe('compareParcels rate limit', () => {
    const args = { parcels: [
      { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Oran', ada: '12', parsel: '5' },
      { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Oran', ada: '12', parsel: '6' },
    ] }
    const limitCompare = (ok: boolean) =>
      checkRateLimitMock.mockImplementation((key: string) =>
        key.startsWith('akif-compare-parcels') ? { ok, retryAfterSec: 30 } : { ok: true },
      )

    it('anonymous over-limit returns a note card keyed by IP, dispatch not called', async () => {
      limitCompare(false)
      await POST(req(validBody))
      const rd = runAkifTurnMock.mock.calls[0][1]
      const card = await rd.dispatch('compareParcels', args)
      expect(checkRateLimitMock).toHaveBeenCalledWith('akif-compare-parcels:ip:203.0.113.5', { limit: 2, windowMs: 60_000 })
      expect(dispatchRichToolMock).not.toHaveBeenCalled()
      expect(card.kind).toBe('parcel_compare')
      expect(card.tier).toBe('free')
      expect(card.note).toBe('Çok sık karşılaştırma istendi; bir dakika sonra tekrar dene.')
      expect(card.rows.map((r: { status: string }) => r.status)).toEqual(['parcel_unavailable', 'parcel_unavailable'])
      expect(card.rows[0].label).toBe('Oran 12/5')
      expect(JSON.stringify(card)).not.toContain('estimate')
    })

    it('anonymous within limit dispatches normally', async () => {
      limitCompare(true)
      dispatchRichToolMock.mockResolvedValue({ kind: 'parcel_compare', tier: 'free', rows: [] })
      await POST(req(validBody))
      const rd = runAkifTurnMock.mock.calls[0][1]
      await rd.dispatch('compareParcels', args)
      expect(dispatchRichToolMock).toHaveBeenCalledTimes(1)
    })

    it('logged-in user uses the user key and member tier on limit', async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
      limitCompare(false)
      await POST(req(validBody))
      const rd = runAkifTurnMock.mock.calls[0][1]
      const card = await rd.dispatch('compareParcels', args)
      expect(checkRateLimitMock).toHaveBeenCalledWith('akif-compare-parcels:user:u1', { limit: 6, windowMs: 60_000 })
      expect(checkRateLimitMock).not.toHaveBeenCalledWith(expect.stringContaining('compare-parcels:ip'), expect.anything())
      expect(card.tier).toBe('member')
      expect(card.note).toContain('Çok sık')
    })

    it('over-limit with malformed args yields empty rows with note', async () => {
      limitCompare(false)
      await POST(req(validBody))
      const card = await runAkifTurnMock.mock.calls[0][1].dispatch('compareParcels', {})
      expect(card.rows).toEqual([])
      expect(card.note).toContain('Çok sık')
    })

    it('other tools are not compare-rate-limited', async () => {
      limitCompare(false)
      dispatchRichToolMock.mockResolvedValue({ kind: 'term' })
      await POST(req(validBody))
      const rd = runAkifTurnMock.mock.calls[0][1]
      await rd.dispatch('explainTerm', { term: 'x' })
      expect(dispatchRichToolMock).toHaveBeenCalledTimes(1)
      expect(checkRateLimitMock).not.toHaveBeenCalledWith(expect.stringContaining('akif-compare-parcels'), expect.anything())
    })
  })

  it('createAuditLogger, wa: kanalini kendi web butcesinden haric tutacak sekilde cagrilir', async () => {
    await POST(req(validBody))
    expect(createAuditLoggerMock).toHaveBeenCalledWith(
      expect.anything(),
      { excludeConversationIdPrefix: 'wa:' },
    )
  })

  it('conversationId "wa:" ile basliyorsa -> 400, runAkifTurn hic cagrilmaz', async () => {
    const res = await POST(req({ ...validBody, conversationId: 'wa:905321234567' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad_request' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
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
    assertConversationFreeMock.mockReset().mockResolvedValue(undefined)
    saveTurnPairMock.mockReset().mockResolvedValue(undefined)
  })

  it('projectId gönderilmezse proje sorgusu hiç yapılmaz', async () => {
    await POST(req(validBody))
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

  it('getServerSession/findFirst throw eder -> tur yine 200 döner, projectMemory undefined', async () => {
    getServerSessionMock.mockRejectedValue(new Error('auth provider down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(TURN)
    expect(runAkifTurnMock.mock.calls[0][0].projectMemory).toBeUndefined()
    expect(projectUpdateManyMock).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('project.updateMany throw eder -> yine de basarili turn 200 doner (502 degil)', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    projectUpdateManyMock.mockRejectedValue(new Error('db write failed'))
    runAkifTurnMock.mockResolvedValue({ ...TURN, memory_updates: 'yeni özet' })
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req({ ...validBody, projectId: 'p1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...TURN, memory_updates: 'yeni özet' })
    errSpy.mockRestore()
  })
})

describe('POST /api/akif/turn — sohbet kalıcılığı', () => {
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
    getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
    projectFindFirstMock.mockReset().mockResolvedValue(null)
    projectUpdateManyMock.mockReset().mockResolvedValue({ count: 1 })
    assertConversationFreeMock.mockReset().mockResolvedValue(undefined)
    saveTurnPairMock.mockReset().mockResolvedValue(undefined)
  })

  it('oturumlu + başarılı tur -> saveTurnPair doğru argümanlarla, yanıt AkifTurn', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(TURN)
    expect(assertConversationFreeMock).toHaveBeenCalledWith(expect.anything(), {
      userId: 'u1',
      conversationId: 'c1',
    })
    expect(saveTurnPairMock).toHaveBeenCalledTimes(1)
    expect(saveTurnPairMock).toHaveBeenCalledWith(expect.anything(), {
      userId: 'u1',
      conversationId: 'c1',
      userMessage: validBody.userMessage,
      turn: TURN,
      projectId: undefined,
    })
  })

  it('doğrulanmış projectId saveTurnPair icine geçer', async () => {
    projectFindFirstMock.mockResolvedValue({ akifMemory: null })
    await POST(req({ ...validBody, projectId: 'p1' }))
    expect(saveTurnPairMock.mock.calls[0][1].projectId).toBe('p1')
    expect(getServerSessionMock).toHaveBeenCalledTimes(1)
  })

  it('oturumsuz -> hiçbir şey kaydedilmez, DB kontrolü yok, yanıt aynı', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(TURN)
    expect(assertConversationFreeMock).not.toHaveBeenCalled()
    expect(saveTurnPairMock).not.toHaveBeenCalled()
  })

  it('başkasının conversationId değeri -> 409, runAkifTurn çağrılmaz', async () => {
    assertConversationFreeMock.mockRejectedValue(new ConversationOwnershipError())
    const res = await POST(req(validBody))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'conversation_conflict' })
    expect(runAkifTurnMock).not.toHaveBeenCalled()
    expect(readAkifEnvMock).not.toHaveBeenCalled()
    expect(saveTurnPairMock).not.toHaveBeenCalled()
  })

  it('runAkifTurn throw -> 502 ve saveTurnPair çağrılmaz', async () => {
    runAkifTurnMock.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(validBody))
    expect(res.status).toBe(502)
    expect(saveTurnPairMock).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('saveTurnPair throw -> yanıt yine 200, hata loglanır', async () => {
    saveTurnPairMock.mockRejectedValue(new Error('db down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(TURN)
    expect(errSpy).toHaveBeenCalledWith('[akif] conversation persist', expect.any(Error))
    errSpy.mockRestore()
  })

  it('assertConversationFree beklenmedik hata -> tur yine çalışır', async () => {
    assertConversationFreeMock.mockRejectedValue(new Error('db down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(runAkifTurnMock).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })
})
