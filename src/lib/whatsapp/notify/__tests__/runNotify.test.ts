import { runNotify, type NotifyDeps, type NotifyConfig } from '../runNotify'
import type { SubLike, TrendBucket } from '../types'

const NOW = new Date('2026-08-15T00:00:00Z')

const config: NotifyConfig = {
  digestDay: 5,
  minSample: 5,
  alertPct: 0.1,
  siteBase: 'https://arsabil.test',
}

const bucket = (
  scope: 'il' | 'ilce' | 'mahalle',
  ym: string,
  median: number,
  n = 10
): TrendBucket => ({
  scope,
  monthBucket: new Date(`${ym}-01T00:00:00Z`),
  medianPricePerSqm: median,
  sampleCount: n,
})

// 4 aylık mahalle serisi: %12 artış (baseline 4000 → 4480)
const risingRows: TrendBucket[] = [
  bucket('mahalle', '2026-05', 4000),
  bucket('mahalle', '2026-06', 4000),
  bucket('mahalle', '2026-07', 4000),
  bucket('mahalle', '2026-08', 4480),
]

const mkSub = (over: Partial<SubLike> = {}): SubLike => ({
  id: 'sub-1',
  phone: '+905550000001',
  il: 'Trabzon',
  ilce: 'Ortahisar',
  mahalle: 'Uğur',
  lastDigestMonth: null,
  lastAlertAt: null,
  lastAlertDirection: null,
  ...over,
})

const mkDeps = (over: Partial<NotifyDeps> = {}): {
  deps: NotifyDeps
  sendDigest: jest.Mock
  sendAlert: jest.Mock
  markDigestSent: jest.Mock
  markAlertSent: jest.Mock
} => {
  const sendDigest = jest.fn().mockResolvedValue(true)
  const sendAlert = jest.fn().mockResolvedValue(true)
  const markDigestSent = jest.fn().mockResolvedValue(undefined)
  const markAlertSent = jest.fn().mockResolvedValue(undefined)
  const deps: NotifyDeps = {
    listSubscriptions: jest.fn().mockResolvedValue([mkSub()]),
    findTrendRows: jest.fn().mockResolvedValue(risingRows),
    sendDigest,
    sendAlert,
    markDigestSent,
    markAlertSent,
    now: () => NOW,
    config,
    ...over,
  }
  return { deps, sendDigest, sendAlert, markDigestSent, markAlertSent }
}

describe('runNotify', () => {
  it('(a) digest günü + eşik aşımı → hem digest hem alert gönderir ve işaretler', async () => {
    const { deps, sendDigest, sendAlert, markDigestSent, markAlertSent } = mkDeps()

    const summary = await runNotify(deps)

    expect(sendDigest).toHaveBeenCalledTimes(1)
    expect(sendDigest).toHaveBeenCalledWith('+905550000001', {
      mahalle: 'Uğur',
      current: 4480,
      pctText: '%12,0 artış',
      href: 'https://arsabil.test/deger',
    })
    expect(markDigestSent).toHaveBeenCalledWith('sub-1', '2026-08')
    expect(sendAlert).toHaveBeenCalledTimes(1)
    expect(sendAlert).toHaveBeenCalledWith('+905550000001', {
      mahalle: 'Uğur',
      pctText: '%12,0 artış',
      baseline: 4000,
      current: 4480,
      href: 'https://arsabil.test/deger',
    })
    expect(markAlertSent).toHaveBeenCalledWith('sub-1', NOW, 'up')
    expect(summary).toEqual({ subs: 1, digests: 1, alerts: 1, skipped: 0, errors: 0 })
  })

  it('(b) idempotent: bu ay digest atılmış + aynı yön alert dün → hiçbir gönderim yapmaz', async () => {
    const sub = mkSub({
      lastDigestMonth: '2026-08',
      lastAlertAt: new Date('2026-08-14T00:00:00Z'),
      lastAlertDirection: 'up',
    })
    const { deps, sendDigest, sendAlert } = mkDeps({
      listSubscriptions: jest.fn().mockResolvedValue([sub]),
    })

    const summary = await runNotify(deps)

    expect(sendDigest).not.toHaveBeenCalled()
    expect(sendAlert).not.toHaveBeenCalled()
    expect(summary).toEqual({ subs: 1, digests: 0, alerts: 0, skipped: 0, errors: 0 })
  })

  it('(c) findTrendRows throw → o abone errors++, sonraki abone işlenmeye devam eder', async () => {
    const bad = mkSub({ id: 'bad', il: 'Rize' })
    const good = mkSub({ id: 'good', il: 'Trabzon' })
    const findTrendRows = jest.fn(async (il: string) => {
      if (il === 'Rize') throw new Error('db down')
      return risingRows
    })
    const { deps, sendDigest } = mkDeps({
      listSubscriptions: jest.fn().mockResolvedValue([bad, good]),
      findTrendRows,
    })
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const summary = await runNotify(deps)

    expect(summary.errors).toBe(1)
    expect(summary.subs).toBe(2)
    expect(sendDigest).toHaveBeenCalledTimes(1)
    expect(sendDigest).toHaveBeenCalledWith('+905550000001', expect.objectContaining({ mahalle: 'Uğur' }))
    errSpy.mockRestore()
  })

  it('(d) yetersiz veri (resolveAreaTrend null) → digest skipped, alert fire etmez', async () => {
    const thinRows: TrendBucket[] = [
      bucket('mahalle', '2026-07', 4000),
      bucket('mahalle', '2026-08', 4480),
    ]
    const { deps, sendDigest, sendAlert } = mkDeps({
      findTrendRows: jest.fn().mockResolvedValue(thinRows),
    })

    const summary = await runNotify(deps)

    expect(sendDigest).not.toHaveBeenCalled()
    expect(sendAlert).not.toHaveBeenCalled()
    expect(summary).toEqual({ subs: 1, digests: 0, alerts: 0, skipped: 1, errors: 0 })
  })

  it('(e) zıt yön: son alert down, şimdi up → dedup geçer, alert gönderilir', async () => {
    const sub = mkSub({
      lastDigestMonth: '2026-08', // digest'i devre dışı bırak
      lastAlertAt: new Date('2026-08-14T00:00:00Z'),
      lastAlertDirection: 'down',
    })
    const { deps, sendAlert, markAlertSent } = mkDeps({
      listSubscriptions: jest.fn().mockResolvedValue([sub]),
    })

    const summary = await runNotify(deps)

    expect(sendAlert).toHaveBeenCalledTimes(1)
    expect(markAlertSent).toHaveBeenCalledWith('sub-1', NOW, 'up')
    expect(summary).toEqual({ subs: 1, digests: 0, alerts: 1, skipped: 0, errors: 0 })
  })

  it('(f) gönderim başarısız (sendDigest/sendAlert false) → mark ETMEZ, sayaç artmaz', async () => {
    const { deps, markDigestSent, markAlertSent } = mkDeps({
      sendDigest: jest.fn().mockResolvedValue(false),
      sendAlert: jest.fn().mockResolvedValue(false),
    })

    const summary = await runNotify(deps)

    expect(markDigestSent).not.toHaveBeenCalled()
    expect(markAlertSent).not.toHaveBeenCalled()
    expect(summary).toEqual({ subs: 1, digests: 0, alerts: 0, skipped: 0, errors: 0 })
  })
})
