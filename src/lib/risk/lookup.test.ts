const fetchWmsTileMock = jest.fn()
const decodePngMock = jest.fn()

jest.mock('./wms', () => ({
    fetchWmsTile: (...a: unknown[]) => fetchWmsTileMock(...a),
    decodePng: (...a: unknown[]) => decodePngMock(...a),
}))

import { measureRisk, FINE, COARSE, FLOOD } from './lookup'
import type { RGBAImage } from './types'

/** size x size gorüntü; verilen pikselleri opak yapar. */
function img(size: number, pixels: Array<[number, number]>): RGBAImage {
    const data = new Uint8Array(size * size * 4)
    for (const [x, y] of pixels) data[(y * size + x) * 4 + 3] = 255
    return { width: size, height: size, data }
}

const OK = { ok: true, png: Buffer.from([1]) }
const FAIL = { ok: false, reason: 'unavailable' }

describe('measureRisk', () => {
    beforeEach(() => { fetchWmsTileMock.mockReset(); decodePngMock.mockReset() })

    it('ince kutuda isabet varsa KABA kutuyu hic istemez', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        // ince: merkeze yakin isabet; taskin: merkez bos
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, [[128, 130]]))
            .mockReturnValueOnce(img(FLOOD.sizePx, []))

        const r = await measureRisk(41.0, 29.0)
        const layers = fetchWmsTileMock.mock.calls.map(c => c[0])
        expect(layers.filter(l => l === 'diri_fay')).toHaveLength(1)
        // DIKKAT: 256 gibi CIFT boyutta merkez (127.5,127.5) olur, yani hicbir
        // piksel merkeze tam sayi uzaklikta degildir. Kesin esitlik ARAMA —
        // ince kutunun cozunurluk mertebesinde oldugunu dogrula.
        expect(r!.faultDistanceM).toBeGreaterThan(0)
        expect(r!.faultDistanceM).toBeLessThan(100)
    })

    it('ince kutuda isabet yoksa KABA kutuya duser', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, []))          // ince: bos
            .mockReturnValueOnce(img(COARSE.sizePx, [[128, 138]])) // kaba: 10 px
            .mockReturnValueOnce(img(64, []))                    // taskin
        const r = await measureRisk(41.0, 29.0)
        expect(fetchWmsTileMock.mock.calls.filter(c => c[0] === 'diri_fay')).toHaveLength(2)
        expect(r!.faultDistanceM).toBeGreaterThan(1000)
    })

    it('iki kutuda da isabet yoksa faultDistanceM null ve gammaF 1.0', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock.mockReturnValue(img(FINE.sizePx, []))
        const r = await measureRisk(41.0, 29.0)
        expect(r!.faultDistanceM).toBeNull()
        expect(r!.gammaF).toBeCloseTo(1.0, 5)
    })

    it('taskin merkez pikseli opaksa floodQ100 true olur ve R yi artirir', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, []))
            .mockReturnValueOnce(img(COARSE.sizePx, []))
            .mockReturnValueOnce(img(65, [[32, 32]]))   // taskin merkezi opak
        const r = await measureRisk(41.0, 29.0)
        expect(r!.floodQ100).toBe(true)
        expect(r!.suggestedR).toBe(1.03)
    })

    it('WMS tamamen erisilemezse null doner (cagiran taraf gostermez)', async () => {
        fetchWmsTileMock.mockResolvedValue(FAIL)
        const r = await measureRisk(41.0, 29.0)
        expect(r).toBeNull()
    })

    it('fay tile decode edilirken throw ederse null doner, reject etmez', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock.mockImplementationOnce(() => { throw new Error('bad png') })
        await expect(measureRisk(41.0, 29.0)).resolves.toBeNull()
    })

    it('taskin tile decode edilirken throw ederse null doner, reject etmez', async () => {
        fetchWmsTileMock.mockResolvedValue(OK)
        decodePngMock
            .mockReturnValueOnce(img(FINE.sizePx, []))
            .mockReturnValueOnce(img(COARSE.sizePx, []))
            .mockImplementationOnce(() => { throw new Error('bad png') })
        await expect(measureRisk(41.0, 29.0)).resolves.toBeNull()
    })
})
