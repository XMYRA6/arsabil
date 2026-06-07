import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    _req: Request,
    { params }: { params: { userId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const currentUserId = session.user.id as string
    const { userId: otherId } = params

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: otherId },
                    { senderId: otherId, receiverId: currentUserId },
                ],
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, image: true } },
            },
        })

        // Bu konuşmayı okundu olarak işaretle
        await prisma.message.updateMany({
            where: { senderId: otherId, receiverId: currentUserId, read: false },
            data: { read: true },
        })

        return NextResponse.json({ messages })
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
