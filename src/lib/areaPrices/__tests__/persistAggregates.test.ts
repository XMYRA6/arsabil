import { refreshAreaPriceStats, refreshAreaPriceTrends } from '../persistAggregates'

function fakeDb(listings: unknown[]) {
  const stat = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(2) }
  const trend = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(2) }
  const marketListing = { findMany: jest.fn().mockResolvedValue(listings) }
  return { db: { areaPriceStat: stat, areaPriceTrend: trend, marketListing }, stat, trend, marketListing }
}

const L = (over = {}) => ({ listingType: 'arsa', pricePerSqm: 1000, status: 'active', il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UGURLU', listedAt: new Date('2026-07-15'), ...over })

describe('refreshAreaPriceStats', () => {
  it('yeni satırlar create edilir, sonuç {written,total}', async () => {
    const { db, stat } = fakeDb([L(), L({ pricePerSqm: 1200 }), L({ pricePerSqm: 900 })])
    const r = await refreshAreaPriceStats(db as never)
    expect(stat.create).toHaveBeenCalled()
    expect(r.written).toBeGreaterThan(0)
    expect(r.total).toBe(2)
  })
})
describe('refreshAreaPriceTrends', () => {
  it('mevcut satır update edilir', async () => {
    const { db, trend } = fakeDb([L(), L({ pricePerSqm: 1200 }), L({ pricePerSqm: 900 })])
    trend.findFirst.mockResolvedValue({ id: 'x1' })
    await refreshAreaPriceTrends(db as never)
    expect(trend.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'x1' } }))
  })
})
