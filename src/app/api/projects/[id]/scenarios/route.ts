import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/plan";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const userId = session.user.id as string;

        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });
        if (!project) {
            return NextResponse.json({ message: "Proje bulunamadı." }, { status: 404 });
        }

        const limitCheck = await checkPlanLimit(userId, 'scenarios');
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 });
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
