import { recommendScenario, recommendParcels } from '../recommend'
import type { ScenarioCard, ScenarioRow, ParcelCompareRow } from '../../contract'

const sRow = (label: string, v: number | null): ScenarioRow => ({
  label, arsaPayiX: 0.5, arsaSahibiDaireSayisi: null, arsaSahibiDegeriTL: v, daireSatisFiyatiTL: 1,
})
const sCard = (rows: ScenarioRow[], kind: ScenarioCard['kind'] = 'contractor_offers'): ScenarioCard => ({
  kind, rows, defaultsUsed: [], assumptions: [], emsalNote: '',
})
const pRow = (label: string, estimate: number, areaSqm: number, o: Partial<ParcelCompareRow> = {}): ParcelCompareRow => ({
  label, status: 'resolved', estimate, areaSqm, basis: 'mahalle', confidence: 'yuksek', ...o,
})

describe('recommendScenario', () => {
  it('recommendScenario picks highest arsaSahibiDegeriTL', () => {
    const card = sCard([sRow('Müteahhit %40', 1000), sRow('Müteahhit %50', 3000), sRow('Müteahhit %45', 2000)])
    const snapshot = JSON.stringify(card)
    const r = recommendScenario(card)
    expect(r?.rowIndex).toBe(1)
    expect(r?.criterion).toBe('arsa sahibi değeri')
    expect(r?.reason).toContain('Müteahhit %50')
    expect(JSON.stringify(card)).toBe(snapshot)
    expect(recommendScenario(sCard([sRow('a', 5), sRow('b', 9)], 'apartment_sizes'))?.rowIndex).toBe(1)
  })
  it('recommendScenario returns undefined on tie', () => {
    expect(recommendScenario(sCard([sRow('a', 3000), sRow('b', 3000), sRow('c', 1000)]))).toBeUndefined()
  })
  it('recommendScenario ignores null rows and needs 2 valid', () => {
    expect(recommendScenario(sCard([sRow('a', null), sRow('b', 5000)]))).toBeUndefined()
    const r = recommendScenario(sCard([sRow('a', null), sRow('b', 5000), sRow('c', 7000)]))
    expect(r?.rowIndex).toBe(2)
  })
})

const THIN = 'Bazı parsellerde veri yetersiz olduğu için doğrudan kıyaslanamaz.'
const MIXED = 'Parseller farklı veri seviyesinden (mahalle/ilçe/il) fiyatlandığı için doğrudan kıyaslanamaz.'
const SAME = 'Parseller aynı bölge değeriyle fiyatlandığı için m² değerine göre ayrım yapılamıyor.'

