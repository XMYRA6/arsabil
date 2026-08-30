import { aggregateAreaPrices, ARSA_LISTING_TYPES, type AggregateInputRow } from './aggregate'

function row(over: Partial<AggregateInputRow>): AggregateInputRow {
  return {
    listingType: 'arsa',
    pricePerSqm: 1000,
    status: 'active',
    il: 'trabzon',
    ilce: 'ortahisar',
    mahalle: 'uğurlu',
    ...over,
  }
}

describe('aggregateAreaPrices', () => {
  it('tek mahallede 3+ arsa ilanı → mahalle + ilçe + il satırı üretir', () => {
    const rows = [
      row({ pricePerSqm: 1000 }),
      row({ pricePerSqm: 2000 }),
      row({ pricePerSqm: 3000 }),
    ]
    const out = aggregateAreaPrices(rows)
    const scopes = out.map((r) => r.scope).sort()
    expect(scopes).toEqual(['il', 'ilce', 'mahalle'])
    const mah = out.find((r) => r.scope === 'mahalle')!
    expect(mah).toMatchObject({
      il: 'TRABZON',
      ilce: 'ORTAHISAR',
      mahalle: 'UĞURLU',
      medianPricePerSqm: 2000,
      sampleCount: 3,
    })
  })

  it('3ten az örneklem olan grubu yazmaz', () => {
    const out = aggregateAreaPrices([row({}), row({})]) // 2 ilan
    expect(out).toEqual([])
  })

  it('konut / ticari / diger listingType hariç tutulur', () => {
    const rows = [
      row({ listingType: 'konut', pricePerSqm: 9999 }),
      row({ listingType: 'ticari', pricePerSqm: 9999 }),
      row({ listingType: 'diger', pricePerSqm: 9999 }),
      row({ listingType: 'arsa', pricePerSqm: 100 }),
      row({ listingType: 'tarla', pricePerSqm: 200 }),
      row({ listingType: 'bag', pricePerSqm: 300 }),
    ]
    const mah = aggregateAreaPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
    expect(mah.medianPricePerSqm).toBe(200)
  })

  it('pasif ilan, null/0/negatif pricePerSqm hariç', () => {
    const rows = [
      row({ status: 'delisted', pricePerSqm: 5000 }),
      row({ pricePerSqm: null }),
      row({ pricePerSqm: 0 }),
      row({ pricePerSqm: -5 }),
      row({ pricePerSqm: 100 }),
      row({ pricePerSqm: 200 }),
      row({ pricePerSqm: 300 }),
    ]
    const mah = aggregateAreaPrices(rows).find((r) => r.scope === 'mahalle')!
    expect(mah.sampleCount).toBe(3)
  })

  it('il boş olan satır tamamen atlanır', () => {
    const out = aggregateAreaPrices([
      row({ il: null }),
      row({ il: null }),
      row({ il: null }),
    ])
    expect(out).toEqual([])
  })

  it('ilçe geneli satırı birden çok mahalleyi toplar; mahalle satırları ayrı', () => {
    const rows = [
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'a', pricePerSqm: 100 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
      row({ mahalle: 'b', pricePerSqm: 500 }),
    ]
    const out = aggregateAreaPrices(rows)
    const ilce = out.find((r) => r.scope === 'ilce')!
    expect(ilce.sampleCount).toBe(6)
    expect(ilce.medianPricePerSqm).toBe(300) // median of [100,100,100,500,500,500]
    expect(out.filter((r) => r.scope === 'mahalle')).toHaveLength(2)
  })

  it('ARSA_LISTING_TYPES beklenen değerler', () => {
    expect([...ARSA_LISTING_TYPES].sort()).toEqual(
      ['arazi', 'arsa', 'bag', 'bahce', 'tarla', 'zeytinlik'],
    )
  })
})
