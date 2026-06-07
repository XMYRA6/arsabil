import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const session = await getServerSession(authOptions)
    const isOwner = session?.user?.id === params.userId

    const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
            id: true,
            name: true,
            bio: true,
            linkedin: true,
            website: true,
            isVerified: true,
            createdAt: true,
            ...(isOwner ? { emailPrefs: true } : {}),
            reports: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, title: true, landShareRatio: true, createdAt: true },
            },
            listings: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, title: true, city: true, price: true, isActive: true, createdAt: true },
            },
        },
    })

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
}
