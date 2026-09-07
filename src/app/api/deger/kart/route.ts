import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { prisma } from '@/lib/prisma'
import { buildDegerCard, type DegerCardInput } from '@/lib/deger/card'
import { createAnonCardDeps } from '@/lib/deger/anonCardDeps'
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
      ...createAnonCardDeps(),
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
      findDistrictDemographics: async (il, ilce) => {
        if (!userId) return null
        try {
          return await prisma.districtDemographics.findUnique({
            where: { il_ilce: { il, ilce } },
            select: {
              dataYear: true,
              population: true,
              populationGrowthPerMille: true,
              medianAge: true,
              avgHouseholdSize: true,
            },
          })
        } catch {
          return null   // DistrictDemographics tablosu henüz migrate edilmemişse /deger'i düşürme
        }
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
