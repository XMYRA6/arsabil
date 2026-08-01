/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KonumSecici } from './KonumSecici'

const KAYITLAR = [
    { id: '1', il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 118000, avgUnitConstructionPrice: 24500 },
    { id: '2', il: 'Ankara', ilce: 'Çankaya', avgSalesPricePerM2: 62000, avgUnitConstructionPrice: 19500 },
]

const varsayilan = {
    districtPrices: KAYITLAR,
    selectedIl: '',
    selectedIlce: '',
    onSecim: jest.fn(),
    onClear: jest.fn(),
}

describe('KonumSecici — kapali hal', () => {
    it('secim yokken davet metnini gosterir', () => {
        render(<KonumSecici {...varsayilan} />)
        // NOT: JS regex /i bayragi Turkce noktali buyuk İ (U+0130) harfini
        // 'i'ye katlamiyor (dogrulandi: /il/i.test('İl') === false), o yuzden
        // literal İ kullanildi — brief'teki `/il .../i` hicbir zaman eslesmezdi.
        expect(screen.getByRole('button', { name: /İl \/ ilçe seçin/i })).toBeInTheDocument()
    })

    it('secim varken il/ilce ve iki fiyati gosterir', () => {
        render(<KonumSecici {...varsayilan} selectedIl="İstanbul" selectedIlce="Kadıköy" />)
        const btn = screen.getByRole('button', { name: /İstanbul \/ Kadıköy/ })
        expect(btn).toBeInTheDocument()
        // Fiyatlar tr-TR bicimli olmali (ham sayi degil).
        expect(btn).toHaveTextContent('118.000')
        expect(btn).toHaveTextContent('24.500')
    })

    it('secim yokken temizle butonu YOKTUR', () => {
        render(<KonumSecici {...varsayilan} />)
        expect(screen.queryByRole('button', { name: 'Konumu temizle' })).not.toBeInTheDocument()
    })

    it('secim varken temizle butonu onClear cagirir', async () => {
        const onClear = jest.fn()
        render(<KonumSecici {...varsayilan} selectedIl="İstanbul" selectedIlce="Kadıköy" onClear={onClear} />)
        await userEvent.click(screen.getByRole('button', { name: 'Konumu temizle' }))
        expect(onClear).toHaveBeenCalledTimes(1)
    })

    // Admin kaydi silmis olabilir: isimler duruyor ama fiyat yok. Cokmemeli.
    it('secili kayit veride yoksa isimleri gosterir, cokmez', () => {
        render(<KonumSecici {...varsayilan} selectedIl="İzmir" selectedIlce="Karşıyaka" />)
        expect(screen.getByRole('button', { name: /İzmir \/ Karşıyaka/ })).toBeInTheDocument()
    })

    it('acma butonu aria-expanded tasir', () => {
        render(<KonumSecici {...varsayilan} />)
        expect(screen.getByRole('button', { name: /İl \/ ilçe seçin/i })).toHaveAttribute('aria-expanded', 'false')
    })
})
