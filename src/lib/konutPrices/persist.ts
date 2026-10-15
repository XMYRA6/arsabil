import { aggregateKonutPrices, type KonutInputRow } from './aggregate'

export interface KonutPersistDb {
  marketListing: { findMany(args: unknown): Promise<unknown[]> }
  konutFiyatStat: { upsert(args: unknown): Promise<unknown>; count(): Promise<number> }
}

export async function refreshKonutFiyatStats(
  db: KonutPersistDb,
  computedAt: Date = new Date(),
): Promise<{ written: number; total: number }> {
  const rows = await db.marketListing.findMany({
    where: { listingType: 'konut', status: 'active' },
    select: { listingType: true, pricePerSqm: true, areaSqm: true, status: true, il: true, ilce: true, mahalle: true },
  })
  const stats = aggregateKonutPrices(rows as KonutInputRow[])
  let written = 0
  for (const s of stats) {
    const data = {
      scope: s.scope,
      medianPricePerSqm: s.medianPricePerSqm,
      p25: s.p25,
      p75: s.p75,
      sampleCount: s.sampleCount,
      medianAreaSqm: s.medianAreaSqm,
      computedAt,
    }
    await db.konutFiyatStat.upsert({
      where: { il_ilce_mahalle: { il: s.il, ilce: s.ilce, mahalle: s.mahalle } },
      create: { il: s.il, ilce: s.ilce, mahalle: s.mahalle, ...data },
      update: data,
    })
    written++
  }
  return { written, total: await db.konutFiyatStat.count() }
}
