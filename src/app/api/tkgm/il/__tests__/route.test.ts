const getServerSessionMock = jest.fn()
const fetchIlListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchIlListesi: (...args: unknown[]) => fetchIlListesiMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        TKGM_IDARI_YAPI: { limit: 30, windowMs: 60000 },
        TKGM_IDARI_YAPI_ANON: { limit: 10, windowMs: 60000 },
    },
}))

import { GET } from '../route'

function req() {
    return new Request('http://localhost/api/tkgm/il')
}

describe('GET /api/tkgm/il', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchIlListesiMock.mockReset().mockResolvedValue([{ id: 23, text: 'Adana' }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('il listesini doner', async () => {
        const res = await GET(req())
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.iller).toEqual([{ id: 23, text: 'Adana' }])
    })

    it('oturum yoksa anonim IP anahtariyla devam eder (401 degil)', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req())
        expect(res.status).toBe(200)
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('tkgm-idari:ip:203.0.113.7')
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req())
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('tkgm-idari:u1')
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req())
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchIlListesiMock).not.toHaveBeenCalled()
    })
})
