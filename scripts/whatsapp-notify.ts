import { prisma } from '../src/lib/prisma'
import { refreshAreaPriceStats, refreshAreaPriceTrends } from '../src/lib/areaPrices/persistAggregates'
import { readWhatsappConfig } from '../src/lib/whatsapp/config'
import { createSendTemplate, createSendDigest, createSendAlert } from '../src/lib/whatsapp/sendTemplate'
import { runNotify, type NotifyConfig } from '../src/lib/whatsapp/notify/runNotify'
import type { SubLike, TrendBucket } from '../src/lib/whatsapp/notify/types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const s = await refreshAreaPriceStats(prisma)
  const t = await refreshAreaPriceTrends(prisma)
  console.log(`[notify] aggregate: ${s.written} stat / ${t.written} trend tazelendi`)

  const config = readWhatsappConfig()
  const send = createSendTemplate({ fetch, config })
  const sendDigestRaw = createSendDigest(send)
  const sendAlertRaw = createSendAlert(send)

  const cfg: NotifyConfig = {
    digestDay: Number(process.env.NOTIFY_DIGEST_DAY ?? 1),
    minSample: Number(process.env.NOTIFY_MIN_SAMPLE ?? 5),
    alertPct: Number(process.env.NOTIFY_ALERT_PCT ?? 0.10),
    siteBase: 'https://www.arsabil.com',
  }

  const summary = await runNotify({
    now: () => new Date(),
    config: cfg,
    listSubscriptions: () => prisma.whatsappSubscription.findMany() as Promise<SubLike[]>,
    findTrendRows: async (il, ilce, mahalle) => {
      const windowStart = new Date()
      windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
      windowStart.setUTCHours(0, 0, 0, 0)
      const rows = await prisma.areaPriceTrend.findMany({
        where: {
          il,
          monthBucket: { gte: windowStart },
          OR: [{ ilce: null, mahalle: null }, { ilce, mahalle: null }, { ilce, mahalle }],
        },
        select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
      })
      return rows as TrendBucket[]
    },
    sendDigest: async (to, a) => { await sendDigestRaw(to, a); await sleep(200) },
    sendAlert: async (to, a) => { await sendAlertRaw(to, a); await sleep(200) },
    markDigestSent: (id, month) => prisma.whatsappSubscription.update({ where: { id }, data: { lastDigestMonth: month } }).then(() => {}),
    markAlertSent: (id, at, direction) => prisma.whatsappSubscription.update({ where: { id }, data: { lastAlertAt: at, lastAlertDirection: direction } }).then(() => {}),
  })
  console.log(`[notify] ${JSON.stringify(summary)}`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
