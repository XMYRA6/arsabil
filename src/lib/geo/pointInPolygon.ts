/**
 * Standart even-odd ray-casting point-in-polygon testi. `ring`, GeoJSON
 * kosullarina uygun [lng,lat] ciftlerinden olusur (kapali ya da acik olabilir
 * — kapanis kosesi testi etkilemez). Parselin gercek poligonunun DISINA dusen
 * bir centroid'i (disbukey olmayan/L-sekilli parsellerde olur) tespit etmek
 * icin kullanilir — bkz. ManualParcelEntryForm.tsx'teki ada/parsel exact-lookup
 * dogrulamasi.
 */
export function pointInPolygon(point: { lat: number; lng: number }, ring: number[][]): boolean {
    let inside = false
    const n = ring.length
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        const intersects = (yi > point.lat) !== (yj > point.lat) &&
            point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
        if (intersects) inside = !inside
    }
    return inside
}
