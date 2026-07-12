"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import styles from './AdminTopBar.module.css';

export function AdminTopBar() {
    const { data: session } = useSession();

    return (
        <header className={styles.topBar}>
            <div className={styles.left}>
                <span className={styles.sealDot} aria-hidden="true" />
                <span className={styles.wordmark}>
                    ArsaBil <span className={styles.wordmarkMuted}>— Yönetim</span>
                </span>
            </div>
            <div className={styles.right}>
                <span className={styles.adminName}>{session?.user?.name || 'Yönetici'}</span>
                <span className={styles.badge}>ADMIN</span>
                <ThemeToggle forceDarkSurface />
                <Link href="/dashboard" className={styles.backLink}>← Müşteri Paneline Dön</Link>
            </div>
        </header>
    );
}
