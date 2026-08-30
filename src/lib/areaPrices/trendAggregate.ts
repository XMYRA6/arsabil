import { median } from './stats'
import { normalizeAreaName } from './normalizeAreaName'
import { ARSA_LISTING_TYPES } from './aggregate'

export interface TrendInputRow {
  listingType: string
  pricePerSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
  listedAt: Date | null
}

export interface AreaPriceTrendRow {
  il: string
  ilce: string | null
  mahalle: string | null
  scope: 'il' | 'ilce' | 'mahalle'
  monthBucket: Date
  medianPricePerSqm: number
  sampleCount: number
}

const MIN_SAMPLE = 3
const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)

function monthKeyOf(d: Date): { key: string; bucket: Date } {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const bucket = new Date(Date.UTC(y, m, 1))
  return { key: `${y}-${String(m + 1).padStart(2, '0')}`, bucket }
}

export function aggregateTrend(rows: TrendInputRow[]): AreaPriceTrendRow[] {
  type Grp = { meta: { il: string; ilce: string | null; mahalle: string | null }; bucket: Date; values: number[] }
  const groups = new Map<string, Grp>()

  const push = (
    scope: 'il' | 'ilce' | 'mahalle',
    meta: Grp['meta'],
    monthKey: string,
    bucket: Date,
    value: number,
  ) => {
    const k = `${scope}|${meta.il}|${meta.ilce ?? ''}|${meta.mahalle ?? ''}|${monthKey}`
    let g = groups.get(k)
    if (!g) {
      g = { meta, bucket, values: [] }
      groups.set(k, g)
    }
    g.values.push(value)
  }

  for (const r of rows) {
    if (r.status !== 'active' && r.status !== 'delisted') continue
    if (!arsaTypes.has(r.listingType)) continue
    if (r.pricePerSqm == null || !Number.isFinite(r.pricePerSqm) || r.pricePerSqm <= 0) continue
    if (!(r.listedAt instanceof Date) || Number.isNaN(r.listedAt.getTime())) continue
    if (!r.il) continue

    const il = normalizeAreaName(r.il)
    const ilce = r.ilce ? normalizeAreaName(r.ilce) : null
    const mahalle = r.mahalle ? normalizeAreaName(r.mahalle) : null
    const { key, bucket } = monthKeyOf(r.listedAt)

    push('il', { il, ilce: null, mahalle: null }, key, bucket, r.pricePerSqm)
    if (ilce) {
      push('ilce', { il, ilce, mahalle: null }, key, bucket, r.pricePerSqm)
      if (mahalle) push('mahalle', { il, ilce, mahalle }, key, bucket, r.pricePerSqm)
    }
  }

  const out: AreaPriceTrendRow[] = []
  for (const [k, g] of groups) {
    if (g.values.length < MIN_SAMPLE) continue
    const scope = k.split('|')[0] as 'il' | 'ilce' | 'mahalle'
    out.push({
      ...g.meta,
      scope,
      monthBucket: g.bucket,
      medianPricePerSqm: median(g.values),
      sampleCount: g.values.length,
    })
  }
  return out
}
