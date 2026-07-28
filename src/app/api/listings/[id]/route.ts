import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { Prisma } from '@prisma/client'
import { buildParcelSnapshot } from '@/lib/listing/parcelSnapshot'
import { buildRiskSnapshot } from '@/lib/risk/riskSnapshot'

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                report: true,
                user: { select: { id: true, name: true, email: true, isVerified: true } },
                _count: { select: { offers: true } },
            },
        })

        if (!listing) {
            return NextResponse.json({ message: 'İlan bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(listing)
    } catch (error) {
        console.error('Listing GET error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    // PATCH koordinat degistiginde TKGM'ye ve uc adede kadar TUCBS WMS
    // karosuna gidiyor ve plan limitine de tabi degil; freni yoktu.
    const rl = checkRateLimit(`listing-write:${userId}`, RATE_LIMITS.WRITE)
    if (!rl.ok) {
        return NextResponse.json(
            { message: 'Çok fazla işlem yaptınız. Lütfen biraz bekleyin.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
        )
    }
    const { id } = await context.params

    try {
        const existing = await prisma.listing.findUnique({
            where: { id },
            select: { userId: true, lat: true, lng: true },
        })
        if (!existing) {
            return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })
        }
        if (existing.userId !== userId) {
            return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
        }

        const body = await req.json()
        const { title, address, phone, description, price, landSizeSqm, zoning, titleDeed, photos, city, district, reportId, lat, lng } = body
        // NOT: parsel alanları (adaNo, parselNo, neighborhood, parcelAreaSqm,
        // parcelQuality, parcelGeometry, parcelVerifiedAt, parcelLookupStatus)
        // gövdeden OKUNMAZ — snapshot'ı yalnızca sunucu üretir.

        const latNum = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null
        const lngNum = lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null

        // Snapshot yalnızca koordinat GERÇEKTEN değiştiyse yeniden üretilir.
        // Aksi halde her kaydetmede TKGM'ye gereksiz bir istek giderdi.
        const coordsChanged =
            latNum != null && lngNum != null &&
            (existing.lat !== latNum || existing.lng !== lngNum)

        // Paralel çalışır: ikisi de opsiyonel ve bağımsız, ardışık beklemek
        // ilan güncellemesini gereksiz yere uzatırdı (bkz. buildRiskSnapshot
        // içindeki 6 sn'lik toplam bütçe).
        // Tip `Record<string, unknown>` DEĞİL: o, snapshot alan adlarının
        // derleme zamanı kontrolünü siler ve yeniden adlandırılan bir alan
        // ancak Prisma çalışma zamanı hatasıyla ortaya çıkardı.
        let snapshotFields: Partial<Prisma.ListingUpdateInput> = {}
        if (coordsChanged) {
            const [parcelSnapshot, riskSnapshot] = await Promise.all([
                buildParcelSnapshot(latNum, lngNum),
                buildRiskSnapshot(latNum, lngNum),
            ])
            snapshotFields = { lat: latNum, lng: lngNum, ...parcelSnapshot, ...riskSnapshot }
        }

        const updated = await prisma.listing.update({
            where: { id },
            data: {
                ...(city !== undefined ? { city } : {}),
                ...(district !== undefined ? { district } : {}),
                ...(address !== undefined ? { address } : {}),
                ...(title !== undefined ? { title } : {}),
                ...(landSizeSqm !== undefined ? { landSizeSqm: landSizeSqm ? Number(landSizeSqm) : null } : {}),
                ...(price !== undefined ? { price: price ? Number(price) : null } : {}),
                ...(zoning !== undefined ? { zoning } : {}),
                ...(titleDeed !== undefined ? { titleDeed } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(photos !== undefined ? { photos } : {}),
                ...(reportId !== undefined ? { reportId: reportId || null } : {}),
                ...snapshotFields,
                status: 'PENDING',
                isActive: false,
            },
        })
        return NextResponse.json(updated)
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
