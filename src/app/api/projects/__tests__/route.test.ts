const getServerSessionMock = jest.fn()
const findManyMock = jest.fn()
const createMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        project: {
            findMany: (...args: unknown[]) => findManyMock(...args),
            create: (...args: unknown[]) => createMock(...args),
        },
    },
}))

import { GET, POST } from '../route'

function postReq(body: unknown) {
    return new Request('http://localhost/api/projects', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/projects', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findManyMock.mockReset().mockResolvedValue([])
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(403)
    })

    it('yalnızca oturumdaki kullanıcının projelerini sorgular (userId filtresi asla undefined olmamalı — geçmişteki IDOR regresyonu)', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await GET()
        expect(findManyMock).toHaveBeenCalledTimes(1)
        expect(findManyMock.mock.calls[0][0].where.userId).toBe('u1')
        expect(findManyMock.mock.calls[0][0].where.userId).not.toBeUndefined()
    })
})

describe('POST /api/projects', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        createMock.mockReset().mockResolvedValue({ id: 'p1' })
    })

    it('oturum yoksa 403 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await POST(postReq({ name: 'X' }))
        expect(res.status).toBe(403)
    })

    it('userId her zaman oturumdaki kullanıcıya sabitlenir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        await POST(postReq({ name: 'Test Proje' }))
        expect(createMock.mock.calls[0][0].data.userId).toBe('u1')
    })
})
