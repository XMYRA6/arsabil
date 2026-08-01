import { dogrulaIlceFiyatlari } from '../validate'
import { ILCE_FIYATLARI } from '../data'

const GECERLI = { il: 'İstanbul', ilce: 'Kadıköy', avgSalesPricePerM2: 118000, avgUnitConstructionPrice: 24500 }

describe('dogrulaIlceFiyatlari', () => {
    it('gecerli kayitta hata dondurmez', () => {
        expect(dogrulaIlceFiyatlari([GECERLI])).toEqual([])
    })

    it('bos dizi gecerlidir (veri henuz girilmemis olabilir)', () => {
        expect(dogrulaIlceFiyatlari([])).toEqual([])
    })

    it('ayni il/ilce cifti iki kez varsa hata verir', () => {
        const hatalar = dogrulaIlceFiyatlari([GECERLI, { ...GECERLI }])
        expect(hatalar).toHaveLength(1)
        expect(hatalar[0].indeks).toBe(1)
        expect(hatalar[0].mesaj).toMatch(/tekrar/i)
    })

    it('farkli ildeki ayni ilce adi hata DEGILDIR', () => {
        expect(dogrulaIlceFiyatlari([
            { ...GECERLI, il: 'Şanlıurfa', ilce: 'Merkez' },
            { ...GECERLI, il: 'Iğdır', ilce: 'Merkez' },
        ])).toEqual([])
    })

    it('sifir veya negatif fiyat hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgSalesPricePerM2: 0 }])).toHaveLength(1)
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgUnitConstructionPrice: -5 }])).toHaveLength(1)
    })

    it('sonlu olmayan fiyat hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, avgSalesPricePerM2: NaN }])).toHaveLength(1)
    })

    it('bos veya bosluklu isim hata verir', () => {
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, ilce: '' }])).toHaveLength(1)
        expect(dogrulaIlceFiyatlari([{ ...GECERLI, il: ' İstanbul' }])).toHaveLength(1)
    })
})

// Bu test, bozuk verinin commit'lenmesini engeller: veri dosyasi
// buyudukce (900+ ilce) elle gozden gecirmek imkansizlasir.
describe('ILCE_FIYATLARI veri dosyasi', () => {
    it('dogrulamadan gecer', () => {
        expect(dogrulaIlceFiyatlari(ILCE_FIYATLARI)).toEqual([])
    })
})
