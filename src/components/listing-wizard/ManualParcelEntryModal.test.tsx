/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ManualParcelEntryModal } from './ManualParcelEntryModal'

function mockNominatim(body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch
}

describe('ManualParcelEntryModal', () => {
    afterEach(() => { jest.restoreAllMocks() })

    it('kapaliyken hicbir sey render etmez', () => {
        render(<ManualParcelEntryModal isOpen={false} onClose={jest.fn()} onLocationFound={jest.fn()} />)
        expect(screen.queryByText('Elle Parsel Girişi')).not.toBeInTheDocument()
    })

    it('il/ilce doldurulmadan Haritada Goster devre disidir', () => {
        render(<ManualParcelEntryModal isOpen onClose={jest.fn()} onLocationFound={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Haritada Göster/i })).toBeDisabled()
    })

    it('il ve ilce girilince buton etkinlesir, aramada bulunan konum onLocationFound ile bildirilir', async () => {
        mockNominatim([{ lat: '41.167877', lon: '27.583458' }])
        const onLocationFound = jest.fn()
        const onClose = jest.fn()
        render(<ManualParcelEntryModal isOpen onClose={onClose} onLocationFound={onLocationFound} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Tekirdağ' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Muratlı' } })
        fireEvent.change(screen.getByLabelText('Mahalle'), { target: { value: 'Kırkkepenekli' } })
        fireEvent.change(screen.getByLabelText('Ada No'), { target: { value: '0' } })
        fireEvent.change(screen.getByLabelText('Parsel No'), { target: { value: '1871' } })

        fireEvent.click(screen.getByRole('button', { name: /Haritada Göster/i }))

        await waitFor(() => {
            expect(onLocationFound).toHaveBeenCalledWith(41.167877, 27.583458, {
                il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli', ada: '0', parsel: '1871',
            })
        })
        expect(onClose).toHaveBeenCalled()
    })

    it('sonuc bulunamazsa hata gosterir ve modali kapatmaz', async () => {
        mockNominatim([])
        const onLocationFound = jest.fn()
        const onClose = jest.fn()
        render(<ManualParcelEntryModal isOpen onClose={onClose} onLocationFound={onLocationFound} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Bilinmeyen' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Yer' } })
        fireEvent.click(screen.getByRole('button', { name: /Haritada Göster/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum bulunamadı/i)).toBeInTheDocument()
        })
        expect(onLocationFound).not.toHaveBeenCalled()
        expect(onClose).not.toHaveBeenCalled()
    })

    it('ag hatasinda hata mesaji gosterir', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
        render(<ManualParcelEntryModal isOpen onClose={jest.fn()} onLocationFound={jest.fn()} />)

        fireEvent.change(screen.getByLabelText('İl *'), { target: { value: 'Tekirdağ' } })
        fireEvent.change(screen.getByLabelText('İlçe *'), { target: { value: 'Muratlı' } })
        fireEvent.click(screen.getByRole('button', { name: /Haritada Göster/i }))

        await waitFor(() => {
            expect(screen.getByText(/konum aranırken bir sorun oluştu/i)).toBeInTheDocument()
        })
    })

    it('Vazgec butonu onClose cagirir', () => {
        const onClose = jest.fn()
        render(<ManualParcelEntryModal isOpen onClose={onClose} onLocationFound={jest.fn()} />)
        fireEvent.click(screen.getByRole('button', { name: /Vazgeç/i }))
        expect(onClose).toHaveBeenCalled()
    })
})
