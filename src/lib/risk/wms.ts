import { PNG } from 'pngjs'
import type { BBox, RGBAImage } from './types'

/**
 * TUCBS (Ulusal Coğrafi Bilgi Platformu) GeoServer'ı.
 * Yalnızca sunucudan çağrılır — WAF tarayıcı UA'sı istiyor, CORS başlığı yok
 * ve kullanıcı IP'si devlet servisine açılmamalı.
 *
 * ÖLÇÜLDÜ (2026-07-28): bu servis yalnızca GetMap ve GetCapabilities'e izin
 * veriyor; GetFeatureInfo ve WFS 406 dönüyor. Bu yüzden mesafe/bölge bilgisi
 * raster örnekleme ile elde ediliyor.
 */
export const WMS_BASE = 'https://ucbp-app8.tucbs.gov.tr/geoserver/tucbs/wms'

export const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const TIMEOUT_MS = 8000

export type WmsLayer = 'diri_fay' | 'taskin_tehlike_haritasi_q100'
export type WmsResult = { ok: true; png: Buffer } | { ok: false; reason: 'unavailable' }

/**
 * WMS GetMap parametrelerinin TEK üretim noktası. `service`, `version`
 * (1.1.1 — 1.3.0 KULLANMA, EPSG:4326'da eksen sırasını lat,lon'a çevirir),
 * `request`, `styles`, `format`, `transparent` ve `srs` burada sabitlenir.
 * Hem `buildWmsUrl` (BBox nesnesi alır) hem de tiles route'u (Leaflet'ten
 * gelen, zaten doğrulanmış bbox string'ini alır) bu fonksiyondan geçer —
 * version pini iki ayrı dosyada tekrarlanmasın diye.
 */
export function buildWmsParams(layer: string, bboxStr: string, width: number, height: number): URLSearchParams {
    return new URLSearchParams({
        service: 'WMS',
        version: '1.1.1',
        request: 'GetMap',
        layers: layer,
        styles: '',
        bbox: bboxStr,
        width: String(width),
        height: String(height),
        srs: 'EPSG:4326',
        format: 'image/png',
        transparent: 'true',
    })
}

export function buildWmsUrl(layer: string, bbox: BBox, width: number, height: number): string {
    const bboxStr = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
    return `${WMS_BASE}?${buildWmsParams(layer, bboxStr, width, height).toString()}`
}

/** Asla throw etmez — risk verisi opsiyoneldir. */
export async function fetchWmsTile(layer: WmsLayer, bbox: BBox, sizePx: number): Promise<WmsResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(buildWmsUrl(layer, bbox, sizePx, sizePx), {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, Accept: 'image/png,*/*' },
        })
        if (!res.ok) return { ok: false, reason: 'unavailable' }

        // WMS hatayı 200 + ServiceExceptionReport XML olarak da döndürebilir.
        const type = res.headers.get('content-type') ?? ''
        if (!type.includes('image/png')) return { ok: false, reason: 'unavailable' }

        return { ok: true, png: Buffer.from(await res.arrayBuffer()) }
    } catch {
        return { ok: false, reason: 'unavailable' }
    } finally {
        clearTimeout(timer)
    }
}

export function decodePng(buf: Buffer): RGBAImage {
    const png = PNG.sync.read(buf)
    return { width: png.width, height: png.height, data: png.data }
}
