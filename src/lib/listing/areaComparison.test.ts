import { compareArea } from './areaComparison'

describe('compareArea', () => {
    it('birebir aynı alan → match', () => {
        expect(compareArea(830, 830)).toEqual({ status: 'match', diffPct: 0 })
    })

    it('%1 altı fark → match', () => {
        const r = compareArea(834, 830)
        expect(r.status).toBe('match')
        expect(r.diffPct).toBeCloseTo(0.4819, 3)
    })

    it('%1 ile %5 arası fark → minor', () => {
        const r = compareArea(855, 830)
        expect(r.status).toBe('minor')
        expect(r.diffPct).toBeCloseTo(3.012, 2)
    })

    it('tam %5 fark → mismatch (eşik dahil)', () => {
        expect(compareArea(1050, 1000).status).toBe('mismatch')
    })

    it('%5 üstü fark → mismatch', () => {
        const r = compareArea(830, 1240)
        expect(r.status).toBe('mismatch')
        expect(r.diffPct).toBeCloseTo(33.06, 1)
    })

    it('beyan resmi alandan küçük de olsa mutlak fark alınır', () => {
        expect(compareArea(1240, 830).status).toBe('mismatch')
    })

    it('beyan yoksa → unknown', () => {
        expect(compareArea(null, 830)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('resmi alan yoksa → unknown', () => {
        expect(compareArea(830, null)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('resmi alan sıfırsa → unknown (sıfıra bölme)', () => {
        expect(compareArea(830, 0)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('undefined girdiler → unknown', () => {
        expect(compareArea(undefined, undefined)).toEqual({ status: 'unknown', diffPct: null })
    })

    it('NaN girdiler → unknown', () => {
        expect(compareArea(NaN, 830)).toEqual({ status: 'unknown', diffPct: null })
    })
})
