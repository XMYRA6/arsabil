import { formatFaultDistance } from './formatDistance'

describe('formatFaultDistance', () => {
  it('null → 25 km üstü metni', () => {
    expect(formatFaultDistance(null)).toBe('25 km’den uzak')
  })
  it('1000 m ve üstü → km, bir ondalık, virgül', () => {
    expect(formatFaultDistance(1800)).toBe('1,8 km')
    expect(formatFaultDistance(12000)).toBe('12,0 km')
  })
  it('1000 m altı → metre', () => {
    expect(formatFaultDistance(850)).toBe('850 m')
  })
})
