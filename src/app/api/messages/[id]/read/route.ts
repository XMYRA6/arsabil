import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string
    const { id } = await context.params

    try {
        const message = await prisma.message.findUnique({
            where: { id },
            select: { receiverId: true },
        })
        if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        if (message.receiverId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.message.update({ where: { id }, data: { read: true } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
