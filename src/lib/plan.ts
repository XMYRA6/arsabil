import { prisma } from '@/lib/prisma'

export type PlanResource = 'reports' | 'listings' | 'scenarios'

export const PLAN_LIMITS: Record<string, Record<PlanResource, number>> = {
    FREE: { reports: 10, listings: 2, scenarios: 3 },
    PRO:  { reports: Infinity, listings: 10, scenarios: Infinity },
}

export async function checkPlanLimit(
    userId: string,
    resource: PlanResource
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    })
    const plan = user?.plan ?? 'FREE'
    const limit = PLAN_LIMITS[plan]?.[resource] ?? PLAN_LIMITS.FREE[resource]

    if (limit === Infinity) {
        return { allowed: true, current: 0, limit: Infinity }
    }

    let current = 0
    if (resource === 'reports') {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        current = await prisma.report.count({
            where: { userId, createdAt: { gte: startOfMonth } },
        })
    } else if (resource === 'listings') {
        current = await prisma.listing.count({
            where: { userId, status: { not: 'REJECTED' } },
        })
    } else {
        current = await prisma.scenario.count({
            where: { project: { userId } },
        })
    }

    const allowed = current < limit
    return {
        allowed,
        current,
        limit,
        ...(allowed ? {} : { reason: `${resource} limitine ulaştınız (${current}/${limit})` }),
    }
}
