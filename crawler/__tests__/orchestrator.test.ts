import { runOrchestrator, buildQueue, maxRequestsFor, unmatchedOnlyTokens, type OrchestratorDeps } from '../orchestrator'
import type { RunSummary } from '../run'

function okSummary(): RunSummary {
  return {
    pagesFetched: 1, listingsFound: 0, listingsUpserted: 0, unparseable: 0, parseFailed: 0,
    failed: 0, delisted: 0, dupes: 0, neighborhoodUpserted: 0, neighborhoodFailed: 0,
    blocked: false, blockReason: null, complete: true,
  }
}

function blockedSummary(reason = 'engellendi'): RunSummary {
  return { ...okSummary(), blocked: true, blockReason: reason, complete: false }
}

function baseDeps(overrides: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    client: { crawlRun: { findMany: async () => [] } } as any,
    createFetcher: async () => ({ get: async () => ({ html: '', status: 200 }), requestCount: 0, close: async () => {} }),
    runCrawl: async () => okSummary(),
    geocodeDeps: { resolveMahalleCentroid: async () => null, isWithinTurkey: () => true },
    detectBlock: () => ({ blocked: false, reason: null }),
    now: () => new Date('2026-09-27T00:00:00Z'),
    workers: 1,
    maxPages: 5,
    resumeDays: 7,
    forceAll: false,
    ...overrides,
  }
}

describe('maxRequestsFor', () => {
  it('maxPages * 31 üzerine yuvarlar', () => {
    expect(maxRequestsFor(25)).toBe(775)
    expect(maxRequestsFor(1)).toBe(31)
  })
})

describe('unmatchedOnlyTokens', () => {
  it('bilinen il adı veya slug için boş liste döner', () => {
    expect(unmatchedOnlyTokens(['trabzon', 'sanliurfa'])).toEqual([])
  })
  it('bilinmeyen bir token listelenir', () => {
    expect(unmatchedOnlyTokens(['trabzon', 'atlantis'])).toEqual(['atlantis'])
  })
})

describe('buildQueue', () => {
  it('resume sorgusu 0 sayfalı koşuları "tamam" saymaz (pagesFetched > 0)', async () => {
    const findMany = jest.fn(async () => [])
    await buildQueue(baseDeps({ client: { crawlRun: { findMany } } as any }))
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pagesFetched: { gt: 0 } }),
      }),
    )
  })

  it('forceAll ise resume filtresi atlanır, findMany hiç çağrılmaz', async () => {
    const findMany = jest.fn(async () => [])
    const deps = baseDeps({ forceAll: true, client: { crawlRun: { findMany } } as any })
    const { queue, skippedResume } = await buildQueue(deps)
    expect(queue).toHaveLength(81)
    expect(skippedResume).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })

  it('yakın zamanda tamamlanmış iller kuyruktan atlanır (karışık-case CrawlRun.il dahil)', async () => {
    const deps = baseDeps({
      client: { crawlRun: { findMany: async () => [{ il: 'trabzon' }, { il: 'İstanbul' }] } } as any,
    })
    const { queue, skippedResume } = await buildQueue(deps)
    expect(queue.find((p) => p.tkgmName === 'Trabzon')).toBeUndefined()
    expect(queue.find((p) => p.tkgmName === 'İstanbul')).toBeUndefined()
    expect(queue).toHaveLength(79)
    expect(skippedResume.sort()).toEqual(['Trabzon', 'İstanbul'].sort())
  })

  it('only verilince sadece belirtilen iller adaya girer (isim veya slug ile)', async () => {
    const deps = baseDeps({ only: ['trabzon', 'sanliurfa'] })
    const { queue } = await buildQueue(deps)
    expect(queue.map((p) => p.tkgmName).sort()).toEqual(['Trabzon', 'Şanlıurfa'].sort())
  })

  it('source verilince findMany where.source o değeri alır', async () => {
    let capturedWhere: any
    const deps = baseDeps({
      source: 'sahibinden',
      client: {
        crawlRun: {
          findMany: async (args: any) => {
            capturedWhere = args.where
            return []
          },
        },
      } as any,
    })
    await buildQueue(deps)
    expect(capturedWhere.source).toBe('sahibinden')
  })

  it('source verilmezse findMany where.source varsayılan emlakjet olur', async () => {
    let capturedWhere: any
    const deps = baseDeps({
      client: {
        crawlRun: {
          findMany: async (args: any) => {
            capturedWhere = args.where
            return []
          },
        },
      } as any,
    })
    await buildQueue(deps)
    expect(capturedWhere.source).toBe('emlakjet')
  })
})

