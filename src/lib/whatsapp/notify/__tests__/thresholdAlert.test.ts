import { thresholdAlert } from '../thresholdAlert'

const now = new Date('2026-08-15T00:00:00Z')
const b = (scope: 'il' | 'ilce' | 'mahalle', ym: string, median: number, n = 10) => ({ scope, monthBucket: new Date(`${ym}-01T00:00:00Z`), medianPricePerSqm: median, sampleCount: n })
const SUB = { il: 'T', ilce: 'O', mahalle: 'U' }
const base3 = [b('mahalle','2026-05',4000), b('mahalle','2026-06',4000), b('mahalle','2026-07',4000)]
const opts = { minSample: 5, pct: 0.10 }

describe('thresholdAlert', () => {
  it('%8 hareket → no fire', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',4320)], SUB, now, opts).fire).toBe(false)
  })
  it('%12 artış → fire up', () => {
    const r = thresholdAlert([...base3, b('mahalle','2026-08',4480)], SUB, now, opts)
    expect(r).toMatchObject({ fire: true, direction: 'up', baseline: 4000, current: 4480 })
  })
  it('current ince örneklem → no fire', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',4480,3)], SUB, now, opts).fire).toBe(false)
  })
  it('baseline eksik kova → no fire', () => {
    expect(thresholdAlert([b('mahalle','2026-06',4000), b('mahalle','2026-07',4000), b('mahalle','2026-08',4480)], SUB, now, opts).fire).toBe(false)
  })
  it('%15 düşüş → fire down', () => {
    expect(thresholdAlert([...base3, b('mahalle','2026-08',3400)], SUB, now, opts).direction).toBe('down')
  })
})
