import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { SdmxObservation } from './parse'
import type { ResolvedArea } from './areaCodes'
import type { DataflowRef, DemographicField } from './datasets'

export type MergedDistrictRow = { il: string; ilce: string } & Partial<Record<DemographicField, number>>

export interface DataflowResult {
  ref: DataflowRef
  observations: SdmxObservation[]
}

export function mergeDemographics(
  results: DataflowResult[],
  resolve: (code: string) => ResolvedArea | null,
): MergedDistrictRow[] {
  const rows = new Map<string, MergedDistrictRow>()
  const key = (il: string, ilce: string) => `${il} ${ilce}`

  // 1. Önce tüm ilçe-seviyesi gözlemler — ilçe satırlarını oluşturur.
  for (const { ref, observations } of results) {
    if (ref.level !== 'ilce') continue
    for (const obs of observations) {
      const area = resolve(obs.refArea)
      if (!area || area.ilce == null) continue
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
      if (!area) continue
      byIl.set(normalizeAreaName(area.il), obs.value)
    }
    for (const row of rows.values()) {
      const v = byIl.get(row.il)
      if (v !== undefined) row[ref.field] = v
    }
  }

  return [...rows.values()]
}
