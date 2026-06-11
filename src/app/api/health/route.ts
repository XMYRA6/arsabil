import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const startedAt = Date.now()

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json({
            status: 'ok',
            db: 'ok',
            uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        })
    } catch {
        return NextResponse.json({ status: 'degraded', db: 'fail' }, { status: 503 })
    }
}
