import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Kullanıcının projelerini listele
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const projects = await prisma.project.findMany({
            where: { userId: session.user.id },
            include: {
                scenarios: {
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { scenarios: true } },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ projects });
    } catch (error) {
        console.error("Projects list error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}

// POST — Yeni proje oluştur (opsiyonel olarak senaryo ile birlikte)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Yetkisiz." }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, scenario } = body;

        if (!name) {
            return NextResponse.json({ message: "Proje adı gereklidir." }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description: description || null,
                userId: session.user.id,
                ...(scenario ? {
                    scenarios: {
                        create: {
                            name: scenario.name || "Senaryo 1",
                            luxLevel: scenario.luxLevel,
                            apartmentSize: scenario.apartmentSize,
                            landShareRatio: scenario.landShareRatio,
                            totalApartments: scenario.totalApartments || null,
                            arsaAlani: scenario.arsaAlani || null,
                            riskLevel: scenario.riskLevel,
                            builderProfit: scenario.builderProfit,
                            iksaMode: scenario.iksaMode || "off",
                            iksaPercentage: scenario.iksaPercentage || 0,
                            iksaManualTL: scenario.iksaManualTL || 0,
                            marketPrice: scenario.marketPrice || 0,
                            fdTotal: scenario.fdTotal,
                            fdPerM2: scenario.fdPerM2,
                            mi: scenario.mi,
                            ma: scenario.ma,
                            totalCost: scenario.totalCost,
                            fa: scenario.fa || null,
                            fabirim: scenario.fabirim || null,
                            sdx: scenario.sdx || null,
                        }
                    }
                } : {}),
            },
            include: { scenarios: true },
        });

        return NextResponse.json({ message: "Proje oluşturuldu.", project });
    } catch (error) {
        console.error("Project create error:", error);
        return NextResponse.json({ message: "Hata oluştu." }, { status: 500 });
    }
}
