import { prisma } from '../src/lib/prisma'
import { refreshKonutFiyatStats } from '../src/lib/konutPrices/persist'

async function main() {
  const { written, total } = await refreshKonutFiyatStats(prisma)
  console.log(`✅ ${written} KonutFiyatStat satırı yazıldı/güncellendi. Tabloda toplam ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
