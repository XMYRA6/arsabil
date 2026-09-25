"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ScoreRevealBadge } from './ScoreRevealBadge';
import { toast } from 'react-hot-toast';
import { AppBar } from '@/components/mobile/AppBar';
import { SwipeGallery } from '@/components/mobile/SwipeGallery';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { formatParcelIdentity, formatAreaCells, formatZoningLabel } from '@/lib/listing/listingDisplay';
import { mergeDemoOverlay } from '@/lib/listing/marketplaceFilters';
import styles from './page.module.css';

const MiniMap = dynamic(() => import('@/components/marketplace/MiniMap').then(m => m.MiniMap), { ssr: false });

type Tab = 'genel' | 'fizibilite' | 'senaryo' | 'teklifler' | 'mesajlar';

const TABS: { id: Tab; label: string }[] = [
    { id: 'genel', label: 'Genel Bilgiler' },
    { id: 'fizibilite', label: 'Ön Fizibilite' },
    { id: 'senaryo', label: 'Senaryo' },
    { id: 'teklifler', label: 'Teklifler' },
    { id: 'mesajlar', label: 'Mesajlar' },
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

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const id = params?.id as string;

    const initialTab = (searchParams.get('tab') as Tab) ?? 'genel';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [listing, setListing] = useState<typeof MOCK_LISTING | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

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
        <div className={styles.loading} style={{ flexDirection: 'column', gap: 12 }}>
            <p>İlan yüklenemedi.</p>
            <button onClick={() => router.push('/marketplace')} className={styles.primaryBtn}>
                Pazar Yerine Dön
            </button>
        </div>
    );

    const score = listing.fizibiliteSkoru ?? 82;
    const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
    const photoHue = 215 + (id?.charCodeAt(0) ?? 0) % 30;
    const areaCells = formatAreaCells(listing);
    const parcelId = formatParcelIdentity(listing);

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
                            ><span className={styles.photoMark} aria-hidden="true" /></div>
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
                        style={{ '--score-pct-ratio': score / 100, '--score-color': scoreColor } as React.CSSProperties}
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
                                    Düzenle
                                </button>
                            )}
                        </div>
                        <div className={styles.location}>{listing.district}, {listing.city}</div>
                    </div>

                    {/* Mobilde fiyat/mini-stat özeti — Impeccable critique P2 (2026-09-17):
                        önceden mobilde bu blok tüm tab içeriğinin ALTINDAydı (.sidebar
                        tek sütuna düşünce en sona geliyordu), Casey persona ilk 2
                        saniyede fiyatı göremiyordu. Sidebar'daki aynı bloğun mobil
                        kopyası (CSS'te masaüstünde gizli, .sidebarSummary mobilde gizli
                        — çift render yok, sadece görünürlük). */}
                    <div className={styles.mobilePriceSummary}>
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
                    </div>

                    {/* Tabs */}
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

                    {/* Tab Content */}
                    <div className={styles.tabContent} role="tabpanel">

                        {activeTab === 'genel' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Parsel Detayları</h3>
                                {parcelId && (
                                    <div className={styles.parcelRow}>
                                        <span className={styles.parcelId}>{parcelId}</span>
                                        <span className={listing.parcelVerifiedAt ? styles.parcelBadgeOk : styles.parcelBadgeNo}>
                                            {listing.parcelVerifiedAt
                                                ? `TKGM ile doğrulandı · ${new Date(listing.parcelVerifiedAt).toLocaleDateString('tr-TR')}`
                                                : 'Doğrulanmadı'}
                                        </span>
                                    </div>
                                )}
                                {listing.riskSnapshotAt != null && (
                                    <div className={styles.parcelRow}>
                                        <span>
                                            {listing.faultDistanceM != null
                                                ? <>Diri faya yaklaşık{' '}
                                                    {listing.faultDistanceM >= 1000
                                                        ? `${(listing.faultDistanceM / 1000).toFixed(1).replace('.', ',')} km`
                                                        : `${listing.faultDistanceM} m`}
                                                  </>
                                                : '25 km içinde diri fay bulunamadı'}
                                            {listing.floodQ100 != null &&
                                                ` · Q100 taşkın bölgesi ${listing.floodQ100 ? 'İÇİNDE' : 'dışında'}`}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.detailGrid}>
                                    {[
                                        ['Alan (beyan)', areaCells.declared],
                                        ...(areaCells.official ? [['Alan (tapu · TKGM)', areaCells.official] as [string, string]] : []),
                                        ['İmar Durumu', formatZoningLabel(listing.zoning)],
                                        ['Emsal', listing.emsal?.toString() ?? '2.0'],
                                        ['Arsa Payı', `%${listing.arsaPayiMin}–${listing.arsaPayiMax}`],
                                        // Uydurma sehir/ilce YOK: "820 m2" duzeltmesinin
                                        // ayni sinifindan kalan kisimdi, veri yoksa "—" basilir.
                                        ['Şehir', listing.city ?? '—'],
                                        ['İlçe', listing.district ?? '—'],
                                    ].map(([label, val]) => (
                                        <div key={label} className={styles.detailCell}>
                                            <div className={styles.detailLabel}>{label}</div>
                                            <div className={styles.detailValue}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* emsal / arsaPayi alanlari Prisma semasinda HIC yok; API
                                    onlari donduremez, dolayisiyla her ilanda ayni ornek
                                    degerler gorunur. imarDurumu artik GERCEK `zoning` alanindan
                                    okunuyor (bkz. formatZoningLabel) — bu banner artik onu kapsamaz. */}
                                <div className={styles.demoNote} role="note">
                                    <strong>Örnek veri</strong> — Emsal ve arsa payı bilgileri henüz
                                    toplanmadığı için tanıtım amaçlı örnek değerlerdir; bu ilana ait değildir.
                                </div>
                                {areaCells.warning && (
                                    <div className={styles.areaWarning}>{areaCells.warning}</div>
                                )}
                                {listing.description && (
                                    <p className={styles.description}>{listing.description}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'fizibilite' && (
                            <div className={styles.centerCta}>
                                {/* Impeccable critique P1 (2026-09-17): bu sekmedeki degerlerin
                                    TAMAMI (arsa degeri, net kar, daire/m2, proje suresi) sabit
                                    ornek kodmus, ilan verisiyle hic baglantisi yoktu — PRODUCT.md
                                    ilke #1'i ("gercek veri, uydurma yok") ihlal ediyordu. Gercek
                                    hesap /hesapla sayfasindaki motora baglanana kadar "Yakinda"
                                    durumuna cevrildi. */}
                                <div className={styles.centerCtaIcon}>Fizibilite</div>
                                <div className={styles.centerCtaTitle}>Ön fizibilite yakında burada</div>
                                <p className={styles.description}>
                                    Bu ilan için otomatik fizibilite hesabı henüz hazır değil. Gerçek verilerle
                                    kendi hesabınızı şimdi çıkarabilirsiniz.
                                </p>
                                <button
                                    onClick={() => router.push(`/?listing=${listing.id}`)}
                                    className={styles.primaryBtn}
                                >
                                    Hesapla&apos;yı Aç →
                                </button>
                            </div>
                        )}

                        {activeTab === 'senaryo' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>Senaryo</div>
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
                                <div className={styles.titleRow}>
                                    <h3 className={styles.sectionTitle}>Teklif Ver</h3>
                                    <Link href={`/listing/${id}/offers`} className={styles.demoNoteLink}>
                                        Geçmiş teklifleri gör →
                                    </Link>
                                </div>
                                <div className={styles.offerField}>
                                    <label className={styles.offerLabel}>Teklif Ettiğim Arsa Payı (%)</label>
                                    <div className={styles.offerRangeRow}>
                                        <input type="range" min={10} max={60} value={offerShare} onChange={e => setOfferShare(+e.target.value)}
                                            className={styles.offerRange} />
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
                                    value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
                                    rows={3}
                                    className={styles.offerTextarea}
                                />
                                <button onClick={handleOffer} disabled={sending} className={styles.offerSubmit}>
                                    {sending ? 'Gönderiliyor…' : 'Teklifi Gönder'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'mesajlar' && (
                            <div className={styles.centerCta}>
                                <div className={styles.centerCtaIcon}>Mesaj</div>
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
                    <div className={styles.sidebarSummary}>
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
                    </div>

                    {/* Mini Map — koordinat yoksa harita GÖSTERİLMEZ.
                        Önceden `listing.lat ?? 41.042` ile Beşiktaş'a düşüyordu:
                        konumu olmayan her ilan haritada yanlış yerde görünüyordu. */}
                    {listing.lat != null && listing.lng != null ? (
                        <MiniMap
                            lat={listing.lat}
                            lng={listing.lng}
                            label={[listing.district, listing.city].filter(Boolean).join(', ') || undefined}
                            listingId={id}
                            parcelGeometry={listing.parcelGeometry}
                            riskLayers
                        />
                    ) : (
                        <div className={styles.noLocationNote}>
                            Bu ilan için konum belirtilmemiş.
                        </div>
                    )}

                    <div className={styles.sidebarActions}>
                        <button onClick={() => setActiveTab('senaryo')} className={`${styles.actionBtn} ${styles.actionPrimary}`}>Senaryo Oluştur</button>
                        <button onClick={() => setActiveTab('teklifler')} className={`${styles.actionBtn} ${styles.actionGreen}`}>Teklif Ver</button>
                        <button onClick={() => setActiveTab('mesajlar')} className={`${styles.actionBtn} ${styles.actionGhost}`}>Mesaj At</button>
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
                        >Paylaş</button>

                        {listing.user?.id && (
                            <a
                                href={`/profile/${listing.user.id}`}
                                className={styles.ownerLink}
                            >
                                İlan Sahibinin Profili
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
                    >Teklif Ver</button>
                    <button
                        onClick={() => setActiveTab('senaryo')}
                        className={`${styles.actionBtn} ${styles.actionPrimary} ${styles.stickyBtn}`}
                    >Senaryo</button>
                </div>
            </StickyActionBar>
        </div>
    );
}
