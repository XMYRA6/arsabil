"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconCalculator, IconHome, IconMessage, IconPin, IconUser } from '@/components/icons';
import { useKeyboardInset } from '@/components/mobile/useKeyboardInset';
import { TabBar } from './TabBar';

interface Conversation {
    unreadCount: number;
}

/** Alt cubugun HIC gosterilmedigi yollar (tam eslesme). */
export const BOTTOMNAV_HIDDEN_PATHS = ['/login', '/register'] as const;

/** Alt cubugun gizlendigi yol onekleri: sohbet, wizard, ilan detay. */
const HIDDEN_PREFIXES = ['/inbox/', '/listings/new', '/listing/'] as const;

const TABS = [
    { href: '/', label: 'Ana sayfa', icon: <IconHome size={22} /> },
    { href: '/hesapla', label: 'Hesapla', icon: <IconCalculator size={22} /> },
    { href: '/marketplace', label: 'Pazar', icon: <IconPin size={22} /> },
    { href: '/akif', label: 'Akif', icon: <IconMessage size={22} /> },
    { href: '/dashboard/profile', label: 'Profil', icon: <IconUser size={22} /> },
];

export function BottomNavbar() {
    const pathname = usePathname();
    const { status } = useSession();
    const [unreadTotal, setUnreadTotal] = useState(0);
    // iOS Safari'de arac cubugu kaydirmayla gizlenince gercek gorunur alan
    // genisler ama `bottom:0` eski (kucuk) viewport'a sabitlenmis kalir —
    // kullanici bulgusu: navbar altinda gereksiz bosluk (bkz.
    // useKeyboardInset.ts, negatif deger senaryosu).
    const viewportInset = useKeyboardInset();

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

    // Klavye açıkken alt menü gizlenir (yazma alanını kapatmasın).
    if (viewportInset > 80) return null;

    // Okunmamış mesaj/bildirim varsa Profil sekmesinde nokta (sayı değil).
    const hasUnread = status === 'authenticated' && unreadTotal > 0;
    const tabs = TABS.map(t => (t.href === '/dashboard/profile' ? { ...t, dot: hasUnread } : t));

    return <TabBar tabs={tabs} activeHref={pathname ?? '/'} />;
}
