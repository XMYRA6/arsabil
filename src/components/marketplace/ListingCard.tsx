"use client";

import Image from 'next/image';
import { FizibiliteScoreBadge } from './FizibiliteScoreBadge';
import { useRouter } from 'next/navigation';

function seededInt(seed: string, min: number, max: number): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) { h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0; }
    return min + (Math.abs(h) % (max - min + 1));
}

export interface Listing {
    id: string;
    title: string;
    type: 'SALE' | 'KAT_KARSILIGI' | 'ORTAKLIK';
    city?: string;
    district?: string;
    m2?: number;
    price?: number;
    arsaPayiMin?: number;
    arsaPayiMax?: number;
    fizibiliteSkoru?: number;
    emsalFiyat?: number;
    imarDurumu?: string;
    photoUrl?: string;
    isNew?: boolean;
    changePercent?: number;
    report?: { landShareRatio?: number; minApartmentPrice?: number };
}

interface Props {
    listing: Listing;
    highlighted?: boolean;
    view?: 'split' | 'list' | 'map';
    onHover?: (id: string | null) => void;
    isFavorite?: boolean;
    onFavoriteToggle?: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
    SALE: 'Satış',
    KAT_KARSILIGI: 'Kat Karşılığı',
    ORTAKLIK: 'Ortaklık',
};

const IMAR_LABEL: Record<string, string> = {
    KONUT: 'Konut',
    TICARET: 'Ticaret',
    KONUT_TICARET: 'Konut + Ticaret',
    DIGER: 'Diğer',
};

