/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SonucKarti } from './SonucKarti'

const BASE = {
    minDaireFiyati: 8964000,
    arsaPayiYuzde: 33,
    birimFiyat: 64028,
    skor: 78,
    piyasaFarkiYuzde: -14,
    onFisAc: jest.fn(),
}

describe('SonucKarti', () => {
    it('min daire fiyatini Turkce bicimde gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('8.964.000')).toBeInTheDocument()
    })

    it('arsa payi, birim fiyat ve skoru gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText('%33')).toBeInTheDocument()
        expect(screen.getByText('64.028')).toBeInTheDocument()
        expect(screen.getByText('78')).toBeInTheDocument()
    })

    it('piyasadan ucuzsa yesil rozet gosterir', () => {
        render(<SonucKarti {...BASE} />)
        expect(screen.getByText(/%14 UCUZ/)).toBeInTheDocument()
    })

    it('piyasadan pahaliysa rozet yon degistirir', () => {
        render(<SonucKarti {...BASE} piyasaFarkiYuzde={9} />)
        expect(screen.getByText(/%9 PAHALI/)).toBeInTheDocument()
    })

    it('piyasa farki yoksa rozet HIC render edilmez', () => {
        // Mevcut SealBadge `show` kosuluyla ayni: piyasa fiyati bos ise
        // karsilastirma iddiasi edilmez.
        render(<SonucKarti {...BASE} piyasaFarkiYuzde={null} />)
        expect(screen.queryByText(/UCUZ|PAHALI/)).toBeNull()
    })

    it('sonuc yoksa rakam yerine tire basar, sifir DEGIL', () => {
        render(<SonucKarti {...BASE} minDaireFiyati={null} birimFiyat={null} skor={null} />)
        expect(screen.queryByText('0')).toBeNull()
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    it('fis butonu onFisAc i cagirir', async () => {
        const onFisAc = jest.fn()
        render(<SonucKarti {...BASE} onFisAc={onFisAc} />)
        await userEvent.click(screen.getByRole('button', { name: /Hesap fişi/ }))
        expect(onFisAc).toHaveBeenCalledTimes(1)
    })
})
