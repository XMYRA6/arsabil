import { prisma } from '../src/lib/prisma'
import { refreshAreaPriceTrends } from '../src/lib/areaPrices/persistAggregates'

async function main() {
  const { written, total } = await refreshAreaPriceTrends(prisma)
  console.log(`✅ ${written} AreaPriceTrend satırı yazıldı/güncellendi. Tabloda toplam ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
