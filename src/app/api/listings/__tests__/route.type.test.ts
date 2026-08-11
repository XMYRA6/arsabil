const getServerSessionMock = jest.fn()
const createMock = jest.fn()
const buildParcelSnapshotMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        listing: {
            create: (...args: unknown[]) => createMock(...args),
            findUnique: jest.fn().mockResolvedValue(null),
        },
        report: { findFirst: jest.fn().mockResolvedValue(null) },
    },
}))
jest.mock('@/lib/plan', () => ({
    checkPlanLimit: jest.fn().mockResolvedValue({ allowed: true }),
}))
jest.mock('@/lib/listing/parcelSnapshot', () => ({
    buildParcelSnapshot: (...args: unknown[]) => buildParcelSnapshotMock(...args),
}))

import { POST } from '../route'

function postReq(body: unknown) {
    return new Request('http://localhost/api/listings', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/listings — type alanı', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        createMock.mockReset().mockResolvedValue({ id: 'l1' })
        buildParcelSnapshotMock.mockReset().mockResolvedValue({})
    })

    it('gövdedeki type değeri DB kaydına yazılır', async () => {
        await POST(postReq({ city: 'Tekirdağ', type: 'SALE' }))
        const data = createMock.mock.calls[0][0].data
        expect(data.type).toBe('SALE')
    })

    it('type gönderilmezse varsayılan KAT_KARSILIGI yazılır', async () => {
        await POST(postReq({ city: 'Tekirdağ' }))
        const data = createMock.mock.calls[0][0].data
        expect(data.type).toBe('KAT_KARSILIGI')
    })

    it('geçersiz/tanınmayan type gönderilirse varsayılana düşer', async () => {
        await POST(postReq({ city: 'Tekirdağ', type: 'CRAP' }))
        const data = createMock.mock.calls[0][0].data
        expect(data.type).toBe('KAT_KARSILIGI')
    })
})
