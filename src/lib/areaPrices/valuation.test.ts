import { valuateParcel, type StatLike } from './valuation'

const stat = (over: Partial<StatLike>): StatLike => ({
  medianPricePerSqm: 1000,
  p25: 800,
  p75: 1200,
  sampleCount: 10,
  ...over,
})

describe('valuateParcel', () => {
  it('mahalle 8+ örneklem → basis mahalle, güven yüksek', () => {
    const r = valuateParcel({
      areaSqm: 500,
      mahalle: stat({ medianPricePerSqm: 2000, p25: 1800, p75: 2400, sampleCount: 12 }),
      ilce: stat({ sampleCount: 40 }),
      il: stat({ sampleCount: 200 }),
    })
    expect(r.insufficientData).toBe(false)
    expect(r.basis).toBe('mahalle')
    expect(r.confidence).toBe('yuksek')
    expect(r.estimate).toBe(1_000_000) // 2000 * 500
    expect(r.freeRangeLow).toBe(750_000) // 2000*0.75*500
    expect(r.freeRangeHigh).toBe(1_250_000)
    expect(r.memberRangeLow).toBe(900_000) // 1800*500
    expect(r.memberRangeHigh).toBe(1_200_000)
    expect(r.pricePerSqmCoarse).toBe(2000)
    expect(r.thinData).toBe(false)
  })

  it('mahalle < 8 ama ilçe ≥ 5 → basis ilçe, güven orta, mahalle ₺/m² yine döndürülür', () => {
    const r = valuateParcel({
      areaSqm: 100,
      mahalle: stat({ medianPricePerSqm: 3000, sampleCount: 6 }),
      ilce: stat({ medianPricePerSqm: 2500, sampleCount: 20 }),
      il: stat({ sampleCount: 500 }),
    })
    expect(r.basis).toBe('ilce')
    expect(r.confidence).toBe('orta')
    expect(r.pricePerSqm).toEqual({ mahalle: 3000, ilce: 2500 })
    expect(r.sampleCount).toEqual({ mahalle: 6, ilce: 20 })
    expect(r.estimate).toBe(250_000)
  })

  it('yalnızca il → basis il, güven düşük, thinData true', () => {
    const r = valuateParcel({ areaSqm: 100, il: stat({ medianPricePerSqm: 1500, sampleCount: 300 }) })
    expect(r.basis).toBe('il')
    expect(r.confidence).toBe('dusuk')
    expect(r.thinData).toBe(true)
  })

  it('hiç veri yok → insufficientData', () => {
    const r = valuateParcel({ areaSqm: 100 })
    expect(r.insufficientData).toBe(true)
    expect(r.estimate).toBeUndefined()
  })

  it('areaSqm null veya 0 → insufficientData', () => {
    expect(valuateParcel({ areaSqm: null, mahalle: stat({ sampleCount: 20 }) }).insufficientData).toBe(true)
    expect(valuateParcel({ areaSqm: 0, mahalle: stat({ sampleCount: 20 }) }).insufficientData).toBe(true)
  })

  it('basis örneklem < 10 → thinData true (basis mahalle olsa bile)', () => {
    const r = valuateParcel({ areaSqm: 100, mahalle: stat({ sampleCount: 9 }) })
    expect(r.basis).toBe('mahalle')
    expect(r.thinData).toBe(true)
  })

  it('medianPricePerSqm 0/negatif olan seviye yok sayılır', () => {
    const r = valuateParcel({
      areaSqm: 100,
      mahalle: stat({ medianPricePerSqm: 0, sampleCount: 50 }),
      ilce: stat({ medianPricePerSqm: 2000, sampleCount: 50 }),
    })
    expect(r.basis).toBe('ilce')
  })

  it('pricePerSqmCoarse en yakın 100e yuvarlanır', () => {
    const r = valuateParcel({ areaSqm: 100, mahalle: stat({ medianPricePerSqm: 3748, sampleCount: 20 }) })
    expect(r.pricePerSqmCoarse).toBe(3700)
  })
})
