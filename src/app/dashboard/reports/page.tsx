"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import styles from './page.module.css';
import { RaporPdfButonu } from './RaporPdfButonu';

interface Report {
    id: string;
    title: string;
    totalApartments: number;
    apartmentSizeSqm: number;
    landShareRatio: number;
    luxLevelModifier: number;
    minApartmentPrice: number;
    landCost: number;
    createdAt: string;
    listing?: object | null;
}

type Filter = 'all' | 'listed' | 'draft';

const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Tümü' },
    { key: 'listed', label: 'İlanda' },
    { key: 'draft', label: 'Taslak' },
];

export default function ReportsPage() {
    const { status } = useSession();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');

    useEffect(() => {
        if (status !== "authenticated") return;
        setLoading(true);
        setError(false);
        fetch("/api/reports")
            .then(r => {
                if (!r.ok) throw new Error('reports fetch failed');
                return r.json();
            })
            .then(data => setReports(data.reports || []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [status]);

    const filteredReports = useMemo(() => {
        if (filter === 'listed') return reports.filter(report => report.listing);
        if (filter === 'draft') return reports.filter(report => !report.listing);
        return reports;
    }, [filter, reports]);

    const totalLandCost = reports.reduce((sum, report) => sum + (report.landCost || 0), 0);
    const listedCount = reports.filter(report => report.listing).length;

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    if (loading) {
        return (
            <main className={styles.reportsShell}>
                <section className={styles.stateCard} aria-live="polite">
                    <span className={styles.stateKicker}>Raporlar</span>
                    <p>Yükleniyor...</p>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.reportsShell}>
                <section className={styles.stateCard} role="alert">
                    <span className={styles.stateKicker}>Bağlantı</span>
                    <p>Raporlar yüklenemedi. Lütfen sayfayı yenileyin.</p>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.reportsShell}>
            <header className={styles.heroCard}>
                <div>
                    <p className={styles.eyebrow}>Portföy raporları</p>
                    <h1>Raporlarım</h1>
                    <p>Kayıtlı fizibilite raporlarını tara, PDF al ve ilana bağlı olanları hızla ayır.</p>
                </div>
                <div className={styles.heroStats} aria-label="Rapor özeti">
                    <div>
                        <span className={styles.metricValue}>{reports.length}</span>
                        <span className={styles.metricLabel}>Rapor</span>
                    </div>
                    <div>
                        <span className={styles.metricValue}>{listedCount}</span>
                        <span className={styles.metricLabel}>İlanda</span>
                    </div>
                    <div>
                        <span className={styles.metricValue}>₺{totalLandCost.toLocaleString("tr-TR")}</span>
                        <span className={styles.metricLabel}>Arsa değeri</span>
                    </div>
                </div>
            </header>

            <div className={styles.segmentedTabs} role="tablist" aria-label="Rapor filtresi">
                {FILTERS.map(item => (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === item.key}
                        className={filter === item.key ? styles.segmentActive : styles.segment}
                        onClick={() => setFilter(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {filteredReports.length === 0 ? (
                <section className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>R</span>
                    <h2>Henüz gösterilecek rapor yok</h2>
                    <p>Hesap makinesinden bir fizibilite kaydettiğinde burada cam kartlar halinde listelenecek.</p>
                </section>
            ) : (
                <section className={styles.cardsGrid} aria-label="Kayıtlı raporlar">
                    {filteredReports.map(report => (
                        <article key={report.id} className={styles.reportCard}>
                            <div className={styles.cardTopline}>
                                <span className={styles.datePill}>{formatDate(report.createdAt)}</span>
                                {report.listing && <span className={styles.listingBadge}>İlanda</span>}
                            </div>
                            <h2>{report.title}</h2>
                            <div className={styles.metricGrid}>
                                <div>
                                    <span>Daire</span>
                                    <strong>{report.totalApartments}</strong>
                                </div>
                                <div>
                                    <span>Alan</span>
                                    <strong>{report.apartmentSizeSqm} m²</strong>
                                </div>
                                <div>
                                    <span>Arsa payı</span>
                                    <strong>%{(report.landShareRatio * 100).toFixed(0)}</strong>
                                </div>
                                <div>
                                    <span>Kalite</span>
                                    <strong>x{report.luxLevelModifier}</strong>
                                </div>
                            </div>
                            <div className={styles.valueRows}>
                                <div>
                                    <span>Daire fiyatı</span>
                                    <strong>₺{report.minApartmentPrice.toLocaleString("tr-TR")}</strong>
                                </div>
                                <div>
                                    <span>Arsa değeri</span>
                                    <strong>₺{report.landCost.toLocaleString("tr-TR")}</strong>
                                </div>
                            </div>
                            <div className={styles.reportPdfAction}>
                                <RaporPdfButonu rapor={report} />
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}