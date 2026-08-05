import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchIlListesi } from '@/lib/tkgm/idariYapi'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `tkgm-idari:${userId}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI
    } else {
        const ip = getClientIp(req)
        rlKey = `tkgm-idari:ip:${ip}`
        rlOpts = RATE_LIMITS.TKGM_IDARI_YAPI_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla istek yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const iller = await fetchIlListesi()
    return NextResponse.json({ iller })
}
