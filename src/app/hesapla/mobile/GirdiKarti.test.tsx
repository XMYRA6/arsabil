/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GirdiKarti } from './GirdiKarti'

function props(patch: Partial<React.ComponentProps<typeof GirdiKarti>> = {}) {
    return {
        parcelContext: null,
        arsaAlani: 500, onArsaAlani: jest.fn(),
        riskLevel: 10,
        riskLevels: [
            { id: 'r0', label: 'Yok', value: 0, sortOrder: 0, isDefault: true },
            { id: 'r1', label: 'Düşük', value: 5, sortOrder: 1, isDefault: false },
            { id: 'r2', label: 'Orta', value: 10, sortOrder: 2, isDefault: false },
            { id: 'r3', label: 'Yüksek', value: 15, sortOrder: 3, isDefault: false },
        ],
        onRiskLevel: jest.fn(),
        riskKaynagi: { tur: 'varsayilan' as const },
        isAaEnabled: false,
        onIsAaEnabled: jest.fn(),
        onParselDogrulaAc: jest.fn(),
        luxLevel: 1.2, onLuxLevel: jest.fn(),
        apartmentSize: 140, onApartmentSize: jest.fn(),
        landShareRatio: 33, onLandShareRatio: jest.fn(),
        isApartmentCountEnabled: false, onApartmentCountEnabled: jest.fn(),
        totalApartments: 20, onTotalApartments: jest.fn(),
        ownerApartmentShare: 6, onOwnerApartmentShare: jest.fn(),
        ...patch,
    }
}

