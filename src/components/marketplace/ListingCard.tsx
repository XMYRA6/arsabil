"use client";

import Image from 'next/image';
import type { KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resolveScene, type Tur } from '@/lib/dioramas/scene';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import styles from './ListingCard.module.css';

export interface Listing {
    id: string;
    title: string;
    type: 'SALE' | 'KAT_KARSILIGI' | 'ORTAKLIK';
    city?: string;
    district?: string;
    price?: number;
    landSizeSqm?: number | null;
    arsaPayiMin?: number;
    arsaPayiMax?: number;
    fizibiliteSkoru?: number;
    emsalFiyat?: number;
    zoning?: string;
    photos?: string[];
    isNew?: boolean;
    changePercent?: number;
    createdAt?: string;
    report?: { landShareRatio?: number; minApartmentPrice?: number };
}

interface Props {
    listing: Listing;
    highlighted?: boolean;
    /** Eski 'split'/'list' ayrımı kalktı (Figma 07: tek kart düzeni); geriye dönük uyum için kabul edilir. */
    view?: 'split' | 'list' | 'map';
    onHover?: (id: string | null) => void;
    isFavorite?: boolean;
    onFavoriteToggle?: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
    SALE: 'Satış',
    KAT_KARSILIGI: 'Kat karşılığı',
    ORTAKLIK: 'Ortaklık',
};

const IMAR_LABEL: Record<string, string> = {
    KONUT: 'Konut',
    TICARI: 'Ticari',
    KARMA: 'Karma',
    TARIM: 'Tarım',
};

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const trPct = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** İlan türü + imar durumundan diorama sahnesi (fotoğraf yokken gösterilir). */
function sahneSec(listing: Listing): { tur: Tur; varyant: string } {
    if (listing.type === 'KAT_KARSILIGI') return { tur: 'kat', varyant: 'bitmis' };
    if (listing.type === 'ORTAKLIK') return { tur: 'ticari', varyant: 'ofis' };
    switch (listing.zoning) {
        case 'TARIM': return { tur: 'tarla', varyant: 'bugday' };
        case 'TICARI': return { tur: 'ticari', varyant: 'ofis' };
        case 'KONUT': return { tur: 'villa', varyant: 'modern' };
        default: return { tur: 'arsa', varyant: 'agacsiz' };
    }
}

function skorEtiketi(score: number): { text: string; tone: 'good' | 'mid' | 'bad' } {
    if (score >= 80) return { text: 'Yüksek', tone: 'good' };
    if (score >= 60) return { text: 'Orta', tone: 'mid' };
    return { text: 'Riskli', tone: 'bad' };
}

