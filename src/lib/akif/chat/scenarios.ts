// Akif sohbet arayüzü — site projeleri + Akif proje kartlarını tek senaryo listesine birleştirir.
import type { WorkspaceState } from './workspace'

export type ScenarioItem = {
  key: string
  source: 'site' | 'kart'
  id: string
  name: string
  summary: string
  updatedAt: string
  workspace: WorkspaceState
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

function build(
  source: 'site' | 'kart',
  id: string,
  name: string,
  updatedAt: string,
  konum: string | null,
  alanM2: number | null,
  pay: number | null,
): ScenarioItem {
  const pct = pay === null ? null : Math.round(pay)
  const parts: string[] = []
  if (konum) parts.push(konum)
  if (alanM2 !== null) parts.push(`${alanM2} m²`)
  if (pct !== null) parts.push(`%${pct}`)
  return {
    key: `${source}:${id}`,
    source,
    id,
    name,
    summary: parts.join(' · '),
    updatedAt,
    workspace: {
      konum,
      alanM2,
      m2Fiyat: null,
      emsalNotu: null,
      arsaSahibiPct: pct,
      muteahhitPct: pct === null ? null : 100 - pct,
      varsayimlar: [],
      dolu: konum !== null || alanM2 !== null || pct !== null,
    },
  }
}

export function mergeScenarios(a: { site: unknown[]; kart: unknown[] }): ScenarioItem[] {
  const out: ScenarioItem[] = []
  for (const p of a.site ?? []) {
    if (!isRec(p) || typeof p.id !== 'string') continue
    const sc: Rec = Array.isArray(p.scenarios) && isRec(p.scenarios[0]) ? p.scenarios[0] : {}
    const ratio = num(sc.landShareRatio)
    out.push(
      build('site', p.id, str(p.name) ?? '', str(p.updatedAt) ?? '', null, num(sc.arsaAlani), ratio === null ? null : ratio * 100),
    )
  }
  for (const p of a.kart ?? []) {
    if (!isRec(p) || typeof p.id !== 'string') continue
    const inputs: Rec = isRec(p.inputs) ? p.inputs : {}
    const konum = Array.isArray(p.parcels) ? str(p.parcels[0]) : null
    out.push(
      build('kart', p.id, str(p.name) ?? '', str(p.updatedAt) ?? '', konum, num(inputs.arsaAlani), num(inputs.arsaSahibiPayiYuzde)),
    )
  }
  return out.sort((x, y) => (Date.parse(y.updatedAt) || 0) - (Date.parse(x.updatedAt) || 0))
}
