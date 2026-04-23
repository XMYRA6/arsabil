import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
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
