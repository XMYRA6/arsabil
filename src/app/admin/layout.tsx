"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminTopBar } from '@/components/layout/AdminTopBar';
import styles from './admin.module.css';

const IKON: Record<string, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};

const NAV_ITEMS = [
    { href: '/admin', label: 'Genel bakış', ikon: 'home' },
    { href: '/admin/users', label: 'Kullanıcılar', ikon: 'user' },
    { href: '/admin/listings', label: 'İlanlar', ikon: 'building' },
    { href: '/admin/offers', label: 'Teklifler', ikon: 'mail' },
    { href: '/admin/district-prices', label: 'İlçe fiyatları', ikon: 'pin' },
    { href: '/admin/analytics', label: 'Analitik', ikon: 'layers' },
    { href: '/admin/settings', label: 'Motor ayarları', ikon: 'settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/dashboard');
    }, [status, session, router]);

    if (status === 'loading' || session?.user?.role !== 'ADMIN') {
        return (
            <>
                <AdminTopBar />
                <div className={styles.loading}>Yükleniyor...</div>
            </>
        );
    }

    return (
        <>
            <AdminTopBar />
            <div className={styles.adminShell}>
                <aside className={styles.sidebar}>
                    <nav className={styles.sidebarNav} aria-label="Yönetim menüsü">
                        {NAV_ITEMS.map(item => {
                            const isActive = item.href === '/admin'
                                ? pathname === '/admin'
                                : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{IKON[item.ikon]}</svg>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>
        </>
    );
}
