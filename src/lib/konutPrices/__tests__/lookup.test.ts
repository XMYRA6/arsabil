import { lookupKonutFiyat, type KonutLookupDb } from '../lookup'

const stat = (scope: string, median: number, n: number) => ({ scope, medianPricePerSqm: median, sampleCount: n })
const dbWith = (rows: ReturnType<typeof stat>[]): KonutLookupDb => ({
  konutFiyatStat: { findMany: jest.fn().mockResolvedValue(rows) },
})
const A = { il: 'Trabzon', ilce: 'Ortahisar', mahalle: 'Uğurlu', daireM2: 150 }

describe('lookupKonutFiyat', () => {
  it('mahalle ≥8 örnek → yuksek güven, tl yüzlüğe yuvarlanır', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('mahalle', 46_667, 9), stat('ilce', 40_000, 50), stat('il', 30_000, 200)]), A)
    expect(r).toEqual({ tl: 7_000_100, perSqm: 46_667, scale: 'mahalle', sampleCount: 9, confidence: 'yuksek', bolge: 'TRABZON/ORTAHISAR/UĞURLU' })
  })
  it('mahalle <8 ise ilçeye düşer (≥5, orta)', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('mahalle', 60_000, 7), stat('ilce', 40_000, 5), stat('il', 30_000, 200)]), A)
    expect(r).toMatchObject({ scale: 'ilce', confidence: 'orta', perSqm: 40_000, tl: 6_000_000, bolge: 'TRABZON/ORTAHISAR' })
  })
  it('ilçe <5 ise ile düşer (dusuk)', async () => {
    const r = await lookupKonutFiyat(dbWith([stat('ilce', 40_000, 4), stat('il', 30_000, 12)]), A)
    expect(r).toMatchObject({ scale: 'il', confidence: 'dusuk', bolge: 'TRABZON' })
  })
  it('hiç satır yoksa null', async () => {
    expect(await lookupKonutFiyat(dbWith([]), A)).toBeNull()
  })
  it('geçersiz daireM2 → null (sorgu yapmaz)', async () => {
    const db = dbWith([stat('il', 30_000, 12)])
    expect(await lookupKonutFiyat(db, { ...A, daireM2: 20 })).toBeNull()
    expect(await lookupKonutFiyat(db, { ...A, daireM2: Number.NaN })).toBeNull()
    expect(db.konutFiyatStat.findMany).not.toHaveBeenCalled()
  })
  it('adları normalize ederek sorgular', async () => {
    const db = dbWith([])
    await lookupKonutFiyat(db, A)
    const where = (db.konutFiyatStat.findMany as jest.Mock).mock.calls[0][0].where
    expect(where.il).toBe('TRABZON')
    expect(JSON.stringify(where)).toContain('UĞURLU')
  })
})
