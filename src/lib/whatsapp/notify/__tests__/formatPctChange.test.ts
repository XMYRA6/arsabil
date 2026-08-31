import { formatPctChange, ymKey } from '../formatPctChange'

describe('ymKey', () => {
  it('UTC yıl-ay', () => {
    expect(ymKey(new Date('2026-08-03T00:00:00Z'))).toBe('2026-08')
  })
})

describe('formatPctChange', () => {
  it('artış', () => expect(formatPctChange(4200, 4378)).toBe('%4,2 artış'))
  it('düşüş', () => expect(formatPctChange(5000, 4460)).toBe('%10,8 düşüş'))
  it('eşik altı', () => expect(formatPctChange(4000, 4012)).toBe('değişim yok'))
})
