const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => {
                const result = findUniqueMock(...args)
                if (result && typeof result.then === 'function') {
                    return result.then((data: any) => {
                        const [{ select }] = args as any
                        if (data && !select?.password && 'password' in data) {
                            const { password, ...filtered } = data
                            return filtered
                        }
                        return data
                    })
                }
                return result
            },
        },
    },
}))

import { GET } from '../route'

describe('GET /api/user/export', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset()
        findUniqueMock.mockReset()
    })

    it('oturum yoksa 401 döner', async () => {
        getServerSessionMock.mockResolvedValue(null)
        const res = await GET()
        expect(res.status).toBe(401)
    })

    it('kullanıcı verisini password hariç JSON olarak döner', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
        findUniqueMock.mockResolvedValue({
            id: 'u1', name: 'Test', email: 'test@test.com', password: 'gizli-hash',
            projects: [], listings: [], reports: [], favorites: [],
            sentMessages: [], receivedMessages: [], offers: [],
        })
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.user).not.toHaveProperty('password')
        expect(body.user.email).toBe('test@test.com')

        // select ile zaten dışlandığını doğrulamak için findUnique çağrısını incele
        const selectArg = findUniqueMock.mock.calls[0][0].select
        expect(selectArg.password).toBeUndefined()
    })
})
