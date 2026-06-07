import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendEmail, buildMessageEmail, getEmailPrefs } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id as string

    try {
        const messages = await prisma.message.findMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }] },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                receiver: { select: { id: true, name: true, image: true } },
            },
        })

        // Konuşmalara grupla: her unique karşı kullanıcı bir konuşmadır
        const map = new Map<string, {
            otherUser: { id: string; name: string | null; image: string | null }
            lastMessage: string
            lastMessageAt: string
            unreadCount: number
        }>()

        for (const msg of messages) {
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender
            if (!map.has(otherUser.id)) {
                map.set(otherUser.id, {
                    otherUser,
                    lastMessage: msg.content,
                    lastMessageAt: msg.createdAt.toISOString(),
                    unreadCount: 0,
                })
            }
            if (msg.receiverId === userId && !msg.read) {
                map.get(otherUser.id)!.unreadCount += 1
            }
        }

        const conversations = Array.from(map.values())
        return NextResponse.json({ conversations })
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const senderId = session.user.id as string

    try {
        const { receiverId, content, reportId } = await req.json()
        if (!receiverId || !content?.trim()) {
            return NextResponse.json({ error: 'receiverId ve content zorunlu' }, { status: 400 })
        }

        const receiverUser = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { email: true },
        })
        const receiverEmail = receiverUser?.email ?? null

        const message = await prisma.message.create({
            data: { senderId, receiverId, content: content.trim(), reportId: reportId || null },
            include: { sender: { select: { id: true, name: true, image: true } } },
        })

        // Alıcıya bildirim oluştur (hata olursa sessizce geç)
        createNotification({
            userId: receiverId,
            type: 'MESAJ_VAR',
            title: 'Yeni mesaj',
            body: `${session.user.name || 'Biri'} size mesaj gönderdi`,
            entityId: senderId,
        }).catch(() => {})

        // Email trigger
        if (receiverEmail) {
            getEmailPrefs(receiverId).then(prefs => {
                if (!prefs.mesaj) return
                return sendEmail({
                    to: receiverEmail,
                    subject: 'Yeni Mesajınız Var — ArsaBil',
                    html: buildMessageEmail(session.user.name || 'Biri'),
                })
            }).catch(() => {})
        }

        return NextResponse.json({ success: true, message }, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
