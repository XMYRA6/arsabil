"use client";

import { useEffect, useState } from "react";
import styles from './admin.module.css';

export default function AdminOverview() {
    const [stats, setStats] = useState({ users: 0, reports: 0, listings: 0, offers: 0 });

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
                    <div className={styles.icon}>👥</div>
                    <div className={styles.value}>{stats.users}</div>
                    <div className={styles.label}>Toplam Kullanıcı</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}>📄</div>
                    <div className={styles.value}>{stats.reports}</div>
                    <div className={styles.label}>Hesaplama Raporu</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}>🏗️</div>
                    <div className={styles.value}>{stats.listings}</div>
                    <div className={styles.label}>Aktif İlan</div>
                </div>
                <div className={styles.statBox}>
                    <div className={styles.icon}>📩</div>
                    <div className={styles.value}>{stats.offers}</div>
                    <div className={styles.label}>Teklif</div>
                </div>
            </div>
        </>
    );
}