export function ListingCard({ listing, highlighted, view, onHover, isFavorite, onFavoriteToggle }: Props) {
    const router = useRouter();
    const score = listing.fizibiliteSkoru ?? seededInt(listing.id, 50, 90);
    const price = listing.price ?? listing.report?.minApartmentPrice ?? 0;
    const payiMin = listing.arsaPayiMin ?? (listing.report?.landShareRatio ? listing.report.landShareRatio * 100 * 0.85 : 28);
    const payiMax = listing.arsaPayiMax ?? (listing.report?.landShareRatio ? listing.report.landShareRatio * 100 * 1.15 : 42);
    const change = listing.changePercent ?? (seededInt(listing.id + 'c', 0, 9) > 2
        ? +(seededInt(listing.id + 'v', 5, 60) / 10).toFixed(1)
        : -(seededInt(listing.id + 'n', 1, 15) / 10).toFixed(1));
    const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
    const scoreRgb = score >= 80 ? 'var(--green-rgb)' : score >= 60 ? 'var(--orange-rgb)' : 'var(--red-rgb)';
    const typeRgb = listing.type === 'SALE' ? 'var(--info-rgb)' : 'var(--green-rgb)';
    const isList = view === 'list';

    /* ───────────────── LIST VIEW (row card) ───────────────── */
    if (isList) {
        return (
            <div
                onMouseEnter={() => onHover?.(listing.id)}
                onMouseLeave={() => onHover?.(null)}
                onClick={() => router.push(`/listing/${listing.id}`)}
                style={{
                    display: 'flex', alignItems: 'stretch',
                    background: highlighted ? 'rgba(var(--primary-rgb),.06)' : 'var(--bg)',
                    border: highlighted ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    boxShadow: highlighted ? '0 6px 20px rgba(var(--primary-rgb),.15)' : '0 2px 8px rgba(0,0,0,.06)',
                    minHeight: 120,
                }}
            >
                {/* Photo */}
                <div style={{
                    width: 180, flexShrink: 0, position: 'relative', overflow: 'hidden',
                }}>
                    {listing.photoUrl ? (
                        <Image fill unoptimized src={listing.photoUrl} alt={listing.title} style={{ objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: '100%', height: '100%',
                            background: `linear-gradient(135deg, hsl(${220 + (listing.id.charCodeAt(0) % 60)}, 50%, 20%), hsl(${200 + (listing.id.charCodeAt(0) % 60)}, 60%, 15%))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', opacity: 0.6,
                        }}>🏗️</div>
                    )}
                    {/* Score overlay */}
                    <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                        <FizibiliteScoreBadge score={score} size="md" />
                    </div>
                    {/* New badge */}
                    {listing.isNew && (
                        <span style={{
                            position: 'absolute', top: 8, right: 8,
                            background: 'var(--red)', color: 'white',
                            fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                        }}>🔥 Yeni</span>
                    )}
                </div>

                {/* ─── Content middle ─── */}
                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
                    {/* Price + type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {price > 0 ? (
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--card-title)' }}>
                                {price.toLocaleString('tr-TR')} TL
                            </span>
                        ) : (
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--card-title)' }}>
                                {payiMin.toFixed(0)}–{payiMax.toFixed(0)}%
                            </span>
                        )}
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)' }}>
                            {TYPE_LABEL[listing.type] ?? 'Kat Karşılığı'}
                        </span>
                        {listing.type !== 'SALE' && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 500 }}>/ Ortaklık</span>
                        )}
                    </div>

                    {/* Location */}
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📍 {listing.district || 'Beşiktaş'}, {listing.city || 'İstanbul'}
                        {listing.imarDurumu && <> · {IMAR_LABEL[listing.imarDurumu] ?? listing.imarDurumu}</>}
                    </div>

                    {/* Fizibilite score inline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: `rgba(${scoreRgb},0.09)`, border: `1.5px solid rgba(${scoreRgb},0.27)`,
                            borderRadius: 8, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800, color: scoreColor,
                        }}>
                            Fizibilite Skoru {score}<span style={{ fontSize: '0.6rem', fontWeight: 600 }}>/100</span>
                        </span>
                        <span style={{
                            fontSize: '0.72rem', fontWeight: 800,
                            color: change >= 0 ? 'var(--green)' : 'var(--red)',
                            display: 'inline-flex', alignItems: 'center', gap: 2,
                        }}>
                            📈 {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* ─── Right actions ─── */}
                <div style={{
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
                    padding: '14px 16px', borderLeft: '1px solid var(--border)', flexShrink: 0,
                    minWidth: 130,
                }}>
                    <button
                        onClick={e => { e.stopPropagation(); router.push(`/listing/${listing.id}?tab=scenario`); }}
                        style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: 8, background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
                    >🧮 Senaryo</button>
                    <button
                        onClick={e => { e.stopPropagation(); router.push(`/listing/${listing.id}`); }}
                        style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: 8, background: 'transparent', color: 'var(--muted)', border: '1.5px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
                    >📋 Detay</button>
                    <button
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: 8, background: 'rgba(var(--green-rgb),.10)', color: 'var(--green)', border: '1.5px solid rgba(var(--green-rgb),.25)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
                    >📤 Teklif Ver</button>
                    {onFavoriteToggle && (
                        <button
                            onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                onFavoriteToggle(listing.id)
                            }}
                            title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                padding: '4px',
                                lineHeight: 1,
                                transition: 'transform 0.15s',
                            }}
                        >
                            {isFavorite ? '❤️' : '🤍'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ───────────────── SPLIT / COLUMN VIEW (card) ───────────────── */
    return (
        <div
            onMouseEnter={() => onHover?.(listing.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => router.push(`/listing/${listing.id}`)}
            style={{
                display: 'flex', flexDirection: 'column',
                background: highlighted ? 'rgba(var(--primary-rgb),.08)' : 'var(--bg)',
                border: highlighted ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: highlighted ? '0 8px 30px rgba(var(--primary-rgb),.20)' : '0 2px 8px rgba(0,0,0,.06)',
                position: 'relative',
            }}
        >
            {/* Photo */}
            <div style={{
                width: '100%', height: 140, flexShrink: 0,
                background: 'linear-gradient(135deg, #1a3a6e, #0b2443)',
                position: 'relative', overflow: 'hidden',
            }}>
                {listing.photoUrl ? (
                    <Image fill unoptimized src={listing.photoUrl} alt={listing.title} style={{ objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: `linear-gradient(135deg, hsl(${220 + (listing.id.charCodeAt(0) % 60)}, 50%, 20%), hsl(${200 + (listing.id.charCodeAt(0) % 60)}, 60%, 15%))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', opacity: 0.6,
                    }}>🏗️</div>
                )}
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <FizibiliteScoreBadge score={score} size="sm" />
                </div>
                {listing.isNew && (
                    <span style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'var(--red)', color: 'white',
                        fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                    }}>🔥 Yeni</span>
                )}
                <span style={{
                    position: 'absolute', bottom: 6, left: 6,
                    background: `rgba(${typeRgb},0.8)`, color: 'white',
                    fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                    backdropFilter: 'blur(4px)',
                }}>{TYPE_LABEL[listing.type] ?? 'Kat Karşılığı'}</span>
            </div>

            {/* Content */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {price > 0 ? (
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--card-title)' }}>
                            {(price / 1000000).toFixed(1)}M TL
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--card-title)' }}>
                            {payiMin.toFixed(0)}–{payiMax.toFixed(0)}%
                        </span>
                    )}
                    <span style={{
                        fontSize: '0.65rem', fontWeight: 800,
                        color: change >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {listing.district || 'Beşiktaş'}, {listing.city || 'İstanbul'}
                </div>
                {/* Score bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: scoreColor }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: scoreColor }}>{score}</span>
                </div>
            </div>

            {/* Favorite button — absolute top-right of card */}
            {onFavoriteToggle && (
                <button
                    onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onFavoriteToggle(listing.id)
                    }}
                    title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                    style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '6px',
                        lineHeight: 1,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        transition: 'transform 0.15s',
                    }}
                >
                    {isFavorite ? '❤️' : '🤍'}
                </button>
            )}
        </div>
    );
}
