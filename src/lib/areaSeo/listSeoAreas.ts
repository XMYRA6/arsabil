import { slugify } from './slug'
import { resolveDisplayNames, areaLookupKey, type RawAreaName } from './displayName'

export type SeoScope = 'il' | 'ilce' | 'mahalle'

export interface AreaPriceStatScopeRow {
  il: string
  ilce: string | null
  mahalle: string | null
  sampleCount: number
}

export interface SeoAreaEntry {
  scope: SeoScope
  ilNorm: string
  ilceNorm: string | null
  mahalleNorm: string | null
  ilSlug: string
  ilceSlug: string | null
  mahalleSlug: string | null
  ilDisplay: string
  ilceDisplay: string | null
  mahalleDisplay: string | null
  sampleCount: number
}

export interface ListSeoAreasDeps {
  findAreaPriceStats: (scope: SeoScope) => Promise<AreaPriceStatScopeRow[]>
  listDistinctMarketAreas: () => Promise<RawAreaName[]>
}

const MIN_SAMPLE: Record<SeoScope, number> = { il: 0, ilce: 5, mahalle: 8 }

export async function listSeoAreas(scope: SeoScope, deps: ListSeoAreasDeps): Promise<SeoAreaEntry[]> {
  const rows = await deps.findAreaPriceStats(scope)
  const min = MIN_SAMPLE[scope]
  const eligible = rows.filter((r) => r.sampleCount >= min)

  const displayMap = await resolveDisplayNames(
    eligible.map((r) => ({ il: r.il, ilce: r.ilce, mahalle: r.mahalle })),
    deps,
  )

  const slugSeen = new Map<string, string>()
  const out: SeoAreaEntry[] = []
  for (const r of eligible) {
    const key = areaLookupKey(r.il, r.ilce, r.mahalle)
    const disp = displayMap.get(key)!
    const ilSlug = slugify(disp.il)
    const ilceSlug = disp.ilce != null ? slugify(disp.ilce) : null
    const mahalleSlug = disp.mahalle != null ? slugify(disp.mahalle) : null
    const fullSlug = [ilSlug, ilceSlug, mahalleSlug].filter(Boolean).join('/')

    const prevKey = slugSeen.get(fullSlug)
    if (prevKey && prevKey !== key) {
      console.warn(
        `[areaSeo] slug çakışması: "${fullSlug}" hem "${prevKey}" hem "${key}" için üretildi — ikincisi atlandı`,
      )
      continue
    }
    slugSeen.set(fullSlug, key)

    out.push({
      scope,
      ilNorm: r.il,
      ilceNorm: r.ilce,
      mahalleNorm: r.mahalle,
      ilSlug,
      ilceSlug,
      mahalleSlug,
      ilDisplay: disp.il,
      ilceDisplay: disp.ilce,
      mahalleDisplay: disp.mahalle,
      sampleCount: r.sampleCount,
    })
  }
  return out
}

export function findBySlug(
  entries: SeoAreaEntry[],
  slugs: { il: string; ilce?: string; mahalle?: string },
): SeoAreaEntry | undefined {
  return entries.find(
    (e) =>
      e.ilSlug === slugs.il &&
      (slugs.ilce === undefined ? e.ilceSlug == null : e.ilceSlug === slugs.ilce) &&
      (slugs.mahalle === undefined ? e.mahalleSlug == null : e.mahalleSlug === slugs.mahalle),
  )
}
