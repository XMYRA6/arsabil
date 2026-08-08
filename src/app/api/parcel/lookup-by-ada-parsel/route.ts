import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, RateLimitOptions, getClientIp } from '@/lib/rate-limit'
import { fetchParcelByAdaParsel } from '@/lib/tkgm/parcel'

// 7 hane, gercek bir Turkiye ada/parsel numarasindan cok daha fazlasini
// karsilar; TKGM'ye giden URL'in uzunlugunu sinirlar (bkz.
// ManualParcelEntryForm.tsx'teki ayni desen — iki taraf da senkron tutulmali).
const ADA_PARSEL_PATTERN = /^\d{1,7}$/

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    let rlKey: string
    let rlOpts: RateLimitOptions

    if (userId) {
        rlKey = `parcel-ada-parsel:${userId}`
        rlOpts = RATE_LIMITS.PARCEL_LOOKUP
    } else {
        const ip = getClientIp(req)
        rlKey = `parcel-ada-parsel:ip:${ip}`
        rlOpts = RATE_LIMITS.PARCEL_LOOKUP_ANON
    }

    const rl = checkRateLimit(rlKey, rlOpts)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla parsel sorgusu yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }

    const { searchParams } = new URL(req.url)
    const mahalleId = Number(searchParams.get('mahalleId'))
    const ada = searchParams.get('ada') ?? ''
    const parsel = searchParams.get('parsel') ?? ''

    if (!Number.isInteger(mahalleId) || mahalleId <= 0) {
        return NextResponse.json({ message: 'Geçersiz mahalle kimliği.' }, { status: 400 })
    }
    if (!ADA_PARSEL_PATTERN.test(ada) || !ADA_PARSEL_PATTERN.test(parsel)) {
        return NextResponse.json({ message: 'Geçersiz ada/parsel numarası.' }, { status: 400 })
    }

    const result = await fetchParcelByAdaParsel(mahalleId, ada, parsel)
    if (result.ok) {
        return NextResponse.json({ status: 'verified', parcel: result.parcel })
    }
    return NextResponse.json({ status: result.reason })
}
