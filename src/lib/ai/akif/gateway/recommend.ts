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

const BASIS_TR = { mahalle: 'mahalle', ilce: 'ilçe', il: 'il' } as const

export const DATA_THIN_NOTE = 'Bazı parsellerde veri yetersiz olduğu için doğrudan kıyaslanamaz.'
export const MIXED_BASIS_NOTE = 'Parseller farklı veri seviyesinden (mahalle/ilçe/il) fiyatlandığı için doğrudan kıyaslanamaz.'
export const SAME_VALUE_NOTE = 'Parseller aynı bölge değeriyle fiyatlandığı için m² değerine göre ayrım yapılamıyor.'

// ₺/m² birim değeri bölge (mahalle/ilçe/il) medyanından gelir; parsele özgü değildir.
// Kural: karşılaştırılabilir adaylar arasında en yüksek birim değer; eşitlikte öneri yok.
export function recommendParcels(rows: ParcelCompareRow[]): { recommendation?: Recommendation; note?: string } {
  const resolved = rows.map((r, idx) => ({ r, idx })).filter((x) => x.r.status === 'resolved')
  // Çözülmüş ama veri kalitesi düşük satır varsa doğrudan kıyaslanamaz (çözülmemiş satırlar sayılmaz).
  const cands: { idx: number; unit: number; basis?: string }[] = []
  let dirty = false
  for (const { r, idx } of resolved) {
    if (
      typeof r.estimate === 'number' &&
      Number.isFinite(r.estimate) &&
      typeof r.areaSqm === 'number' &&
      r.areaSqm > 0 &&
      !r.thinData &&
      r.confidence !== 'dusuk'
    ) {
      cands.push({ idx, unit: Math.round(r.estimate / r.areaSqm), basis: r.basis })
    } else {
      dirty = true
    }
  }
  if (dirty || cands.length < 2) return { note: DATA_THIN_NOTE }
  if (new Set(cands.map((c) => c.basis)).size > 1) return { note: MIXED_BASIS_NOTE }
  const sorted = [...cands].sort((a, b) => b.unit - a.unit)
  const [top, second] = sorted
  if (top.unit <= 0 || (top.unit - second.unit) / top.unit < 0.01) return { note: SAME_VALUE_NOTE }
  const basisTR = top.basis && top.basis in BASIS_TR ? BASIS_TR[top.basis as keyof typeof BASIS_TR] : 'bölge'
  return {
    recommendation: {
      rowIndex: top.idx,
      criterion: `bölge m² değeri (${basisTR} medyanı)`,
      reason: `${rows[top.idx].label} parselinin bulunduğu bölgede (${basisTR} medyanı) m² değeri daha yüksek (${tr(top.unit)} ₺/m²).`,
    },
  }
}
