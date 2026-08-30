const getServerSessionMock = jest.fn()
const buildDegerCardMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
  getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/deger/card', () => ({
  buildDegerCard: (...a: unknown[]) => buildDegerCardMock(...a),
}))
jest.mock('@/lib/tkgm/parcel', () => ({
  fetchParcelByPoint: jest.fn(),
  fetchParcelByAdaParsel: jest.fn(),
}))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    areaPriceStat: { findMany: jest.fn().mockResolvedValue([]) },
    marketListing: { findMany: jest.fn().mockResolvedValue([]) },
    neighborhood: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}))
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
  getClientIp: () => '203.0.113.9',
  RATE_LIMITS: {
    DEGER_KART: { limit: 15, windowMs: 60000 },
    DEGER_KART_ANON: { limit: 4, windowMs: 60000 },
  },
}))

import { GET } from '../route'

const CARD = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '142', parsel: '7', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [] } },
  risk: { faultDistanceM: 1800, floodQ100: false, status: 'ok' },
  value: { tier: 'free', insufficientData: false, freeRangeLow: 1, freeRangeHigh: 2, pricePerSqmCoarse: 2000 },
}

function req(qs: string) {
  return new Request(`http://localhost/api/deger/kart?${qs}`)
}

describe('GET /api/deger/kart', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset().mockResolvedValue(null)
    checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    buildDegerCardMock.mockReset().mockResolvedValue({ ok: true, card: CARD })
  })

  it('anonim: IP anahtarıyla rate-limit, memberView false', async () => {
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(200)
    expect(checkRateLimitMock.mock.calls[0][0]).toBe('deger:ip:203.0.113.9')
    const passedOpts = buildDegerCardMock.mock.calls[0][2]
    expect(passedOpts).toEqual({ memberView: false })
  })

  it('giriş yapılmış: kullanıcı anahtarı, memberView true', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    await GET(req('lat=41.0&lng=39.7'))
    expect(checkRateLimitMock.mock.calls[0][0]).toBe('deger:u1')
    expect(buildDegerCardMock.mock.calls[0][2]).toEqual({ memberView: true })
  })

  it('rate limit aşıldı → 429, buildDegerCard çağrılmaz', async () => {
    checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 30 })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(429)
    expect(buildDegerCardMock).not.toHaveBeenCalled()
  })

  it('ada/parsel girişi → kind adaParsel', async () => {
    await GET(req('mahalleId=123&ada=142&parsel=7'))
    expect(buildDegerCardMock.mock.calls[0][0]).toEqual({ kind: 'adaParsel', mahalleId: 123, ada: '142', parsel: '7' })
  })

  it('geçersiz ada (harf) → 400', async () => {
    const res = await GET(req('mahalleId=123&ada=abc&parsel=7'))
    expect(res.status).toBe(400)
  })

  it('TR dışı koordinat → 400, buildDegerCard çağrılmaz', async () => {
    const res = await GET(req('lat=10&lng=10'))
    expect(res.status).toBe(400)
    expect(buildDegerCardMock).not.toHaveBeenCalled()
  })

  it('eksik parametre → 400', async () => {
    const res = await GET(req('lat=41.0'))
    expect(res.status).toBe(400)
  })

  it('parsel bulunamadı → 404', async () => {
    buildDegerCardMock.mockResolvedValue({ ok: false, reason: 'parcel_not_found' })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'parcel_not_found' })
  })

  it('parsel servis dışı → 503', async () => {
    buildDegerCardMock.mockResolvedValue({ ok: false, reason: 'parcel_unavailable' })
    const res = await GET(req('lat=41.0&lng=39.7'))
    expect(res.status).toBe(503)
  })

  it("buildDegerCard'a findListingsNear + findNeighborhood DI geçer", async () => {
    await GET(req('lat=41.0&lng=39.7'))
    const deps = buildDegerCardMock.mock.calls[0][1]
    expect(typeof deps.findListingsNear).toBe('function')
    expect(typeof deps.findNeighborhood).toBe('function')
  })

  it('findListingsNear aktif + koordinatlı + arsa filtresiyle sorgular', async () => {
    const prisma = jest.requireMock('@/lib/prisma').prisma
    prisma.marketListing.findMany.mockResolvedValue([])
    await GET(req('lat=41.0&lng=39.7'))
    const deps = buildDegerCardMock.mock.calls[0][1]
    await deps.findListingsNear('TRABZON', 'ORTAHISAR')
    const where = prisma.marketListing.findMany.mock.calls[0][0].where
    expect(where).toMatchObject({ il: 'TRABZON', ilce: 'ORTAHISAR', status: 'active' })
    expect(where.lat).toEqual({ not: null })
    expect(where.lng).toEqual({ not: null })
    expect(where.listingType.in).toEqual(expect.arrayContaining(['arsa', 'tarla']))
  })

  it('findNeighborhood compound key ile findUnique', async () => {
    const prisma = jest.requireMock('@/lib/prisma').prisma
    prisma.neighborhood.findUnique.mockResolvedValue({ geojson: { type: 'MultiPolygon' } })
    await GET(req('lat=41.0&lng=39.7'))
    const deps = buildDegerCardMock.mock.calls[0][1]
    const r = await deps.findNeighborhood('TRABZON', 'ORTAHISAR', 'UĞURLU')
    expect(prisma.neighborhood.findUnique.mock.calls[0][0].where.il_ilce_mahalle)
      .toEqual({ il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU' })
    expect(r).toEqual({ geojson: { type: 'MultiPolygon' } })
  })
})
