import { checkPlanLimit, PLAN_LIMITS } from './plan'

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        report: {
            count: jest.fn(),
        },
        listing: {
            count: jest.fn(),
        },
        scenario: {
            count: jest.fn(),
        },
    },
}))

import { prisma } from '@/lib/prisma'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PLAN_LIMITS', () => {
    it('FREE limits are correct', () => {
        expect(PLAN_LIMITS.FREE.reports).toBe(10)
        expect(PLAN_LIMITS.FREE.listings).toBe(2)
        expect(PLAN_LIMITS.FREE.scenarios).toBe(3)
    })

    it('PRO limits are correct', () => {
        expect(PLAN_LIMITS.PRO.reports).toBe(Infinity)
        expect(PLAN_LIMITS.PRO.listings).toBe(10)
        expect(PLAN_LIMITS.PRO.scenarios).toBe(Infinity)
    })
})

describe('checkPlanLimit', () => {
    beforeEach(() => jest.clearAllMocks())

    it('allows FREE user under reports limit', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(5)
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(5)
        expect(result.limit).toBe(10)
    })

    it('blocks FREE user at reports limit', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(10)
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(false)
        expect(result.reason).toMatch(/10/)
    })

    it('allows PRO user unlimited reports', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'PRO' })
        const result = await checkPlanLimit('user-1', 'reports')
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(Infinity)
        // Should not call count for Infinity limit
        expect(mockPrisma.report.count).not.toHaveBeenCalled()
    })

    it('checks listings count for FREE user', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.listing.count as jest.Mock).mockResolvedValue(2)
        const result = await checkPlanLimit('user-1', 'listings')
        expect(result.allowed).toBe(false)
        expect(result.current).toBe(2)
    })

    it('checks scenarios count for FREE user', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE' })
        ;(mockPrisma.scenario.count as jest.Mock).mockResolvedValue(1)
        const result = await checkPlanLimit('user-1', 'scenarios')
        expect(result.allowed).toBe(true)
        expect(result.current).toBe(1)
        expect(result.limit).toBe(3)
    })

    it('defaults to FREE plan if user not found', async () => {
        ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
        ;(mockPrisma.report.count as jest.Mock).mockResolvedValue(0)
        const result = await checkPlanLimit('ghost', 'reports')
        expect(result.limit).toBe(10)
    })
})
