import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession();
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
    }

    const userId = session.user.id as string;

    const [
        reportCount,
        activeListingCount,
        offerCount,
        unreadMessageCount,
        recentReports,
        recentMessages,
        recentOffers,
    ] = await Promise.all([
        prisma.report.count({ where: { userId } }),
        prisma.listing.count({ where: { userId, isActive: true } }),
        prisma.offer.count({ where: { listing: { userId } } }),
        prisma.message.count({ where: { receiverId: userId, read: false } }),
        prisma.report.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                title: true,
                createdAt: true,
                landShareRatio: true,
                minApartmentPrice: true,
            },
        }),
        prisma.message.findMany({
            where: { receiverId: userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                sender: { select: { id: true, name: true, image: true } },
            },
        }),
        prisma.offer.findMany({
            where: { listing: { userId } },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
                listing: { select: { id: true, title: true, city: true } },
                bidder: { select: { id: true, name: true } },
            },
        }),
    ]);

    return NextResponse.json({
        stats: { reportCount, activeListingCount, offerCount, unreadMessageCount },
        recentReports,
        recentMessages,
        recentOffers,
    });
}
