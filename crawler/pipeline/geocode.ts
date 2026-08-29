import type { NormalizedListing, GeoResult } from '../adapters/types'
import { fetchIlListesi, fetchIlceListesi, fetchMahalleListesi } from '@/lib/tkgm/idariYapi'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'

export interface GeocodeDeps {
  resolveMahalleCentroid(il: string, ilce: string, mahalle: string): Promise<{ lat: number; lng: number } | null>
  isWithinTurkey(lat: number, lng: number): boolean
}

export async function geocodeListing(n: NormalizedListing, deps: GeocodeDeps): Promise<GeoResult> {
  if (typeof n.lat === 'number' && typeof n.lng === 'number' && deps.isWithinTurkey(n.lat, n.lng)) {
    return { lat: n.lat, lng: n.lng, geoPrecision: 'exact' }
  }
  if (n.il && n.ilce && n.mahalle) {
    const c = await deps.resolveMahalleCentroid(n.il, n.ilce, n.mahalle)
    if (c && deps.isWithinTurkey(c.lat, c.lng)) {
      return { lat: c.lat, lng: c.lng, geoPrecision: 'neighborhood' }
    }
  }
  return { lat: null, lng: null, geoPrecision: 'none' }
}

/**
 * TKGM idari yapı servisinden mahalle centroid'i çözer. Tek crawl turu boyunca
 * il/ilçe/mahalle listelerini bellekte tutar (idariYapi çağrıları ağ gider).
 * İsimler cleanTrName ile tr-uppercase geldiği için karşılaştırma da öyle yapılır.
 */
export function createTkgmCentroidResolver(): GeocodeDeps['resolveMahalleCentroid'] {
  const ilCache = new Map<string, number>() // İL adı -> id
  const ilceCache = new Map<string, number>() // "İL|İLÇE" -> id
  const mahCache = new Map<string, { lat: number; lng: number } | null>() // "İL|İLÇE|MAH" -> centroid

  const up = (s: string) => s.toLocaleUpperCase('tr-TR')

  return async (il, ilce, mahalle) => {
    const key = `${il}|${ilce}|${mahalle}`
    if (mahCache.has(key)) return mahCache.get(key)!

    try {
      if (ilCache.size === 0) {
        for (const it of await fetchIlListesi()) ilCache.set(up(it.text), it.id)
      }
      const ilId = ilCache.get(il)
      if (!ilId) { mahCache.set(key, null); return null }

      const ilceKey = `${il}|${ilce}`
      if (!ilceCache.has(ilceKey)) {
        for (const it of await fetchIlceListesi(ilId)) ilceCache.set(`${il}|${up(it.text)}`, it.id)
      }
      const ilceId = ilceCache.get(ilceKey)
      if (!ilceId) { mahCache.set(key, null); return null }

      const mahList = await fetchMahalleListesi(ilceId)
      const found = mahList.find((m) => up(m.text.replace(/\s*(mah(\.|allesi)?|köyü)\s*$/i, '').trim()) === mahalle)
      const centroid = found?.centroid ?? null
      mahCache.set(key, centroid)
      return centroid
    } catch {
      mahCache.set(key, null)
      return null
    }
  }
}

export const defaultGeocodeDeps = (): GeocodeDeps => ({
  resolveMahalleCentroid: createTkgmCentroidResolver(),
  isWithinTurkey,
})
