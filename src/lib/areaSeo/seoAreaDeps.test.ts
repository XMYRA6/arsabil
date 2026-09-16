const areaPriceStat = { findMany: jest.fn() }
const marketListing = { findMany: jest.fn() }
jest.mock('@/lib/prisma', () => ({ prisma: { areaPriceStat, marketListing } }))
jest.mock('react', () => ({ cache: (fn: unknown) => fn }))

import { createSeoAreaDeps } from './seoAreaDeps'

beforeEach(() => {
  areaPriceStat.findMany.mockReset()
  marketListing.findMany.mockReset()
})

describe('createSeoAreaDeps', () => {
  it('findAreaPriceStats — scope filtresiyle sorgular', async () => {
    areaPriceStat.findMany.mockResolvedValue([{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }])
    const deps = createSeoAreaDeps()
    const out = await deps.findAreaPriceStats('il')
    expect(out).toEqual([{ il: 'TRABZON', ilce: null, mahalle: null, sampleCount: 3 }])
    const arg = areaPriceStat.findMany.mock.calls[0][0]
    expect(arg.where.scope).toBe('il')
  })

  it('listDistinctMarketAreas — distinct il/ilce/mahalle çeker, il=null olanları eler', async () => {
    marketListing.findMany.mockResolvedValue([
      { il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' },
      { il: null, ilce: null, mahalle: null },
    ])
    const deps = createSeoAreaDeps()
    const out = await deps.listDistinctMarketAreas()
    expect(out).toEqual([{ il: 'Trabzon', ilce: 'Akçaabat', mahalle: 'Durubinar' }])
    const arg = marketListing.findMany.mock.calls[0][0]
    expect(arg.distinct).toEqual(['il', 'ilce', 'mahalle'])
  })
})
