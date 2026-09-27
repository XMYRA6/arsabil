import { runCrawl, type RunDeps } from '../run'
import type { PortalAdapter, RawListing } from '../adapters/types'

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

function fakeClient(seed: any[] = [], opts: { neighborhoodThrows?: boolean } = {}) {
  const rows: any[] = [...seed]
  const spy = { delistFindMany: 0, updateMany: 0, crossFindMany: 0, crawlRunUpdate: null as any, neighborhoodUpsert: 0 }
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
          // writeDupeLinks: id in [...]
          if (where.id?.in) {
            return rows.filter((r) => where.id.in.includes(r.id))
          }
          // C2: cross-portal dedupe adayları — source.not + OR[{ilce,mahalle}] + il
          if (where.OR && where.source?.not !== undefined) {
            spy.crossFindMany++
            return rows.filter(
              (r) =>
                r.status === 'active' &&
                r.source !== where.source.not &&
                r.il === where.il &&
                where.OR.some((o: any) => o.ilce === r.ilce && o.mahalle === r.mahalle),
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
      neighborhood: {
        upsert: async () => {
          if (opts.neighborhoodThrows) throw new Error('neighborhood upsert DB hatası')
          spy.neighborhoodUpsert++
          return {}
        },
      },
      crawlRun: {
        create: async ({ data }: any) => ({ id: 'run1', ...data }),
        update: async (a: any) => {
          spy.crawlRunUpdate = a.data
          return {}
        },
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

const geoOk = { resolveMahalleCentroid: async () => ({ lat: 41, lng: 39.6 }), isWithinTurkey: () => true }
const geoNone = { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true }

/** Sayfa 1 dolu, sayfa 2 boş → sayfalama tükendi (complete=true). */
function paginatedAdapter(stubs: Array<{ sourceListingId: string; detailUrl: string }>): PortalAdapter {
  return {
    ...fakeAdapter,
    searchUrls: () => ['http://s/1', 'http://s/2'],
    parseSearchPage: (html: string) => (html.includes('EMPTY') ? [] : stubs),
  }
}
function twoPageFetcher() {
  const f = {
    calls: 0,
    requestCount: 0,
    get: async (url: string) => {
      f.calls++
      const html = url === 'http://s/2' ? '<div class="searchResultsItem">EMPTY</div>' : '<div class="searchResultsItem"></div>'
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
      geocodeDeps: geoOk,
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
      geocodeDeps: geoNone,
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
      geocodeDeps: geoNone,
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
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => NOW,
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)

    expect(fetcher.calls).toBe(2)
    expect(summary.listingsFound).toBe(2)
    expect(summary.listingsUpserted).toBe(1)
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.sourceListingId === 'B')).toBe(true)
    expect(rows.find((r) => r.id === 'existingA').status).toBe('active')
  })

  it('unparseable-abort tripince blocked=true, delisted + dedupe ATLANIR', async () => {
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
    const { client, rows, spy } = fakeClient([
      { id: 'old1', source: 'sahibinden', sourceListingId: 'OLD', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const deps: RunDeps = {
      adapter: rotAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoNone,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-30'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)

    expect(summary.blocked).toBe(true)
    expect(summary.blockReason).toMatch(/parser|unparseable/i)
    expect(summary.unparseable).toBe(3)
    expect(summary.parseFailed).toBe(3)
    expect(spy.delistFindMany).toBe(0)
    expect(spy.updateMany).toBe(0)
    expect(rows.find((r) => r.id === 'old1').status).toBe('active')
  })

  // ---- F1: complete flag ----

  it('F1(a): --limit turu complete=false, markDelistedExcept çağrılmaz, kapsam-içi aktif satır active kalır', async () => {
    const { client, rows, spy } = fakeClient([
      { id: 'scopeActive', source: 'sahibinden', sourceListingId: 'ZZ', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false, limit: 1 }, deps)
    expect(summary.complete).toBe(false)
    expect(spy.delistFindMany).toBe(0)
    expect(summary.delisted).toBe(0)
    expect(rows.find((r) => r.id === 'scopeActive').status).toBe('active')
  })

  it('F1(b): sayfa 2 boş dönerse döngü biter, complete=true, blocked=false, delist ÇALIŞIR', async () => {
    const { client, rows, spy } = fakeClient([
      { id: 'stale1', source: 'sahibinden', sourceListingId: 'GONE', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const deps: RunDeps = {
      adapter: paginatedAdapter([{ sourceListingId: 'A', detailUrl: 'http://s/ilan/A' }]),
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.complete).toBe(true)
    expect(summary.blocked).toBe(false)
    expect(spy.delistFindMany).toBe(1)
    expect(summary.delisted).toBe(1)
    expect(rows.find((r) => r.id === 'stale1').status).toBe('delisted')
  })

  it('F1(c): tüm maxPages son sayfası hâlâ doluysa complete=false, delist atlanır', async () => {
    const { client, spy } = fakeClient()
    const fullAdapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: () => ['http://s/1', 'http://s/2'],
      parseSearchPage: () => [{ sourceListingId: 'A', detailUrl: 'http://s/ilan/A' }],
    }
    const deps: RunDeps = {
      adapter: fullAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.complete).toBe(false)
    expect(spy.delistFindMany).toBe(0)
  })

  it('G1: sayfa 2 challenge dönerse tükenme SANILMAZ — blocked=true, complete=false, delist YOK', async () => {
    const { client, rows, spy } = fakeClient([
      { id: 'live1', source: 'sahibinden', sourceListingId: 'LIVE', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const g1Adapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: () => ['http://s/1', 'http://s/2'],
      // challenge sayfasında searchResultsItem yok → 0 stub
      parseSearchPage: (html: string) =>
        html.includes('searchResultsItem') ? [{ sourceListingId: 'A', detailUrl: 'http://s/ilan/A' }] : [],
    }
    const g1Fetcher = {
      calls: 0,
      requestCount: 0,
      get: async (url: string) => {
        g1Fetcher.calls++
        return url === 'http://s/2'
          ? { html: '<html><body>Just a moment... checking your browser</body></html>', status: 200 }
          : { html: '<div class="searchResultsItem"></div>', status: 200 }
      },
      close: async () => {},
    }
    const deps: RunDeps = {
      adapter: g1Adapter,
      client: client as any,
      fetcher: g1Fetcher,
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.blocked).toBe(true)
    expect(summary.complete).toBe(false)
    expect(spy.delistFindMany).toBe(0)
    expect(rows.find((r) => r.id === 'live1').status).toBe('active')
  })

  it('G2: contained fault olan tur clean değil — complete=true olsa bile delist YAPILMAZ', async () => {
    const { client, rows, spy } = fakeClient([
      { id: 'stale2', source: 'sahibinden', sourceListingId: 'GONE2', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') },
    ])
    const g2Adapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: () => ['http://s/1', 'http://s/2'],
      parseSearchPage: (html: string) =>
        html.includes('EMPTY')
          ? []
          : ['A', 'B', 'C', 'D', 'BOOM'].map((id) => ({ sourceListingId: id, detailUrl: `http://s/ilan/${id}` })),
      parseDetailPage: (_html, url) => {
        const id = url.split('/').pop()!
        return {
          source: 'sahibinden',
          sourceListingId: id,
          sourceUrl: url,
          rawPrice: '10.000.000 TL',
          rawArea: '500 m²',
          rawType: 'Tarla',
          rawIl: 'Trabzon',
          rawIlce: 'Akçaabat',
          rawMahalle: id === 'BOOM' ? 'BOOM' : 'Dürbinar',
          photoUrls: [],
          extra: {},
        } as RawListing
      },
    }
    const deps: RunDeps = {
      adapter: g2Adapter,
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: {
        resolveMahalleCentroid: async (_il: string, _ilce: string, mah: string) => {
          if (mah === 'BOOM') throw new Error('geocode çöktü')
          return { lat: 41, lng: 39.6 }
        },
        isWithinTurkey: () => true,
      },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.complete).toBe(true)
    expect(summary.blocked).toBe(false) // 1/5 = %20 < %30
    expect(summary.failed).toBe(1)
    expect(spy.delistFindMany).toBe(0) // clean değil → delist atlandı
    expect(rows.find((r) => r.id === 'stale2').status).toBe('active')
  })

  // ---- F2: cross-portal dedupe ----

  it('F2: başka portaldaki eşleşen aktif satır dedupe adayına katılır, dupes=1', async () => {
    const { client, rows, spy } = fakeClient([
      {
        id: 'ej1',
        source: 'emlakjet',
        sourceListingId: 'E1',
        status: 'active',
        il: 'TRABZON',
        ilce: 'AKÇAABAT',
        mahalle: 'DÜRBİNAR',
        listingType: 'tarla',
        areaSqm: 500,
        price: 10_000_000,
        firstSeenAt: new Date('2025-01-01'),
        lastSeenAt: new Date('2025-01-01'),
      },
    ])
    const deps: RunDeps = {
      adapter: paginatedAdapter([{ sourceListingId: 'A', detailUrl: 'http://s/ilan/A' }]),
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.complete).toBe(true)
    expect(spy.crossFindMany).toBe(1)
    expect(summary.dupes).toBe(1)
    const scraped = rows.find((r) => r.source === 'sahibinden' && r.sourceListingId === 'A')
    expect(scraped.dupeOfId).toBe('ej1') // yeni olan (sahibinden) eski olana (emlakjet) işaret eder
  })

  it('G3: yön kararı satırın GERÇEK firstSeenAt\'ine göre — eski scraped satır dupe olmaz', async () => {
    // s1: DB'de 2024'ten beri var (re-scrape → update). e1: 2025'ten beri, seed.
    // Doğru sonuç: e1 (yeni) → s1 (eski). s1.dupeOfId null kalmalı.
    const { client, rows } = fakeClient([
      {
        id: 's1', source: 'sahibinden', sourceListingId: 'S1', status: 'active',
        il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DÜRBİNAR', listingType: 'tarla',
        areaSqm: 500, price: 10_000_000,
        firstSeenAt: new Date('2024-01-01'), lastSeenAt: new Date('2024-01-01'),
      },
      {
        id: 'e1', source: 'emlakjet', sourceListingId: 'E1', status: 'active',
        il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DÜRBİNAR', listingType: 'tarla',
        areaSqm: 500, price: 10_000_000,
        firstSeenAt: new Date('2025-01-01'), lastSeenAt: new Date('2025-01-01'),
      },
    ])
    const g3Adapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: () => ['http://s/1', 'http://s/2'],
      parseSearchPage: (html: string) =>
        html.includes('EMPTY') ? [] : [{ sourceListingId: 'S1', detailUrl: 'http://s/ilan/S1' }],
      parseDetailPage: (_html, url) => ({
        source: 'sahibinden',
        sourceListingId: 'S1',
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
    const deps: RunDeps = {
      adapter: g3Adapter,
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.complete).toBe(true)
    expect(summary.dupes).toBe(1)
    expect(rows.find((r) => r.id === 'e1').dupeOfId).toBe('s1') // yeni → eski
    expect(rows.find((r) => r.id === 's1').dupeOfId ?? null).toBeNull() // eski scraped satır kanonik
  })

  // ---- F3: per-listing error containment ----

  it('F3: bir stub için geocode fırlatır → tur biter, failed=1, diğerleri upsert, blocked=false', async () => {
    const threeStub: PortalAdapter = {
      ...fakeAdapter,
      parseSearchPage: () => [
        { sourceListingId: 'A', detailUrl: 'http://s/ilan/A' },
        { sourceListingId: 'BOOM', detailUrl: 'http://s/ilan/BOOM' },
        { sourceListingId: 'C', detailUrl: 'http://s/ilan/C' },
        { sourceListingId: 'D', detailUrl: 'http://s/ilan/D' },
      ],
      parseDetailPage: (_html, url) => {
        const id = url.split('/').pop()!
        return {
          source: 'sahibinden',
          sourceListingId: id,
          sourceUrl: url,
          rawPrice: '10.000.000 TL',
          rawArea: '500 m²',
          rawType: 'Tarla',
          rawIl: 'Trabzon',
          rawIlce: 'Akçaabat',
          rawMahalle: id === 'BOOM' ? 'BOOM' : 'Dürbinar',
          photoUrls: [],
          extra: {},
        } as RawListing
      },
    }
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: threeStub,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: {
        resolveMahalleCentroid: async (_il: string, _ilce: string, mah: string) => {
          if (mah === 'BOOM') throw new Error('geocode servisi çöktü')
          return { lat: 41, lng: 39.6 }
        },
        isWithinTurkey: () => true,
      },
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.failed).toBe(1)
    expect(summary.listingsUpserted).toBe(3)
    expect(summary.blocked).toBe(false) // 1/4 = %25 < %30 abort eşiği
    expect(rows.filter((r) => r.source === 'sahibinden')).toHaveLength(3)
  })

  // ---- F4: cap reached → CrawlRun always closed ----

  it('F4: maxRequestsPerRun cap fırlatınca blocked=true, crawlRun.update finishedAt ile çağrılır, delist yok', async () => {
    const { client, spy } = fakeClient()
    const capFetcher = {
      calls: 0,
      requestCount: 0,
      get: async () => {
        throw new Error('maxRequestsPerRun (600) aşıldı — tur durduruluyor')
      },
      close: async () => {},
    }
    const deps: RunDeps = {
      adapter: fakeAdapter,
      client: client as any,
      fetcher: capFetcher,
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 5, dryRun: false }, deps)
    expect(summary.blocked).toBe(true)
    expect(summary.complete).toBe(false)
    expect(summary.blockReason).toMatch(/maxRequestsPerRun/)
    expect(spy.crawlRunUpdate).toBeTruthy()
    expect(spy.crawlRunUpdate.finishedAt).toBeInstanceOf(Date)
    expect(spy.crawlRunUpdate.blocked).toBe(true)
    expect(spy.delistFindMany).toBe(0)
  })

  // ---- F5: parsed-but-price-hidden does not trip the abort ratio ----

  it('F5: 3 ilan da parse OK ama fiyat gizli → abort tripmez, blocked=false, 3 upsert', async () => {
    const hiddenPriceAdapter: PortalAdapter = {
      ...fakeAdapter,
      parseSearchPage: () => [
        { sourceListingId: 'P1', detailUrl: 'http://s/ilan/P1' },
        { sourceListingId: 'P2', detailUrl: 'http://s/ilan/P2' },
        { sourceListingId: 'P3', detailUrl: 'http://s/ilan/P3' },
      ],
      parseDetailPage: (_html, url) => ({
        source: 'sahibinden',
        sourceListingId: url.split('/').pop()!,
        sourceUrl: url,
        rawPrice: 'Fiyat sorunuz',
        rawArea: undefined,
        rawType: 'Tarla',
        rawIl: 'Trabzon',
        rawIlce: 'Akçaabat',
        rawMahalle: 'Dürbinar',
        photoUrls: [],
        extra: {},
      }),
    }
    const { client } = fakeClient()
    const deps: RunDeps = {
      adapter: hiddenPriceAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.parseFailed).toBe(0)
    expect(summary.unparseable).toBe(3)
    expect(summary.blocked).toBe(false)
    expect(summary.listingsUpserted).toBe(3)
  })

  // ---- F9: empty sourceListingId rejected ----

  it('F9: parseDetailPage boş sourceListingId dönerse ilan atlanır, sayaçlar artar, upsert yok', async () => {
    const emptyIdAdapter: PortalAdapter = {
      ...fakeAdapter,
      parseSearchPage: () => [
        { sourceListingId: 'E', detailUrl: 'http://s/ilan/E' },
        { sourceListingId: 'A', detailUrl: 'http://s/ilan/A' },
        { sourceListingId: 'B', detailUrl: 'http://s/ilan/B' },
        { sourceListingId: 'C', detailUrl: 'http://s/ilan/C' },
      ],
      parseDetailPage: (_html, url) => ({
        source: 'sahibinden',
        sourceListingId: url.endsWith('E') ? '' : url.split('/').pop()!,
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
    const { client, rows } = fakeClient()
    const deps: RunDeps = {
      adapter: emptyIdAdapter,
      client: client as any,
      fetcher: countingFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false }, deps)
    expect(summary.parseFailed).toBe(1)
    expect(summary.unparseable).toBe(1)
    expect(summary.listingsUpserted).toBe(3)
    expect(rows.some((r) => r.sourceListingId === '')).toBe(false)
  })

  // ---- M6: neighborhood upsert görünürlüğü ----

  function neighborhoodAdapter(): PortalAdapter {
    return {
      ...fakeAdapter,
      searchUrls: () => ['http://s/1', 'http://s/2'],
      parseSearchPage: (html: string) =>
        html.includes('EMPTY') ? [] : [{ sourceListingId: 'A', detailUrl: 'http://s/ilan/A' }],
      parseDetailPage: (_html, url) => ({
        source: 'sahibinden',
        sourceListingId: 'A',
        sourceUrl: url,
        rawPrice: '10.000.000 TL',
        rawArea: '500 m²',
        rawType: 'Tarla',
        rawIl: 'Trabzon',
        rawIlce: 'Akçaabat',
        rawMahalle: 'Dürbinar',
        photoUrls: [],
        extra: {},
        neighborhoodGeojson: { type: 'MultiPolygon', coordinates: [] },
        neighborhoodRiskScore: 0.2,
      }),
    }
  }

  it('M6: neighborhoodGeojson taşıyan ilan → neighborhoodUpserted=1, CrawlRun notes\'a yazılır', async () => {
    const { client, spy } = fakeClient()
    const deps: RunDeps = {
      adapter: neighborhoodAdapter(),
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.neighborhoodUpserted).toBe(1)
    expect(summary.neighborhoodFailed).toBe(0)
    expect(spy.neighborhoodUpsert).toBe(1)
    expect(spy.crawlRunUpdate.notes).toMatch(/neighborhoodUpserted=1 neighborhoodFailed=0/)
  })

  it('M6: upsertNeighborhood fırlatırsa neighborhoodFailed=1, tur tamamlanır, delist yine değerlendirilir', async () => {
    const { client, rows, spy } = fakeClient(
      [{ id: 'stale9', source: 'sahibinden', sourceListingId: 'GONE9', status: 'active', il: 'TRABZON', listingType: 'tarla', lastSeenAt: new Date('2000-01-01') }],
      { neighborhoodThrows: true },
    )
    const deps: RunDeps = {
      adapter: neighborhoodAdapter(),
      client: client as any,
      fetcher: twoPageFetcher(),
      geocodeDeps: geoOk,
      detectBlock: () => ({ blocked: false, reason: null }),
      now: () => new Date('2026-08-29'),
    }
    const summary = await runCrawl({ il: 'trabzon', category: 'arsa', maxPages: 2, dryRun: false }, deps)
    expect(summary.neighborhoodFailed).toBe(1)
    expect(summary.neighborhoodUpserted).toBe(0)
    expect(summary.complete).toBe(true)
    expect(summary.failed).toBe(0) // neighborhood hatası ilan akışını bozmaz → tur clean
    expect(spy.delistFindMany).toBe(1) // delist yine değerlendirildi
    expect(summary.delisted).toBe(1)
    expect(rows.find((r) => r.id === 'stale9').status).toBe('delisted')
  })

  it('ilUrlOverride verilirse searchUrls çağrısı args.il yerine bunu alır', async () => {
    const { client } = fakeClient()
    let capturedArg: string | undefined
    const spyAdapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: (il) => {
        capturedArg = il
        return []
      },
    }
    await runCrawl(
      { il: 'Şanlıurfa', ilUrlOverride: 'sanliurfa', category: 'arsa', maxPages: 1, dryRun: false },
      {
        adapter: spyAdapter,
        client: client as any,
        fetcher: countingFetcher(),
        geocodeDeps: geoOk,
        detectBlock: () => ({ blocked: false, reason: null }),
        now: () => new Date('2026-09-27'),
      },
    )
    expect(capturedArg).toBe('sanliurfa')
  })

  it('ilUrlOverride verilmezse searchUrls args.il alır (mevcut davranış)', async () => {
    const { client } = fakeClient()
    let capturedArg: string | undefined
    const spyAdapter: PortalAdapter = {
      ...fakeAdapter,
      searchUrls: (il) => {
        capturedArg = il
        return []
      },
    }
    await runCrawl(
      { il: 'trabzon', category: 'arsa', maxPages: 1, dryRun: false },
      {
        adapter: spyAdapter,
        client: client as any,
        fetcher: countingFetcher(),
        geocodeDeps: geoOk,
        detectBlock: () => ({ blocked: false, reason: null }),
        now: () => new Date('2026-09-27'),
      },
    )
    expect(capturedArg).toBe('trabzon')
  })
})

