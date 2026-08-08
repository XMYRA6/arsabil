const getServerSessionMock = jest.fn()
const fetchParcelMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByAdaParsel: (...args: unknown[]) => fetchParcelMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIp: () => '203.0.113.7',
    RATE_LIMITS: {
        PARCEL_LOOKUP: { limit: 20, windowMs: 60000 },
        PARCEL_LOOKUP_ANON: { limit: 5, windowMs: 60000 },
    },
}))

import { GET } from '../route'

const PARCEL = {
    il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Göztepe',
    adaNo: '398', parselNo: '19', areaSqm: 965.85, quality: 'Bahçeli Kargir Apartman',
    geometry: { type: 'Polygon', coordinates: [[[29.065, 40.975]]] },
}

function req(qs: string) {
    return new Request(`http://localhost/api/parcel/lookup-by-ada-parsel?${qs}`)
}

describe('GET /api/parcel/lookup-by-ada-parsel', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchParcelMock.mockReset().mockResolvedValue({ ok: true, parcel: PARCEL })
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa anonim IP anahtariyla devam eder (401 degil)', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(200)
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel-ada-parsel:ip:203.0.113.7')
        expect(fetchParcelMock).toHaveBeenCalled()
    })

    it('rate limit anahtari kullanici basinadir', async () => {
        await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel-ada-parsel:u1')
    })

    it('rate limit asilirsa 429 doner ve TKGM hic cagrilmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('mahalleId sayi degilse veya <= 0 ise 400 doner', async () => {
        expect((await GET(req('mahalleId=abc&ada=398&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=0&ada=398&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=-5&ada=398&parsel=19'))).status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('ada veya parsel rakam disi karakter icerirse 400 doner', async () => {
        expect((await GET(req('mahalleId=147964&ada=39x&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=147964&ada=398&parsel='))).status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('ada veya parsel 7 haneden uzunsa 400 doner (TKGM\'ye giden URL uzunlugu sinirlanir)', async () => {
        expect((await GET(req('mahalleId=147964&ada=12345678&parsel=19'))).status).toBe(400)
        expect((await GET(req('mahalleId=147964&ada=398&parsel=12345678'))).status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('basarili sorguda parsel doner', async () => {
        const res = await GET(req('mahalleId=147964&ada=398&parsel=19'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('verified')
        expect(body.parcel.parselNo).toBe('19')
        expect(fetchParcelMock).toHaveBeenCalledWith(147964, '398', '19')
    })

    it('parsel bulunamazsa 200 + not_found doner (hata degil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const res = await GET(req('mahalleId=147964&ada=1&parsel=1'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('not_found')
    })

    it('TKGM erisilemezse 200 + unavailable doner (hata degil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const res = await GET(req('mahalleId=147964&ada=1&parsel=1'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
