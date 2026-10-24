import { guvenDuzeyi, emsalAlt, degisimAlt } from './areaSeoParts'

describe('areaSeoParts şeffaflık yardımcıları', () => {
    it('güven düzeyi emsal sayısından türer', () => {
        expect(guvenDuzeyi(5)).toBe('düşük')
        expect(guvenDuzeyi(10)).toBe('orta')
        expect(guvenDuzeyi(29)).toBe('orta')
        expect(guvenDuzeyi(30)).toBe('yüksek')
    })

    it('emsalAlt sayı ve güveni birlikte yazar', () => {
        expect(emsalAlt(8)).toBe('8 emsal · güven düşük')
        expect(emsalAlt(842, 'İl medyanı')).toBe('İl medyanı · 842 emsal · güven yüksek')
    })

    it('değişim kapsamı mahalle yetmeyince ilçe/il olarak etiketlenir', () => {
        const base = { points: [], changePct3m: 21.2, thinTrend: false }
        expect(degisimAlt({ ...base, basis: 'mahalle' })).toBe('Mahalle verisi')
        expect(degisimAlt({ ...base, basis: 'ilce' })).toBe('İlçe geneli verisi')
        expect(degisimAlt({ ...base, basis: 'il', thinTrend: true })).toBe('İl geneli verisi · az örnek')
        expect(degisimAlt(undefined)).toBeUndefined()
    })
})
