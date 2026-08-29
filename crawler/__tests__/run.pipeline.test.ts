import { runCrawl, type RunDeps } from '../run'
import type { PortalAdapter } from '../adapters/types'

const fakeAdapter: PortalAdapter = {
  source: 'sahibinden',
  searchResultHint: 'searchResultsItem',
  detailHint: 'classifiedInfoList',
  searchUrls: () => ['http://s/1'],
  parseSearchPage: () => [
    { sourceListingId: 'A', detailUrl: 'http://s/ilan/A' },
    { sourceListingId: 'B', detailUrl: 'http://s/ilan/B' },
  ],
  parseDetailPage: (_html, url) => ({
    source: 'sahibinden',
    sourceListingId: url.endsWith('A') ? 'A' : 'B',
    sourceUrl: url,
    rawPrice: '10.000.000 TL',
    rawArea: '500 m²',
    rawType: 'Tarla',
    rawIl: 'Trabzon',
    rawIlce: 'Akçaabat',
    rawMahalle: 'Dürbinar',
    photoUrls: [],
    extra: {},
  }),
}

function fakeClient(seed: any[] = []) {
  const rows: any[] = [...seed]
  const spy = { delistFindMany: 0, updateMany: 0 }
  let seq = 0
  return {
    rows,
    spy,
    client: {
      marketListing: {
        findUnique: async ({ where }: any) =>
          rows.find(
            (r) =>
              r.source === where.source_sourceListingId.source &&
              r.sourceListingId === where.source_sourceListingId.sourceListingId,
          ) ?? null,
        create: async ({ data }: any) => {
          const row = { id: `id${++seq}`, status: 'active', firstSeenAt: new Date(), lastSeenAt: new Date(), ...data }
          rows.push(row)
          return row
        },
        update: async ({ where, data }: any) => {
          const row = rows.find((r) => r.id === where.id)
          Object.assign(row, data)
          return row
        },
        findMany: async ({ where }: any) => {
          // Ruling C: taze-ilan sorgusu — source + sourceListingId in [...]
          if (where.sourceListingId?.in) {
            return rows.filter(
              (r) => r.source === where.source && where.sourceListingId.in.includes(r.sourceListingId),
            )
          }
          // markDelistedExcept: scope içi active + id notIn seenIds
          spy.delistFindMany++
          return rows.filter(
            (r) =>
              r.source === where.source &&
              r.il === where.il &&
              r.status === 'active' &&
              where.listingType.in.includes(r.listingType) &&
              !where.id.notIn.includes(r.id),
          )
        },
        updateMany: async ({ where, data }: any) => {
          spy.updateMany++
          let n = 0
          for (const r of rows) if (where.id.in.includes(r.id)) {
            Object.assign(r, data)
            n++
          }
          return { count: n }
        },
      },
      marketListingPricePoint: { create: async () => ({}) },
      crawlRun: {
        create: async ({ data }: any) => ({ id: 'run1', ...data }),
        update: async () => ({}),
      },
    },
  }
}

function countingFetcher(html = '<div class="searchResultsItem"></div>') {
  const f = {
    calls: 0,
    requestCount: 0,
    get: async (_url: string) => {
      f.calls++
      return { html, status: 200 }
    },
    close: async () => {},
  }
  return f
}

describe('runCrawl', () => {
  it('arama → detay → normalize → geocode → upsert akışını yürütür', async () => {
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: {
        resolveMahalleCentroid: async () => ({ lat: 41, lng: 39.6 }),
        isWithinTurkey: () => true,
      },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.listingsUpserted).toBe(2)
    expect(rows).toHaveLength(2)
    expect(rows[0].geoPrecision).toBe('neighborhood')
    expect(summary.blocked).toBe(false)
  })

  it('blocked tespit edilince tur durur, delisted adımı atlanır', async () => {
    const { client } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: countingFetcher('just a moment'),
      geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
      detectBlock: () => ({ blocked: true, reason: 'cloudflare challenge' }),
      now: () => new Date(),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.blocked).toBe(true)
    expect(summary.listingsUpserted).toBe(0)
  })

  it('dry-run DB yazmaz', async () => {
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date(),
    }
    await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: true, limit: 1 }, deps)
    expect(rows).toHaveLength(0)
  })

  it('taze (lastSeenAt = now) bir stub tekrar detay-fetch edilmez, delisted sayılmaz', async () => {
    const NOW = new Date('2026-08-29T00:00:00Z')
    const { client, rows } = fakeClient([
      {
        id: 'existingA',
        source: 'sahibinden',
        sourceListingId: 'A',
        status: 'active',
        il: 'TRABZON',
        listingType: 'tarla',
        lastSeenAt: NOW,
      },
    ])
    const fetcher = countingFetcher()
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher,
      geocodeDeps: {
        resolveMahalleCentroid: async () => ({ lat: 41, lng: 39.6 }),
        isWithinTurkey: () => true,
      },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => NOW,
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)

    // 1 arama + 1 detay (yalnız B) = 2; taze A için 3. istek YAPILMAZ
    expect(fetcher.calls).toBe(2)
    expect(summary.listingsFound).toBe(2)
    expect(summary.listingsUpserted).toBe(1)
    // A yeniden yazılmadı, yeni satır yalnız B
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.sourceListingId === 'B')).toBe(true)
    // taze A'nın mevcut id'si seenIds'e girdiği için delisted OLMADI
    expect(rows.find((r) => r.id === 'existingA').status).toBe('active')
  })

  it('unparseable-abort tripince blocked=true, delisted + dedupe ATLANIR', async () => {
    // parser körelmiş senaryosu: her detay parse hata veriyor → unparseable oranı 1.0
    const rotAdapter: PortalAdapter = {
      ...fakeAdapter,
      parseSearchPage: () => [
        { sourceListingId: 'X1', detailUrl: 'http://s/ilan/X1' },
        { sourceListingId: 'X2', detailUrl: 'http://s/ilan/X2' },
        { sourceListingId: 'X3', detailUrl: 'http://s/ilan/X3' },
      ],
      parseDetailPage: () => {
        throw new Error('DOM değişmiş — parse edilemedi')
      },
    }
    // scope içinde önceden active bir kayıt: yanlış delisting'e aday
    const { client, rows, spy } = fakeClient([
      { id: 'old1', source: 'sahibinden', sourceListingId: 'OLD', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const deps: RunDeps = {
      adapter: rotAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-30'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)

    expect(summary.blocked).toBe(true)
    expect(summary.blockReason).toMatch(/parser|unparseable/i)
    expect(summary.unparseable).toBe(3)
    // KRİTİK: yarım tur → delisted + dedupe adımları çalışmadı
    expect(spy.delistFindMany).toBe(0)
    expect(spy.updateMany).toBe(0)
    expect(rows.find((r) => r.id === 'old1').status).toBe('active')
  })
})
