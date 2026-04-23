import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const [users, reports, listings, offers] = await Promise.all([
            prisma.user.count(),
            prisma.report.count(),
            prisma.listing.count({ where: { isActive: true } }),
            prisma.offer.count(),
        ]);

        return NextResponse.json({ users, reports, listings, offers });
    } catch (error) {
        console.error("Admin stats error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
