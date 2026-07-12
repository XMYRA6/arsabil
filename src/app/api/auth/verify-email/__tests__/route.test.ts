const findTokenMock = jest.fn()
const deleteTokenMock = jest.fn()
const updateUserMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        verificationToken: {
            findUnique: (...args: unknown[]) => findTokenMock(...args),
            delete: (...args: unknown[]) => deleteTokenMock(...args),
        },
        user: { update: (...args: unknown[]) => updateUserMock(...args) },
    },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/verify-email', () => {
    beforeEach(() => {
        findTokenMock.mockReset()
        deleteTokenMock.mockReset()
        updateUserMock.mockReset()
    })

    it('token eksikse 400 döner', async () => {
        const res = await POST(req({}))
        expect(res.status).toBe(400)
    })

    it('token bulunamazsa veya yanlış türdeyse 400 döner', async () => {
        findTokenMock.mockResolvedValue(null)
        const res = await POST(req({ token: 'gecersiz' }))
        expect(res.status).toBe(400)
    })

    it('süresi dolmuş token 400 döner ve silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'email-verify:kullanici@test.com',
            token: 'eski',
            expires: new Date(Date.now() - 1000),
        })
        const res = await POST(req({ token: 'eski' }))
        expect(res.status).toBe(400)
        expect(deleteTokenMock).toHaveBeenCalled()
    })

    it('geçerli token ile emailVerified set edilir ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'email-verify:kullanici@test.com',
            token: 'gecerli',
            expires: new Date(Date.now() + 60_000),
        })
        updateUserMock.mockResolvedValue({})
        const res = await POST(req({ token: 'gecerli' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/doğrulandı/i)
        expect(updateUserMock.mock.calls[0][0].where).toEqual({ email: 'kullanici@test.com' })
        expect(updateUserMock.mock.calls[0][0].data.emailVerified).toBeInstanceOf(Date)
        expect(deleteTokenMock).toHaveBeenCalledTimes(1)
    })
})
