import type { ScenarioCard, ToolResultCard } from '../contract'

describe('Recommendation / ParcelCompareCard sözleşmesi', () => {
  it('ScenarioCard recommendation taşıyabilir', () => {
    const s: ScenarioCard = {
      kind: 'contractor_offers',
      rows: [],
      defaultsUsed: [],
      assumptions: [],
      emsalNote: '',
      recommendation: { rowIndex: 1, criterion: 'arsa sahibi değeri', reason: 'x' },
    }
    expect(s.recommendation?.rowIndex).toBe(1)
  })

  it('ParcelCompareCard ToolResultCard olarak atanabilir', () => {
    const c: ToolResultCard = {
      kind: 'parcel_compare',
      tier: 'member',
      rows: [{ label: 'A', status: 'resolved', basis: 'mahalle', confidence: 'orta' }],
      recommendation: { rowIndex: 0, criterion: 'm² fiyatı', reason: 'y' },
    }
    expect(c.kind).toBe('parcel_compare')
  })
})
