const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: { offer: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

import { GET } from '../route'

describe('GET /api/admin/offers', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
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