describe('runOrchestrator — ilçe bölme', () => {
  const ilPage = (total: number) =>
    `<html>Ara (${total.toLocaleString('tr-TR')} ilan)` +
    `<a href="/satilik-arsa/izmir-bornova">b</a><a href="/satilik-arsa/izmir-buca">c</a>` +
    `<a href="/satilik-arsa/istanbul-catalca">x</a><a href="/satilik-arsa/izmir/sahibinden">s</a>` +
    `<div class="searchResultsItem"></div></html>`
  const fetcherWith = (html: string) => async () => ({
    get: async () => ({ html, status: 200 }),
    requestCount: 0,
    close: async () => {},
  })

  it('toplam maxPages erişimini aşarsa il ilçelere bölünür (label, noDelist, yalnız o ilin ilçeleri)', async () => {
    const calls: any[] = []
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      maxPages: 5, // erişim 150
      createFetcher: fetcherWith(ilPage(6004)) as any,
      runCrawl: async (args: any) => {
        calls.push(args)
        return okSummary()
      },
    })
    const res = await runOrchestrator(deps)
    expect(calls.map((c) => c.ilUrlOverride)).toEqual(['izmir-bornova', 'izmir-buca'])
    expect(calls.every((c) => c.il === 'İzmir' && c.noDelist === true && c.maxPages === 50)).toBe(true)
    expect(calls.map((c) => c.label)).toEqual(['İzmir/izmir-bornova', 'İzmir/izmir-buca'])
    expect(res.completed).toEqual(['İzmir'])
  })

  it('toplam erişim içindeyse normal il taraması yapılır', async () => {
    const calls: any[] = []
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      maxPages: 5,
      createFetcher: fetcherWith(ilPage(100)) as any,
      runCrawl: async (args: any) => {
        calls.push(args)
        return okSummary()
      },
    })
    await runOrchestrator(deps)
    expect(calls).toHaveLength(1)
    expect(calls[0].ilUrlOverride).toBe('izmir')
    expect(calls[0].noDelist).toBeUndefined()
  })

  it('resume: resume penceresinde biten ilçe koşusu atlanır, diğerleri çalışır', async () => {
    const calls: string[] = []
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      maxPages: 5,
      client: {
        crawlRun: {
          findMany: async (a: any) => (a.where.il === 'İzmir/izmir-bornova' ? [{ il: a.where.il }] : []),
        },
      } as any,
      createFetcher: fetcherWith(ilPage(6004)) as any,
      runCrawl: async (args: any) => {
        calls.push(args.ilUrlOverride)
        return okSummary()
      },
    })
    await runOrchestrator(deps)
    expect(calls).toEqual(['izmir-buca'])
  })

  it('resume: sorgu yalnız engelsiz, sayfa çekmiş, bitmiş koşuları arar', async () => {
    let where: any
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      maxPages: 5,
      client: { crawlRun: { findMany: async (a: any) => ((where = a.where), []) } } as any,
      createFetcher: fetcherWith(ilPage(6004)) as any,
    })
    await runOrchestrator(deps)
    expect(where).toMatchObject({ blocked: false, pagesFetched: { gt: 0 }, finishedAt: { not: null } })
  })

  it('forceAll ise ilçe resume atlanır (hepsi yeniden çalışır)', async () => {
    const calls: string[] = []
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      forceAll: true,
      maxPages: 5,
      client: { crawlRun: { findMany: async () => [{ il: 'x' }] } } as any,
      createFetcher: fetcherWith(ilPage(6004)) as any,
      runCrawl: async (args: any) => (calls.push(args.ilUrlOverride), okSummary()),
    })
    await runOrchestrator(deps)
    expect(calls).toEqual(['izmir-bornova', 'izmir-buca'])
  })

  it('bölme modunda il-düzeyi resume uygulanmaz (eski il koşusu ilçe kapsamı değildir)', async () => {
    const findMany = jest.fn(async () => [{ il: 'İzmir' }])
    const { queue, skippedResume } = await buildQueue(
      baseDeps({ only: ['izmir'], splitDistricts: true, client: { crawlRun: { findMany } } as any }),
    )
    expect(queue.map((p) => p.tkgmName)).toEqual(['İzmir'])
    expect(skippedResume).toEqual([])
  })

  it('bir ilçe engellenirse il engelli raporlanır ve kalan ilçeler atlanır', async () => {
    let n = 0
    const deps = baseDeps({
      only: ['izmir'],
      splitDistricts: true,
      maxPages: 5,
      createFetcher: fetcherWith(ilPage(6004)) as any,
      runCrawl: async () => (++n === 1 ? blockedSummary('perimeterx') : okSummary()),
    })
    const res = await runOrchestrator(deps)
    expect(n).toBe(1)
    expect(res.blocked).toEqual([{ il: 'İzmir', reason: 'izmir-bornova: perimeterx' }])
  })
})

