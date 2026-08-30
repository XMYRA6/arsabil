import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { fetchParcelByPoint, fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'
import { prisma } from '@/lib/prisma'
import { buildDegerCard, type DegerCardInput, type AreaStatRecord } from '@/lib/deger/card'

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
    },
    { memberView: !!userId },
  )

  if (!result.ok) {
    const status = result.reason === 'parcel_not_found' ? 404 : 503
    return NextResponse.json({ error: result.reason }, { status })
  }
  return NextResponse.json(result.card)
}
