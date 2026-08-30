import { priceTrend, type TrendRow } from './priceTrend'

const NOW = new Date('2026-08-15T00:00:00Z')
const bucket = (ym: string) => new Date(`${ym}-01T00:00:00Z`)

function r(over: Partial<TrendRow>): TrendRow {
  return { scope: 'mahalle', monthBucket: bucket('2026-06'), medianPricePerSqm: 1000, sampleCount: 10, ...over }
}

describe('priceTrend', () => {
  it('mahalle ≥3 kova → basis mahalle, points ay artan', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2026-06'), medianPricePerSqm: 1000 }),
      r({ monthBucket: bucket('2026-07'), medianPricePerSqm: 1100 }),
      r({ monthBucket: bucket('2026-08'), medianPricePerSqm: 1200 }),
    ], { now: NOW })
    expect(res.insufficientTrend).toBe(false)
    expect(res.basis).toBe('mahalle')
    expect(res.points!.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(res.changePct3m).toBeNull() // <4 kova
  })

  it('mahalle <3 kova ama ilçe ≥3 → basis ilçe', () => {
    const res = priceTrend([
      r({ scope: 'mahalle', monthBucket: bucket('2026-07') }),
      r({ scope: 'mahalle', monthBucket: bucket('2026-08') }),
      r({ scope: 'ilce', monthBucket: bucket('2026-06'), medianPricePerSqm: 900 }),
      r({ scope: 'ilce', monthBucket: bucket('2026-07'), medianPricePerSqm: 950 }),
      r({ scope: 'ilce', monthBucket: bucket('2026-08'), medianPricePerSqm: 1000 }),
    ], { now: NOW })
    expect(res.basis).toBe('ilce')
    expect(res.points).toHaveLength(3)
  })

  it('4+ kova → changePct3m hesaplanır', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 1000 + i * 100, sampleCount: 10 }),
    ), { now: NOW })
    // last=1300, last-3=1000 → +30.0
    expect(res.changePct3m).toBe(30)
  })

  it('negatif değişim', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 2000 - i * 100, sampleCount: 10 }),
    ), { now: NOW })
    expect(res.changePct3m).toBe(-15) // 1700 vs 2000
  })

  it('12 ay penceresi: 13 ay önceki kova elenir', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2025-07'), medianPricePerSqm: 500 }), // 13 ay önce
      r({ monthBucket: bucket('2026-06') }),
      r({ monthBucket: bucket('2026-07') }),
      r({ monthBucket: bucket('2026-08') }),
    ], { now: NOW })
    expect(res.points!.map((p) => p.month)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  it('thinTrend: toplam örneklem <20', () => {
    const res = priceTrend([
      r({ monthBucket: bucket('2026-06'), sampleCount: 3 }),
      r({ monthBucket: bucket('2026-07'), sampleCount: 3 }),
      r({ monthBucket: bucket('2026-08'), sampleCount: 3 }),
    ], { now: NOW })
    expect(res.thinTrend).toBe(true)
  })

  it('boş / yetersiz → insufficientTrend', () => {
    expect(priceTrend([], { now: NOW }).insufficientTrend).toBe(true)
    expect(priceTrend([r({ monthBucket: bucket('2026-08') })], { now: NOW }).insufficientTrend).toBe(true)
  })
})
