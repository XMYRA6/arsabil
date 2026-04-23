import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPost() {
  const label = "Ekstrem";
  const value = 20;
  const isDefault = false;

  try {
    console.log('Testing create risk level...');
    const maxOrder = await prisma.riskLevel.aggregate({ _max: { sortOrder: true } });
    const newOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const level = await prisma.riskLevel.create({
      data: {
        label,
        value: Number(value),
        sortOrder: newOrder,
        isDefault: isDefault || false,
      },
    });
    console.log('Success:', level);
  } catch (error) {
    console.error('Error detail:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPost();
