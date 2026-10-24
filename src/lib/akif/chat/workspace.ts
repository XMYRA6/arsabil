// Akif sohbet arayüzü — çalışma paneli durumu (saf mantık, React yok).
import type { AkifTurn, ScenarioCard, ToolResultCard } from '@/lib/ai/akif/contract'

export type WorkspaceState = {
  konum: string | null
  alanM2: number | null
  m2Fiyat: number | null
  emsalNotu: string | null
  arsaSahibiPct: number | null
  muteahhitPct: number | null
  varsayimlar: string[]
  dolu: boolean
}

type Source = { turn?: AkifTurn | null; card?: ToolResultCard | null }

export function deriveWorkspace(sources: Source[]): WorkspaceState {
  let konum: string | null = null
  let alanM2: number | null = null
  let m2Fiyat: number | null = null
  let arsaSahibiPct: number | null = null
  let muteahhitPct: number | null = null
  let lastScenario: ScenarioCard | null = null
  const turnAssumptions: string[] = []

  const consume = (c: ToolResultCard | null | undefined) => {
    if (!c) return
    if (c.kind === 'parcel') {
      if (c.status !== 'resolved' || !c.dto) return
      const { parcel, value } = c.dto
      konum = `${parcel.mahalle}, ${parcel.ilce}/${parcel.il}`
      alanM2 = parcel.areaSqm ?? null
      m2Fiyat = value?.pricePerSqm?.mahalle ?? value?.pricePerSqm?.ilce ?? value?.pricePerSqmCoarse ?? null
    } else if (c.kind === 'contractor_offers' || c.kind === 'apartment_sizes') {
      lastScenario = c
      if (c.kind === 'contractor_offers' && c.rows?.[0]) {
        arsaSahibiPct = Math.round(c.rows[0].arsaPayiX * 100)
        muteahhitPct = 100 - arsaSahibiPct
      }
    }
  }

  for (const s of sources) {
    if (s.turn) {
      consume(s.turn.tool_result)
      turnAssumptions.push(...(s.turn.assumptions ?? []))
    }
    consume(s.card)
  }

  const sc = lastScenario as ScenarioCard | null
  const emsalNotu = sc?.emsalNote ? sc.emsalNote : null
  const varsayimlar = Array.from(
    new Set([...(sc?.defaultsUsed ?? []), ...(sc?.assumptions ?? []), ...turnAssumptions]),
  )
  const dolu =
    konum !== null || alanM2 !== null || m2Fiyat !== null || emsalNotu !== null ||
    arsaSahibiPct !== null || muteahhitPct !== null || varsayimlar.length > 0

  return { konum, alanM2, m2Fiyat, emsalNotu, arsaSahibiPct, muteahhitPct, varsayimlar, dolu }
}

type DiffKey = 'konum' | 'alanM2' | 'm2Fiyat' | 'arsaSahibiPct' | 'muteahhitPct'
const DIFF_KEYS: DiffKey[] = ['konum', 'alanM2', 'm2Fiyat', 'arsaSahibiPct', 'muteahhitPct']

export function diffWorkspace(
  prev: WorkspaceState,
  next: WorkspaceState,
): Partial<Record<DiffKey, { from: unknown; to: unknown }>> {
  const out: Partial<Record<DiffKey, { from: unknown; to: unknown }>> = {}
  for (const k of DIFF_KEYS) {
    if (prev[k] !== null && prev[k] !== next[k]) out[k] = { from: prev[k], to: next[k] }
  }
  return out
}
