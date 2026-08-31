import { formatTl, formatTlShort } from '../formatTl'

describe('formatTl', () => {
  it('binlik ayraç', () => {
    expect(formatTl(2352000)).toBe('2.352.000')
    expect(formatTl(0)).toBe('0')
  })
})
describe('formatTlShort', () => {
  it('milyon kısaltması virgüllü', () => {
    expect(formatTlShort(2352000)).toBe('2,4M')
    expect(formatTlShort(2040000)).toBe('2M')
  })
  it('bin kısaltması', () => {
    expect(formatTlShort(48000)).toBe('48 B')
  })
  it('küçük sayı tam', () => {
    expect(formatTlShort(4900)).toBe('4.900')
  })
})
