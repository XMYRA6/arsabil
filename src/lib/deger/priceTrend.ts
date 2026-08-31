export interface TrendRow {
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}
export interface PriceTrendPoint {
  month: string
  medianPricePerSqm: number
  sampleCount: number
}
export interface PriceTrendResult {
  insufficientTrend: boolean
  basis?: 'mahalle' | 'ilce' | 'il'
  points?: PriceTrendPoint[]
  changePct3m?: number | null
  thinTrend?: boolean
}

const round1 = (n: number) => Math.round(n * 10) / 10
const monthStr = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

export function priceTrend(rows: TrendRow[], opts: { now: Date }): PriceTrendResult {
  const n = opts.now
  const windowStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 11, 1)
  const inWindow = rows.filter((r) => r.monthBucket.getTime() >= windowStart)

  const bySc = (s: TrendRow['scope']) =>
    inWindow.filter((r) => r.scope === s).sort((a, b) => a.monthBucket.getTime() - b.monthBucket.getTime())

  let basis: 'mahalle' | 'ilce' | 'il' | null = null
  let chosen: TrendRow[] = []
  for (const s of ['mahalle', 'ilce', 'il'] as const) {
    const rr = bySc(s)
    if (rr.length >= 3) {
      basis = s
      chosen = rr
      break
    }
  }
  if (!basis) return { insufficientTrend: true }

  const points: PriceTrendPoint[] = chosen.map((r) => ({
    month: monthStr(r.monthBucket),
    medianPricePerSqm: r.medianPricePerSqm,
    sampleCount: r.sampleCount,
  }))

  let changePct3m: number | null = null
  if (points.length >= 2) {
    const last = points[points.length - 1]
    const [ly, lm] = last.month.split('-').map(Number)
    // `last.month`'tan 3 TAKVİM ayı önce (dizi indeksi değil)
    const targetDate = new Date(Date.UTC(ly, lm - 1 - 3, 1))
    const targetMonth = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}`
    const prevPoint = points.find((p) => p.month === targetMonth)
    if (prevPoint && prevPoint.medianPricePerSqm > 0) {
      changePct3m = round1(((last.medianPricePerSqm - prevPoint.medianPricePerSqm) / prevPoint.medianPricePerSqm) * 100)
    }
  }

  const totalSamples = points.reduce((s, p) => s + p.sampleCount, 0)
  const thinTrend = totalSamples < 20 || points.length < 4

  return { insufficientTrend: false, basis, points, changePct3m, thinTrend }
}
