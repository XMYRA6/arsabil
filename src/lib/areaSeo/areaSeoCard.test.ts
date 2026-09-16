import { buildAreaSeoCard, type AreaSeoCardDeps, type AreaSeoKey } from './areaSeoCard'

const mahalleKey: AreaSeoKey = { scope: 'mahalle', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: 'DURUBINAR' }
const ilceKey: AreaSeoKey = { scope: 'ilce', ilNorm: 'TRABZON', ilceNorm: 'AKCAABAT', mahalleNorm: null }
const ilKey: AreaSeoKey = { scope: 'il', ilNorm: 'TRABZON', ilceNorm: null, mahalleNorm: null }

function baseDeps(overrides: Partial<AreaSeoCardDeps> = {}): AreaSeoCardDeps {
  return {
    findOwnStat: async () => ({ medianPricePerSqm: 1000, p25: 800, p75: 1300, sampleCount: 10 }),
    findTrendRows: async () => [],
    findDistrictDemographics: async () => null,
    countComparables: async () => 0,
    findNeighborhoodGeojson: async () => null,
    buildRiskSnapshot: async () => ({ faultDistanceM: null, floodQ100: null }),
    ...overrides,
  }
}

describe('buildAreaSeoCard', () => {
  it('kendi istatistik satırı yoksa null döner', async () => {
    const out = await buildAreaSeoCard(mahalleKey, baseDeps({ findOwnStat: async () => null }))
    expect(out).toBeNull()
  })

  it('stat + varsayılan (trend/demografi/risk yok) durumu doğru kurar', async () => {
    const out = await buildAreaSeoCard(ilKey, baseDeps({ countComparables: async () => 7 }))
    expect(out).toEqual({
      stat: { medianPricePerSqm: 1000, p25: 800, p75: 1300, sampleCount: 10 },
      comparableCount: 7,
    })
  })

  it('yeterli trend verisi varsa priceTrend alanını doldurur', async () => {
    const rows = [
      { scope: 'il' as const, monthBucket: new Date('2026-01-01'), medianPricePerSqm: 900, sampleCount: 10 },
      { scope: 'il' as const, monthBucket: new Date('2026-02-01'), medianPricePerSqm: 950, sampleCount: 10 },
      { scope: 'il' as const, monthBucket: new Date('2026-03-01'), medianPricePerSqm: 1000, sampleCount: 10 },
    ]
    const out = await buildAreaSeoCard(ilKey, baseDeps({ findTrendRows: async () => rows }))
    expect(out?.priceTrend?.points).toHaveLength(3)
  })

  it('ilçe seviyesinde demografi varsa demographics alanını doldurur', async () => {
    const out = await buildAreaSeoCard(
      ilceKey,
      baseDeps({
        findDistrictDemographics: async () => ({
          dataYear: 2025, population: 12000, populationGrowthPerMille: 5, medianAge: 38, avgHouseholdSize: 2.8,
        }),
      }),
    )
    expect(out?.demographics?.population).toBe(12000)
    expect(out?.demographics?.summary).not.toBeNull()
  })

  it('il seviyesinde findDistrictDemographics HİÇ çağrılmaz (ilçe bilgisi yok)', async () => {
    const spy = jest.fn(async () => null)
    await buildAreaSeoCard(ilKey, baseDeps({ findDistrictDemographics: spy }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('mahalle seviyesinde geojson varsa risk snapshot çağrılır ve sonuç eklenir', async () => {
    const out = await buildAreaSeoCard(
      mahalleKey,
      baseDeps({
        findNeighborhoodGeojson: async () => ({
          type: 'Polygon',
          coordinates: [[[39.0, 41.0], [39.1, 41.0], [39.1, 41.1], [39.0, 41.0]]],
        }),
        buildRiskSnapshot: async () => ({ faultDistanceM: 1200, floodQ100: false }),
      }),
    )
    expect(out?.risk).toEqual({ faultDistanceM: 1200, floodQ100: false })
  })

  it('mahalle seviyesinde geojson yoksa risk hiç eklenmez, buildRiskSnapshot çağrılmaz', async () => {
    const spy = jest.fn(async () => ({ faultDistanceM: 1, floodQ100: false }))
    const out = await buildAreaSeoCard(mahalleKey, baseDeps({ findNeighborhoodGeojson: async () => null, buildRiskSnapshot: spy }))
    expect(out?.risk).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })

  it('il/ilçe seviyesinde risk hiç hesaplanmaz (findNeighborhoodGeojson çağrılmaz)', async () => {
    const spy = jest.fn(async () => null)
    await buildAreaSeoCard(ilceKey, baseDeps({ findNeighborhoodGeojson: spy }))
    expect(spy).not.toHaveBeenCalled()
  })
})
