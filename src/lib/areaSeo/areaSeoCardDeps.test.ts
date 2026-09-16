const areaPriceStat = { findFirst: jest.fn() }
const areaPriceTrend = { findMany: jest.fn() }
const districtDemographics = { findUnique: jest.fn() }
const marketListing = { findMany: jest.fn() }
const neighborhood = { findUnique: jest.fn() }
jest.mock('@/lib/prisma', () => ({
  prisma: { areaPriceStat, areaPriceTrend, districtDemographics, marketListing, neighborhood },
}))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: 'BRS' }))

import { createAreaSeoCardDeps } from './areaSeoCardDeps'
import type { AreaSeoKey } from './areaSeoCard'

const mahalleKey: AreaSeoKey = { scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR' }
const ilceKey: AreaSeoKey = { scope: 'ilce', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null }
const ilKey: AreaSeoKey = { scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null }

beforeEach(() => {
  areaPriceStat.findFirst.mockReset()
  areaPriceTrend.findMany.mockReset()
  districtDemographics.findUnique.mockReset()
  marketListing.findMany.mockReset()
  neighborhood.findUnique.mockReset()
})

describe('createAreaSeoCardDeps', () => {
  it('buildRiskSnapshot olduğu gibi geçirilir', () => {
    expect(createAreaSeoCardDeps().buildRiskSnapshot).toBe('BRS')
  })

  it('findOwnStat — findFirst kullanır (findUnique DEĞİL, nullable alan riski)', async () => {
    areaPriceStat.findFirst.mockResolvedValue({ medianPricePerSqm: 1, p25: 1, p75: 1, sampleCount: 1 })
    await createAreaSeoCardDeps().findOwnStat(mahalleKey)
    const arg = areaPriceStat.findFirst.mock.calls[0][0]
    expect(arg.where).toEqual({ il: 'TRABZON', ilce: 'AKCAABAT', mahalle: 'DURUBINAR' })
  })

  it('findOwnStat — satır yoksa null döner', async () => {
    areaPriceStat.findFirst.mockResolvedValue(null)
    expect(await createAreaSeoCardDeps().findOwnStat(ilKey)).toBeNull()
  })

  it('findTrendRows — mahalle seviyesinde üç kademeli OR sorgular', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(mahalleKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.il).toBe('TRABZON')
    expect(arg.where.OR).toEqual([
      { ilce: null, mahalle: null },
      { ilce: 'AKCAABAT', mahalle: null },
      { ilce: 'AKCAABAT', mahalle: 'DURUBINAR' },
    ])
  })

  it('findTrendRows — ilçe seviyesinde iki kademeli OR sorgular (mahalle yok)', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(ilceKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.OR).toEqual([{ ilce: null, mahalle: null }, { ilce: 'AKCAABAT', mahalle: null }])
  })

  it('findTrendRows — il seviyesinde yalnız il satırını sorgular', async () => {
    areaPriceTrend.findMany.mockResolvedValue([])
    await createAreaSeoCardDeps().findTrendRows(ilKey)
    const arg = areaPriceTrend.findMany.mock.calls[0][0]
    expect(arg.where.OR).toEqual([{ ilce: null, mahalle: null }])
  })

  it('findDistrictDemographics — il_ilce compound key, hata olursa null', async () => {
    districtDemographics.findUnique.mockRejectedValue(new Error('migrate edilmemiş'))
    const out = await createAreaSeoCardDeps().findDistrictDemographics('TRABZON', 'AKCAABAT')
    expect(out).toBeNull()
  })

  it('countComparables — geniş aday kümesi çeker, normalizeAreaName ile uygulama katmanında filtreler', async () => {
    // Not: mahalleKey.ilceNorm = 'AKCAABAT' (düz C) — normalizeAreaName ç'yi
    // katlamadığı için burada 'Akcaabat' (cedillasız ham yazım) kullanılıyor,
    // normalizeAreaName('Akcaabat') === 'AKCAABAT' ile birebir eşleşsin diye.
    marketListing.findMany.mockResolvedValue([
      { il: 'Trabzon', ilce: 'Akcaabat', mahalle: 'Durubinar' }, // eşleşir
      { il: 'Trabzon', ilce: 'Akcaabat', mahalle: 'Yıldızlı' }, // farklı mahalle
      { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Durubinar' }, // farklı ilçe
      { il: null, ilce: null, mahalle: null },
    ])
    const out = await createAreaSeoCardDeps().countComparables(mahalleKey)
    expect(out).toBe(1)
  })

  it('findNeighborhoodGeojson — yalnız mahalle seviyesinde sorgular, diğerlerinde null döner', async () => {
    neighborhood.findUnique.mockResolvedValue({ geojson: { type: 'Polygon' } })
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(mahalleKey)).toEqual({ type: 'Polygon' })
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(ilceKey)).toBeNull()
    expect(await createAreaSeoCardDeps().findNeighborhoodGeojson(ilKey)).toBeNull()
  })
})
