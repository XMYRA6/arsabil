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
    // create: yeni ilçe satırı — eksik metrik null olarak yazılır (henüz veri yok).
    const createMetrics: Record<string, number | null> = {}
    for (const f of FIELDS) createMetrics[f] = typeof row[f] === 'number' ? (row[f] as number) : null
    // update: mevcut satır — SADECE bu turda gerçekten gelen metrikleri yaz.
    // Bir dataflow tek seferlik hata verdiğinde (yıllık cron) o metriğin geçen
    // yılki geçerli değeri korunur; sonraki başarılı tur üstüne yazar.
    const updateMetrics: Record<string, number> = {}
    for (const f of FIELDS) if (typeof row[f] === 'number') updateMetrics[f] = row[f] as number

    try {
      await client.districtDemographics.upsert({
        where: { il_ilce: { il: row.il, ilce: row.ilce } },
        create: {
          il: row.il,
          ilce: row.ilce,
          dataYear: meta.dataYear,
          source: meta.source,
          fetchedAt: meta.fetchedAt,
          ...createMetrics,
        },
        update: {
          dataYear: meta.dataYear,
          source: meta.source,
          fetchedAt: meta.fetchedAt,
          ...updateMetrics,
        },
      })
      written++
    } catch (err) {
      // Kısmi yazım sayısını hataya iliştir — run.ts CrawlRun.notes'a yazsın
      // (operatör tablonun kaç satırının yeni yıla geçtiğini bilsin).
      const e = new Error(
        `upsert failed after ${written}/${rows.length} rows: ${(err as Error).message}`,
      ) as Error & { written?: number }
      e.written = written
      throw e
    }
  }
  return written
}
