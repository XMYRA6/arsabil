import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const levels = await prisma.riskLevel.findMany();
    console.log('Levels:', levels);
  } catch (error) {
    console.error('Error fetching risk levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
