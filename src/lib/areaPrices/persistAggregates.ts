import { aggregateAreaPrices, type AggregateInputRow } from './aggregate'
import { aggregateTrend, type TrendInputRow } from './trendAggregate'

/**
 * `refreshAreaPriceStats` / `refreshAreaPriceTrends` için gereken dar yapısal
 * DB arayüzü. `PrismaClient` DEĞİL: testler mock, script'ler gerçek `prisma`
 * geçirir.
 */
export interface AggregatePersistDb {
  areaPriceStat: {
    findFirst(args: unknown): Promise<{ id: string } | null>
    update(args: unknown): Promise<unknown>
    create(args: unknown): Promise<unknown>
    count(): Promise<number>
  }
  areaPriceTrend: {
    findFirst(args: unknown): Promise<{ id: string } | null>
    update(args: unknown): Promise<unknown>
    create(args: unknown): Promise<unknown>
    count(): Promise<number>
  }
  marketListing: {
    findMany(args: unknown): Promise<unknown[]>
  }
}

/**
 * `scripts/aggregate-area-prices.ts` main() gövdesinden bire bir taşındı:
 * findMany select + saf aggregate + find-first-then-update-or-create döngüsü.
 * Sessiz: log satırı çağıran script'e ait.
 */
export async function refreshAreaPriceStats(
  db: AggregatePersistDb,
  computedAt: Date = new Date(),
): Promise<{ written: number; total: number }> {
  const rows = await db.marketListing.findMany({
    select: {
      listingType: true,
      pricePerSqm: true,
      status: true,
      il: true,
      ilce: true,
      mahalle: true,
    },
  })

  const stats = aggregateAreaPrices(rows as AggregateInputRow[])

  let written = 0
  for (const s of stats) {
    const existing = await db.areaPriceStat.findFirst({
      where: {
        il: s.il,
        ilce: s.ilce,
        mahalle: s.mahalle,
      },
    })

    if (existing) {
      await db.areaPriceStat.update({
        where: { id: existing.id },
        data: {
          scope: s.scope,
          medianPricePerSqm: s.medianPricePerSqm,
          p25: s.p25,
          p75: s.p75,
          sampleCount: s.sampleCount,
          computedAt,
        },
      })
    } else {
      await db.areaPriceStat.create({
        data: { ...s, computedAt },
      })
    }
    written++
  }

  const total = await db.areaPriceStat.count()
  return { written, total }
}

/**
 * `scripts/aggregate-trend.ts` main() gövdesinden bire bir taşındı.
 */
export async function refreshAreaPriceTrends(
  db: AggregatePersistDb,
  computedAt: Date = new Date(),
): Promise<{ written: number; total: number }> {
  const rows = await db.marketListing.findMany({
    select: {
      listingType: true, pricePerSqm: true, status: true,
      il: true, ilce: true, mahalle: true, listedAt: true,
    },
  })

  const trend = aggregateTrend(rows as TrendInputRow[])

  let written = 0
  for (const t of trend) {
    const existing = await db.areaPriceTrend.findFirst({
      where: { il: t.il, ilce: t.ilce, mahalle: t.mahalle, monthBucket: t.monthBucket },
    })
    if (existing) {
      await db.areaPriceTrend.update({
        where: { id: existing.id },
        data: {
          scope: t.scope,
          medianPricePerSqm: t.medianPricePerSqm,
          sampleCount: t.sampleCount,
          computedAt,
        },
      })
    } else {
      await db.areaPriceTrend.create({ data: { ...t, computedAt } })
    }
    written++
  }

  const total = await db.areaPriceTrend.count()
  return { written, total }
}
