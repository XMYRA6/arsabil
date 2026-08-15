"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

type Listing = {
    id: string;
    title?: string | null;
    city?: string | null;
    district?: string | null;
    price?: number | null;
    isActive: boolean;
    status: string;
    type?: string | null;
    createdAt: string;
    offers?: unknown[];
};

type Filter = 'all' | 'active' | 'draft';

const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Tümü' },
    { key: 'active', label: 'Aktif' },
    { key: 'draft', label: 'Taslak' },
];

export default function DashboardListingsPage() {
    const { status } = useSession();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');

    useEffect(() => {
        if (status !== 'authenticated') return;
        setLoading(true);
        setError(false);
        fetch('/api/listings?mine=1')
            .then(res => {
                if (!res.ok) throw new Error('listings fetch failed');
                return res.json();
            })
            .then(data => setListings(Array.isArray(data) ? data : []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [status]);

    const filteredListings = useMemo(() => {
        if (filter === 'active') return listings.filter(listing => listing.isActive && listing.status === 'APPROVED');
        if (filter === 'draft') return listings.filter(listing => !listing.isActive || listing.status !== 'APPROVED');
        return listings;
    }, [filter, listings]);

    if (loading) return <StateCard label="İlanlar" text="Yükleniyor..." />;
    if (error) return <StateCard label="Bağlantı" text="İlanlar yüklenemedi. Lütfen sayfayı yenileyin." alert />;

    return (
        <main className={styles.portfolioShell}>
            <header className={styles.heroCard}>
                <div>
                    <p className={styles.eyebrow}>Yayın akışı</p>
                    <h1>İlanlarım</h1>
                    <p>Yayınlanan, onay bekleyen ve pasif ilanlarını mobilde temiz bir portföy listesiyle yönet.</p>
                </div>
                <Link href="/listings/new" className={styles.primaryLink}>Yeni ilan</Link>
            </header>

            <div className={styles.segmentedTabs} role="tablist" aria-label="İlan filtresi">
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

            {filteredListings.length === 0 ? (
                <section className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>İ</span>
                    <h2>Bu filtrede ilan yok</h2>
                    <p>Yeni ilan oluşturduğunda onay durumuyla birlikte burada listelenecek.</p>
                    <Link href="/listings/new" className={styles.primaryLink}>İlan oluştur</Link>
                </section>
            ) : (
                <section className={styles.listStack} aria-label="İlanlarım">
                    {filteredListings.map(listing => (
                        <Link key={listing.id} href={`/listing/${listing.id}`} className={styles.itemCard}>
                            <div className={styles.itemTopline}>
                                <span>{listing.type || 'KAT_KARSILIGI'}</span>
                                <strong className={listing.isActive && listing.status === 'APPROVED' ? styles.statusActive : styles.statusDraft}>
                                    {listing.isActive && listing.status === 'APPROVED' ? 'Aktif' : listing.status === 'PENDING' ? 'Onay bekliyor' : 'Taslak'}
                                </strong>
                            </div>
                            <h2>{listing.title || 'İsimsiz ilan'}</h2>
                            <p>{[listing.district, listing.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'}</p>
                            <div className={styles.metricRow}>
                                <div><span>Fiyat</span><strong>{listing.price ? `₺${listing.price.toLocaleString('tr-TR')}` : 'Yok'}</strong></div>
                                <div><span>Teklif</span><strong>{listing.offers?.length ?? 0}</strong></div>
                            </div>
                        </Link>
                    ))}
                </section>
            )}
        </main>
    );
}

function StateCard({ label, text, alert = false }: { label: string; text: string; alert?: boolean }) {
    return (
        <main className={styles.portfolioShell}>
            <section className={styles.stateCard} role={alert ? 'alert' : undefined} aria-live={alert ? undefined : 'polite'}>
                <span className={styles.eyebrow}>{label}</span>
                <p>{text}</p>
            </section>
        </main>
    );
}