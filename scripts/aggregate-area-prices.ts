import { prisma } from '../src/lib/prisma'
import { refreshAreaPriceStats } from '../src/lib/areaPrices/persistAggregates'

async function main() {
  const { written, total } = await refreshAreaPriceStats(prisma)
  console.log(`✅ ${written} AreaPriceStat satırı yazıldı/güncellendi. Tabloda toplam ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
