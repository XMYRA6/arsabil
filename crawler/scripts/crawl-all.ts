import { runOrchestrator, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import { resolveProxyConfig } from '../fetcher/proxy'
import { createFetcher } from '../fetcher/browser'
import { defaultGeocodeDeps } from '../pipeline/geocode'
import { detectBlock } from '../fetcher/blockDetector'
import { runCrawl } from '../run'

function parseArgs(argv: string[]) {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  const has = (k: string) => argv.includes(`--${k}`)
  const onlyRaw = get('only')
  return {
    forceAll: has('force-all'),
    only: onlyRaw
      ? onlyRaw
          .split(',')
          .map((s) => s.trim().toLocaleLowerCase('tr-TR'))
          .filter(Boolean)
      : undefined,
    headful: has('headful'),
    fast: has('fast'),
    noBreaks: has('no-breaks'),
    delay: get('delay')?.split('-').map(Number),
    maxPages: Number(get('max-pages') ?? 25),
    workers: Number(process.env.CRAWL_WORKERS ?? get('workers') ?? 3),
    resumeDays: Number(process.env.CRAWL_RESUME_DAYS ?? 7),
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))

  if (a.only) {
    const unmatched = unmatchedOnlyTokens(a.only)
    if (unmatched.length > 0) {
      console.error(`Bilinmeyen --only girdisi: ${unmatched.join(', ')} (il adı veya emlakjet slug'ı bekleniyor)`)
      process.exit(1)
    }
  }

  const proxy = resolveProxyConfig()
  console.log(
    `crawl:all — emlakjet/arsa, workers=${a.workers}, maxPages=${a.maxPages}, ` +
      `forceAll=${a.forceAll}, only=${a.only?.join(',') ?? '(hepsi)'}, proxy=${proxy ? 'AÇIK' : 'kapalı'}`,
  )

  // I10 deseni (bkz run.ts) — prisma yalnız gerçek çalıştırmada yüklensin.
  const { prisma } = await import('@/lib/prisma')
  const deps: OrchestratorDeps = {
    client: prisma as unknown as OrchestratorDeps['client'],
    createFetcher: (cfg, opts) => createFetcher(cfg, opts),
    runCrawl,
    geocodeDeps: defaultGeocodeDeps(),
    detectBlock,
    now: () => new Date(),
    proxy,
    workers: a.workers,
    maxPages: a.maxPages,
    resumeDays: a.resumeDays,
    forceAll: a.forceAll,
    headful: a.headful,
    fast: a.fast,
    cfgOverride: {
      ...(a.delay && a.delay.length === 2 && a.delay.every(Number.isFinite)
        ? { minDelayMs: a.delay[0] * 1000, maxDelayMs: a.delay[1] * 1000 }
        : {}),
      ...(a.noBreaks ? { breakEveryN: 0 } : {}),
    },
    only: a.only,
  }

  const result = await runOrchestrator(deps)
  console.log(
    `\n${result.completed.length} il tamam, ${result.blocked.length} il blocked, ` +
      `${result.skippedResume.length} il atlandı (resume)`,
  )
  if (result.blocked.length > 0) console.table(result.blocked)
  if (result.stoppedEarly) {
    console.error(
      "\n⚠️  Erken durduruldu: blocked oranı %50'i aştı — CRAWL_PROXY_* env değişkenlerini doldurup " +
        'tekrar çalıştırın (tamamlanan iller resume ile otomatik atlanır).\n',
    )
    process.exitCode = 2
  }

  await prisma.$disconnect()
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
