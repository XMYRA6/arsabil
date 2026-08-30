import { aggregateTrend, type TrendInputRow } from './trendAggregate'

const D = (iso: string) => new Date(iso)

function row(over: Partial<TrendInputRow>): TrendInputRow {
  return {
    listingType: 'arsa', pricePerSqm: 1000, status: 'active',
    il: 'trabzon', ilce: 'ortahisar', mahalle: 'uğurlu',
    listedAt: D('2026-06-15T00:00:00Z'),
    ...over,
  }
}

describe('aggregateTrend', () => {
  it('aynı ay 3+ ilan → mahalle+ilçe+il satırı, monthBucket ayın 1i (UTC)', () => {
    const out = aggregateTrend([
      row({ pricePerSqm: 1000 }), row({ pricePerSqm: 2000 }), row({ pricePerSqm: 3000 }),
    ])
    const mah = out.find((r) => r.scope === 'mahalle')!
    expect(mah).toMatchObject({
      il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU',
      medianPricePerSqm: 2000, sampleCount: 3,
    })
    expect(mah.monthBucket.toISOString()).toBe('2026-06-01T00:00:00.000Z')
    expect(out.map((r) => r.scope).sort()).toEqual(['il', 'ilce', 'mahalle'])
  })

  it('farklı aylar ayrı kova', () => {
    const rows = [
      ...[1, 2, 3].map(() => row({ listedAt: D('2026-06-10T00:00:00Z'), pricePerSqm: 1000 })),
      ...[1, 2, 3].map(() => row({ listedAt: D('2026-07-10T00:00:00Z'), pricePerSqm: 1500 })),
    ]
    const mah = aggregateTrend(rows).filter((r) => r.scope === 'mahalle')
    expect(mah).toHaveLength(2)
    expect(mah.map((r) => r.monthBucket.toISOString()).sort()).toEqual([
      '2026-06-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z',
    ])
  })

  it('<3 örneklem grubu atlanır', () => {
    expect(aggregateTrend([row({}), row({})])).toEqual([])
  })

  it('delisted DAHİL, başka status hariç', () => {
    const rows = [
      row({ status: 'delisted', pricePerSqm: 100 }),
      row({ status: 'delisted', pricePerSqm: 200 }),
      row({ status: 'delisted', pricePerSqm: 300 }),
      row({ status: 'archived', pricePerSqm: 9999 }),
    ]
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
    expect(mah.medianPricePerSqm).toBe(200)
  })

  it('konut / fiyatsız / listedAt-null / il-null elenir', () => {
    const rows = [
      row({ listingType: 'konut' }),
      row({ pricePerSqm: 0 }),
      row({ listedAt: null }),
      row({ il: null }),
      row({ pricePerSqm: 100 }), row({ pricePerSqm: 200 }), row({ pricePerSqm: 300 }),
    ]
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
  })

  it('ay sınırı: 31 Temmuz 23:59 UTC → Temmuz kovası', () => {
    const rows = [1, 2, 3].map(() => row({ listedAt: D('2026-07-31T23:59:00Z'), pricePerSqm: 500 }))
    const mah = aggregateTrend(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.monthBucket.toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })
})
