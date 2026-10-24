"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
type Sirala = 'yeni' | 'eski' | 'fiyat';

const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Tümü' },
    { key: 'listed', label: 'İlana bağlı' },
    { key: 'draft', label: 'Taslak' },
];

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** 7.530.000 -> "7,53 M ₺"; milyon altı tam sayı. */
function paraKisa(n: number): string {
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace('.', ',')} M ₺` : `${trNum.format(n)} ₺`;
}

export default function ReportsPage() {
    const { status } = useSession();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [q, setQ] = useState('');
    const [sirala, setSirala] = useState<Sirala>('yeni');

    useEffect(() => {
        if (status !== "authenticated") return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- oturum açılınca veri çekme; yükleme durumu fetch başında sıfırlanıyor
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

    const gorunen = useMemo(() => {
        let f = reports;
        if (filter === 'listed') f = f.filter(report => report.listing);
        if (filter === 'draft') f = f.filter(report => !report.listing);
        const aranan = q.trim().toLocaleLowerCase('tr-TR');
        if (aranan) f = f.filter(r => r.title.toLocaleLowerCase('tr-TR').includes(aranan));
        return [...f].sort((a, b) =>
            sirala === 'fiyat' ? b.minApartmentPrice - a.minApartmentPrice
                : sirala === 'eski' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [filter, reports, q, sirala]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
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
                    <p>Raporlar yüklenemedi. Lütfen sayfayı yenile.</p>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.reportsShell}>
            <header className={styles.heroCard}>
                <div>
                    <h1>Raporlarım</h1>
                    <p>Kayıtlı fizibilite raporlarını tara, PDF al ve ilana bağlı olanları ayır.</p>
                </div>
                <Link href="/hesapla" className={styles.newBtn}>+ Yeni hesaplama</Link>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.search}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Rapor ara…"
                        aria-label="Rapor ara"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
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
                <select aria-label="Sıralama" value={sirala} onChange={e => setSirala(e.target.value as Sirala)} className={styles.sortSelect}>
                    <option value="yeni">En yeni</option>
                    <option value="eski">En eski</option>
                    <option value="fiyat">Daire fiyatı</option>
                </select>
            </div>

            {gorunen.length === 0 ? (
                <section className={styles.emptyCard}>
                    <h2>Henüz gösterilecek rapor yok</h2>
                    <p>Hesap makinesinden bir fizibilite kaydettiğinde burada listelenecek.</p>
                    <Link href="/hesapla" className={styles.newBtn}>Hesapla →</Link>
                </section>
            ) : (
                <section className={styles.cardsGrid} aria-label="Kayıtlı raporlar">
                    {gorunen.map(report => (
                        <article key={report.id} className={styles.reportCard}>
                            <div className={styles.cardTop}>
                                <div className={styles.cardTitleCol}>
                                    <h2>{report.title}</h2>
                                    <span className={styles.date}>{formatDate(report.createdAt)}</span>
                                </div>
                                <span className={report.listing ? styles.listingBadge : styles.draftBadge}>
                                    {report.listing ? 'İlana bağlı' : 'Taslak'}
                                </span>
                            </div>
                            <div className={styles.metricGrid}>
                                <div><span>Daire</span><strong>{report.totalApartments}</strong></div>
                                <div><span>Daire m²</span><strong>{report.apartmentSizeSqm} m²</strong></div>
                                <div><span>Arsa payı</span><strong>%{(report.landShareRatio * 100).toFixed(0)}</strong></div>
                                <div><span>Kalite</span><strong>x{report.luxLevelModifier}</strong></div>
                                <div><span>Daire fiyatı</span><strong>{paraKisa(report.minApartmentPrice)}</strong></div>
                                <div><span>Arsa değeri</span><strong>{paraKisa(report.landCost)}</strong></div>
                            </div>
                            <div className={styles.actions}>
                                <Link href={`/hesapla?reportId=${report.id}`} className={styles.openBtn}>Aç</Link>
                                <div className={styles.pdfAction}>
                                    <RaporPdfButonu rapor={report} />
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}
