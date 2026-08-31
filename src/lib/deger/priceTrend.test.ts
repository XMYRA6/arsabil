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
    expect(res.changePct3m).toBeNull() // hedef takvim ayı (2026-05) yok
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

  it('changePct3m: son ayın 3 TAKVİM ay öncesine göre (bitişik kovalar)', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 1000 + i * 100, sampleCount: 10 }),
    ), { now: NOW })
    // last=2026-08 (1300), hedef ay=2026-05 (1000) → +30.0
    expect(res.changePct3m).toBe(30)
  })

  it('negatif değişim (bitişik kovalar, 3 takvim ay önce)', () => {
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 2000 - i * 100, sampleCount: 10 }),
    ), { now: NOW })
    expect(res.changePct3m).toBe(-15) // 2026-08 1700 vs 2026-05 2000
  })

  it('changePct3m: kovalar bitişik değil, hedef takvim ayı yoksa → null', () => {
    // 4 nokta ama boşluklu: last=2026-08, hedef ay 2026-05 YOK → dizi indeksine
    // düşmez, null döner.
    const res = priceTrend(['2026-03', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 1000 + i * 100, sampleCount: 10 }),
    ), { now: NOW })
    expect(res.points).toHaveLength(4)
    expect(res.changePct3m).toBeNull()
  })

  it('changePct3m: 3 takvim ay önceki nokta MEVCUT → sayı hesaplanır', () => {
    // 3 nokta yeter: last=2026-08, hedef ay=2026-05 var.
    const res = priceTrend(['2026-05', '2026-06', '2026-07', '2026-08'].map((m, i) =>
      r({ monthBucket: bucket(m), medianPricePerSqm: 1000 + i * 50, sampleCount: 10 }),
    ), { now: NOW })
    // 2026-08 = 1150, 2026-05 = 1000 → +15.0
    expect(res.changePct3m).toBe(15)
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
