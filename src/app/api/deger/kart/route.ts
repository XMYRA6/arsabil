import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { fetchParcelByPoint, fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { prisma } from '@/lib/prisma'
import { buildDegerCard, type DegerCardInput, type AreaStatRecord } from '@/lib/deger/card'
import { ARSA_LISTING_TYPES } from '@/lib/areaPrices/aggregate'
import { normalizeAreaName } from '@/lib/areaPrices/normalizeAreaName'
import type { ComparableListing } from '@/lib/deger/comparables'
import type { TrendRow } from '@/lib/deger/priceTrend'

const NUM_PATTERN = /^\d{1,7}$/

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined

  const rlKey = userId ? `deger:${userId}` : `deger:ip:${getClientIp(req)}`
  const rlOpts = userId ? RATE_LIMITS.DEGER_KART : RATE_LIMITS.DEGER_KART_ANON
  const rl = checkRateLimit(rlKey, rlOpts)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const latRaw = searchParams.get('lat')
  const lngRaw = searchParams.get('lng')
  const mahalleIdRaw = searchParams.get('mahalleId')
  const ada = searchParams.get('ada')
  const parsel = searchParams.get('parsel')

  let input: DegerCardInput
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!isWithinTurkey(lat, lng)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    input = { kind: 'point', lat, lng }
  } else if (mahalleIdRaw != null && ada != null && parsel != null) {
    const mahalleId = Number(mahalleIdRaw)
    if (!Number.isFinite(mahalleId) || mahalleId <= 0 || !NUM_PATTERN.test(ada) || !NUM_PATTERN.test(parsel)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    input = { kind: 'adaParsel', mahalleId, ada, parsel }
  } else {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const result = await buildDegerCard(
    input,
    {
      fetchParcelByPoint,
      fetchParcelByAdaParsel,
      buildRiskSnapshot,
      findAreaStats: async (il, ilce, mahalle): Promise<AreaStatRecord[]> => {
        const rows = await prisma.areaPriceStat.findMany({
          where: {
            il,
            OR: [
              { ilce: null, mahalle: null },
              { ilce, mahalle: null },
              { ilce, mahalle },
            ],
          },
          select: { scope: true, medianPricePerSqm: true, p25: true, p75: true, sampleCount: true },
        })
        return rows as AreaStatRecord[]
      },
      findAreaTrend: async (il, ilce, mahalle): Promise<TrendRow[]> => {
        // Trend yalnızca üyeye gösterilir; anonim çağrıda sorguyu hiç açma.
        if (!userId) return []
        try {
          const windowStart = new Date()
          windowStart.setUTCMonth(windowStart.getUTCMonth() - 11, 1)
          windowStart.setUTCHours(0, 0, 0, 0)
          const rows = await prisma.areaPriceTrend.findMany({
            where: {
              il,
              monthBucket: { gte: windowStart },
              OR: [
                { ilce: null, mahalle: null },
                { ilce, mahalle: null },
                { ilce, mahalle },
              ],
            },
            select: { scope: true, monthBucket: true, medianPricePerSqm: true, sampleCount: true },
          })
          return rows as TrendRow[]
        } catch {
          // AreaPriceTrend tablosu henüz migrate edilmemişse /deger'i düşürme.
          return []
        }
      },
      findListingsNear: async (il, ilce): Promise<ComparableListing[]> => {
        // il/ilce anahtar-uzayı uyuşmazlığı: card.ts buraya `normalizeAreaName`
        // ile katlanmış anahtar geçirir ('ORTAHISAR', noktasız I) ama crawler
        // `cleanTrName` ile `.toLocaleUpperCase('tr-TR')` yazar ('ORTAHİSAR',
        // noktalı İ). SQL eşitliği i/İ içeren her ilçede sessizce ıskalar →
        // uygulama katmanında katlanmış değere göre filtrele.
        const rows = await prisma.marketListing.findMany({
          where: {
            status: 'active',
            lat: { not: null },
            lng: { not: null },
            listingType: { in: [...ARSA_LISTING_TYPES] },
          },
          select: {
            id: true, pricePerSqm: true, areaSqm: true, price: true,
            lat: true, lng: true, geoPrecision: true, listedAt: true,
            source: true, sourceUrl: true, listingType: true,
            il: true, ilce: true,
          },
          orderBy: [{ listedAt: 'desc' }, { id: 'asc' }],
          take: 2000,
        })
        return rows.filter(
          (r) =>
            r.il != null && r.ilce != null &&
            normalizeAreaName(r.il) === il && normalizeAreaName(r.ilce) === ilce,
        ) as unknown as ComparableListing[]
      },
      findNeighborhood: async (il, ilce, mahalle) => {
        const row = await prisma.neighborhood.findUnique({
          where: { il_ilce_mahalle: { il, ilce, mahalle } },
          select: { geojson: true },
        })
        return row ? { geojson: row.geojson as unknown } : null
      },
    },
    { memberView: !!userId },
  )

  if (!result.ok) {
    const status = result.reason === 'parcel_not_found' ? 404 : 503
    return NextResponse.json({ error: result.reason }, { status })
  }
  return NextResponse.json(result.card)
}
