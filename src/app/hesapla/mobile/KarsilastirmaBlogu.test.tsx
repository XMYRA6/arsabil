/** @jest-environment jsdom */
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KarsilastirmaBlogu } from './KarsilastirmaBlogu'

function props(patch = {}) {
    return { piyasaFiyati: '5.740.000', onPiyasaFiyati: jest.fn(), farkYuzde: -14, ...patch }
}

describe('KarsilastirmaBlogu', () => {
    it('piyasa fiyatini gosterir', () => {
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByDisplayValue('5.740.000')).toBeInTheDocument()
    })

    it('ucuzsa yesil rozet gosterir', () => {
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByText(/%14 UCUZ/)).toBeInTheDocument()
    })

    it('pahaliysa rozet yon degistirir', () => {
        render(<KarsilastirmaBlogu {...props({ farkYuzde: 9 })} />)
        expect(screen.getByText(/%9 PAHALI/)).toBeInTheDocument()
    })

    it('fark yoksa rozet ELEMENTI render edilmez', () => {
        const { container } = render(<KarsilastirmaBlogu {...props({ farkYuzde: null })} />)
        expect(screen.queryByText(/UCUZ|PAHALI/)).toBeNull()
        expect(container.querySelector('[class*="karsRozet"]')).toBeNull()
    })

    it('piyasa fiyati bosken TESVIK gosterir', () => {
        render(<KarsilastirmaBlogu {...props({ piyasaFiyati: '', farkYuzde: null })} />)
        expect(screen.getByText(/Piyasa fiyatı girin, karşılaştıralım/)).toBeInTheDocument()
    })

    it('bu degerin hesaba GIRMEDIGINI soyler', () => {
        // Kullanici "hangi fiyattan hesapliyor" diye sormustu; bu alan
        // hesabi degil karsilastirmayi besliyor.
        render(<KarsilastirmaBlogu {...props()} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı \(yalnızca karşılaştırma\)/))
            .toBeInTheDocument()
    })

    it('girilen deger bildirilir', async () => {
        // Alan KONTROLLU: yazilan metnin birikmesi icin state geri beslemesi
        // sart. Duz bir jest.fn() ile React her tus vurusundan sonra DOM
        // degerini degismeyen prop'tan geri yazar — bu, bilesenin degil
        // test kosumunun kisitidir.
        const onPiyasaFiyati = jest.fn()
        function Sarmalayici() {
            const [deger, setDeger] = useState('')
            return (
                <KarsilastirmaBlogu
                    {...props({
                        piyasaFiyati: deger,
                        onPiyasaFiyati: (v: string) => { onPiyasaFiyati(v); setDeger(v) },
                    })}
                />
            )
        }
        render(<Sarmalayici />)
        const alan = screen.getByLabelText(/Yaklaşık piyasa fiyatı/)
        await userEvent.type(alan, '6000000')
        expect(alan).toHaveValue('6000000')
        expect(onPiyasaFiyati).toHaveBeenLastCalledWith('6000000')
    })

    it('prop degisimi alana YANSIR (ilce secimi piyasa fiyatini doldurur)', () => {
        // Ilce secilince page.tsx setManualMarketPrice ile bu alani doldurur.
        // Kontrolsuz bir alan bu guncellemeyi sessizce yok sayardi.
        const { rerender } = render(<KarsilastirmaBlogu {...props({ piyasaFiyati: '' })} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toHaveValue('')
        rerender(<KarsilastirmaBlogu {...props({ piyasaFiyati: '5.740.000' })} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toHaveValue('5.740.000')
    })
})
