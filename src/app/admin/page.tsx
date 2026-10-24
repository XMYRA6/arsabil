"use client";

import { IconUser, IconFile, IconBox, IconMessage, IconClock } from '@/components/icons';
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from './admin.module.css';

type Stats = { users: number; reports: number; listings: number; offers: number; pendingListings: number };

export default function AdminOverview() {
    // Yüklenene kadar null: sayı kutuları sahte "0" yerine "—" gösterir.
    const [stats, setStats] = useState<Stats | null>(null);
    const sayi = (n: number | undefined) => (stats && typeof n === 'number' ? n.toLocaleString('tr-TR') : '—');

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(r => r.json())
            .then(setStats)
            .catch(console.error);
    }, []);

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Genel Bakış</h1>
                <p>ArsaBil platform istatistikleri ve özet bilgiler</p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                    <div className={styles.icon}><IconUser size={22} /></div>
                    <div className={styles.value}>{sayi(stats?.users)}</div>
                    <div className={styles.label}>Toplam Kullanıcı</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}><IconFile size={22} /></div>
                    <div className={styles.value}>{sayi(stats?.reports)}</div>
                    <div className={styles.label}>Hesaplama Raporu</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}><IconBox size={22} /></div>
                    <div className={styles.value}>{sayi(stats?.listings)}</div>
                    <div className={styles.label}>Aktif İlan</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}><IconMessage size={22} /></div>
                    <div className={styles.value}>{sayi(stats?.offers)}</div>
                    <div className={styles.label}>Teklif</div>
                </div>
                <Link href="/admin/listings" className={styles.statBox} style={{ textDecoration: 'none' }}>
                    <div className={styles.icon}><IconClock size={22} /></div>
                    <div className={styles.value}>{sayi(stats?.pendingListings)}</div>
                    <div className={styles.label}>Onay bekleyen ilan</div>
                </Link>
            </div>
        </>
    );
}
