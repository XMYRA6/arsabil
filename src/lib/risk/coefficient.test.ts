import { gammaF, suggestedR } from './coefficient'

describe('gammaF — TBDY 2018 yakin fay katsayisi', () => {
    it('15 km ve altinda 1.2 sabittir', () => {
        expect(gammaF(0)).toBeCloseTo(1.2, 5)
        expect(gammaF(1_200)).toBeCloseTo(1.2, 5)
        expect(gammaF(15_000)).toBeCloseTo(1.2, 5)   // tam sinir
    })

    it('15-25 km arasi dogrusal iner', () => {
        expect(gammaF(20_000)).toBeCloseTo(1.1, 5)
        expect(gammaF(25_000)).toBeCloseTo(1.0, 5)   // tam sinir
    })

    it('25 km ustunde 1.0', () => {
        expect(gammaF(30_000)).toBeCloseTo(1.0, 5)
    })

    it('mesafe bilinmiyorsa (isabet yok) 1.0', () => {
        expect(gammaF(null)).toBeCloseTo(1.0, 5)
    })
})

describe('suggestedR', () => {
    it('gammaF farkinin yarisini uygular ve 2 haneye yuvarlar', () => {
        expect(suggestedR(1.2, false)).toBe(1.1)
        expect(suggestedR(1.0, false)).toBe(1)
    })

    it('taskin bolgesinde ek pay ekler', () => {
        expect(suggestedR(1.2, true)).toBe(1.13)
        expect(suggestedR(1.0, true)).toBe(1.03)
    })
})