describe('runOrchestrator', () => {
  it('kuyruktaki tüm illeri worker sayısı kadar paralel tüketir', async () => {
    const processed: string[] = []
    const deps = baseDeps({
      only: ['trabzon', 'istanbul', 'izmir', 'ankara'],
      workers: 2,
      runCrawl: async (args: any) => {
        processed.push(args.il)
        await new Promise((r) => setTimeout(r, 0))
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.completed.sort()).toEqual(['Ankara', 'Trabzon', 'İstanbul', 'İzmir'].sort())
    expect(processed).toHaveLength(4)
    expect(result.stoppedEarly).toBe(false)
  })

  it('blocked dönen il result.blocked listesine girer, kuyruk devam eder', async () => {
    const deps = baseDeps({
      only: ['trabzon', 'istanbul'],
      workers: 1,
      runCrawl: async (args: any) => (args.il === 'Trabzon' ? blockedSummary('test-block') : okSummary()),
    })
    const result = await runOrchestrator(deps)
    expect(result.blocked).toEqual([{ il: 'Trabzon', reason: 'test-block' }])
    expect(result.completed).toEqual(['İstanbul'])
  })

  it('runCrawl fırlatırsa il blocked listesine hata mesajıyla eklenir, tur çökmez', async () => {
    const deps = baseDeps({
      only: ['trabzon', 'istanbul'],
      workers: 1,
      runCrawl: async (args: any) => {
        if (args.il === 'Trabzon') throw new Error('ağ koptu')
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.blocked).toEqual([{ il: 'Trabzon', reason: 'beklenmeyen hata: ağ koptu' }])
    expect(result.completed).toEqual(['İstanbul'])
  })

  it('%50\'den fazla blocked oranı minimum örnekten sonra erken durur', async () => {
    const only = ['trabzon', 'istanbul', 'izmir', 'ankara', 'bursa', 'antalya']
    const seen: string[] = []
    const deps = baseDeps({
      only,
      workers: 1,
      runCrawl: async (args: any) => {
        seen.push(args.il)
        if (seen.length <= 4) return blockedSummary('test')
        return okSummary()
      },
    })
    const result = await runOrchestrator(deps)
    expect(result.stoppedEarly).toBe(true)
    expect(seen.length).toBeLessThan(6)
  })

  it('kuyruk boşsa (hepsi resume ile atlandı) hiç worker/fetcher açmadan boş sonuç döner', async () => {
    const createFetcher = jest.fn()
    const deps = baseDeps({
      client: { crawlRun: { findMany: async () => [{ il: 'trabzon' }] } } as any,
      only: ['trabzon'],
      createFetcher,
    })
    const result = await runOrchestrator(deps)
    expect(result.completed).toEqual([])
    expect(result.skippedResume).toEqual(['Trabzon'])
    expect(createFetcher).not.toHaveBeenCalled()
  })
})