describe('GirdiKarti', () => {
    it('SmartContextCard kartin EN USTUNDE', () => {
        render(<GirdiKarti {...props()} />)
        expect(screen.getByRole('button', { name: /Haritadan parsel seç/ })).toBeInTheDocument()
    })

    it('MOBILDE parsel olmadan arsa alani acilabilir (anahtar karta tasindi)', async () => {
        // Regresyon: `isAaEnabled`i cevirebilen tek kontrol masaustu JSX
        // agacindaydi; mobil kullanici alani ancak areaSqm donen bir TKGM
        // parselini onaylayarak acabiliyordu. Spec ise risk ve alanin parsel
        // SECILMEDEN de kullanilabilir kalmasini sart kosuyor.
        const onIsAaEnabled = jest.fn()
        render(<GirdiKarti {...props({ parcelContext: null, isAaEnabled: false, onIsAaEnabled })} />)
        await userEvent.click(screen.getByRole('checkbox', { name: 'Arsa alanını hesaba kat' }))
        expect(onIsAaEnabled).toHaveBeenCalledWith(true)
    })

    it('yapi standardi uc segment sunar ve secili olani isaretler', () => {
        render(<GirdiKarti {...props()} />)
        const tabs = screen.getAllByRole('tab')
        expect(tabs.map(t => t.textContent)).toEqual(['Standart', 'Orta', 'Lüks'])
        expect(screen.getByRole('tab', { name: 'Orta' })).toHaveAttribute('aria-selected', 'true')
    })

    it('segment tiklaninca luxLevel degeri bildirilir', async () => {
        const onLuxLevel = jest.fn()
        render(<GirdiKarti {...props({ onLuxLevel })} />)
        await userEvent.click(screen.getByRole('tab', { name: 'Lüks' }))
        expect(onLuxLevel).toHaveBeenCalledWith(1.4)
    })

    it('metrekare artir/azalt 5 adimla calisir', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi artır' }))
        expect(onApartmentSize).toHaveBeenCalledWith(145)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).toHaveBeenCalledWith(135)
    })

    it('metrekare minimum 50 nin altina inmez', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 50, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).not.toHaveBeenCalled()
    })

    // Slider'lar native `<input type="range">`. Bunlarin `role="slider"`i ve
    // deger/aralik bilgisi erisilebilirlik agacina `min`/`max`/`value`dan
    // TURETILIR; ustune `aria-valuenow/min/max` yazmak gereksiz tekrardir
    // (ARIA 1. kural: native yeterliyse ARIA ekleme). Sozlesmenin kendisi
    // `getByRole('slider', { name })` ile dogrulaniyor — rol de erisilebilir
    // ad da gercekten var.
    it('arsa payi slider i erisilebilir', () => {
        render(<GirdiKarti {...props()} />)
        const slider = screen.getByRole('slider', { name: /Arsa payı/ })
        expect(slider).toHaveValue('33')
    })

    it('daire sayisi modu ACIKKEN yuzde salt-okunur olur', () => {
        render(<GirdiKarti {...props({ isApartmentCountEnabled: true })} />)
        // ownerApartmentShare tek gercek kaynak; yuzde slider i duzenlenemez.
        expect(screen.queryByRole('slider', { name: /Arsa payı/ })).toBeNull()
        expect(screen.getByRole('slider', { name: /Arsa sahibinin daire sayısı/ }))
            .toHaveValue('6')
    })

    it('daire sayisi slider i 0..totalApartments araliginda', () => {
        render(<GirdiKarti {...props({ isApartmentCountEnabled: true, totalApartments: 20 })} />)
        const s = screen.getByRole('slider', { name: /Arsa sahibinin daire sayısı/ })
        expect(s).toHaveAttribute('min', '0')
        expect(s).toHaveAttribute('max', '20')
    })

    it('daire sayisi modu ACIKKEN turetilen yuzdeyi salt-okunur gosterir', () => {
        // 6/20 = %30. Bu, 2026-07-24'te kapatilan bugun cekirdegi: yuzde ile
        // daire sayisi ayni anda duzenlenebilseydi ikisi sessizce ayrisirdi.
        render(<GirdiKarti {...props({ isApartmentCountEnabled: true, ownerApartmentShare: 6, totalApartments: 20 })} />)
        expect(screen.getByText('%30')).toBeInTheDocument()
    })

    it('daire sayisi modu kapaliyken daire slider i YOK', () => {
        render(<GirdiKarti {...props({ isApartmentCountEnabled: false })} />)
        expect(screen.queryByRole('slider', { name: /Arsa sahibinin daire sayısı/ })).toBeNull()
    })

    it('mod anahtari durumu bildirir', async () => {
        const onApartmentCountEnabled = jest.fn()
        render(<GirdiKarti {...props({ onApartmentCountEnabled })} />)
        await userEvent.click(screen.getByRole('switch', { name: /Toplam daire sayısı/ }))
        expect(onApartmentCountEnabled).toHaveBeenCalledWith(true)
    })

    it('apartmentSize null iken input placeholder tire gosterir', () => {
        render(<GirdiKarti {...props({ apartmentSize: null })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        expect(input).toHaveValue(null)
        expect(input).toHaveAttribute('placeholder', '—')
    })

    it('apartmentSize null iken azalt hicbir sey yapmaz', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: null, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi azalt' }))
        expect(onApartmentSize).not.toHaveBeenCalled()
    })

    it('apartmentSize null iken artir varsayilan degere atlar', async () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: null, onApartmentSize })} />)
        await userEvent.click(screen.getByRole('button', { name: 'Metrekareyi artır' }))
        expect(onApartmentSize).toHaveBeenCalledWith(140)
    })

    it('elle yazilan deger dogrudan onApartmentSize a iletilir (clamp yok, masaustuyle tutarli)', () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 140, onApartmentSize })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        fireEvent.change(input, { target: { value: '999' } })
        expect(onApartmentSize).toHaveBeenCalledWith(999)
    })

    it('input bosaltilinca onApartmentSize(null) cagrilir', () => {
        const onApartmentSize = jest.fn()
        render(<GirdiKarti {...props({ apartmentSize: 140, onApartmentSize })} />)
        const input = screen.getByRole('spinbutton', { name: 'Daire büyüklüğü, m²' })
        fireEvent.change(input, { target: { value: '' } })
        expect(onApartmentSize).toHaveBeenCalledWith(null)
    })
})
