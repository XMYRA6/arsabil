const getServerSessionMock = jest.fn()
const checkRateLimitMock = jest.fn()
const validateArgsMock = jest.fn()
const createParcelLookupDepsMock = jest.fn()
const dispatchToolMock = jest.fn()
const logVoiceTurnMock = jest.fn()
const checkVoiceSessionOwnerMock = jest.fn()
const prepareScenarioSaveMock = jest.fn()
const commitPendingActionMock = jest.fn()

jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSessionMock(...a) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({ prisma: { __brand: 'prisma' } }))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: {
    AKIF_TURN: { limit: 8, windowMs: 60_000 },
    AKIF_COMPARE_PARCELS: { limit: 6, windowMs: 60_000 },
  },
}))
jest.mock('@/lib/ai/akif/gateway/richTools', () => ({
  isRichToolName: (n: string) =>
    ['explainTerm', 'compareContractorOffers', 'compareApartmentSizes', 'compareParcels'].includes(n),
  validateRichArgs: (...a: unknown[]) => validateArgsMock(...a),
  dispatchRichTool: (...a: unknown[]) => dispatchToolMock(...a),
}))
jest.mock('@/lib/ai/akif/gateway/parcelLookupDeps', () => ({
  createParcelLookupDeps: (...a: unknown[]) => createParcelLookupDepsMock(...a),
}))
jest.mock('@/lib/ai/akif/voice/voiceAudit', () => ({
  createVoiceAuditLogger: () => ({ logVoiceTurn: (...a: unknown[]) => logVoiceTurnMock(...a) }),
}))
jest.mock('@/lib/ai/akif/voice/voiceSession', () => ({
  checkVoiceSessionOwner: (...a: unknown[]) => checkVoiceSessionOwnerMock(...a),
}))
jest.mock('@/lib/ai/akif/gateway/prepareScenarioSave', () => ({
  prepareScenarioSave: (...a: unknown[]) => prepareScenarioSaveMock(...a),
}))
jest.mock('@/lib/ai/akif/voice/pendingAction', () => ({
  commitPendingAction: (...a: unknown[]) => commitPendingActionMock(...a),
}))

