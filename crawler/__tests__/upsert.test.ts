import { upsertListing, markDelistedExcept, writeDupeLinks, upsertNeighborhood, type UpsertClient, type UpsertableRecord } from '../pipeline/upsert'
import type { NormalizedListing, GeoResult } from '../adapters/types'

function makeFakeClient() {
  const rows: any[] = []
  const pricePoints: any[] = []
  let seq = 0
  const client: UpsertClient = {
    marketListing: {
      findUnique: async ({ where }: any) =>
        rows.find((r) => r.source === where.source_sourceListingId.source && r.sourceListingId === where.source_sourceListingId.sourceListingId) ?? null,
      // Prisma @default'ları (status/firstSeenAt/lastSeenAt) fake tarafında modellenir; impl gerçek Prisma semantiğine göre bunları create data'sına koymaz.
      create: async ({ data }: any) => { const row = { id: `id${++seq}`, status: 'active', firstSeenAt: new Date(), lastSeenAt: new Date(), ...data }; rows.push(row); return row },
      update: async ({ where, data }: any) => { const row = rows.find((r) => r.id === where.id); Object.assign(row, data); return row },
      findMany: async ({ where }: any) => {
        // writeDupeLinks: id in [...]
        if (where.id?.in) return rows.filter((r) => where.id.in.includes(r.id))
        // markDelistedExcept: scope + id notIn seenIds
        return rows.filter((r) =>
          r.source === where.source && r.il === where.il && r.status === 'active' &&
          where.listingType.in.includes(r.listingType) && !where.id.notIn.includes(r.id))
      },
      updateMany: async ({ where, data }: any) => {
        let n = 0
        for (const r of rows) if (where.id.in.includes(r.id)) { Object.assign(r, data); n++ }
        return { count: n }
      },
    },
    marketListingPricePoint: {
      create: async ({ data }: any) => { pricePoints.push(data); return data },
    },
    neighborhood: {
      upsert: async () => ({}),
    },
  }
  return { client, rows, pricePoints }
}

const n: NormalizedListing = {
  source: 'sahibinden', sourceListingId: '100', sourceUrl: 'u', title: 't', description: null,
  price: 10_000_000, currency: 'TRY', areaSqm: 500, pricePerSqm: 20000, listingType: 'arsa',
  imarStatus: 'imarli', il: 'TRABZON', ilce: 'AKÇAABAT', mahalle: 'DÜRBİNAR',
  adaNo: null, parselNo: null, lat: null, lng: null, photoUrls: [], listedAt: null,
  rawJson: {}, notes: [],
}
const geo: GeoResult = { lat: 41.0, lng: 39.5, geoPrecision: 'neighborhood' }
const rec: UpsertableRecord = { normalized: n, geo }

describe('upsertListing', () => {
  it('yeni kayıt oluşturur', async () => {
    const { client, rows } = makeFakeClient()
    const r = await upsertListing(client, rec)
    expect(r.created).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0].lat).toBe(41.0)
    expect(rows[0].geoPrecision).toBe('neighborhood')
  })

  it('tekrar görülünce günceller, lastSeenAt ilerler, yeni satır yok', async () => {
    const { client, rows } = makeFakeClient()
    await upsertListing(client, rec)
    const before = rows[0].lastSeenAt
    await new Promise((res) => setTimeout(res, 5))
    const r = await upsertListing(client, rec)
    expect(r.created).toBe(false)
    expect(rows).toHaveLength(1)
    expect(rows[0].lastSeenAt.getTime()).toBeGreaterThan(before.getTime())
  })

  it('fiyat değişince PricePoint eklenir ve priceChanged=true', async () => {
    const { client, pricePoints } = makeFakeClient()
    await upsertListing(client, rec) // I4: create → taban fiyat noktası (10M)
    const r = await upsertListing(client, { ...rec, normalized: { ...n, price: 12_000_000, pricePerSqm: 24000 } })
    expect(r.priceChanged).toBe(true)
    expect(pricePoints).toHaveLength(2)
    expect(pricePoints[0].price).toBe(10_000_000)
    expect(pricePoints[1].price).toBe(12_000_000)
  })

  it('I4: create anında fiyat varsa tek bir taban PricePoint yazılır', async () => {
    const { client, pricePoints } = makeFakeClient()
    const r = await upsertListing(client, rec)
    expect(r.created).toBe(true)
    expect(pricePoints).toHaveLength(1)
    expect(pricePoints[0].price).toBe(10_000_000)
  })

  it('I3: kısmi re-parse null fiyatı iyi veriyi EZMEZ, lastSeenAt ilerler, yeni fiyat noktası yok', async () => {
    const { client, rows, pricePoints } = makeFakeClient()
    await upsertListing(client, rec) // price 10M, area 500
    const before = rows[0].lastSeenAt
    await new Promise((res) => setTimeout(res, 5))
    const r = await upsertListing(client, {
      ...rec,
      normalized: { ...n, price: null, pricePerSqm: null },
    })
    expect(r.created).toBe(false)
    expect(r.priceChanged).toBe(false)
    expect(rows[0].price).toBe(10_000_000) // eski fiyat korundu
    expect(rows[0].areaSqm).toBe(500)
    expect(rows[0].status).toBe('active')
    expect(rows[0].lastSeenAt.getTime()).toBeGreaterThan(before.getTime())
    expect(pricePoints).toHaveLength(1) // yalnız create'teki taban nokta
  })
})

