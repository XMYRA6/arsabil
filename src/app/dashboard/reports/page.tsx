"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styles from '../dashboard.module.css';
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
    listing?: object;
}

export default function ReportsPage() {
    const { status } = useSession();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/user/dashboard")
                .then(r => r.json())
                .then(data => { setReports(data.reports || []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [status]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    if (loading) return <div className={styles.loading}>Yükleniyor...</div>;

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>Raporlarım</h1>
                <p>Tüm kayıtlı hesaplama raporlarınız</p>
            </div>

            {reports.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    Henüz kayıtlı raporunuz yok. Hesap makinesinden bir rapor oluşturun.
                </div>
            ) : (
                <div className={styles.cardsGrid}>
                    {reports.map(report => (
                        <div key={report.id} className={styles.reportCard}>
                            <h4>{report.title}</h4>
                            <div className={styles.reportMeta}>
                                <div><strong>Daire Sayısı:</strong> <span className={styles.metaValue}>{report.totalApartments}</span></div>
                                <div><strong>Daire Alanı:</strong> <span className={styles.metaValue}>{report.apartmentSizeSqm} m²</span></div>
                                <div><strong>Arsa Payı:</strong> <span className={styles.metaValue}>%{(report.landShareRatio * 100).toFixed(0)}</span></div>
                                <div><strong>Kalite Katsayısı:</strong> <span className={styles.metaValue}>x{report.luxLevelModifier}</span></div>
                                <div><strong>Daire Fiyatı:</strong> <span className={styles.metaValue}>₺{report.minApartmentPrice.toLocaleString("tr-TR")}</span></div>
                                <div><strong>Arsa Değeri:</strong> <span className={styles.metaValue}>₺{report.landCost.toLocaleString("tr-TR")}</span></div>
                                <div><strong>Tarih:</strong> {formatDate(report.createdAt)}</div>
                            </div>
                            <div className={styles.reportPdfAction}>
                                <RaporPdfButonu rapor={report} />
                            </div>
                            {report.listing && (
                                <div className={styles.listingBadge}>
                                    ✓ Pazar Yerinde İlanda
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
