import type { SubLike, TrendBucket } from './types'
import { resolveAreaTrend } from './resolveAreaTrend'
import { ymKey } from './formatPctChange'

export interface AlertResult {
  fire: boolean
  direction?: 'up' | 'down'
  current?: number
  baseline?: number
  pctChange?: number
}

export function thresholdAlert(
  rows: TrendBucket[],
  sub: Pick<SubLike, 'il' | 'ilce' | 'mahalle'>,
  now: Date,
  opts: { minSample: number; pct: number }
): AlertResult {
  const at = resolveAreaTrend(rows, sub)
  if (!at) return { fire: false }

  const nowKey = ymKey(now)
  const cur = at.buckets.find(x => ymKey(x.monthBucket) === nowKey)
  if (!cur) return { fire: false }

  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const baselineKeys = new Set([
    ymKey(new Date(Date.UTC(y, m - 1, 1))),
    ymKey(new Date(Date.UTC(y, m - 2, 1))),
    ymKey(new Date(Date.UTC(y, m - 3, 1))),
  ])
  const baseline = at.buckets.filter(x => baselineKeys.has(ymKey(x.monthBucket)))
  if (baseline.length < 3) return { fire: false }

  if (cur.sampleCount < opts.minSample) return { fire: false }
  if (baseline.some(x => x.sampleCount < opts.minSample)) return { fire: false }

  const baselineMedian =
    baseline.reduce((sum, x) => sum + x.medianPricePerSqm, 0) / baseline.length

  const pctChange = (cur.medianPricePerSqm - baselineMedian) / baselineMedian
  if (Math.abs(pctChange) < opts.pct) return { fire: false }

  return {
    fire: true,
    direction: pctChange > 0 ? 'up' : 'down',
    current: cur.medianPricePerSqm,
    baseline: baselineMedian,
    pctChange,
  }
}
