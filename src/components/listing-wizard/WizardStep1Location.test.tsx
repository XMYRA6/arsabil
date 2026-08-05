/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WizardStep1Location } from './WizardStep1Location'
import { emptyFormData } from './types'

jest.mock('./ParcelVerificationSheet', () => ({
    ParcelVerificationSheet: ({ isOpen, initialValue }: { isOpen: boolean; initialValue?: { lat: number | null; lng: number | null } }) => (
        isOpen ? (
            <div data-testid="parcel-sheet">
                <span data-testid="parcel-sheet-lat">{initialValue?.lat ?? ''}</span>
                <span data-testid="parcel-sheet-lng">{initialValue?.lng ?? ''}</span>
            </div>
        ) : null
    ),
}))

describe('WizardStep1Location', () => {
    it('mevcut il/ilçe/adres alanları korunur', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByText('İl *')).toBeInTheDocument()
        expect(screen.getByText('İlçe')).toBeInTheDocument()
        expect(screen.getByText('Tam Adres')).toBeInTheDocument()
    })

    it('parsel secilmemisken tetikleyici buton gorunur, sheet kapali', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Konumu Haritadan Seç/i })).toBeInTheDocument()
        expect(screen.queryByTestId('parcel-sheet')).not.toBeInTheDocument()
    })

    it('tetikleyiciye tiklaninca sheet acilir', () => {
        render(<WizardStep1Location data={emptyFormData} onChange={jest.fn()} />)
        fireEvent.click(screen.getByRole('button', { name: /Konumu Haritadan Seç/i }))
        expect(screen.getByTestId('parcel-sheet')).toBeInTheDocument()
    })

    it('parsel dogrulanmissa ozet satiri gorunur, tetikleyici "Degistir"e doner', () => {
        render(
            <WizardStep1Location
                data={{
                    ...emptyFormData,
                    lat: 41.16, lng: 27.58, parcelStatus: 'verified',
                    parcel: { il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli', adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa', geometry: { type: 'Polygon', coordinates: [] } },
                }}
                onChange={jest.fn()}
            />,
        )
        expect(screen.getByText(/Kırkkepenekli/)).toBeInTheDocument()
        expect(screen.getByText(/830 m²/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Değiştir/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Konumu Haritadan Seç/i })).not.toBeInTheDocument()
    })

    it('konum var ama dogrulanmamissa orta durum gorunur — bos tetikleyici degil, tam ozet degil', () => {
        render(
            <WizardStep1Location
                data={{
                    ...emptyFormData,
                    lat: 41.16, lng: 27.58, parcelStatus: 'idle', parcel: null,
                }}
                onChange={jest.fn()}
            />,
        )
        expect(screen.getByText(/TKGM doğrulaması yapılmadı/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Değiştir/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Konumu Haritadan Seç/i })).not.toBeInTheDocument()
        // Dogrulanmamis secimde parsel bilgisi (mahalle/ada/parsel/alan) yok — ozet satiri gosterilmemeli.
        expect(screen.queryByText(/m²/)).not.toBeInTheDocument()
    })

    it('sheet acilirken mevcut lat/lng/parcel/parcelStatus initialValue olarak gecirilir', () => {
        render(
            <WizardStep1Location
                data={{ ...emptyFormData, lat: 41.16, lng: 27.58, parcelStatus: 'idle' }}
                onChange={jest.fn()}
            />,
        )
        fireEvent.click(screen.getByRole('button', { name: /Değiştir/i }))
        expect(screen.getByTestId('parcel-sheet-lat')).toHaveTextContent('41.16')
        expect(screen.getByTestId('parcel-sheet-lng')).toHaveTextContent('27.58')
    })
})
