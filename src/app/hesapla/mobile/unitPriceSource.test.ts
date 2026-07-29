import { ilceSecildi, kaynakEtiketi, konumTemizlendi } from './unitPriceSource'

const KADIKOY = { ilce: 'Kadıköy', avgUnitConstructionPrice: 12000, avgSalesPricePerM2: 41000 }

describe('kaynakEtiketi', () => {
    it('ilceden gelen degerin kaynagini soyler', () => {
        expect(kaynakEtiketi({ tur: 'ilce', ilce: 'Kadıköy' }, 12000))
            .toBe('Kadıköy ortalaması 12.000 TL/m²')
    })

    it('elle girilen degeri boyle isaretler', () => {
        expect(kaynakEtiketi({ tur: 'elle' }, 14500)).toBe('Elle girildi · 14.500 TL/m²')
    })

    it('varsayilan degeri boyle isaretler', () => {
        expect(kaynakEtiketi({ tur: 'varsayilan' }, 12000))
            .toBe('Varsayılan 12.000 TL/m²')
    })

    it('rakamlari ondalik basmaz', () => {
        expect(kaynakEtiketi({ tur: 'elle' }, 14500.7)).toBe('Elle girildi · 14.501 TL/m²')
    })
})

describe('ilceSecildi', () => {
    it('birim maliyeti ve piyasa fiyatini birlikte doldurur', () => {
        // Spec 4: ilce secimi IKI degeri birden ayarlar.
        const r = ilceSecildi(KADIKOY, 140)
        expect(r.birimMaliyet).toBe(12000)
        expect(r.piyasaFiyati).toBe('5.740.000') // 41000 * 140
        expect(r.kaynak).toEqual({ tur: 'ilce', ilce: 'Kadıköy' })
    })

    it('piyasa fiyatini Turkce bicimde ve tam sayi olarak verir', () => {
        const r = ilceSecildi({ ...KADIKOY, avgSalesPricePerM2: 41333.4 }, 140)
        expect(r.piyasaFiyati).toBe('5.786.676')
    })
})

describe('konumTemizlendi', () => {
    it('yonetici varsayilanina doner', () => {
        const r = konumTemizlendi(11000)
        expect(r.birimMaliyet).toBe(11000)
        expect(r.kaynak).toEqual({ tur: 'varsayilan' })
    })
})