describe('markDelistedExcept', () => {
  it('turda görülmeyen active ilanları delisted yapar', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '200' } })
    const count = await markDelistedExcept(
      client,
      { source: 'sahibinden', il: 'TRABZON', listingTypes: ['arsa'] },
      [a.id], // sadece a görüldü
    )
    expect(count).toBe(1)
    expect(rows.find((r) => r.id === b.id).status).toBe('delisted')
    expect(rows.find((r) => r.id === a.id).status).toBe('active')
  })

  it('G2: seenIds boşsa 0 döner, hiçbir satır delist edilmez', async () => {
    const { client, rows } = makeFakeClient()
    await upsertListing(client, rec)
    await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '200' } })
    const count = await markDelistedExcept(
      client,
      { source: 'sahibinden', il: 'TRABZON', listingTypes: ['arsa'] },
      [],
    )
    expect(count).toBe(0)
    expect(rows.every((r) => r.status === 'active')).toBe(true)
  })
})

describe('writeDupeLinks', () => {
  it('dupeOfId yazar', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '201' } })
    await writeDupeLinks(client, new Map([[b.id, a.id]]))
    expect(rows.find((r) => r.id === b.id).dupeOfId).toBe(a.id)
  })

  it('G3: mevcut ters link varken döngü yazmaz', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '201' } })
    await writeDupeLinks(client, new Map([[b.id, a.id]])) // b -> a
    await writeDupeLinks(client, new Map([[a.id, b.id]])) // a -> b DENENMEZ (döngü)
    expect(rows.find((r) => r.id === a.id).dupeOfId ?? null).toBeNull()
    expect(rows.find((r) => r.id === b.id).dupeOfId).toBe(a.id)
  })

  it('G3: zaten linklenmiş satırın üzerine yazmaz + kendine link atlanır', async () => {
    const { client, rows } = makeFakeClient()
    const a = await upsertListing(client, rec)
    const b = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '201' } })
    const c = await upsertListing(client, { ...rec, normalized: { ...n, sourceListingId: '202' } })
    await writeDupeLinks(client, new Map([[b.id, a.id]]))
    await writeDupeLinks(client, new Map([[b.id, c.id], [a.id, a.id]]))
    expect(rows.find((r) => r.id === b.id).dupeOfId).toBe(a.id) // c.id ile ezilmedi
    expect(rows.find((r) => r.id === a.id).dupeOfId ?? null).toBeNull() // self-link yok
  })
})

describe('upsertNeighborhood', () => {
  function nbClient() {
    return {
      neighborhood: { upsert: jest.fn().mockResolvedValue({}) },
    } as unknown as UpsertClient
  }

  it('normalize edilmiş anahtarla upsert eder (create + update şekli)', async () => {
    const c = nbClient()
    await upsertNeighborhood(c, {
      il: 'Trabzon',
      ilce: 'Ortahisar',
      mahalle: 'Uğurlu',
      geojson: { type: 'MultiPolygon', coordinates: [] },
      riskScore: 0.2,
      source: 'emlakjet',
    })
    const call = (c.neighborhood.upsert as jest.Mock).mock.calls[0][0]
    expect(call.where.il_ilce_mahalle).toEqual({ il: 'TRABZON', ilce: 'ORTAHISAR', mahalle: 'UĞURLU' })
    expect(call.create).toEqual({
      il: 'TRABZON',
      ilce: 'ORTAHISAR',
      mahalle: 'UĞURLU',
      geojson: { type: 'MultiPolygon', coordinates: [] },
      emlakjetRiskScore: 0.2,
      source: 'emlakjet',
    })
    expect(call.update).toEqual({
      geojson: { type: 'MultiPolygon', coordinates: [] },
      emlakjetRiskScore: 0.2,
      source: 'emlakjet',
    })
  })

  it('riskScore null olabilir', async () => {
    const c = nbClient()
    await upsertNeighborhood(c, {
      il: 'İstanbul',
      ilce: 'Şişli',
      mahalle: 'Merkez',
      geojson: { type: 'Polygon', coordinates: [] },
      riskScore: null,
      source: 'emlakjet',
    })
    const call = (c.neighborhood.upsert as jest.Mock).mock.calls[0][0]
    expect(call.where.il_ilce_mahalle).toEqual({ il: 'ISTANBUL', ilce: 'ŞIŞLI', mahalle: 'MERKEZ' })
    expect(call.create.emlakjetRiskScore).toBeNull()
    expect(call.update.emlakjetRiskScore).toBeNull()
  })
})
