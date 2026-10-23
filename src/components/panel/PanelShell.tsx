"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './PanelShell.module.css';

type Ikon = 'home' | 'file' | 'layers' | 'heart' | 'building' | 'chat' | 'mail' | 'info' | 'user' | 'settings';

const IKONLAR: Record<Ikon, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
    heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
    building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};

const NAV: { href: string; label: string; ikon: Ikon; rozet?: 'mesaj' | 'bildirim' }[] = [
    { href: '/dashboard', label: 'Dashboard', ikon: 'home' },
    { href: '/dashboard/reports', label: 'Raporlarım', ikon: 'file' },
    { href: '/dashboard/projects', label: 'Projelerim', ikon: 'layers' },
    { href: '/dashboard/favorites', label: 'Favorilerim', ikon: 'heart' },
    { href: '/dashboard/listings', label: 'İlanlarım', ikon: 'building' },
    { href: '/dashboard/akif-projeler', label: 'Akif projeleri', ikon: 'chat' },
    { href: '/inbox', label: 'Mesajlar', ikon: 'mail', rozet: 'mesaj' },
    { href: '/notifications', label: 'Bildirimler', ikon: 'info', rozet: 'bildirim' },
    { href: '/dashboard/profile', label: 'Profil', ikon: 'user' },
    { href: '/dashboard/settings', label: 'Ayarlar', ikon: 'settings' },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [rozetler, setRozetler] = useState<{ mesaj: number; bildirim: number }>({ mesaj: 0, bildirim: 0 });

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    // Yan menü rozetleri: okunmamış mesaj ve bildirim sayısı (best-effort; hata olursa rozet gösterilmez).
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/user/dashboard')
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d?.stats) setRozetler(p => ({ ...p, mesaj: d.stats.unreadMessageCount ?? 0 })); })
            .catch(() => {});
        fetch('/api/notifications')
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (Array.isArray(d?.notifications)) {
                    setRozetler(p => ({ ...p, bildirim: d.notifications.filter((n: { read: boolean }) => !n.read).length }));
                }
            })
            .catch(() => {});
    }, [status]);

    if (status === 'loading') {
        return <div className={styles.loading}>Yükleniyor...</div>;
    }

    if (!session) return null;

    const aktifMi = (href: string) => (href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar} aria-label="Panel menüsü">
                <nav className={styles.nav}>
                    {NAV.map(item => {
                        const sayi = item.rozet ? rozetler[item.rozet] : 0;
                        const aktif = aktifMi(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={aktif ? 'page' : undefined}
                                className={`${styles.navItem} ${aktif ? styles.navItemActive : ''}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    {IKONLAR[item.ikon]}
                                </svg>
                                <span className={styles.navLabel}>{item.label}</span>
                                {sayi > 0 && <span className={styles.rozet} aria-label={`${sayi} okunmamış`}>{sayi}</span>}
                            </Link>
                        );
                    })}
                </nav>
                <button type="button" onClick={() => signOut()} className={styles.logout}>Çıkış yap</button>
            </aside>
            <div className={styles.content}>{children}</div>
        </div>
    );
}