export function ListingCard({ listing, highlighted, onHover, isFavorite, onFavoriteToggle }: Props) {
    const router = useRouter();
    const zaman = useThemeZaman();
    const photoUrl = listing.photos?.[0];
    // Skor, arsa payı aralığı ve değişim yüzdesi yalnız gerçekten hesaplanmışsa gösterilir;
    // eksikse uydurma varsayılan üretilmez (PRODUCT.md ilke #1).
    const score = listing.fizibiliteSkoru ?? null;
    const price = listing.price ?? listing.report?.minApartmentPrice ?? 0;
    const payiMetni = listing.arsaPayiMin != null && listing.arsaPayiMax != null
        ? `%${listing.arsaPayiMin.toFixed(0)}–${listing.arsaPayiMax.toFixed(0)}`
        : listing.report?.landShareRatio
            ? `%${(listing.report.landShareRatio * 100).toFixed(0)}`
            : null;
    const change = listing.changePercent ?? null;
    const etiket = score !== null ? skorEtiketi(score) : null;
    const perM2 = price > 0 && listing.landSizeSqm ? Math.round(price / listing.landSizeSqm) : null;
    const imarMetni = listing.zoning
        ? (listing.zoning === 'KONUT' ? 'İmarlı konut' : IMAR_LABEL[listing.zoning] ?? listing.zoning)
        : null;
    const baslik = listing.district || listing.title;
    const sahne = sahneSec(listing);
    const diorama = photoUrl ? null : resolveScene({ ...sahne, egim: 'duz', zaman });

    // Tüm kart tıklanabilir ama klavye/switch-access ile erişilemiyordu
    // (Impeccable audit P1, 2026-09-17) — role="link"+tabIndex+onKeyDown
    // gerçek bir <a> yerine tercih edildi çünkü iç içe butonlar zaten
    // stopPropagation ile korunuyor, <a> içinde <button> geçersiz HTML olurdu.
    const acDetay = () => router.push(`/listing/${listing.id}`);
    const detayKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            acDetay();
        }
    };

    return (
        <div
            className={`${styles.cardRoot} ${highlighted ? styles.highlighted : ''}`}
            role="link"
            data-press=""
            tabIndex={0}
            aria-label={listing.title}
            onMouseEnter={() => onHover?.(listing.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={acDetay}
            onKeyDown={detayKeyDown}
            style={{ flexShrink: 0 }}
        >
            <div className={styles.photoFrame}>
                {photoUrl ? (
                    <Image fill unoptimized src={photoUrl} alt={listing.title} style={{ objectFit: 'cover' }} />
                ) : diorama ? (
                    // eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP; next/image gerekmiyor
                    <img className={styles.diorama} src={diorama.src800} alt="" loading="lazy" />
                ) : null}

                <div className={styles.badges}>
                    <span className={`${styles.badge} ${listing.type === 'SALE' ? styles.badgeSale : styles.badgeKat}`}>
                        {TYPE_LABEL[listing.type] ?? 'Kat karşılığı'}
                    </span>
                    {listing.isNew && <span className={`${styles.badge} ${styles.badgeNew}`}>Yeni</span>}
                </div>

                {onFavoriteToggle && (
                    <button
                        type="button"
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFavoriteToggle(listing.id);
                        }}
                        title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                        aria-label={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                        aria-pressed={!!isFavorite}
                        className={styles.favoriteButton}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className={styles.body}>
                <div className={styles.titleRow}>
                    <div className={styles.titleCol}>
                        <h3 className={styles.title}>{baslik}</h3>
                        <p className={styles.sub}>{listing.city || 'İstanbul'}</p>
                    </div>
                    {score !== null && etiket && (
                        <span className={`${styles.score} ${styles[`score_${etiket.tone}`]}`} title={`Fizibilite Skoru ${score}/100 (${etiket.text}) — arsa payı, risk ve piyasa verisinden hesaplanır`}>
                            {score} · {etiket.text}
                        </span>
                    )}
                </div>

                <div className={styles.priceRow}>
                    {price > 0 ? (
                        <>
                            <span className={styles.price}>₺{trNum.format(price)}</span>
                            {perM2 !== null && <span className={styles.perM2}>₺{trNum.format(perM2)}/m²</span>}
                        </>
                    ) : payiMetni ? (
                        <span className={styles.price}>{payiMetni}</span>
                    ) : (
                        <span className={styles.price}>Fiyat belirtilmemiş</span>
                    )}
                </div>

                <p className={styles.meta}>
                    {listing.landSizeSqm != null && <span>{trNum.format(listing.landSizeSqm)} m²</span>}
                    {imarMetni && <span>{imarMetni}</span>}
                    {change !== null && (
                        <span className={change >= 0 ? styles.up : styles.down}>
                            {change >= 0 ? '+' : '−'}%{trPct.format(Math.abs(change))}
                        </span>
                    )}
                </p>

                {listing.type !== 'SALE' && payiMetni && (
                    <div className={styles.payi}>
                        <span>Arsa payı</span>
                        <strong>{payiMetni}</strong>
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.actionSoft}
                        onClick={e => { e.stopPropagation(); router.push(`/listing/${listing.id}?tab=scenario`); }}
                    >
                        Senaryo
                    </button>
                    <button
                        type="button"
                        className={styles.actionSoft}
                        onClick={e => { e.stopPropagation(); router.push(`/listing/${listing.id}`); }}
                    >
                        Detay
                    </button>
                    <button
                        type="button"
                        className={styles.actionPrimary}
                        onClick={e => { e.stopPropagation(); router.push(`/listing/${listing.id}?tab=teklifler`); }}
                    >
                        Teklif ver
                    </button>
                </div>
            </div>
        </div>
    );
}
