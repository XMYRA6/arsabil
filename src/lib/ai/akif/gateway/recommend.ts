import type { ParcelCompareRow, Recommendation, ScenarioCard } from '../contract'

const tr = (n: number) => Math.round(n).toLocaleString('tr-TR')

export function recommendScenario(card: ScenarioCard): Recommendation | undefined {
  if (card.kind !== 'contractor_offers' && card.kind !== 'apartment_sizes') return undefined
  const valid: { idx: number; v: number }[] = []
  card.rows.forEach((r, idx) => {
    if (typeof r.arsaSahibiDegeriTL === 'number' && Number.isFinite(r.arsaSahibiDegeriTL)) {
      valid.push({ idx, v: r.arsaSahibiDegeriTL })
    }
  })
  if (valid.length < 2) return undefined
  const sorted = [...valid].sort((a, b) => b.v - a.v)
  if (sorted[0].v === sorted[1].v) return undefined
  const best = sorted[0]
  return {
    rowIndex: best.idx,
    criterion: 'arsa sahibi değeri',
    reason: `${card.rows[best.idx].label} seçeneğinde arsa sahibi değeri en yüksek (${tr(best.v)} ₺).`,
  }
}

export function recommendParcels(rows: ParcelCompareRow[]): { recommendation?: Recommendation; note?: string } {
  const cands: { idx: number; unit: number; basis?: string }[] = []
  rows.forEach((r, idx) => {
    if (
      r.status === 'resolved' &&
      typeof r.estimate === 'number' &&
      typeof r.areaSqm === 'number' &&
      r.areaSqm > 0 &&
      !r.thinData &&
      r.confidence !== 'dusuk'
    ) {
      cands.push({ idx, unit: r.estimate / r.areaSqm, basis: r.basis })
    }
  })
  if (cands.length < 2) return {}
  if (new Set(cands.map((c) => c.basis)).size > 1) {
    return { note: 'Parseller farklı veri seviyesinden (mahalle/ilçe/il) fiyatlandığı için doğrudan kıyaslanamaz.' }
  }
  const sorted = [...cands].sort((a, b) => b.unit - a.unit)
  const [top, second] = sorted
  if (top.unit <= 0 || (top.unit - second.unit) / top.unit < 0.01) return {}
  return {
    recommendation: {
      rowIndex: top.idx,
      criterion: 'm² birim değeri',
      reason: `${rows[top.idx].label} parselinin m² birim değeri en yüksek (${tr(top.unit)} ₺/m²).`,
    },
  }
}
