import { buildDegerCard, type DegerCardDeps } from './card'

const PARCEL = {
  il: 'Trabzon',
  ilce: 'Ortahisar',
  mahalle: 'Uğurlu',
  adaNo: '142',
  parselNo: '7',
  areaSqm: 500,
  quality: 'Arsa',
  geometry: { type: 'Polygon' as const, coordinates: [[[39.7, 41.0], [39.71, 41.0], [39.71, 41.01], [39.7, 41.0]]] },
}

function deps(over: Partial<DegerCardDeps> = {}): DegerCardDeps {
  return {
    fetchParcelByPoint: jest.fn().mockResolvedValue({ ok: true, parcel: PARCEL }),
    fetchParcelByAdaParsel: jest.fn().mockResolvedValue({ ok: true, parcel: PARCEL }),
    buildRiskSnapshot: jest.fn().mockResolvedValue({ faultDistanceM: 1800, floodQ100: false, riskSnapshotAt: new Date() }),
    findAreaStats: jest.fn().mockResolvedValue([
      { scope: 'mahalle', medianPricePerSqm: 2000, p25: 1800, p75: 2400, sampleCount: 12 },
      { scope: 'ilce', medianPricePerSqm: 1500, p25: 1200, p75: 1800, sampleCount: 40 },
      { scope: 'il', medianPricePerSqm: 1000, p25: 700, p75: 1300, sampleCount: 300 },
    ]),
    ...over,
  }
}

describe('buildDegerCard', () => {
  it('anonim görünüm: üye alanları YOK', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.card.value.tier).toBe('free')
    expect(res.card.value.freeRangeLow).toBeGreaterThan(0)
    expect(res.card.value.pricePerSqmCoarse).toBe(2000)
    expect(res.card.value).not.toHaveProperty('estimate')
    expect(res.card.value).not.toHaveProperty('pricePerSqm')
    expect(res.card.value).not.toHaveProperty('feasibilityHref')
  })

  it('üye görünüm: net değer + kırılım + fizibilite köprüsü', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.value.tier).toBe('member')
    expect(res.card.value.estimate).toBe(1_000_000) // 2000 * 500
    expect(res.card.value.pricePerSqm).toEqual({ mahalle: 2000, ilce: 1500 })
    expect(res.card.value.feasibilityHref).toBe('/hesapla')
  })

  it('parsel bulunamadı → reason parcel_not_found, risk/stat çağrılmaz', async () => {
    const d = deps({ fetchParcelByPoint: jest.fn().mockResolvedValue({ ok: false, reason: 'not_found' }) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    expect(res).toEqual({ ok: false, reason: 'parcel_not_found' })
    expect(d.buildRiskSnapshot).not.toHaveBeenCalled()
    expect(d.findAreaStats).not.toHaveBeenCalled()
  })

  it('risk snapshot boş → risk.status unavailable, kartın kalanı yine üretilir', async () => {
    const d = deps({
      buildRiskSnapshot: jest.fn().mockResolvedValue({ faultDistanceM: null, floodQ100: null, riskSnapshotAt: null }),
    })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.risk.status).toBe('unavailable')
    expect(res.card.value.tier).toBe('free')
  })

  it('hiç AreaPriceStat yok → value.insufficientData, risk + parsel yine var', async () => {
    const d = deps({ findAreaStats: jest.fn().mockResolvedValue([]) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.value.insufficientData).toBe(true)
    expect(res.card.risk.status).toBe('ok')
    expect(res.card.parcel.mahalle).toBe('Uğurlu')
  })

  it('adaParsel girişi → fetchParcelByAdaParsel kullanılır, findAreaStats büyük harfli', async () => {
    const d = deps()
    await buildDegerCard({ kind: 'adaParsel', mahalleId: 123, ada: '142', parsel: '7' }, d, { memberView: false })
    expect(d.fetchParcelByAdaParsel).toHaveBeenCalledWith(123, '142', '7')
    expect(d.findAreaStats).toHaveBeenCalledWith('TRABZON', 'ORTAHISAR', 'UĞURLU')
    // Risk, poligonun KÖŞESİNDE değil centroid'inde ölçülür (Important 5).
    // Halka [[39.7,41.0],[39.71,41.0],[39.71,41.01],[39.7,41.0]] → centroid (41.0025, 39.705)
    expect(d.buildRiskSnapshot).toHaveBeenCalledWith(41.0025, 39.705)
  })
})
