import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { listSeoAreas, type ListSeoAreasDeps, type AreaPriceStatScopeRow, type SeoScope, type SeoAreaEntry } from './listSeoAreas'
import type { RawAreaName } from './displayName'

export function createSeoAreaDeps(): ListSeoAreasDeps {
  return {
    findAreaPriceStats: async (scope): Promise<AreaPriceStatScopeRow[]> => {
      const rows = await prisma.areaPriceStat.findMany({
        where: { scope },
        select: { il: true, ilce: true, mahalle: true, sampleCount: true, medianPricePerSqm: true },
      })
      return rows
    },
    listDistinctMarketAreas: async (): Promise<RawAreaName[]> => {
      const rows = await prisma.marketListing.findMany({
        where: { il: { not: null } },
        distinct: ['il', 'ilce', 'mahalle'],
        select: { il: true, ilce: true, mahalle: true },
      })
      return rows.filter((r): r is RawAreaName => r.il != null)
    },
  }
}

/**
 * Aynı request içinde birden çok kez çağrılabilir (örn. bir sayfa hem kendi
 * girdisini bulmak hem kardeş alanları listelemek için) — `cache()` ile
 * sarılı olduğundan tekrar DB'ye gitmez. `scope` primitif olduğu için
 * React'in argüman-eşitliği memoizasyonu güvenle çalışır.
 */
export const getSeoAreas = cache((scope: SeoScope): Promise<SeoAreaEntry[]> =>
  listSeoAreas(scope, createSeoAreaDeps()),
)
