const getServerSessionMock = jest.fn()
const fetchMahalleListesiMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/idariYapi', () => ({
    fetchMahalleListesi: (...args: unknown[]) => fetchMahalleListesiMock(...args),
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
    return new Request(`http://localhost/api/tkgm/mahalle?${qs}`)
}

describe('GET /api/tkgm/mahalle', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchMahalleListesiMock.mockReset().mockResolvedValue([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('mahalle listesini centroid ile doner', async () => {
        const res = await GET(req('ilceId=104'))
        expect(res.status).toBe(200)
        expect((await res.json()).mahalleler).toEqual([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
        expect(fetchMahalleListesiMock).toHaveBeenCalledWith(104)
    })

    it('ilceId sayi degilse 400 doner', async () => {
        const res = await GET(req('ilceId=abc'))
        expect(res.status).toBe(400)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })

    it('ilceId verilmezse 400 doner (Number(null) === 0 tuzagi — Task 4 review bulgusu)', async () => {
        const res = await GET(req(''))
        expect(res.status).toBe(400)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 10 })
        const res = await GET(req('ilceId=104'))
        expect(res.status).toBe(429)
        expect(fetchMahalleListesiMock).not.toHaveBeenCalled()
    })
})
