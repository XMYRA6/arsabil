import { classifyFacts, FACT_TTL_DAYS, type FactRow } from '../freshness'

const NOW = new Date('2026-10-15T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)
const row = (key: FactRow['key'], ageDays: number, value: unknown = 1): FactRow => ({
  key,
  value,
  source: 'kullanici',
  recordedAt: daysAgo(ageDays),
})

describe('FACT_TTL_DAYS', () => {
  it('spec ömürleri', () => {
    expect(FACT_TTL_DAYS.areaSqm).toBeNull()
    expect(FACT_TTL_DAYS.imarDurumu).toBe(180)
    expect(FACT_TTL_DAYS.emsal).toBe(180)
    expect(FACT_TTL_DAYS.katAdedi).toBe(180)
    expect(FACT_TTL_DAYS.taks).toBe(180)
    expect(FACT_TTL_DAYS.hmax).toBe(180)
    expect(FACT_TTL_DAYS.daireFiyati).toBe(45)
    expect(FACT_TTL_DAYS.malik).toBe(365)
  })
})

describe('classifyFacts', () => {
  it('süresiz olgu asla bayatlamaz', () => {
    const r = classifyFacts([row('areaSqm', 5000)], NOW)
    expect(r.taze.map((f) => f.key)).toEqual(['areaSqm'])
    expect(r.bayat).toEqual([])
  })

  it('180 gün sınırında taze, ötesinde bayat', () => {
    const r = classifyFacts([row('emsal', 180), row('imarDurumu', 181)], NOW)
    expect(r.taze.map((f) => f.key)).toEqual(['emsal'])
    expect(r.bayat.map((f) => f.key)).toEqual(['imarDurumu'])
  })

  it('daire fiyatı 45 günden sonra bayat', () => {
    const r = classifyFacts([row('daireFiyati', 46)], NOW, [])
    expect(r.bayat.map((f) => f.key)).toEqual(['daireFiyati'])
  })

  it('zorunlu olup olmayanlar eksik listesine girer (varsayılan zorunlular)', () => {
    const r = classifyFacts([row('areaSqm', 1)], NOW)
    expect(r.eksik).toEqual(['imarDurumu', 'emsal', 'katAdedi'])
  })

  it('aynı anahtarın birden fazla satırında en yenisi kullanılır', () => {
    const r = classifyFacts([row('emsal', 400, 1.0), row('emsal', 10, 1.5)], NOW)
    expect(r.taze).toHaveLength(1)
    expect(r.taze[0].value).toBe(1.5)
    expect(r.bayat).toEqual([])
  })

  it('özel zorunlu liste verilebilir; hepsi varsa eksik boş', () => {
    const r = classifyFacts([row('emsal', 1)], NOW, ['emsal'])
    expect(r.eksik).toEqual([])
  })
})
