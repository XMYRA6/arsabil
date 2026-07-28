const checkRateLimitMock = jest.fn()

jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
    getClientIp: () => '1.2.3.4',
    RATE_LIMITS: { RISK_TILES: { limit: 300, windowMs: 60000 } },
}))

import { GET } from '../route'

const QS = 'layers=diri_fay&bbox=28.9,40.9,29.1,41.1&width=256&height=256&srs=EPSG:4326'

function req(qs: string) {
    return new Request(`http://localhost/api/risk/tiles?${qs}`)
}

function pngResponse() {
    return {
        ok: true, status: 200,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    }
}

describe('GET /api/risk/tiles', () => {
    beforeEach(() => { checkRateLimitMock.mockReset().mockReturnValue({ ok: true }) })
    afterEach(() => { jest.restoreAllMocks() })

    it('Leaflet in gonderdigi COGUL layers parametresini kabul eder', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS))
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('image/png')
    })

    it('beyaz listede olmayan katmani reddeder (acik proxy olmasin)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS.replace('diri_fay', 'srtm')))
        expect(res.status).toBe(400)
        expect(spy).not.toHaveBeenCalled()
    })

    it('virgullu coklu katmani reddeder', async () => {
        const res = await GET(req(QS.replace('diri_fay', 'diri_fay,srtm')))
        expect(res.status).toBe(400)
    })

    it('EPSG:4326 disi srs i reddeder', async () => {
        const res = await GET(req(QS.replace('EPSG:4326', 'EPSG:3857')))
        expect(res.status).toBe(400)
    })

    it('512 den buyuk boyutu reddeder', async () => {
        const res = await GET(req(QS.replace('width=256', 'width=2048')))
        expect(res.status).toBe(400)
    })

    it('rate limit anahtari IP basinadir', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await GET(req(QS))
        expect(checkRateLimitMock.mock.calls[0][0]).toBe('risktiles:1.2.3.4')
    })

    it('rate limit asilirsa 429 doner', async () => {
        checkRateLimitMock.mockReturnValue({ ok: false, retryAfterSec: 7 })
        const res = await GET(req(QS))
        expect(res.status).toBe(429)
    })

    it('cache header i gonderir', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const res = await GET(req(QS))
        expect(res.headers.get('Cache-Control')).toContain('max-age=86400')
    })

    it('TUCBS erisilemezse 502 doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockRejectedValue(new Error('boom') as never)
        const res = await GET(req(QS))
        expect(res.status).toBe(502)
    })
})
