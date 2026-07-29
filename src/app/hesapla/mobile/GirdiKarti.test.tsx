/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GirdiKarti } from './GirdiKarti'

const FIYATLAR = [
    { id: '1', il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 41000, avgUnitConstructionPrice: 12000 },
    { id: '2', il: 'İstanbul', ilce: 'Beşiktaş', avgSalesPricePerM2: 62000, avgUnitConstructionPrice: 14000 },
]

function props(patch: Partial<React.ComponentProps<typeof GirdiKarti>> = {}) {
    return {
        konum: {
            districtPrices: FIYATLAR,
            selectedIl: 'İstanbul', selectedIlce: 'Kadıköy',
            onIlChange: jest.fn(), onIlceChange: jest.fn(), onClear: jest.fn(),
            birimMaliyet: 12000,
            birimMaliyetKaynagi: { tur: 'ilce' as const, ilce: 'Kadıköy' },
            onBirimMaliyet: jest.fn(),
            parselIsaretli: false, onParselAc: jest.fn(),
        },
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
    it('konum blogu kartin EN USTUNDE', () => {
        const { container } = render(<GirdiKarti {...props()} />)
        const ilk = container.querySelector('section')!.firstElementChild!
        expect(ilk.className).toMatch(/konumBlogu/)
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
})
