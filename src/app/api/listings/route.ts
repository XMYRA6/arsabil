import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/plan";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildParcelSnapshot } from "@/lib/listing/parcelSnapshot";
import { buildRiskSnapshot } from "@/lib/risk/riskSnapshot";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const city = searchParams.get('city')
        const district = searchParams.get('district')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')

        const where: Record<string, unknown> = {
            status: 'APPROVED',
            isActive: true,
        }

        if (city) where.city = city
        if (district) where.district = district
        if (minPrice || maxPrice) {
            where.price = {
                ...(minPrice ? { gte: Number(minPrice) } : {}),
                ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            }
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                report: true,
                user: { select: { id: true, name: true, email: true } },
                offers: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(listings)
    } catch (error) {
        console.error('Listings fetch error:', error)
        return NextResponse.json({ message: 'İlanlar getirilemedi.' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 })
        }

        // Bu yol her kayitta TKGM'ye ve (koordinat varsa) uc adede kadar TUCBS
        // WMS karosuna gidiyor. Plan limiti kotayi sinirlar ama HIZI sinirlamaz;
        // dis servislere giden trafigin freni burasi.
        const rl = checkRateLimit(`listing-write:${session.user.id}`, RATE_LIMITS.WRITE)
        if (!rl.ok) {
            return NextResponse.json(
                { message: 'Çok fazla işlem yaptınız. Lütfen biraz bekleyin.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
            )
        }

        const limitCheck = await checkPlanLimit(session.user.id as string, 'listings')
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 })
        }

        const {
            reportId, city, district, notes,
            title, address, phone, description,
            price, landSizeSqm, zoning, titleDeed, photos,
            lat, lng,
        } = await req.json()
        // NOT: adaNo / parselNo / neighborhood / parcelAreaSqm / parcelQuality /
        // parcelGeometry / parcelVerifiedAt / parcelLookupStatus gövdeden OKUNMAZ.
        // Snapshot'ı yalnızca sunucu üretir — aksi halde "TKGM ile doğrulandı"
        // rozeti istemci tarafından taklit edilebilirdi.

        // reportId varsa sahipliği kontrol et
        if (reportId) {
            const report = await prisma.report.findFirst({
                where: { id: reportId, userId: session.user.id as string },
            })
            if (!report) {
                return NextResponse.json({ message: "Rapor bulunamadı veya size ait değil." }, { status: 404 })
            }
            const existing = await prisma.listing.findUnique({ where: { reportId } })
            if (existing) {
                return NextResponse.json({ message: "Bu rapor zaten ilanda." }, { status: 400 })
            }
        }

        const latNum = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null
        const lngNum = lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null
        // Paralel çalışır: ikisi de opsiyonel ve bağımsız, ardışık beklemek
        // ilan kaydını gereksiz yere uzatırdı (bkz. buildRiskSnapshot içindeki
        // 6 sn'lik toplam bütçe).
        const [parcelSnapshot, riskSnapshot] = await Promise.all([
            buildParcelSnapshot(latNum, lngNum),
            buildRiskSnapshot(latNum, lngNum),
        ])

        const listing = await prisma.listing.create({
            data: {
                userId: session.user.id as string,
                reportId: reportId || null,
                city: city || null,
                district: district || null,
                notes: notes || null,
                title: title || null,
                address: address || null,
                phone: phone || null,
                description: description || null,
                price: price ? Number(price) : null,
                landSizeSqm: landSizeSqm ? Number(landSizeSqm) : null,
                zoning: zoning || null,
                titleDeed: titleDeed || null,
                photos: photos || [],
                lat: latNum,
                lng: lngNum,
                ...parcelSnapshot,
                ...riskSnapshot,
                isActive: false,
                status: 'PENDING',
            },
        })

        return NextResponse.json(listing, { status: 201 })
    } catch (error) {
        console.error("Listing create error:", error)
        return NextResponse.json({ message: "İlan oluşturulurken hata oluştu." }, { status: 500 })
    }
}
