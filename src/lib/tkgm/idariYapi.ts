/**
 * TKGM idari yapi (il/ilce/mahalle) hiyerarsi istemcisi. parcel.ts gibi
 * yalnizca sunucudan cagrilir — istemci hicbir zaman TKGM'ye dogrudan
 * fetch atmaz (bkz. parcel.ts'in ustundeki gerekce: CORS acik olsa da
 * kullanici IP'sinin devlet servisine acilmamasi ve rate-limit kontrolu).
 */
import { TKGM_BASE } from './parcel'

const TIMEOUT_MS = 8000

export type IdariYapiItem = { id: number; text: string }
export type MahalleItem = IdariYapiItem & { centroid: { lat: number; lng: number } | null }

type GeoJSONFeature = {
    properties?: { id?: unknown; text?: unknown }
    geometry?: { type?: string; coordinates?: unknown }
}
type GeoJSONFeatureCollection = { features?: GeoJSONFeature[] }

function toIdariYapiItem(feature: GeoJSONFeature): IdariYapiItem | null {
    const props = feature.properties
    if (!props) return null
    const id = Number(props.id)
    const text = String(props.text ?? '')
    // Number.isInteger + id > 0: sadece "sonlu" degil, gecerli bir TKGM kimligi
    // olmasi gerekir — rotalar zaten `id <= 0` reddediyor, kutuphane de ayni
    // kurala uysun (0/negatif/ondalikli bir id iki katmanda tutarsiz davranmasin).
    if (!Number.isInteger(id) || id <= 0 || text === '') return null
    return { id, text }
}

/**
 * Polygon/MultiPolygon koordinatlarindaki TUM [lng,lat] koselerini
 * duzlestirip basit aritmetik ortalamasini alir. Alan-agirlikli gercek bir
 * centroid DEGIL — haritayi kabaca dogru mahalleye ortalamak icin yeterli
 * bir yaklasiklik (kullanici zaten pini haritada ince ayarliyor).
 */
function flattenCoordinates(coordinates: unknown, out: number[][]): void {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length === 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
        out.push(coordinates as number[])
        return
    }
    for (const item of coordinates) flattenCoordinates(item, out)
}

function computeCentroid(geometry: GeoJSONFeature['geometry']): { lat: number; lng: number } | null {
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

async function fetchFeatureCollection(url: string): Promise<GeoJSONFeature[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            next: { revalidate: 86400 },
        })
        if (!res.ok) return []
        const data = (await res.json()) as GeoJSONFeatureCollection
        return Array.isArray(data.features) ? data.features : []
    } catch {
        return []
    } finally {
        clearTimeout(timer)
    }
}

export async function fetchIlListesi(): Promise<IdariYapiItem[]> {
    const features = await fetchFeatureCollection(`${TKGM_BASE}/idariYapi/ilListe`)
    return features.map(toIdariYapiItem).filter((x): x is IdariYapiItem => x !== null)
}

/**
 * Feature listesini {id,text} + centroid'e cevirir. fetchIlceListesi VE
 * fetchMahalleListesi tarafindan paylasilir — ikisi de ayni sekle (MahalleItem)
 * ihtiyac duyar: ilce centroid'i, mahallenin centroid'i null oldugu durumlar
 * icin fallback konum olarak kullanilir (bkz. ManualParcelEntryForm.handleSearch).
 */
async function fetchAdminUnitsWithCentroid(url: string): Promise<MahalleItem[]> {
    const features = await fetchFeatureCollection(url)
    const result: MahalleItem[] = []
    for (const feature of features) {
        const item = toIdariYapiItem(feature)
        if (!item) continue
        result.push({ ...item, centroid: computeCentroid(feature.geometry) })
    }
    return result
}

export async function fetchIlceListesi(ilId: number): Promise<MahalleItem[]> {
    return fetchAdminUnitsWithCentroid(`${TKGM_BASE}/idariYapi/ilceListe/${ilId}`)
}

export async function fetchMahalleListesi(ilceId: number): Promise<MahalleItem[]> {
    return fetchAdminUnitsWithCentroid(`${TKGM_BASE}/idariYapi/mahalleListe/${ilceId}`)
}
