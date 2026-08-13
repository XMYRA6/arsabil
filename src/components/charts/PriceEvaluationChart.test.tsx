/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { PriceEvaluationChart } from './PriceEvaluationChart'

describe('PriceEvaluationChart', () => {
    it('DENETIM C2 REGRESYONU: minPrice < marketPrice (proje piyasaya gore ucuza mal oluyor) "Ucuz/Firsat" gostermeli, "Pahali" DEGIL', () => {
        // Onceki hatali formul ((market-min)/min) bunu YANLISLIKLA "Pahali"
        // (+%30) gosteriyordu — ayni anda mobil kart AYNI veriyi "UCUZ"
        // (piyasaFarkiYuzdesi(1_000_000, 1_300_000) === -23) diye etiketliyordu.
        render(<PriceEvaluationChart minPrice={1_000_000} marketPrice={1_300_000} />)
        expect(screen.getByText('Fırsat / Ucuz')).toBeInTheDocument()
        expect(screen.queryByText('Pahalı')).toBeNull()
        expect(screen.getByText('-23.1%')).toBeInTheDocument()
    })

    it('DENETIM C2 REGRESYONU: minPrice > marketPrice (proje piyasadan pahaliya mal oluyor) "Pahali" gostermeli', () => {
        render(<PriceEvaluationChart minPrice={1_300_000} marketPrice={1_000_000} />)
        expect(screen.getByText('Pahalı')).toBeInTheDocument()
        expect(screen.getByText('+30.0%')).toBeInTheDocument()
    })

    it('mobil karttaki AYNI iki deger icin (8.6M/10M) desktop da UCUZ gostermeli — iki yuzey artik ayni yonde', () => {
        // hesaplaMobileProps.test.ts: piyasaFarkiYuzdesi(8_600_000, 10_000_000) === -14 (UCUZ)
        render(<PriceEvaluationChart minPrice={8_600_000} marketPrice={10_000_000} />)
        expect(screen.getByText('Fırsat / Ucuz')).toBeInTheDocument()
    })

    it('piyasa fiyati girilmemisse uyari gosterir', () => {
        render(<PriceEvaluationChart minPrice={1_000_000} marketPrice={0} />)
        expect(screen.getByText('Piyasa Fiyatı Girilmedi')).toBeInTheDocument()
    })
})
