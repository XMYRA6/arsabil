import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    _req: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    const share = await prisma.compareShare.findUnique({
        where: { token },
        select: { scenarioIds: true, createdAt: true },
    })

    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // scenarioIds is String[] (PostgreSQL array) — use directly, no JSON.parse needed
    const ids = share.scenarioIds
    const scenarios = await prisma.scenario.findMany({
        where: { id: { in: ids } },
    })

    // Preserve original order
    const ordered = ids
        .map((id: string) => scenarios.find(s => s.id === id))
        .filter(Boolean)

    return NextResponse.json({ scenarios: ordered, createdAt: share.createdAt })
}
