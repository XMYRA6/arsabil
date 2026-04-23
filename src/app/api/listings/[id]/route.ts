import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                report: true,
                user: { select: { id: true, name: true, image: true } },
                offers: {
                    include: { bidder: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!listing) {
            return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
        }

        return NextResponse.json(listing);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
