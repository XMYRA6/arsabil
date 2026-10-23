"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { AppBar } from '@/components/mobile/AppBar';
import { SwipeGallery } from '@/components/mobile/SwipeGallery';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { useThemeZaman } from '@/components/home/useThemeZaman';
import { resolveScene, type Tur } from '@/lib/dioramas/scene';
import { formatParcelIdentity, formatAreaCells, formatZoningLabel } from '@/lib/listing/listingDisplay';
import { mergeDemoOverlay } from '@/lib/listing/marketplaceFilters';
import styles from './page.module.css';

const MiniMap = dynamic(() => import('@/components/marketplace/MiniMap').then(m => m.MiniMap), { ssr: false });

type Tab = 'genel' | 'fizibilite' | 'senaryo' | 'teklifler' | 'mesajlar';

const TABS: { id: Tab; label: string }[] = [
    { id: 'genel', label: 'Genel bilgiler' },
    { id: 'fizibilite', label: 'Ön fizibilite' },
    { id: 'senaryo', label: 'Senaryo' },
    { id: 'teklifler', label: 'Teklifler' },
    { id: 'mesajlar', label: 'Mesajlar' },
];

const TYPE_LABEL: Record<string, string> = {
    SALE: 'Satış',
    KAT_KARSILIGI: 'Kat karşılığı',
    ORTAKLIK: 'Ortaklık',
};

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
    zoning: null as string | null,
    emsal: 2.0,
    price: 5171642,
    netKar: 34,
    photos: [] as string[],
    description: 'Beşiktaş merkezi konumda, ulaşıma yakın, imar planlı arsa. Kat karşılığı veya satış seçenekleri görüşmeye açık.',
    // Gerçek veriden gelmesi gereken alanlar burada SABİT DEĞER TAŞIMAZ.
    // Daha önce m2:820 ve lat/lng:Beşiktaş sabitleri vardı; API bu alanları
    // döndürmediği için her ilan detayında sabit "820 m²" ve Beşiktaş konumu
    // görünüyordu. Boş bırakılıyorlar, gösterim tarafı "—" basıyor.
    landSizeSqm: null as number | null,
    lat: null as number | null,
    lng: null as number | null,
    adaNo: null as string | null,
    parselNo: null as string | null,
    neighborhood: null as string | null,
    parcelAreaSqm: null as number | null,
    parcelQuality: null as string | null,
    parcelVerifiedAt: null as string | null,
    faultDistanceM: null as number | null,
    floodQ100: null as boolean | null,
    riskSnapshotAt: null as string | null,
    parcelGeometry: null as { type: string; coordinates: number[][][] } | null,
    user: null as null | { id: string; name: string | null; email: string; isVerified: boolean },
};

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** İlan türü + imardan diorama sahnesi (fotoğraf yokken). Pazar yeri kartıyla aynı eşleme. */
function sahneSec(l: { type: string; zoning: string | null }): { tur: Tur; varyant: string } {
    if (l.type === 'KAT_KARSILIGI') return { tur: 'kat', varyant: 'bitmis' };
    if (l.type === 'ORTAKLIK') return { tur: 'ticari', varyant: 'ofis' };
    switch (l.zoning) {
        case 'TARIM': return { tur: 'tarla', varyant: 'bugday' };
        case 'TICARI': return { tur: 'ticari', varyant: 'ofis' };
        case 'KONUT': return { tur: 'villa', varyant: 'modern' };
        default: return { tur: 'arsa', varyant: 'agacsiz' };
    }
}

