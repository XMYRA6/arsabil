import { findDupes, type DedupeCandidate } from '../pipeline/dedupe'

const c = (over: Partial<DedupeCandidate>): DedupeCandidate => ({
  id: 'x', source: 'sahibinden', ilce: 'URLA', mahalle: 'DENİZLİ',
  areaSqm: 500, price: 10_000_000, listingType: 'arsa',
  firstSeenAt: new Date('2025-01-01'), ...over,
})

describe('findDupes', () => {
  it('farklı portalda aynı ilan → yeni olan asıla işaret eder', () => {
    const a = c({ id: 'a', source: 'sahibinden', firstSeenAt: new Date('2025-01-01') })
    const b = c({ id: 'b', source: 'emlakjet', firstSeenAt: new Date('2025-02-01') })
    const map = findDupes([a, b])
    expect(map.get('b')).toBe('a')
    expect(map.has('a')).toBe(false)
  })

  it('alan ±%5, fiyat ±%3 toleransı', () => {
    const a = c({ id: 'a', areaSqm: 500, price: 10_000_000 })
    const b = c({ id: 'b', source: 'hepsiemlak', areaSqm: 520, price: 10_250_000, firstSeenAt: new Date('2025-03-01') })
    expect(findDupes([a, b]).get('b')).toBe('a')
  })

  it('farklı mahalle → kopya değil', () => {
    const a = c({ id: 'a', mahalle: 'DENİZLİ' })
    const b = c({ id: 'b', mahalle: 'İSKELE', firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('fiyat ya da alan null → eşleştirme yapılmaz', () => {
    const a = c({ id: 'a', price: null })
    const b = c({ id: 'b', price: null, firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('aynı portalda iki kayıt kopya sayılmaz (portal kendi içinde tekrarlamaz)', () => {
    const a = c({ id: 'a', source: 'sahibinden' })
    const b = c({ id: 'b', source: 'sahibinden', firstSeenAt: new Date('2025-02-01') })
    expect(findDupes([a, b]).size).toBe(0)
  })

  it('üçlü küme: en eskisi asıl, diğer ikisi ona işaret eder', () => {
    const a = c({ id: 'a', source: 'sahibinden', firstSeenAt: new Date('2025-01-01') })
    const b = c({ id: 'b', source: 'emlakjet', firstSeenAt: new Date('2025-02-01') })
    const d = c({ id: 'd', source: 'hepsiemlak', firstSeenAt: new Date('2025-03-01') })
    const map = findDupes([a, b, d])
    expect(map.get('b')).toBe('a')
    expect(map.get('d')).toBe('a')
  })
})
