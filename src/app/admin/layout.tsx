"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/dashboard');
    }, [status, session, router]);

    if (status === 'loading' || session?.user?.role !== 'ADMIN') {
        return <div className={styles.loading}>Yükleniyor...</div>;
    }

    const navItems = [
        { href: '/admin', label: 'Genel Bakış', icon: '📊' },
        { href: '/admin/listings', label: 'İlan Yönetimi', icon: '🏗️' },
        { href: '/admin/offers', label: 'Teklifler', icon: '📩' },
        { href: '/admin/analytics', label: 'Analitik', icon: '📈' },
        { href: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
        { href: '/admin/settings', label: 'Motor Ayarları', icon: '⚙️' },
        { href: '/admin/district-prices', label: 'İlçe Fiyatları', icon: '📍' },
    ];

    return (
        <div className={styles.adminShell}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>Admin Panel</h2>
                    <span className={styles.badge}>ADMIN</span>
                </div>
                <nav className={styles.sidebarNav}>
                    {navItems.map(item => {
                        const isActive = item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className={styles.sidebarFooter}>
                    <Link href="/" className={styles.backLink}>← Hesap Makinesine Dön</Link>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
