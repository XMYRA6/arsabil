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
    findListingsNear: jest.fn().mockResolvedValue([
      {
        id: 'c1', pricePerSqm: 2500, areaSqm: 480, price: 1_200_000,
        lat: 41.0009, lng: 39.7, geoPrecision: 'neighborhood',
        listedAt: new Date('2026-08-21'), source: 'emlakjet',
        sourceUrl: 'https://emlakjet.com/ilan/c1', listingType: 'arsa',
      },
    ]),
    findNeighborhood: jest.fn().mockResolvedValue({ geojson: { type: 'MultiPolygon', coordinates: [] } }),
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
    // Exhaustive: anonim non-insufficient yol TAM olarak bu alanları set eder.
    // Herhangi bir üye alanı (estimate/pricePerSqm/feasibilityHref/...) sızarsa kırılır.
    expect(Object.keys(res.card.value).sort()).toEqual(
      ['basis', 'freeRangeHigh', 'freeRangeLow', 'insufficientData', 'pricePerSqmCoarse', 'thinData', 'tier'].sort(),
    )
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

  it('üye: comparables.items + count + neighborhood.geojson', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.comparables.count).toBe(1)
    expect(res.card.comparables.items).toHaveLength(1)
    expect(res.card.comparables.items![0].pricePerSqm).toBe(2500)
    expect(res.card.neighborhood.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
  })

  it('anonim: comparables.count + neighborhood.geojson AMA items YOK', async () => {
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, deps(), { memberView: false })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.comparables.count).toBe(1)
    expect(res.card.comparables).not.toHaveProperty('items')
    expect(res.card.neighborhood.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
  })

  it('Neighborhood yoksa geojson null', async () => {
    const d = deps({ findNeighborhood: jest.fn().mockResolvedValue(null) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.neighborhood.geojson).toBeNull()
  })

  it('T6 — emsal + sınır, değerleme verisinden BAĞIMSIZ (insufficientData olsa bile)', async () => {
    const d = deps({ findAreaStats: jest.fn().mockResolvedValue([]) })
    const res = await buildDegerCard({ kind: 'point', lat: 41, lng: 39.7 }, d, { memberView: true })
    if (!res.ok) throw new Error('ok bekleniyordu')
    expect(res.card.value.insufficientData).toBe(true)
    expect(res.card.comparables.count).toBeGreaterThan(0)
    expect(res.card.comparables.items).toBeDefined()
    expect(res.card.comparables.items!.length).toBeGreaterThan(0)
    expect(res.card.neighborhood.geojson).toEqual({ type: 'MultiPolygon', coordinates: [] })
  })

  it('findListingsNear normalize edilmiş il/ilçe alır', async () => {
    const d = deps()
    await buildDegerCard({ kind: 'adaParsel', mahalleId: 1, ada: '1', parsel: '2' }, d, { memberView: false })
    expect(d.findListingsNear).toHaveBeenCalledWith('TRABZON', 'ORTAHISAR')
  })
})
