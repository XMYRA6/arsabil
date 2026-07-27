const getServerSessionMock = jest.fn()
const fetchParcelMock = jest.fn()
const checkRateLimitMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByPoint: (...args: unknown[]) => fetchParcelMock(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    RATE_LIMITS: { PARCEL_LOOKUP: { limit: 20, windowMs: 60000 } },
}))

import { GET } from '../route'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781]]] },
}

function req(qs: string) {
    return new Request(`http://localhost/api/parcel/lookup?${qs}`)
}

describe('GET /api/parcel/lookup', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        fetchParcelMock.mockReset().mockResolvedValue({ ok: true, parcel: PARCEL })
        checkRateLimitMock.mockReset().mockReturnValue({ ok: true })
    })

    it('oturum yoksa 401 döner ve TKGM hiç çağrılmaz', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(401)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('rate limit aşılırsa 429 döner ve TKGM hiç çağrılmaz', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 42 })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(429)
        expect(res.headers.get('Retry-After')).toBe('42')
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('rate limit anahtarı kullanıcı başınadır', async () => {
        await GET(req('lat=41.16&lng=27.58'))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('parcel:u1')
    })

    it('koordinat sayı değilse 400 döner', async () => {
        const res = await GET(req('lat=abc&lng=27.58'))
        expect(res.status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('koordinat Türkiye sınırları dışındaysa 400 döner', async () => {
        const res = await GET(req('lat=51.5&lng=-0.12'))
        expect(res.status).toBe(400)
        expect(fetchParcelMock).not.toHaveBeenCalled()
    })

    it('başarılı sorguda parsel döner', async () => {
        const res = await GET(req('lat=41.167877&lng=27.583458'))
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('verified')
        expect(body.parcel.parselNo).toBe('1871')
        expect(fetchParcelMock).toHaveBeenCalledWith(41.167877, 27.583458)
    })

    it('parsel bulunamazsa 200 + not_found döner (hata değil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('not_found')
    })

    it('TKGM erişilemezse 200 + unavailable döner (hata değil)', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const res = await GET(req('lat=41.16&lng=27.58'))
        expect(res.status).toBe(200)
        expect((await res.json()).status).toBe('unavailable')
    })
})
