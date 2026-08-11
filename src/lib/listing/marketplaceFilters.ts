export interface ListingFilters {
    type: string[]
    minSize: number
    maxSize: number
    imar: string[]
    fizibiliteOnly: boolean
    minScore: number
}

export interface FilterableListing {
    type: string
    landSizeSqm?: number | null
    zoning?: string | null
    fizibiliteSkoru?: number
}

export interface SortableListing {
    fizibiliteSkoru?: number
    price?: number
    report?: { minApartmentPrice?: number }
    createdAt?: string
}

export function filterListings<T extends FilterableListing>(listings: T[], filters: ListingFilters): T[] {
    return listings.filter(l => {
        if (filters.type.length > 0 && !filters.type.includes(l.type)) return false
        if (l.landSizeSqm != null && (l.landSizeSqm < filters.minSize || l.landSizeSqm > filters.maxSize)) return false
        if (filters.imar.length > 0 && !filters.imar.includes(l.zoning ?? '')) return false
        if (filters.fizibiliteOnly && (!l.fizibiliteSkoru || l.fizibiliteSkoru < filters.minScore)) return false
        return true
    })
}

export function sortListings<T extends SortableListing>(listings: T[], sortBy: string): T[] {
    return [...listings].sort((a, b) => {
        if (sortBy === 'score_desc') return (b.fizibiliteSkoru ?? 0) - (a.fizibiliteSkoru ?? 0)
        if (sortBy === 'price_asc') {
            return (a.price ?? a.report?.minApartmentPrice ?? 0) - (b.price ?? b.report?.minApartmentPrice ?? 0)
        }
        if (sortBy === 'newest') {
            return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        }
        return 0
    })
}

// Gerçek veride VAR OLAN alanlar (null dahil) demo overlay'i EZER — asla tersi değil.
// `zoning` gibi artık gerçek bir alan varsa, {...real, ...overlay} sırası satıcının
// girdiği veriyi sessizce mock değerle değiştirirdi.
export function mergeDemoOverlay<T extends object>(real: T, overlay: Partial<T>): T {
    return { ...overlay, ...real }
}
