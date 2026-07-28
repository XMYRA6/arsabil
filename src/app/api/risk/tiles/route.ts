import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { BROWSER_UA, TIMEOUT_MS, WMS_BASE, buildWmsParams } from '@/lib/risk/wms'

/**
 * Leaflet'in `L.tileLayer.wms`'i standart WMS parametrelerini kendisi üretir:
 * layers (ÇOĞUL), bbox, width, height, srs, format, transparent, service,
 * request, version. Bu route o adları aynen kabul eder.
 *
 * Açık proxy olmaması için katman beyaz listeye karşı doğrulanır.
 */
const ALLOWED_LAYERS = new Set(['diri_fay', 'taskin_tehlike_haritasi_q100'])
const MAX_SIZE = 512

export async function GET(req: Request) {
    const rl = checkRateLimit(`risktiles:${getClientIp(req)}`, RATE_LIMITS.RISK_TILES)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla harita isteği.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const layers = searchParams.get('layers') ?? ''
    const bbox = searchParams.get('bbox') ?? ''
    const width = Number(searchParams.get('width'))
    const height = Number(searchParams.get('height'))
    const srs = searchParams.get('srs') ?? ''

    const valid =
        ALLOWED_LAYERS.has(layers) &&                       // virgüllü çoklu katman burada elenir
        srs === 'EPSG:4326' &&                              // TUCBS başka CRS ilan etmiyor
        /^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(bbox) &&
        Number.isFinite(width) && width > 0 && width <= MAX_SIZE &&
        Number.isFinite(height) && height > 0 && height <= MAX_SIZE

    if (!valid) {
        return NextResponse.json({ message: 'Geçersiz katman isteği.' }, { status: 400 })
    }

    // Çıkış WMS parametreleri (service/version/request/styles/format/transparent/srs)
    // TEK yerde üretilir — bkz. @/lib/risk/wms#buildWmsParams. version pini burada
    // yinelenmez, o yüzden 1.1.1 taahhüdü iki dosyada senkron kalmak zorunda değil.
    const params = buildWmsParams(layers, bbox, width, height)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const upstream = await fetch(`${WMS_BASE}?${params.toString()}`, {
            signal: controller.signal,
            headers: { 'User-Agent': BROWSER_UA, Accept: 'image/png,*/*' },
        })
        if (!upstream.ok) return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })

        const type = upstream.headers.get('content-type') ?? ''
        if (!type.includes('image/png')) {
            return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })
        }

        return new NextResponse(await upstream.arrayBuffer(), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                // Fay hatları günlük değişmez; TUCBS'i yormayalım.
                'Cache-Control': 'public, max-age=86400',
            },
        })
    } catch {
        return NextResponse.json({ message: 'Katman alınamadı.' }, { status: 502 })
    } finally {
        clearTimeout(timer)
    }
}
