import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const { scenarioIds } = await req.json()
    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2) {
        return NextResponse.json({ error: 'En az 2 senaryo ID gerekli' }, { status: 400 })
    }

    // Verify all scenarios belong to this user (via Project -> userId)
    const scenarios = await prisma.scenario.findMany({
        where: { id: { in: scenarioIds }, project: { userId } },
        select: { id: true },
    })
    if (scenarios.length !== scenarioIds.length) {
        return NextResponse.json({ error: 'Geçersiz senaryo ID' }, { status: 403 })
    }

    // scenarioIds is String[] (PostgreSQL array) — no JSON.stringify needed
    const share = await prisma.compareShare.create({
        data: {
            userId,
            scenarioIds,
        },
        select: { token: true },
    })

    return NextResponse.json({ token: share.token }, { status: 201 })
}
