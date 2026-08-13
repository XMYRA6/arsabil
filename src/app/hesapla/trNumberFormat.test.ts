import { formatTRThousands, formatTRCurrency } from './trNumberFormat'

describe('formatTRThousands', () => {
    it('bos string bos doner', () => {
        expect(formatTRThousands('')).toBe('')
    })

    it('1000 basamak-alti deger ayirac almaz', () => {
        expect(formatTRThousands('123')).toBe('123')
    })

    it('1000 uc basamakli ayiracla gosterilir', () => {
        expect(formatTRThousands('1000')).toBe('1.000')
    })

    it('12000 iki ayirac gerektirmeyen deger dogru gruplanir', () => {
        expect(formatTRThousands('12000')).toBe('12.000')
    })

    it('milyonluk deger birden fazla ayirac alir', () => {
        expect(formatTRThousands('2352000')).toBe('2.352.000')
    })

    it('zaten formatli (nokta iceren) girdi yeniden formatlaninca degismez (idempotent)', () => {
        expect(formatTRThousands('1.000')).toBe('1.000')
    })

    it('rakam disi karakterler siyrilir', () => {
        expect(formatTRThousands('12a000b')).toBe('12.000')
    })

    it('tek "0" degeri oldugu gibi kalir', () => {
        expect(formatTRThousands('0')).toBe('0')
    })
})

describe('formatTRCurrency', () => {
    it('milyonluk tutari binlik ayirac + iki ondalik + TL sembolu ile gosterir', () => {
        expect(formatTRCurrency(2352000)).toBe('2.352.000,00 ₺')
    })

    it('kucuk tutarlar da iki ondalik alir', () => {
        expect(formatTRCurrency(123)).toBe('123,00 ₺')
    })

    it('ondalikli gercek deger yuvarlanip iki basamakla gosterilir', () => {
        expect(formatTRCurrency(1234.5)).toBe('1.234,50 ₺')
    })

    it('sifir da formatlanir', () => {
        expect(formatTRCurrency(0)).toBe('0,00 ₺')
    })
})
