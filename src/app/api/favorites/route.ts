import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const favorites = await prisma.favorite.findMany({
            where: { userId: session.user.id as string },
            include: {
                listing: {
                    include: {
                        report: true,
                        user: { select: { id: true, name: true } },
                        _count: { select: { offers: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(favorites)
    } catch (error) {
        console.error('Favorites GET error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const { listingId } = await req.json()
        if (!listingId) {
            return NextResponse.json({ message: 'listingId gerekli.' }, { status: 400 })
        }

        const listing = await prisma.listing.findUnique({ where: { id: listingId } })
        if (!listing) {
            return NextResponse.json({ message: 'İlan bulunamadı.' }, { status: 404 })
        }

        const favorite = await prisma.favorite.upsert({
            where: { userId_listingId: { userId: session.user.id as string, listingId } },
            create: { userId: session.user.id as string, listingId },
            update: {},
        })

        return NextResponse.json(favorite, { status: 201 })
    } catch (error) {
        console.error('Favorites POST error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}
