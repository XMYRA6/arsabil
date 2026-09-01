import { after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { verifySignature } from '@/lib/whatsapp/verifySignature'
import { parseInbound } from '@/lib/whatsapp/parseInbound'
import { handleMessage, type HandleDeps } from '@/lib/whatsapp/handleMessage'
import { createPrismaConversationStore } from '@/lib/whatsapp/conversation'
import { ruleBasedUnderstanding } from '@/lib/whatsapp/understanding'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { buildDegerCard } from '@/lib/deger/card'
import { createAnonCardDeps } from '@/lib/deger/anonCardDeps'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { prisma } from '@/lib/prisma'

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
  // Paylaşılan `DegerCardDeps` çekirdeği (/api/deger/kart ile ortak modül).
  // Bot trend göstermez → `findAreaTrend` her zaman boş.
  const cardDeps = {
    ...createAnonCardDeps(),
    findAreaTrend: async () => [],
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
