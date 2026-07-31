import { ilceSecildi, kaynakEtiketi, konumTemizlendi, metrekareDegisti } from './unitPriceSource'

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

    // Canli dogrulamada bulundu (Task 10): "Konumu temizle" birim maliyeti
    // geri getiriyordu ama piyasa fiyatini eski ilcenin degerinde birakiyordu
    // — ilce ikisini birden doldurduguna gore (spec 4), temizleme de ikisini
    // birden geri almali.
    it('piyasa fiyatini da verilen orijinal degere geri getirir', () => {
        const r = konumTemizlendi(11000, '5.740.000')
        expect(r.piyasaFiyati).toBe('5.740.000')
    })

    it('orijinal piyasa fiyati verilmezse bos doner (varsayilan hic girilmemisti)', () => {
        const r = konumTemizlendi(11000)
        expect(r.piyasaFiyati).toBe('')
    })
})

// Whole-branch review I2: `page.tsx`teki effect, ilce seciliyken `apartmentSize`
// degisince piyasa fiyatini KOSULSUZ yeniden hesapliyordu — elle yazilmis bir
// toplami sessizce eziyordu. Ilce secimi (`ilceSecildi`) ezmeye DEVAM eder ve
// bunu toast'la soyler; metrekare degisimi bir konum eylemi degildir, o yuzden
// elle girilmis degeri korur.
describe('metrekareDegisti', () => {
    it('ilce degeri geceliyken yeni metrekareye gore piyasa fiyatini yeniden hesaplar', () => {
        expect(metrekareDegisti(KADIKOY, 140, false)).toBe('5.740.000') // 41000 * 140
    })

    it('metrekare degisince sonuc gercekten degisir', () => {
        expect(metrekareDegisti(KADIKOY, 100, false)).toBe('4.100.000')
    })

    it('elle girilmis piyasa fiyatini EZMEZ', () => {
        expect(metrekareDegisti(KADIKOY, 140, true)).toBeNull()
    })

    it('ilce girdisi yoksa hicbir sey yapmaz', () => {
        expect(metrekareDegisti(undefined, 140, false)).toBeNull()
    })

    it('Turkce bicimde ve tam sayi doner', () => {
        expect(metrekareDegisti({ ...KADIKOY, avgSalesPricePerM2: 41333.4 }, 140, false))
            .toBe('5.786.676')
    })
})
