const areaPriceStat = { findMany: jest.fn() }
const marketListing = { findMany: jest.fn() }
const neighborhood = { findUnique: jest.fn() }
jest.mock('@/lib/prisma', () => ({ prisma: { areaPriceStat, marketListing, neighborhood } }))
jest.mock('@/lib/tkgm/parcel', () => ({ fetchParcelByPoint: 'FPP', fetchParcelByAdaParsel: 'FPAP' }))
jest.mock('@/lib/risk/riskSnapshot', () => ({ buildRiskSnapshot: 'BRS' }))

import { createAnonCardDeps } from './anonCardDeps'

beforeEach(() => {
  areaPriceStat.findMany.mockReset()
  marketListing.findMany.mockReset()
  neighborhood.findUnique.mockReset()
})

it('parcel/risk fonksiyonlarını olduğu gibi geçirir', () => {
  const d = createAnonCardDeps()
  expect(d.fetchParcelByPoint).toBe('FPP')
  expect(d.fetchParcelByAdaParsel).toBe('FPAP')
  expect(d.buildRiskSnapshot).toBe('BRS')
})

it('findAreaTrend içermez (çağrıya özel)', () => {
  expect('findAreaTrend' in createAnonCardDeps()).toBe(false)
})

it('findAreaStats — il + kademeli OR sorgusu', async () => {
  areaPriceStat.findMany.mockResolvedValue([{ scope: 'il' }])
  const out = await createAnonCardDeps().findAreaStats('TRABZON', 'ORTAHISAR', 'BULUT')
  expect(out).toEqual([{ scope: 'il' }])
  const arg = areaPriceStat.findMany.mock.calls[0][0]
  expect(arg.where.il).toBe('TRABZON')
  expect(arg.where.OR).toEqual([
    { ilce: null, mahalle: null },
    { ilce: 'ORTAHISAR', mahalle: null },
    { ilce: 'ORTAHISAR', mahalle: 'BULUT' },
  ])
})

it('findListingsNear — sadece active/arsa çeker, normalizeAreaName ile filtreler', async () => {
  marketListing.findMany.mockResolvedValue([
    { id: 'a', il: 'TRABZON', ilce: 'ORTAHİSAR' }, // noktalı İ — crawler yazımı
    { id: 'b', il: 'TRABZON', ilce: 'AKÇAABAT' },
    { id: 'c', il: null, ilce: null },
  ])
  // card.ts katlanmış anahtar geçirir (noktasız I)
  const out = await createAnonCardDeps().findListingsNear('TRABZON', 'ORTAHISAR')
  expect((out as Array<{ id: string }>).map((r) => r.id)).toEqual(['a'])
  const arg = marketListing.findMany.mock.calls[0][0]
  expect(arg.where.status).toBe('active')
  expect(arg.where.lat).toEqual({ not: null })
  expect(arg.take).toBe(2000)
})

it('findNeighborhood — bileşik anahtar; yoksa null', async () => {
  neighborhood.findUnique.mockResolvedValueOnce({ geojson: { type: 'Polygon' } })
  expect(await createAnonCardDeps().findNeighborhood('T', 'O', 'B')).toEqual({ geojson: { type: 'Polygon' } })
  neighborhood.findUnique.mockResolvedValueOnce(null)
  expect(await createAnonCardDeps().findNeighborhood('T', 'O', 'B')).toBeNull()
})
