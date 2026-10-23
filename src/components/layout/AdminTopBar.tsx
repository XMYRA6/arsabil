"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './AdminTopBar.module.css';

export function AdminTopBar() {
    const { data: session } = useSession();
    const ad = session?.user?.name || 'Yönetici';
    const basHarf = ad.trim().slice(0, 2).toUpperCase();

    return (
        <header className={styles.topBar}>
            <div className={styles.left}>
                <Link href="/admin" className={styles.brand} aria-label="ArsaBil Yönetim">
                    <span className={styles.logo} aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20 9 6h3L5 20z" /><path d="M11 20 16 10l5 10z" /></svg>
                    </span>
                    <span className={styles.wordmark}>ArsaBil</span>
                </Link>
                <span className={styles.badge}>Yönetim</span>
            </div>
            <div className={styles.right}>
                <Link href="/dashboard" className={styles.backLink}>← Müşteri paneline dön</Link>
                <span className={styles.adminName}>{session?.user?.email || ad}</span>
                <span className={styles.avatar} aria-hidden="true">{basHarf}</span>
            </div>
        </header>
    );
}