import { POST } from '../route'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  checkRateLimitMock.mockReturnValue({ ok: true })
  getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
  validateArgsMock.mockReturnValue({ ok: true })
  createParcelLookupDepsMock.mockReturnValue({ __brand: 'parcelDeps' })
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'active' })
  dispatchToolMock.mockResolvedValue({ kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' })
  prepareScenarioSaveMock.mockResolvedValue({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: {} })
  commitPendingActionMock.mockResolvedValue({ ok: true, scenarioId: 'sc_1', projectId: 'p1', projectName: 'Trabzon', undoToken: 'ut', undoUntil: '2026-01-01T00:00:00Z' })
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

it('bilinmeyen session → 403 unknown_session', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'unknown_session' })
  const res = await POST(req({ sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(403)
  expect(await res.json()).toEqual({ error: 'unknown_session' })
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('başkasının session → 403 forbidden_session', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'forbidden_session' })
  const res = await POST(req({ sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(403)
  expect(await res.json()).toEqual({ error: 'forbidden_session' })
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('bitmiş session → 403 session_over', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: true, status: 'ended' })
  const res = await POST(req({ sessionId: 'sess-1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(res.status).toBe(403)
  expect(await res.json()).toEqual({ error: 'session_over' })
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

// Akif-2-Aksiyon — aksiyon araçları (prepareScenarioSave / commitPendingAction)
it('prepareScenarioSave geçerli argümanla → prepareScenarioSave çağrılır, sonucu birebir döner', async () => {
  const args = { arsaAlani: 1000, emsal: 1.5, muteahhitPayi: 30 }
  const res = await POST(req({ sessionId: 's1', toolName: 'prepareScenarioSave', args }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ kind: 'pending_action', pendingActionId: 'pa_1', confirmCard: {} })
  expect(prepareScenarioSaveMock).toHaveBeenCalledWith(
    args,
    expect.objectContaining({
      userId: 'u1',
      sessionId: 's1',
      plan: { checkPlanLimit: expect.any(Function) },
    }),
  )
  expect(dispatchToolMock).not.toHaveBeenCalled()
  expect(logVoiceTurnMock).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: 's1', tool: 'prepareScenarioSave' }),
  )
})

it('commitPendingAction geçerli argümanla → commitPendingAction çağrılır', async () => {
  const res = await POST(req({ sessionId: 's1', toolName: 'commitPendingAction', args: { pendingActionId: 'pa_1' } }))
  expect(res.status).toBe(200)
  expect(commitPendingActionMock).toHaveBeenCalledWith(
    expect.anything(),
    { pendingActionId: 'pa_1', userId: 'u1', sessionId: 's1' },
    { checkPlanLimit: expect.any(Function) },
  )
  expect(await res.json()).toEqual({
    kind: 'action_committed',
    ok: true,
    scenarioId: 'sc_1',
    projectId: 'p1',
    projectName: 'Trabzon',
    undoToken: 'ut',
    undoUntil: '2026-01-01T00:00:00Z',
  })
})

it('aksiyon aracı geçersiz argüman → 200 invalid_args (sözleşme korunur)', async () => {
  const res = await POST(req({ sessionId: 's1', toolName: 'prepareScenarioSave', args: {} }))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.error).toBe('invalid_args')
  expect(body.field).toBeTruthy()
  expect(prepareScenarioSaveMock).not.toHaveBeenCalled()
})

it('aksiyon aracında da sahiplik koruması (Akif-2.1) önce çalışır', async () => {
  checkVoiceSessionOwnerMock.mockResolvedValue({ ok: false, code: 'forbidden_session' })
  const args = { arsaAlani: 1000, emsal: 1.5, muteahhitPayi: 30 }
  const res = await POST(req({ sessionId: 's1', toolName: 'prepareScenarioSave', args }))
  expect(res.status).toBe(403)
  expect(await res.json()).toEqual({ error: 'forbidden_session' })
  expect(prepareScenarioSaveMock).not.toHaveBeenCalled()
})

// Akif karşılaştırma kartları — compareParcels + öneri
const twoParcels = {
  parcels: [
    { mahalleText: 'Beşirli', ada: '1', parsel: '2' },
    { mahalleText: 'Beşirli', ada: '3', parsel: '4' },
  ],
}

it('compareParcels geçerli argümanla → parcel_compare kartı (üye), memberView=true ile', async () => {
  const card = { kind: 'parcel_compare', rows: [] }
  dispatchToolMock.mockResolvedValue(card)
  const res = await POST(req({ sessionId: 's1', toolName: 'compareParcels', args: twoParcels }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual(card)
  expect(createParcelLookupDepsMock).toHaveBeenCalledWith({ memberView: true })
  expect(dispatchToolMock).toHaveBeenCalledWith(
    'compareParcels',
    twoParcels,
    expect.objectContaining({ parcelDeps: { __brand: 'parcelDeps' }, memberView: true }),
  )
  expect(logVoiceTurnMock).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: 's1', tool: 'compareParcels' }),
  )
  expect(checkRateLimitMock).toHaveBeenCalledWith(
    'akif-compare-parcels:user:u1',
    { limit: 6, windowMs: 60_000 },
  )
})

it('compareParcels 1 parsel → 200 invalid_args', async () => {
  validateArgsMock.mockReturnValue({ ok: false, field: 'parcels', reason: 'en az 2 parsel' })
  const res = await POST(req({ sessionId: 's1', toolName: 'compareParcels', args: { parcels: [{}] } }))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ error: 'invalid_args', field: 'parcels', reason: 'en az 2 parsel' })
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('compareParcels için ek rate limit aşıldı → 429 + Retry-After', async () => {
  checkRateLimitMock.mockImplementation((key: string) =>
    key.startsWith('akif-compare-parcels') ? { ok: false, retryAfterSec: 42 } : { ok: true },
  )
  const res = await POST(req({ sessionId: 's1', toolName: 'compareParcels', args: twoParcels }))
  expect(res.status).toBe(429)
  expect(res.headers.get('Retry-After')).toBe('42')
  expect(dispatchToolMock).not.toHaveBeenCalled()
})

it('compareParcels dışındaki araçlarda ek rate limit çağrılmaz', async () => {
  await POST(req({ sessionId: 's1', toolName: 'explainTerm', args: { term: 'emsal' } }))
  expect(checkRateLimitMock).toHaveBeenCalledTimes(1)
})

it('senaryo aracı sonucu öneri taşır (dispatchRichTool yolundan)', async () => {
  const card = { kind: 'contractor_offers', recommendation: { winner: 'a' } }
  dispatchToolMock.mockResolvedValue(card)
  const res = await POST(req({ sessionId: 's1', toolName: 'compareContractorOffers', args: {} }))
  expect(await res.json()).toEqual(card)
  expect(dispatchToolMock).toHaveBeenCalledWith('compareContractorOffers', {}, expect.anything())
})
