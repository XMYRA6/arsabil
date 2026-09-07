import type { DataflowRef } from './datasets'
import type { SdmxObservation } from './parse'
import type { ResolvedArea } from './areaCodes'
import { mergeDemographics, newMergeStats, type DataflowResult } from './merge'
import { upsertDistrictDemographics, type DemographicsUpsertClient } from './upsert'

export interface RunSummary {
  dataflowsOk: number
  dataflowsFailed: string[]
  /** merge sonrası ilçe satırı sayısı (dry-run'da da dolar). */
  mergedRows: number
  /** çözülemeyen (AREA_CODES'ta olmayan) kod sayısı — 0 beklenir. */
  unresolved: number
  rowsWritten: number
  aborted: boolean
}

export interface RunDeps {
  dataflows: DataflowRef[]
  dataYear: number
  getToken: () => Promise<string>
  fetchCsv: (ref: DataflowRef, token: string, year: number) => Promise<string>
  parse: (csv: string, ref: DataflowRef) => SdmxObservation[]
  resolve: (code: string) => ResolvedArea | null
  client: DemographicsUpsertClient
  crawlRunClient: {
    crawlRun: {
      create(args: unknown): Promise<{ id: string }>
      update(args: unknown): Promise<unknown>
    }
  }
}

export async function runTuikDemographics(deps: RunDeps, opts: { dryRun: boolean }): Promise<RunSummary> {
  const run = await deps.crawlRunClient.crawlRun.create({
    data: { source: 'tuik', il: 'ALL', category: 'demografi' },
  })

  // İlk token = auth kapısı (başarısızsa tur bloklanır). Döngüde her dataflow için
  // TAZE token alınır: TÜİK token TTL'i 300 sn ve yavaş sunucuda 4 dataflow bunu
  // aşabiliyor (bkz. FINDINGS.md) — tek token ile sonraki dataflow'lar 401 alırdı.
  try {
    await deps.getToken()
  } catch (err) {
    await deps.crawlRunClient.crawlRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), blocked: true, notes: `auth failed: ${(err as Error).message}` },
    })
    return {
      dataflowsOk: 0,
      dataflowsFailed: deps.dataflows.map((d) => d.key),
      mergedRows: 0,
      unresolved: 0,
      rowsWritten: 0,
      aborted: true,
    }
  }

  const results: DataflowResult[] = []
  const failed: string[] = []
  for (const ref of deps.dataflows) {
    try {
      const token = await deps.getToken()
      const csv = await deps.fetchCsv(ref, token, deps.dataYear)
      if (csv.trim().length === 0) {
        // HTTP 200 ama boş gövde — 4xx/5xx ile aynı kategori (spec design 245).
        failed.push(ref.key)
        console.error(`[tuik] ${ref.key} boş gövde döndürdü`)
        continue
      }
      results.push({ ref, observations: deps.parse(csv, ref) })
    } catch (err) {
      failed.push(ref.key)
      console.error(`[tuik] ${ref.key} çekilemedi:`, (err as Error).message)
    }
  }

  const aborted = results.length === 0
  const stats = newMergeStats()
  let rowsWritten = 0
  let mergedRows = 0
  if (!aborted) {
    const merged = mergeDemographics(results, deps.resolve, stats)
    mergedRows = merged.length
    if (!opts.dryRun) {
      rowsWritten = await upsertDistrictDemographics(deps.client, merged, {
        dataYear: deps.dataYear,
        source: 'tuik-adnks-sdmx',
        fetchedAt: new Date(),
      })
    }
  }

  await deps.crawlRunClient.crawlRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      blocked: aborted,
      listingsFound: results.reduce((n, r) => n + r.observations.length, 0),
      listingsUpserted: rowsWritten,
      notes: JSON.stringify({
        dryRun: opts.dryRun,
        dataflowsFailed: failed,
        dataYear: deps.dataYear,
        mergedRows,
        unresolved: stats.unresolvedCodes,
        unresolvedSamples: stats.unresolvedSamples,
        byIlConflicts: stats.byIlConflicts,
      }),
    },
  })

  return {
    dataflowsOk: deps.dataflows.length - failed.length,
    dataflowsFailed: failed,
    mergedRows,
    unresolved: stats.unresolvedCodes,
    rowsWritten,
    aborted,
  }
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run')
  const apiKey = process.env.TUIK_API_KEY
  if (!apiKey) {
    console.error('TUIK_API_KEY env değişkeni yok — Task 1 ön koşulu.')
    process.exitCode = 1
    return
  }

  const { DATAFLOWS, DATA_YEAR } = await import('./datasets')
  const { getAccessToken } = await import('./auth')
  const { parseSdmxCsv } = await import('./parse')
  const { resolveArea } = await import('./areaCodes')
  const { fetchDataflowCsv } = await import('./fetchData')
  const { PrismaClient } = await import('@prisma/client')

  if (DATAFLOWS.length === 0) {
    console.error('crawler/tuik/datasets.ts boş — Task 1 tamamlanmadı.')
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  try {
    const summary = await runTuikDemographics(
      {
        dataflows: DATAFLOWS,
        dataYear: DATA_YEAR,
        getToken: () => getAccessToken({ fetch, apiKey }),
        fetchCsv: (ref, token, year) => fetchDataflowCsv({ fetch, token }, ref, year),
        parse: (csv, ref) =>
          parseSdmxCsv(csv, {
            filter: { ...ref.rowFilter, TIME_PERIOD: String(DATA_YEAR) },
          }),
        resolve: resolveArea,
        client: prisma as unknown as DemographicsUpsertClient,
        crawlRunClient: prisma as unknown as RunDeps['crawlRunClient'],
      },
      { dryRun },
    )
    console.log('[tuik] özet:', summary)
    if (summary.unresolved > 0) {
      console.warn(`[tuik] UYARI: ${summary.unresolved} çözülemeyen kod — areaCodesData.ts eksik olabilir`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
}
