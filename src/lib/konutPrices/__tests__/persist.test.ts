import { refreshKonutFiyatStats, type KonutPersistDb } from '../persist'

const NOW = new Date('2026-10-16T10:00:00Z')
const listing = { listingType: 'konut', pricePerSqm: 50_000, areaSqm: 100, status: 'active', il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu' }

function makeDb(rows: unknown[]) {
  const upsert = jest.fn().mockResolvedValue({})
  const db: KonutPersistDb = {
    marketListing: { findMany: jest.fn().mockResolvedValue(rows) },
    konutFiyatStat: { upsert, count: jest.fn().mockResolvedValue(3) },
  }
  return { db, upsert }
}

describe('refreshKonutFiyatStats', () => {
  it('her satır için bileşik anahtarla upsert eder ve toplamı döner', async () => {
    const { db, upsert } = makeDb([listing, listing, listing])
    const r = await refreshKonutFiyatStats(db, NOW)
    expect(r).toEqual({ written: 3, total: 3 })
    expect(upsert).toHaveBeenCalledTimes(3)
    const first = upsert.mock.calls[0][0]
    expect(first.where).toEqual({ il_ilce_mahalle: { il: 'TRABZON', ilce: '', mahalle: '' } })
    expect(first.create).toMatchObject({ scope: 'il', sampleCount: 3, computedAt: NOW })
    expect(first.update).toMatchObject({ scope: 'il', sampleCount: 3, computedAt: NOW })
  })

  it('findMany yalnız gerekli alanları ve yalnız konut/aktif ilanları ister', async () => {
    const { db } = makeDb([])
    await refreshKonutFiyatStats(db, NOW)
    const arg = (db.marketListing.findMany as jest.Mock).mock.calls[0][0]
    expect(arg.where).toEqual({ listingType: 'konut', status: 'active' })
    expect(Object.keys(arg.select).sort()).toEqual(['areaSqm', 'il', 'ilce', 'listingType', 'mahalle', 'pricePerSqm', 'status', 'title'])
  })
})
