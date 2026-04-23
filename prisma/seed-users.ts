import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin kullanıcı
  const adminEmail = 'admin@arsabil.com';
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin kullanıcı oluşturuldu: admin@arsabil.com / admin123');
  } else {
    console.log('ℹ️ Admin kullanıcı zaten mevcut.');
  }

  // Test kullanıcı
  const userEmail = 'user@arsabil.com';
  const userExists = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!userExists) {
    const hashedPassword = await bcrypt.hash('user123', 10);
    await prisma.user.create({
      data: {
        name: 'Test Kullanıcı',
        email: userEmail,
        password: hashedPassword,
        role: 'USER',
      },
    });
    console.log('✅ Test kullanıcı oluşturuldu: user@arsabil.com / user123');
  } else {
    console.log('ℹ️ Test kullanıcı zaten mevcut.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
