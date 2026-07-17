const getServerSessionMock = jest.fn()
const userUpdateMock = jest.fn()
const findManyMock = jest.fn()
const listingUpdateManyMock = jest.fn()
const transactionMock = jest.fn((ops: unknown[]) => Promise.all(ops))

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            update: (...args: unknown[]) => userUpdateMock(...args),
            findMany: (...args: unknown[]) => findManyMock(...args),
        },
        listing: { updateMany: (...args: unknown[]) => listingUpdateManyMock(...args) },
        $transaction: (ops: unknown[]) => transactionMock(ops),
    },
}))

import { GET, PATCH } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
}

describe('PATCH /api/admin/users — isBanned', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        userUpdateMock.mockReset()
        findManyMock.mockReset()
        listingUpdateManyMock.mockReset()
        transactionMock.mockReset().mockImplementation((ops: unknown[]) => Promise.all(ops))
    })

    it('ADMIN olmayan istekte 403 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'USER' } })
        const res = await PATCH(req({ userId: 'target-1', isBanned: true }))
        expect(res.status).toBe(403)
    })

    it('admin kendi hesabını banlayamaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        const res = await PATCH(req({ userId: 'admin-1', isBanned: true }))
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.message).toBe('Kendi hesabınızı değiştiremezsiniz.')
    })

    it('isBanned:true gönderildiğinde kullanıcı güncellenir ve aktif ilanları pasife alınır (transaction)', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        userUpdateMock.mockResolvedValue({ id: 'target-1', isBanned: true })
        listingUpdateManyMock.mockResolvedValue({ count: 2 })

        const res = await PATCH(req({ userId: 'target-1', isBanned: true }))

        expect(res.status).toBe(200)
        expect(transactionMock).toHaveBeenCalledTimes(1)
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { id: 'target-1' },
            data: { isBanned: true },
        })
        expect(listingUpdateManyMock).toHaveBeenCalledWith({
            where: { userId: 'target-1', isActive: true },
            data: { isActive: false },
        })
    })

    it('isBanned:false (askı kaldırma) ilanlara dokunmaz, transaction kullanmaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        userUpdateMock.mockResolvedValue({ id: 'target-1', isBanned: false })

        const res = await PATCH(req({ userId: 'target-1', isBanned: false }))

        expect(res.status).toBe(200)
        expect(transactionMock).not.toHaveBeenCalled()
        expect(listingUpdateManyMock).not.toHaveBeenCalled()
        expect(userUpdateMock).toHaveBeenCalledWith({
            where: { id: 'target-1' },
            data: { isBanned: false },
        })
    })
})

describe('GET /api/admin/users — isBanned select', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findManyMock.mockReset()
    })

    it('select nesnesinde isBanned true olarak istenir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        findManyMock.mockResolvedValue([
            {
                id: 'u1',
                name: 'Test',
                email: 't@t.com',
                role: 'USER',
                isBanned: true,
                createdAt: new Date(),
                _count: { reports: 0, listings: 0, offers: 0 },
            },
        ])

        const res = await GET()

        expect(res.status).toBe(200)
        expect(findManyMock).toHaveBeenCalledTimes(1)
        const callArgs = findManyMock.mock.calls[0][0]
        expect(callArgs.select.isBanned).toBe(true)

        const body = await res.json()
        expect(body.users[0].isBanned).toBe(true)
    })
})
