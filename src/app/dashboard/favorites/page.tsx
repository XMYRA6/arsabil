"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { resolveScene } from '@/lib/dioramas/scene';
import { sahneSec } from '../sahneSec';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import styles from '../panelListe.module.css';

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
        zoning?: string | null;
        photos?: string[] | null;
        report?: { title?: string | null; landShareRatio?: number | null } | null;
        _count?: { offers: number };
    } | null;
};

export default function FavoritesPage() {
    const { status } = useSession();
    const zaman = useThemeZaman();
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

    const favoridenCikar = async (favorite: Favorite) => {
        try {
            const res = await fetch(`/api/favorites/${favorite.listingId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('delete failed');
            setFavorites(prev => prev.filter(f => f.id !== favorite.id));
        } catch {
            toast.error('Favoriden çıkarılamadı, tekrar dene.');
        }
    };

    if (loading) return <div className={styles.state}>Yükleniyor...</div>;
    if (error) return <div className={`${styles.state} ${styles.error}`} role="alert">Favoriler yüklenemedi. Lütfen sayfayı yenileyin.</div>;

    return (
        <main className={styles.shell}>
            <header className={styles.head}>
                <div>
                    <h1>Favorilerim</h1>
                    <p>Takibe aldığın arsaları ve kat karşılığı fırsatlarını tek listede karşılaştır.</p>
                </div>
                <span className={styles.countPill}>{favorites.length} favori</span>
            </header>

            {favorites.length === 0 ? (
                <section className={styles.empty}>
                    <h2>Henüz favori ilan yok</h2>
                    <p>Pazar yerinde beğendiğin ilanları kaydettiğinde burada görünecek.</p>
                    <Link href="/marketplace" className={styles.btn}>Pazar yerine git</Link>
                </section>
            ) : (
                <section className={styles.grid3} aria-label="Favori ilanlar">
                    {favorites.map(favorite => {
                        const listing = favorite.listing;
                        const title = listing?.title || listing?.report?.title || 'İlan';
                        const photoUrl = listing?.photos?.[0];
                        const diorama = photoUrl ? null : resolveScene({ ...sahneSec(listing?.type, listing?.zoning), egim: 'duz', zaman });
                        const konum = [listing?.district, listing?.city].filter(Boolean).join(' · ');
                        const pay = listing?.report?.landShareRatio;
                        return (
                            <article key={favorite.id} className={styles.photoCard}>
                                <Link href={`/listing/${favorite.listingId}`} className={styles.photoTop} aria-label={title}>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- harici ilan fotoğrafı / yerel statik WebP */}
                                    {photoUrl ? <img src={photoUrl} alt={title} /> : diorama ? <img src={diorama.src800} alt="" loading="lazy" /> : null}
                                </Link>
                                <div className={styles.photoBody}>
                                    <Link href={`/listing/${favorite.listingId}`} className={styles.photoTitle}>
                                        {konum || title}
                                    </Link>
                                    <div className={styles.price}>{listing?.price ? `₺${listing.price.toLocaleString('tr-TR')}` : 'Fiyat yok'}</div>
                                    <div className={styles.photoFoot}>
                                        <span>Arsa payı: {pay != null ? `%${(pay * 100).toFixed(0)}` : '—'}</span>
                                        <button type="button" className={styles.unfav} onClick={() => favoridenCikar(favorite)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                            Favoriden çıkar
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </main>
    );
}
