import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.profitLevel.count();
  if (count === 0) {
    await prisma.profitLevel.createMany({
      data: [
        { label: 'Düşük', value: 1.15, sortOrder: 0, isDefault: false },
        { label: 'Orta', value: 1.30, sortOrder: 1, isDefault: true },
        { label: 'Yüksek', value: 1.50, sortOrder: 2, isDefault: false },
      ],
    });
    console.log('✅ Varsayılan kâr katsayıları oluşturuldu.');
  } else {
    console.log(`ℹ️ Zaten ${count} adet kâr katsayısı mevcut, atlanıyor.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
