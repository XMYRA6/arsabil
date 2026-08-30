import { prisma } from '../src/lib/prisma'
import { aggregateTrend, type TrendInputRow } from '../src/lib/areaPrices/trendAggregate'

async function main() {
  const rows = await prisma.marketListing.findMany({
    select: {
      listingType: true, pricePerSqm: true, status: true,
      il: true, ilce: true, mahalle: true, listedAt: true,
    },
  })

  const trend = aggregateTrend(rows as TrendInputRow[])
  const computedAt = new Date()

  let written = 0
  for (const t of trend) {
    const existing = await prisma.areaPriceTrend.findFirst({
      where: { il: t.il, ilce: t.ilce, mahalle: t.mahalle, monthBucket: t.monthBucket },
    })
    if (existing) {
      await prisma.areaPriceTrend.update({
        where: { id: existing.id },
        data: {
          scope: t.scope,
          medianPricePerSqm: t.medianPricePerSqm,
          sampleCount: t.sampleCount,
          computedAt,
        },
      })
    } else {
      await prisma.areaPriceTrend.create({ data: { ...t, computedAt } })
    }
    written++
  }

  const total = await prisma.areaPriceTrend.count()
  console.log(
    `✅ ${written} AreaPriceTrend satırı yazıldı/güncellendi (${rows.length} ilan tarandı). Tabloda toplam ${total}.`,
  )
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
