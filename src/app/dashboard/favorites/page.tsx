"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

type Favorite = {
    id: string;
    listingId: string;
    createdAt: string;
    listing?: {
        id: string;
        title?: string | null;
        city?: string | null;
        district?: string | null;
        price?: number | null;
        type?: string | null;
        photos?: string[] | null;
        report?: { title?: string | null; landShareRatio?: number | null } | null;
        _count?: { offers: number };
    } | null;
};

/** ListingCard.tsx'teki fotosuz-durum placeholder desenini yeniden kullanır (id'ye bağlı hue varyasyonu). */
function photoPlaceholderGradient(id: string): string {
    const hue = 220 + (id.charCodeAt(0) % 60);
    return `linear-gradient(135deg, hsl(${hue}, 50%, 20%), hsl(${hue - 20}, 60%, 15%))`;
}

export default function FavoritesPage() {
    const { status } = useSession();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (status !== 'authenticated') return;
        setLoading(true);
        setError(false);
        fetch('/api/favorites')
            .then(res => {
                if (!res.ok) throw new Error('favorites fetch failed');
                return res.json();
            })
            .then(data => setFavorites(Array.isArray(data) ? data : []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [status]);

    if (loading) return <StateCard label="Favoriler" text="Yükleniyor..." />;
    if (error) return <StateCard label="Bağlantı" text="Favoriler yüklenemedi. Lütfen sayfayı yenileyin." alert />;

    return (
        <main className={styles.portfolioShell}>
            <header className={styles.heroCard}>
                <div>
                    <p className={styles.eyebrow}>Kaydedilen ilanlar</p>
                    <h1>Favorilerim</h1>
                    <p>Takibe aldığın arsaları ve kat karşılığı fırsatlarını tek listede karşılaştır.</p>
                </div>
                <div className={styles.heroMetric}>
                    <span>{favorites.length}</span>
                    <small>Favori</small>
                </div>
            </header>

            {favorites.length === 0 ? (
                <section className={styles.emptyCard}>
                    <span className={styles.emptyIcon}>F</span>
                    <h2>Henüz favori ilan yok</h2>
                    <p>Pazar yerinde beğendiğin ilanları kaydettiğinde burada görünecek.</p>
                    <Link href="/marketplace" className={styles.primaryLink}>Pazar yerine git</Link>
                </section>
            ) : (
                <section className={styles.listStack} aria-label="Favori ilanlar">
                    {favorites.map(favorite => {
                        const listing = favorite.listing;
                        const title = listing?.title || listing?.report?.title || 'İlan';
                        const photoUrl = listing?.photos?.[0];
                        return (
                            <Link key={favorite.id} href={`/listing/${favorite.listingId}`} className={styles.itemCard}>
                                <div
                                    className={styles.itemPhoto}
                                    style={!photoUrl ? { background: photoPlaceholderGradient(favorite.listingId) } : undefined}
                                >
                                    {photoUrl && (
                                        <Image fill unoptimized src={photoUrl} alt={title} style={{ objectFit: 'cover' }} />
                                    )}
                                </div>
                                <div className={styles.itemBody}>
                                    <div className={styles.itemTopline}>
                                        <span>{listing?.type || 'KAT_KARSILIGI'}</span>
                                        <strong>{listing?._count?.offers ?? 0} teklif</strong>
                                    </div>
                                    <h2>{title}</h2>
                                    <p>{[listing?.district, listing?.city].filter(Boolean).join(', ') || 'Konum belirtilmedi'}</p>
                                    <div className={styles.metricRow}>
                                        <div><span>Fiyat</span><strong>{listing?.price ? `₺${listing.price.toLocaleString('tr-TR')}` : 'Yok'}</strong></div>
                                        <div><span>Arsa payı</span><strong>{listing?.report?.landShareRatio != null ? `%${(listing.report.landShareRatio * 100).toFixed(0)}` : 'Yok'}</strong></div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
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