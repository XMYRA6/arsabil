import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

// POST — Projeye senaryo ekle
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        // Projenin kullanıcıya ait olduğunu doğrula
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: session.user.id },
        });

        if (!project) {
            return NextResponse.json({ message: "Proje bulunamadı." }, { status: 404 });
        }

        const body = await req.json();

        const scenario = await prisma.scenario.create({
            data: {
                name: body.name || `Senaryo ${Date.now()}`,
                projectId,
                luxLevel: body.luxLevel,
                apartmentSize: body.apartmentSize,
                landShareRatio: body.landShareRatio,
                totalApartments: body.totalApartments || null,
                arsaAlani: body.arsaAlani || null,
                riskLevel: body.riskLevel,
                builderProfit: body.builderProfit,
                iksaMode: body.iksaMode || "off",
                iksaPercentage: body.iksaPercentage || 0,
                iksaManualTL: body.iksaManualTL || 0,
                marketPrice: body.marketPrice || 0,
                fdTotal: body.fdTotal,
                fdPerM2: body.fdPerM2,
                mi: body.mi,
                ma: body.ma,
                totalCost: body.totalCost,
                fa: body.fa || null,
                fabirim: body.fabirim || null,
                sdx: body.sdx || null,
            },
        });

        return NextResponse.json({ message: "Senaryo eklendi.", scenario });
    } catch (error) {
        console.error("Scenario create error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
