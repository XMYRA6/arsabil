import type { ParcelLookupResult, GeoJSONPolygon } from '@/lib/tkgm/parcel'
import { valuateParcel, type StatLike } from '@/lib/areaPrices/valuation'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'

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
}

export type DegerCardResult =
  | { ok: true; card: DegerCardDTO }
  | { ok: false; reason: 'parcel_not_found' | 'parcel_unavailable' }

/** Polygon'un ilk halka ilk noktası [lng, lat] → { lat, lng }. */
function firstCoord(geometry: GeoJSONPolygon): { lat: number; lng: number } | null {
  const p = geometry?.coordinates?.[0]?.[0]
  if (!p || p.length < 2) return null
  return { lat: p[1], lng: p[0] }
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
      : firstCoord(parcel.geometry)

  const [snap, stats] = await Promise.all([
    deps.buildRiskSnapshot(center?.lat ?? null, center?.lng ?? null),
    deps.findAreaStats(
      normalizeAreaName(parcel.il),
      normalizeAreaName(parcel.ilce),
      normalizeAreaName(parcel.mahalle),
    ),
  ])

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
    },
  }
}
