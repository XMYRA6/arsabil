import { resolveAreaTrend } from '../resolveAreaTrend'

const b = (scope: 'il' | 'ilce' | 'mahalle', ym: string, median: number, n = 10) => ({ scope, monthBucket: new Date(`${ym}-01T00:00:00Z`), medianPricePerSqm: median, sampleCount: n })
const SUB = { il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UGURLU' }

describe('resolveAreaTrend', () => {
  it('mahalle ≥ 3 kova → mahalle basis, artan sıralı', () => {
    const rows = [b('mahalle','2026-08',5000), b('mahalle','2026-06',4600), b('mahalle','2026-07',4800), b('ilce','2026-08',5200)]
    const r = resolveAreaTrend(rows, SUB)
    expect(r?.basis).toBe('mahalle')
    expect(r?.buckets.map(x => x.medianPricePerSqm)).toEqual([4600, 4800, 5000])
  })
  it('mahalle 1 kova → ilçe fallback', () => {
    const rows = [b('mahalle','2026-08',5000), b('ilce','2026-06',4900), b('ilce','2026-07',5000), b('ilce','2026-08',5100)]
    expect(resolveAreaTrend(rows, SUB)?.basis).toBe('ilce')
  })
  it('hiçbiri yeterli değil → null', () => {
    expect(resolveAreaTrend([b('mahalle','2026-08',5000), b('ilce','2026-08',5200)], SUB)).toBeNull()
  })
})
