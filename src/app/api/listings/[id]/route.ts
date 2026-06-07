import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
