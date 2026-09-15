import { lookupParcel, type LookupParcelDeps } from '../lookupParcel'
import type { DegerCardDTO } from '@/lib/deger/card'

const DTO = {
  parcel: { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', ada: '123', parsel: '45', areaSqm: 500, geometry: { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [5, 6], [1, 2]]] } },
  risk: { faultDistanceM: 3200, floodQ100: false, status: 'ok' as const },
  value: { tier: 'free' as const, insufficientData: false, basis: 'mahalle' as const, thinData: false, freeRangeLow: 2000000, freeRangeHigh: 2500000, pricePerSqmCoarse: 4000 },
  neighborhood: { geojson: { type: 'MultiPolygon', coordinates: [] } },
  comparables: { count: 3 },
  demographicsAvailable: false,
} as unknown as DegerCardDTO

function makeDeps(over: Partial<LookupParcelDeps> = {}): LookupParcelDeps {
  return {
    resolveDeps: {} as never,
    buildCard: jest.fn().mockResolvedValue({ ok: true, card: DTO }),
    siteUrlFor: () => 'https://www.arsabil.com/deger?x=1',
    ...over,
  }
}

const ARGS = { ilText: 'Trabzon', ilceText: 'Ortahisar', mahalleText: 'Uğurlu', ada: '123', parsel: '45' }

jest.mock('@/lib/whatsapp/resolveLocation', () => ({
  resolveLocation: jest.fn().mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }),
}))
import { resolveLocation } from '@/lib/whatsapp/resolveLocation'

describe('lookupParcel', () => {
  beforeEach(() => {
    ;(resolveLocation as jest.Mock).mockResolvedValue({ kind: 'resolved', mahalleId: 5000, il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' })
  })

  it('resolved + buildCard ok → status:resolved, dto+siteUrl dolu (geometry/geojson temizlenmiş)', async () => {
    const deps = makeDeps()
    const card = await lookupParcel(ARGS, deps)
    expect(card.kind).toBe('parcel')
    expect(card.status).toBe('resolved')
    expect(card.siteUrl).toBe('https://www.arsabil.com/deger?x=1')
    expect(card.dto?.parcel.geometry).toEqual({ type: 'Polygon', coordinates: [] })
    expect(card.dto?.neighborhood.geojson).toBeNull()
    expect(card.dto?.parcel).toEqual({ ...DTO.parcel, geometry: { type: 'Polygon', coordinates: [] } })
    expect(card.dto?.risk).toEqual(DTO.risk)
    expect(card.dto?.value).toEqual(DTO.value)
    expect(card.dto?.comparables).toEqual(DTO.comparables)
    expect(card.dto?.demographicsAvailable).toBe(DTO.demographicsAvailable)
    expect(deps.buildCard).toHaveBeenCalledWith(5000, '123', '45')
  })

  it('resolveLocation ambiguous → status:ambiguous, level+candidates dolu', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValueOnce({ kind: 'ambiguous', level: 'mahalle', candidates: [{ id: 1, text: 'Uğurlu' }, { id: 2, text: 'Uğurluoğlu' }] })
    const card = await lookupParcel(ARGS, makeDeps())
    expect(card).toEqual({ kind: 'parcel', status: 'ambiguous', level: 'mahalle', candidates: ['Uğurlu', 'Uğurluoğlu'] })
  })

  it('resolveLocation notfound → status:location_not_found, level+term dolu', async () => {
    ;(resolveLocation as jest.Mock).mockResolvedValueOnce({ kind: 'notfound', level: 'ilce', term: 'xyz' })
    const card = await lookupParcel(ARGS, makeDeps())
    expect(card).toEqual({ kind: 'parcel', status: 'location_not_found', level: 'ilce', term: 'xyz' })
  })

  it('buildCard parcel_not_found → status:parcel_not_found', async () => {
    const deps = makeDeps({ buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_not_found' }) })
    const card = await lookupParcel(ARGS, deps)
    expect(card).toEqual({ kind: 'parcel', status: 'parcel_not_found' })
  })

  it('buildCard parcel_unavailable → status:parcel_unavailable', async () => {
    const deps = makeDeps({ buildCard: jest.fn().mockResolvedValue({ ok: false, reason: 'parcel_unavailable' }) })
    const card = await lookupParcel(ARGS, deps)
    expect(card).toEqual({ kind: 'parcel', status: 'parcel_unavailable' })
  })
})
