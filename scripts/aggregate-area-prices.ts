import { prisma } from '@/lib/prisma'
import { aggregateAreaPrices, type AggregateInputRow } from '@/lib/areaPrices/aggregate'

async function main() {
  const rows = await prisma.marketListing.findMany({
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
  const computedAt = new Date()

  let written = 0
  for (const s of stats) {
    const existing = await prisma.areaPriceStat.findFirst({
      where: {
        il: s.il,
        ilce: s.ilce,
        mahalle: s.mahalle,
      },
    })

    if (existing) {
      await prisma.areaPriceStat.update({
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
      await prisma.areaPriceStat.create({
        data: { ...s, computedAt },
      })
    }
    written++
  }

  const total = await prisma.areaPriceStat.count()
  console.log(
    `✅ ${written} AreaPriceStat satırı yazıldı/güncellendi (${rows.length} ilan tarandı). Tabloda toplam ${total}.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
