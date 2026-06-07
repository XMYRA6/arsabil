import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ listingId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Yetkisiz.' }, { status: 401 })
        }

        const { listingId } = await context.params

        await prisma.favorite.deleteMany({
            where: {
                userId: session.user.id as string,
                listingId,
            },
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Favorites DELETE error:', error)
        return NextResponse.json({ message: 'Sunucu hatası.' }, { status: 500 })
    }
}
