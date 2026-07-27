/**
 * TKGM (Tapu ve Kadastro Genel Müdürlüğü) parsel sorgu istemcisi.
 * Yalnızca sunucu tarafından çağrılır — tarayıcıdan TKGM'ye gidilmez
 * (CORS, kullanıcı IP'sinin devlet servisine açılmaması, rate limit kontrolü).
 */

const TKGM_BASE = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api'
const TIMEOUT_MS = 8000

export type GeoJSONPolygon = { type: 'Polygon'; coordinates: number[][][] }

export type ParcelInfo = {
    il: string
    ilce: string
    mahalle: string
    adaNo: string
    parselNo: string
    areaSqm: number
    quality: string
    geometry: GeoJSONPolygon
}

export type ParcelLookupResult =
    | { ok: true; parcel: ParcelInfo }
    | { ok: false; reason: 'not_found' | 'unavailable' }

/**
 * TKGM'nin `alan` alanı endpoint'e göre farklı serialize ediliyor:
 * koordinat sorgusu "830.00" (noktalı), ada/parsel sorgusu "830,00" (virgüllü).
 * parseFloat tek başına yetmez: parseFloat("1.240,50") === 1.24.
 *
 * Kural: son ayraçtan sonra 3 hane varsa o ayraç binliktir (ondalık yok),
 * aksi halde son ayraç ondalık ayracıdır ve öncekiler binliktir.
 * Gözlemlenen TKGM formatı her zaman 2 ondalık hane kullanıyor.
 */
export function parseTkgmArea(raw: unknown): number | null {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
    if (typeof raw !== 'string') return null

    const s = raw.trim()
    if (!/^\d[\d.,]*$/.test(s)) return null

    const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
    let normalized: string
    if (lastSep === -1) {
        normalized = s
    } else if (s.length - lastSep - 1 === 3) {
        normalized = s.replace(/[.,]/g, '')
    } else {
        normalized = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1)
    }

    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
}

function toParcelInfo(json: unknown): ParcelInfo | null {
    if (!json || typeof json !== 'object') return null
    const feature = json as Record<string, unknown>
    const props = feature.properties as Record<string, unknown> | undefined
    const geometry = feature.geometry as GeoJSONPolygon | undefined

    if (!props) return null
    if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) return null

    const areaSqm = parseTkgmArea(props.alan)
    if (areaSqm === null) return null

    return {
        il: String(props.ilAd ?? ''),
        ilce: String(props.ilceAd ?? ''),
        mahalle: String(props.mahalleAd ?? ''),
        adaNo: String(props.adaNo ?? ''),
        parselNo: String(props.parselNo ?? ''),
        areaSqm,
        quality: String(props.nitelik ?? ''),
        geometry,
    }
}

export async function fetchParcelByPoint(lat: number, lng: number): Promise<ParcelLookupResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(`${TKGM_BASE}/parsel/${lat}/${lng}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
        if (res.status === 404) return { ok: false, reason: 'not_found' }
        if (!res.ok) return { ok: false, reason: 'unavailable' }

        const parcel = toParcelInfo(await res.json())
        return parcel ? { ok: true, parcel } : { ok: false, reason: 'unavailable' }
    } catch {
        return { ok: false, reason: 'unavailable' }
    } finally {
        clearTimeout(timer)
    }
}
