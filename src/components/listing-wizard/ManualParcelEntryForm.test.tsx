/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ManualParcelEntryForm, __resetIlListCacheForTests } from './ManualParcelEntryForm'

function mockFetchSequence(responses: unknown[]) {
    let call = 0
    global.fetch = jest.fn().mockImplementation(() => {
        const body = responses[Math.min(call, responses.length - 1)]
        call++
        return Promise.resolve({ status: 200, ok: true, json: async () => body })
    }) as unknown as typeof fetch
}

describe('ManualParcelEntryForm', () => {
    // Il listesi artik modul-seviyesinde onbelleklendigi icin (Fix 3b), her
    // testin kendi izole basangic durumundan (onbellek BOS) baslamasi gerekir —
    // aksi halde bir onceki testin basarili il-listesi cevabi sonraki testin
    // kendi mock fetch dizisini atlayarak yanlis/kaydirilmis veriler okumasina
    // yol acar.
    beforeEach(() => { __resetIlListCacheForTests() })
    afterEach(() => { jest.restoreAllMocks() })

    it('mount olunca il listesini ceker, il/ilce secilmeden Sorgula devre disidir', async () => {
        mockFetchSequence([{ iller: [{ id: 23, text: 'Adana' }] }])
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tkgm/il'))
        expect(screen.getByRole('button', { name: /Sorgula/i })).toBeDisabled()
    })

    it('il secilince ilce listesi cekilir ve ilce alani etkinlesir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
        ])
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        expect(global.fetch).toHaveBeenCalledWith('/api/tkgm/ilce?ilId=23')
    })

    it('mahalle secilip centroid varsa Nominatime hic gitmeden onLocationFound cagirir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }] },
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Akpınar' } })
        fireEvent.click(await screen.findByText('Akpınar'))

        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

        const fetchCallsBeforeSearch = (global.fetch as jest.Mock).mock.calls.length
        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.1, 35.1, {
                il: 'Adana', ilce: 'Aladağ', mahalle: 'Akpınar', ada: '0', parsel: '1871',
            })
        })
        // Centroid varken Nominatim'e (veya baska bir uca) HIC gidilmedi.
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBeforeSearch)
    })

    it('mahalle secilmezse Nominatim ile yaklasik konum aranir (il/ilce artik TKGM yazimi)', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            [{ lat: '37.3', lon: '35.4' }],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.3, 35.4, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
    })

    it('sonuc bulunamazsa hata gosterir (mahallesiz, Nominatim yolu)', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            [],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))
        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum bulunamadı/i)).toBeInTheDocument()
        })
        expect(onLocationFound).not.toHaveBeenCalled()
    })

    it('yarisan il secimlerinde eski (once secilen) ilin gec gelen ilce cevabi yeni secimi ezmez', async () => {
        const ilResponse = { iller: [{ id: 1, text: 'Adana' }, { id: 2, text: 'Bursa' }] }
        const pendingIlceFetches: Record<string, { resolve: (body: unknown) => void }> = {}

        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url === '/api/tkgm/il') {
                return Promise.resolve({ ok: true, json: async () => ilResponse })
            }
            if (url.startsWith('/api/tkgm/ilce')) {
                return new Promise(resolve => {
                    pendingIlceFetches[url] = {
                        resolve: (body: unknown) => resolve({ ok: true, json: async () => body }),
                    }
                })
            }
            throw new Error(`beklenmeyen fetch: ${url}`)
        }) as unknown as typeof fetch

        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())

        // 1) Adana secilir -> ilce?ilId=1 istegi beklemede kalir (cevap gelmez).
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))
        await waitFor(() => expect(pendingIlceFetches['/api/tkgm/ilce?ilId=1']).toBeDefined())

        // 2) Adana'nin cevabi donmeden hizlica Bursa secilir -> ilce?ilId=2 istegi de beklemede.
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Bursa' } })
        fireEvent.click(await screen.findByText('Bursa'))
        await waitFor(() => expect(pendingIlceFetches['/api/tkgm/ilce?ilId=2']).toBeDefined())

        // 3) Once GUNCEL (Bursa) istegi cozulur...
        pendingIlceFetches['/api/tkgm/ilce?ilId=2'].resolve({ ilceler: [{ id: 200, text: 'Osmangazi' }] })
        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.focus(screen.getByLabelText('İlçe *'))
        await screen.findByText('Osmangazi')

        // ...SONRA eski (Adana) istegi gec gelir. Guncel secimi (Bursa/Osmangazi) EZMEMELI.
        pendingIlceFetches['/api/tkgm/ilce?ilId=1'].resolve({ ilceler: [{ id: 104, text: 'Aladağ' }] })

        await waitFor(() => expect(screen.getByText('Osmangazi')).toBeInTheDocument())
        expect(screen.queryByText('Aladağ')).not.toBeInTheDocument()
    })

    it('il listesi yuklenemezse hata + tekrar dene gosterilir, tekrar denemede basarili olursa liste yuklenir', async () => {
        let ilCallCount = 0
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url === '/api/tkgm/il') {
                ilCallCount++
                if (ilCallCount === 1) return Promise.reject(new Error('ag hatasi'))
                return Promise.resolve({ ok: true, json: async () => ({ iller: [{ id: 23, text: 'Adana' }] }) })
            }
            throw new Error(`beklenmeyen fetch: ${url}`)
        }) as unknown as typeof fetch

        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)

        await waitFor(() => expect(screen.getByText(/İl listesi yüklenemedi/i)).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /Sorgula/i })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: /Tekrar dene/i }))

        await waitFor(() => expect(screen.queryByText(/İl listesi yüklenemedi/i)).not.toBeInTheDocument())

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        expect(await screen.findByText('Adana')).toBeInTheDocument()
    })

    // --- Fix 1: ilce-centroid fallback (mahallenin centroidi yok/secilmedi) ---

    it('mahalle secilmez veya centroidsizse, Nominatime gitmeden ONCE ilcenin centroidi kullanilir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ', centroid: { lat: 37.5, lng: 35.5 } }] },
            { mahalleler: [] },
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        const fetchCallsBeforeSearch = (global.fetch as jest.Mock).mock.calls.length
        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.5, 35.5, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
        // Ilce centroidi varken Nominatim'e (veya baska bir uca) HIC gidilmedi.
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBeforeSearch)
    })

    it('ilce de centroidsizse (eski davranis) Nominatim yolu hala calisir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ', centroid: null }] },
            { mahalleler: [] },
            [{ lat: '37.3', lon: '35.4' }],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.3, 35.4, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
    })

    // --- Fix 2(a): dogrulanmamis serbest metin referansa/Nominatime sizmamali ---

    it('mahalle alanina yazilan ama hicbir TKGM ogesiyle eslesmeyen yazim hatasi referansa (mahalle: "") ve Nominatim sorgusuna sizmaz', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: null }] },
            [{ lat: '37.3', lon: '35.4' }],
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
        // Kullanici hicbir TKGM ogesiyle eslesmeyen bir yazim hatasi yazar ve
        // dropdown'dan HICBIR SEY secmeden Sorgula'ya basar.
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Akpinarrrr' } })

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(37.3, 35.4, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
        const nominatimCall = (global.fetch as jest.Mock).mock.calls.find(
            c => typeof c[0] === 'string' && c[0].includes('nominatim'),
        )
        expect(nominatimCall).toBeDefined()
        expect(decodeURIComponent(nominatimCall![0] as string)).not.toContain('Akpinarrrr')
    })

    // --- Fix 2(b): secim yapildiktan sonra metin degistirilip yeni bir eslesme kurulmazsa secim temizlenir ---

    it('mahalle secildikten sonra input metni degistirilip yeni bir eslesme kurulmazsa mahalle secimi temizlenir (Sorgula eski/stale mahalle centroidini KULLANMAZ, ilce centroidine duser)', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ', centroid: { lat: 37.5, lng: 35.5 } }] },
            { mahalleler: [{ id: 45478, text: 'Akpınar', centroid: { lat: 37.1, lng: 35.1 } }] },
        ])
        const onLocationFound = jest.fn()
        render(<ManualParcelEntryForm onLocationFound={onLocationFound} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))

        await waitFor(() => expect(screen.getByLabelText('Mahalle')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Akpınar' } })
        fireEvent.click(await screen.findByText('Akpınar'))

        // Secim yapildi (Akpınar, centroid 37.1/35.1). Simdi kullanici metni
        // degistiriyor ama dropdown'dan YENI bir sey SECMIYOR.
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Akpınardan vazgectim' } })

        fireEvent.click(screen.getByRole('button', { name: /Sorgula/i }))

        await waitFor(() => {
            // ESKI (stale) mahalle centroidi (37.1/35.1) DEGIL, ilcenin
            // centroidi (37.5/35.5) kullanilir; mahalle referansta bos.
            expect(onLocationFound).toHaveBeenCalledWith(37.5, 35.5, {
                il: 'Adana', ilce: 'Aladağ', mahalle: '', ada: '', parsel: '',
            })
        })
    })

    it('il metni secili degerden uzaklastirilip yeni bir il secilmezse ilce/mahalle secimleri ve listeleri kaskad olarak temizlenir', async () => {
        mockFetchSequence([
            { iller: [{ id: 23, text: 'Adana' }] },
            { ilceler: [{ id: 104, text: 'Aladağ' }] },
        ])
        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)

        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByLabelText('İlçe *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Aladağ' } })
        fireEvent.click(await screen.findByText('Aladağ'))
        expect(screen.getByRole('button', { name: /Sorgula/i })).not.toBeDisabled()

        // Kullanici Il metnini "Adana"dan uzaklastirir ama yeni bir il SECMEZ.
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Ad' } })

        expect(screen.getByLabelText('İlçe *')).toBeDisabled()
        expect(screen.getByRole('button', { name: /Sorgula/i })).toBeDisabled()
    })

    // --- Fix 3(b): il listesi module-scope onbellek — tekrar mount'ta yeniden cekilmez ---

    it('ayni oturumda ikinci mount il listesini yeniden cekmez (module-scope onbellek)', async () => {
        mockFetchSequence([{ iller: [{ id: 23, text: 'Adana' }] }])
        const { unmount } = render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tkgm/il'))
        const ilCallsAfterFirstMount = (global.fetch as jest.Mock).mock.calls.filter(c => c[0] === '/api/tkgm/il').length
        expect(ilCallsAfterFirstMount).toBe(1)
        unmount()

        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        // Ikinci mount'ta da il secenekleri (onbellekten) gelmeli.
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        expect(await screen.findByText('Adana')).toBeInTheDocument()

        const ilCallsAfterSecondMount = (global.fetch as jest.Mock).mock.calls.filter(c => c[0] === '/api/tkgm/il').length
        expect(ilCallsAfterSecondMount).toBe(1)
    })

    // --- Fix 3(c): 429 (rate limit) ayirt edici mesaj ---

    it('il listesi 429 ile donerse genel "yuklenemedi" yerine rate-limite ozgu mesaj gosterilir', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 429, ok: false, json: async () => ({ message: 'Çok fazla istek yaptınız.' }),
        }) as unknown as typeof fetch

        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)

        await waitFor(() => expect(screen.getByText(/Çok fazla istek yapıldı/i)).toBeInTheDocument())
        expect(screen.queryByText(/İl listesi yüklenemedi/i)).not.toBeInTheDocument()
    })

    it('ilce listesi 429 ile donerse ayni ayirt edici mesaj gosterilir (genel "yuklenemedi" degil)', async () => {
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url === '/api/tkgm/il') {
                return Promise.resolve({ status: 200, ok: true, json: async () => ({ iller: [{ id: 23, text: 'Adana' }] }) })
            }
            if (url.startsWith('/api/tkgm/ilce')) {
                return Promise.resolve({ status: 429, ok: false, json: async () => ({ message: 'cok fazla' }) })
            }
            throw new Error(`beklenmeyen fetch: ${url}`)
        }) as unknown as typeof fetch

        render(<ManualParcelEntryForm onLocationFound={jest.fn()} />)
        await waitFor(() => expect(screen.getByLabelText('İl *')).not.toBeDisabled())
        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Adana' } })
        fireEvent.click(await screen.findByText('Adana'))

        await waitFor(() => expect(screen.getByText(/Çok fazla istek yapıldı/i)).toBeInTheDocument())
        expect(screen.queryByText(/İlçe listesi yüklenemedi/i)).not.toBeInTheDocument()
    })
})
