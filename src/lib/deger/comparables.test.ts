import { selectComparables, type ComparableListing } from './comparables'

const P = { lat: 41.0, lng: 39.7, areaSqm: 1000 }

function L(over: Partial<ComparableListing>): ComparableListing {
  return {
    id: 'x', pricePerSqm: 2000, areaSqm: 1000, price: 2_000_000,
    lat: 41.001, lng: 39.7, geoPrecision: 'neighborhood',
    listedAt: new Date('2026-08-20'), source: 'emlakjet',
    sourceUrl: 'https://emlakjet.com/ilan/1', listingType: 'arsa',
    ...over,
  }
}

describe('selectComparables', () => {
  it('yakın + benzer alan → emsal listesinde', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'a' })] })
    expect(r.total).toBe(1)
    expect(r.items).toHaveLength(1)
    expect(r.items[0].distanceM).toBeGreaterThan(0)
    expect(r.items[0].approxDistance).toBe(true) // geoPrecision neighborhood
  })

  it('50.000 m² tarla, 1.000 m² parsele emsal DEĞİL (alan filtresi)', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'big', areaSqm: 50_000 })] })
    expect(r.total).toBe(0)
    expect(r.items).toEqual([])
  })

  it('alanı null olan ilan alan filtresini geçer', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'na', areaSqm: null })] })
    expect(r.total).toBe(1)
  })

  it('parsel alanı yoksa alan filtresi atlanır', () => {
    const r = selectComparables({
      parcel: { ...P, areaSqm: null },
      listings: [L({ id: 'big', areaSqm: 50_000 })],
    })
    expect(r.total).toBe(1)
  })

  it('5 km ötesi elenir', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'far', lat: 41.1, lng: 39.7 })] })
    expect(r.total).toBe(0)
  })

  it('koordinatsız / fiyatsız / yanlış-tip elenir', () => {
    const r = selectComparables({
      parcel: P,
      listings: [
        L({ id: 'nocoord', lat: null }),
        L({ id: 'noprice', pricePerSqm: 0 }),
        L({ id: 'konut', listingType: 'konut' }),
        L({ id: 'ok' }),
      ],
    })
    expect(r.total).toBe(1)
    expect(r.items[0].source).toBe('emlakjet')
  })

  it('8 sınırı + total tam sayı, mesafeye göre sıralı', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      L({ id: `n${i}`, lat: 41.0 + i * 0.0005, lng: 39.7 }),
    )
    const r = selectComparables({ parcel: P, listings: many })
    expect(r.total).toBe(12)
    expect(r.items).toHaveLength(8)
    const dists = r.items.map((c) => c.distanceM)
    expect([...dists].sort((a, b) => a - b)).toEqual(dists)
  })

  it('listedAt DTO için ISO string olarak çıkar (M1)', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'a', listedAt: new Date('2026-08-20T00:00:00Z') })] })
    expect(r.items[0].listedAt).toBe('2026-08-20T00:00:00.000Z')
  })

  it('listedAt null olan ilan → çıktıda null', () => {
    const r = selectComparables({ parcel: P, listings: [L({ id: 'a', listedAt: null })] })
    expect(r.items[0].listedAt).toBeNull()
  })

  it('I1/I2 — eşit mesafede yeni ilan önce sıralanır (deterministik top-N)', () => {
    const r = selectComparables({
      parcel: P,
      listings: [
        L({ id: 'old', lat: 41.001, lng: 39.7, listedAt: new Date('2026-01-01') }),
        L({ id: 'new', lat: 41.001, lng: 39.7, listedAt: new Date('2026-08-01') }),
      ],
    })
    expect(r.items.map((c) => c.distanceM)).toEqual([r.items[0].distanceM, r.items[0].distanceM]) // aynı mesafe
    expect(r.items[0].listedAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('parsel koordinatı geçersiz → boş', () => {
    const r = selectComparables({ parcel: { lat: NaN, lng: 39, areaSqm: 1000 }, listings: [L({})] })
    expect(r).toEqual({ items: [], total: 0 })
  })
})
