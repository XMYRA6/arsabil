import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 403 });
        }
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
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 403 });
        }
        const { listingId, isActive, action } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        if (action === 'approve') {
            const listing = await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'APPROVED', isActive: true },
                include: { user: { select: { id: true, name: true } } },
            });
            createNotification({
                type: 'ILAN_ONAYLANDI',
                userId: listing.user.id,
                title: 'İlanınız Onaylandı',
                body: `"${listing.title ?? 'İlanınız'}" pazar yerine eklendi.`,
                entityId: listing.id,
            }).catch(() => {});
            return NextResponse.json({ ok: true });
        }

        if (action === 'reject') {
            await prisma.listing.update({
                where: { id: listingId },
                data: { status: 'REJECTED', isActive: false },
            });
            return NextResponse.json({ ok: true });
        }

        // Legacy: toggle isActive
        if (isActive !== undefined) {
            await prisma.listing.update({
                where: { id: listingId },
                data: { isActive },
            });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ message: 'action veya isActive gerekli' }, { status: 400 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 403 });
        }
        const { listingId } = await req.json();
        if (!listingId) return NextResponse.json({ message: 'listingId gerekli' }, { status: 400 });

        await prisma.listing.delete({ where: { id: listingId } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ message: 'Hata oluştu' }, { status: 500 });
    }
}
