/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniMap } from './MiniMap'

describe('MiniMap risk katmanlari', () => {
    it('riskLayers verilmediginde katman kontrolu gosterilmez', () => {
        render(<MiniMap lat={41} lng={29} />)
        expect(screen.queryByLabelText('Diri fay katmani')).toBeNull()
    })

    it('riskLayers true iken iki katman kontrolu gosterilir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).toBeInTheDocument()
        expect(screen.getByLabelText('Taskin katmani')).toBeInTheDocument()
    })

    it('katman kontrolleri varsayilan olarak kapalidir', () => {
        render(<MiniMap lat={41} lng={29} riskLayers />)
        expect(screen.getByLabelText('Diri fay katmani')).not.toBeChecked()
    })

    // lat/lng degisince ilk effect haritayi yok edip yeniden kurar (bkz. `[lat, lng]`
    // bagimliligi). Bu, faultRef/floodRef'in artik var olmayan bir haritaya ait
    // katman nesnelerine isaret etmesine yol acabilirdi: onceden isaretli kutu
    // sessizce yeniden eklenemez, isareti kaldirmak da artik gecerli olmayan bir
    // katman nesnesinde `map.removeLayer` cagirip patlardi. jsdom'da Leaflet
    // gercekten "boyayamadigi" icin katmanin fiilen haritaya eklenip eklenmedigini
    // dogrudan test edemiyoruz (bkz. gorev notu); asagida dogrulanabilir olan iki
    // sey test ediliyor: (1) checkbox durumu remount sonrasi tutarli kaliyor,
    // (2) remount sonrasi isareti kaldirmak hata firlatmiyor.
    it('lat/lng degisip harita yeniden kurulunca katman kontrolu tutarli kalir ve kaldirma hata vermez', () => {
        const { rerender } = render(<MiniMap lat={41} lng={29} riskLayers />)
        const faultToggle = screen.getByLabelText('Diri fay katmani')

        fireEvent.click(faultToggle)
        expect(faultToggle).toBeChecked()

        rerender(<MiniMap lat={42} lng={30} riskLayers />)

        const faultToggleAfterRemount = screen.getByLabelText('Diri fay katmani')
        expect(faultToggleAfterRemount).toBeChecked()

        expect(() => fireEvent.click(faultToggleAfterRemount)).not.toThrow()
        expect(faultToggleAfterRemount).not.toBeChecked()
    })
})
