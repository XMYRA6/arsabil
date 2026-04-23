import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const listings = await prisma.listing.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                report: { select: { title: true, minApartmentPrice: true, landShareRatio: true, totalApartments: true } },
                _count: { select: { offers: true } },
            },
        });
        return NextResponse.json({ listings });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ listings: [] });
    }
}

export async function PATCH(req: Request) {
    try {
        const { listingId, isActive } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        await prisma.listing.update({
            where: { id: listingId },
            data: { isActive },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { listingId } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        await prisma.listing.delete({ where: { id: listingId } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}
