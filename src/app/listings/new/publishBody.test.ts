import { buildListingPublishBody } from './publishBody'
import { emptyFormData } from '@/components/listing-wizard/types'
import type { WizardFormData } from '@/components/listing-wizard/types'

function form(patch: Partial<WizardFormData> = {}): WizardFormData {
    return { ...emptyFormData, city: 'Tekirdağ', title: '830 m² Arsa', ...patch }
}

describe('buildListingPublishBody', () => {
    // Bu ilk test, gercek bir uretim hatasinin regresyon cite'sidir: govde
    // lat/lng tasimiyordu, dolayisiyla sihirbaz pin birakmayi ZORUNLU tuttugu
    // halde her ilan koordinatsiz kaydediliyor, parsel ve risk snapshot'lari
    // hic olusmuyordu.
    it('pin birakilan koordinati govdeye koyar', () => {
        const body = buildListingPublishBody(form({ lat: 41.167877, lng: 27.583458 }))
        expect(body.lat).toBe(41.167877)
        expect(body.lng).toBe(27.583458)
    })

    it('koordinat yoksa null gonderir, alani atlamaz', () => {
        const body = buildListingPublishBody(form({ lat: null, lng: null }))
        expect(body).toHaveProperty('lat', null)
        expect(body).toHaveProperty('lng', null)
    })

    it('parsel alanlarini GONDERMEZ — snapshot yalnizca sunucuda uretilir', () => {
        const body = buildListingPublishBody(form({
            lat: 41, lng: 27,
            parcelStatus: 'verified',
            parcel: {
                il: 'Tekirdağ', ilce: 'Muratlı', mahalle: 'Kırkkepenekli',
                adaNo: '0', parselNo: '1871', areaSqm: 830, quality: 'Arsa',
                geometry: { type: 'Polygon', coordinates: [[[27.58, 41.16]]] },
            },
        }))
        expect(body).not.toHaveProperty('parcel')
        expect(body).not.toHaveProperty('parcelStatus')
        expect(body).not.toHaveProperty('parcelAreaSqm')
        expect(body).not.toHaveProperty('adaNo')
    })

    it('bos metin alanlarini null yapar, sayisal alanlari cevirir', () => {
        const body = buildListingPublishBody(form({
            lat: 41, lng: 27,
            district: '', address: '', zoning: '', titleDeed: '',
            description: '', phone: '', reportId: '',
            landSizeSqm: '830', price: '4950000',
        }))
        expect(body.district).toBeNull()
        expect(body.address).toBeNull()
        expect(body.reportId).toBeNull()
        expect(body.landSizeSqm).toBe(830)
        expect(body.price).toBe(4950000)
    })

    it('sayisal alanlar bosken null olur (0 DEGIL)', () => {
        const body = buildListingPublishBody(form({ lat: 41, lng: 27, landSizeSqm: '', price: '' }))
        expect(body.landSizeSqm).toBeNull()
        expect(body.price).toBeNull()
    })

    it('fotograflari url dizisine indirger', () => {
        const body = buildListingPublishBody(form({
            lat: 41, lng: 27,
            photos: [{ url: 'https://x/a.jpg', publicId: 'a' }, { url: 'https://x/b.jpg', publicId: 'b' }],
        }))
        expect(body.photos).toEqual(['https://x/a.jpg', 'https://x/b.jpg'])
    })
})
