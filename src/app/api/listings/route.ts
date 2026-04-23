import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const listings = await prisma.listing.findMany({
            where: { isActive: true },
            include: {
                report: true,
                user: { select: { id: true, name: true, email: true } },
                offers: true
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(listings);
    } catch (error) {
        console.error("Listings fetch error:", error);
        return NextResponse.json({ message: "İlanlar getirilemedi." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { reportId, city, district, notes } = await req.json();

        if (!reportId) {
            return NextResponse.json({ message: "Rapor ID zorunludur." }, { status: 400 });
        }

        // Check if report belongs to user
        const report = await prisma.report.findFirst({
            where: { id: reportId, userId: session.user.id }
        });

        if (!report) {
            return NextResponse.json({ message: "Rapor bulunamadı veya size ait değil." }, { status: 404 });
        }

        // Check if already listed
        const existingListing = await prisma.listing.findUnique({
            where: { reportId }
        });

        if (existingListing) {
            return NextResponse.json({ message: "Bu rapor zaten ilanda." }, { status: 400 });
        }

        const listing = await prisma.listing.create({
            data: {
                reportId,
                userId: session.user.id,
                city,
                district,
                notes,
                isActive: true
            }
        });

        return NextResponse.json({ message: "İlan başarıyla oluşturuldu.", listing }, { status: 201 });
    } catch (error) {
        console.error("Listing create error:", error);
        return NextResponse.json({ message: "İlan oluşturulurken hata oluştu." }, { status: 500 });
    }
}
