import { splitListingsByCoords } from './listingCoords'

/** Test ilanı: gerçek Listing gibi kimliği olan, koordinatı opsiyonel bir kayıt. */
type TestListing = { id: string; lat?: number | null; lng?: number | null }

describe('splitListingsByCoords', () => {
    it('koordinatı olan ilanlar placed listesine düşer', () => {
        const { placed, unplaced } = splitListingsByCoords<TestListing>([{ id: 'a', lat: 41.1, lng: 27.5 }])
        expect(placed).toHaveLength(1)
        expect(unplaced).toHaveLength(0)
        expect(placed[0].lat).toBe(41.1)
    })

    it('koordinatsız ilan HARİTAYA KONMAZ — uydurma konum üretilmez', () => {
        const { placed, unplaced } = splitListingsByCoords<TestListing>([{ id: 'a' }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('lat var lng yoksa yerleştirilmez', () => {
        const { placed, unplaced } = splitListingsByCoords<TestListing>([{ id: 'a', lat: 41.1, lng: null }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('null koordinat yerleştirilmez', () => {
        const { placed } = splitListingsByCoords<TestListing>([{ id: 'a', lat: null, lng: null }])
        expect(placed).toHaveLength(0)
    })

    it('NaN koordinat yerleştirilmez', () => {
        const { placed } = splitListingsByCoords<TestListing>([{ id: 'a', lat: NaN, lng: 27.5 }])
        expect(placed).toHaveLength(0)
    })

    it('0,0 koordinatı geçerli sayılmaz (varsayılan/boş değer göstergesi)', () => {
        const { placed, unplaced } = splitListingsByCoords<TestListing>([{ id: 'a', lat: 0, lng: 0 }])
        expect(placed).toHaveLength(0)
        expect(unplaced).toHaveLength(1)
    })

    it('karışık listeyi ikiye ayırır ve sırayı korur', () => {
        const { placed, unplaced } = splitListingsByCoords<TestListing>([
            { id: 'a', lat: 41.1, lng: 27.5 },
            { id: 'b' },
            { id: 'c', lat: 39.9, lng: 32.8 },
        ])
        expect(placed.map(l => l.id)).toEqual(['a', 'c'])
        expect(unplaced.map(l => l.id)).toEqual(['b'])
    })

    it('boş liste boş sonuç verir', () => {
        expect(splitListingsByCoords<TestListing>([])).toEqual({ placed: [], unplaced: [] })
    })
})
