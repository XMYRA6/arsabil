/**
 * İlanları haritaya konabilenler ve konamayanlar diye ayırır.
 *
 * NEDEN VAR: MapView eskiden koordinatı olmayan ilanı rastgele bir İstanbul
 * koordinatına yerleştiriyordu (`listing.lat ?? ISTANBUL_COORDS[...]`). Listing
 * şemasında lat/lng hiç olmadığı için harita tamamen uydurmaydı. Kural burada,
 * Leaflet'ten bağımsız ve test edilebilir biçimde tutulur.
 */

type WithCoords = { lat?: number | null; lng?: number | null }

export function splitListingsByCoords<T extends WithCoords>(
    listings: T[],
): { placed: (T & { lat: number; lng: number })[]; unplaced: T[] } {
    const placed: (T & { lat: number; lng: number })[] = []
    const unplaced: T[] = []

    for (const l of listings) {
        const { lat, lng } = l
        const valid =
            typeof lat === 'number' && Number.isFinite(lat) &&
            typeof lng === 'number' && Number.isFinite(lng) &&
            !(lat === 0 && lng === 0)

        if (valid) placed.push(l as T & { lat: number; lng: number })
        else unplaced.push(l)
    }

    return { placed, unplaced }
}
