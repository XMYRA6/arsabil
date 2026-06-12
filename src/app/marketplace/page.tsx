"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FilterSidebar } from '@/components/marketplace/FilterSidebar';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ViewToggle } from '@/components/marketplace/ViewToggle';
import { CitySearch } from '@/components/marketplace/CitySearch';
import type { MapViewHandle } from '@/components/marketplace/MapView';
import styles from './page.module.css';

// SSR-safe map import
const MapView = dynamic(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    { ssr: false, loading: () => <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>🗺 Harita yükleniyor…</div> }
) as any;

type View = 'split' | 'map' | 'list';

const DEFAULT_FILTERS = {
    type: ['KAT_KARSILIGI'],
    minSize: 200,
    maxSize: 10000,
    imar: [] as string[],
    minEmsal: 0.8,
    maxEmsal: 3.0,
    fizibiliteOnly: false,
    minScore: 10,
};

// Mock listings enriched with fizibilite data
const MOCK_LISTINGS_EXTRA = [
    { fizibiliteSkoru: 83, arsaPayiMin: 30, arsaPayiMax: 46, changePercent: 42.8, imarDurumu: 'KONUT', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 34, arsaPayiMax: 48, changePercent: 44.3, imarDurumu: 'KONUT_TICARET', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 35, arsaPayiMax: 48, changePercent: 48.8, imarDurumu: 'TICARET', isNew: true },
    { fizibiliteSkoru: 88, arsaPayiMin: 23, arsaPayiMax: 34, changePercent: 36.1, imarDurumu: 'KONUT', isNew: true },
    { fizibiliteSkoru: 76, arsaPayiMin: 28, arsaPayiMax: 40, changePercent: 28.5, imarDurumu: 'KONUT', isNew: false },
    { fizibiliteSkoru: 64, arsaPayiMin: 25, arsaPayiMax: 38, changePercent: 18.2, imarDurumu: 'DIGER', isNew: false },
    { fizibiliteSkoru: 91, arsaPayiMin: 32, arsaPayiMax: 45, changePercent: 55.3, imarDurumu: 'KONUT_TICARET', isNew: true },
    { fizibiliteSkoru: 58, arsaPayiMin: 22, arsaPayiMax: 35, changePercent: -8.4, imarDurumu: 'KONUT', isNew: false },
    { fizibiliteSkoru: 79, arsaPayiMin: 30, arsaPayiMax: 42, changePercent: 31.7, imarDurumu: 'TICARET', isNew: false },
    { fizibiliteSkoru: 86, arsaPayiMin: 33, arsaPayiMax: 46, changePercent: 46.2, imarDurumu: 'KONUT', isNew: true },
];

export default function MarketplacePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>}>
            <MarketplaceContent />
        </Suspense>
    );
}

function MarketplaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [view, setView] = useState<View>((searchParams.get('view') as View) || 'split');
    const [mobileTab, setMobileTab] = useState<'filter' | 'list' | 'map'>('list');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('score_desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCity, setSelectedCity] = useState('İstanbul');
    const mapRef = useRef<MapViewHandle>(null);

    useEffect(() => {
        const saved = localStorage.getItem('arsabil-marketplace-view') as View | null;
        if (saved) setView(saved);
    }, []);

    const handleViewChange = (v: View) => {
        setView(v);
        localStorage.setItem('arsabil-marketplace-view', v);
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', v);
        router.replace(`/marketplace?${params.toString()}`, { scroll: false });
    };

    useEffect(() => {
        setLoading(true);
        fetch('/api/listings')
            .then(r => r.json())
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                // Enrich API data with mock fizibilite fields for demo
                const enriched = arr.map((l: any, i: number) => ({
                    ...l,
                    ...(MOCK_LISTINGS_EXTRA[i % MOCK_LISTINGS_EXTRA.length] || {}),
                    type: l.type ?? 'KAT_KARSILIGI',
                }));
                // If no listings from API, add mock data
                if (enriched.length === 0) {
                    const mock = Array.from({ length: 10 }, (_, i) => ({
                        id: `mock-${i}`,
                        title: `${600 + i * 80} m² Arsa`,
                        type: i % 3 === 0 ? 'SALE' : 'KAT_KARSILIGI',
                        city: 'İstanbul',
                        district: ['Beşiktaş', 'Kadıköy', 'Şişli', 'Ümraniye', 'Maltepe'][i % 5],
                        price: i % 3 === 0 ? (5000000 + i * 500000) : 0,
                        report: { landShareRatio: 0.35, minApartmentPrice: 5000000 + i * 500000 },
                        ...MOCK_LISTINGS_EXTRA[i],
                    }));
                    setListings(mock);
                } else {
                    setListings(enriched);
                }
                setLoading(false);
            })
            .catch(() => {
                const mock = Array.from({ length: 10 }, (_, i) => ({
                    id: `mock-${i}`,
                    title: `${600 + i * 80} m² Arsa`,
                    type: i % 3 === 0 ? 'SALE' : 'KAT_KARSILIGI',
                    city: 'İstanbul',
                    district: ['Beşiktaş', 'Kadıköy', 'Şişli', 'Ümraniye', 'Maltepe'][i % 5],
                    price: i % 3 === 0 ? (5000000 + i * 500000) : 0,
                    report: { landShareRatio: 0.35, minApartmentPrice: 5000000 + i * 500000 },
                    ...MOCK_LISTINGS_EXTRA[i],
                }));
                setListings(mock);
                setLoading(false);
            });
    }, []);

    // Filter logic
    const filtered = listings.filter(l => {
        if (filters.type.length > 0 && !filters.type.includes(l.type)) return false;
        if (filters.imar.length > 0 && !filters.imar.includes(l.imarDurumu)) return false;
        if (filters.fizibiliteOnly && (!l.fizibiliteSkoru || l.fizibiliteSkoru < filters.minScore)) return false;
        return true;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'score_desc') return (b.fizibiliteSkoru ?? 0) - (a.fizibiliteSkoru ?? 0);
        if (sortBy === 'price_asc') return (a.price ?? a.report?.minApartmentPrice ?? 0) - (b.price ?? b.report?.minApartmentPrice ?? 0);
        if (sortBy === 'newest') return 0; // Would use createdAt
        return 0;
    });

    const PER_PAGE = 6;
    const paginated = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const totalPages = Math.ceil(sorted.length / PER_PAGE);

    /* ===================== RENDER ===================== */
    return (
        <div className={styles.container}>

            {/* ── Top Bar ── */}
            <div className={styles.topBar}>
                {/* City Search */}
                <CitySearch
                    selectedCity={selectedCity}
                    onCitySelect={(city) => {
                        setSelectedCity(city.name);
                        mapRef.current?.flyTo(city.lat, city.lng, city.zoom);
                        mapRef.current?.showProvinceBorder(city.name);
                    }}
                />

                {/* Quick filter chips */}
                {['Satış', 'Kat Karşılığı / Ortaklık'].map((label, i) => {
                    const type = i === 0 ? 'SALE' : 'KAT_KARSILIGI';
                    const active = filters.type.includes(type);
                    return (
                        <button key={label} onClick={() => {
                            const has = filters.type.includes(type);
                            setFilters(f => ({ ...f, type: has ? f.type.filter(t => t !== type) : [...f.type, type] }));
                        }} style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: active ? 'var(--primary)' : 'var(--bg)',
                            color: active ? 'white' : 'var(--muted)',
                            border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                        }}>{label}</button>
                    );
                })}

                {/* Emsal quick filter */}
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '6px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    Emsal: {filters.minEmsal}–{filters.maxEmsal}
                </span>

                {/* Spacer (Hidden on mobile via CSS or flex logic) */}
                <div style={{ flex: 1, minWidth: 10 }} className={styles.desktopOnlySpacer} />

                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                    padding: '6px 10px', background: 'var(--bg)', border: '1.5px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer',
                }}>
                    <option value="score_desc">En Yüksek Skor</option>
                    <option value="price_asc">En Uygun Fiyat</option>
                    <option value="newest">En Yeniler</option>
                </select>

                {/* View Toggle */}
                <div className={styles.desktopViewToggle}>
                    <ViewToggle view={view} onChange={handleViewChange} />
                </div>
            </div>

            {/* ── Mobile Tabs ── */}
            <div className={styles.mobileTabs}>
                <button className={mobileTab === 'filter' ? styles.activeTab : ''} onClick={() => setMobileTab('filter')}>Filtreler</button>
                <button className={mobileTab === 'list' ? styles.activeTab : ''} onClick={() => setMobileTab('list')}>İlanlar</button>
                <button className={mobileTab === 'map' ? styles.activeTab : ''} onClick={() => setMobileTab('map')}>Harita</button>
            </div>

            {/* ── Body ── */}
            <div className={styles.bodyContainer} data-mobile-tab={mobileTab}>

                {/* Filter Sidebar (hidden in full map view) */}
                {view !== 'map' && (
                    <div className={styles.sidebarWrapper}>
                        <FilterSidebar filters={filters} onChange={setFilters} totalCount={sorted.length} />
                    </div>
                )}

                {/* List Panel */}
                {(view === 'split' || view === 'list') && (
                    <div className={styles.listPanel} style={{
                        width: view === 'list' ? '100%' : 360,
                        borderRight: view === 'split' ? '1px solid var(--border)' : 'none',
                    }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} style={{ height: view === 'list' ? 130 : 280, background: 'var(--panel)', borderRadius: 16, animation: 'pulse 1.5s infinite', border: '1px solid var(--border)' }} />
                                ))}
                            </div>
                        ) : paginated.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                                Kriterlere uyan ilan bulunamadı.
                            </div>
                        ) : (
                            <>
                                {/* Count */}
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '0 2px' }}>
                                    {sorted.length.toLocaleString('tr-TR')} arsa bulundu
                                </div>

                                {paginated.map(listing => (
                                    <ListingCard
                                        key={listing.id}
                                        listing={listing}
                                        highlighted={highlightedId === listing.id}
                                        view={view}
                                        onHover={setHighlightedId}
                                    />
                                ))}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
                                        {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setCurrentPage(p)} style={{
                                                width: 30, height: 30, borderRadius: 8,
                                                background: currentPage === p ? 'var(--primary)' : 'var(--bg)',
                                                color: currentPage === p ? 'white' : 'var(--muted)',
                                                border: `1.5px solid ${currentPage === p ? 'var(--primary)' : 'var(--border)'}`,
                                                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700,
                                            }}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Map Panel */}
                {(view === 'split' || view === 'map') && (
                    <div className={styles.mapPanel}>
                        <MapView
                            ref={mapRef}
                            listings={listings}
                            highlightedId={highlightedId}
                            onHighlight={setHighlightedId}
                        />
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
