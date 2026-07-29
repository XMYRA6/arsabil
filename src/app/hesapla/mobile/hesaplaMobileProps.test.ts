import { piyasaFarkiYuzdesi, sonucDegeri } from './hesaplaMobileProps'

describe('sonucDegeri', () => {
    it('ondalikli motor ciktisini tam sayiya yuvarlar', () => {
        // engine_v2 `FD_total = M * K` uretir; neredeyse hicbir zaman tam sayi
        // degildir. Yuvarlanmazsa kart "8.964.000,371" yazar.
        expect(sonucDegeri(8963999.6)).toBe(8964000)
        expect(sonucDegeri(64028.153)).toBe(64028)
    })

    it('null ve undefined icin null doner', () => {
        expect(sonucDegeri(null)).toBeNull()
        expect(sonucDegeri(undefined)).toBeNull()
    })

    it('sifiri null sayar - kartta "0" DEGIL "—" gosterilmeli', () => {
        // `FD_per_m2`, daire alani 0 iken motorda 0 doner (engine_v2.ts:93).
        // 0 burada "sonuc yok" demektir; "0 TL/m²" yanlis bir iddiadir.
        expect(sonucDegeri(0)).toBeNull()
        expect(sonucDegeri(0.4)).toBeNull() // yuvarlanınca 0
    })

    it('sonlu olmayan degerleri null sayar', () => {
        expect(sonucDegeri(Number.NaN)).toBeNull()
        expect(sonucDegeri(Number.POSITIVE_INFINITY)).toBeNull()
    })
})

describe('piyasaFarkiYuzdesi', () => {
    it('piyasadan ucuzsa negatif yuzde doner', () => {
        expect(piyasaFarkiYuzdesi(8_600_000, 10_000_000)).toBe(-14)
    })

    it('piyasadan pahaliysa pozitif yuzde doner', () => {
        expect(piyasaFarkiYuzdesi(10_900_000, 10_000_000)).toBe(9)
    })

    it('BERABERLIKTE rozet gosterilmez (null)', () => {
        // "%0 PAHALI" para hakkinda yanlis bir iddiadir. Mevcut masaustu
        // davranisi da (HesapOzetiSeridi.tsx:28-29) kesin esitsizlik kullanir.
        expect(piyasaFarkiYuzdesi(10_000_000, 10_000_000)).toBeNull()
    })

    it('yuvarlanınca sifira dusen KUCUK farklarda da rozet gosterilmez', () => {
        // Math.round(-0.4) === -0 ve `-0 < 0` FALSE'tur; naif bir guard bunu
        // kacirir ve kart hafif ucuz bir parseli "%0 PAHALI" ilan eder.
        expect(piyasaFarkiYuzdesi(9_960_000, 10_000_000)).toBeNull()
        expect(piyasaFarkiYuzdesi(10_040_000, 10_000_000)).toBeNull()
    })

    it('piyasa fiyati girilmemisse null doner', () => {
        expect(piyasaFarkiYuzdesi(8_600_000, 0)).toBeNull()
        expect(piyasaFarkiYuzdesi(8_600_000, Number.NaN)).toBeNull()
    })

    it('sonuc yoksa null doner', () => {
        expect(piyasaFarkiYuzdesi(null, 10_000_000)).toBeNull()
        expect(piyasaFarkiYuzdesi(undefined, 10_000_000)).toBeNull()
    })
})
