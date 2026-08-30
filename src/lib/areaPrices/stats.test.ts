import { median, percentile } from './stats'

describe('median', () => {
  it('tek sayıda eleman: ortadaki', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
  it('çift sayıda eleman: ortadaki ikinin ortalaması', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('tek eleman', () => {
    expect(median([7])).toBe(7)
  })
  it('boş dizi fırlatır', () => {
    expect(() => median([])).toThrow()
  })
})

describe('percentile', () => {
  it('p50 medyana eşittir (çift)', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5)
  })
  it('p25 lineer enterpolasyon', () => {
    // sıralı [10,20,30,40,50], rank = 0.25*(5-1)=1.0 -> tam index 1 -> 20
    expect(percentile([50, 10, 40, 20, 30], 25)).toBe(20)
  })
  it('p75 lineer enterpolasyon (kesirli rank)', () => {
    // [10,20,30,40], rank = 0.75*3 = 2.25 -> 30 + 0.25*(40-30) = 32.5
    expect(percentile([10, 20, 30, 40], 75)).toBe(32.5)
  })
  it('tek eleman her p için o eleman', () => {
    expect(percentile([42], 10)).toBe(42)
    expect(percentile([42], 90)).toBe(42)
  })
})
