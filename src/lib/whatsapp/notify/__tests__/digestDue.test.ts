import { digestDue } from '../digestDue'

const now = new Date('2026-08-05T09:00:00Z')

describe('digestDue', () => {
  it('gün >= digestDay ve bu ay gönderilmemiş → true', () =>
    expect(digestDue({ lastDigestMonth: '2026-07' }, now, 1)).toBe(true))
  it('bu ay zaten gönderilmiş → false', () =>
    expect(digestDue({ lastDigestMonth: '2026-08' }, now, 1)).toBe(false))
  it('gün < digestDay → false', () =>
    expect(digestDue({ lastDigestMonth: null }, now, 10)).toBe(false))
  it('lastDigestMonth null, gün uygun → true', () =>
    expect(digestDue({ lastDigestMonth: null }, now, 1)).toBe(true))
})
