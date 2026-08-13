/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationHeader, RiskSection, AreaSection } from './SmartContextCardSections'

const RISK_LEVELS = [
    { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
    { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
    { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
    { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
]

describe('LocationHeader', () => {
    it('parcelContext yokken "Haritadan parsel seç" gösterir', () => {
        render(<LocationHeader parcelContext={null} onOpenMap={jest.fn()} />)
        expect(screen.getByRole('button', { name: /Haritadan parsel seç/ })).toBeInTheDocument()
    })

    it('kök eleman data-girdi-blok="konum" taşır', () => {
        const { container } = render(<LocationHeader parcelContext={null} onOpenMap={jest.fn()} />)
        expect(container.querySelector('[data-girdi-blok="konum"]')).toBeInTheDocument()
    })

    it('parcelContext varken adres ve "Değiştir" gösterir', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<LocationHeader parcelContext={parcelContext} onOpenMap={jest.fn()} />)
        expect(screen.getByText(/Kadıköy, Fenerbahçe/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Değiştir' })).toBeInTheDocument()
    })
})

describe('RiskSection', () => {
    it('kök eleman data-girdi-blok="deprem-riski" taşır', () => {
        const { container } = render(
            <RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={jest.fn()} riskKaynagi={{ tur: 'varsayilan' }} />
        )
        expect(container.querySelector('[data-girdi-blok="deprem-riski"]')).toBeInTheDocument()
    })

    it('risk pilleri gorunur ve tiklanabilir', async () => {
        const onRiskLevel = jest.fn()
        render(<RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={onRiskLevel} riskKaynagi={{ tur: 'varsayilan' }} />)
        await userEvent.click(screen.getByRole('button', { name: 'Yüksek' }))
        expect(onRiskLevel).toHaveBeenCalledWith(15)
    })

    it('secili risk pili aktif isaretlenir', () => {
        render(<RiskSection riskLevel={10} riskLevels={RISK_LEVELS} onRiskLevel={jest.fn()} riskKaynagi={{ tur: 'varsayilan' }} />)
        expect(screen.getByRole('button', { name: 'Orta' })).toHaveAttribute('aria-pressed', 'true')
    })
})

describe('AreaSection', () => {
    it('kök eleman data-girdi-blok="arsa-alani" taşır', () => {
        const { container } = render(
            <AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={false} onIsAaEnabled={jest.fn()} />
        )
        expect(container.querySelector('[data-girdi-blok="arsa-alani"]')).toBeInTheDocument()
    })

    it('isAaEnabled kapaliyken alan input satırı görünmez', () => {
        render(<AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={false} onIsAaEnabled={jest.fn()} />)
        expect(screen.queryByPlaceholderText('Alanı girin')).toBeNull()
    })

    it('isAaEnabled açıkken alan input satırı görünür ve anahtar çalışır', async () => {
        const onIsAaEnabled = jest.fn()
        render(<AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={onIsAaEnabled} />)
        expect(screen.getByPlaceholderText('Alanı girin')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('checkbox', { name: 'Arsa alanını hesaba kat' }))
        expect(onIsAaEnabled).toHaveBeenCalledWith(false)
    })

    it('TKGM onaylı parselde durum metni doğru gösterilir', () => {
        const parcelContext = {
            lat: 41.0, lng: 29.0, status: 'verified' as const,
            parcel: { il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Fenerbahçe', adaNo: '1', parselNo: '2', areaSqm: 620, quality: 'Arsa', geometry: { type: 'Polygon' as const, coordinates: [] } },
        }
        render(<AreaSection parcelContext={parcelContext} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={jest.fn()} />)
        expect(screen.getByText('✓ TKGM Onaylı')).toBeInTheDocument()
    })

    // `stepper` prop verilmezse (masaustu cagri sitesi SmartContextCard.tsx)
    // eski duz input+span JSX'i BIREBIR korunur — +/- butonu render edilmez.
    it('stepper prop verilmezse artir/azalt butonu render edilmez (masaüstü regresyon kilidi)', () => {
        render(<AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={jest.fn()} />)
        expect(screen.queryByRole('button', { name: /Arsa alanını (artır|azalt)/ })).toBeNull()
    })

    it('stepper prop verilince artir/azalt butonu render edilir', () => {
        render(
            <AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={jest.fn()} isAaEnabled={true} onIsAaEnabled={jest.fn()}
                stepper={{ step: 10, min: 10 }} />
        )
        expect(screen.getByRole('button', { name: 'Arsa alanını azalt' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Arsa alanını artır' })).toBeInTheDocument()
    })

    it('stepper artir/azalt adim kadar degistirir', async () => {
        const onArsaAlani = jest.fn()
        render(
            <AreaSection parcelContext={null} arsaAlani={500} onArsaAlani={onArsaAlani} isAaEnabled={true} onIsAaEnabled={jest.fn()}
                stepper={{ step: 10, min: 10 }} />
        )
        await userEvent.click(screen.getByRole('button', { name: 'Arsa alanını artır' }))
        expect(onArsaAlani).toHaveBeenCalledWith(510)
        await userEvent.click(screen.getByRole('button', { name: 'Arsa alanını azalt' }))
        expect(onArsaAlani).toHaveBeenCalledWith(490)
    })

    it('stepper azalt minimumun altina inmez', async () => {
        const onArsaAlani = jest.fn()
        render(
            <AreaSection parcelContext={null} arsaAlani={10} onArsaAlani={onArsaAlani} isAaEnabled={true} onIsAaEnabled={jest.fn()}
                stepper={{ step: 10, min: 10 }} />
        )
        await userEvent.click(screen.getByRole('button', { name: 'Arsa alanını azalt' }))
        expect(onArsaAlani).not.toHaveBeenCalled()
    })
})
