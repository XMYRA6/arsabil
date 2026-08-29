import type { PortalSource, ListingType } from '../adapters/types'

export interface DedupeCandidate {
  id: string
  source: PortalSource
  ilce: string | null
  mahalle: string | null
  areaSqm: number | null
  price: number | null
  listingType: ListingType
  firstSeenAt: Date
}

const AREA_TOL = 0.05
const PRICE_TOL = 0.03

function within(a: number, b: number, tol: number): boolean {
  if (a <= 0 || b <= 0) return false
  return Math.abs(a - b) / Math.max(a, b) <= tol
}

function match(a: DedupeCandidate, b: DedupeCandidate): boolean {
  if (a.source === b.source) return false
  if (!a.ilce || !a.mahalle || a.ilce !== b.ilce || a.mahalle !== b.mahalle) return false
  if (a.listingType !== b.listingType) return false
  if (a.areaSqm === null || b.areaSqm === null || a.price === null || b.price === null) return false
  return within(a.areaSqm, b.areaSqm, AREA_TOL) && within(a.price, b.price, PRICE_TOL)
}

/**
 * Union-Find ile kopya kümeleri bulur. Her küme için en eski `firstSeenAt`
 * "asıl" seçilir; kümedeki diğer id'ler -> asıl id map'i döner. Asıl kayıt
 * map'te yer almaz.
 */
export function findDupes(candidates: DedupeCandidate[]): Map<string, string> {
  const parent = new Map<string, string>()
  candidates.forEach((c) => parent.set(c.id, c.id))
  const find = (x: string): string => {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    while (parent.get(x) !== r) { const n = parent.get(x)!; parent.set(x, r); x = n }
    return r
  }
  const union = (x: string, y: string) => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry) }

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (match(candidates[i], candidates[j])) union(candidates[i].id, candidates[j].id)
    }
  }

  const clusters = new Map<string, DedupeCandidate[]>()
  for (const c of candidates) {
    const root = find(c.id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root)!.push(c)
  }

  const result = new Map<string, string>()
  for (const members of clusters.values()) {
    if (members.length < 2) continue
    const canonical = members.reduce((a, b) => (a.firstSeenAt <= b.firstSeenAt ? a : b))
    for (const m of members) if (m.id !== canonical.id) result.set(m.id, canonical.id)
  }
  return result
}
