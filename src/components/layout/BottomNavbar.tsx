"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconBox, IconFile, IconHome, IconMessage, IconUser, type IconProps } from '@/components/icons';
import styles from './BottomNavbar.module.css';

interface Conversation {
    unreadCount: number;
}

/** Alt cubugun HIC gosterilmedigi yollar (tam eslesme). */
export const BOTTOMNAV_HIDDEN_PATHS = ['/login', '/register'] as const;

/** Alt cubugun gizlendigi yol onekleri: sohbet, wizard, ilan detay. */
const HIDDEN_PREFIXES = ['/inbox/', '/listings/new', '/listing/'] as const;

const TABS: { href: string; label: string; Icon: React.ComponentType<IconProps> }[] = [
    { href: '/marketplace', label: 'Pazar', Icon: IconBox },
    { href: '/dashboard/reports', label: 'Raporlar', Icon: IconFile },
    { href: '/', label: 'Ana sayfa', Icon: IconHome },
    { href: '/inbox', label: 'Mesajlar', Icon: IconMessage },
    { href: '/dashboard/profile', label: 'Profil', Icon: IconUser },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { status } = useSession();
    const [unreadTotal, setUnreadTotal] = useState(0);

    // Render-time reset (NOT inside useEffect, so react-hooks/set-state-in-effect
    // does not apply): when the session transitions away from 'authenticated'
    // (e.g. client-side logout in the same tab), unreadTotal must be zeroed
    // immediately so that a later re-authentication in the same tab can never
    // briefly display a stale count left over from the previous session.
    const [prevStatus, setPrevStatus] = useState(status);
    if (status !== prevStatus) {
        setPrevStatus(status);
        if (status !== 'authenticated') {
            setUnreadTotal(0);
        }
    }

    useEffect(() => {
        if (status !== 'authenticated') {
            return;
        }
        let cancelled = false;
        fetch('/api/messages')
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (cancelled || !data?.conversations) return;
                const total = (data.conversations as Conversation[]).reduce(
                    (sum, c) => sum + c.unreadCount, 0
                );
                setUnreadTotal(total);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [status, pathname]);

    const hidden =
        (BOTTOMNAV_HIDDEN_PATHS as readonly string[]).includes(pathname ?? '') ||
        HIDDEN_PREFIXES.some(p => (pathname ?? '').startsWith(p));
    if (hidden) return null;

    const showBadge = status === 'authenticated' && unreadTotal > 0;
    const unreadLabel = unreadTotal > 9 ? '9+' : String(unreadTotal);

    return (
        <nav className={styles.bottomNav}>
            {TABS.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`${styles.navItem} ${active ? styles.active : ''}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <span className={styles.iconWrap}>
                            <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                            {href === '/inbox' && showBadge && (
                                // Gorsel olarak yalnizca sayi; ekran okuyucuya
                                // ne oldugu soylenir. `role="status"` KULLANILMAZ:
                                // canli bolge her sayac degisiminde yeniden
                                // duyurur, `aria-label` tek basina yeterli.
                                <span className={styles.badge} aria-label={`${unreadTotal} okunmamış mesaj`}>
                                    {unreadLabel}
                                </span>
                            )}
                        </span>
                        <span className={styles.label}>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
