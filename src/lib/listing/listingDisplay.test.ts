import { formatParcelIdentity, formatAreaCells, formatZoningLabel } from './listingDisplay'

describe('formatParcelIdentity', () => {
    it('ada/parsel/mahalle varsa okunur bir satır üretir', () => {
        expect(formatParcelIdentity({ adaNo: '0', parselNo: '1871', neighborhood: 'Kirkkepenekli' }))
            .toBe('Ada 0 · Parsel 1871 · Kirkkepenekli')
    })

    it('mahalle yoksa onu atlar', () => {
        expect(formatParcelIdentity({ adaNo: '12', parselNo: '5', neighborhood: null }))
            .toBe('Ada 12 · Parsel 5')
    })

    it('ada numarası boş string ise Ada parçası hiç yazılmaz (canlıda görülen TKGM davranışı)', () => {
        expect(formatParcelIdentity({ adaNo: '', parselNo: '1689', neighborhood: 'Kalaba' }))
            .toBe('Parsel 1689 · Kalaba')
    })

    it('ada numarası null ise de Ada parçası yazılmaz', () => {
        expect(formatParcelIdentity({ adaNo: null, parselNo: '1689', neighborhood: null }))
            .toBe('Parsel 1689')
    })

    it('ada numarası "0" ise gösterilir — geçerli bir ada numarasıdır', () => {
        expect(formatParcelIdentity({ adaNo: '0', parselNo: '1871', neighborhood: null }))
            .toBe('Ada 0 · Parsel 1871')
    })

    it('parsel numarası yoksa null döner', () => {
        expect(formatParcelIdentity({ adaNo: '0', parselNo: null, neighborhood: 'X' })).toBeNull()
    })

    it('hiç veri yoksa null döner', () => {
        expect(formatParcelIdentity({})).toBeNull()
    })
})

describe('formatAreaCells', () => {
    it('beyan yoksa tire gösterir — sabit 820 mock değeri ASLA görünmemeli', () => {
        const r = formatAreaCells({ landSizeSqm: null, parcelAreaSqm: null })
        expect(r.declared).toBe('—')
        expect(r.official).toBeNull()
        expect(r.warning).toBeNull()
    })

    it('beyanı Türkçe biçimde gösterir', () => {
        expect(formatAreaCells({ landSizeSqm: 1240, parcelAreaSqm: null }).declared).toBe('1.240 m²')
    })

    it('resmi alanı ayrı hücre olarak döner', () => {
        expect(formatAreaCells({ landSizeSqm: 830, parcelAreaSqm: 830 }).official).toBe('830 m²')
    })

    it('%5 altı farkta uyarı vermez', () => {
        expect(formatAreaCells({ landSizeSqm: 840, parcelAreaSqm: 830 }).warning).toBeNull()
    })

    it('%5 üstü farkta uyarı metni döner', () => {
        const r = formatAreaCells({ landSizeSqm: 1240, parcelAreaSqm: 830 })
        expect(r.warning).toMatch(/%49,4/)
    })

    it('uyarı metni suçlayıcı değil — hisseli tapuda farkın normal olabileceğini söyler', () => {
        const r = formatAreaCells({ landSizeSqm: 1240, parcelAreaSqm: 830 })
        expect(r.warning).toMatch(/[Hh]isseli/)
    })
})

describe('formatZoningLabel', () => {
    it('null/undefined ise "—" döner (uydurma değer YAZILMAZ)', () => {
        expect(formatZoningLabel(null)).toBe('—')
        expect(formatZoningLabel(undefined)).toBe('—')
    })

    it('bilinen enum değerlerini Türkçe etikete çevirir', () => {
        expect(formatZoningLabel('KONUT')).toBe('Konut')
        expect(formatZoningLabel('TICARI')).toBe('Ticari')
        expect(formatZoningLabel('KARMA')).toBe('Karma')
        expect(formatZoningLabel('TARIM')).toBe('Tarım')
    })

    it('bilinmeyen bir değer gelirse olduğu gibi gösterir (veri kaybı yok)', () => {
        expect(formatZoningLabel('BESKE_DEGER')).toBe('BESKE_DEGER')
    })
})
