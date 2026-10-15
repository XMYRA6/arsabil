// Akif-5c Aşama C — konut (daire) ilanlarından bölge fiyat istatistiği. Saf modül.

import { median, percentile } from '@/lib/areaPrices/stats'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

export interface KonutInputRow {
  listingType: string
  pricePerSqm: number | null
  areaSqm: number | null
  status: string
  il: string | null
  ilce: string | null
  mahalle: string | null
}

export interface KonutFiyatStatRow {
  il: string
  ilce: string
  mahalle: string
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
  medianAreaSqm: number
}

const MIN_SAMPLE = 3
const MIN_AREA = 40
const MAX_AREA = 400
const MIN_FOR_OUTLIER_TRIM = 20

interface Clean { pricePerSqm: number; areaSqm: number; il: string; ilce: string; mahalle: string }

const finitePositive = (n: number | null): n is number => n != null && Number.isFinite(n) && n > 0

function clean(rows: KonutInputRow[]): Clean[] {
  const out: Clean[] = []
  for (const r of rows) {
    if (r.status !== 'active' || r.listingType !== 'konut') continue
    if (!finitePositive(r.pricePerSqm) || !finitePositive(r.areaSqm)) continue
    if (r.areaSqm < MIN_AREA || r.areaSqm > MAX_AREA) continue
    if (!r.il) continue
    out.push({
      pricePerSqm: r.pricePerSqm,
      areaSqm: r.areaSqm,
      il: normalizeAreaName(r.il),
      ilce: r.ilce ? normalizeAreaName(r.ilce) : '',
      mahalle: r.ilce && r.mahalle ? normalizeAreaName(r.mahalle) : '',
    })
  }
  return out
}

/** İl bazlı p5–p95 bandı dışındakileri atar; ilde <20 ilan varsa dokunmaz. */
function trimOutliersPerIl(rows: Clean[]): Clean[] {
  const byIl = new Map<string, Clean[]>()
  for (const r of rows) {
    const a = byIl.get(r.il)
    if (a) a.push(r)
    else byIl.set(r.il, [r])
  }
  const kept: Clean[] = []
  for (const list of byIl.values()) {
    if (list.length < MIN_FOR_OUTLIER_TRIM) {
      kept.push(...list)
      continue
    }
    const prices = list.map((r) => r.pricePerSqm)
    const lo = percentile(prices, 5)
    const hi = percentile(prices, 95)
    for (const r of list) if (r.pricePerSqm >= lo && r.pricePerSqm <= hi) kept.push(r)
  }
  return kept
}

function statRow(scope: KonutFiyatStatRow['scope'], key: Pick<Clean, 'il' | 'ilce' | 'mahalle'>, group: Clean[]): KonutFiyatStatRow {
  const prices = group.map((g) => g.pricePerSqm)
  return {
    il: key.il,
    ilce: key.ilce,
    mahalle: key.mahalle,
    scope,
    medianPricePerSqm: median(prices),
    p25: percentile(prices, 25),
    p75: percentile(prices, 75),
    sampleCount: group.length,
    medianAreaSqm: median(group.map((g) => g.areaSqm)),
  }
}

export function aggregateKonutPrices(rows: KonutInputRow[]): KonutFiyatStatRow[] {
  const data = trimOutliersPerIl(clean(rows))
  const groups = {
    il: new Map<string, Clean[]>(),
    ilce: new Map<string, Clean[]>(),
    mahalle: new Map<string, Clean[]>(),
  }
  const push = (m: Map<string, Clean[]>, k: string, r: Clean) => {
    const a = m.get(k)
    if (a) a.push(r)
    else m.set(k, [r])
  }
  for (const r of data) {
    push(groups.il, r.il, r)
    if (r.ilce) push(groups.ilce, `${r.il}|${r.ilce}`, r)
    if (r.ilce && r.mahalle) push(groups.mahalle, `${r.il}|${r.ilce}|${r.mahalle}`, r)
  }
  const out: KonutFiyatStatRow[] = []
  for (const scope of ['il', 'ilce', 'mahalle'] as const) {
    for (const group of groups[scope].values()) {
      if (group.length < MIN_SAMPLE) continue
      const f = group[0]
      out.push(statRow(scope, { il: f.il, ilce: scope === 'il' ? '' : f.ilce, mahalle: scope === 'mahalle' ? f.mahalle : '' }, group))
    }
  }
  return out
}
