import type { SubLike, TrendBucket } from './types'
import { digestDue } from './digestDue'
import { ymKey, formatPctChange } from './formatPctChange'
import { resolveAreaTrend } from './resolveAreaTrend'
import { thresholdAlert } from './thresholdAlert'

export interface NotifyConfig {
  digestDay: number
  minSample: number
  alertPct: number
  siteBase: string
}

export interface NotifyDeps {
  listSubscriptions: () => Promise<SubLike[]>
  findTrendRows: (il: string, ilce: string, mahalle: string) => Promise<TrendBucket[]>
  sendDigest: (
    to: string,
    a: { mahalle: string; current: number; pctText: string; href: string }
  ) => Promise<void>
  sendAlert: (
    to: string,
    a: { mahalle: string; pctText: string; baseline: number; current: number; href: string }
  ) => Promise<void>
  markDigestSent: (subId: string, month: string) => Promise<void>
  markAlertSent: (subId: string, at: Date, direction: 'up' | 'down') => Promise<void>
  now: () => Date
  config: NotifyConfig
}

export interface NotifySummary {
  subs: number
  digests: number
  alerts: number
  skipped: number
  errors: number
}

const ALERT_DEDUP_MS = 30 * 24 * 60 * 60 * 1000

export async function runNotify(deps: NotifyDeps): Promise<NotifySummary> {
  const subs = await deps.listSubscriptions()
  let digests = 0
  let alerts = 0
  let skipped = 0
  let errors = 0

  for (const sub of subs) {
    try {
      const rows = await deps.findTrendRows(sub.il, sub.ilce, sub.mahalle)
      const now = deps.now()

      // Digest
      if (digestDue(sub, now, deps.config.digestDay)) {
        const at = resolveAreaTrend(rows, sub)
        if (at == null || at.buckets.length < 2) {
          skipped++
        } else {
          const prev = at.buckets[at.buckets.length - 2]
          const last = at.buckets[at.buckets.length - 1]
          const pctText = formatPctChange(prev.medianPricePerSqm, last.medianPricePerSqm)
          await deps.sendDigest(sub.phone, {
            mahalle: sub.mahalle,
            current: last.medianPricePerSqm,
            pctText,
            href: deps.config.siteBase + '/deger',
          })
          await deps.markDigestSent(sub.id, ymKey(now))
          digests++
        }
      }

      // Alert
      const res = thresholdAlert(rows, sub, now, {
        minSample: deps.config.minSample,
        pct: deps.config.alertPct,
      })
      if (res.fire) {
        const dedupOk =
          sub.lastAlertAt == null ||
          now.getTime() - sub.lastAlertAt.getTime() > ALERT_DEDUP_MS ||
          sub.lastAlertDirection !== res.direction
        if (dedupOk) {
          const pctText = formatPctChange(res.baseline!, res.current!)
          await deps.sendAlert(sub.phone, {
            mahalle: sub.mahalle,
            pctText,
            baseline: res.baseline!,
            current: res.current!,
            href: deps.config.siteBase + '/deger',
          })
          await deps.markAlertSent(sub.id, now, res.direction!)
          alerts++
        }
      }
    } catch (err) {
      errors++
      console.error('runNotify: subscription failed', err)
    }
  }

  return { subs: subs.length, digests, alerts, skipped, errors }
}
