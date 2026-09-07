import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { SdmxObservation } from './parse'
import type { ResolvedArea } from './areaCodes'
import type { DataflowRef, DemographicField } from './datasets'

export type MergedDistrictRow = { il: string; ilce: string } & Partial<Record<DemographicField, number>>

export interface DataflowResult {
  ref: DataflowRef
  observations: SdmxObservation[]
}

/**
 * Birleştirme sırasında toplanan sağlık sayaçları. `run.ts` bunları `RunSummary` +
 * `CrawlRun.notes`'a taşır — `AREA_CODES` eksik/bozuksa tur "sağlıklı" görünür
 * (blocked:false, gözlem dolu, upserted:0), sayaç bunu görünür yapar.
 */
export interface MergeStats {
  /** `resolve()` null döndüren, boş olmayan ve "_T" (ulusal toplam) olmayan kod sayısı. */
  unresolvedCodes: number
  /** İlk ~10 çözülemeyen kod (tekrarsız) — teşhis için. */
  unresolvedSamples: string[]
  /** Faz 2'de aynı il için ikinci kez il-seviyesi değer görülme sayısı. */
  byIlConflicts: number
}

export function newMergeStats(): MergeStats {
  return { unresolvedCodes: 0, unresolvedSamples: [], byIlConflicts: 0 }
}

const SAMPLE_CAP = 10

export function mergeDemographics(
  results: DataflowResult[],
  resolve: (code: string) => ResolvedArea | null,
  stats?: MergeStats,
): MergedDistrictRow[] {
  const rows = new Map<string, MergedDistrictRow>()
  const key = (il: string, ilce: string) => `${il} ${ilce}`

  const countUnresolved = (code: string) => {
    if (!stats) return
    // "_T" = ulusal toplam, bilerek çözülmez — anomali değil.
    if (!code || code === '_T') return
    stats.unresolvedCodes++
    if (
      stats.unresolvedSamples.length < SAMPLE_CAP &&
      !stats.unresolvedSamples.includes(code)
    ) {
      stats.unresolvedSamples.push(code)
    }
  }

  // 1. Önce tüm ilçe-seviyesi gözlemler — ilçe satırlarını oluşturur.
  for (const { ref, observations } of results) {
    if (ref.level !== 'ilce') continue
    for (const obs of observations) {
      const area = resolve(obs.refArea)
      if (!area) { countUnresolved(obs.refArea); continue }
      if (area.ilce == null) continue
      const il = normalizeAreaName(area.il)
      const ilce = normalizeAreaName(area.ilce)
      const row = rows.get(key(il, ilce)) ?? { il, ilce }
      row[ref.field] = obs.value
      rows.set(key(il, ilce), row)
    }
  }

  // 2. İl-seviyesi gözlemler — o ilin MEVCUT ilçe satırlarına yayılır (yeni satır AÇMAZ).
  for (const { ref, observations } of results) {
    if (ref.level !== 'il') continue
    const byIl = new Map<string, number>()
    for (const obs of observations) {
      const area = resolve(obs.refArea)
      if (!area) { countUnresolved(obs.refArea); continue }
      // Simetrik koruma: il-seviyesi dataflow'da yanlış etiketli bir ilçe satırı
      // her ilçeye yayılamasın.
      if (area.ilce != null) continue
      const il = normalizeAreaName(area.il)
      if (byIl.has(il) && stats) stats.byIlConflicts++
      byIl.set(il, obs.value)
    }
    for (const row of rows.values()) {
      const v = byIl.get(row.il)
      if (v !== undefined) row[ref.field] = v
    }
  }

  return [...rows.values()]
}
