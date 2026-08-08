/**
 * GeoJSON Polygon/MultiPolygon koordinatlarindaki TUM [lng,lat] koselerini
 * duzlestirip basit aritmetik ortalamasini alir. Alan-agirlikli gercek bir
 * centroid DEGIL — haritayi kabaca dogru noktaya ortalamak icin yeterli bir
 * yaklasiklik. `idariYapi.ts` (il/ilce/mahalle sinir centroid'i) ve ada/parsel
 * sorgusundan donen gercek parsel poligonu tarafindan paylasilir.
 */

export type GeoJSONGeometryLike = { type?: string; coordinates?: unknown }

function flattenCoordinates(coordinates: unknown, out: number[][]): void {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length === 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
        out.push(coordinates as number[])
        return
    }
    for (const item of coordinates) flattenCoordinates(item, out)
}

export function polygonCentroid(geometry: GeoJSONGeometryLike | null | undefined): { lat: number; lng: number } | null {
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null
    const points: number[][] = []
    flattenCoordinates(geometry.coordinates, points)
    if (points.length === 0) return null
    let sumLng = 0
    let sumLat = 0
    for (const [lng, lat] of points) {
        sumLng += lng
        sumLat += lat
    }
    return { lat: sumLat / points.length, lng: sumLng / points.length }
}
