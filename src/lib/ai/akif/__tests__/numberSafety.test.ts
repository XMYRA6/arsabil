import { extractNumbers, validateRange, isOutOfRange } from '../numberSafety'

describe('extractNumbers', () => {
  it('yüzde', () => {
    expect(extractNumbers('müteahhit yüzde elli istiyor')).toContainEqual(
      expect.objectContaining({ value: 50, kind: 'percent' }),
    )
  })
  it('sözlü ondalık lowConfidence', () => {
    const n = extractNumbers('emsal bir virgül elli')
    expect(n).toContainEqual(expect.objectContaining({ value: 1.5, kind: 'ratio', lowConfidence: true }))
  })
  it('alan', () => {
    expect(extractNumbers('900 m² arsam var')).toContainEqual(
      expect.objectContaining({ value: 900, kind: 'area' }),
    )
  })
  it('sözlü tam sayı', () => {
    expect(extractNumbers('dokuz yüz metrekare')).toContainEqual(
      expect.objectContaining({ value: 900, lowConfidence: true }),
    )
  })
  it('düz sayı 1.500', () => {
    expect(extractNumbers('1.500 lira')).toContainEqual(expect.objectContaining({ value: 1500 }))
  })
})
describe('validateRange', () => {
  it('yüzde 120 → false', () => expect(validateRange('percent', 120)).toBe(false))
  it('emsal 15 → false', () => expect(validateRange('emsal', 15)).toBe(false))
  it('emsal 1.5 → true', () => expect(validateRange('emsal', 1.5)).toBe(true))
  it('daire 100 → true', () => expect(validateRange('daire', 100)).toBe(true))
})
describe('isOutOfRange', () => {
  it('emsal kind ratio 15 → true', () => expect(isOutOfRange('ratio', 15)).toBe(true))
})
