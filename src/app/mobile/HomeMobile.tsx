"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import { resolveScene } from '@/lib/dioramas/scene';
import { QuickActionGrid } from './QuickActionGrid';
import { RecentReportsList } from './RecentReportsList';
import { RecentActivityRows } from './RecentActivityRows';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

/**
 * Giriş yapmış kullanıcının mobil ana sayfası. `/dashboard`'ın veri modelini
 * (`/api/user/dashboard`) tüketir. Alt menüde karşılığı olan eylemler (Hesapla,
 * Pazar, Mesajlar) burada tekrarlanmaz; mesaj ve bildirim üst çubuktaki
 * ikonlardan açılır.
 *
 * `hasBottomNav={false}` BİLEREK: `SiteChrome.tsx` alt-çubuk dolgusunu
 * `--mobile-nav-pb` ile <main>'e zaten veriyor, `true` bırakılsaydı dolgu
 * iki kez uygulanırdı.
 */
export function HomeMobile() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState(false);
    const [bildirim, setBildirim] = useState(0);
    const zaman = useThemeZaman();
    const sahne = resolveScene({ tur: 'arsa', varyant: 'agacli', egim: 'duz', zaman });

    useEffect(() => {
        fetch('/api/user/dashboard')
            .then(res => {
                if (!res.ok) throw new Error('dashboard fetch failed');
                return res.json();
            })
            .then(setData)
            .catch(() => setError(true));
        fetch('/api/notifications')
            .then(res => (res.ok ? res.json() : null))
            .then(d => {
                if (Array.isArray(d?.notifications)) {
                    setBildirim(d.notifications.filter((n: { read: boolean }) => !n.read).length);
                }
            })
            .catch(() => {});
    }, []);

    return (
        <MobileScreen hasBottomNav={false} mesh={false}>
            <div className={styles.homeMobileKok}>
                <MobileTopBar mesaj={data?.stats.unreadMessageCount ?? 0} bildirim={bildirim} />
                <div className={styles.homeRoot}>
                    {error ? (
                        <p className={styles.error}>Veriler yüklenemedi. Lütfen sayfayı yenileyin.</p>
                    ) : !data ? (
                        <p className={styles.loading}>Yükleniyor...</p>
                    ) : (
                        <>
                            <section className={styles.mobileHero}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP */}
                                <img src={sahne.src800} alt="" className={styles.heroImg} />
                                <div className={styles.heroCopy}>
                                    <h1 className={styles.heroTitle}>Arsanı bil. Değerini gör.</h1>
                                    <Link href="/hesapla" className={styles.heroPrimaryAction}>Yeni hesap yap</Link>
                                </div>
                            </section>
                            <QuickActionGrid stats={data.stats} />
                            <RecentReportsList reports={data.recentReports} />
                            <RecentActivityRows messages={data.recentMessages} offers={data.recentOffers} />
                        </>
                    )}
                </div>
            </div>
        </MobileScreen>
    );
}
