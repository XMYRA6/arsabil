"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type QuickActionGridProps = {
    stats: DashboardData['stats'];
};

const STAT_TILES = [
    { key: 'reportCount', label: 'HESAP' },
    { key: 'activeListingCount', label: 'İLAN' },
    { key: 'offerCount', label: 'TEKLİF' },
    { key: 'unreadMessageCount', label: 'MESAJ' },
] as const;

/** Onaylanan "B" mockup: istatistikler + 4'lü eylem grid'i en üstte (bkz. spec, görsel companion). */
export function QuickActionGrid({ stats }: QuickActionGridProps) {
    const statValues: Record<string, number> = stats;

    return (
        <>
            <div className={styles.statGrid}>
                {STAT_TILES.map(({ key, label }) => (
                    <div key={key} className={styles.statTile}>
                        <div className={styles.statValue}>{statValues[key]}</div>
                        <div className={styles.statLabel}>{label}</div>
                    </div>
                ))}
            </div>

            <div className={styles.actionGrid}>
                <Link href="/hesapla" className={styles.actionTile}>
                    <span className={`${styles.actionIcon} ${styles.actionIconPrimary}`} aria-hidden="true">＋</span>
                    <span className={styles.actionLabel}>Hesapla</span>
                </Link>
                <Link href="/listings/new" className={styles.actionTile}>
                    <span className={styles.actionIcon} aria-hidden="true">🏢</span>
                    <span className={styles.actionLabel}>İlan Ver</span>
                </Link>
                <Link href="/inbox" className={styles.actionTile}>
                    <span className={styles.actionIcon} aria-hidden="true">💬</span>
                    <span className={styles.actionLabel}>Mesajlar</span>
                </Link>
                <Link href="/marketplace" className={styles.actionTile}>
                    <span className={styles.actionIcon} aria-hidden="true">🏪</span>
                    <span className={styles.actionLabel}>Pazar Yeri</span>
                </Link>
            </div>
        </>
    );
}