function formatFault(m: number | null): string | null {
    if (m == null) return null;
    const metin = m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`;
    return metin;
}

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const zaman = useThemeZaman();
    const id = params?.id as string;

    const initialTab = (searchParams.get('tab') as Tab) ?? 'genel';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [listing, setListing] = useState<typeof MOCK_LISTING | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    // Offer state
    const [offerShare, setOfferShare] = useState(33);
    const [offerMsg, setOfferMsg] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Impeccable critique P0 (2026-09-17): önceden hata/eksik-id durumunda
        // sessizce MOCK_LISTING'e (uydurma başlık/fiyat) düşülüyordu, kullanıcı
        // gerçek bir ilan gördüğünü sanabiliyordu — PRODUCT.md ilke #1'i
        // ("gerçek veri, uydurma yok") ihlal ediyordu. Artık görünür bir hata
        // durumu var; MOCK_LISTING yalnızca `mergeDemoOverlay`'in eksik
        // (Prisma şemasında olmayan) alanları doldurmak için kullanılıyor.
        fetch(`/api/listings/${id}`)
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => {
                if (data && data.id) {
                    setListing({ ...mergeDemoOverlay(data, MOCK_LISTING), id });
                } else {
                    setFetchError(true);
                }
            })
            .catch(() => setFetchError(true))
            .finally(() => setLoading(false));
    }, [id]);

    // Favori durumu — yalnız oturum açıksa sorgulanır.
    useEffect(() => {
        if (!session?.user?.id) return;
        fetch('/api/favorites')
            .then(r => (r.ok ? r.json() : []))
            .then((favs: { listingId?: string; listing?: { id: string } }[]) => {
                setIsFavorite(Array.isArray(favs) && favs.some(f => (f.listingId ?? f.listing?.id) === id));
            })
            .catch(() => {});
    }, [session?.user?.id, id]);

    const toggleFavorite = async () => {
        if (!session?.user?.id) {
            toast.error('Favorilere eklemek için giriş yapın.');
            return;
        }
        try {
            const res = isFavorite
                ? await fetch(`/api/favorites/${id}`, { method: 'DELETE' })
                : await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listingId: id }),
                });
            if (res.ok) setIsFavorite(f => !f);
            else toast.error('Favori güncellenemedi.');
        } catch {
            toast.error('Bağlantı hatası.');
        }
    };

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

    if (fetchError || !listing) return (
        <div className={`${styles.loading} ${styles.loadingColumn}`}>
            <p>İlan yüklenemedi.</p>
            <button onClick={() => router.push('/marketplace')} className={styles.primaryBtn}>
                Pazar Yerine Dön
            </button>
        </div>
    );

    const score = listing.fizibiliteSkoru ?? 82;
    const scoreTone = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'bad';
    const scoreLabel = score >= 80 ? 'Yüksek' : score >= 60 ? 'Orta' : 'Riskli';
    const areaCells = formatAreaCells(listing);
    const parcelId = formatParcelIdentity(listing);
    const price = listing.price ?? 5171642;
    const perM2 = listing.landSizeSqm ? Math.round(price / listing.landSizeSqm) : null;
    const diorama = listing.photos.length === 0
        ? resolveScene({ ...sahneSec(listing), egim: 'duz', zaman })
        : null;
    const isOwner = !!(session?.user?.id && listing.user?.id && (session.user.id as string) === (listing.user.id as string));
    const faultText = formatFault(listing.faultDistanceM);
    const baslik = [listing.district, listing.neighborhood].filter(Boolean).join(' · ') || listing.title;

    const sidePanel = (
        <aside className={styles.sidebar}>
            <div className={`${styles.card} ${styles.priceCard}`}>
                <span className={styles.priceLabel}>Tahmini değer</span>
                <div className={styles.priceRow}>
                    <span className={styles.priceValue}>₺{trNum.format(price)}</span>
                    {perM2 !== null && <span className={styles.perM2}>₺{trNum.format(perM2)}/m²</span>}
                </div>

                <div className={styles.scoreBlock}>
                    <div className={styles.scoreHead}>
                        <span>Fizibilite skoru</span>
                        <span className={`${styles.scorePill} ${styles[`score_${scoreTone}`]}`}>{score} · {scoreLabel}</span>
                    </div>
                    <div className={styles.progressTrack} role="img" aria-label={`Fizibilite skoru ${score}/100`}>
                        <div className={`${styles.progressFill} ${styles[`fill_${scoreTone}`]}`} style={{ width: `${score}%` }} />
                    </div>
                    <p className={styles.scoreNote}>Arsa payı, risk ve piyasa verisinden hesaplanır.</p>
                </div>

                <div className={styles.sidebarActions}>
                    <button type="button" onClick={() => setActiveTab('teklifler')} className={styles.offerBtn}>Teklif ver</button>
                    <button type="button" onClick={() => setActiveTab('senaryo')} className={styles.softBtnWide}>Senaryo hesapla</button>
                    <div className={styles.softRow}>
                        <button type="button" onClick={() => setActiveTab('mesajlar')} className={styles.softBtn}>Mesaj</button>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => toast.success('Link kopyalandı!'))
                                    .catch(() => toast.error('Kopyalanamadı.'));
                            }}
                            className={styles.softBtn}
                        >Paylaş</button>
                        <button type="button" onClick={toggleFavorite} aria-pressed={isFavorite} className={styles.softBtn}>
                            {isFavorite ? 'Favoride' : 'Favori'}
                        </button>
                    </div>
                </div>
            </div>

            {listing.user && (
                <div className={styles.card}>
                    <div className={styles.ownerRow}>
                        <span className={styles.avatar} aria-hidden="true">
                            {(listing.user.name ?? listing.user.email).slice(0, 2).toUpperCase()}
                        </span>
                        <div className={styles.ownerText}>
                            <strong>{listing.user.name ?? 'İlan sahibi'}</strong>
                            <span>Arsa sahibi</span>
                        </div>
                        {listing.user.isVerified && <span className={`${styles.pill} ${styles.pillOk}`}>Doğrulanmış</span>}
                    </div>
                    <a href={`/profile/${listing.user.id}`} className={styles.ownerLink}>İlan sahibinin profili</a>
                </div>
            )}

            {listing.lat != null && listing.lng != null ? (
                <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Konum</h3>
                    <div className={styles.mapWrap}>
                        <MiniMap
                            lat={listing.lat}
                            lng={listing.lng}
                            label={[listing.district, listing.city].filter(Boolean).join(', ') || undefined}
                            listingId={id}
                            parcelGeometry={listing.parcelGeometry}
                            riskLayers
                        />
                    </div>
                    <Link href={`/deger?lat=${listing.lat}&lng=${listing.lng}`} className={styles.relatedLink}>
                        Parselin değerini incele →
                    </Link>
                </div>
            ) : (
                /* Koordinat yoksa harita GÖSTERİLMEZ: önceden `listing.lat ?? 41.042` ile
                   Beşiktaş'a düşüyordu, konumu olmayan her ilan yanlış yerde görünüyordu. */
                <div className={`${styles.card} ${styles.noLocationNote}`}>
                    Bu ilan için konum belirtilmemiş.
                </div>
            )}

            <p className={styles.footnote}>
                Tüm anlaşmalar ArsaBil güvencesindedir. İlan No: {id?.slice(0, 8).toUpperCase()}
            </p>
        </aside>
    );

    return (
        <div className={styles.page}>
            <AppBar title="İlan Detayı" showBack />

            <nav className={styles.breadcrumb} aria-label="Konum">
                <Link href="/marketplace">Pazar yeri</Link>
                {listing.city && <><span aria-hidden="true">/</span><span>{listing.city}</span></>}
                {listing.district && <><span aria-hidden="true">/</span><span>{listing.district}</span></>}
            </nav>

            <div className={styles.grid}>
                <div className={styles.main}>
                    <div className={styles.hero}>
                        {listing.photos.length > 0 ? (
                            <SwipeGallery images={listing.photos} alt={listing.title} />
                        ) : diorama ? (
                            // eslint-disable-next-line @next/next/no-img-element -- yerel statik WebP
                            <img className={styles.diorama} src={diorama.src1600} alt="" />
                        ) : null}
                        <div className={styles.heroBadges}>
                            <span className={`${styles.pill} ${styles.pillOk}`}>{TYPE_LABEL[listing.type] ?? 'Kat karşılığı'}</span>
                            {listing.parcelVerifiedAt && <span className={`${styles.pill} ${styles.pillOk}`}>Resmi parsel verisi</span>}
                        </div>
                    </div>

                    <div className={styles.titleBlock}>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{baslik}</h1>
                            {isOwner && (
                                <button onClick={() => router.push(`/listings/${id}/edit`)} className={styles.editBtn}>
                                    Düzenle
                                </button>
                            )}
                        </div>
                        <p className={styles.subtitle}>
                            {[areaCells.declared !== '—' ? areaCells.declared : null, formatZoningLabel(listing.zoning) !== '—' ? `${formatZoningLabel(listing.zoning).toLowerCase()} arsası` : null]
                                .filter(Boolean).join(' ') || listing.title}
                            {' · '}{TYPE_LABEL[listing.type] ?? 'Kat karşılığı'} veya satış
                        </p>
                    </div>

                    {/* Mobil fiyat özeti: Figma mobilde fiyat başlığın hemen altında, yan kart yok. */}
                    <div className={styles.mobilePrice}>
                        <span className={styles.priceValue}>₺{trNum.format(price)}</span>
                        {perM2 !== null && <span className={styles.perM2}>₺{trNum.format(perM2)}/m²</span>}
                        <span className={`${styles.scorePill} ${styles[`score_${scoreTone}`]}`}>{score} · {scoreLabel}</span>
                    </div>

                    <div className={styles.tabs} role="tablist">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div role="tabpanel" className={styles.panel}>
                        {activeTab === 'genel' && (
                            <>
                                <section className={styles.card}>
                                    <div className={styles.cardHead}>
                                        <h3 className={styles.cardTitle}>Parsel bilgileri</h3>
                                        {parcelId && (
                                            <span className={`${styles.pill} ${listing.parcelVerifiedAt ? styles.pillOk : styles.pillMuted}`}>
                                                {listing.parcelVerifiedAt
                                                    ? `Resmi parsel kaydıyla doğrulandı · ${new Date(listing.parcelVerifiedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`
                                                    : 'Doğrulanmadı'}
                                            </span>
                                        )}
                                    </div>
                                    <dl className={styles.table}>
                                        {[
                                            ...(parcelId ? [['Ada / Parsel', `${listing.adaNo || '—'} / ${listing.parselNo}`] as [string, string]] : []),
                                            ['Alan (beyan)', areaCells.declared],
                                            ...(areaCells.official ? [['Alan (tapu)', areaCells.official] as [string, string]] : []),
                                            ['İmar durumu', formatZoningLabel(listing.zoning)],
                                            ['Emsal', listing.emsal?.toString() ?? '2.0'],
                                            ['Arsa payı', `%${listing.arsaPayiMin}–${listing.arsaPayiMax}`],
                                            ...(listing.riskSnapshotAt != null
                                                ? [
                                                    ['Fay mesafesi', faultText ? `${faultText}` : '25 km içinde diri fay yok'] as [string, string],
                                                    ...(listing.floodQ100 != null
                                                        ? [['Taşkın (Q100)', listing.floodQ100 ? 'Bölge içinde' : 'Bölge dışında'] as [string, string]]
                                                        : []),
                                                ]
                                                : []),
                                            // Uydurma şehir/ilçe YOK: veri yoksa "—" basılır.
                                            ['Şehir / İlçe', `${listing.city ?? '—'} / ${listing.district ?? '—'}`],
                                        ].map(([label, val]) => (
                                            <div key={label} className={styles.tableRow}>
                                                <dt>{label}</dt>
                                                <dd>{val}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                    {areaCells.warning && (
                                        <div className={styles.areaWarning}>{areaCells.warning}</div>
                                    )}
                                </section>

                                <section className={styles.card}>
                                    <h3 className={styles.cardTitle}>Açıklama</h3>
                                    {listing.description && <p className={styles.description}>{listing.description}</p>}
                                    {/* emsal / arsaPayi alanları Prisma şemasında HİÇ yok; API onları
                                        döndüremez, dolayısıyla her ilanda aynı örnek değerler görünür. */}
                                    <p className={styles.demoNote} role="note">
                                        <strong>Örnek veri</strong> — Emsal ve arsa payı bilgileri henüz
                                        toplanmadığı için tanıtım amaçlı örnek değerlerdir; bu ilana ait değildir.
                                    </p>
                                </section>
                            </>
                        )}

                        {activeTab === 'fizibilite' && (
                            <section className={`${styles.card} ${styles.centerCta}`}>
                                {/* Impeccable critique P1 (2026-09-17): bu sekmedeki değerlerin TAMAMI sabit
                                    örnek koduydu, ilan verisiyle bağlantısı yoktu — "gerçek veri, uydurma yok"
                                    ilkesini ihlal ediyordu. Gerçek hesap /hesapla motoruna bağlanana kadar
                                    "yakında" durumunda. */}
                                <h3 className={styles.cardTitle}>Ön fizibilite yakında burada</h3>
                                <p className={styles.description}>
                                    Bu ilan için otomatik fizibilite hesabı henüz hazır değil. Gerçek verilerle
                                    kendi hesabınızı şimdi çıkarabilirsiniz.
                                </p>
                                <button onClick={() => router.push(`/?listing=${listing.id}`)} className={styles.primaryBtn}>
                                    Hesapla&apos;yı Aç →
                                </button>
                            </section>
                        )}

                        {activeTab === 'senaryo' && (
                            <section className={`${styles.card} ${styles.centerCta}`}>
                                <h3 className={styles.cardTitle}>Bu ilan için özel senaryo oluşturun</h3>
                                <button onClick={() => router.push(`/?listing=${listing.id}`)} className={styles.primaryBtn}>
                                    Hesap Makinesini Aç →
                                </button>
                            </section>
                        )}

                        {activeTab === 'teklifler' && (
                            <section className={styles.card}>
                                <div className={styles.cardHead}>
                                    <h3 className={styles.cardTitle}>Teklif ver</h3>
                                    <Link href={`/listing/${id}/offers`} className={styles.relatedLink}>
                                        Geçmiş teklifleri gör →
                                    </Link>
                                </div>
                                <div className={styles.offerField}>
                                    <label className={styles.offerLabel}>Teklif Ettiğim Arsa Payı (%)</label>
                                    <div className={styles.offerRangeRow}>
                                        <input
                                            type="range"
                                            min={10}
                                            max={60}
                                            value={offerShare}
                                            aria-label="Teklif ettiğim arsa payı"
                                            onChange={e => setOfferShare(+e.target.value)}
                                            className={styles.offerRange}
                                            style={{ '--progress': `${((offerShare - 10) / 50) * 100}%` } as React.CSSProperties}
                                        />
                                        <span className={styles.offerShareUnit}>%</span>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={10}
                                            max={60}
                                            aria-label="Teklif ettiğim arsa payı, sayı ile"
                                            className={styles.offerShare}
                                            value={offerShare}
                                            onChange={e => { if (e.target.value !== '') setOfferShare(+e.target.value); }}
                                        />
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Teklif notunuz (opsiyonel)"
                                    value={offerMsg}
                                    onChange={e => setOfferMsg(e.target.value)}
                                    rows={3}
                                    className={styles.offerTextarea}
                                />
                                <button onClick={handleOffer} disabled={sending} className={styles.offerSubmit}>
                                    {sending ? 'Gönderiliyor…' : 'Teklifi Gönder'}
                                </button>
                            </section>
                        )}

                        {activeTab === 'mesajlar' && (
                            <section className={`${styles.card} ${styles.centerCta}`}>
                                <h3 className={styles.cardTitle}>İlan sahibiyle iletişime geçin</h3>
                                <button onClick={() => router.push('/inbox')} className={styles.primaryBtn}>Mesaj Aç →</button>
                            </section>
                        )}
                    </div>
                </div>

                {sidePanel}
            </div>

            <StickyActionBar aboveBottomNav>
                <div className={styles.stickyBtns}>
                    <button onClick={() => setActiveTab('senaryo')} className={`${styles.softBtnWide} ${styles.stickyBtn}`}>Senaryo</button>
                    <button onClick={() => setActiveTab('teklifler')} className={`${styles.offerBtn} ${styles.stickyBtn}`}>Teklif ver</button>
                </div>
            </StickyActionBar>
        </div>
    );
}
