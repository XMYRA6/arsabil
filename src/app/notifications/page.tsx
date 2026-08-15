"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getNotificationIcon, getNotificationUrl } from '@/lib/notifications';
import styles from './page.module.css';

type NotificationItem = {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    entityId: string | null;
    createdAt: string;
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        fetch('/api/notifications')
            .then(res => {
                if (!res.ok) throw new Error('notifications fetch failed');
                return res.json();
            })
            .then(data => setNotifications(data.notifications || []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);

    const markRead = async (id: string) => {
        setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    };

    const markAllRead = async () => {
        setMarkingAll(true);
        setNotifications(prev => prev.map(item => ({ ...item, read: true })));
        try {
            await fetch('/api/notifications', { method: 'PATCH' });
        } finally {
            setMarkingAll(false);
        }
    };

    if (loading) return <StateCard text="Bildirimler yükleniyor..." />;
    if (error) return <StateCard text="Bildirimler yüklenemedi. Lütfen tekrar deneyin." alert />;

    return (
        <main className={styles.notificationsShell}>
            <header className={styles.heroCard}>
                <div>
                    <p className={styles.eyebrow}>Bildirimler</p>
                    <h1>Güncel akış</h1>
                    <p>Mesaj, teklif ve ilan durumlarını tek sakin ekranda takip et.</p>
                </div>
                <div className={styles.unreadMetric}>
                    <strong>{unreadCount}</strong>
                    <span>Okunmamış</span>
                </div>
            </header>

            {notifications.length > 0 && (
                <div className={styles.actionRow}>
                    <button type="button" onClick={markAllRead} disabled={markingAll || unreadCount === 0} className={styles.markAllButton}>
                        Tümünü okundu yap
                    </button>
                </div>
            )}

            {notifications.length === 0 ? (
                <section className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>N</span>
                    <h2>Bildirim yok</h2>
                    <p>Yeni mesajlar, teklifler ve ilan güncellemeleri burada görünecek.</p>
                </section>
            ) : (
                <section className={styles.notificationList} aria-label="Bildirim listesi">
                    {notifications.map(item => {
                        const href = getNotificationUrl(item.type, item.entityId || '');
                        const card = (
                            <article className={`${styles.notificationCard} ${item.read ? styles.notificationRead : styles.notificationUnread}`}>
                                <span className={styles.notificationIcon}>{getNotificationIcon(item.type)}</span>
                                <div className={styles.notificationBody}>
                                    <div className={styles.notificationTopline}>
                                        <h2>{item.title}</h2>
                                        {!item.read && <span className={styles.unreadDot}>Yeni</span>}
                                    </div>
                                    <p>{item.body}</p>
                                    <time>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</time>
                                </div>
                                {!item.read && (
                                    <button type="button" className={styles.markButton} onClick={(event) => { event.preventDefault(); void markRead(item.id); }}>
                                        Okundu
                                    </button>
                                )}
                            </article>
                        );
                        return href ? <Link key={item.id} href={href} className={styles.cardLink}>{card}</Link> : <div key={item.id}>{card}</div>;
                    })}
                </section>
            )}
        </main>
    );
}

function StateCard({ text, alert = false }: { text: string; alert?: boolean }) {
    return (
        <main className={styles.notificationsShell}>
            <section className={styles.emptyCard} role={alert ? 'alert' : undefined} aria-live={alert ? undefined : 'polite'}>
                <p>{text}</p>
            </section>
        </main>
    );
}