import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const userId = session.user.id;

        // Kullanıcının Raporları
        const reports = await prisma.report.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: { listing: true } // İlan durumunu görmek için
        });

        // Kullanıcının oluşturduğu İlanlar ve gelen teklifleri
        const myListings = await prisma.listing.findMany({
            where: { userId },
            include: { offers: { include: { bidder: { select: { name: true, email: true } } } }, report: true },
            orderBy: { createdAt: "desc" }
        });

        // Kullanıcının başkalarının ilanlarına yaptığı Teklifler
        const myOffers = await prisma.offer.findMany({
            where: { bidderId: userId },
            include: { listing: { include: { report: true, user: { select: { name: true } } } } },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({
            reports,
            myListings,
            myOffers
        });
    } catch (error) {
        console.error("Dashboard data fetch error:", error);
        return NextResponse.json({ message: "Dashboard verileri getirilemedi." }, { status: 500 });
    }
}
