import type { MergedDistrictRow } from './merge'
import type { DemographicField } from './datasets'

const FIELDS: DemographicField[] = [
  'population',
  'populationGrowthPerMille',
  'medianAge',
  'avgHouseholdSize',
]

export interface DemographicsUpsertClient {
  districtDemographics: { upsert(args: unknown): Promise<unknown> }
}

export async function upsertDistrictDemographics(
  client: DemographicsUpsertClient,
  rows: MergedDistrictRow[],
  meta: { dataYear: number; source: string; fetchedAt: Date },
): Promise<number> {
  let written = 0
  for (const row of rows) {
    const metrics: Record<string, number | null> = {}
    for (const f of FIELDS) metrics[f] = typeof row[f] === 'number' ? (row[f] as number) : null

    await client.districtDemographics.upsert({
      where: { il_ilce: { il: row.il, ilce: row.ilce } },
      create: {
        il: row.il,
        ilce: row.ilce,
        dataYear: meta.dataYear,
        source: meta.source,
        fetchedAt: meta.fetchedAt,
        ...metrics,
      },
      update: {
        dataYear: meta.dataYear,
        source: meta.source,
        fetchedAt: meta.fetchedAt,
        ...metrics,
      },
    })
    written++
  }
  return written
}
