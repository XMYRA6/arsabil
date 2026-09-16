import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import type { TrendRow } from '@/lib/deger/priceTrend'
import type { AreaSeoCardDeps, AreaSeoKey, AreaSeoStat } from './areaSeoCard'

/**
 * `countComparables`'ın aday kümesi — status/listingType/il filtreleri HER
 * çağrıda birebir aynı (yalnız uygulama katmanındaki filtre `key`'e göre
 * değişir). `cache()` ile sarılı: aynı build/request içinde binlerce
 * mahalle/ilçe/il sayfası bu sorguyu ayrı ayrı değil, TEK sefer çalıştırır
 * (final whole-branch review'in "ulusal ölçekte tekrar eden tarama" bulgusu).
 */
const fetchActiveArsaListings = cache(async () => {
  return prisma.marketListing.findMany({
    where: { status: 'active', listingType: { in: [...ARSA_LISTING_TYPES] }, il: { not: null } },
    select: { il: true, ilce: true, mahalle: true },
    take: 5000,
  })
})

function trendScopeFilters(key: AreaSeoKey) {
  if (key.scope === 'mahalle') {
    return [
      { ilce: null, mahalle: null },
      { ilce: key.ilceNorm, mahalle: null },
      { ilce: key.ilceNorm, mahalle: key.mahalleNorm },
    ]
  }
  if (key.scope === 'ilce') {
    return [{ ilce: null, mahalle: null }, { ilce: key.ilceNorm, mahalle: null }]
  }
  return [{ ilce: null, mahalle: null }]
}

export function createAreaSeoCardDeps(): AreaSeoCardDeps {
  return {
    buildRiskSnapshot,

    findOwnStat: async (key): Promise<AreaSeoStat | null> => {
      // findUnique(il_ilce_mahalle) KULLANILMAZ: ilce/mahalle nullable —
      // proje zaten bu yüzden findFirst kullanıyor (persistAggregates.ts).
      const row = await prisma.areaPriceStat.findFirst({
        where: { il: key.ilNorm, ilce: key.ilceNorm, mahalle: key.mahalleNorm },
        select: { medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
      })
      return row
    },

    findTrendRows: async (key): Promise<TrendRow[]> => {
      const windowStart = new Date()
      windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
      windowStart.setUTCHours(0, 0, 0, 0)
      const rows = await prisma.areaPriceTrend.findMany({
        where: { il: key.ilNorm, monthBucket: { gte: windowStart }, OR: trendScopeFilters(key) },
        select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
      })
      return rows as TrendRow[]
    },

    findDistrictDemographics: async (ilNorm, ilceNorm) => {
      try {
        return await prisma.districtDemographics.findUnique({
          where: { il_ilce: { il: ilNorm, ilce: ilceNorm } },
          select: { dataYear: true, population: true, populationGrowthPerMille: true, medianAge: true, avgHouseholdSize: true },
        })
      } catch {
        return null // DistrictDemographics henüz migrate edilmemişse sayfayı düşürme
      }
    },

    /**
     * MarketListing `normalizeAreaName` DEĞİL `cleanTrName` (doğru Türkçe
     * BÜYÜK harf, İ/I ayrımı korunur) key-space'inde — DB eşitliği bizim
     * normalize anahtarımızla birebir tutmayabilir. Geniş bir aday kümesi
     * çekilip uygulama katmanında `normalizeAreaName` ile filtrelenir
     * (aynı desen: anonCardDeps.ts:findListingsNear).
     */
    countComparables: async (key): Promise<number> => {
      const rows = await fetchActiveArsaListings()
      return rows.filter((r) => {
        if (r.il == null || normalizeAreaName(r.il) !== key.ilNorm) return false
        if (key.ilceNorm != null && (r.ilce == null || normalizeAreaName(r.ilce) !== key.ilceNorm)) return false
        if (key.mahalleNorm != null && (r.mahalle == null || normalizeAreaName(r.mahalle) !== key.mahalleNorm)) return false
        return true
      }).length
    },

    findNeighborhoodGeojson: async (key): Promise<unknown | null> => {
      if (key.scope !== 'mahalle' || key.ilceNorm == null || key.mahalleNorm == null) return null
      const row = await prisma.neighborhood.findUnique({
        where: { il_ilce_mahalle: { il: key.ilNorm, ilce: key.ilceNorm, mahalle: key.mahalleNorm } },
        select: { geojson: true },
      })
      return row?.geojson ?? null
    },
  }
}
