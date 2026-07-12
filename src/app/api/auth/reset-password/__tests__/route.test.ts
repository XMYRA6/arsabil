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
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        findTokenMock.mockReset()
        deleteTokenMock.mockReset()
        updateUserMock.mockReset()
    })

    it('token veya password eksikse 400 döner', async () => {
        const res = await POST(req({ token: 'x' }))
        expect(res.status).toBe(400)
    })

    it('token bulunamazsa 400 döner', async () => {
        findTokenMock.mockResolvedValue(null)
        const res = await POST(req({ token: 'gecersiz', password: 'YeniSifre123!' }))
        expect(res.status).toBe(400)
    })

    it('token süresi dolmuşsa 400 döner ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'password-reset:kullanici@test.com',
            token: 'eski-token',
            expires: new Date(Date.now() - 1000),
        })
        const res = await POST(req({ token: 'eski-token', password: 'YeniSifre123!' }))
        expect(res.status).toBe(400)
        expect(deleteTokenMock).toHaveBeenCalled()
        expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('geçerli token ile şifre güncellenir ve token silinir', async () => {
        findTokenMock.mockResolvedValue({
            identifier: 'password-reset:kullanici@test.com',
            token: 'gecerli-token',
            expires: new Date(Date.now() + 60_000),
        })
        updateUserMock.mockResolvedValue({})
        const res = await POST(req({ token: 'gecerli-token', password: 'YeniSifre123!' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/şifreniz güncellendi/i)
        expect(updateUserMock).toHaveBeenCalledTimes(1)
        expect(updateUserMock.mock.calls[0][0].where).toEqual({ email: 'kullanici@test.com' })
        expect(deleteTokenMock).toHaveBeenCalledTimes(1)
    })
})
