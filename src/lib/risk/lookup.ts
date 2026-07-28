import { fetchWmsTile, decodePng } from './wms'
import { bboxAround, metersPerPixel, nearestOpaquePixelPx, isCenterOpaque } from './sampling'
import { gammaF, suggestedR } from './coefficient'
import type { RiskMeasurement } from './types'

/**
 * İki aşamalı örnekleme. TBDY 25 km'ye kadar bakmayı gerektiriyor, ama 25 km'yi
 * 256 px'e sığdırmak çözünürlüğü ~195 m/px'e düşürür — yakın fayda kabul edilemez.
 * Önce dar ve hassas kutu; isabet yoksa geniş ve kaba kutu.
 */
export const FINE = { radiusM: 2_000, sizePx: 256 }    // ~15,6 m/px
export const COARSE = { radiusM: 25_000, sizePx: 256 } // ~195 m/px
export const FLOOD = { radiusM: 250, sizePx: 65 }      // tek merkez pikseli için; tek sayı => net merkez

async function faultDistance(lat: number, lng: number): Promise<{ ok: boolean; distanceM: number | null }> {
    for (const stage of [FINE, COARSE]) {
        const tile = await fetchWmsTile('diri_fay', bboxAround(lat, lng, stage.radiusM), stage.sizePx)
        if (!tile.ok) return { ok: false, distanceM: null }

        // Bozuk/eksik PNG gövdesi de erişilemezlik olarak ele alınır — asla throw etmez.
        let img
        try {
            img = decodePng(tile.png)
        } catch {
            return { ok: false, distanceM: null }
        }

        const px = nearestOpaquePixelPx(img)
        if (px !== null) {
            return { ok: true, distanceM: px * metersPerPixel(stage.radiusM, stage.sizePx) }
        }
    }
    // 25 km yarıçapta da fay yok — TBDY'ye göre γF = 1,0 bölgesi.
    return { ok: true, distanceM: null }
}

/** Servis erişilemezse null döner; çağıran taraf risk bilgisini hiç göstermez. */
export async function measureRisk(lat: number, lng: number): Promise<RiskMeasurement | null> {
    const fault = await faultDistance(lat, lng)
    if (!fault.ok) return null

    const floodTile = await fetchWmsTile(
        'taskin_tehlike_haritasi_q100',
        bboxAround(lat, lng, FLOOD.radiusM),
        FLOOD.sizePx,
    )
    if (!floodTile.ok) return null

    // Bozuk/eksik PNG gövdesi de erişilemezlik olarak ele alınır — asla throw etmez.
    let floodImg
    try {
        floodImg = decodePng(floodTile.png)
    } catch {
        return null
    }

    const floodQ100 = isCenterOpaque(floodImg)
    const g = gammaF(fault.distanceM)

    return {
        faultDistanceM: fault.distanceM === null ? null : Math.round(fault.distanceM),
        gammaF: g,
        floodQ100,
        suggestedR: suggestedR(g, floodQ100),
    }
}
