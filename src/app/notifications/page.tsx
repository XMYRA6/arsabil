"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getNotificationUrl } from '@/lib/notifications';
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

const IKON: Record<string, { tone: string; path: React.ReactNode }> = {
    MESAJ_VAR: { tone: 'iconBlue', path: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
    TEKLIF_GELDI: { tone: 'iconAmber', path: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></> },
    ILAN_ONAYLANDI: { tone: 'iconGreen', path: <path d="m5 12 5 5L20 7" /> },
    ILAN_REDDEDILDI: { tone: 'iconRed', path: <path d="M6 6l12 12M18 6 6 18" /> },
};
const VARSAYILAN_IKON = { tone: 'iconSage', path: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> };

/** "12 dk önce", "1 sa önce", "Dün", "2 gün önce"; bir haftadan eskiyse tarih. */
function goreceZaman(iso: string, simdi = Date.now()): string {
    const dk = Math.floor((simdi - new Date(iso).getTime()) / 60000);
    if (dk < 1) return 'Şimdi';
    if (dk < 60) return `${dk} dk önce`;
    const sa = Math.floor(dk / 60);
    if (sa < 24) return `${sa} sa önce`;
    const gun = Math.floor(sa / 24);
    if (gun === 1) return 'Dün';
    if (gun < 7) return `${gun} gün önce`;
    return new Date(iso).toLocaleDateString('tr-TR');
}

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
    if (error) return <StateCard text="Bildirimler yüklenemedi. Lütfen tekrar dene." alert />;

    return (
        <main className={styles.notificationsShell}>
            <header className={styles.heroCard}>
                <div>
                    <h1>Bildirimler</h1>
                    <p>Mesaj, teklif ve ilan durumlarını tek ekranda takip et.</p>
                </div>
                <div className={styles.heroSide}>
                    {unreadCount > 0 && <span className={styles.unreadMetric}>{unreadCount} okunmamış</span>}
                    {notifications.length > 0 && (
                        <button type="button" onClick={markAllRead} disabled={markingAll || unreadCount === 0} className={styles.markAllButton}>
                            Tümünü okundu yap
                        </button>
                    )}
                </div>
            </header>

            {notifications.length === 0 ? (
                <section className={styles.emptyCard}>
                    <h2>Bildirim yok</h2>
                    <p>Yeni mesajlar, teklifler ve ilan güncellemeleri burada görünecek.</p>
                </section>
            ) : (
                <section className={styles.notificationList} aria-label="Bildirim listesi">
                    {notifications.map(item => {
                        const href = getNotificationUrl(item.type, item.entityId || '');
                        const ikon = IKON[item.type] ?? VARSAYILAN_IKON;
                        const card = (
                            <article className={`${styles.notificationCard} ${item.read ? styles.notificationRead : styles.notificationUnread}`}>
                                <span className={`${styles.notificationIcon} ${styles[ikon.tone]}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ikon.path}</svg>
                                </span>
                                <div className={styles.notificationBody}>
                                    <h2>{item.title}</h2>
                                    <p>{item.body}</p>
                                </div>
                                <time className={styles.time}>{goreceZaman(item.createdAt)}</time>
                                {!item.read && (
                                    <button type="button" className={styles.markButton} aria-label="Okundu işaretle" onClick={(event) => { event.preventDefault(); void markRead(item.id); }}>
                                        <span className={styles.unreadDot} aria-hidden="true" />
                                        <span className={styles.markLabel}>Okundu</span>
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
