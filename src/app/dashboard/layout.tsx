"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    if (status === 'loading') {
        return <div className={styles.loading}>Yükleniyor...</div>;
    }

    if (!session) return null;

    const getInitials = () => {
        if (!session.user?.name) return "US";
        const parts = session.user.name.trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    const navItems = [
        { href: '/dashboard', label: 'Genel Bakış', icon: '📊' },
        { href: '/dashboard/profile', label: 'Profilim', icon: '👤' },
        { href: '/dashboard/reports', label: 'Raporlarım', icon: '📄' },
        { href: '/dashboard/projects', label: 'Projelerim', icon: '📁' },
    ];

    return (
        <div className={styles.dashShell}>
            <aside className={styles.sidebar}>
                {/* User Profile Card */}
                <div className={styles.profileCard}>
                    <div className={styles.avatar}>{getInitials()}</div>
                    <div className={styles.profileInfo}>
                        <h3>{session.user.name || 'Kullanıcı'}</h3>
                        <span>{session.user.email}</span>
                    </div>
                </div>

                <nav className={styles.sidebarNav}>
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link href="/" className={styles.backLink}>← Hesap Makinesine Dön</Link>
                    <button onClick={() => signOut()} className={styles.logoutBtn}>Çıkış Yap</button>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
