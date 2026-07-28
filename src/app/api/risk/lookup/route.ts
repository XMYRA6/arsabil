import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { isWithinTurkey } from '@/lib/geo/turkeyBounds'
import { measureRisk } from '@/lib/risk/lookup'


export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined
    if (!userId) {
        return NextResponse.json({ message: 'Giriş yapmanız gerekiyor.' }, { status: 401 })
    }

    const rl = checkRateLimit(`risk:${userId}`, RATE_LIMITS.RISK_LOOKUP)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla risk sorgusu yaptınız. Lütfen biraz bekleyin.' },
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

    const risk = await measureRisk(lat, lng)
    if (!risk) return NextResponse.json({ status: 'unavailable' })
    return NextResponse.json({ status: 'ok', risk })
}
