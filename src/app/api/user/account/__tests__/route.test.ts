const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const messageDeleteManyMock = jest.fn()
const reportDeleteManyMock = jest.fn()
const userDeleteMock = jest.fn()
const compareMock = jest.fn()
const transactionMock = jest.fn()

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
        $transaction: (...args: unknown[]) => transactionMock(...args),
    },
}))

import { DELETE } from '../route'
import { authOptions } from '@/lib/auth'

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
        transactionMock.mockReset()
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

    it('şifre doğruysa Message->Report->User tek $transaction içinde, doğru sırayla silinir', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: 'hash', email: 'u1@test.com' })
        compareMock.mockResolvedValue(true)
        messageDeleteManyMock.mockReturnValue('MESSAGE_OP')
        reportDeleteManyMock.mockReturnValue('REPORT_OP')
        userDeleteMock.mockReturnValue('USER_OP')
        transactionMock.mockResolvedValue([])

        const res = await DELETE(req({ password: 'dogru' }))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.message).toMatch(/hesabınız silindi/i)
        expect(getServerSessionMock).toHaveBeenCalledWith(authOptions)
        expect(messageDeleteManyMock).toHaveBeenCalledWith({
            where: { OR: [{ senderId: 'u1' }, { receiverId: 'u1' }] },
        })
        expect(reportDeleteManyMock).toHaveBeenCalledWith({ where: { userId: 'u1' } })
        expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: 'u1' } })

        // Üç işlem tek $transaction çağrısına, tam olarak Message -> Report -> User
        // sırasıyla verilmiş olmalı (atomik rollback garantisi buna dayanıyor).
        expect(transactionMock).toHaveBeenCalledTimes(1)
        expect(transactionMock.mock.calls[0][0]).toEqual(['MESSAGE_OP', 'REPORT_OP', 'USER_OP'])
    })

    it('kullanıcının şifresi yoksa (OAuth hesabı varsayımı) 400 döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({ id: 'u1', password: null, email: 'u1@test.com' })
        const res = await DELETE(req({ password: 'herhangi' }))
        expect(res.status).toBe(400)
    })
})
