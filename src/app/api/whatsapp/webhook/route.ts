import { after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import OpenAI from 'openai'
import { readWhatsappConfig } from '@/lib/whatsapp/config'
import { verifySignature } from '@/lib/whatsapp/verifySignature'
import { parseInbound } from '@/lib/whatsapp/parseInbound'
import { runWhatsappAkifTurn, type AkifHandleDeps } from '@/lib/whatsapp/akifHandleMessage'
import { createPrismaConversationStore } from '@/lib/whatsapp/conversation'
import { WA_AKIF_TOOL_DEFS, validateArgsWa, dispatchToolWa, type WaDispatchDeps } from '@/lib/whatsapp/akifToolGateway'
import { AKIF_WHATSAPP_TOOL_POLICY, AKIF_WHATSAPP_PROJECT_POLICY } from '@/lib/whatsapp/akifToolPolicy'
import { buildMemoryContext } from '@/lib/akifProje/context'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSendText } from '@/lib/whatsapp/sendMessage'
import { buildDegerCard } from '@/lib/deger/card'
import { createAnonCardDeps } from '@/lib/deger/anonCardDeps'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { readAkifEnv, numEnv, createAkifModel } from '@/lib/ai/akif/openaiClient'
import { createAuditLogger, type AuditDb } from '@/lib/ai/akif/audit'
import { checkConversationBudget, checkMonthlyBudget } from '@/lib/ai/akif/costGuard'
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

function readWhatsappMonthlyBudgetUsd(): number {
  return numEnv(process.env.AKIF_WHATSAPP_MONTHLY_BUDGET_USD, 20)
}

function buildAkifWhatsappDeps(phone: string): AkifHandleDeps {
  const config = readWhatsappConfig()
  const env = readAkifEnv()
  const db = prisma as unknown as AuditDb & WaDispatchDeps['db']
  const audit = createAuditLogger(db, { conversationIdPrefix: 'wa:' })
  const openai = new OpenAI({ apiKey: env.apiKey })
  const model = createAkifModel({ client: openai, model: env.model, toolDefs: WA_AKIF_TOOL_DEFS })

  // Paylaşılan `DegerCardDeps` çekirdeği (5a/5b ile ortak, WhatsApp bot trend/demografi göstermez).
  const cardDeps = {
    ...createAnonCardDeps(),
    findAreaTrend: async () => [],
    findDistrictDemographics: async () => null,
  }
  const nk = (il: string, ilce: string, mahalle: string) => ({
    il: normalizeAreaName(il),
    ilce: normalizeAreaName(ilce),
    mahalle: normalizeAreaName(mahalle),
  })

  return {
    store: createPrismaConversationStore(prisma),
    model,
    modelName: env.model,
    dispatch: (n, a) =>
      dispatchToolWa(n, a, {
        db,
        lookupParcelDeps: {
          resolveDeps: { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi },
          buildCard: (mahalleId, ada, parsel) =>
            buildDegerCard({ kind: 'adaParsel', mahalleId, ada, parsel }, cardDeps, { memberView: false }),
          siteUrlFor: (f) =>
            `https://www.arsabil.com/deger?mahalleId=${f.mahalleId}&ada=${encodeURIComponent(f.ada)}&parsel=${encodeURIComponent(f.parsel)}`,
        },
        projectToolDeps: {
          db: prisma,
          phone,
          now: () => new Date(),
          baseUrl: process.env.AKIF_CLAIM_BASE_URL || 'https://www.arsabil.com',
          checkRateLimit,
        },
      }),
    validateArgs: validateArgsWa,
    audit,
    checkConversationBudget: (m) => checkConversationBudget(m, env.maxTurnTokens),
    checkMonthlyBudget: () =>
      checkMonthlyBudget({
        monthSpendUsd: audit.monthSpendUsd,
        budgetUsd: readWhatsappMonthlyBudgetUsd(),
        now: () => new Date(),
      }),
    sendText: createSendText({ fetch, config }),
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
    toolPolicy: AKIF_WHATSAPP_TOOL_POLICY + '\n\n' + AKIF_WHATSAPP_PROJECT_POLICY,
    loadMemoryContext: async (p) => {
      const u = await prisma.user.findUnique({ where: { whatsappPhone: p }, select: { id: true } })
      return buildMemoryContext(prisma, { userId: u?.id ?? null, now: new Date() })
    },
    now: () => new Date(),
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
        await runWhatsappAkifTurn(m, buildAkifWhatsappDeps(m.from))
      } catch (e) {
        console.error('[wa-akif] handle', e)
      }
    })
  }
  return new Response('ok', { status: 200 })
}
