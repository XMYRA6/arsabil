import { DEFAULT_CONFIG, type CrawlConfig } from './config'
import { sahibindenAdapter } from './adapters/sahibinden'
import { emlakjetAdapter } from './adapters/emlakjet'
import type { PortalAdapter, PortalSource, ListingCategory, ListingType } from './adapters/types'
import { normalizeRaw } from './pipeline/normalize'
import { geocodeListing, defaultGeocodeDeps, type GeocodeDeps } from './pipeline/geocode'
import { findDupes, type DedupeCandidate } from './pipeline/dedupe'
import { upsertListing, markDelistedExcept, writeDupeLinks, upsertNeighborhood, type UpsertClient } from './pipeline/upsert'
import { detectBlock, detectHardBlock, type BlockCheckInput, type BlockResult } from './fetcher/blockDetector'
import { createFetcher } from './fetcher/browser'

// Ruling A — v1 kapsamı: yalnızca sahibinden + emlakjet. hepsiemlak adapteri yok (ertelendi).
const ADAPTERS: Partial<Record<PortalSource, PortalAdapter>> = {
  sahibinden: sahibindenAdapter,
  emlakjet: emlakjetAdapter,
}
const ARSA_TYPES: ListingType[] = ['arsa', 'tarla', 'bag', 'bahce', 'zeytinlik', 'arazi']
// I5: 'diger' HİÇBİR kategori kapsamında değil. Sınıflandırılamayan bir ilan
// HEM arsa HEM konut taraması tarafından delist edilebilir olmamalı — aksi hâlde
// arsa/konut turları arasında status flip-flop olur.
const KONUT_TYPES: ListingType[] = ['konut', 'ticari']

export interface RunArgs {
  il: string
  category: ListingCategory
  maxPages: number
  dryRun: boolean
  limit?: number
  /** Verilirse adapter.searchUrls() bu değeri alır (URL slug), args.il DB scope/delisting/geocode için değişmeden kalır. */
  ilUrlOverride?: string
  /** Detay sayfası çekme; arama kartındaki veriyi kullan (kart yoksa normal detay-fetch). */
  fast?: boolean
}

export interface RunSummary {
  pagesFetched: number
  listingsFound: number
  listingsUpserted: number
  /** parse hatası + parse OK ama fiyat & alan yok — rapor içindir. */
  unparseable: number
  /** yalnız gerçek parse hatası (ilan seenIds'e GİRMEDİ) — abort oranını bu sürer. */
  parseFailed: number
  /** ilan-başı beklenmeyen hata (fetch/DB/geo) — konteynıra alındı, tur devam etti. */
  failed: number
  delisted: number
  dupes: number
  /** mahalle sınır poligonu upsert'i başarılı — rapor içindir. */
  neighborhoodUpserted: number
  /** mahalle sınır upsert'i hata verdi (ilan akışı yine devam etti). */
  neighborhoodFailed: number
  blocked: boolean
  blockReason: string | null
  /** arama döngüsü sonuçların gerçek tükenmesiyle bitti mi? Sadece bu true iken delist + dedupe çalışır. */
  complete: boolean
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

function isCapError(e: unknown): boolean {
  return e instanceof Error && /maxRequestsPerRun/.test(e.message)
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
    parseFailed: 0,
    failed: 0,
    delisted: 0,
    dupes: 0,
    neighborhoodUpserted: 0,
    neighborhoodFailed: 0,
    blocked: false,
    blockReason: null,
    complete: false,
  }

  const run = args.dryRun
    ? { id: 'dry' }
    : await deps.client.crawlRun.create({
        data: { source: adapter.source, il: args.il, category: args.category, startedAt: deps.now() },
      })

  const seenIds: string[] = []
  const seenStubIds = new Set<string>() // arama sayfalarında görülen ilan id'leri (sarma tespiti)
  const dedupeCands: DedupeCandidate[] = []
  // bu turda dokunulan (ilçe, mahalle) çiftleri — cross-portal dedupe sorgusu için (C2).
  const touchedAreas = new Set<string>()
  let rethrow: unknown = null

