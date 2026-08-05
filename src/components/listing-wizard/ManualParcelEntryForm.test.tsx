/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ManualParcelEntryForm } from './ManualParcelEntryForm'

function mockFetchSequence(responses: unknown[]) {
    let call = 0
    global.fetch = jest.fn().mockImplementation(() => {
        const body = responses[Math.min(call, responses.length - 1)]
        call++
        return Promise.resolve({ ok: true, json: async () => body })
    }) as unknown as typeof fetch
}

describe('ManualParcelEntryForm', () => {
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
})
