/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ParcelPicker, ParcelPickerValue } from './ParcelPicker'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon' as const, coordinates: [[[27.58337, 41.16781]]] },
}

const EMPTY: ParcelPickerValue = { lat: null, lng: null, parcel: null, status: 'idle' }
const PINNED: ParcelPickerValue = { lat: 41.167877, lng: 27.583458, parcel: null, status: 'idle' }

function mockLookup(body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch
}

describe('ParcelPicker', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('pin atılmadan doğrula butonu devre dışıdır', () => {
        render(<ParcelPicker value={EMPTY} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Parseli Doğrula/i })).toBeDisabled()
    })

    it('pin atılınca doğrula butonu etkinleşir ve koordinat gösterilir', () => {
        render(<ParcelPicker value={PINNED} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Parseli Doğrula/i })).toBeEnabled()
        expect(screen.getByText(/41\.167877/)).toBeInTheDocument()
    })

    it('doğrulama başarılıysa parsel kartı gösterilir ve onChange çağrılır', async () => {
        mockLookup({ status: 'verified', parcel: PARCEL })
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: PARCEL, status: 'verified' })
        })
    })

    it('doğrulanmış değerde parsel kimliği ve resmi alan görünür', () => {
        render(<ParcelPicker value={{ ...PINNED, parcel: PARCEL, status: 'verified' }} onChange={jest.fn()} />)
        expect(screen.getByText(/Ada 0/)).toBeInTheDocument()
        expect(screen.getByText(/Parsel 1871/)).toBeInTheDocument()
        expect(screen.getByText(/Kirkkepenekli/)).toBeInTheDocument()
        expect(screen.getByText(/830 m²/)).toBeInTheDocument()
    })

    it('parsel bulunamazsa yönlendirici uyarı gösterir', async () => {
        mockLookup({ status: 'not_found' })
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'not_found' })
        })
    })

    it('not_found durumunda kullanıcıya pini taşıması söylenir', () => {
        render(<ParcelPicker value={{ ...PINNED, status: 'not_found' }} onChange={jest.fn()} />)
        expect(screen.getByText(/parselin içine taşıyın/i)).toBeInTheDocument()
    })

    it('unavailable durumunda ilanın yine yayınlanabileceği söylenir', () => {
        render(<ParcelPicker value={{ ...PINNED, status: 'unavailable' }} onChange={jest.fn()} />)
        expect(screen.getByText(/doğrulanmadan yayınlanabilir/i)).toBeInTheDocument()
    })

    it('ağ hatasında unavailable durumuna düşer', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'unavailable' })
        })
    })

    it('401 yanitinda unavailable degil unauthorized durumuna gecer (giris yapmamis kullanici, servis kesintisi degil)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false, status: 401, json: async () => ({ message: 'Giriş yapmanız gerekiyor.' }),
        }) as unknown as typeof fetch
        const onChange = jest.fn()
        render(<ParcelPicker value={PINNED} onChange={onChange} />)

        fireEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'unauthorized' })
        })
    })

    it('unauthorized durumunda oturum acma mesaji gosterir', () => {
        render(<ParcelPicker value={{ ...PINNED, status: 'unauthorized' }} onChange={jest.fn()} />)
        expect(screen.getByText(/giriş yapmanız gerekiyor/i)).toBeInTheDocument()
    })

    it('notFoundText / unavailableText verilmezse sihirbazin varsayilan metinleri degismeden kalir', () => {
        const { rerender } = render(<ParcelPicker value={{ ...PINNED, status: 'not_found' }} onChange={jest.fn()} />)
        expect(screen.getByText(/Doğrulamadan da devam edebilirsiniz/)).toBeInTheDocument()

        rerender(<ParcelPicker value={{ ...PINNED, status: 'unavailable' }} onChange={jest.fn()} />)
        expect(screen.getByText(/İlanınız doğrulanmadan yayınlanabilir/)).toBeInTheDocument()
    })

    it('notFoundText / unavailableText verilirse ozellestirilmis metin gosterilir', () => {
        const { rerender } = render(
            <ParcelPicker
                value={{ ...PINNED, status: 'not_found' }}
                onChange={jest.fn()}
                notFoundText="Doğrulama olmadan da hesaplama yapabilirsiniz."
                unavailableText="Doğrulama olmadan da hesaplama yapabilirsiniz, daha sonra tekrar deneyebilirsiniz."
            />,
        )
        expect(screen.getByText('Doğrulama olmadan da hesaplama yapabilirsiniz.')).toBeInTheDocument()
        expect(screen.queryByText(/Doğrulamadan da devam edebilirsiniz/)).not.toBeInTheDocument()

        rerender(
            <ParcelPicker
                value={{ ...PINNED, status: 'unavailable' }}
                onChange={jest.fn()}
                notFoundText="Doğrulama olmadan da hesaplama yapabilirsiniz."
                unavailableText="Doğrulama olmadan da hesaplama yapabilirsiniz, daha sonra tekrar deneyebilirsiniz."
            />,
        )
        expect(screen.getByText('Doğrulama olmadan da hesaplama yapabilirsiniz, daha sonra tekrar deneyebilirsiniz.')).toBeInTheDocument()
        expect(screen.queryByText(/İlanınız doğrulanmadan yayınlanabilir/)).not.toBeInTheDocument()
    })
})