  try {
    const searchUrls = adapter.searchUrls(args.ilUrlOverride ?? args.il, args.category, args.maxPages)

    outer: for (let pageIdx = 0; pageIdx < searchUrls.length; pageIdx++) {
      const url = searchUrls[pageIdx]
      const { html, status } = await deps.fetcher.get(url)
      summary.pagesFetched++
      const stubs = adapter.parseSearchPage(html)

      // C3 — 1. sayfadan SONRA 0 stub = sayfalama tükenmiş OLABİLİR. Ama önce
      // "sert" engeli (HTTP 403/429/5xx + challenge kalıpları) ele — 0 stub'lu bir
      // challenge/403 sayfasını "tükendi" sanıp complete=true yapmak kitlesel yanlış
      // delisting'e yol açardı (G1). Sadece temiz 200 + challenge yok = gerçek tükenme.
      if (stubs.length === 0 && pageIdx > 0) {
        const hard = detectHardBlock(html, status)
        if (hard.blocked) {
          summary.blocked = true
          summary.blockReason = hard.reason
          break
        }
        summary.complete = true
        break
      }

      // Boş il: temiz 200 + challenge yok + 0 ilan + il breadcrumb'ı var → engel DEĞİL, o ilde ilan yok.
      // complete=false kalır → delist/dedupe atlanır (yanlış pozitifte toplu delisting riski yok).
      if (
        stubs.length === 0 &&
        pageIdx === 0 &&
        adapter.isEmptyResults?.(html) &&
        !detectHardBlock(html, status).blocked
      ) {
        break
      }

      // Sayfalama sarması: son sayfadan sonra portal 1. sayfaya yönlendirir (Emlakjet ?sayfa=N → 301).
      // Sayfadaki TÜM ilanlar bu turda zaten görüldüyse sonuçlar tükendi; boşa sayfa gezme.
      if (pageIdx > 0 && stubs.length > 0 && stubs.every((st) => seenStubIds.has(st.sourceListingId))) {
        const hard = detectHardBlock(html, status)
        if (hard.blocked) {
          summary.blocked = true
          summary.blockReason = hard.reason
        } else {
          summary.complete = true
        }
        break
      }
      for (const st of stubs) seenStubIds.add(st.sourceListingId)

      // Ruling B — engel göstergesi adapterden gelir. (pageIdx 0 + 0 ilan → soft-block.)
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
      for (const row of existing) {
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

        // I1 — ilan-başı hata konteynırı: fetch→detectBlock→parse→normalize→geocode→upsert
        // hepsi tek try içinde. Hata → failed++, continue. İSTİSNA: detectBlock "blocked"
        // → break outer (yutulmaz); cap hatası → yeniden fırlat (dış catch yakalar).
        try {
          let detail: { html: string; status: number } | null = null
          if (!(args.fast && stub.card)) {
            detail = await deps.fetcher.get(stub.detailUrl)
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
          }

          let raw
          try {
            raw = detail
              ? adapter.parseDetailPage(detail.html, stub.detailUrl)
              : { ...stub.card!, rawIl: stub.card!.rawIl ?? args.il }
          } catch {
            // gerçek parse hatası — ilan seenIds'e GİRMEDİ (abort oranını süren hazard).
            summary.parseFailed++
            summary.unparseable++
            continue
          }
          // I7 — boş sourceListingId gerçek bir findUnique anahtarına dönüşüp
          // farklı ilanları (source,'') üstünde çakıştırır.
          if (!raw.sourceListingId) {
            summary.parseFailed++
            summary.unparseable++
            continue
          }

          const normalized = normalizeRaw(raw)
          // parse OK ama fiyat & alan yok: upsert'lenir, seenIds'te — hazard YOK, oranı sürmez.
          if (normalized.price === null && normalized.areaSqm === null) summary.unparseable++
          const geo = await geocodeListing(normalized, deps.geocodeDeps)

          if (args.dryRun) {
            console.log(JSON.stringify({ normalized, geo }, null, 2))
            continue
          }

          const res = await upsertListing(deps.client, { normalized, geo })

          // Emsal harita katmanı: mahalle sınır poligonu + risk skoru upsert'i.
          // İlan akışını BLOKLAMAZ — delisting/dedupe güvenlik kilidinden bağımsız (yalnız upsert).
          if (
            normalized.il && normalized.ilce && normalized.mahalle &&
            raw.neighborhoodGeojson
          ) {
            try {
              await upsertNeighborhood(deps.client, {
                il: normalized.il,
                ilce: normalized.ilce,
                mahalle: normalized.mahalle,
                geojson: raw.neighborhoodGeojson,
                riskScore: raw.neighborhoodRiskScore ?? null,
                source: adapter.source,
              })
              summary.neighborhoodUpserted++
            } catch (e) {
              summary.neighborhoodFailed++
              console.error('neighborhood upsert atlandı:', e)
            }
          }

          seenIds.push(res.id)
          summary.listingsUpserted++
          if (normalized.ilce && normalized.mahalle) {
            touchedAreas.add(JSON.stringify([normalized.ilce, normalized.mahalle]))
          }
          dedupeCands.push({
            id: res.id,
            source: adapter.source,
            ilce: normalized.ilce,
            mahalle: normalized.mahalle,
            areaSqm: normalized.areaSqm,
            price: normalized.price,
            listingType: normalized.listingType,
            // G3 — satırın GERÇEK firstSeenAt'i (yeni kayıtta ~now, mevcut kayıtta
            // eski değer); deps.now() vermek her taze taramayı "yeni" sayıp
            // dupeOfId yönünü ters çeviriyordu.
            firstSeenAt: res.firstSeenAt,
          })
        } catch (err) {
          if (isCapError(err)) throw err
          summary.failed++
          continue
        }
      }

      // G2 — hem parse hataları HEM contained fault'lar oranı sürer (ikisinde de
      // ilan seenIds'e girmedi → gözlem eksik).
      const notObserved = summary.parseFailed + summary.failed
      if (
        summary.listingsFound > 0 &&
        notObserved / summary.listingsFound > cfg.unparseableAbortRatio
      ) {
        // Yarım/iptal tur: blocked=true ile işaretle — delisted + dedupe adımları
        // ATLANMALI (seenIds eksik; aksi hâlde kitlesel yanlış delisting olur).
        const pct = Math.round((notObserved / summary.listingsFound) * 100)
        summary.blocked = true
        summary.blockReason = `parser/fetch körelmiş olabilir — gözlenemeyen oran %${pct}, tur durduruldu (delisted/dedupe atlandı)`
        break
      }
    }

    // Delist + dedupe YALNIZCA kanıtlanmış-tam, engellenmemiş, limitsiz VE
    // tamamen temiz (hiç fault/parse hatası olmayan) turda çalışır (G2). Herhangi
    // bir fault → scope'u eksik gözledik → hiçbir şey delist edilmemeli.
    const cleanRun = summary.failed === 0 && summary.parseFailed === 0
    if (!args.dryRun && !summary.blocked && summary.complete && cleanRun) {
      // C2 — cross-portal dedupe adayları: bu turda dokunulan (ilçe,mahalle)
      // kümesinde, BAŞKA portaldan aktif satırları da aday havuzuna al.
      if (touchedAreas.size > 0) {
        const orClauses = [...touchedAreas].map((k) => {
          const [ilce, mahalle] = JSON.parse(k) as [string, string]
          return { ilce, mahalle }
        })
        const crossRows = await deps.client.marketListing.findMany({
          // G5 — il-scope şart: başka ildeki aynı adlı mahalleleri (MERKEZ,
          // CUMHURİYET …) eşleştirmesin.
          where: {
            status: 'active',
            il: args.il.toLocaleUpperCase('tr-TR'),
            source: { not: adapter.source },
            OR: orClauses,
          },
        })
        for (const r of crossRows) {
          dedupeCands.push({
            id: r.id,
            source: r.source,
            ilce: r.ilce,
            mahalle: r.mahalle,
            areaSqm: r.areaSqm,
            price: r.price,
            listingType: r.listingType,
            firstSeenAt: new Date(r.firstSeenAt),
          })
        }
      }

      summary.delisted = await markDelistedExcept(
        deps.client,
        { source: adapter.source, il: args.il.toLocaleUpperCase('tr-TR'), listingTypes: types },
        seenIds,
      )
      const links = findDupes(dedupeCands)
      // H2 — gerçekten yazılan link sayısı (writeDupeLinks self-link/döngü/zaten-linkli
      // satırı atlar; stabil re-run'da 0 yazar).
      summary.dupes = await writeDupeLinks(deps.client, links)
    }
  } catch (err) {
    if (isCapError(err)) {
      // yarım tur → delist/dedupe atlandı, CrawlRun kapatılır
      summary.blocked = true
      summary.blockReason = `maxRequestsPerRun (${cfg.maxRequestsPerRun}) aşıldı — tur durduruldu`
      summary.complete = false
    } else {
      // gerçekten beklenmeyen hata: finally'de kaydet, sonra yeniden fırlat
      summary.blocked = true
      summary.blockReason =
        (summary.blockReason ? summary.blockReason + ' · ' : '') +
        `beklenmeyen hata: ${err instanceof Error ? err.message : String(err)}`
      rethrow = err
    }
  } finally {
    if (!args.dryRun) {
      // CrawlRun'da unparseable/parseFailed/failed/complete için kolon yok → notes'a katla.
      const delistSkipReason = summary.blocked
        ? 'blocked'
        : !summary.complete
          ? 'not-complete'
          : summary.failed > 0 || summary.parseFailed > 0
            ? 'not-clean'
            : null
      const counters =
        ` · unparseable=${summary.unparseable} parseFailed=${summary.parseFailed}` +
        ` failed=${summary.failed} delisted=${summary.delisted} dupes=${summary.dupes}` +
        ` neighborhoodUpserted=${summary.neighborhoodUpserted} neighborhoodFailed=${summary.neighborhoodFailed}` +
        ` complete=${summary.complete}` +
        (delistSkipReason ? ` delistSkipped=${delistSkipReason}` : '')
      const notes = (summary.blockReason ?? 'ok') + counters
      // G6 — CrawlRun.update DB hatası orijinal hatayı/summary'yi maskelemesin.
      try {
        await deps.client.crawlRun.update({
          where: { id: run.id },
          data: {
            finishedAt: deps.now(),
            pagesFetched: summary.pagesFetched,
            listingsFound: summary.listingsFound,
            listingsUpserted: summary.listingsUpserted,
            blocked: summary.blocked,
            notes,
          },
        })
      } catch (updErr) {
        console.error('crawlRun.update başarısız (yok sayıldı):', updErr)
      }
    }
  }

  if (rethrow) throw rethrow
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
  // I10 — prisma yalnız gerçek çalıştırmada yüklensin (test import'u PrismaClient kurmasın).
  const { prisma } = await import('@/lib/prisma')
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
