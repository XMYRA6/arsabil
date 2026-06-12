import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const settings = await prisma.globalSettings.findUnique({
            where: { id: "settings" }
        });

        if (!settings) {
            // Eğer henüz ayar yoksa varsayılanları döndür
            return NextResponse.json({
                excavationLowPercent: 0.01,
                excavationMediumPercent: 0.02
            });
        }

        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ message: "Ayarlar getirilemedi." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Güvenlik: Sadece Admin yetkisi olanlar değiştirebilir
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Yetkisiz erişim." }, { status: 403 });
        }

        const { excavationLowPercent, excavationMediumPercent, qualityStandard, qualityMedium, qualityLux, defaultUnitPrice } = await req.json();

        const updateData: Record<string, number> = {};
        if (excavationLowPercent !== undefined) updateData.excavationLowPercent = Number(excavationLowPercent);
        if (excavationMediumPercent !== undefined) updateData.excavationMediumPercent = Number(excavationMediumPercent);
        if (qualityStandard !== undefined) updateData.qualityStandard = Number(qualityStandard);
        if (qualityMedium !== undefined) updateData.qualityMedium = Number(qualityMedium);
        if (qualityLux !== undefined) updateData.qualityLux = Number(qualityLux);
        if (defaultUnitPrice !== undefined) updateData.defaultUnitPrice = Number(defaultUnitPrice);

        const settings = await prisma.globalSettings.upsert({
            where: { id: "settings" },
            update: updateData,
            create: {
                id: "settings",
                ...updateData,
            }
        });

        return NextResponse.json({ message: "Ayarlar güncellendi.", settings });
    } catch (error) {
        console.error("Ayar güncellenirken hata:", error);
        return NextResponse.json({ message: "Ayarlar güncellenirken hata oluştu." }, { status: 500 });
    }
}
