"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { FizibiliteScoreBadge } from '@/components/marketplace/FizibiliteScoreBadge';
import { toast } from 'react-hot-toast';

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
    const [photoIndex, setPhotoIndex] = useState(0);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
            Yükleniyor…
        </div>
    );

    const score = listing.fizibiliteSkoru ?? 82;
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff5a5f';

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>

            {/* ── Back button ── */}
            <button onClick={() => router.back()} style={{
                background: 'transparent', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0,
            }}>← Pazar Yerine Dön</button>

            {/* ── Main Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

                {/* LEFT */}
                <div>
                    {/* Photo area */}
                    <div style={{
                        width: '100%', height: 340, borderRadius: 18, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #1a3a6e, #0b2443)',
                        position: 'relative', marginBottom: 16,
                    }}>
                        <div style={{
                            width: '100%', height: '100%',
                            background: `linear-gradient(135deg, hsl(${215 + (id?.charCodeAt(0) ?? 0) % 30}, 55%, 18%), hsl(200, 60%, 12%))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '4rem', opacity: 0.5,
                        }}>🏗️</div>

                        {/* Dots */}
                        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} onClick={() => setPhotoIndex(i)} style={{
                                    width: i === photoIndex ? 20 : 8, height: 8, borderRadius: 4,
                                    background: i === photoIndex ? 'white' : 'rgba(255,255,255,.45)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Fizibilite score overlay */}
                        <div style={{ position: 'absolute', top: 16, left: 16 }}>
                            <FizibiliteScoreBadge score={score} size="lg" showLabel />
                        </div>

                        {/* Change badge */}
                        <span style={{
                            position: 'absolute', top: 16, right: 16,
                            background: 'rgba(16,185,129,.85)', color: 'white',
                            fontSize: '0.85rem', fontWeight: 900, padding: '4px 12px', borderRadius: 10,
                            backdropFilter: 'blur(4px)',
                        }}>▲ +{listing.changePercent}%</span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Fizibilite Skoru</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 6, transition: 'width 1s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: scoreColor }}>{score}/100</span>
                    </div>

                    {/* Title row */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--card-title)', marginBottom: 4 }}>{listing.title}</h1>
                            {session?.user?.id && listing.user?.id && (session.user.id as string) === (listing.user.id as string) && (
                                <button
                                    onClick={() => router.push(`/listings/${id}/edit`)}
                                    style={{
                                        padding: '6px 14px', background: 'var(--border)', color: 'var(--card-title)',
                                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                                        fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0,
                                    }}
                                >
                                    ✏️ Düzenle
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {listing.district}, {listing.city}</div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', gap: 2, borderBottom: '2px solid var(--border)',
                        marginBottom: 20, overflowX: 'auto',
                    }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '10px 14px', border: 'none', background: 'transparent',
                                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
                                    fontWeight: activeTab === tab.id ? 800 : 500,
                                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--muted)',
                                    borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                                    marginBottom: '-2px', whiteSpace: 'nowrap', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ background: 'var(--panel)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '20px' }}>

                        {activeTab === 'genel' && (
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>Parsel Detayları</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                                    {[
                                        ['Alan', `${listing.m2} m²`],
                                        ['İmar Durumu', listing.imarDurumu?.replace('_', ' ') ?? 'Konut + Ticaret'],
                                        ['Emsal', listing.emsal?.toString() ?? '2.0'],
                                        ['Arsa Payı', `%${listing.arsaPayiMin}–${listing.arsaPayiMax}`],
                                        ['Şehir', listing.city ?? 'İstanbul'],
                                        ['İlçe', listing.district ?? 'Beşiktaş'],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)' }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                {listing.description && (
                                    <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>{listing.description}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'fizibilite' && (
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>Ön Fizibilite Sonuçları</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        ['Tahmini Arsa Değeri', '4.371.200 TL', '#3b82f6'],
                                        ['Tahmini Net Kâr', '+%34 (▲+1.76M TL)', '#10b981'],
                                        ['Fizibilite Skoru', `${score}/100`, scoreColor],
                                        ['Piyasa Karşılaştırma', `+${listing.changePercent}%`, '#10b981'],
                                        ['Daire/m² Tahmini', '9.5/m²', 'var(--card-title)'],
                                        ['Proje Süresi', '~18–24 ay', 'var(--muted)'],
                                    ].map(([label, val, color]) => (
                                        <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: color as string }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(31,111,235,.08)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--muted)' }}>
                                    💡 Bu değerler ArsaBil Engine v2 tarafından otomatik hesaplanmıştır. Detaylı analiz için Senaryo sekmesini kullanın.
                                </div>
                            </div>
                        )}

                        {activeTab === 'senaryo' && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧮</div>
                                <div style={{ fontWeight: 700, marginBottom: 12 }}>Bu ilan için özel senaryo oluşturun</div>
                                <button
                                    onClick={() => router.push(`/?listing=${listing.id}`)}
                                    style={{ padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}
                                >
                                    Hesap Makinesini Aç →
                                </button>
                            </div>
                        )}

                        {activeTab === 'teklifler' && (
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>Teklif Ver</h3>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Teklif Ettiğim Arsa Payı (%)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input type="range" min={10} max={60} value={offerShare} onChange={e => setOfferShare(+e.target.value)}
                                            style={{ flex: 1, accentColor: 'var(--primary)' }} />
                                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)', width: 40 }}>%{offerShare}</span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Teklif notunuz (opsiyonel)"
                                    value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'none', outline: 'none' }}
                                />
                                <button onClick={handleOffer} disabled={sending} style={{
                                    marginTop: 10, padding: '10px 24px', background: '#10b981', color: 'white',
                                    border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
                                    opacity: sending ? 0.6 : 1,
                                }}>
                                    {sending ? 'Gönderiliyor…' : '📤 Teklifi Gönder'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'mesajlar' && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                                İlan sahibiyle iletişime geçin
                                <div style={{ marginTop: 12 }}>
                                    <button onClick={() => router.push('/inbox')} style={{
                                        padding: '10px 20px', background: 'var(--primary)', color: 'white',
                                        border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
                                    }}>Mesaj Aç →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Sticky sidebar */}
                <div style={{
                    position: 'sticky', top: 80,
                    background: 'var(--panel)', border: '1.5px solid var(--border)',
                    borderRadius: 18, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 2 }}>Tahmini Değer</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--card-title)' }}>
                            {(listing.price ?? 5171642).toLocaleString('tr-TR')} TL
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, background: 'rgba(16,185,129,.10)', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Net Kâr</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>+%{listing.netKar}</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(31,111,235,.10)', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Arsa Payı</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>%{listing.arsaPayiMin}–{listing.arsaPayiMax}</div>
                        </div>
                    </div>

                    {/* Mini Map */}
                    <MiniMap
                        lat={listing.lat ?? 41.042}
                        lng={listing.lng ?? 29.008}
                        label={`${listing.district}, ${listing.city}`}
                        listingId={id}
                    />

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button onClick={() => setActiveTab('senaryo')} style={{
                            padding: '11px', background: 'var(--primary)', color: 'white',
                            border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.85rem',
                        }}>🧮 Senaryo Oluştur</button>
                        <button onClick={() => setActiveTab('teklifler')} style={{
                            padding: '11px', background: 'rgba(16,185,129,.15)', color: '#10b981',
                            border: '1.5px solid rgba(16,185,129,.4)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.85rem',
                        }}>📤 Teklif Ver</button>
                        <button onClick={() => setActiveTab('mesajlar')} style={{
                            padding: '11px', background: 'var(--bg)', color: 'var(--muted)',
                            border: '1.5px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                        }}>💬 Mesaj At</button>
                    </div>

                    {/* Share + Owner */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                    .then(() => toast.success('Link kopyalandı!'))
                                    .catch(() => toast.error('Kopyalanamadı.'));
                            }}
                            style={{
                                padding: '9px', background: 'var(--bg)', color: 'var(--muted)',
                                border: '1.5px solid var(--border)', borderRadius: 10,
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem',
                            }}
                        >🔗 Paylaş</button>

                        {listing.user?.id && (
                            <a
                                href={`/profile/${listing.user.id}`}
                                style={{
                                    display: 'block', padding: '9px', textAlign: 'center',
                                    background: 'var(--bg)', color: 'var(--muted)',
                                    border: '1.5px solid var(--border)', borderRadius: 10,
                                    textDecoration: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem',
                                }}
                            >
                                👤 İlan Sahibinin Profili
                            </a>
                        )}
                    </div>

                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                        Tüm anlaşmalar ArsaBil güvencesindedir. İlan No: {id?.slice(0, 8).toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
}
