import { after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { verifySignature } from '@/lib/whatsapp/verifySignature'
import { parseInbound } from '@/lib/whatsapp/parseInbound'
import { handleMessage, type HandleDeps } from '@/lib/whatsapp/handleMessage'
import { createPrismaConversationStore } from '@/lib/whatsapp/conversation'
import { ruleBasedUnderstanding } from '@/lib/whatsapp/understanding'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { buildDegerCard, type AreaStatRecord } from '@/lib/deger/card'
import { fetchParcelByAdaParsel, fetchParcelByPoint } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { prisma } from '@/lib/prisma'
import type { ComparableListing } from '@/lib/deger/comparables'

export const runtime = 'nodejs'

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export async function GET(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const u = new URL(req.url)
  if (
    u.searchParams.get('hub.mode') === 'subscribe' &&
    safeEqual(u.searchParams.get('hub.verify_token') ?? '', config.verifyToken)
  ) {
    return new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('forbidden', { status: 403 })
}

function buildHandleDeps(): HandleDeps {
  const config = readWhatsappConfig()
  // NOTE: /api/deger/kart ile paralel deps — 5b'de ortak modüle çıkarılabilir.
  const cardDeps = {
    fetchParcelByPoint,
    fetchParcelByAdaParsel,
    buildRiskSnapshot,
    findAreaStats: async (il: string, ilce: string, mahalle: string): Promise<AreaStatRecord[]> => {
      const rows = await prisma.areaPriceStat.findMany({
        where: { il, OR: [{ ilce: null, mahalle: null }, { ilce, mahalle: null }, { ilce, mahalle }] },
        select: { scope: true, medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
      })
      return rows as AreaStatRecord[]
    },
    findAreaTrend: async () => [],
    findListingsNear: async (il: string, ilce: string): Promise<ComparableListing[]> => {
      const rows = await prisma.marketListing.findMany({
        where: {
          status: 'active',
          lat: { not: null },
          lng: { not: null },
          listingType: { in: [...ARSA_LISTING_TYPES] },
        },
        select: {
          id: true, pricePerSqm: true, areaSqm: true, price: true, lat: true, lng: true,
          geoPrecision: true, listedAt: true, source: true, sourceUrl: true, listingType: true, il: true, ilce: true,
        },
        orderBy: [{ listedAt: 'desc' }, { id: 'asc' }],
        take: 2000,
      })
      return rows.filter(
        (r) => r.il != null && r.ilce != null && normalizeAreaName(r.il) === il && normalizeAreaName(r.ilce) === ilce,
      ) as unknown as ComparableListing[]
    },
    findNeighborhood: async (il: string, ilce: string, mahalle: string) => {
      const row = await prisma.neighborhood.findUnique({
        where: { il_ilce_mahalle: { il, ilce, mahalle } },
        select: { geojson: true },
      })
      return row ? { geojson: row.geojson as unknown } : null
    },
  }
  const nk = (il: string, ilce: string, mahalle: string) => ({
    il: normalizeAreaName(il),
    ilce: normalizeAreaName(ilce),
    mahalle: normalizeAreaName(mahalle),
  })
  return {
    store: createPrismaConversationStore(prisma),
    understanding: ruleBasedUnderstanding,
    resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi },
    buildCard: (mahalleId, ada, parsel) =>
      buildDegerCard({ kind: 'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: false }),
    sendText: createSendText({ fetch, config }),
    siteUrlFor: (f) =>
      `https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}`,
    hasSubscription: async (phone, il, ilce, mahalle) => {
      const k = nk(il, ilce, mahalle)
      const row = await prisma.whatsappSubscription.findUnique({
        where: { phone_il_ilce_mahalle: { phone, ...k } },
        select: { id: true },
      })
      return !!row
    },
    upsertSubscription: async (phone, area) => {
      const k = nk(area.il, area.ilce, area.mahalle)
      await prisma.whatsappSubscription.upsert({
        where: { phone_il_ilce_mahalle: { phone, ...k } },
        create: { phone, ...k },
        update: {},
      })
    },
    deleteSubscriptions: async (phone) => {
      const r = await prisma.whatsappSubscription.deleteMany({ where: { phone } })
      return r.count
    },
  }
}

export async function POST(req: Request): Promise<Response> {
  const config = readWhatsappConfig()
  const raw = await req.text()
  if (!verifySignature(raw, config.appSecret, req.headers.get('x-hub-signature-256'))) {
    return new Response('forbidden', { status: 403 })
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('ok', { status: 200 })
  }
  const messages = parseInbound(payload)
  for (const m of messages) {
    after(async () => {
      try {
        await handleMessage(m, buildHandleDeps())
      } catch (e) {
        console.error('[wa] handle', e)
      }
    })
  }
  return new Response('ok', { status: 200 })
}
