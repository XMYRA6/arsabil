/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartContextCard } from './SmartContextCard'

const RISK_LEVELS = [
    { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
    { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
]

function props(patch: Partial<React.ComponentProps<typeof SmartContextCard>> = {}) {
    return {
        parcelContext: null,
        onOpenMap: jest.fn(),
        arsaAlani: 500,
        onArsaAlani: jest.fn(),
        riskLevel: 10,
        riskLevels: RISK_LEVELS,
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
        isAaEnabled: true,
        ...patch,
    }
}

describe('SmartContextCard', () => {
    it('parsel SECILMEDEN de risk pilleri gorunur ve tiklanabilir', async () => {
        const onRiskLevel = jest.fn()
        render(<SmartContextCard {...props({ parcelContext: null, onRiskLevel })} />)
        expect(screen.getByRole('button', { name: 'Yüksek' })).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Yüksek' }))
        expect(onRiskLevel).toHaveBeenCalledWith(15)
    })

    it('parsel SECILMEDEN de arsa alani girilebilir (isAaEnabled acikken)', () => {
        render(<SmartContextCard {...props({ parcelContext: null, isAaEnabled: true })} />)
        expect(screen.getByPlaceholderText('Alanı girin')).toBeInTheDocument()
    })

    it('isAaEnabled kapaliyken alan bolumu gorunmez (parsel olsa bile)', () => {
        render(<SmartContextCard {...props({ isAaEnabled: false })} />)
        expect(screen.queryByPlaceholderText('Alanı girin')).toBeNull()
    })

    it('parsel yokken "Haritadan parsel sec" satiri gorunur', () => {
        render(<SmartContextCard {...props({ parcelContext: null })} />)
        expect(screen.getByRole('button', { name: /Haritadan parsel seç/ })).toBeInTheDocument()
    })

    it('parsel varken adres ve TKGM onay rozeti gorunur', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<SmartContextCard {...props({ parcelContext })} />)
        expect(screen.getByText(/Kadıköy, Fenerbahçe/)).toBeInTheDocument()
        expect(screen.getByText('✓ TKGM Onaylı')).toBeInTheDocument()
    })

    it('secili risk pili aktif isaretlenir', () => {
        render(<SmartContextCard {...props({ riskLevel: 10 })} />)
        expect(screen.getByRole('button', { name: 'Orta' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Yüksek' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('risk kaynak etiketi gosterilir', () => {
        render(<SmartContextCard {...props({ riskKaynagi: { tur: 'tkgm' } })} />)
        expect(screen.getByText('TKGM Onaylı')).toBeInTheDocument()
    })
})
