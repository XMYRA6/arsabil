/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KonumBlogu } from './KonumBlogu'

const FIYATLAR = [
    { id: '1', il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 41000, avgUnitConstructionPrice: 12000 },
    { id: '2', il: 'İstanbul', ilce: 'Beşiktaş', avgSalesPricePerM2: 62000, avgUnitConstructionPrice: 14000 },
]

function props(patch: Partial<React.ComponentProps<typeof KonumBlogu>> = {}) {
    return {
        districtPrices: FIYATLAR,
        selectedIl: 'İstanbul', selectedIlce: 'Kadıköy',
        onIlChange: jest.fn(), onIlceChange: jest.fn(), onClear: jest.fn(),
        birimMaliyet: 12000,
        birimMaliyetKaynagi: { tur: 'ilce' as const, ilce: 'Kadıköy' },
        onBirimMaliyet: jest.fn(),
        parselIsaretli: false, onParselAc: jest.fn(),
        ...patch,
    }
}

describe('KonumBlogu', () => {
    it('birim maliyeti ve KAYNAGINI gosterir', () => {
        render(<KonumBlogu {...props()} />)
        expect(screen.getByText(/Kadıköy ortalaması 12\.000 TL\/m²/)).toBeInTheDocument()
    })

    it('elle girilen deger kaynak etiketinde belirtilir', () => {
        render(<KonumBlogu {...props({ birimMaliyet: 14500, birimMaliyetKaynagi: { tur: 'elle' } })} />)
        expect(screen.getByText(/Elle girildi · 14\.500 TL\/m²/)).toBeInTheDocument()
    })

    it('degistir butonu birim maliyet girisini acar', async () => {
        render(<KonumBlogu {...props()} />)
        expect(screen.queryByRole('spinbutton', { name: /Birim inşaat maliyeti/ })).toBeNull()
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        expect(screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })).toBeInTheDocument()
    })

    it('girilen deger onBirimMaliyet ile bildirilir', async () => {
        const onBirimMaliyet = jest.fn()
        render(<KonumBlogu {...props({ onBirimMaliyet })} />)
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        const alan = screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })
        await userEvent.clear(alan)
        await userEvent.type(alan, '14500')
        await userEvent.tab()
        expect(onBirimMaliyet).toHaveBeenLastCalledWith(14500)
    })

    it('gecersiz giris bildirilmez', async () => {
        const onBirimMaliyet = jest.fn()
        render(<KonumBlogu {...props({ onBirimMaliyet })} />)
        await userEvent.click(screen.getByRole('button', { name: /Birim maliyeti değiştir/ }))
        const alan = screen.getByRole('spinbutton', { name: /Birim inşaat maliyeti/ })
        await userEvent.clear(alan)
        await userEvent.tab()
        expect(onBirimMaliyet).not.toHaveBeenCalled()
    })

    it('parsel kademesi ISTEGE BAGLI oldugunu soyler ve tetikler', async () => {
        const onParselAc = jest.fn()
        render(<KonumBlogu {...props({ onParselAc })} />)
        const btn = screen.getByRole('button', { name: /Parseli haritadan işaretle/ })
        expect(btn).toHaveTextContent(/isteğe bağlı/i)
        await userEvent.click(btn)
        expect(onParselAc).toHaveBeenCalledTimes(1)
    })

    it('parsel isaretliyse durumu bildirir', () => {
        render(<KonumBlogu {...props({ parselIsaretli: true })} />)
        expect(screen.getByText(/Parsel işaretli/)).toBeInTheDocument()
    })

    it('ilce fiyat verisi yoksa secici yerine aciklama gosterir', () => {
        // districtPrices bos gelebilir (yonetici hic ilce fiyati girmemis).
        // Secici bos bir dropdown olarak durmamali.
        render(<KonumBlogu {...props({ districtPrices: [], selectedIl: '', selectedIlce: '' })} />)
        expect(screen.getByText(/İlçe fiyat verisi henüz yok/)).toBeInTheDocument()
    })
})
