"use client";

import Link from 'next/link';
import type { DashboardData } from '../dashboard/page';
import styles from './mobile.module.css';

export type RecentReportsListProps = {
    reports: DashboardData['recentReports'];
};

const trFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** `/dashboard` panosunun mobil karşılığı — aynı veri, sıfırdan mobil-özel görünüm. */
export function RecentReportsList({ reports }: RecentReportsListProps) {
    if (reports.length === 0) {
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Son Hesaplamalarım</h2>
                <p className={styles.emptyNote}>
                    Henüz hesaplama yok. <Link href="/hesapla" className={styles.emptyLink}>Hesapla →</Link>
                </p>
            </section>
        );
    }

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Son Hesaplamalarım</h2>
            <div className={styles.listStack}>
                {reports.map(r => (
                    <Link key={r.id} href={`/hesapla?reportId=${r.id}`} className={styles.listRow}>
                        <span className={styles.listTitle}>{r.title}</span>
                        <span className={styles.listMeta}>
                            Arsa payı: %{Math.round(r.landShareRatio * 100)} · Min. daire: {trFormat.format(r.minApartmentPrice)} ₺
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
