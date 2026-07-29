/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GelismisAyarlarSheet } from './GelismisAyarlarSheet'

jest.mock('@/components/listing-wizard/ParcelPicker', () => ({
    // Leaflet jsdom'da mount edilemez; yaprak sozlesmesi test edildigi icin
    // haritanin kendisi degil, YERINDE OLUP OLMADIGI onemli.
    ParcelPicker: () => <div data-testid="parcel-picker" />,
}))

function props(patch = {}) {
    return {
        open: true,
        onClose: jest.fn(),
        onUygula: jest.fn(),
        onSifirla: jest.fn(),

        builderProfit: 1.3, setBuilderProfit: jest.fn(),
        profitLevels: [
            { id: '1', label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
            { id: '2', label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
            { id: '3', label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
        ],
        riskLevel: 10, setRiskLevel: jest.fn(),
        riskLevels: [
            { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: false },
            { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
            { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: true },
            { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
        ],
        iksaMode: 'off' as const, setIksaMode: jest.fn(),
        iksaPercentage: 5, setIksaPercentage: jest.fn(),
        iksaManualTL: 0, setIksaManualTL: jest.fn(),

        manualMarketPrice: '', setManualMarketPrice: jest.fn(),

        isApartmentCountEnabled: false, setIsApartmentCountEnabled: jest.fn(),
        totalApartments: 20, setTotalApartments: jest.fn(),
        ownerApartmentShare: 6, setOwnerApartmentShare: jest.fn(),
        isAaEnabled: false, setIsAaEnabled: jest.fn(),
        arsaAlani: 500, setArsaAlani: jest.fn(),

        parcelValue: { lat: null, lng: null, parcel: null, status: 'idle' as const },
        onParcelChange: jest.fn(),
        risk: null,
        onRiskUygula: jest.fn(),
        ...patch,
    }
}

describe('GelismisAyarlarSheet', () => {
    it('kapaliyken hicbir sey render etmez', () => {
        render(<GelismisAyarlarSheet {...props({ open: false })} />)
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('acikken modal diyalog ve dort bolum gosterir', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Formül parametreleri' })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Konum ve resmi risk' })).toBeInTheDocument()
    })

    it('mevcut alan bilesenleri yeniden kullaniliyor (kopyalanmiyor)', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        // RiskCostFields / MarketField / FormulParamsFields'in kendi etiketleri.
        expect(screen.getByText('İksa Masrafı')).toBeInTheDocument()
        expect(screen.getByText('Yaklaşık Piyasa Fiyatı')).toBeInTheDocument()
    })

    it('T2 kalemi kapandi: ParcelPicker mobilde de yaprakta yer aliyor', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByTestId('parcel-picker')).toBeInTheDocument()
    })

    it('risk olcumu varsa oneri karti gosterilir', () => {
        const risk = { faultDistanceM: 8000, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }
        render(<GelismisAyarlarSheet {...props({ risk })} />)
        expect(screen.getByText('Yakın fay etkisi')).toBeInTheDocument()
    })

    it('risk olcumu yoksa oneri karti render EDILMEZ', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.queryByText('Yakın fay etkisi')).toBeNull()
    })

    it('acilisBolumu kar ise maliyet bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'kar' })} />)
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' }))
            .toHaveAttribute('data-acilis', 'true')
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' }))
            .toHaveAttribute('data-acilis', 'false')
    })

    it('acilisBolumu piyasa ise piyasa bolumu isaretlenir', () => {
        render(<GelismisAyarlarSheet {...props({ acilisBolumu: 'piyasa' })} />)
        expect(screen.getByRole('group', { name: 'Piyasa fiyatı' }))
            .toHaveAttribute('data-acilis', 'true')
    })

    it('acilisBolumu verilmezse hicbir bolum isaretlenmez', () => {
        render(<GelismisAyarlarSheet {...props()} />)
        expect(screen.getByRole('group', { name: 'Maliyet ve riskler' }))
            .toHaveAttribute('data-acilis', 'false')
    })

    it('Uygula ve Sifirla butonlari calisir', async () => {
        const onUygula = jest.fn(); const onSifirla = jest.fn()
        render(<GelismisAyarlarSheet {...props({ onUygula, onSifirla })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Ayarları sıfırla' }))
        expect(onSifirla).toHaveBeenCalledTimes(1)
        await userEvent.click(screen.getByRole('button', { name: 'Ayarları uygula ve kapat' }))
        expect(onUygula).toHaveBeenCalledTimes(1)
    })

    it('yaprak eylemleri risk kartinin "Uygula" butonuyla KARISMAZ', () => {
        // RiskSuggestionCard da "Uygula" adli bir buton render ediyor. Ayni
        // diyalogda ayni erisilebilir ada sahip iki buton, ekran okuyucuda
        // ayirt edilemezdi; yaprak eylemlerine ayirt edici ad verildi.
        const risk = { faultDistanceM: 8000, gammaF: 1.2, floodQ100: false, suggestedR: 1.1 }
        render(<GelismisAyarlarSheet {...props({ risk })} />)
        expect(screen.getByRole('button', { name: 'Uygula' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Ayarları uygula ve kapat' })).toBeInTheDocument()
    })
})
