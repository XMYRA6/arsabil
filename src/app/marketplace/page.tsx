"use client";

import { useState, useEffect, useRef, Suspense, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FilterSidebar } from '@/components/marketplace/FilterSidebar';
import { ListingCard } from '@/components/marketplace/ListingCard';
import type { Listing } from '@/components/marketplace/ListingCard';
import { ViewToggle } from '@/components/marketplace/ViewToggle';
import { CitySearch } from '@/components/marketplace/CitySearch';
import type { MapViewHandle, MapViewProps } from '@/components/marketplace/MapView';
import { SegmentedTabs } from '@/components/mobile/SegmentedTabs';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { filterListings, sortListings, mergeDemoOverlay, type ListingFilters } from '@/lib/listing/marketplaceFilters';
import styles from './page.module.css';

// SSR-safe map import — dynamic + forwardRef birlikte ForwardRefExoticComponent olarak tip verilmeli
const MapView = dynamic<MapViewProps>(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    { ssr: false, loading: () => <div className={styles.mapLoading}>🗺 Harita yükleniyor…</div> }
) as ForwardRefExoticComponent<MapViewProps & RefAttributes<MapViewHandle>>;

type View = 'split' | 'map' | 'list';

const DEFAULT_FILTERS: ListingFilters = {
    type: ['KAT_KARSILIGI'],
    minSize: 200,
    maxSize: 10000,
    imar: [],
    fizibiliteOnly: false,
    minScore: 10,
};

// Mock listings enriched with fizibilite data
const MOCK_LISTINGS_EXTRA = [
    { fizibiliteSkoru: 83, arsaPayiMin: 30, arsaPayiMax: 46, changePercent: 42.8, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 34, arsaPayiMax: 48, changePercent: 44.3, zoning: 'KARMA', isNew: false },
    { fizibiliteSkoru: 82, arsaPayiMin: 35, arsaPayiMax: 48, changePercent: 48.8, zoning: 'TICARI', isNew: true },
    { fizibiliteSkoru: 88, arsaPayiMin: 23, arsaPayiMax: 34, changePercent: 36.1, zoning: 'KONUT', isNew: true },
    { fizibiliteSkoru: 76, arsaPayiMin: 28, arsaPayiMax: 40, changePercent: 28.5, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 64, arsaPayiMin: 25, arsaPayiMax: 38, changePercent: 18.2, zoning: 'TARIM', isNew: false },
    { fizibiliteSkoru: 91, arsaPayiMin: 32, arsaPayiMax: 45, changePercent: 55.3, zoning: 'KARMA', isNew: true },
    { fizibiliteSkoru: 58, arsaPayiMin: 22, arsaPayiMax: 35, changePercent: -8.4, zoning: 'KONUT', isNew: false },
    { fizibiliteSkoru: 79, arsaPayiMin: 30, arsaPayiMax: 42, changePercent: 31.7, zoning: 'TICARI', isNew: false },
    { fizibiliteSkoru: 86, arsaPayiMin: 33, arsaPayiMax: 46, changePercent: 46.2, zoning: 'KONUT', isNew: true },
];

export default function MarketplacePage() {
    return (
        <Suspense fallback={<div className={styles.suspenseFallback}>Yükleniyor...</div>}>
            <MarketplaceContent />
        </Suspense>
    );
}

function MarketplaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [view, setView] = useState<View>((searchParams.get('view') as View) || 'split');
    const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    // Ekranda uydurma veri var mi, ve ne kadari?
    //   'all'         → ilanlarin TAMAMI ornek (API bos dondu veya hata verdi)
    //   'fizibilite'  → ilanlar gercek, ama skor/arsa payi/imar alanlari ornek
    // Bu alanlar (fizibiliteSkoru, arsaPayiMin/Max, imarDurumu) Prisma
    // semasinda HIC yok; API onlari donduremez. Veriler gercekten toplanana
    // kadar ekranda acikca isaretleniyorlar.
    const [demoData, setDemoData] = useState<'none' | 'fizibilite' | 'all'>('none');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('score_desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCity, setSelectedCity] = useState('İstanbul');
    const mapRef = useRef<MapViewHandle>(null);

    useEffect(() => {
        const saved = localStorage.getItem('arsabil-marketplace-view') as View | null;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage'dan başlangıç görünüm tercihi okunuyor
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- bileşen montajında ilan listesi çekiliyor
        setLoading(true);
        fetch('/api/listings')
            .then(r => r.json())
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                // Enrich API data with mock fizibilite fields for demo
                const enriched = (arr as Listing[]).map((l, i): Listing =>
                    mergeDemoOverlay(l, MOCK_LISTINGS_EXTRA[i % MOCK_LISTINGS_EXTRA.length] || {})
                );
                // If no listings from API, add mock data
                if (enriched.length === 0) {
                    const mock: Listing[] = Array.from({ length: 10 }, (_, i) => ({
                        id: `mock-${i}`,
                        title: `${600 + i * 80} m² Arsa`,
                        type: (i % 3 === 0 ? 'SALE' : 'KAT_KARSILIGI') as Listing['type'],
                        city: 'İstanbul',
                        district: ['Beşiktaş', 'Kadıköy', 'Şişli', 'Ümraniye', 'Maltepe'][i % 5],
                        price: i % 3 === 0 ? (5000000 + i * 500000) : 0,
                        report: { landShareRatio: 0.35, minApartmentPrice: 5000000 + i * 500000 },
                        ...MOCK_LISTINGS_EXTRA[i],
                    }));
                    setListings(mock);
                    setDemoData('all');
                } else {
                    setListings(enriched);
                    setDemoData('fizibilite');
                }
                setLoading(false);
            })
            .catch(() => {
                const mock: Listing[] = Array.from({ length: 10 }, (_, i) => ({
                    id: `mock-${i}`,
                    title: `${600 + i * 80} m² Arsa`,
                    type: (i % 3 === 0 ? 'SALE' : 'KAT_KARSILIGI') as Listing['type'],
                    city: 'İstanbul',
                    district: ['Beşiktaş', 'Kadıköy', 'Şişli', 'Ümraniye', 'Maltepe'][i % 5],
                    price: i % 3 === 0 ? (5000000 + i * 500000) : 0,
                    report: { landShareRatio: 0.35, minApartmentPrice: 5000000 + i * 500000 },
                    ...MOCK_LISTINGS_EXTRA[i],
                }));
                setListings(mock);
                setDemoData('all');
                setLoading(false);
            });
    }, []);

    const filtered = filterListings(listings, filters);
    const sorted = sortListings(filtered, sortBy);

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
                        }} className={`${styles.quickChip} ${active ? styles.quickChipActive : ''}`}>{label}</button>
                    );
                })}

                {/* Spacer (Hidden on mobile via CSS or flex logic) */}
                <div className={styles.desktopOnlySpacer} />

                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="score_desc">En Yüksek Skor</option>
                    <option value="price_asc">En Uygun Fiyat</option>
                    <option value="newest">En Yeniler</option>
                </select>

                {/* View Toggle */}
                <div className={styles.desktopViewToggle}>
                    <ViewToggle view={view} onChange={handleViewChange} />
                </div>
            </div>

            {/* ── Örnek veri uyarısı ── */}
            {!loading && demoData !== 'none' && (
                <div className={styles.demoBanner} role="status">
                    <strong>Örnek veri</strong>
                    {demoData === 'all'
                        ? ' — Şu anda yayında ilan bulunmadığı için bu listedeki ilanların tamamı tanıtım amaçlı örnektir.'
                        : ' — İlanlar gerçek, ancak fizibilite skoru, arsa payı aralığı ve imar durumu henüz toplanmadığı için örnek değerlerle gösteriliyor.'}
                </div>
            )}

            {/* ── Mobil kontroller: görünüm + filtre ── */}
            <div className={styles.mobileControls}>
                <SegmentedTabs
                    ariaLabel="Görünüm"
                    options={[{ value: 'list', label: 'İlanlar' }, { value: 'map', label: 'Harita' }]}
                    value={mobileTab}
                    onChange={(v) => setMobileTab(v as 'list' | 'map')}
                />
                <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)}>
                    ⚙ Filtreler
                </button>
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
                    <div className={`${styles.listPanel} ${view === 'list' ? styles.listPanelFull : styles.listPanelSplit}`}>
                        {loading ? (
                            <div className={styles.skeletonList}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={`${styles.skeletonItem} ${view === 'list' ? styles.skeletonItemList : styles.skeletonItemSplit}`} />
                                ))}
                            </div>
                        ) : paginated.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>🔍</div>
                                Kriterlere uyan ilan bulunamadı.
                            </div>
                        ) : (
                            <>
                                {/* Count */}
                                <div className={styles.countLabel}>
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
                                    <div className={styles.pagination}>
                                        {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setCurrentPage(p)}
                                                className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}>{p}</button>
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

            {/* ── Mobil filtre sheet'i ── */}
            <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
                <FilterSidebar
                    inSheet
                    filters={filters}
                    onChange={setFilters}
                    totalCount={sorted.length}
                    onApply={() => setFilterOpen(false)}
                />
            </BottomSheet>
        </div>
    );
}
