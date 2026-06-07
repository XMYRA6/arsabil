"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { ListingCard } from '@/components/marketplace/ListingCard';
import styles from './page.module.css';

const MapView = dynamic(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    {
        ssr: false,
        loading: () => (
            <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', height: 500 }}>
                Harita yükleniyor...
            </div>
        ),
    }
) as ComponentType<any>;

type Tab = 'liste' | 'harita';

interface Filters {
    city: string;
    district: string;
    minPrice: string;
    maxPrice: string;
}

const EMPTY_FILTERS: Filters = { city: '', district: '', minPrice: '', maxPrice: '' };

export default function MarketplacePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>}>
            <MarketplaceContent />
        </Suspense>
    );
}

function MarketplaceContent() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<Tab>('liste');
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
    const [listings, setListings] = useState<any[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        fetchListings(appliedFilters);
    }, [appliedFilters]);

    useEffect(() => {
        if (session?.user) fetchFavorites();
    }, [session]);

    const fetchListings = async (f: Filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (f.city) params.set('city', f.city);
            if (f.district) params.set('district', f.district);
            if (f.minPrice) params.set('minPrice', f.minPrice);
            if (f.maxPrice) params.set('maxPrice', f.maxPrice);
            const res = await fetch(`/api/listings?${params.toString()}`);
            const data = await res.json();
            setListings(Array.isArray(data) ? data : []);
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async () => {
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();
            if (Array.isArray(data)) {
                setFavoriteIds(new Set(data.map((f: any) => f.listingId)));
            }
        } catch { /* ignore */ }
    };

    const toggleFavorite = async (listingId: string) => {
        if (!session?.user) return;
        const isFav = favoriteIds.has(listingId);
        setFavoriteIds(prev => {
            const next = new Set(prev);
            isFav ? next.delete(listingId) : next.add(listingId);
            return next;
        });
        try {
            if (isFav) {
                await fetch(`/api/favorites/${listingId}`, { method: 'DELETE' });
            } else {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listingId }),
                });
            }
        } catch {
            // Rollback on error
            setFavoriteIds(prev => {
                const next = new Set(prev);
                isFav ? next.add(listingId) : next.delete(listingId);
                return next;
            });
        }
    };

    const handleFilter = () => setAppliedFilters({ ...filters });
    const handleReset = () => {
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
    };

    const hasActiveFilters = appliedFilters.city || appliedFilters.district || appliedFilters.minPrice || appliedFilters.maxPrice;

    const mapListings = listings.map(l => ({
        ...l,
        lat: l.lat ?? 41.015,
        lng: l.lng ?? 28.979,
        title: l.title ?? l.report?.title ?? 'İlan',
        price: l.price ?? l.report?.minApartmentPrice ?? 0,
    }));

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--card-title)', marginBottom: 4 }}>
                    Pazar Yeri
                </h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Onaylı arsa ve kat karşılığı ilanları keşfedin
                </p>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>İl</span>
                    <input
                        className={styles.filterInput}
                        placeholder="İstanbul"
                        value={filters.city}
                        onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>İlçe</span>
                    <input
                        className={styles.filterInput}
                        placeholder="Kadıköy"
                        value={filters.district}
                        onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>Min Fiyat (TL)</span>
                    <input
                        className={styles.filterInput}
                        type="number"
                        placeholder="500000"
                        value={filters.minPrice}
                        onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                    />
                </div>
                <div className={styles.filterField}>
                    <span className={styles.filterLabel}>Max Fiyat (TL)</span>
                    <input
                        className={styles.filterInput}
                        type="number"
                        placeholder="5000000"
                        value={filters.maxPrice}
                        onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    />
                </div>
                <button className={styles.filterBtn} onClick={handleFilter}>
                    Filtrele
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={handleReset}
                        style={{ padding: '8px 14px', background: 'transparent', color: 'var(--muted)', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}
                    >
                        Temizle
                    </button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>
                    {loading ? 'Yükleniyor...' : `${listings.length} ilan`}
                </span>
            </div>

            {/* Tab Bar */}
            <div className={styles.tabBar}>
                <button
                    className={tab === 'liste' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('liste')}
                >
                    Liste
                </button>
                <button
                    className={tab === 'harita' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                    onClick={() => setTab('harita')}
                >
                    Harita
                </button>
            </div>

            {/* Tab Content */}
            {tab === 'liste' && (
                loading ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>...</div>
                        Yükleniyor...
                    </div>
                ) : listings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>X</div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>İlan bulunamadı</div>
                        <div style={{ fontSize: '0.85rem' }}>Filtreleri değiştirmeyi deneyin</div>
                    </div>
                ) : (
                    <div className={styles.listingGrid}>
                        {listings.map(listing => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                isFavorite={favoriteIds.has(listing.id)}
                                onFavoriteToggle={toggleFavorite}
                            />
                        ))}
                    </div>
                )
            )}

            {tab === 'harita' && (
                <div className={styles.mapContainer}>
                    <MapView
                        listings={mapListings}
                        highlightedId={highlightedId}
                        onHighlight={setHighlightedId}
                    />
                </div>
            )}
        </div>
    );
}