describe('recommendParcels', () => {
  it('picks highest estimate/area with honest region wording', () => {
    const rows = [pRow('A', 1_000_000, 500), pRow('B', 3_000_000, 1000), pRow('C', 2_000_000, 1000)]
    const snapshot = JSON.stringify(rows)
    const r = recommendParcels(rows)
    expect(r.recommendation?.rowIndex).toBe(1)
    expect(r.recommendation?.criterion).toBe('bölge m² değeri (mahalle medyanı)')
    expect(r.recommendation?.reason).toBe(
      `B parselinin bulunduğu bölgede (mahalle medyanı) m² değeri daha yüksek (${(3000).toLocaleString('tr-TR')} ₺/m²).`,
    )
    expect(r.note).toBeUndefined()
    expect(JSON.stringify(rows)).toBe(snapshot)
  })
  it('uses ilçe / il wording from the shared basis', () => {
    const ilce = recommendParcels([pRow('A', 1e6, 500, { basis: 'ilce' }), pRow('B', 3e6, 1000, { basis: 'ilce' })])
    expect(ilce.recommendation?.criterion).toBe('bölge m² değeri (ilçe medyanı)')
    const il = recommendParcels([pRow('A', 1e6, 500, { basis: 'il' }), pRow('B', 3e6, 1000, { basis: 'il' })])
    expect(il.recommendation?.criterion).toBe('bölge m² değeri (il medyanı)')
  })
  it('rounds unit value consistently (no decimals in reason)', () => {
    const r = recommendParcels([pRow('A', 1_000_001, 810), pRow('B', 500_000, 810)])
    expect(r.recommendation?.rowIndex).toBe(0)
    expect(r.recommendation?.reason).toContain(`${Math.round(1_000_001 / 810).toLocaleString('tr-TR')} ₺/m²`)
    expect(r.recommendation?.reason).not.toMatch(/,\d/)
  })
  it('mixed basis among resolved candidates gives the exact mixed-basis note', () => {
    const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000, { basis: 'ilce' })])
    expect(r.recommendation).toBeUndefined()
    expect(r.note).toBe(MIXED)
  })
  it('a non-resolved row with a different basis does not trigger the mixed-basis note', () => {
    const r = recommendParcels([
      { label: 'X', status: 'ambiguous', basis: 'il', estimate: 1, areaSqm: 1 },
      pRow('A', 1e6, 500),
      pRow('B', 3e6, 1000),
    ])
    expect(r.note).toBeUndefined()
    expect(r.recommendation?.rowIndex).toBe(2)
  })
  it.each([
    ['thinData', { thinData: true }],
    ['confidence dusuk', { confidence: 'dusuk' as const }],
  ])('resolved row with %s suppresses recommendation with data note, even with >=2 clean rows', (_n, o) => {
    const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000), pRow('C', 2e6, 1000, o)])
    expect(r.recommendation).toBeUndefined()
    expect(r.note).toBe(THIN)
  })
  it('resolved row with areaSqm <= 0 suppresses with data note', () => {
    for (const area of [0, -5]) {
      const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000), pRow('C', 2e6, area)])
      expect(r.recommendation).toBeUndefined()
      expect(r.note).toBe(THIN)
    }
  })
  it('resolved row without estimate suppresses with data note', () => {
    const missing: ParcelCompareRow = { label: 'C', status: 'resolved', areaSqm: 500, basis: 'mahalle', confidence: 'yuksek' }
    const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000), missing])
    expect(r.recommendation).toBeUndefined()
    expect(r.note).toBe(THIN)
  })
  it('fewer than 2 candidates sets the data note', () => {
    expect(recommendParcels([pRow('A', 1e6, 500)]).note).toBe(THIN)
    expect(recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000, { thinData: true })]).note).toBe(THIN)
  })
  it('absent confidence stays a candidate', () => {
    const noConf = (l: string, e: number, a: number): ParcelCompareRow => ({ label: l, status: 'resolved', estimate: e, areaSqm: a, basis: 'mahalle' })
    const r = recommendParcels([noConf('A', 1e6, 500), noConf('B', 3e6, 1000)])
    expect(r.recommendation?.rowIndex).toBe(1)
    expect(r.note).toBeUndefined()
  })
  it('exact tie gives no recommendation and the same-value note', () => {
    const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 2e6, 1000)])
    expect(r.recommendation).toBeUndefined()
    expect(r.note).toBe(SAME)
  })
  it('within 1% gives no recommendation; exactly 1% still recommends', () => {
    const near = recommendParcels([pRow('A', 1_000_000, 500), pRow('B', 2_010_000, 1000)])
    expect(near.recommendation).toBeUndefined()
    expect(near.note).toBe(SAME)
    const edge = recommendParcels([pRow('A', 10_000 * 500, 500), pRow('B', 9_900 * 500, 500)])
    expect(edge.recommendation?.rowIndex).toBe(0)
  })
  it('ignores non-resolved rows without suppressing the pick', () => {
    const rows: ParcelCompareRow[] = [
      { label: 'X', status: 'ambiguous', estimate: 9e9, areaSqm: 1 },
      { label: 'Y', status: 'parcel_unavailable' },
      pRow('A', 1e6, 500),
      pRow('B', 3e6, 1000),
    ]
    const r = recommendParcels(rows)
    expect(r.recommendation?.rowIndex).toBe(3)
    expect(r.note).toBeUndefined()
  })
})
