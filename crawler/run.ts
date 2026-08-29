import { prisma } from '@/lib/prisma'
import { DEFAULT_CONFIG, type CrawlConfig } from './config'
import { sahibindenAdapter } from './adapters/sahibinden'
import { emlakjetAdapter } from './adapters/emlakjet'
import type { PortalAdapter, PortalSource, ListingCategory, ListingType } from './adapters/types'
import { normalizeRaw } from './pipeline/normalize'
import { geocodeListing, defaultGeocodeDeps, type GeocodeDeps } from './pipeline/geocode'
import { findDupes, type DedupeCandidate } from './pipeline/dedupe'
import { upsertListing, markDelistedExcept, writeDupeLinks, type UpsertClient } from './pipeline/upsert'
import { detectBlock, type BlockCheckInput, type BlockResult } from './fetcher/blockDetector'
import { createFetcher } from './fetcher/browser'

// Ruling A — v1 kapsamı: yalnızca sahibinden + emlakjet. hepsiemlak adapteri yok (ertelendi).
const ADAPTERS: Partial<Record<PortalSource, PortalAdapter>> = {
  sahibinden: sahibindenAdapter,
  emlakjet: emlakjetAdapter,
}
const ARSA_TYPES: ListingType[] = ['arsa', 'tarla', 'bag', 'bahce', 'zeytinlik', 'arazi']
const KONUT_TYPES: ListingType[] = ['konut', 'ticari', 'diger']

export interface RunArgs {
  il: string
  category: ListingCategory
  maxPages: number
  dryRun: boolean
  limit?: number
}

export interface RunSummary {
  pagesFetched: number
  listingsFound: number
  listingsUpserted: number
  unparseable: number
  delisted: number
  dupes: number
  blocked: boolean
  blockReason: string | null
}

export interface RunDeps {
  adapter: PortalAdapter
  client: UpsertClient & {
    crawlRun: { create(a: any): Promise<{ id: string }>; update(a: any): Promise<any> }
  }
  fetcher: { get(url: string): Promise<{ html: string; status: number }>; requestCount: number; close(): Promise<void> }
  geocodeDeps: GeocodeDeps
  detectBlock: (i: BlockCheckInput) => BlockResult
  now: () => Date
  cfg?: CrawlConfig
}

