import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

        const parcelFields = coordsChanged
            ? { lat: latNum, lng: lngNum, ...(await buildParcelSnapshot(latNum, lngNum)), ...(await buildRiskSnapshot(latNum, lngNum)) }
            : {}

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
                ...parcelFields,
                status: 'PENDING',
                isActive: false,
            },
        })
        return NextResponse.json(updated)
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
