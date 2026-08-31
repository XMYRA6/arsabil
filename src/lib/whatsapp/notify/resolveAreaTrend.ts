import type { SubLike, TrendBucket } from './types'

export interface AreaTrend {
  basis: 'mahalle' | 'ilce' | 'il'
  buckets: TrendBucket[]
}

export function resolveAreaTrend(
  rows: TrendBucket[],
  _sub: Pick<SubLike, 'il' | 'ilce' | 'mahalle'>,
): AreaTrend | null {
  // Count buckets by scope
  const mahalleCount = rows.filter(r => r.scope === 'mahalle').length
  const ilceCount = rows.filter(r => r.scope === 'ilce').length
  const ilCount = rows.filter(r => r.scope === 'il').length

  // Determine basis following mahalle → ilçe → il fallback
  let basis: 'mahalle' | 'ilce' | 'il' | null = null
  let selectedBuckets: TrendBucket[] = []

  if (mahalleCount >= 3) {
    basis = 'mahalle'
    selectedBuckets = rows.filter(r => r.scope === 'mahalle')
  } else if (ilceCount >= 3) {
    basis = 'ilce'
    selectedBuckets = rows.filter(r => r.scope === 'ilce')
  } else if (ilCount >= 1) {
    basis = 'il'
    selectedBuckets = rows.filter(r => r.scope === 'il')
  }

  if (basis === null) {
    return null
  }

  // Sort buckets by monthBucket ascending
  const sortedBuckets = [...selectedBuckets].sort(
    (a, b) => a.monthBucket.getTime() - b.monthBucket.getTime()
  )

  return {
    basis,
    buckets: sortedBuckets,
  }
}
