const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const messageDeleteManyMock = jest.fn()
const reportDeleteManyMock = jest.fn()
const userDeleteMock = jest.fn()
const compareMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('bcryptjs', () => ({
    compare: (...args: unknown[]) => compareMock(...args),
}))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            delete: (...args: unknown[]) => userDeleteMock(...args),
        },
        message: { deleteMany: (...args: unknown[]) => messageDeleteManyMock(...args) },
        report: { deleteMany: (...args: unknown[]) => reportDeleteManyMock(...args) },
    },
}))

import { DELETE } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/user/account', {
        method: 'DELETE',
        body: JSON.stringify(body),
    })
}

describe('DELETE /api/user/account', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findUniqueMock.mockReset()
        messageDeleteManyMock.mockReset()
        reportDeleteManyMock.mockReset()
        userDeleteMock.mockReset()
        compareMock.mockReset()
    })

    it('oturum yoksa 401 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await DELETE(req({ password: 'x' }))
        expect(res.status).toBe(401)
    })

    it('şifre gönderilmezse 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        const res = await DELETE(req({}))
        expect(res.status).toBe(400)
    })

    it('şifre yanlışsa 403 döner, hiçbir silme yapılmaz', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: 'hash', email: 'u1@test.com' })
        compareMock.mockResolvedValue(false)
        const res = await DELETE(req({ password: 'yanlis' }))
        expect(res.status).toBe(403)
        expect(userDeleteMock).not.toHaveBeenCalled()
    })

    it('şifre doğruysa Message->Report->User sırasıyla silinir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: 'hash', email: 'u1@test.com' })
        compareMock.mockResolvedValue(true)
        messageDeleteManyMock.mockResolvedValue({ count: 0 })
        reportDeleteManyMock.mockResolvedValue({ count: 0 })
        userDeleteMock.mockResolvedValue({})

        const res = await DELETE(req({ password: 'dogru' }))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.message).toMatch(/hesabınız silindi/i)
        expect(messageDeleteManyMock).toHaveBeenCalledWith({
            where: { OR: [{ senderId: 'u1' }, { receiverId: 'u1' }] },
        })
        expect(reportDeleteManyMock).toHaveBeenCalledWith({ where: { userId: 'u1' } })
        expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: 'u1' } })

        // Sıra: message -> report -> user (FK kısıtları bu sırayı gerektiriyor)
        const messageOrder = messageDeleteManyMock.mock.invocationCallOrder[0]
        const reportOrder = reportDeleteManyMock.mock.invocationCallOrder[0]
        const userOrder = userDeleteMock.mock.invocationCallOrder[0]
        expect(messageOrder).toBeLessThan(reportOrder)
        expect(reportOrder).toBeLessThan(userOrder)
    })

    it('kullanıcının şifresi yoksa (OAuth hesabı varsayımı) 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: null, email: 'u1@test.com' })
        const res = await DELETE(req({ password: 'herhangi' }))
        expect(res.status).toBe(400)
    })
})
