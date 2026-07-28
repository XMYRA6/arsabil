import type { BBox, RGBAImage } from './types'

/**
 * Anti-aliasing saçağı eşiği. TUCBS rasterlarında ölçülen kenar pikselleri
 * alpha=1..24 aralığında geliyor; `alpha > 0` testi sahte yakınlık üretir.
 */
export const ALPHA_THRESHOLD = 64

const M_PER_DEG_LAT = 111320

/** Kutu KENARINI piksel sayısına böler — yarıçapı değil. */
export function metersPerPixel(radiusM: number, sizePx: number): number {
    return (2 * radiusM) / sizePx
}

export function bboxAround(lat: number, lng: number, radiusM: number): BBox {
    const dLat = radiusM / M_PER_DEG_LAT
    const dLon = radiusM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180))
    return { minLon: lng - dLon, minLat: lat - dLat, maxLon: lng + dLon, maxLat: lat + dLat }
}

function alphaAt(img: RGBAImage, x: number, y: number): number {
    return img.data[(y * img.width + x) * 4 + 3]
}

/** Merkezden en yakın opak piksele uzaklık (px). Opak piksel yoksa null. */
export function nearestOpaquePixelPx(img: RGBAImage): number | null {
    const cx = (img.width - 1) / 2
    const cy = (img.height - 1) / 2
    let best: number | null = null

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            if (alphaAt(img, x, y) <= ALPHA_THRESHOLD) continue
            const d = Math.hypot(x - cx, y - cy)
            if (best === null || d < best) best = d
        }
    }
    return best
}

export function isCenterOpaque(img: RGBAImage): boolean {
    const cx = Math.floor((img.width - 1) / 2)
    const cy = Math.floor((img.height - 1) / 2)
    return alphaAt(img, cx, cy) > ALPHA_THRESHOLD
}
