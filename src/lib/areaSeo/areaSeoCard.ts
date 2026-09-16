import { priceTrend, type TrendRow, type PriceTrendPoint } from '@/lib/deger/priceTrend'
import { polygonCentroid, type GeoJSONGeometryLike } from '@/lib/geo/polygonCentroid'
import { summarizeDemographics } from '@/lib/demografi/summarize'
import type { DistrictDemographicsRecord } from '@/lib/demografi/types'

export interface AreaSeoKey {
  scope: 'il' | 'ilce' | 'mahalle'
  ilNorm: string
  ilceNorm: string | null
  mahalleNorm: string | null
}

export interface AreaSeoStat {
  medianPricePerSqm: number
  p25: number
  p75: number
  sampleCount: number
}

export interface AreaSeoRiskInfo {
  faultDistanceM: number | null
  floodQ100: boolean | null
}

export interface AreaSeoCardDTO {
  stat: AreaSeoStat
  priceTrend?: { points: PriceTrendPoint[]; changePct3m: number | null; thinTrend: boolean; basis: 'mahalle' | 'ilce' | 'il' }
  demographics?: {
    dataYear: number
    population: number | null
    populationGrowthPerMille: number | null
    medianAge: number | null
    avgHouseholdSize: number | null
    summary: string | null
  }
  comparableCount: number
  risk?: AreaSeoRiskInfo
}

export interface AreaSeoCardDeps {
  findOwnStat: (key: AreaSeoKey) => Promise<AreaSeoStat | null>
  findTrendRows: (key: AreaSeoKey) => Promise<TrendRow[]>
  findDistrictDemographics: (ilNorm: string, ilceNorm: string) => Promise<DistrictDemographicsRecord | null>
  countComparables: (key: AreaSeoKey) => Promise<number>
  findNeighborhoodGeojson: (key: AreaSeoKey) => Promise<unknown | null>
  buildRiskSnapshot: (lat: number | null, lng: number | null) => Promise<AreaSeoRiskInfo>
}

export async function buildAreaSeoCard(key: AreaSeoKey, deps: AreaSeoCardDeps): Promise<AreaSeoCardDTO | null> {
  const stat = await deps.findOwnStat(key)
  if (!stat) return null

  const [trendRows, comparableCount, demo] = await Promise.all([
    deps.findTrendRows(key),
    deps.countComparables(key),
    key.ilceNorm ? deps.findDistrictDemographics(key.ilNorm, key.ilceNorm) : Promise.resolve(null),
  ])

  const trend = priceTrend(trendRows, { now: new Date() })

  let risk: AreaSeoRiskInfo | undefined
  if (key.scope === 'mahalle') {
    const geojson = await deps.findNeighborhoodGeojson(key)
    if (geojson) {
      const center = polygonCentroid(geojson as GeoJSONGeometryLike)
      if (center) {
        const snap = await deps.buildRiskSnapshot(center.lat, center.lng)
        if (snap.faultDistanceM != null || snap.floodQ100 != null) {
          risk = snap
        }
      }
    }
  }

  return {
    stat,
    ...(trend.insufficientTrend
      ? {}
      : {
          priceTrend: {
            points: trend.points!,
            changePct3m: trend.changePct3m ?? null,
            thinTrend: trend.thinTrend ?? false,
            basis: trend.basis!,
          },
        }),
    ...(demo
      ? {
          demographics: {
            dataYear: demo.dataYear,
            population: demo.population,
            populationGrowthPerMille: demo.populationGrowthPerMille,
            medianAge: demo.medianAge,
            avgHouseholdSize: demo.avgHouseholdSize,
            summary: summarizeDemographics(demo).sentence,
          },
        }
      : {}),
    comparableCount,
    ...(risk ? { risk } : {}),
  }
}
