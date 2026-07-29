/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucKarti } from './SonucKarti'

const BASE = {
    minDaireFiyati: 8964000,
    arsaPayiYuzde: 33,
    birimFiyat: 64028,
    karsilastirma: {
        piyasaFiyati: '10.000.000',
        onPiyasaFiyati: jest.fn(),
        farkYuzde: -14,
    },
    onFisAc: jest.fn(),
    onAnalizAc: jest.fn(),
}

describe('SonucKarti', () => {
    it('min daire fiyatini Turkce bicimde gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('8.964.000')).toBeInTheDocument()
    })

    it('arsa payi ve birim fiyati gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('%33')).toBeInTheDocument()
        expect(screen.getByText('64.028')).toBeInTheDocument()
    })

    it('rakamlari ondalik basmaz', () => {
        // Motor ciktisi (FD_total = M * K) neredeyse hicbir zaman tam sayi
        // degildir; Intl varsayilani 3 ondalik basar. Bicimleyici bunu
        // `maximumFractionDigits: 0` ile kesiyor.
        render(<SonucKarti {...BASE} minDaireFiyati={8963999.6} birimFiyat={64028.153} />)
        expect(screen.getByText('8.964.000')).toBeInTheDocument()
        expect(screen.getByText('64.028')).toBeInTheDocument()
    })

    it('piyasadan ucuzsa yesil rozet gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText(/%14 UCUZ/)).toBeInTheDocument()
    })

    it('piyasadan pahaliysa rozet yon degistirir', () => {
        render(<SonucKarti {...BASE} karsilastirma={{ ...BASE.karsilastirma, farkYuzde: 9 }} />)
        expect(screen.getByText(/%9 PAHALI/)).toBeInTheDocument()
    })

    it('piyasa farki yoksa rozet ELEMENTI HIC render edilmez', () => {
        // Metin yoklugu yetmez: bos icerikli bir rozet elementi de metin
        // testini gecerdi. Elementin kendisinin olmadigi dogrulaniyor.
        const { container } = render(
            <SonucKarti {...BASE} karsilastirma={{ ...BASE.karsilastirma, farkYuzde: null }} />
        )
        expect(screen.queryByText(/UCUZ|PAHALI/)).toBeNull()
        expect(container.querySelector('[class*="karsRozet"]')).toBeNull()
    })

    it('sonuc yoksa rakam yerine tire basar, sifir DEGIL', () => {
        render(<SonucKarti {...BASE} minDaireFiyati={null} birimFiyat={null} />)
        expect(screen.queryByText('0')).toBeNull()
        // Iki alan da nullendi; ikisinin DE tire basmasi gerekir. `> 0`
        // kontrolu birinin sessizce regresyona ugramasini kacirirdi.
        expect(screen.getAllByText('—')).toHaveLength(2)
    })

    it('fis butonu onFisAc i cagirir', async () => {
        const onFisAc = jest.fn()
        render(<SonucKarti {...BASE} onFisAc={onFisAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Hesap fişi/ }))
        expect(onFisAc).toHaveBeenCalledTimes(1)
    })

    it('Analiz satiri onAnalizAc i cagirir', async () => {
        const onAnalizAc = jest.fn()
        render(<SonucKarti {...BASE} onAnalizAc={onAnalizAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Analiz/ }))
        expect(onAnalizAc).toHaveBeenCalledTimes(1)
    })

    it('karsilastirma blogu kart icinde render edilir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByLabelText(/Yaklaşık piyasa fiyatı/)).toBeInTheDocument()
    })
})
