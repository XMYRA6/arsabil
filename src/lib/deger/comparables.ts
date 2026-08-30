import { haversineMeters } from '@/lib/geo/haversine'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'

export interface ComparableListing {
  id: string
  pricePerSqm: number | null
  areaSqm: number | null
  price: number | null
  lat: number | null
  lng: number | null
  geoPrecision: string | null
  listedAt: Date | null
  source: string
  sourceUrl: string
  listingType: string
}

export interface ComparableInput {
  parcel: { lat: number; lng: number; areaSqm: number | null }
  listings: ComparableListing[]
}

export interface Comparable {
  pricePerSqm: number | null
  areaSqm: number | null
  price: number | null
  distanceM: number
  approxDistance: boolean
  lat: number
  lng: number
  /** DTO-facing: `NextResponse.json` üzerinden ISO string olur, Date değil (M1). */
  listedAt: string | null
  source: string
  sourceUrl: string
}

const MAX_RADIUS_M = 5000
const MAX_ITEMS = 8
const arsaTypes = new Set<string>(ARSA_LISTING_TYPES)

export function selectComparables(input: ComparableInput): { items: Comparable[]; total: number } {
  const { parcel } = input
  if (!Number.isFinite(parcel.lat) || !Number.isFinite(parcel.lng)) {
    return { items: [], total: 0 }
  }
  const hasParcelArea = Number.isFinite(parcel.areaSqm) && (parcel.areaSqm ?? 0) > 0
  const areaLow = hasParcelArea ? (parcel.areaSqm as number) * 0.25 : 0
  const areaHigh = hasParcelArea ? (parcel.areaSqm as number) * 4 : Infinity

  const passed: Comparable[] = []
  for (const l of input.listings) {
    if (l.lat == null || l.lng == null || !Number.isFinite(l.lat) || !Number.isFinite(l.lng)) continue
    if (l.pricePerSqm == null || !Number.isFinite(l.pricePerSqm) || l.pricePerSqm <= 0) continue
    if (!arsaTypes.has(l.listingType)) continue
    if (hasParcelArea && l.areaSqm != null && (l.areaSqm < areaLow || l.areaSqm > areaHigh)) continue
    const distanceM = haversineMeters({ lat: parcel.lat, lng: parcel.lng }, { lat: l.lat, lng: l.lng })
    if (distanceM > MAX_RADIUS_M) continue
    passed.push({
      pricePerSqm: l.pricePerSqm,
      areaSqm: l.areaSqm,
      price: l.price,
      distanceM,
      approxDistance: l.geoPrecision !== 'exact',
      lat: l.lat,
      lng: l.lng,
      listedAt: l.listedAt ? l.listedAt.toISOString() : null,
      source: l.source,
      sourceUrl: l.sourceUrl,
    })
  }
  // I1/I2 — mesafe birincil; eşit mesafede (aynı lat/lng) yeni ilan önce gelsin
  // ki top-8 dilimi deterministik olsun.
  const dateVal = (d: string | null) => (d ? new Date(d).getTime() : 0)
  passed.sort((a, b) => a.distanceM - b.distanceM || dateVal(b.listedAt) - dateVal(a.listedAt))
  return { items: passed.slice(0, MAX_ITEMS), total: passed.length }
}
