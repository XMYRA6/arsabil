import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 403 });
        }

        const offers = await prisma.offer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                bidder: { select: { name: true, email: true } },
                listing: {
                    select: {
                        id: true,
                        city: true,
                        district: true,
                        report: { select: { title: true } },
                    },
                },
            },
        });
        return NextResponse.json({ offers });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ offers: [] });
    }
}
