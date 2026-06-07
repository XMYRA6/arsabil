import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const notif = await prisma.notification.findUnique({
        where: { id: params.id },
        select: { userId: true },
    })
    if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (notif.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.notification.update({ where: { id: params.id }, data: { read: true } })
    return NextResponse.json({ ok: true })
}
