import { buildQueue, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import { resolveProxyConfig } from '../fetcher/proxy'
import { createFetcher } from '../fetcher/browser'
import { loadSahibindenCookies } from '../fetcher/sahibindenCookies'
import { defaultGeocodeDeps } from '../pipeline/geocode'
import { detectBlock, detectHardBlock } from '../fetcher/blockDetector'
import { sahibindenAdapter } from '../adapters/sahibinden'
import { runCrawl } from '../run'
import { DEFAULT_CONFIG } from '../config'

export function evaluateSahibindenPreflight(
  homepageResult: { html: string; status: number },
): { ok: boolean; reason: string | null } {
  const check = detectHardBlock(homepageResult.html, homepageResult.status)
  return check.blocked ? { ok: false, reason: check.reason } : { ok: true, reason: null }
}

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
    maxPages: Number(get('max-pages') ?? 20),
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
  if (!proxy) {
    console.error(
      'Sahibinden residential proxy olmadan neredeyse her zaman engellenir — ' +
        'CRAWL_PROXY_SERVER/CRAWL_PROXY_USERNAME/CRAWL_PROXY_PASSWORD env değişkenlerini doldurun.',
    )
    process.exit(1)
  }

  let cookies
  try {
    cookies = loadSahibindenCookies()
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }

  console.log(
    `crawl:sahibinden — arsa, maxPages=${a.maxPages}, forceAll=${a.forceAll}, ` +
      `only=${a.only?.join(',') ?? '(hepsi)'}, çerez sayısı=${cookies.length}`,
  )

  const cfg = { ...DEFAULT_CONFIG, maxRequestsPerRun: a.maxPages * 31 }
  const fetcher = await createFetcher(cfg, {
    headful: a.headful,
    proxy,
    cookies,
    fullStealth: true,
    refererChain: true,
  })

  try {
    const preflight = await fetcher.get('https://www.sahibinden.com')
    const verdict = evaluateSahibindenPreflight(preflight)
    if (!verdict.ok) {
      console.error(`\n⚠️  Preflight engellendi: ${verdict.reason} — çerezleri gerçek tarayıcıda yenileyin.\n`)
      process.exitCode = 1
      return
    }
    console.log('Preflight temiz — çalışmaya devam ediliyor.')

    // I10 deseni (bkz run.ts) — prisma yalnız gerçek çalıştırmada yüklensin.
    const { prisma } = await import('@/lib/prisma')
    const deps: OrchestratorDeps = {
      client: prisma as unknown as OrchestratorDeps['client'],
      createFetcher,
      runCrawl,
      geocodeDeps: defaultGeocodeDeps(),
      detectBlock,
      now: () => new Date(),
      proxy,
      workers: 1,
      maxPages: a.maxPages,
      resumeDays: a.resumeDays,
      forceAll: a.forceAll,
      headful: a.headful,
      only: a.only,
      source: 'sahibinden',
    }

    const { queue, skippedResume } = await buildQueue(deps)
    const completed: string[] = []
    const blocked: { il: string; reason: string | null }[] = []

    for (const province of queue) {
      try {
        const summary = await runCrawl(
          {
            il: province.tkgmName,
            ilUrlOverride: province.emlakjetSlug,
            category: 'arsa',
            maxPages: a.maxPages,
            dryRun: false,
          },
          {
            adapter: sahibindenAdapter,
            client: deps.client,
            fetcher,
            geocodeDeps: deps.geocodeDeps,
            detectBlock: deps.detectBlock,
            now: deps.now,
            cfg,
          },
        )
        if (summary.blocked) blocked.push({ il: province.tkgmName, reason: summary.blockReason })
        else completed.push(province.tkgmName)
      } catch (e) {
        blocked.push({
          il: province.tkgmName,
          reason: `beklenmeyen hata: ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    }

    console.log(
      `\n${completed.length} il tamam, ${blocked.length} il blocked, ${skippedResume.length} il atlandı (resume)`,
    )
    if (blocked.length > 0) console.table(blocked)

    await prisma.$disconnect()
  } finally {
    await fetcher.close()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
