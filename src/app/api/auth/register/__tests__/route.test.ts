const findUniqueMock = jest.fn()
const createUserMock = jest.fn()
const createTokenMock = jest.fn()
const sendEmailMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            create: (...args: unknown[]) => createUserMock(...args),
        },
        verificationToken: { create: (...args: unknown[]) => createTokenMock(...args) },
    },
}))
jest.mock('@/lib/email', () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
    buildEmailVerificationEmail: (url: string) => `<a href="${url}">verify</a>`,
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { REGISTER: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        createUserMock.mockReset()
        createTokenMock.mockReset()
        sendEmailMock.mockReset()
    })

    it('role client tarafından gönderilse bile USER olarak kaydedilir (privilege escalation regresyonu)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!', role: 'ADMIN' }))

        expect(createUserMock).toHaveBeenCalledTimes(1)
        expect(createUserMock.mock.calls[0][0].data.role).toBe('USER')
    })

    it('response body\'de password alanı yer almaz (hash sızıntısı regresyonu)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        const res = await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))
        const body = await res.json()

        expect(body.user).not.toHaveProperty('password')
    })

    it('başarılı kayıtta doğrulama token\'ı üretilir ve e-posta gönderilir', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})

        await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))

        expect(createTokenMock).toHaveBeenCalledTimes(1)
        expect(createTokenMock.mock.calls[0][0].data.identifier).toBe('email-verify:test@test.com')
        expect(sendEmailMock).toHaveBeenCalledTimes(1)
        expect(sendEmailMock.mock.calls[0][0].to).toBe('test@test.com')
    })

    it('e-posta gönderimi başarısız olsa bile kayıt 201 ile tamamlanır (doğrulama best-effort)', async () => {
        findUniqueMock.mockResolvedValue(null)
        createUserMock.mockResolvedValue({ id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER', createdAt: new Date() })
        createTokenMock.mockResolvedValue({})
        sendEmailMock.mockRejectedValue(new Error('resend down'))

        const res = await POST(req({ name: 'Test', email: 'test@test.com', password: 'Test1234!' }))
        expect(res.status).toBe(201)
    })
})