export async function runCrawl(args: RunArgs, deps: RunDeps): Promise<RunSummary> {
  const cfg = deps.cfg ?? DEFAULT_CONFIG
  const { adapter } = deps
  const types = args.category === 'arsa' ? ARSA_TYPES : KONUT_TYPES
  const summary: RunSummary = {
    pagesFetched: 0,
    listingsFound: 0,
    listingsUpserted: 0,
    unparseable: 0,
    delisted: 0,
    dupes: 0,
    blocked: false,
    blockReason: null,
  }

  const run = args.dryRun
    ? { id: 'dry' }
    : await deps.client.crawlRun.create({
        data: { source: adapter.source, il: args.il, category: args.category, startedAt: deps.now() },
      })

  const seenIds: string[] = []
  const dedupeCands: DedupeCandidate[] = []
  const searchUrls = adapter.searchUrls(args.il, args.category, args.maxPages)

  outer: for (const url of searchUrls) {
    const { html, status } = await deps.fetcher.get(url)
    summary.pagesFetched++
    const stubs = adapter.parseSearchPage(html)
    // Ruling B — engel göstergesi adapterden gelir
    const block = deps.detectBlock({
      html,
      httpStatus: status,
      expectedSelector: adapter.searchResultHint,
      foundListingCount: stubs.length,
    })
    if (block.blocked) {
      summary.blocked = true
      summary.blockReason = block.reason
      break
    }

    // Ruling C — bu sayfadaki stub'lardan DB'de olan + taze olanları detay-fetch'ten muaf tut
    const stubIds = stubs.map((s) => s.sourceListingId)
    const existing = await deps.client.marketListing.findMany({
      where: { source: adapter.source, sourceListingId: { in: stubIds } },
    })
    const freshById = new Map<string, string>() // sourceListingId -> mevcut satır id'si (taze ise)
    for (const row of existing as Array<{ id: string; sourceListingId: string; lastSeenAt: Date | string }>) {
      const age = deps.now().getTime() - new Date(row.lastSeenAt).getTime()
      if (age < cfg.detailRefreshDays * 86_400_000) freshById.set(row.sourceListingId, row.id)
    }

    for (const stub of stubs) {
      if (args.limit && summary.listingsFound >= args.limit) break outer

      // taze kayıt: detay çekme, ama delisted'tan muaf tutmak için mevcut id'yi seenIds'e ekle
      if (freshById.has(stub.sourceListingId)) {
        seenIds.push(freshById.get(stub.sourceListingId)!)
        summary.listingsFound++
        continue
      }

      summary.listingsFound++

      const detail = await deps.fetcher.get(stub.detailUrl)
      const db = deps.detectBlock({
        html: detail.html,
        httpStatus: detail.status,
        expectedSelector: adapter.detailHint,
        foundListingCount: -1,
      })
      if (db.blocked) {
        summary.blocked = true
        summary.blockReason = db.reason
        break outer
      }

      let raw
      try {
        raw = adapter.parseDetailPage(detail.html, stub.detailUrl)
      } catch {
        summary.unparseable++
        continue
      }
      const normalized = normalizeRaw(raw)
      if (normalized.price === null && normalized.areaSqm === null) summary.unparseable++
      const geo = await geocodeListing(normalized, deps.geocodeDeps)

      if (args.dryRun) {
        console.log(JSON.stringify({ normalized, geo }, null, 2))
        continue
      }

      const res = await upsertListing(deps.client, { normalized, geo })
      seenIds.push(res.id)
      summary.listingsUpserted++
      dedupeCands.push({
        id: res.id,
        source: adapter.source,
        ilce: normalized.ilce,
        mahalle: normalized.mahalle,
        areaSqm: normalized.areaSqm,
        price: normalized.price,
        listingType: normalized.listingType,
        firstSeenAt: deps.now(),
      })
    }

    if (
      summary.listingsFound > 0 &&
      summary.unparseable / summary.listingsFound > cfg.unparseableAbortRatio
    ) {
      summary.blockReason = `unparseable oranı ${cfg.unparseableAbortRatio} üstünde — parser körelmiş olabilir`
      break
    }
  }

  if (!args.dryRun && !summary.blocked) {
    summary.delisted = await markDelistedExcept(
      deps.client,
      { source: adapter.source, il: args.il.toLocaleUpperCase('tr-TR'), listingTypes: types },
      seenIds,
    )
    // v1: yalnızca bu turdaki kayıtlar arası kopya. Cross-tur dedupe sonraki iterasyon.
    const links = findDupes(dedupeCands)
    await writeDupeLinks(deps.client, links)
    summary.dupes = links.size
  }

  if (!args.dryRun) {
    await deps.client.crawlRun.update({
      where: { id: run.id },
      data: {
        finishedAt: deps.now(),
        pagesFetched: summary.pagesFetched,
        listingsFound: summary.listingsFound,
        listingsUpserted: summary.listingsUpserted,
        blocked: summary.blocked,
        notes: summary.blockReason,
      },
    })
  }

  return summary
}

// ---- CLI ----
function parseArgs(argv: string[]) {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  const has = (k: string) => argv.includes(`--${k}`)
  return {
    portal: (get('portal') ?? 'sahibinden') as PortalSource,
    il: get('il') ?? 'trabzon',
    category: (get('category') ?? 'arsa') as ListingCategory,
    maxPages: Number(get('max-pages') ?? 20),
    dryRun: has('dry-run'),
    limit: get('limit') ? Number(get('limit')) : undefined,
    headful: has('headful'),
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const adapter = ADAPTERS[a.portal]
  if (!adapter) {
    console.error(`'${a.portal}' adapteri yok (v1: sahibinden|emlakjet)`)
    process.exit(1)
  }
  console.log(
    `crawl: ${a.portal} / ${a.il} / ${a.category} / maxPages=${a.maxPages}${a.dryRun ? ' (dry-run)' : ''}`,
  )
  const fetcher = await createFetcher(DEFAULT_CONFIG, { headful: a.headful })
  try {
    const summary = await runCrawl(
      { il: a.il, category: a.category, maxPages: a.maxPages, dryRun: a.dryRun, limit: a.limit },
      {
        adapter,
        client: prisma as unknown as RunDeps['client'],
        fetcher,
        geocodeDeps: defaultGeocodeDeps(),
        detectBlock,
        now: () => new Date(),
      },
    )
    console.table(summary)
    if (summary.blocked) {
      console.error(`\n⚠️  ENGELLENDİ: ${summary.blockReason}\n`)
      process.exitCode = 2
    }
  } finally {
    await fetcher.close()
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
