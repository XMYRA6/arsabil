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

describe('recommendParcels', () => {
  it('recommendParcels picks highest estimate/area', () => {
    const rows = [pRow('A', 1_000_000, 500), pRow('B', 3_000_000, 1000), pRow('C', 2_000_000, 1000)]
    const snapshot = JSON.stringify(rows)
    const r = recommendParcels(rows)
    expect(r.recommendation?.rowIndex).toBe(1)
    expect(r.recommendation?.criterion).toBe('m² birim değeri')
    expect(r.recommendation?.reason).toContain((3000).toLocaleString('tr-TR'))
    expect(r.recommendation?.reason).toContain('₺/m²')
    expect(JSON.stringify(rows)).toBe(snapshot)
  })
  it('recommendParcels undefined when basis differs and sets note', () => {
    const r = recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000, { basis: 'ilce' })])
    expect(r.recommendation).toBeUndefined()
    expect(r.note).toBe('Parseller farklı veri seviyesinden (mahalle/ilçe/il) fiyatlandığı için doğrudan kıyaslanamaz.')
  })
  it('recommendParcels undefined when thinData or confidence dusuk row makes candidates <2', () => {
    expect(recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000, { thinData: true })]).recommendation).toBeUndefined()
    expect(recommendParcels([pRow('A', 1e6, 500), pRow('B', 3e6, 1000, { confidence: 'dusuk' })]).recommendation).toBeUndefined()
  })
  it('recommendParcels undefined within 1% tie', () => {
    const r = recommendParcels([pRow('A', 1_000_000, 500), pRow('B', 2_010_000, 1000)])
    expect(r.recommendation).toBeUndefined()
  })
  it('recommendParcels ignores non-resolved rows', () => {
    const rows: ParcelCompareRow[] = [
      { label: 'X', status: 'ambiguous', estimate: 9e9, areaSqm: 1 },
      pRow('A', 1e6, 500),
      pRow('B', 3e6, 1000),
    ]
    const r = recommendParcels(rows)
    expect(r.recommendation?.rowIndex).toBe(2)
  })
})
