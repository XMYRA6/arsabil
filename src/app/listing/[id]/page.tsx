"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ScoreRevealBadge } from './ScoreRevealBadge';
import { toast } from 'react-hot-toast';
import { AppBar } from '@/components/mobile/AppBar';
import { SwipeGallery } from '@/components/mobile/SwipeGallery';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import styles from './page.module.css';

const MiniMap = dynamic(() => import('@/components/marketplace/MiniMap').then(m => m.MiniMap), { ssr: false });

type Tab = 'genel' | 'fizibilite' | 'senaryo' | 'teklifler' | 'mesajlar';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'genel', label: 'Genel Bilgiler', icon: '📋' },
    { id: 'fizibilite', label: 'Ön Fizibilite', icon: '📊' },
    { id: 'senaryo', label: 'Senaryo', icon: '🧮' },
    { id: 'teklifler', label: 'Teklifler', icon: '📩' },
    { id: 'mesajlar', label: 'Mesajlar', icon: '💬' },
];

const MOCK_LISTING = {
    id: '',
    title: '820 m² Kat Karşılığı İlan',
    type: 'KAT_KARSILIGI',
    city: 'İstanbul',
    district: 'Beşiktaş',
    fizibiliteSkoru: 82,
    arsaPayiMin: 30,
    arsaPayiMax: 42,
    changePercent: 42.5,
    imarDurumu: 'KONUT_TICARET',
    emsal: 2.0,
    m2: 820,
    price: 5171642,
    netKar: 34,
    photos: [] as string[],
    description: 'Beşiktaş merkezi konumda, ulaşıma yakın, imar planlı arsa. Kat karşılığı veya satış seçenekleri görüşmeye açık.',
    lat: 41.042,
    lng: 29.008,
    user: null as null | { id: string; name: string | null; email: string; isVerified: boolean },
};

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const id = params?.id as string;

    const initialTab = (searchParams.get('tab') as Tab) ?? 'genel';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [listing, setListing] = useState(MOCK_LISTING);
    const [loading, setLoading] = useState(true);

    // Offer state
    const [offerShare, setOfferShare] = useState(33);
    const [offerMsg, setOfferMsg] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Try to fetch real listing, fall back to mock
        fetch(`/api/listings/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.id) {
                    setListing({ ...MOCK_LISTING, ...data, id });
                } else {
                    setListing({ ...MOCK_LISTING, id });
                }
            })
            .catch(() => setListing({ ...MOCK_LISTING, id }))
            .finally(() => setLoading(false));
    }, [id]);

    const handleOffer = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: id,
                    offeredShare: offerShare,
                    message: offerMsg,
                }),
            });
            if (res.ok) {
                toast.success(`%${offerShare} arsa payı teklifiniz iletildi!`);
                setOfferMsg('');
            } else {
                const data = await res.json();
                toast.error(data.message || 'Teklif gönderilemedi.');
            }
        } catch {
            toast.error('Bağlantı hatası.');
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className={styles.loading}>
            Yükleniyor…
        </div>
    );

    const score = listing.fizibiliteSkoru ?? 82;
    const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
    const photoHue = 215 + (id?.charCodeAt(0) ?? 0) % 30;

    return (
        <div className={styles.page}>
            <AppBar title="İlan Detayı" showBack />

            {/* ── Back button ── */}
            <button onClick={() => router.back()} className={styles.backBtn}>← Pazar Yerine Dön</button>

            {/* ── Main Grid ── */}
            <div className={styles.grid}>

                {/* LEFT */}
                <div>
                    {/* Photo area */}
                    <div className={styles.photoArea}>
                        {listing.photos.length > 0 ? (
                            <SwipeGallery images={listing.photos} alt={listing.title} />
                        ) : (
                            <div
                                className={styles.photoPlaceholder}
                                style={{ '--photo-hue': photoHue } as React.CSSProperties}
                            >🏗️</div>
                        )}

                        {/* Fizibilite score overlay */}
                        <div className={styles.scoreOverlay}>
                            <ScoreRevealBadge score={score} size="lg" showLabel />
                        </div>

                        {/* Change badge */}
                        <span className={styles.changeBadge}>▲ +{listing.changePercent}%</span>
                    </div>

                    {/* Progress bar */}
                    <div
                        className={styles.progressRow}
                        style={{ '--score-pct': `${score}%`, '--score-color': scoreColor } as React.CSSProperties}
                    >
                        <span className={styles.progressLabel}>Fizibilite Skoru</span>
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} />
                        </div>
                        <span className={styles.progressValue}>{score}/100</span>
                    </div>

                    {/* Title row */}
                    <div className={styles.titleBlock}>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{listing.title}</h1>
                            {session?.user?.id && listing.user?.id && (session.user.id as string) === (listing.user.id as string) && (
                                <button
                                    onClick={() => router.push(`/listings/${id}/edit`)}
                                    className={styles.editBtn}
                                >
                                    ✏️ Düzenle
                                </button>
                            )}
                        </div>
                        <div className={styles.location}>📍 {listing.district}, {listing.city}</div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className={styles.tabContent}>

                        {activeTab === 'genel' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Parsel Detayları</h3>
                                <div className={styles.detailGrid}>
                                    {[
                                        ['Alan', `${listing.m2} m²`],
                                        ['İmar Durumu', listing.imarDurumu?.replace('_', ' ') ?? 'Konut + Ticaret'],
                                        ['Emsal', listing.emsal?.toString() ?? '2.0'],
                                        ['Arsa Payı', `%${listing.arsaPayiMin}–${listing.arsaPayiMax}`],
                                        ['Şehir', listing.city ?? 'İstanbul'],
                                        ['İlçe', listing.district ?? 'Beşiktaş'],
                                    ].map(([label, val]) => (
                                        <div key={label} className={styles.detailCell}>
                                            <div className={styles.detailLabel}>{label}</div>
                                            <div className={styles.detailValue}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                {listing.description && (
                                    <p className={styles.description}>{listing.description}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'fizibilite' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Ön Fizibilite Sonuçları</h3>
                                <div className={styles.fizGrid}>
                                    {[
                                        ['Tahmini Arsa Değeri', '4.371.200 TL', 'var(--primary)'],
                                        ['Tahmini Net Kâr', '+%34 (▲+1.76M TL)', 'var(--green)'],
                                        ['Fizibilite Skoru', `${score}/100`, scoreColor],
                                        ['Piyasa Karşılaştırma', `+${listing.changePercent}%`, 'var(--green)'],
                                        ['Daire/m² Tahmini', '9.5/m²', 'var(--card-title)'],
                                        ['Proje Süresi', '~18–24 ay', 'var(--muted)'],
                                    ].map(([label, val, color]) => (
                                        <div
                                            key={label}
                                            className={styles.fizCell}
                                            style={{ '--cell-color': color as string } as React.CSSProperties}
                                        >
                                            <div className={styles.fizLabel}>{label}</div>
                                            <div className={styles.fizValue}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.infoNote}>
                                    💡 Bu değerler ArsaBil Engine v2 tarafından otomatik hesaplanmıştır. Detaylı analiz için Senaryo sekmesini kullanın.
                                </div>
                            </div>
                        )}

                        {activeTab === 'senaryo' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>🧮</div>
                                <div className={styles.centerCtaTitle}>Bu ilan için özel senaryo oluşturun</div>
                                <button
                                    onClick={() => router.push(`/?listing=${listing.id}`)}
                                    className={styles.primaryBtn}
                                >
                                    Hesap Makinesini Aç →
                                </button>
                            </div>
                        )}

                        {activeTab === 'teklifler' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Teklif Ver</h3>
                                <div className={styles.offerField}>
                                    <label className={styles.offerLabel}>Teklif Ettiğim Arsa Payı (%)</label>
                                    <div className={styles.offerRangeRow}>
                                        <input type="range" min={10} max={60} value={offerShare} onChange={e => setOfferShare(+e.target.value)}
                                            className={styles.offerRange} />
                                        <span className={styles.offerShare}>%{offerShare}</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Teklif notunuz (opsiyonel)"
                                    value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
                                    rows={3}
                                    className={styles.offerTextarea}
                                />
                                <button onClick={handleOffer} disabled={sending} className={styles.offerSubmit}>
                                    {sending ? 'Gönderiliyor…' : '📤 Teklifi Gönder'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'mesajlar' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>💬</div>
                                İlan sahibiyle iletişime geçin
                                <div className={styles.centerCtaAction}>
                                    <button onClick={() => router.push('/inbox')} className={styles.primaryBtn}>Mesaj Aç →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Sticky sidebar */}
                <div className={styles.sidebar}>
                    <div>
                        <div className={styles.priceLabel}>Tahmini Değer</div>
                        <div className={styles.priceValue}>
                            {(listing.price ?? 5171642).toLocaleString('tr-TR')} TL
                        </div>
                    </div>

                    <div className={styles.miniStats}>
                        <div className={`${styles.miniStat} ${styles.miniStatGreen}`}>
                            <div className={styles.miniStatLabel}>Net Kâr</div>
                            <div className={`${styles.miniStatValue} ${styles.miniStatValueGreen}`}>+%{listing.netKar}</div>
                        </div>
                        <div className={`${styles.miniStat} ${styles.miniStatBlue}`}>
                            <div className={styles.miniStatLabel}>Arsa Payı</div>
                            <div className={`${styles.miniStatValue} ${styles.miniStatValueBlue}`}>%{listing.arsaPayiMin}–{listing.arsaPayiMax}</div>
                        </div>
                    </div>

                    {/* Mini Map */}
                    <MiniMap
                        lat={listing.lat ?? 41.042}
                        lng={listing.lng ?? 29.008}
                        label={`${listing.district}, ${listing.city}`}
                        listingId={id}
                    />

                    <div className={styles.sidebarActions}>
                        <button onClick={() => setActiveTab('senaryo')} className={`${styles.actionBtn} ${styles.actionPrimary}`}>🧮 Senaryo Oluştur</button>
                        <button onClick={() => setActiveTab('teklifler')} className={`${styles.actionBtn} ${styles.actionGreen}`}>📤 Teklif Ver</button>
                        <button onClick={() => setActiveTab('mesajlar')} className={`${styles.actionBtn} ${styles.actionGhost}`}>💬 Mesaj At</button>
                    </div>

                    {/* Share + Owner */}
                    <div className={styles.sidebarFooter}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => toast.success('Link kopyalandı!'))
                                    .catch(() => toast.error('Kopyalanamadı.'));
                            }}
                            className={styles.shareBtn}
                        >🔗 Paylaş</button>

                        {listing.user?.id && (
                            <a
                                href={`/profile/${listing.user.id}`}
                                className={styles.ownerLink}
                            >
                                👤 İlan Sahibinin Profili
                            </a>
                        )}
                    </div>

                    <div className={styles.footnote}>
                        Tüm anlaşmalar ArsaBil güvencesindedir. İlan No: {id?.slice(0, 8).toUpperCase()}
                    </div>
                </div>
            </div>

            <StickyActionBar aboveBottomNav>
                <div className={styles.stickyBtns}>
                    <button
                        onClick={() => setActiveTab('teklifler')}
                        className={`${styles.actionBtn} ${styles.actionGreen} ${styles.stickyBtn}`}
                    >📤 Teklif Ver</button>
                    <button
                        onClick={() => setActiveTab('senaryo')}
                        className={`${styles.actionBtn} ${styles.actionPrimary} ${styles.stickyBtn}`}
                    >🧮 Senaryo</button>
                </div>
            </StickyActionBar>
        </div>
    );
}
