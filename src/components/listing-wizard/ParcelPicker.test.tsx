/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

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

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

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

        await userEvent.click(screen.getByRole('button', { name: /Parseli Doğrula/i }))

        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith({ parcel: null, status: 'unavailable' })
        })
    })
})
