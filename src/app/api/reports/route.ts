import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPlanLimit } from '@/lib/plan';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim.' }, { status: 401 });
        }

        const userId = session.user.id as string;
        const limitCheck = await checkPlanLimit(userId, 'reports');
        if (!limitCheck.allowed) {
            return NextResponse.json({
                success: false,
                error: 'PLAN_LIMIT',
                message: limitCheck.reason,
                upgradeRequired: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
            }, { status: 403 });
        }

        const body = await req.json();

        const report = await prisma.report.create({
            data: {
                title: body.title || 'Yeni Arsa Hesaplama Raporu',
                totalApartments: body.totalApartments,
                apartmentSizeSqm: body.apartmentSizeSqm,
                luxLevelModifier: body.luxLevelModifier,
                landShareRatio: body.landShareRatio,
                minApartmentPrice: body.minApartmentPrice,
                landCost: body.landCost,
                userId,
            },
        });

        return NextResponse.json({ success: true, report }, { status: 201 });
    } catch (error) {
        console.error('Report creation error:', error);
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const reports = await prisma.report.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, reports });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
