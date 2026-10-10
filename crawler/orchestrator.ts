import { DEFAULT_CONFIG, type CrawlConfig } from './config'
import { emlakjetAdapter } from './adapters/emlakjet'
import type { RunDeps, RunSummary } from './run'
import { PROVINCES, type Province } from './data/provinces'
import type { ProxyConfig } from './fetcher/proxy'
import type { Fetcher } from './fetcher/browser'
import type { GeocodeDeps } from './pipeline/geocode'
import type { BlockCheckInput, BlockResult } from './fetcher/blockDetector'

const REQUESTS_PER_PAGE_ESTIMATE = 31
// Erken-dur eşiği yalnız yeterli örnekten sonra değerlendirilir — 1 blocked/1 il
// %100 gösterip turu anlamsızca durdurmasın.
const MIN_SAMPLE_FOR_EARLY_STOP = 5

/** 25 sayfa × ~30 ilan + 25 arama sayfası ≈ 775 istek gerekir (spec matematiği) — maxPages'e göre ölçekle. */
export function maxRequestsFor(maxPages: number): number {
  return Math.ceil(maxPages * REQUESTS_PER_PAGE_ESTIMATE)
}

function matchesOnlyToken(p: Province, token: string): boolean {
  return token === p.tkgmName.toLocaleLowerCase('tr-TR') || token === p.emlakjetSlug
}

/** --only= listesindeki, hiçbir ile/slug'a karşılık gelmeyen tokenları döner (CLI hata mesajı için). */
export function unmatchedOnlyTokens(only: string[]): string[] {
  return only.filter((token) => !PROVINCES.some((p) => matchesOnlyToken(p, token)))
}

export interface OrchestratorDeps {
  client: RunDeps['client'] & { crawlRun: { findMany(args: any): Promise<{ il: string }[]> } }
  createFetcher: (cfg: CrawlConfig, opts: { headful?: boolean; proxy?: ProxyConfig }) => Promise<Fetcher>
  runCrawl: (
    args: { il: string; ilUrlOverride?: string; category: 'arsa' | 'konut'; maxPages: number; dryRun: boolean; fast?: boolean },
    deps: RunDeps,
  ) => Promise<RunSummary>
  geocodeDeps: GeocodeDeps
  detectBlock: (i: BlockCheckInput) => BlockResult
  now: () => Date
  proxy?: ProxyConfig
  workers: number
  maxPages: number
  resumeDays: number
  forceAll: boolean
  headful?: boolean
  /** Detay sayfası çekmeden arama kartlarından kaydet (çok daha hızlı, daha az alan). */
  fast?: boolean
  /** Varsayılan bekleme/mola ayarlarının üzerine yazılır. */
  cfgOverride?: Partial<CrawlConfig>
  /** tkgmName (tr-TR küçük harf) veya emlakjetSlug — her ikisiyle de eşleşir. */
  only?: string[]
  /** Faz 2 (Sahibinden) buildQueue()'yu yeniden kullanmak için — varsayılan 'emlakjet'. */
  source?: string
}

export interface OrchestratorResult {
  completed: string[]
  blocked: { il: string; reason: string | null }[]
  skippedResume: string[]
  stoppedEarly: boolean
}

export async function buildQueue(
  deps: OrchestratorDeps,
): Promise<{ queue: Province[]; skippedResume: string[] }> {
  const candidates =
    deps.only && deps.only.length > 0
      ? PROVINCES.filter((p) => deps.only!.some((token) => matchesOnlyToken(p, token)))
      : [...PROVINCES]

  if (deps.forceAll) {
    return { queue: candidates, skippedResume: [] }
  }

  const cutoff = new Date(deps.now().getTime() - deps.resumeDays * 86_400_000)
  const doneRuns = await deps.client.crawlRun.findMany({
    where: {
      source: deps.source ?? 'emlakjet',
      category: 'arsa',
      blocked: false,
      finishedAt: { not: null },
      // 0 sayfalı koşu "tamam" sayılmaz (yarım/başarısız tur yeniden denensin).
      pagesFetched: { gt: 0 },
      startedAt: { gte: cutoff },
    },
    select: { il: true },
  })
  const doneSet = new Set(doneRuns.map((r) => r.il.toLocaleUpperCase('tr-TR')))

  const queue: Province[] = []
  const skippedResume: string[] = []
  for (const p of candidates) {
    if (doneSet.has(p.tkgmName.toLocaleUpperCase('tr-TR'))) skippedResume.push(p.tkgmName)
    else queue.push(p)
  }
  return { queue, skippedResume }
}

async function runWorker(
  queue: Province[],
  deps: OrchestratorDeps,
  result: OrchestratorResult,
): Promise<void> {
  const cfg: CrawlConfig = {
    ...DEFAULT_CONFIG,
    maxRequestsPerRun: maxRequestsFor(deps.maxPages),
    ...deps.cfgOverride,
  }
  const fetcher = await deps.createFetcher(cfg, { headful: deps.headful, proxy: deps.proxy })
  try {
    while (queue.length > 0) {
      if (result.stoppedEarly) return
      const province = queue.shift()
      if (!province) break

      try {
        const summary = await deps.runCrawl(
          {
            il: province.tkgmName,
            ilUrlOverride: province.emlakjetSlug,
            category: 'arsa',
            maxPages: deps.maxPages,
            dryRun: false,
            fast: deps.fast,
          },
          {
            adapter: emlakjetAdapter,
            client: deps.client,
            fetcher,
            geocodeDeps: deps.geocodeDeps,
            detectBlock: deps.detectBlock,
            now: deps.now,
            cfg,
          },
        )
        if (summary.blocked) result.blocked.push({ il: province.tkgmName, reason: summary.blockReason })
        else result.completed.push(province.tkgmName)
      } catch (e) {
        result.blocked.push({
          il: province.tkgmName,
          reason: `beklenmeyen hata: ${e instanceof Error ? e.message : String(e)}`,
        })
      }

      const total = result.completed.length + result.blocked.length
      if (total >= MIN_SAMPLE_FOR_EARLY_STOP && result.blocked.length / total > 0.5) {
        result.stoppedEarly = true
        queue.length = 0
        return
      }
    }
  } finally {
    await fetcher.close()
  }
}

export async function runOrchestrator(deps: OrchestratorDeps): Promise<OrchestratorResult> {
  const { queue, skippedResume } = await buildQueue(deps)
  const result: OrchestratorResult = { completed: [], blocked: [], skippedResume, stoppedEarly: false }
  if (queue.length === 0) return result
  const workerCount = Math.max(1, Math.min(deps.workers, queue.length))
  await Promise.all(Array.from({ length: workerCount }, () => runWorker(queue, deps, result)))
  return result
}
