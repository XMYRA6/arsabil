const getServerSessionMock = jest.fn()
const createMock = jest.fn()
const buildSnapshotMock = jest.fn()

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
    buildParcelSnapshot: (...args: unknown[]) => buildSnapshotMock(...args),
}))

import { POST } from '../route'

const VERIFIED_SNAPSHOT = {
    neighborhood: 'Kirkkepenekli', adaNo: '0', parselNo: '1871',
    parcelAreaSqm: 830, parcelQuality: 'Arsa',
    parcelGeometry: { type: 'Polygon', coordinates: [] },
    parcelVerifiedAt: new Date('2026-07-27T00:00:00Z'), parcelLookupStatus: 'verified',
}

const EMPTY_SNAPSHOT = {
    neighborhood: null, adaNo: null, parselNo: null,
    parcelAreaSqm: null, parcelQuality: null, parcelGeometry: null,
    parcelVerifiedAt: null, parcelLookupStatus: null,
}

function postReq(body: unknown) {
    return new Request('http://localhost/api/listings', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/listings — parsel snapshot', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        createMock.mockReset().mockResolvedValue({ id: 'l1' })
        buildSnapshotMock.mockReset().mockResolvedValue(VERIFIED_SNAPSHOT)
    })

    it('koordinatı kaydeder ve snapshot üretmek için TKGM sorgusunu tetikler', async () => {
        await POST(postReq({ city: 'Tekirdağ', lat: 41.167877, lng: 27.583458 }))
        expect(buildSnapshotMock).toHaveBeenCalledWith(41.167877, 27.583458)
        const data = createMock.mock.calls[0][0].data
        expect(data.lat).toBe(41.167877)
        expect(data.lng).toBe(27.583458)
        expect(data.adaNo).toBe('0')
        expect(data.parcelLookupStatus).toBe('verified')
    })

    it('GÜVENLİK: istemcinin gönderdiği sahte parsel alanları yok sayılır', async () => {
        buildSnapshotMock.mockResolvedValue({ ...EMPTY_SNAPSHOT, parcelLookupStatus: 'not_found' })

        await POST(postReq({
            city: 'Tekirdağ', lat: 41.167877, lng: 27.583458,
            adaNo: '999', parselNo: '12345', neighborhood: 'Sahte Mahalle',
            parcelAreaSqm: 99999, parcelQuality: 'Arsa',
            parcelGeometry: { type: 'Polygon', coordinates: [] },
            parcelVerifiedAt: '2020-01-01T00:00:00Z', parcelLookupStatus: 'verified',
        }))

        const data = createMock.mock.calls[0][0].data
        expect(data.adaNo).toBeNull()
        expect(data.parselNo).toBeNull()
        expect(data.neighborhood).toBeNull()
        expect(data.parcelAreaSqm).toBeNull()
        expect(data.parcelVerifiedAt).toBeNull()
        expect(data.parcelLookupStatus).toBe('not_found')
    })

    it('koordinat gönderilmezse lat/lng null kalır ve TKGM sorgusuna null geçilir', async () => {
        buildSnapshotMock.mockResolvedValue(EMPTY_SNAPSHOT)
        await POST(postReq({ city: 'Tekirdağ' }))
        expect(buildSnapshotMock).toHaveBeenCalledWith(null, null)
        const data = createMock.mock.calls[0][0].data
        expect(data.lat).toBeNull()
        expect(data.lng).toBeNull()
    })

    it('koordinat sayı olmayan bir değerse null sayılır, TKGM sorgusuna geçirilmez', async () => {
        buildSnapshotMock.mockResolvedValue(EMPTY_SNAPSHOT)
        await POST(postReq({ city: 'Tekirdağ', lat: 'abc', lng: 'def' }))
        expect(buildSnapshotMock).toHaveBeenCalledWith(null, null)
        const data = createMock.mock.calls[0][0].data
        expect(data.lat).toBeNull()
        expect(data.lng).toBeNull()
    })
})
