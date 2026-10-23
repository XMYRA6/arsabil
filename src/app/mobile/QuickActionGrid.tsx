"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type QuickActionGridProps = {
    stats: DashboardData['stats'];
};

const STAT_TILES = [
    { key: 'reportCount', label: 'Hesap', href: '/dashboard/reports' },
    { key: 'activeListingCount', label: 'İlan', href: '/dashboard/listings' },
    { key: 'offerCount', label: 'Teklif', href: '/dashboard' },
] as const;

/**
 * Özet şeridi (hesap / ilan / teklif) ve alt menüde karşılığı olmayan tek eylem: İlan ver.
 * Hesapla, Pazar ve Mesajlar alt menü ile üst çubukta zaten var; burada tekrarlanmaz.
 */
export function QuickActionGrid({ stats }: QuickActionGridProps) {
    const statValues: Record<string, number> = stats;

    return (
        <>
            <div className={styles.statGrid}>
                {STAT_TILES.map(({ key, label, href }) => (
                    <Link key={key} href={href} className={styles.statTile}>
                        <span className={styles.statValue}>{statValues[key]}</span>
                        <span className={styles.statLabel}>{label}</span>
                    </Link>
                ))}
            </div>
            <Link href="/listings/new" className={styles.listingAction}>İlan ver</Link>
        </>
    );
}
