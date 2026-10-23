/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucKarti, type SonucKartiProps } from './SonucKarti'

function props(patch: Partial<SonucKartiProps> = {}): SonucKartiProps {
    return {
        minDaireFiyati: 7530000,
        arsaPayiYuzde: 46,
        maksPayOrani: 0.482,
        daireSayisi: 18,
        piyasaFiyati: 7900000,
        farkYuzde: -5,
        hasEnoughDataForResult: true,
        isDemoData: false,
        onOrnekProjeIleDene: jest.fn(),
        onPiyasaEkle: jest.fn(),
        ...patch,
    }
}

describe('SonucKarti', () => {
    it('min. daire fiyatini binlik ayiracla ve ₺ ile gosterir', () => {
        render(<SonucKarti {...props()} />)
        expect(screen.getByText('7.530.000')).toBeInTheDocument()
        expect(screen.getByText('₺')).toBeInTheDocument()
    })

    it('ondalikli motor ciktisini tam sayiya yuvarlar', () => {
        render(<SonucKarti {...props({ minDaireFiyati: 8964000.371 })} />)
        expect(screen.getByText('8.964.000')).toBeInTheDocument()
        expect(screen.queryByText(/371/)).toBeNull()
    })

    it('uc metrik: arsa payi, maks. pay (tek ondalik), daire', () => {
        render(<SonucKarti {...props()} />)
        expect(screen.getByText('%46')).toBeInTheDocument()
        expect(screen.getByText('%48,2')).toBeInTheDocument()
        expect(screen.getByText('18')).toBeInTheDocument()
    })

    it('maks. pay ve daire bilinmiyorsa tire gosterir (0 DEGIL)', () => {
        render(<SonucKarti {...props({ maksPayOrani: null, daireSayisi: null })} />)
        expect(screen.getAllByText('—')).toHaveLength(2)
    })

    it('negatif maks. pay (proje mumkun degil) tire gosterir', () => {
        render(<SonucKarti {...props({ maksPayOrani: -0.1 })} />)
        expect(screen.queryByText(/%-/)).toBeNull()
    })

    it('piyasanin altindaysa yesil "altinda" rozeti ve piyasa fiyati', () => {
        render(<SonucKarti {...props({ farkYuzde: -5 })} />)
        expect(screen.getByText('Piyasanın %5 altında')).toBeInTheDocument()
        expect(screen.getByText('7.900.000 ₺')).toBeInTheDocument()
    })

    it('piyasanin ustundeyse "ustunde" rozeti', () => {
        render(<SonucKarti {...props({ farkYuzde: 8 })} />)
        expect(screen.getByText('Piyasanın %8 üstünde')).toBeInTheDocument()
    })

    it('piyasa fiyati yoksa rozet yerine "Piyasa fiyati ekle" cikar ve sheet i acar', async () => {
        const onPiyasaEkle = jest.fn()
        render(<SonucKarti {...props({ farkYuzde: null, piyasaFiyati: null, onPiyasaEkle })} />)
        expect(screen.queryByText(/Piyasanın/)).toBeNull()
        await userEvent.click(screen.getByRole('button', { name: 'Piyasa fiyatı ekle' }))
        expect(onPiyasaEkle).toHaveBeenCalledTimes(1)
    })

    it('ornek veri rozeti yalniz demo iken gorunur', () => {
        const { rerender } = render(<SonucKarti {...props({ isDemoData: true })} />)
        expect(screen.getByText('Örnek veri')).toBeInTheDocument()
        rerender(<SonucKarti {...props({ isDemoData: false })} />)
        expect(screen.queryByText('Örnek veri')).toBeNull()
    })

    it('yeterli veri yokken bos durum ve "Ornek proje ile dene" gosterilir', async () => {
        const onOrnekProjeIleDene = jest.fn()
        render(<SonucKarti {...props({ hasEnoughDataForResult: false, onOrnekProjeIleDene })} />)
        expect(screen.getByText(/Sonuçları görmek için/)).toBeInTheDocument()
        expect(screen.queryByText('Arsa payı')).toBeNull()
        await userEvent.click(screen.getByRole('button', { name: 'Örnek proje ile dene' }))
        expect(onOrnekProjeIleDene).toHaveBeenCalledTimes(1)
    })

    it('eski kisayol menuleri kartta ARTIK YOK (Hesap ozeti/Yapi kutlesi kartlarina tasindi)', () => {
        render(<SonucKarti {...props()} />)
        expect(screen.queryByText(/Sonuç Detayı/)).toBeNull()
        expect(screen.queryByText(/Tasarım Stüdyosu/)).toBeNull()
        expect(screen.queryByText(/Arsa Sahibi Teklifi/)).toBeNull()
    })
})
