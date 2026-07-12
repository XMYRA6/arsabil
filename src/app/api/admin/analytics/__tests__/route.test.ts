const getServerSessionMock = jest.fn()
const countMock = jest.fn()
const findManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { count: (...args: unknown[]) => countMock(...args), findMany: (...args: unknown[]) => findManyMock(...args) },
        report: { count: (...args: unknown[]) => countMock(...args) },
        listing: { count: (...args: unknown[]) => countMock(...args), findMany: (...args: unknown[]) => findManyMock(...args) },
        offer: { count: (...args: unknown[]) => countMock(...args) },
    },
}))

import { GET } from '../route'

describe('GET /api/admin/analytics', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        countMock.mockReset().mockResolvedValue(0)
        findManyMock.mockReset().mockResolvedValue([])
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN olmayan kullanıcı için 403 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } })
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('ADMIN kullanıcı için 200 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } })
        const res = await GET()
        expect(res.status).toBe(200)
    })
})
