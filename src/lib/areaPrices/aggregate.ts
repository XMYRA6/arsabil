import { median, percentile } from './stats'
import { normalizeAreaName } from './normalizeAreaName'

export const ARSA_LISTING_TYPES = [
  'arsa',
  'tarla',
  'bag',
  'bahce',
  'zeytinlik',
  'arazi',
] as const

export interface AggregateInputRow {
  listingType: string
  pricePerSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
}

export interface AreaPriceStatRow {
  il: string
  ilce: string | null
  mahalle: string | null
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

const MIN_SAMPLE = 3

function statRow(
  scope: AreaPriceStatRow['scope'],
  key: { il: string; ilce: string | null; mahalle: string | null },
  values: number[],
): AreaPriceStatRow {
  return {
    ...key,
    scope,
    medianPricePerSqm: median(values),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    sampleCount: values.length,
  }
}

export function aggregateAreaPrices(rows: AggregateInputRow[]): AreaPriceStatRow[] {
  const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)
  const ilGroups = new Map<string, number[]>()
  const ilceGroups = new Map<string, number[]>()
  const mahalleGroups = new Map<string, number[]>()
  // Anahtar → orijinal (büyük harfli) il/ilçe/mahalle bileşenleri
  const meta = new Map<string, { il: string; ilce: string | null; mahalle: string | null }>()

  for (const r of rows) {
    if (r.status !== 'active') continue
    if (!arsaTypes.has(r.listingType)) continue
    if (r.pricePerSqm == null || !Number.isFinite(r.pricePerSqm) || r.pricePerSqm <= 0) continue
    if (!r.il) continue

    const il = normalizeAreaName(r.il)
    const ilce = r.ilce ? normalizeAreaName(r.ilce) : null
    const mahalle = r.mahalle ? normalizeAreaName(r.mahalle) : null

    const ilKey = il
    ilGroups.set(ilKey, [...(ilGroups.get(ilKey) ?? []), r.pricePerSqm])
    meta.set(`il|${ilKey}`, { il, ilce: null, mahalle: null })

    if (ilce) {
      const ilceKey = `${il}|${ilce}`
      ilceGroups.set(ilceKey, [...(ilceGroups.get(ilceKey) ?? []), r.pricePerSqm])
      meta.set(`ilce|${ilceKey}`, { il, ilce, mahalle: null })

      if (mahalle) {
        const mahKey = `${il}|${ilce}|${mahalle}`
        mahalleGroups.set(mahKey, [...(mahalleGroups.get(mahKey) ?? []), r.pricePerSqm])
        meta.set(`mahalle|${mahKey}`, { il, ilce, mahalle })
      }
    }
  }

  const out: AreaPriceStatRow[] = []
  for (const [k, v] of ilGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('il', meta.get(`il|${k}`)!, v))
  }
  for (const [k, v] of ilceGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('ilce', meta.get(`ilce|${k}`)!, v))
  }
  for (const [k, v] of mahalleGroups) {
    if (v.length < MIN_SAMPLE) continue
    out.push(statRow('mahalle', meta.get(`mahalle|${k}`)!, v))
  }
  return out
}
