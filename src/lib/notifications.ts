import { prisma } from './prisma'

export type NotificationType = 'MESAJ_VAR' | 'TEKLIF_GELDI' | 'ILAN_ONAYLANDI'

export function getNotificationUrl(type: string, entityId: string): string {
    if (!entityId) return ''
    if (type === 'MESAJ_VAR') return `/inbox?with=${entityId}`
    if (type === 'TEKLIF_GELDI') return `/listing/${entityId}`
    if (type === 'ILAN_ONAYLANDI') return `/listing/${entityId}`
    return ''
}

export function getNotificationIcon(type: string): string {
    if (type === 'MESAJ_VAR') return '💬'
    if (type === 'TEKLIF_GELDI') return '🏷️'
    if (type === 'ILAN_ONAYLANDI') return '✅'
    return '🔔'
}

export async function createNotification(params: {
    userId: string
    type: NotificationType
    title: string
    body: string
    entityId?: string
}): Promise<void> {
    await prisma.notification.create({
        data: {
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            entityId: params.entityId ?? null,
            read: false,
        },
    })
}
