const getServerSessionMock = jest.fn()
const findUniqueMock = jest.fn()
const updateMock = jest.fn()
const buildSnapshotMock = jest.fn()

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
    buildParcelSnapshot: (...args: unknown[]) => buildSnapshotMock(...args),
}))

import { PATCH } from '../route'

const VERIFIED_SNAPSHOT = {
    neighborhood: 'Kirkkepenekli', adaNo: '0', parselNo: '1871',
    parcelAreaSqm: 830, parcelQuality: 'Arsa',
    parcelGeometry: { type: 'Polygon', coordinates: [] },
    parcelVerifiedAt: new Date('2026-07-28T00:00:00Z'), parcelLookupStatus: 'verified',
}

function patchReq(body: unknown) {
    return new Request('http://localhost/api/listings/l1', {
        method: 'PATCH',
        body: JSON.stringify(body),
    }) as never
}

const ctx = { params: Promise.resolve({ id: 'l1' }) }

describe('PATCH /api/listings/[id] — parsel snapshot', () => {
    beforeEach(() => {
        getServerSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } })
        updateMock.mockReset().mockResolvedValue({ id: 'l1' })
        buildSnapshotMock.mockReset().mockResolvedValue(VERIFIED_SNAPSHOT)
        findUniqueMock.mockReset().mockResolvedValue({ userId: 'u1', lat: 41.10, lng: 27.50 })
    })

    it('koordinat değiştiyse snapshot yeniden üretilir', async () => {
        await PATCH(patchReq({ title: 'x', lat: 41.167877, lng: 27.583458 }), ctx)
        expect(buildSnapshotMock).toHaveBeenCalledWith(41.167877, 27.583458)
        const data = updateMock.mock.calls[0][0].data
        expect(data.lat).toBe(41.167877)
        expect(data.adaNo).toBe('0')
        expect(data.parcelLookupStatus).toBe('verified')
    })

    it('koordinat AYNIYSA TKGM sorgusu yapılmaz ve mevcut snapshot korunur', async () => {
        await PATCH(patchReq({ title: 'x', lat: 41.10, lng: 27.50 }), ctx)
        expect(buildSnapshotMock).not.toHaveBeenCalled()
        const data = updateMock.mock.calls[0][0].data
        expect(data).not.toHaveProperty('lat')
        expect(data).not.toHaveProperty('parcelVerifiedAt')
        expect(data).not.toHaveProperty('parcelLookupStatus')
    })

    it('koordinat hiç gönderilmezse mevcut snapshot korunur (eski ilan düzenlemesi)', async () => {
        findUniqueMock.mockResolvedValue({ userId: 'u1', lat: null, lng: null })
        await PATCH(patchReq({ title: 'x' }), ctx)
        expect(buildSnapshotMock).not.toHaveBeenCalled()
        const data = updateMock.mock.calls[0][0].data
        expect(data).not.toHaveProperty('parcelVerifiedAt')
    })

    it('GÜVENLİK: istemcinin gönderdiği sahte parsel alanları yok sayılır', async () => {
        await PATCH(patchReq({
            title: 'x', lat: 41.167877, lng: 27.583458,
            adaNo: '999', parselNo: '12345', neighborhood: 'Sahte',
            parcelAreaSqm: 99999, parcelVerifiedAt: '2020-01-01T00:00:00Z',
            parcelLookupStatus: 'verified',
        }), ctx)
        const data = updateMock.mock.calls[0][0].data
        // Sunucunun ürettiği snapshot geçerli; istemcinin uydurduğu değerler değil.
        expect(data.adaNo).toBe('0')
        expect(data.parselNo).toBe('1871')
        expect(data.neighborhood).toBe('Kirkkepenekli')
        expect(data.parcelAreaSqm).toBe(830)
        expect(data.parcelVerifiedAt).toEqual(VERIFIED_SNAPSHOT.parcelVerifiedAt)
    })

    it('başka kullanıcının ilanında 403 döner ve TKGM sorgusu yapılmaz', async () => {
        findUniqueMock.mockResolvedValue({ userId: 'baskasi', lat: null, lng: null })
        const res = await PATCH(patchReq({ title: 'x', lat: 41.16, lng: 27.58 }), ctx)
        expect(res.status).toBe(403)
        expect(buildSnapshotMock).not.toHaveBeenCalled()
    })
})
