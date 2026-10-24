"use client";

import { useEffect, useState } from 'react';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { GelenKutusu, type BildirimOzeti } from './GelenKutusu';
import { RecentReportsList } from './RecentReportsList';
import { SenaryolarListesi, type SenaryoOzeti } from './SenaryolarListesi';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

/**
 * Giriş yapmış kullanıcının mobil ana sayfası: "Özet". Üst çubuk, logo ve
 * zil yok; sayfa doğrudan içerikle başlar. Sıra: Gelen kutusu (mesajlar +
 * bildirimler), Raporlarım, Senaryolarım. Alt menüdeki eylemler burada
 * tekrarlanmaz.
 *
 * `hasBottomNav={false}` BİLEREK: `SiteChrome.tsx` alt-çubuk dolgusunu
 * `--mobile-nav-pb` ile <main>'e zaten veriyor, `true` bırakılsaydı dolgu
 * iki kez uygulanırdı.
 */
export function HomeMobile() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState(false);
    const [bildirimler, setBildirimler] = useState<BildirimOzeti[]>([]);
    const [senaryolar, setSenaryolar] = useState<SenaryoOzeti[]>([]);

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
            .then(d => { if (Array.isArray(d?.notifications)) setBildirimler(d.notifications); })
            .catch(() => {});
        fetch('/api/studio/scenarios')
            .then(res => (res.ok ? res.json() : null))
            .then(d => { if (Array.isArray(d?.scenarios)) setSenaryolar(d.scenarios); })
            .catch(() => {});
    }, []);

    return (
        <MobileScreen hasBottomNav={false} mesh={false}>
            <div className={styles.homeMobileKok}>
                <div className={styles.homeRoot}>
                    <h1 className={styles.sayfaBaslik}>Özet</h1>
                    {error ? (
                        <p className={styles.error}>Veriler yüklenemedi. Lütfen sayfayı yenile.</p>
                    ) : !data ? (
                        <p className={styles.loading}>Yükleniyor...</p>
                    ) : (
                        <>
                            <GelenKutusu
                                messages={data.recentMessages}
                                unreadMessages={data.stats.unreadMessageCount}
                                notifications={bildirimler}
                            />
                            <RecentReportsList reports={data.recentReports} />
                            <SenaryolarListesi senaryolar={senaryolar} />
                        </>
                    )}
                </div>
            </div>
        </MobileScreen>
    );
}
