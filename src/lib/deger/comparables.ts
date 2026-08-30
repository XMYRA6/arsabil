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
  listedAt: Date | null
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
      listedAt: l.listedAt,
      source: l.source,
      sourceUrl: l.sourceUrl,
    })
  }
  passed.sort((a, b) => a.distanceM - b.distanceM)
  return { items: passed.slice(0, MAX_ITEMS), total: passed.length }
}
