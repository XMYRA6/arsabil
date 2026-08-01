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

describe('KonumSecici — arama sheet\'i', () => {
    const COK_KAYIT = [
        ...KAYITLAR,
        { id: '3', il: 'İstanbul', ilce: 'Beşiktaş', avgSalesPricePerM2: 152000, avgUnitConstructionPrice: 26000 },
        { id: '4', il: 'Şanlıurfa', ilce: 'Merkez', avgSalesPricePerM2: 21000, avgUnitConstructionPrice: 11000 },
        { id: '5', il: 'Iğdır', ilce: 'Merkez', avgSalesPricePerM2: 18000, avgUnitConstructionPrice: 10000 },
    ]

    // NOT: brief'teki `/il \/ ilçe seçin/i` asla eslesmez (bkz. dosya basindaki
    // aciklama) — literal İ kullanildi.
    const ac = async () => {
        render(<KonumSecici {...varsayilan} districtPrices={COK_KAYIT} />)
        await userEvent.click(screen.getByRole('button', { name: /İl \/ ilçe seçin/i }))
    }

    it('acilinca il listesini gosterir, ilceleri DEGIL', async () => {
        await ac()
        expect(screen.getByRole('button', { name: 'İstanbul' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Kadıköy/ })).not.toBeInTheDocument()
    })

    it('bir ile dokununca o ilin ilcelerine iner', async () => {
        await ac()
        await userEvent.click(screen.getByRole('button', { name: 'İstanbul' }))
        expect(screen.getByRole('button', { name: /Kadıköy/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Beşiktaş/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Çankaya/ })).not.toBeInTheDocument()
    })

    it('ilce secilince onSecim il ve ilce ile BIRLIKTE cagrilir', async () => {
        const onSecim = jest.fn()
        render(<KonumSecici {...varsayilan} districtPrices={COK_KAYIT} onSecim={onSecim} />)
        await userEvent.click(screen.getByRole('button', { name: /İl \/ ilçe seçin/i }))
        await userEvent.click(screen.getByRole('button', { name: 'İstanbul' }))
        await userEvent.click(screen.getByRole('button', { name: /Kadıköy/ }))
        expect(onSecim).toHaveBeenCalledWith('İstanbul', 'Kadıköy')
    })

    it('ASCII yazimla arayinca duz sonuc listesi verir', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'kadikoy')
        expect(screen.getByRole('button', { name: /İstanbul \/ Kadıköy/ })).toBeInTheDocument()
    })

    // "Merkez" birden cok ilde var: sonuclar il adini TASIMALI, yoksa
    // kullanici hangisini sectigini bilemez.
    it('tekrar eden ilce adinda sonuclari il adiyla ayirt eder', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'merkez')
        expect(screen.getByRole('button', { name: /Şanlıurfa \/ Merkez/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Iğdır \/ Merkez/ })).toBeInTheDocument()
    })

    it('sonuc yoksa bunu soyler', async () => {
        await ac()
        await userEvent.type(screen.getByRole('searchbox', { name: /ara/i }), 'zzzz')
        expect(screen.getByText(/sonuç yok/i)).toBeInTheDocument()
    })
})
