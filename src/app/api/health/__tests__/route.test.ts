const queryRawMock = jest.fn()

jest.mock('@/lib/prisma', () => ({
    prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}))

import { GET } from '../route'

describe('GET /api/health', () => {
    beforeEach(() => queryRawMock.mockReset())

    it('DB erişilebilirse 200 ve status ok döner', async () => {
        queryRawMock.mockResolvedValue([{ '?column?': 1 }])
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(body.status).toBe('ok')
        expect(body.db).toBe('ok')
        expect(typeof body.uptimeSec).toBe('number')
    })

    it('DB hatasında 503 ve degraded döner', async () => {
        queryRawMock.mockRejectedValue(new Error('connrefused'))
        const res = await GET()
        const body = await res.json()
        expect(res.status).toBe(503)
        expect(body.status).toBe('degraded')
        expect(body.db).toBe('fail')
    })
})
