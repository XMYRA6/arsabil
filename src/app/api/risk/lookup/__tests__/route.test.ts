const getServerSessionMock = jest.fn()
const measureRiskMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/risk/lookup', () => ({ measureRisk: (...a: unknown[]) => measureRiskMock(...a) }))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
    RATE_LIMITS: { RISK_LOOKUP: { limit: 20, windowMs: 60000 } },
}))

import { GET } from '../route'

const RISK = { faultDistanceM: 1200, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }

function req(qs: string) {
    return new Request(`http://localhost/api/risk/lookup?${qs}`)
}

describe('GET /api/risk/lookup', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        measureRiskMock.mockReset().mockResolvedValue(RISK)
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa 401 doner ve TUCBS hic cagrilmaz', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(401)
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('rate limit asilirsa 429 + Retry-After doner', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req('lat=41&lng=29'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('risk:u1')
    })

    it('Turkiye disi koordinatta 400 doner', async () => {
        const res = await GET(req('lat=51.5&lng=-0.12'))
        expect(res.status).toBe(400)
        expect(measureRiskMock).not.toHaveBeenCalled()
    })

    it('basarili olcumde risk doner', async () => {
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('ok')
        expect(body.risk.gammaF).toBe(1.2)
    })

    it('TUCBS erisilemezse 200 + unavailable doner (hata degil)', async () => {
        measureRiskMock.mockResolvedValue(null)
        const res = await GET(req('lat=41&lng=29'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
