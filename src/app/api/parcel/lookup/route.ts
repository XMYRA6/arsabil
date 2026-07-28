import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { fetchParcelByPoint } from '@/lib/tkgm/parcel'


export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined
    if (!userId) {
        return NextResponse.json({ message: 'Giriş yapmanız gerekiyor.' }, { status: 401 })
    }

    const rl = checkRateLimit(`parcel:${userId}`, RATE_LIMITS.PARCEL_LOOKUP)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla parsel sorgusu yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))

    const valid = isWithinTurkey(lat, lng)

    if (!valid) {
        return NextResponse.json({ message: 'Geçersiz koordinat.' }, { status: 400 })
    }

    const result = await fetchParcelByPoint(lat, lng)
    if (result.ok) {
        return NextResponse.json({ status: 'verified', parcel: result.parcel })
    }
    return NextResponse.json({ status: result.reason })
}
