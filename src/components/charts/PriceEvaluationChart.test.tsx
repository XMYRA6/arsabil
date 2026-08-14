/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { PriceEvaluationChart } from './PriceEvaluationChart'

// Piyasa fiyati artik Gelismis Ayarlar'dan degil, bu kartin bos-durumundan
// (tikla -> yaz -> Enter) girilebiliyor (2026-08-14 UX karari, bkz. masaustu
// girdi sirasi denetimini takip eden brainstorming). Testler bu yuzden
// kontrollu (manualMarketPrice/onManualMarketPriceChange)
// bir bilesen gibi davraniyor: gercek deger degisikligi ebeveyne bildirilir,
// bilesen kendi taslak metnini duzenleme sirasinda yerel tutar.
function setup(props: Partial<ComponentProps<typeof PriceEvaluationChart>> = {}) {
    const onManualMarketPriceChange = jest.fn()
    const utils = render(
        <PriceEvaluationChart
            minPrice={1_000_000}
            marketPrice={0}
            manualMarketPrice=""
            onManualMarketPriceChange={onManualMarketPriceChange}
            {...props}
        />
    )
    return { ...utils, onManualMarketPriceChange }
}

describe('PriceEvaluationChart', () => {
    it('DENETIM C2 REGRESYONU: minPrice < marketPrice (proje piyasaya gore ucuza mal oluyor) "Ucuz/Firsat" gostermeli, "Pahali" DEGIL', () => {
        // Onceki hatali formul ((market-min)/min) bunu YANLISLIKLA "Pahali"
        // (+%30) gosteriyordu — ayni anda mobil kart AYNI veriyi "UCUZ"
        // (piyasaFarkiYuzdesi(1_000_000, 1_300_000) === -23) diye etiketliyordu.
        setup({ minPrice: 1_000_000, marketPrice: 1_300_000 })
        expect(screen.getByText('Fırsat / Ucuz')).toBeInTheDocument()
        expect(screen.queryByText('Pahalı')).toBeNull()
        expect(screen.getByText('-23.1%')).toBeInTheDocument()
    })

    it('DENETIM C2 REGRESYONU: minPrice > marketPrice (proje piyasadan pahaliya mal oluyor) "Pahali" gostermeli', () => {
        setup({ minPrice: 1_300_000, marketPrice: 1_000_000 })
        expect(screen.getByText('Pahalı')).toBeInTheDocument()
        expect(screen.getByText('+30.0%')).toBeInTheDocument()
    })

    it('mobil karttaki AYNI iki deger icin (8.6M/10M) desktop da UCUZ gostermeli — iki yuzey artik ayni yonde', () => {
        // hesaplaMobileProps.test.ts: piyasaFarkiYuzdesi(8_600_000, 10_000_000) === -14 (UCUZ)
        setup({ minPrice: 8_600_000, marketPrice: 10_000_000 })
        expect(screen.getByText('Fırsat / Ucuz')).toBeInTheDocument()
    })

    it('piyasa fiyati girilmemisse davet karti gosterir, eski sabit uyari metnini DEGIL', () => {
        setup({ minPrice: 1_000_000, marketPrice: 0 })
        expect(screen.queryByText('Piyasa Fiyatı Girilmedi')).toBeNull()
        expect(screen.getByRole('button', { name: /Piyasa Fiyatını Gir/i })).toBeInTheDocument()
    })

    it('davet kartina tiklayinca yerinde bir input acilir ve otomatik odaklanir', async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole('button', { name: /Piyasa Fiyatını Gir/i }))
        const input = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        expect(input).toBeInTheDocument()
        expect(input).toHaveFocus()
    })

    it('input\'a yazip Enter\'a basinca degeri ebeveyne bildirir (binlik ayiracli)', async () => {
        const user = userEvent.setup()
        const { onManualMarketPriceChange } = setup()
        await user.click(screen.getByRole('button', { name: /Piyasa Fiyatını Gir/i }))
        const input = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        await user.type(input, '6000000')
        await user.keyboard('{Enter}')
        expect(onManualMarketPriceChange).toHaveBeenLastCalledWith('6.000.000')
    })

    it('bos input ile disari tiklayinca (blur) davet kartina geri doner, ebeveyne bos deger bildirmez', async () => {
        const user = userEvent.setup()
        const { onManualMarketPriceChange } = setup()
        await user.click(screen.getByRole('button', { name: /Piyasa Fiyatını Gir/i }))
        const input = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        await user.click(input)
        await user.tab()
        expect(onManualMarketPriceChange).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: /Piyasa Fiyatını Gir/i })).toBeInTheDocument()
    })

    it('piyasa fiyati zaten girilmisse grafigin yaninda "Degistir" ile tekrar duzenlenebilir', async () => {
        const user = userEvent.setup()
        const { onManualMarketPriceChange } = setup({ marketPrice: 6_000_000, manualMarketPrice: '6.000.000' })
        expect(screen.getByText('Fırsat / Ucuz')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Değiştir' }))
        const input = screen.getByRole('textbox', { name: 'Yaklaşık Piyasa Fiyatı' })
        expect(input).toHaveValue('6.000.000')
        await user.clear(input)
        await user.type(input, '7000000')
        await user.keyboard('{Enter}')
        expect(onManualMarketPriceChange).toHaveBeenLastCalledWith('7.000.000')
    })
})
