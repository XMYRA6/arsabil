const findUniqueMock = jest.fn()
const createTokenMock = jest.fn()
const sendEmailMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
        verificationToken: { create: (...args: unknown[]) => createTokenMock(...args) },
    },
}))
jest.mock('@/lib/email', () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
    buildPasswordResetEmail: (url: string) => `<a href="${url}">reset</a>`,
}))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    getClientIp: () => '127.0.0.1',
    RATE_LIMITS: { PASSWORD_RESET: { limit: 3, windowMs: 3_600_000 } },
}))

import { POST } from '../route'

function req(body: unknown) {
    return new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        createTokenMock.mockReset()
        sendEmailMock.mockReset()
        // route.ts artık sendEmail(...).catch(...) şeklinde fire-and-forget
        // çağırıyor — mock'un bir Promise döndürmesi gerekir, aksi halde
        // .catch(...) undefined üzerinde çağrılır ve senkron biçimde fırlar.
        sendEmailMock.mockResolvedValue(undefined)
    })

    it('email eksikse 400 döner', async () => {
        const res = await POST(req({}))
        expect(res.status).toBe(400)
    })

    it('kullanıcı bulunmasa bile 200 ve genel mesaj döner (kullanıcı enumeration önleme), e-posta gönderilmez', async () => {
        findUniqueMock.mockResolvedValue(null)
        const res = await POST(req({ email: 'yok@test.com' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/e-posta adresinize gönderildi/i)
        expect(sendEmailMock).not.toHaveBeenCalled()
    })

    it('kullanıcı bulunursa token üretilir ve e-posta gönderilir', async () => {
        findUniqueMock.mockResolvedValue({ id: 'u1', email: 'var@test.com' })
        createTokenMock.mockResolvedValue({})
        const res = await POST(req({ email: 'var@test.com' }))
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.message).toMatch(/e-posta adresinize gönderildi/i)
        expect(createTokenMock).toHaveBeenCalledTimes(1)
        const createArgs = createTokenMock.mock.calls[0][0]
        expect(createArgs.data.identifier).toBe('password-reset:var@test.com')
        expect(sendEmailMock).toHaveBeenCalledTimes(1)
        expect(sendEmailMock.mock.calls[0][0].to).toBe('var@test.com')
    })
})
