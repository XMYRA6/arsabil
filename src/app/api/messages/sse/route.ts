import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addClient, removeClient } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
    }
    const userId = session.user.id as string

    const stream = new ReadableStream({
        start(controller) {
            addClient(userId, controller)

            // Send initial conversation list on connect
            prisma.message.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }] },
                orderBy: { createdAt: 'desc' },
                include: {
                    sender:   { select: { id: true, name: true, image: true } },
                    receiver: { select: { id: true, name: true, image: true } },
                },
            }).then(messages => {
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

                try {
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'init', conversations: Array.from(map.values()) })}\n\n`
                    )
                } catch { /* client disconnected before init */ }
            }).catch(() => {})

            // Heartbeat to keep connection alive (comment lines don't trigger onmessage)
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(': heartbeat\n\n')
                } catch {
                    clearInterval(heartbeat)
                }
            }, 30000)

            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeat)
                removeClient(userId)
                try { controller.close() } catch { /* already closed */ }
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
        },
    })
}
