import { getSeoAreas } from './seoAreaDeps'
import type { SeoAreaEntry, SeoScope } from './listSeoAreas'

/**
 * `generateStaticParams` için güvenli sarmalayıcı: build ortamında veritabanına
 * ulaşılamıyorsa (ör. Docker build'inde DB servisi yoktur) build'i düşürmek yerine
 * boş liste döner. Sayfalar `dynamicParams = true` ile ilk istekte üretilir ve
 * `revalidate` süresince önbellekte tutulur.
 */
export async function safeStaticParams<T>(
  scope: SeoScope,
  toParams: (entry: SeoAreaEntry) => T,
  load: (scope: SeoScope) => Promise<SeoAreaEntry[]> = getSeoAreas,
): Promise<T[]> {
  try {
    const entries = await load(scope)
    return entries.map(toParams)
  } catch (e) {
    console.warn(`[areaSeo] generateStaticParams(${scope}) atlandı:`, e instanceof Error ? e.name : 'hata')
    return []
  }
}
