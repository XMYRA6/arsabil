import { DEFAULT_CONFIG, randDelayMs } from '../config'

describe('config', () => {
  it('varsayılanlar spec ile uyumlu', () => {
    expect(DEFAULT_CONFIG.minDelayMs).toBe(20_000)
    expect(DEFAULT_CONFIG.maxDelayMs).toBe(40_000)
    expect(DEFAULT_CONFIG.maxRequestsPerRun).toBe(600)
    expect(DEFAULT_CONFIG.detailRefreshDays).toBe(7)
    expect(DEFAULT_CONFIG.unparseableAbortRatio).toBe(0.3)
  })
  it('randDelayMs aralık içinde', () => {
    for (let i = 0; i < 50; i++) {
      const d = randDelayMs(DEFAULT_CONFIG)
      expect(d).toBeGreaterThanOrEqual(20_000)
      expect(d).toBeLessThanOrEqual(40_000)
    }
  })
})
