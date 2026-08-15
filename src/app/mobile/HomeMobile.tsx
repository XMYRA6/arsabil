"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppBar } from '@/components/mobile/AppBar';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { QuickActionGrid } from './QuickActionGrid';
import { RecentReportsList } from './RecentReportsList';
import { RecentActivityRows } from './RecentActivityRows';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

/**
 * Giriş yapmış kullanıcının mobil ana sayfası. `/dashboard`'ın veri modelini
 * (`/api/user/dashboard`) tüketir ama ekranın kendisi sıfırdan mobil-özel —
 * bkz. spec `2026-08-06-mobil-anasayfa-panosu-design.md`.
 *
 * `hasBottomNav={false}` BİLEREK: `/hesapla` mobilin aynı gerekçesi —
 * `SiteChrome.tsx` alt-çubuk dolgusunu `--mobile-nav-pb` ile <main>'e zaten
 * veriyor, `true` bırakılsaydı dolgu iki kez uygulanırdı.
 */
export function HomeMobile() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch('/api/user/dashboard')
            .then(res => {
                if (!res.ok) throw new Error('dashboard fetch failed');
                return res.json();
            })
            .then(setData)
            .catch(() => setError(true));
    }, []);

    return (
        <MobileScreen hasBottomNav={false}>
            <div className={styles.homeMobileKok}>
                <AppBar title="Ana Sayfa" />
                <div className={styles.homeRoot}>
                    {error ? (
                        <p className={styles.error}>Veriler yüklenemedi. Lütfen sayfayı yenileyin.</p>
                    ) : !data ? (
                        <p className={styles.loading}>Yükleniyor...</p>
                    ) : (
                        <>
                            <section className={styles.mobileHero}>
                                <div>
                                    <p className={styles.heroEyebrow}>Bugunku portfoy ozeti</p>
                                    <h1 className={styles.heroTitle}>Arsa aksiyonlariniz hazir</h1>
                                    <p className={styles.heroText}>
                                        Hesap, ilan, teklif ve mesaj akisini tek mobil panelden yonetin.
                                    </p>
                                </div>
                                <Link href="/hesapla" className={styles.heroPrimaryAction}>
                                    Yeni hesap yap
                                </Link>
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
