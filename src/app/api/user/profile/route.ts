import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    const { bio, linkedin, website, emailPrefs } = await req.json()

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            bio: bio ?? undefined,
            linkedin: linkedin ?? undefined,
            website: website ?? undefined,
            ...(emailPrefs !== undefined ? { emailPrefs: JSON.stringify(emailPrefs) } : {}),
        },
        select: { id: true, name: true, bio: true, linkedin: true, website: true, isVerified: true },
    })

    return NextResponse.json(updated)
}
