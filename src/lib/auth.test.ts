const findUniqueMock = jest.fn()
const compareMock = jest.fn()

jest.mock('@auth/prisma-adapter', () => ({
    PrismaAdapter: jest.fn(() => ({})),
}))
jest.mock('@/lib/prisma', () => ({
    prisma: { user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } },
}))
jest.mock('bcryptjs', () => ({ compare: (...args: unknown[]) => compareMock(...args) }))
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: () => ({ ok: true }),
    clientIpFromHeaders: () => '127.0.0.1',
    RATE_LIMITS: { LOGIN: { limit: 5, windowMs: 60_000 } },
}))
jest.mock('next-auth', () => ({}))
jest.mock('next-auth/providers/credentials', () => ({
    __esModule: true,
    default: jest.fn((options) => options),
}))

import { authOptions } from './auth'

type Authorize = (
    credentials: { email: string; password: string } | undefined,
    req: { headers: Record<string, string> },
) => Promise<unknown>

const provider = authOptions.providers[0] as unknown as { authorize: Authorize }

describe('authorize() — isBanned kontrolü', () => {
    beforeEach(() => {
        findUniqueMock.mockReset()
        compareMock.mockReset()
    })

    it('isBanned=true olan kullanıcı giriş yapamaz', async () => {
        findUniqueMock.mockResolvedValue({
            id: 'u1', email: 'test@test.com', name: 'Test', password: 'hashed', role: 'USER', isBanned: true,
        })
        compareMock.mockResolvedValue(true)

        await expect(
            provider.authorize({ email: 'test@test.com', password: 'Test1234!' }, { headers: {} })
        ).rejects.toThrow('Hesabınız askıya alınmıştır.')
    })

    it('isBanned=false olan kullanıcı normal giriş yapar', async () => {
        findUniqueMock.mockResolvedValue({
            id: 'u1', email: 'test@test.com', name: 'Test', password: 'hashed', role: 'USER', isBanned: false,
        })
        compareMock.mockResolvedValue(true)

        const result = await provider.authorize({ email: 'test@test.com', password: 'Test1234!' }, { headers: {} })

        expect(result).toEqual({ id: 'u1', email: 'test@test.com', name: 'Test', role: 'USER' })
    })
})
