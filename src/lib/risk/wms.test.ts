import { fetchWmsTile, WMS_BASE } from './wms'

const BBOX = { minLon: 28.9, minLat: 40.9, maxLon: 29.1, maxLat: 41.1 }

function pngResponse() {
    return {
        ok: true,
        status: 200,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    }
}

describe('fetchWmsTile', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('tarayici User-Agent header i gonderir (WAF varsayilan UA yi reddediyor)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        const init = spy.mock.calls[0][1] as RequestInit
        expect(String((init.headers as Record<string, string>)['User-Agent'])).toMatch(/Mozilla/)
    })

    it('WMS 1.1.1 ve EPSG:4326 kullanir (1.3.0 eksen sirasini ters cevirir)', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        const url = String(spy.mock.calls[0][0])
        expect(url).toContain('version=1.1.1')
        expect(url).toContain('srs=EPSG%3A4326')
        expect(url).not.toContain('1.3.0')
        expect(url.startsWith(WMS_BASE)).toBe(true)
    })

    it('bbox i lon,lat sirasiyla yazar', async () => {
        const spy = jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        await fetchWmsTile('diri_fay', BBOX, 256)
        expect(decodeURIComponent(String(spy.mock.calls[0][0]))).toContain('bbox=28.9,40.9,29.1,41.1')
    })

    it('basarili PNG cevabinda ok:true doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue(pngResponse() as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(true)
    })

    it('PNG olmayan cevapta (WMS hata XML i) ok:false doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockResolvedValue({
            ok: true, status: 200,
            headers: { get: () => 'application/vnd.ogc.se_xml' },
            arrayBuffer: async () => new Uint8Array([60]).buffer,
        } as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(false)
    })

    it('ag hatasinda THROW ETMEZ, ok:false doner', async () => {
        jest.spyOn(global, 'fetch' as never).mockRejectedValue(new Error('boom') as never)
        const r = await fetchWmsTile('diri_fay', BBOX, 256)
        expect(r.ok).toBe(false)
    })
})
