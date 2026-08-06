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
    hasEnoughDataForResult: true,
    isDemoData: false,
    onOrnekProjeIleDene: jest.fn(),
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

    it('hasEnoughDataForResult false iken fiyat yerine davet metni ve buton gosterir', () => {
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} />)
        expect(screen.getByText(/Sonuçları görmek için/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Örnek Proje ile Dene/ })).toBeInTheDocument()
        expect(screen.queryByText('Min. daire fiyatı')).not.toBeInTheDocument()
    })

    it('hasEnoughDataForResult false iken metrikler ve karsilastirma blogu gizlenir', () => {
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} />)
        expect(screen.queryByText('Arsa payı')).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/Yaklaşık piyasa fiyatı/)).not.toBeInTheDocument()
    })

    it('Örnek Proje ile Dene tiklaninca onOrnekProjeIleDene cagirilir', async () => {
        const onOrnekProjeIleDene = jest.fn()
        render(<SonucKarti {...BASE} hasEnoughDataForResult={false} minDaireFiyati={null} birimFiyat={null} onOrnekProjeIleDene={onOrnekProjeIleDene} />)
        await userEvent.click(screen.getByRole('button', { name: /Örnek Proje ile Dene/ }))
        expect(onOrnekProjeIleDene).toHaveBeenCalledTimes(1)
    })

    it('hasEnoughDataForResult true iken buton ve davet metni gorunmez', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.queryByRole('button', { name: /Örnek Proje ile Dene/ })).toBeNull()
        expect(screen.queryByText(/Sonuçları görmek için/)).toBeNull()
    })

    it('isDemoData true iken Örnek Veri rozeti gorunur', () => {
        render(<SonucKarti {...BASE} isDemoData={true} />)
        expect(screen.getByText('Örnek Veri')).toBeInTheDocument()
    })

    it('isDemoData false iken Örnek Veri rozeti gorunmez', () => {
        render(<SonucKarti {...BASE} isDemoData={false} />)
        expect(screen.queryByText('Örnek Veri')).toBeNull()
    })
})
