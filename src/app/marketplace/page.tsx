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
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { MobileState } from '@/components/mobile/MobileState';
import { filterListings, sortListings, LISTING_TYPE_GROUPS, isTypeGroupActive, toggleTypeGroup, type ListingFilters } from '@/lib/listing/marketplaceFilters';
import styles from './page.module.css';

// SSR-safe map import — dynamic + forwardRef birlikte ForwardRefExoticComponent olarak tip verilmeli
const MapView = dynamic<MapViewProps>(
    () => import('@/components/marketplace/MapView').then(m => m.MapView),
    { ssr: false, loading: () => <MobileState variant='loading' title='Harita yükleniyor' description='Konum katmanı hazırlanıyor.' className={styles.mapLoading} /> }
) as ForwardRefExoticComponent<MapViewProps & RefAttributes<MapViewHandle>>;

type View = 'split' | 'map' | 'list';

const DEFAULT_FILTERS: ListingFilters = {
    type: ['KAT_KARSILIGI', 'ORTAKLIK'],
    minSize: 0,
    maxSize: 1000000,
    imar: [],
    fizibiliteOnly: false,
    minScore: 10,
};

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

    // Figma 07: yalnız İlanlar / Harita. Eski `split` (URL veya localStorage'da kalmış) İlanlar'a düşer.
    const normalizeView = (v: string | null): View => (v === 'map' ? 'map' : 'list');
    const [view, setView] = useState<View>(normalizeView(searchParams.get('view')));
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCity, setSelectedCity] = useState('İstanbul');
    const mapRef = useRef<MapViewHandle>(null);

    useEffect(() => {
        const saved = localStorage.getItem('arsabil-marketplace-view') as View | null;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage'dan başlangıç görünüm tercihi okunuyor
        if (saved) setView(normalizeView(saved));
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
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(data => {
                setListings(Array.isArray(data) ? (data as Listing[]) : []);
                setLoadError(false);
            })
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    }, []);

    const filtered = filterListings(listings, filters);
    const sorted = sortListings(filtered, sortBy);

    const PER_PAGE = 6;
    const paginated = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const totalPages = Math.ceil(sorted.length / PER_PAGE);

    /* ===================== RENDER ===================== */
    return (
        <div className={styles.container}>
            <header className={styles.pageHead}>
                <div>
                    <p className={styles.eyebrow}>Pazar yeri</p>
                    <h1 className={styles.title}>Kat karşılığı ve satılık arsalar</h1>
                    <p className={styles.subtitle}>
                        Her ilan için senaryo hesapla, teklif ver.
                    </p>
                </div>
            </header>

            {/* ── Araç çubuğu: şehir/ilçe arama, sıralama, görünüm ── */}
            <div className={styles.toolbar}>
                <div className={styles.search}>
                    <CitySearch
                        selectedCity={selectedCity}
                        onCitySelect={(city) => {
                            setSelectedCity(city.name);
                            mapRef.current?.flyTo(city.lat, city.lng, city.zoom);
                            mapRef.current?.showProvinceBorder(city.province ?? city.name);
                        }}
                    />
                </div>

                <select aria-label="Sıralama" value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="newest">En yeniler</option>
                    <option value="price_asc">En uygun fiyat</option>
                </select>

                <div className={styles.viewToggle}>
                    <ViewToggle view={view} onChange={handleViewChange} />
                </div>

                <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)} aria-label="Filtreler">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 5h18l-7 8v6l-4-2v-4z" />
                    </svg>
                </button>
            </div>

            {/* Hızlı filtre çipleri — FilterSidebar'daki "İlan tipi" ile AYNI paylaşılan tanım+mantık
                (Impeccable critique P1, 2026-09-17). Yalnız mobilde görünür; masaüstünde kenar çubuğu var. */}
            <div className={styles.quickRow}>
                {LISTING_TYPE_GROUPS.map(({ key, ids, label }) => {
                    const active = isTypeGroupActive(filters, ids);
                    return (
                        <button key={key} type="button" aria-pressed={active} onClick={() => {
                            setFilters(f => toggleTypeGroup(f, ids));
                        }} className={`${styles.quickChip} ${active ? styles.quickChipActive : ''}`}>{label}</button>
                    );
                })}
            </div>

            <div className={styles.layout} data-view={view}>
                <div className={styles.sidebarWrapper}>
                    <FilterSidebar filters={filters} onChange={setFilters} totalCount={sorted.length} />
                </div>

                <div className={styles.content}>
                    {view === 'list' ? (
                        loading ? (
                            <div className={styles.grid}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={styles.skeletonItem} />
                                ))}
                            </div>
                        ) : loadError ? (
                            <MobileState
                                variant="error"
                                title="İlanlar yüklenemedi"
                                description="Bağlantını kontrol edip sayfayı yenile."
                                className={styles.emptyState}
                            />
                        ) : paginated.length === 0 ? (
                            <MobileState
                                variant="empty"
                                title={listings.length === 0 ? 'Henüz yayında ilan yok' : 'Kriterlere uyan ilan bulunamadı'}
                                description={listings.length === 0 ? 'İlk ilan yayınlandığında burada görünecek.' : 'Filtreleri genişleterek daha fazla arsayı görebilirsin.'}
                                className={styles.emptyState}
                            />
                        ) : (
                            <>
                                <p className={styles.countLabel}>
                                    {sorted.length.toLocaleString('tr-TR')} ilan · {selectedCity}
                                                </p>
                                <div className={styles.grid}>
                                    {paginated.map(listing => (
                                        <ListingCard
                                            key={listing.id}
                                            listing={listing}
                                            highlighted={highlightedId === listing.id}
                                            view="list"
                                            onHover={setHighlightedId}
                                        />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className={styles.pagination}>
                                        {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setCurrentPage(p)}
                                                className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    ) : (
                        <div className={styles.mapPanel}>
                            <MapView
                                ref={mapRef}
                                listings={sorted}
                                highlightedId={highlightedId}
                                onHighlight={setHighlightedId}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobil filtre sheet'i ── */}
            <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtreler" showCloseButton keepGrabber>
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
