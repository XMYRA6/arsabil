import { parseDateRange, istanbulDateString } from '../dateRange'

describe('istanbulDateString', () => {
  it('UTC 21:30 sonrası İstanbul\'da ertesi gün', () => {
    expect(istanbulDateString(new Date('2026-10-14T21:30:00Z'))).toBe('2026-10-15')
    expect(istanbulDateString(new Date('2026-10-14T20:59:59Z'))).toBe('2026-10-14')
  })
})

describe('parseDateRange', () => {
  it('tek tarih = o günün TR sınırları', () => {
    const r = parseDateRange({ dateFrom: '2026-10-15' })
    expect(r).toEqual({
      ok: true,
      range: { from: new Date('2026-10-14T21:00:00Z'), toExclusive: new Date('2026-10-15T21:00:00Z') },
    })
  })

  it('dateTo tek başına da çalışır', () => {
    const r = parseDateRange({ dateTo: '2026-10-15' })
    expect(r.ok && r.range?.from).toEqual(new Date('2026-10-14T21:00:00Z'))
  })

  it('ay aralığı (Ocak)', () => {
    const r = parseDateRange({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })
    expect(r).toEqual({
      ok: true,
      range: { from: new Date('2025-12-31T21:00:00Z'), toExclusive: new Date('2026-01-31T21:00:00Z') },
    })
  })

  it('gece yarısı sınırı: 00:30 TR (21:30Z) 15 Ekim aralığına düşer (Review Focus 3)', () => {
    const r = parseDateRange({ dateFrom: '2026-10-15' })
    if (!r.ok || !r.range) throw new Error('beklenmeyen')
    const t = new Date('2026-10-14T21:30:00Z').getTime()
    expect(t >= r.range.from.getTime() && t < r.range.toExclusive.getTime()).toBe(true)
  })

  it('hiçbiri yoksa ok + range null', () => {
    expect(parseDateRange({})).toEqual({ ok: true, range: null })
    expect(parseDateRange({ dateFrom: null, dateTo: undefined })).toEqual({ ok: true, range: null })
  })

  it('geçersiz tarih/biçim/ters aralık hata döner', () => {
    expect(parseDateRange({ dateFrom: '2026-02-30' }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: '15 Ekim' }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: 20261015 }).ok).toBe(false)
    expect(parseDateRange({ dateFrom: '2026-10-20', dateTo: '2026-10-15' })).toEqual({
      ok: false,
      field: 'dateTo',
      reason: 'ters aralık',
    })
  })
})
