import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { content, reportId, senderId, receiverId } = await req.json();

        if (!content || !senderId || !receiverId) {
            return NextResponse.json({ success: false, error: 'Eksik parametre' }, { status: 400 });
        }

        const message = await prisma.message.create({
            data: {
                content,
                reportId,
                senderId,
                receiverId
            }
        });

        return NextResponse.json({ success: true, message }, { status: 201 });
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Kullanıcı ID gerekli' }, { status: 400 });
        }

        const messages = await prisma.message.findMany({
            where: {
                receiverId: userId
            },
            include: {
                sender: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}
