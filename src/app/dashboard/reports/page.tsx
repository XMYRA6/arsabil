"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styles from '../dashboard.module.css';

export default function ReportsPage() {
    const { status } = useSession();
    const [reports, setReports] = useState<any[]>([]);
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
                                <div><strong>Daire Sayısı:</strong> {report.totalApartments}</div>
                                <div><strong>Daire Alanı:</strong> {report.apartmentSizeSqm} m²</div>
                                <div><strong>Arsa Payı:</strong> %{(report.landShareRatio * 100).toFixed(0)}</div>
                                <div><strong>Kalite Katsayısı:</strong> x{report.luxLevelModifier}</div>
                                <div><strong>Daire Fiyatı:</strong> ₺{report.minApartmentPrice.toLocaleString("tr-TR")}</div>
                                <div><strong>Arsa Değeri:</strong> ₺{report.landCost.toLocaleString("tr-TR")}</div>
                                <div><strong>Tarih:</strong> {formatDate(report.createdAt)}</div>
                            </div>
                            {report.listing && (
                                <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(31,111,235,0.08)', borderRadius: '10px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center' }}>
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
