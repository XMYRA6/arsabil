const fetchParcelMock = jest.fn()
jest.mock('@/lib/tkgm/parcel', () => ({
    fetchParcelByPoint: (...args: unknown[]) => fetchParcelMock(...args),
}))

import { Prisma } from '@prisma/client'
import { buildParcelSnapshot } from './parcelSnapshot'

const PARCEL = {
    il: 'Tekirdağ', ilce: 'Muratli', mahalle: 'Kirkkepenekli',
    adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
    geometry: { type: 'Polygon', coordinates: [[[27.58337, 41.16781]]] },
}

describe('buildParcelSnapshot', () => {
    beforeEach(() => { fetchParcelMock.mockReset() })

    it('koordinat yoksa TKGM çağrılmaz ve boş snapshot döner', async () => {
        const snap = await buildParcelSnapshot(null, null)
        expect(fetchParcelMock).not.toHaveBeenCalled()
        expect(snap.parcelLookupStatus).toBeNull()
        expect(snap.parcelVerifiedAt).toBeNull()
        expect(snap.adaNo).toBeNull()
    })

    it('doğrulanan parselin tüm alanlarını doldurur', async () => {
        fetchParcelMock.mockResolvedValue({ ok: true, parcel: PARCEL })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.adaNo).toBe('0')
        expect(snap.parselNo).toBe('1871')
        expect(snap.neighborhood).toBe('Kirkkepenekli')
        expect(snap.parcelAreaSqm).toBe(830)
        expect(snap.parcelQuality).toBe('Arsa')
        expect(snap.parcelGeometry).toEqual(PARCEL.geometry)
        expect(snap.parcelLookupStatus).toBe('verified')
        expect(snap.parcelVerifiedAt).toBeInstanceOf(Date)
    })

    it('parsel bulunamazsa durum kaydedilir ama alanlar boş kalır', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'not_found' })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.parcelLookupStatus).toBe('not_found')
        expect(snap.parcelVerifiedAt).toBeNull()
        expect(snap.adaNo).toBeNull()
        expect(snap.parcelGeometry).toBe(Prisma.DbNull)
    })

    it('servis erişilemezse unavailable kaydedilir', async () => {
        fetchParcelMock.mockResolvedValue({ ok: false, reason: 'unavailable' })
        const snap = await buildParcelSnapshot(41.16, 27.58)
        expect(snap.parcelLookupStatus).toBe('unavailable')
        expect(snap.parcelVerifiedAt).toBeNull()
    })
})
