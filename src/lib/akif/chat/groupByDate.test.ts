import { groupByDate } from './groupByDate'

describe('groupByDate', () => {
  it('yerel gün sınırına göre gruplar, boş grupları atlar', () => {
    const now = new Date(2026, 9, 24, 1, 0)
    const at = (d: Date) => ({ lastMessageAt: d.toISOString() })
    const today = at(new Date(2026, 9, 24, 0, 30))
    const yest = at(new Date(now.getTime() - 25 * 3600_000))
    const d3 = at(new Date(2026, 9, 21, 12, 0))
    const d10 = at(new Date(2026, 9, 14, 12, 0))
    const g = groupByDate([today, yest, d3, d10], now)
    expect(g.map((x) => x.label)).toEqual(['Bugün', 'Dün', 'Son 7 gün', 'Daha eski'])
    expect(g.every((x) => x.items.length === 1)).toBe(true)
    expect(groupByDate([today], now).map((x) => x.label)).toEqual(['Bugün'])
  })
})
