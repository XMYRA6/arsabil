import { upsertDistrictDemographics, type DemographicsUpsertClient } from '../../tuik/upsert'

describe('upsertDistrictDemographics', () => {
  const meta = { dataYear: 2024, source: 'tuik-adnks-sdmx', fetchedAt: new Date('2026-09-07T00:00:00Z') }

  it('her satır için upsert çağırır; create eksik metriği null yazar, update yalnız gelen metriği yazar; sayı döner', async () => {
    const calls: any[] = []
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async (a: any) => { calls.push(a); return {} } },
    }
    const n = await upsertDistrictDemographics(
      client,
      [{ il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 }],
      meta,
    )
    expect(n).toBe(1)
    expect(calls[0].where).toEqual({ il_ilce: { il: 'TRABZON', ilce: 'ORTAHISAR' } })
    expect(calls[0].create).toMatchObject({
      il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4,
      populationGrowthPerMille: null, avgHouseholdSize: null,
      dataYear: 2024, source: 'tuik-adnks-sdmx',
    })
    expect(calls[0].update).toMatchObject({ population: 320000, medianAge: 36.4, dataYear: 2024 })
    expect(calls[0].update.il).toBeUndefined()  // anahtar sabit
  })

  it('eksik metrik → update BRANCHINDE hiç yer almaz (geçen yılki değer korunur), create null yazar', async () => {
    const calls: any[] = []
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async (a: any) => { calls.push(a); return {} } },
    }
    await upsertDistrictDemographics(client, [{ il: 'X', ilce: 'Y', population: 5 }], meta)
    expect(calls[0].update).not.toHaveProperty('medianAge')
    expect(calls[0].update).not.toHaveProperty('avgHouseholdSize')
    expect(calls[0].update).not.toHaveProperty('populationGrowthPerMille')
    expect(calls[0].update.population).toBe(5)
    expect(calls[0].create.medianAge).toBeNull()
  })

  it('boş liste → 0, hiç upsert yok', async () => {
    const client: DemographicsUpsertClient = {
      districtDemographics: { upsert: async () => { throw new Error('çağrılmamalı') } },
    }
    expect(await upsertDistrictDemographics(client, [], meta)).toBe(0)
  })
})
