const getServerSessionMock = jest.fn()
const fetchIlceListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchIlceListesi: (...args: unknown[]) => fetchIlceListesiMock(...args),
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

function req(qs: string) {
    return new Request(`http://localhost/api/tkgm/ilce?${qs}`)
}

describe('GET /api/tkgm/ilce', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchIlceListesiMock.mockReset().mockResolvedValue([{ id: 104, text: 'Aladağ', centroid: { lat: 37.1, lng: 35.1 } }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('ilce listesini centroid alaniyla birlikte doner', async () => {
        const res = await GET(req('ilId=23'))
        expect(res.status).toBe(200)
        expect((await res.json()).ilceler).toEqual([{ id: 104, text: 'Aladağ', centroid: { lat: 37.1, lng: 35.1 } }])
        expect(fetchIlceListesiMock).toHaveBeenCalledWith(23)
    })

    it('ilId sayi degilse 400 doner', async () => {
        const res = await GET(req('ilId=abc'))
        expect(res.status).toBe(400)
        expect(fetchIlceListesiMock).not.toHaveBeenCalled()
    })

    it('ilId verilmezse 400 doner', async () => {
        const res = await GET(req(''))
        expect(res.status).toBe(400)
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 10 })
        const res = await GET(req('ilId=23'))
        expect(res.status).toBe(429)
        expect(fetchIlceListesiMock).not.toHaveBeenCalled()
    })
})
