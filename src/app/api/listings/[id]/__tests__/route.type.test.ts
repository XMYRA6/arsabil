const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const updateMock = jest.fn()

jest.mock('next-auth/next', () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
    prisma: {
        listing: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            update: (...args: unknown[]) => updateMock(...args),
        },
    },
}))
jest.mock('@/lib/listing/parcelSnapshot', () => ({
    buildParcelSnapshot: jest.fn().mockResolvedValue({}),
}))

import { PATCH } from '../route'

function patchReq(body: unknown) {
    return new Request('http://localhost/api/listings/l1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    }) as never
}

const ctx = { params: Promise.resolve({ id: 'l1' }) }

describe('PATCH /api/listings/[id] — type alanı', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        updateMock.mockReset().mockResolvedValue({ id: 'l1' })
        findUniqueMock.mockReset().mockResolvedValue({ userId: 'u1', lat: null, lng: null })
    })

    it('gövdedeki type değeri güncellemeye yazılır', async () => {
        await PATCH(patchReq({ type: 'ORTAKLIK' }), ctx)
        const data = updateMock.mock.calls[0][0].data
        expect(data.type).toBe('ORTAKLIK')
    })

    it('type gövdede yoksa güncelleme verisine hiç eklenmez (kısmi PATCH)', async () => {
        await PATCH(patchReq({ title: 'Yeni başlık' }), ctx)
        const data = updateMock.mock.calls[0][0].data
        expect(data).not.toHaveProperty('type')
    })

    it('geçersiz/null type gönderilirse varsayılana düşer, NOT NULL ihlali oluşmaz', async () => {
        await PATCH(patchReq({ type: null }), ctx)
        const data = updateMock.mock.calls[0][0].data
        expect(data.type).toBe('KAT_KARSILIGI')
    })
})
