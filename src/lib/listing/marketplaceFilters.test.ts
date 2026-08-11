import { filterListings, sortListings, mergeDemoOverlay, type ListingFilters } from './marketplaceFilters'

const BASE_FILTERS: ListingFilters = {
    type: [], minSize: 0, maxSize: 100000, imar: [], fizibiliteOnly: false, minScore: 10,
}

describe('filterListings', () => {
    it('type filtresi boşsa hiçbir ilanı elemez', () => {
        const listings = [{ type: 'SALE' }, { type: 'KAT_KARSILIGI' }]
        expect(filterListings(listings, BASE_FILTERS)).toHaveLength(2)
    })

    it('type filtresi doluysa yalnızca eşleşenleri döner', () => {
        const listings = [{ type: 'SALE' }, { type: 'KAT_KARSILIGI' }]
        const result = filterListings(listings, { ...BASE_FILTERS, type: ['SALE'] })
        expect(result).toEqual([{ type: 'SALE' }])
    })

    it('landSizeSqm aralık dışındaysa elenir', () => {
        const listings = [{ type: 'SALE', landSizeSqm: 50 }, { type: 'SALE', landSizeSqm: 500 }]
        const result = filterListings(listings, { ...BASE_FILTERS, minSize: 200, maxSize: 1000 })
        expect(result).toEqual([{ type: 'SALE', landSizeSqm: 500 }])
    })

    it('landSizeSqm eksikse (null/undefined) filtrelemeden geçer — eksik veri cezalandırılmaz', () => {
        const listings = [{ type: 'SALE', landSizeSqm: null }, { type: 'SALE' }]
        const result = filterListings(listings, { ...BASE_FILTERS, minSize: 200, maxSize: 1000 })
        expect(result).toHaveLength(2)
    })

    it('imar filtresi zoning alanına bakar', () => {
        const listings = [{ type: 'SALE', zoning: 'KONUT' }, { type: 'SALE', zoning: 'TARIM' }]
        const result = filterListings(listings, { ...BASE_FILTERS, imar: ['KONUT'] })
        expect(result).toEqual([{ type: 'SALE', zoning: 'KONUT' }])
    })

    it('fizibiliteOnly açıkken minScore altındaki veya skorsuz ilanlar elenir', () => {
        const listings = [
            { type: 'SALE', fizibiliteSkoru: 5 },
            { type: 'SALE', fizibiliteSkoru: 50 },
            { type: 'SALE' },
        ]
        const result = filterListings(listings, { ...BASE_FILTERS, fizibiliteOnly: true, minScore: 10 })
        expect(result).toEqual([{ type: 'SALE', fizibiliteSkoru: 50 }])
    })

    it('ORTAKLIK ilanı KAT_KARSILIGI ile birlikte varsayılan type filtresinde görünür kalır', () => {
        const listings = [{ type: 'ORTAKLIK' }, { type: 'SALE' }]
        const result = filterListings(listings, { ...BASE_FILTERS, type: ['KAT_KARSILIGI', 'ORTAKLIK'] })
        expect(result).toEqual([{ type: 'ORTAKLIK' }])
    })
})

describe('sortListings', () => {
    it('score_desc: fizibiliteSkoru büyükten küçüğe sıralar', () => {
        const listings = [{ fizibiliteSkoru: 10 }, { fizibiliteSkoru: 90 }, { fizibiliteSkoru: 50 }]
        expect(sortListings(listings, 'score_desc')).toEqual([
            { fizibiliteSkoru: 90 }, { fizibiliteSkoru: 50 }, { fizibiliteSkoru: 10 },
        ])
    })

    it('price_asc: price yoksa report.minApartmentPrice kullanır, küçükten büyüğe sıralar', () => {
        const listings = [
            { price: 500000 },
            { report: { minApartmentPrice: 100000 } },
            { price: 300000 },
        ]
        expect(sortListings(listings, 'price_asc')).toEqual([
            { report: { minApartmentPrice: 100000 } },
            { price: 300000 },
            { price: 500000 },
        ])
    })

    it('newest: createdAt büyükten küçüğe (en yeni önce) sıralar', () => {
        const listings = [
            { createdAt: '2026-01-01T00:00:00Z' },
            { createdAt: '2026-08-01T00:00:00Z' },
            { createdAt: '2026-05-01T00:00:00Z' },
        ]
        expect(sortListings(listings, 'newest')).toEqual([
            { createdAt: '2026-08-01T00:00:00Z' },
            { createdAt: '2026-05-01T00:00:00Z' },
            { createdAt: '2026-01-01T00:00:00Z' },
        ])
    })

    it('orijinal diziyi mutasyona uğratmaz', () => {
        const listings = [{ fizibiliteSkoru: 1 }, { fizibiliteSkoru: 2 }]
        const original = [...listings]
        sortListings(listings, 'score_desc')
        expect(listings).toEqual(original)
    })
})

describe('mergeDemoOverlay', () => {
    it('gerçek veride bulunan alanlar demo overlay değerini EZER (asla tersi değil)', () => {
        const real = { id: '1', zoning: 'TARIM' as string | null }
        const overlay = { zoning: 'KONUT', fizibiliteSkoru: 80 }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', zoning: 'TARIM', fizibiliteSkoru: 80 })
    })

    it('gerçek veride alan null olsa bile demo overlay onu EZMEZ — eksik veri uydurulmaz', () => {
        const real = { id: '1', zoning: null as string | null }
        const overlay = { zoning: 'KONUT' }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', zoning: null })
    })

    it('gerçek veride hiç olmayan alanlar overlay değerini alır', () => {
        const real: { id: string; fizibiliteSkoru?: number } = { id: '1' }
        const overlay = { fizibiliteSkoru: 80 }
        expect(mergeDemoOverlay(real, overlay)).toEqual({ id: '1', fizibiliteSkoru: 80 })
    })
})
