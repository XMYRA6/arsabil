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
    onSonucDetayiAc: jest.fn(),
    onStudioHubAc: jest.fn(),
    onLandownerOfferAc: jest.fn(),
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

    it('Sonuc Detayi satiri onSonucDetayiAc i cagirir', async () => {
        const onSonucDetayiAc = jest.fn()
        render(<SonucKarti {...BASE} onSonucDetayiAc={onSonucDetayiAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Sonuç Detayı/ }))
        expect(onSonucDetayiAc).toHaveBeenCalledTimes(1)
    })

    it('Tasarim Studyosu satiri onStudioHubAc i cagirir', async () => {
        const onStudioHubAc = jest.fn()
        render(<SonucKarti {...BASE} onStudioHubAc={onStudioHubAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Tasarım Stüdyosu/ }))
        expect(onStudioHubAc).toHaveBeenCalledTimes(1)
    })

    it('Arsa Sahibi Teklifi satiri onLandownerOfferAc i cagirir', async () => {
        const onLandownerOfferAc = jest.fn()
        render(<SonucKarti {...BASE} onLandownerOfferAc={onLandownerOfferAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Arsa Sahibi Teklifi/ }))
        expect(onLandownerOfferAc).toHaveBeenCalledTimes(1)
    })

    it('yalnizca UC buton render edilir (7 degil)', () => {
        render(<SonucKarti {...BASE} />)
        const butonlar = screen.getAllByRole('button').filter(b =>
            /Sonuç Detayı|Tasarım Stüdyosu|Arsa Sahibi Teklifi/.test(b.textContent ?? '')
        )
        expect(butonlar).toHaveLength(3)
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

    // Impeccable critique bulgusu (P0): hasEnoughDataForResult false iken
    // "Sonuç Detayı"/"Tasarım Stüdyosu"/"Arsa Sahibi Teklifi" KOSULSUZ
    // tikanabilirdi, tiklaninca tire dolu bos ekranlara aciliyordu — ilk
    // kullanici veya dikkati dagilmis saha kullanicisi icin bir cikmaz.
    it('hasEnoughDataForResult false iken uc menu butonu DEVRE DISI birakilir, tiklama HANDLER I cagirmaz', async () => {
        const onSonucDetayiAc = jest.fn()
        const onStudioHubAc = jest.fn()
        const onLandownerOfferAc = jest.fn()
        render(
            <SonucKarti
                {...BASE}
                hasEnoughDataForResult={false}
                minDaireFiyati={null}
                birimFiyat={null}
                onSonucDetayiAc={onSonucDetayiAc}
                onStudioHubAc={onStudioHubAc}
                onLandownerOfferAc={onLandownerOfferAc}
            />
        )
        const sonucDetayi = screen.getByRole('button', { name: /Sonuç Detayı/ })
        const studioHub = screen.getByRole('button', { name: /Tasarım Stüdyosu/ })
        const landownerOffer = screen.getByRole('button', { name: /Arsa Sahibi Teklifi/ })
        expect(sonucDetayi).toBeDisabled()
        expect(studioHub).toBeDisabled()
        expect(landownerOffer).toBeDisabled()

        // disabled bir native <button>'a userEvent.click POINTER_EVENTS_NONE
        // yuzunden hata firlatir — dogrudan click() DOM API'siyle handler'in
        // gercekten cagrilmadigini dogruluyoruz (React disabled butonlarda
        // onClick'i native olarak engeller).
        sonucDetayi.click()
        studioHub.click()
        landownerOffer.click()
        expect(onSonucDetayiAc).not.toHaveBeenCalled()
        expect(onStudioHubAc).not.toHaveBeenCalled()
        expect(onLandownerOfferAc).not.toHaveBeenCalled()

        expect(screen.getByText(/Bu bölümleri görmek için önce/)).toBeInTheDocument()
    })

    it('hasEnoughDataForResult true iken uc menu butonu ETKIN dir, ipucu metni gorunmez', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByRole('button', { name: /Sonuç Detayı/ })).toBeEnabled()
        expect(screen.getByRole('button', { name: /Tasarım Stüdyosu/ })).toBeEnabled()
        expect(screen.getByRole('button', { name: /Arsa Sahibi Teklifi/ })).toBeEnabled()
        expect(screen.queryByText(/Bu bölümleri görmek için önce/)).toBeNull()
    })
})
