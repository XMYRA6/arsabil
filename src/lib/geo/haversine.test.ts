import { haversineMeters } from './haversine'

describe('haversineMeters', () => {
  it('aynı nokta → 0', () => {
    expect(haversineMeters({ lat: 41, lng: 39 }, { lat: 41, lng: 39 })).toBe(0)
  })
  it('~1 derece boylam farkı ekvatora yakın ~111 km değil ama Trabzon enleminde ~84 km', () => {
    // Trabzon ~41°N: 1° boylam ≈ 111320 * cos(41°) ≈ 84 km
    const d = haversineMeters({ lat: 41, lng: 39 }, { lat: 41, lng: 40 })
    expect(d).toBeGreaterThan(83000)
    expect(d).toBeLessThan(85000)
  })
  it('~1 derece enlem farkı ≈ 111 km', () => {
    const d = haversineMeters({ lat: 41, lng: 39 }, { lat: 42, lng: 39 })
    expect(d).toBeGreaterThan(110000)
    expect(d).toBeLessThan(112000)
  })
  it('kısa mesafe (~500 m) makul', () => {
    const d = haversineMeters({ lat: 41.0, lng: 39.0 }, { lat: 41.0045, lng: 39.0 })
    expect(d).toBeGreaterThan(490)
    expect(d).toBeLessThan(510)
  })
})
