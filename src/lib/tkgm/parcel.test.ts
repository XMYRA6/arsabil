import { parseTkgmArea, fetchParcelByPoint } from './parcel'

const TEKIRDAG_RESPONSE = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781], [27.58368, 41.16795], [27.58319, 41.16813], [27.58308, 41.16804], [27.58337, 41.16781]]] },
    properties: {
        ilAd: 'Tekirdağ', ilceAd: 'Muratli', mahalleAd: 'Kirkkepenekli',
        adaNo: '0', parselNo: '1871', alan: '830.00', nitelik: 'Arsa',
    },
}

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
    }) as unknown as typeof fetch
}

describe('parseTkgmArea — iki ondalık formatı da desteklenmeli', () => {
    it('noktalı ondalığı okur (koordinat endpoint formatı)', () => {
        expect(parseTkgmArea('830.00')).toBe(830)
    })

    it('virgüllü ondalığı okur (ada/parsel endpoint formatı)', () => {
        expect(parseTkgmArea('830,00')).toBe(830)
    })

    it('binlik ayracı + virgüllü ondalığı okur — parseFloat burada 1.24 verirdi', () => {
        expect(parseTkgmArea('1.240,50')).toBe(1240.5)
    })

    it('binlik ayracı + noktalı ondalığı okur', () => {
        expect(parseTkgmArea('1,240.50')).toBe(1240.5)
    })

    it('ayraçsız tam sayıyı okur', () => {
        expect(parseTkgmArea('830')).toBe(830)
    })

    it('yalnızca binlik ayracı olan değeri tam sayı okur', () => {
        expect(parseTkgmArea('1.240')).toBe(1240)
    })

    it('sayı tipini olduğu gibi döner', () => {
        expect(parseTkgmArea(830.5)).toBe(830.5)
    })

    it('geçersiz girdilerde null döner', () => {
        expect(parseTkgmArea('abc')).toBeNull()
        expect(parseTkgmArea('')).toBeNull()
        expect(parseTkgmArea(null)).toBeNull()
        expect(parseTkgmArea(undefined)).toBeNull()
        expect(parseTkgmArea({})).toBeNull()
    })
})

describe('fetchParcelByPoint', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('200 cevabını ParcelInfo olarak normalize eder', async () => {
        mockFetchOnce(200, TEKIRDAG_RESPONSE)
        const res = await fetchParcelByPoint(41.167877, 27.583458)
        expect(res.ok).toBe(true)
        if (!res.ok) throw new Error('beklenmedik')
        expect(res.parcel.adaNo).toBe('0')
        expect(res.parcel.parselNo).toBe('1871')
        expect(res.parcel.areaSqm).toBe(830)
        expect(res.parcel.quality).toBe('Arsa')
        expect(res.parcel.mahalle).toBe('Kirkkepenekli')
        expect(res.parcel.geometry.type).toBe('Polygon')
    })

    it('TKGM adlarını olduğu gibi bırakır — Türkçeleştirme yapmaz', async () => {
        mockFetchOnce(200, TEKIRDAG_RESPONSE)
        const res = await fetchParcelByPoint(41.167877, 27.583458)
        if (!res.ok) throw new Error('beklenmedik')
        expect(res.parcel.ilce).toBe('Muratli')
        expect(res.parcel.mahalle).not.toBe('Kırkkepenekli')
    })

    it('404 → not_found', async () => {
        mockFetchOnce(404, { Message: 'Parsel Bulunamadı' })
        const res = await fetchParcelByPoint(41.0082, 28.9784)
        expect(res).toEqual({ ok: false, reason: 'not_found' })
    })

    it('500 → unavailable', async () => {
        mockFetchOnce(500, {})
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('ağ hatası → unavailable', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('geometry içermeyen cevap → unavailable', async () => {
        mockFetchOnce(200, { type: 'Feature', properties: TEKIRDAG_RESPONSE.properties })
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })

    it('alan okunamayan cevap → unavailable', async () => {
        mockFetchOnce(200, { ...TEKIRDAG_RESPONSE, properties: { ...TEKIRDAG_RESPONSE.properties, alan: 'abc' } })
        const res = await fetchParcelByPoint(41.1, 27.5)
        expect(res).toEqual({ ok: false, reason: 'unavailable' })
    })
})
