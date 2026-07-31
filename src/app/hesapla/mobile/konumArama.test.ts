import { trNormalize, konumAra } from './konumArama'

const KAYITLAR = [
    { il: 'İstanbul', ilce: 'Kadıköy' },
    { il: 'İstanbul', ilce: 'Beşiktaş' },
    { il: 'Ankara', ilce: 'Çankaya' },
    { il: 'Şanlıurfa', ilce: 'Merkez' },
    { il: 'Iğdır', ilce: 'Merkez' },
]

describe('trNormalize', () => {
    it('Turkce harfleri ASCII karsiligina indirger', () => {
        expect(trNormalize('Kadıköy')).toBe('kadikoy')
        expect(trNormalize('Beşiktaş')).toBe('besiktas')
        expect(trNormalize('Çankaya')).toBe('cankaya')
        expect(trNormalize('Iğdır')).toBe('igdir')
    })

    // Noktali-I tuzagi: 'İ'.toLowerCase() ingilizce kurallarda 'i̇' (birlesik
    // nokta) uretir, 'I'.toLocaleLowerCase('tr') ise 'ı' uretir. Ikisi de
    // duz 'i' vermezse "istanbul" yazan kullanici Istanbul'u bulamaz.
    it('noktali ve noktasiz I harflerinin ikisini de duz i yapar', () => {
        expect(trNormalize('İstanbul')).toBe('istanbul')
        expect(trNormalize('ISTANBUL')).toBe('istanbul')
        expect(trNormalize('istanbul')).toBe('istanbul')
    })

    it('bastaki ve sondaki bosluklari atar', () => {
        expect(trNormalize('  Kadıköy  ')).toBe('kadikoy')
    })
})

describe('konumAra', () => {
    it('bos sorguda tum kayitlari doner', () => {
        const r = konumAra(KAYITLAR, '')
        expect(r.sonuclar).toHaveLength(5)
        expect(r.kesildi).toBe(false)
    })

    it('ASCII yazimla Turkce kaydi bulur', () => {
        expect(konumAra(KAYITLAR, 'kadikoy').sonuclar).toEqual([
            { il: 'İstanbul', ilce: 'Kadıköy' },
        ])
    })

    it('il adiyla arar', () => {
        expect(konumAra(KAYITLAR, 'istanbul').sonuclar).toHaveLength(2)
    })

    it('il ve ilceyi birlikte yazmaya izin verir', () => {
        expect(konumAra(KAYITLAR, 'ankara can').sonuclar).toEqual([
            { il: 'Ankara', ilce: 'Çankaya' },
        ])
    })

    // "Merkez" onlarca ilde tekrar eder; arama ikisini de dondurmeli ki
    // arayuz "Il / Ilce" olarak ayirt edebilsin.
    it('tekrar eden ilce adinda tum illeri doner', () => {
        expect(konumAra(KAYITLAR, 'merkez').sonuclar).toHaveLength(2)
    })

    it('eslesme yoksa bos doner', () => {
        expect(konumAra(KAYITLAR, 'zzz').sonuclar).toEqual([])
    })

    it('siniri asinca keser ve kesildi bayragini kaldirir', () => {
        const r = konumAra(KAYITLAR, '', 2)
        expect(r.sonuclar).toHaveLength(2)
        expect(r.kesildi).toBe(true)
    })

    it('sinir tam sayida kayitta kesildi DEMEZ', () => {
        const r = konumAra(KAYITLAR, '', 5)
        expect(r.kesildi).toBe(false)
    })
})
