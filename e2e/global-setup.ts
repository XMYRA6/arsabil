import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const E2E_DB = process.env.E2E_DATABASE_URL
    ?? 'postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_test'

export default async function globalSetup() {
    execSync('npx prisma@5.22.0 migrate deploy', {
        env: { ...process.env, DATABASE_URL: E2E_DB },
        stdio: 'inherit',
    })

    const prisma = new PrismaClient({ datasources: { db: { url: E2E_DB } } })
    try {
        // FK sırası: önce child tablolar, sonra parent
        await prisma.scenario.deleteMany()
        await prisma.project.deleteMany()
        await prisma.compareShare.deleteMany()
        await prisma.message.deleteMany()
        await prisma.offer.deleteMany()
        await prisma.favorite.deleteMany()
        await prisma.notification.deleteMany()
        await prisma.report.deleteMany()
        await prisma.listing.deleteMany()
        await prisma.session.deleteMany()
        await prisma.account.deleteMany()
        await prisma.user.deleteMany()

        const password = await bcrypt.hash('Test1234!', 10)
        await prisma.user.create({ data: { id: 'e2e-admin',  email: 'admin@e2e.test', name: 'E2E Admin',   password, role: 'ADMIN' } })
        await prisma.user.create({ data: { id: 'e2e-user-1', email: 'user1@e2e.test', name: 'E2E UserBir', password, role: 'USER' } })
        await prisma.user.create({ data: { id: 'e2e-user-2', email: 'user2@e2e.test', name: 'E2E UserIki', password, role: 'USER' } })
    } finally {
        await prisma.$disconnect()
    }
}
