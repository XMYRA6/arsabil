"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { resolveScene } from '@/lib/dioramas/scene';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import { sahneSec } from '../favorites/page';
import styles from '../panelListe.module.css';

type Listing = {
    id: string;
    title?: string | null;
    city?: string | null;
    district?: string | null;
    price?: number | null;
    isActive: boolean;
    status: string;
    type?: string | null;
    zoning?: string | null;
    photos?: string[] | null;
    createdAt: string;
    offers?: unknown[];
};

type Filter = 'all' | 'active' | 'pending' | 'passive';

const TYPE_LABEL: Record<string, string> = { KAT_KARSILIGI: 'Kat karşılığı', SALE: 'Satılık', ORTAKLIK: 'Ortaklık' };

const durumu = (l: Listing): Exclude<Filter, 'all'> =>
    l.isActive && l.status === 'APPROVED' ? 'active' : l.status === 'PENDING' ? 'pending' : 'passive';

const DURUM_ETIKET = { active: 'Yayında', pending: 'Onay bekliyor', passive: 'Pasif' } as const;
const DURUM_SINIF = { active: 'badgeOk', pending: 'badgeWait', passive: 'badgeOff' } as const;

export default function DashboardListingsPage() {
    const { status } = useSession();
    const zaman = useThemeZaman();
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

    const sayilar = useMemo(() => ({
        all: listings.length,
        active: listings.filter(l => durumu(l) === 'active').length,
        pending: listings.filter(l => durumu(l) === 'pending').length,
        passive: listings.filter(l => durumu(l) === 'passive').length,
    }), [listings]);

    const filtered = useMemo(
        () => (filter === 'all' ? listings : listings.filter(l => durumu(l) === filter)),
        [filter, listings],
    );

    const FILTERS: Array<{ key: Filter; label: string }> = [
        { key: 'all', label: 'Tümü' },
        { key: 'active', label: 'Yayında' },
        { key: 'pending', label: 'Onay bekliyor' },
        { key: 'passive', label: 'Pasif' },
    ];

    if (loading) return <div className={styles.state}>Yükleniyor...</div>;
    if (error) return <div className={`${styles.state} ${styles.error}`} role="alert">İlanlar yüklenemedi. Lütfen sayfayı yenileyin.</div>;

    return (
        <main className={styles.shell}>
            <header className={styles.head}>
                <div>
                    <h1>İlanlarım</h1>
                    <p>Yayınlanan, onay bekleyen ve pasif ilanlarını yönet.</p>
                </div>
                <Link href="/listings/new" className={styles.btn}>+ Yeni ilan</Link>
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
                        {item.label} · {sayilar[item.key]}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <section className={styles.empty}>
                    <h2>Bu filtrede ilan yok</h2>
                    <p>Yeni ilan oluşturduğunda onay durumuyla birlikte burada listelenecek.</p>
                    <Link href="/listings/new" className={styles.btn}>İlan oluştur</Link>
                </section>
            ) : (
                <section className={styles.stack} aria-label="İlanlarım">
                    {filtered.map(listing => {
                        const photoUrl = listing.photos?.[0];
                        const diorama = photoUrl ? null : resolveScene({ ...sahneSec(listing.type, listing.zoning), egim: 'duz', zaman });
                        const d = durumu(listing);
                        const baslik = [listing.district, listing.city].filter(Boolean).join(' · ') || listing.title || 'İsimsiz ilan';
                        return (
                            <article key={listing.id} className={styles.listRow}>
                                <Link href={`/listing/${listing.id}`} className={styles.rowPhoto} aria-label={listing.title || 'İlan'}>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- harici ilan fotoğrafı / yerel statik WebP */}
                                    {photoUrl ? <img src={photoUrl} alt={listing.title || 'İlan'} /> : diorama ? <img src={diorama.src800} alt="" loading="lazy" /> : null}
                                </Link>
                                <div className={styles.rowMain}>
                                    <div className={styles.rowTitleLine}>
                                        <Link href={`/listing/${listing.id}`} className={styles.rowTitle}>{baslik}</Link>
                                        <span className={`${styles.badge} ${styles[DURUM_SINIF[d]]}`}>{DURUM_ETIKET[d]}</span>
                                    </div>
                                    <p className={styles.rowSub}>{TYPE_LABEL[listing.type ?? ''] ?? 'Kat karşılığı'}{listing.title ? ` · ${listing.title}` : ''}</p>
                                </div>
                                <div className={styles.stats}>
                                    <div className={styles.stat}><span>Fiyat</span><strong>{listing.price ? `₺${listing.price.toLocaleString('tr-TR')}` : '—'}</strong></div>
                                    <div className={styles.stat}><span>Teklif</span><strong>{listing.offers?.length ?? 0}</strong></div>
                                </div>
                                <div className={styles.actions}>
                                    <Link href={`/listings/${listing.id}/edit`} className={styles.btnSmSoft}>Düzenle</Link>
                                    <Link href={`/listing/${listing.id}/offers`} className={styles.btnSmSoft}>Teklifler</Link>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </main>
    );
}
