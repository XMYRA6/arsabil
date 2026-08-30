import type { ParcelLookupResult, GeoJSONPolygon } from '@/lib/tkgm/parcel'
import { valuateParcel, type StatLike } from '@/lib/areaPrices/valuation'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { polygonCentroid } from '@/lib/geo/polygonCentroid'
import { pointInPolygon } from '@/lib/geo/pointInPolygon'
import { selectComparables, type Comparable, type ComparableListing } from '@/lib/deger/comparables'

export type DegerCardInput =
  | { kind: 'point'; lat: number; lng: number }
  | { kind: 'adaParsel'; mahalleId: number; ada: string; parsel: string }

export interface AreaStatRecord {
  scope: 'il' | 'ilce' | 'mahalle'
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface RiskSnapshotLike {
  faultDistanceM: number | null
  floodQ100: boolean | null
  riskSnapshotAt: Date | null
}

export interface DegerCardDeps {
  fetchParcelByPoint: (lat: number, lng: number) => Promise<ParcelLookupResult>
  fetchParcelByAdaParsel: (mahalleId: number, ada: string, parsel: string) => Promise<ParcelLookupResult>
  buildRiskSnapshot: (lat: number | null, lng: number | null) => Promise<RiskSnapshotLike>
  findAreaStats: (il: string, ilce: string, mahalle: string) => Promise<AreaStatRecord[]>
  findListingsNear: (il: string, ilce: string) => Promise<ComparableListing[]>
  findNeighborhood: (il: string, ilce: string, mahalle: string) => Promise<{ geojson: unknown } | null>
}

export interface DegerCardValue {
  tier: 'free' | 'member'
  insufficientData: boolean
  basis?: 'mahalle' | 'ilce' | 'il'
  thinData?: boolean
  // ücretsiz
  freeRangeLow?: number
  freeRangeHigh?: number
  pricePerSqmCoarse?: number
  // üye
  estimate?: number
  memberRangeLow?: number
  memberRangeHigh?: number
  confidence?: 'yuksek' | 'orta' | 'dusuk'
  pricePerSqm?: { mahalle?: number; ilce?: number }
  sampleCount?: { mahalle?: number; ilce?: number }
  feasibilityHref?: string
}

export interface DegerCardDTO {
  parcel: {
    il: string
    ilce: string
    mahalle: string
    ada: string
    parsel: string
    areaSqm: number
    geometry: GeoJSONPolygon
  }
  risk: {
    faultDistanceM: number | null
    floodQ100: boolean | null
    status: 'ok' | 'unavailable'
  }
  value: DegerCardValue
  neighborhood: { geojson: unknown | null }
  comparables: { count: number; items?: Comparable[] }
}

export type DegerCardResult =
  | { ok: true; card: DegerCardDTO }
  | { ok: false; reason: 'parcel_not_found' | 'parcel_unavailable' }

/**
 * Parselin risk ölçüm noktası. Eski `firstCoord` poligonun bir KÖŞESİNDE
 * ölçüyordu (yanlış — köşe fay/taşkın sınırına parselin geri kalanından farklı
 * mesafede olabilir). Artık `polygonCentroid` kullanılıyor; ManualParcelEntryForm
 * ile aynı şekilde dış halkaya karşı `pointInPolygon` ile doğrulanıyor.
 * Centroid halkanın içindeyse doğrudan; dışına düşerse (dışbükey olmayan /
 * L-şekilli parsel) veya halka yoksa ham centroid'e düşülür — elde başka aday
 * nokta yok ve bu, köşede ölçmekten her hâlükârda daha isabetli.
 */
function parcelCentroidLatLng(geometry: GeoJSONPolygon): { lat: number; lng: number } | null {
  const rawCentroid = polygonCentroid(geometry)
  if (!rawCentroid) return null
  const ring = geometry?.coordinates?.[0]
  const verified =
    Array.isArray(ring) && ring.length >= 3 && pointInPolygon(rawCentroid, ring)
  return verified ? rawCentroid : rawCentroid
}

export async function buildDegerCard(
  input: DegerCardInput,
  deps: DegerCardDeps,
  opts: { memberView: boolean },
): Promise<DegerCardResult> {
  const lookup =
    input.kind === 'point'
      ? await deps.fetchParcelByPoint(input.lat, input.lng)
      : await deps.fetchParcelByAdaParsel(input.mahalleId, input.ada, input.parsel)

  if (!lookup.ok) {
    return {
      ok: false,
      reason: lookup.reason === 'not_found' ? 'parcel_not_found' : 'parcel_unavailable',
    }
  }
  const parcel = lookup.parcel

  const center =
    input.kind === 'point'
      ? { lat: input.lat, lng: input.lng }
      : parcelCentroidLatLng(parcel.geometry)

  const nIl = normalizeAreaName(parcel.il)
  const nIlce = normalizeAreaName(parcel.ilce)
  const nMahalle = normalizeAreaName(parcel.mahalle)
  const [snap, stats, listings, hood] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(nIl, nIlce, nMahalle),
    deps.findListingsNear(nIl, nIlce),
    deps.findNeighborhood(nIl, nIlce, nMahalle),
  ])

  const comp = center
    ? selectComparables({
        parcel: { lat: center.lat, lng: center.lng, areaSqm: parcel.areaSqm },
        listings,
      })
    : { items: [] as Comparable[], total: 0 }

  const bySlot: { mahalle?: StatLike; ilce?: StatLike; il?: StatLike } = {}
  for (const s of stats) {
    bySlot[s.scope] = {
      medianPricePerSqm: s.medianPricePerSqm,
      p25: s.p25,
      p75: s.p75,
      sampleCount: s.sampleCount,
    }
  }

  const v = valuateParcel({
    areaSqm: parcel.areaSqm,
    mahalle: bySlot.mahalle ?? null,
    ilce: bySlot.ilce ?? null,
    il: bySlot.il ?? null,
  })

  const value: DegerCardValue = { tier: opts.memberView ? 'member' : 'free', insufficientData: v.insufficientData }
  if (!v.insufficientData) {
    value.basis = v.basis
    value.thinData = v.thinData
    value.freeRangeLow = v.freeRangeLow
    value.freeRangeHigh = v.freeRangeHigh
    value.pricePerSqmCoarse = v.pricePerSqmCoarse
    if (opts.memberView) {
      value.estimate = v.estimate
      value.memberRangeLow = v.memberRangeLow
      value.memberRangeHigh = v.memberRangeHigh
      value.confidence = v.confidence
      value.pricePerSqm = v.pricePerSqm
      value.sampleCount = v.sampleCount
      value.feasibilityHref = '/hesapla'
    }
  }

  const riskUnavailable =
    snap.riskSnapshotAt == null && snap.faultDistanceM == null && snap.floodQ100 == null

  return {
    ok: true,
    card: {
      parcel: {
        il: parcel.il,
        ilce: parcel.ilce,
        mahalle: parcel.mahalle,
        ada: parcel.adaNo,
        parsel: parcel.parselNo,
        areaSqm: parcel.areaSqm,
        geometry: parcel.geometry,
      },
      risk: {
        faultDistanceM: snap.faultDistanceM,
        floodQ100: snap.floodQ100,
        status: riskUnavailable ? 'unavailable' : 'ok',
      },
      value,
      neighborhood: { geojson: hood?.geojson ?? null },
      comparables: {
        count: comp.total,
        ...(opts.memberView ? { items: comp.items } : {}),
      },
    },
  }
}
