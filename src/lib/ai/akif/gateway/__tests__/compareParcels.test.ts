import { compareParcels } from '../compareParcels'
import type { LookupParcelDeps } from '../lookupParcel'
import type { DegerCardDTO } from '@/lib/deger/card'

jest.mock('@/lib/whatsapp/resolveLocation', () => ({ resolveLocation: jest.fn() }))
import { resolveLocation } from '@/lib/whatsapp/resolveLocation'

const mkDto = (mahalle: string, areaSqm: number, estimate: number): DegerCardDTO =>
  ({
    parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle, ada: '1', parsel: '2', areaSqm, geometry: { type: 'Polygon', coordinates: [] } },
    risk: { faultDistanceM: null, floodQ100: null, status: 'ok' },
    // deps her zaman üye düzeyinde veri döndürür (free-tier testi için)
    value: {
      tier: 'member', insufficientData: false, basis: 'mahalle', thinData: false,
      freeRangeLow: 100, freeRangeHigh: 200,
      estimate, memberRangeLow: estimate * 0.9, memberRangeHigh: estimate * 1.1, confidence: 'yuksek',
    },
    neighborhood: { geojson: null },
    comparables: { count: 3 },
    demographicsAvailable: false,
  }) as unknown as DegerCardDTO

const DATA: Record<string, DegerCardDTO> = {
  A: mkDto('A', 500, 1_000_000), // 2000/m2
  B: mkDto('B', 500, 2_000_000), // 4000/m2
}

const deps: LookupParcelDeps = {
  resolveDeps: {} as never,
  buildCard: jest.fn(async (id: number) => ({ ok: true as const, card: id === 1 ? DATA.A : DATA.B })),
  siteUrlFor: (f) => `https://x/${f.mahalleId}`,
}
const arg = (m: string) => ({ ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: m, ada: '1', parsel: '2' })

beforeEach(() => {
  ;(resolveLocation as jest.Mock).mockImplementation(async (a: { mahalleText: string }) => {
    if (a.mahalleText === 'Belirsiz') {
      return { kind: 'ambiguous', level: 'mahalle', candidates: [{ id: 9, text: 'Belirsiz1' }, { id: 10, text: 'Belirsiz2' }] }
    }
    return { kind: 'resolved', mahalleId: a.mahalleText === 'A' ? 1 : 2, il: 'Trabzon', ilce: 'Ortahisar', mahalle: a.mahalleText }
  })
})

describe('compareParcels', () => {
  it('member tier includes estimate pricePerSqm and recommendation', async () => {
    const card = await compareParcels({ parcels: [arg('A'), arg('B')] }, deps, { memberView: true })
    expect(card.kind).toBe('parcel_compare')
    expect(card.tier).toBe('member')
    expect(card.rows[0].label).toBe('A 1/2')
    expect(card.rows[1].estimate).toBe(2_000_000)
    expect(card.rows[1].pricePerSqm).toBe(4000)
    expect(card.rows[1].rangeLow).toBe(1_800_000)
    expect(card.rows[1].confidence).toBe('yuksek')
    expect(card.recommendation?.rowIndex).toBe(1)
    expect(card.upgradeHint).toBeUndefined()
  })

  it('free tier omits estimate pricePerSqm confidence recommendation and sets upgradeHint', async () => {
    const card = await compareParcels({ parcels: [arg('A'), arg('B')] }, deps, { memberView: false })
    expect(card.tier).toBe('free')
    expect(card.upgradeHint).toBe(true)
    expect(card.recommendation).toBeUndefined()
    const s = JSON.stringify(card)
    expect(s).not.toContain('"estimate"')
    expect(s).not.toContain('"pricePerSqm"')
    expect(s).not.toContain('"confidence"')
    expect(card.rows[0].rangeLow).toBe(100)
    expect(card.rows[0].rangeHigh).toBe(200)
    expect(card.rows[0].areaSqm).toBe(500)
    expect(card.rows[0].basis).toBe('mahalle')
  })

  it('one ambiguous parcel keeps other rows and no recommendation', async () => {
    const card = await compareParcels({ parcels: [arg('A'), arg('Belirsiz')] }, deps, { memberView: true })
    expect(card.rows).toHaveLength(2)
    expect(card.rows[0].status).toBe('resolved')
    expect(card.rows[1].status).toBe('ambiguous')
    expect(card.rows[1].candidates).toEqual(['Belirsiz1', 'Belirsiz2'])
    expect(card.rows[1].label).toBe('Belirsiz 1/2')
    expect(card.recommendation).toBeUndefined()
  })

  it('a thrown lookup becomes a parcel_unavailable row and keeps other rows', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(resolveLocation as jest.Mock).mockImplementation(async (a: { mahalleText: string }) => {
      if (a.mahalleText === 'Patlayan') throw new Error('TKGM down')
      return { kind: 'resolved', mahalleId: 1, il: 'Trabzon', ilce: 'Ortahisar', mahalle: a.mahalleText }
    })
    const card = await compareParcels({ parcels: [arg('A'), arg('Patlayan')] }, deps, { memberView: true })
    spy.mockRestore()
    expect(card.rows).toHaveLength(2)
    expect(card.rows[0].status).toBe('resolved')
    expect(card.rows[1].status).toBe('parcel_unavailable')
    expect(card.rows[1].label).toBe('Patlayan 1/2')
    expect(card.recommendation).toBeUndefined()
  })

  it('resolved rows < 2 gives no recommendation', async () => {
    const card = await compareParcels({ parcels: [arg('A'), arg('Belirsiz'), arg('Belirsiz')] }, deps, { memberView: true })
    expect(card.recommendation).toBeUndefined()
  })

  it('pricePerSqm is a rounded integer and card text has no decimals', async () => {
    ;(deps.buildCard as jest.Mock).mockImplementationOnce(async () => ({ ok: true as const, card: mkDto('A', 810, 1_000_001) }))
    const card = await compareParcels({ parcels: [arg('A'), arg('B')] }, deps, { memberView: true })
    const row = card.rows[0]
    expect(Number.isInteger(row.pricePerSqm)).toBe(true)
    expect(row.pricePerSqm).toBe(Math.round(1_000_001 / 810))
    expect(card.rows[1].pricePerSqm).toBe(4000)
    expect(JSON.stringify(card)).not.toMatch(/"pricePerSqm":\d+\.\d/)
    if (card.recommendation) expect(card.recommendation.reason).not.toMatch(/,\d/)
  })
})
