import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from './idariYapi'

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
    }) as unknown as typeof fetch
}

describe('fetchIlListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('feature.properties {id,text} listesini dondurur', async () => {
        mockFetchOnce(200, {
            features: [
                { properties: { id: 23, text: 'Adana' } },
                { properties: { id: 24, text: 'Adıyaman' } },
            ],
        })
        const result = await fetchIlListesi()
        expect(result).toEqual([{ id: 23, text: 'Adana' }, { id: 24, text: 'Adıyaman' }])
    })

    it('id sayi degilse veya text bossa ogeyi atlar', async () => {
        mockFetchOnce(200, {
            features: [
                { properties: { id: 23, text: 'Adana' } },
                { properties: { id: 'abc', text: 'Gecersiz' } },
                { properties: { id: 25, text: '' } },
            ],
        })
        const result = await fetchIlListesi()
        expect(result).toEqual([{ id: 23, text: 'Adana' }])
    })

    it('id tam sayi degilse (ondalikli) veya <= 0 ise ogeyi atlar', async () => {
        mockFetchOnce(200, {
            features: [
                { properties: { id: 23, text: 'Gecerli' } },
                { properties: { id: 23.5, text: 'Ondalikli' } },
                { properties: { id: 0, text: 'Sifir' } },
                { properties: { id: -5, text: 'Negatif' } },
            ],
        })
        const result = await fetchIlListesi()
        expect(result).toEqual([{ id: 23, text: 'Gecerli' }])
    })

    it('TKGM hata donerse bos dizi doner', async () => {
        mockFetchOnce(500, {})
        expect(await fetchIlListesi()).toEqual([])
    })

    it('ag hatasinda bos dizi doner', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        expect(await fetchIlListesi()).toEqual([])
    })

    it('dogru TKGM URLsini cagirir', async () => {
        mockFetchOnce(200, { features: [] })
        await fetchIlListesi()
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/ilListe')
    })
})

describe('fetchIlceListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('verilen ilId ile dogru URLyi cagirir', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 104, text: 'Aladağ' } }] })
        await fetchIlceListesi(23)
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/ilceListe/23')
    })

    it('ilce listesini centroid alaniyla birlikte dondurur (geometri yoksa null)', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 104, text: 'Aladağ' } }] })
        expect(await fetchIlceListesi(23)).toEqual([{ id: 104, text: 'Aladağ', centroid: null }])
    })

    it('ilce Polygon geometrisinden centroid hesaplar — mahalle centroidsiz kaldiginda fallback icin kullanilir', async () => {
        mockFetchOnce(200, {
            features: [{
                properties: { id: 104, text: 'Aladağ' },
                geometry: { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }],
        })
        const result = await fetchIlceListesi(23)
        expect(result).toEqual([{ id: 104, text: 'Aladağ', centroid: { lat: 37.1, lng: 35.1 } }])
    })
})

describe('fetchMahalleListesi', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('Polygon geometriden centroid hesaplar (kose ortalamasi)', async () => {
        mockFetchOnce(200, {
            features: [{
                properties: { id: 45478, text: 'Akpınar' },
                geometry: { type: 'Polygon', coordinates: [[[35.0, 37.0], [35.2, 37.0], [35.2, 37.2], [35.0, 37.2]]] },
            }],
        })
        const result = await fetchMahalleListesi(104)
        expect(result).toEqual([{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }])
    })

    it('MultiPolygon geometrisinde TUM poligonlarin koseleri duzlestirilir', async () => {
        mockFetchOnce(200, {
            features: [{
                properties: { id: 1, text: 'Ada Mahallesi' },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [[[0, 0], [2, 0], [2, 2], [0, 2]]],
                        [[[10, 10], [12, 10], [12, 12], [10, 12]]],
                    ],
                },
            }],
        })
        const result = await fetchMahalleListesi(1)
        expect(result[0].centroid).toEqual({ lat: 6, lng: 6 })
    })

    it('geometri yoksa veya taninmiyorsa centroid null doner', async () => {
        mockFetchOnce(200, { features: [{ properties: { id: 2, text: 'Geometrisiz' } }] })
        const result = await fetchMahalleListesi(1)
        expect(result[0].centroid).toBeNull()
    })

    it('dogru TKGM URLsini cagirir', async () => {
        mockFetchOnce(200, { features: [] })
        await fetchMahalleListesi(104)
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toBe('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/mahalleListe/104')
    })
})
