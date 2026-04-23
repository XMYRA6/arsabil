import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Geçici olarak mock bir kullanıcı oluştur/bul (MVP için Auth olmadan)
        let user = await prisma.user.findFirst({
            where: { email: 'test@arsabil.com' }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: 'test@arsabil.com',
                    name: 'Test Kullanıcısı',
                    role: 'USER'
                }
            });
        }

        const report = await prisma.report.create({
            data: {
                title: body.title || 'Yeni Arsa Hesaplama Raporu',
                totalApartments: body.totalApartments,
                apartmentSizeSqm: body.apartmentSizeSqm,
                luxLevelModifier: body.luxLevelModifier,
                landShareRatio: body.landShareRatio,
                minApartmentPrice: body.minApartmentPrice,
                landCost: body.landCost,
                userId: user.id
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
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
