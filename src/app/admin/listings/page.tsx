"use client";

import { useEffect, useState } from "react";
import styles from '../admin.module.css';

interface ListingRow {
    id: string;
    title: string | null;
    city: string | null;
    district: string | null;
    isActive: boolean;
    status: string;
    createdAt: string;
    user: { name: string | null; email: string | null };
    report: { title: string; minApartmentPrice: number; landShareRatio: number; totalApartments: number };
    _count: { offers: number };
}

export default function AdminListings() {
    const [listings, setListings] = useState<ListingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');

    const fetchListings = () => {
        setLoading(true);
        fetch('/api/admin/listings')
            .then(r => r.json())
            .then(data => { setListings(data.listings || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- bileşen montajında veri çekme; setState fetchListings içinde gerçekleşiyor
    useEffect(() => { fetchListings(); }, []);

    const toggleActive = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/admin/listings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: id, isActive }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: isActive ? '✅ İlan aktif edildi.' : '⏸️ İlan pasife alındı.' });
                fetchListings();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const deleteListing = async (id: string) => {
        if (!confirm('Bu ilanı kalıcı olarak silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch('/api/admin/listings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: id }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: '🗑️ İlan silindi.' });
                fetchListings();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const approveAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch('/api/admin/listings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: id, action }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: action === 'approve' ? '✅ İlan onaylandı.' : '❌ İlan reddedildi.' });
                fetchListings();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');
    const formatPrice = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });

    const filtered = listings.filter(l => {
        if (filter === 'pending') return l.status === 'PENDING';
        if (filter === 'active') return l.isActive && l.status === 'APPROVED';
        if (filter === 'inactive') return !l.isActive && l.status !== 'PENDING';
        return true;
    });

    const pendingCount = listings.filter(l => l.status === 'PENDING').length;
    const activeCount = listings.filter(l => l.isActive && l.status === 'APPROVED').length;
    const totalOffers = listings.reduce((s, l) => s + l._count.offers, 0);

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>🏗️ İlan Yönetimi</h1>
                <p>Platformdaki tüm ilanları görüntüleyin, düzenleyin veya kaldırın</p>
            </div>

            <div className={styles.statsGrid}>
                {[
                    { icon: '🏗️', value: listings.length, label: 'Toplam İlan' },
                    { icon: '⏳', value: pendingCount, label: 'Bekliyor' },
                    { icon: '✅', value: activeCount, label: 'Aktif' },
                    { icon: '📩', value: totalOffers, label: 'Toplam Teklif' },
                ].map(s => (
                    <div key={s.label} className={styles.statBox}>
                        <div className={styles.icon}>{s.icon}</div>
                        <div className={styles.value}>{s.value}</div>
                        <div className={styles.label}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.segmentTabs}>
                    {([
                        { value: 'all', label: 'Tümü' },
                        { value: 'pending', label: '⏳ Bekliyor' },
                        { value: 'active', label: '✅ Aktif' },
                        { value: 'inactive', label: '⏸️ Pasif' },
                    ] as const).map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={filter === f.value ? styles.segmentTabActive : styles.segmentTab}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>
                    {filtered.length} ilan gösteriliyor
                </div>
            </div>

            {message && (
                <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏗️</div>
                    Henüz ilan bulunmuyor
                </div>
            ) : (
                <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>İlan</th>
                            <th>Sahibi</th>
                            <th>Konum</th>
                            <th>Fiyat</th>
                            <th style={{ textAlign: 'center' }}>Teklif</th>
                            <th>Durum</th>
                            <th>Tarih</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(listing => (
                            <tr key={listing.id} style={!listing.isActive ? { opacity: 0.6 } : undefined}>
                                <td>
                                    <div style={{ maxWidth: 200 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--card-title)' }}>
                                            {listing.report?.title || 'İlan #' + listing.id.slice(0, 6)}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                            {listing.report?.totalApartments} daire · %{Math.round((listing.report?.landShareRatio || 0) * 100)} arsa payı
                                        </div>
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.82rem' }}>{listing.user?.name || listing.user?.email || '—'}</td>
                                <td style={{ fontSize: '0.82rem' }}>{listing.district ? `${listing.district}, ${listing.city}` : listing.city || '—'}</td>
                                <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                                    {formatPrice(listing.report?.minApartmentPrice || 0)} TL
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={styles.roleBadge} style={{
                                        background: listing._count.offers > 0 ? 'rgba(var(--primary-rgb),.1)' : 'rgba(107,114,128,.1)',
                                        color: listing._count.offers > 0 ? 'var(--primary)' : 'var(--muted)',
                                        border: listing._count.offers > 0 ? '1px solid rgba(var(--primary-rgb),.2)' : '1px solid rgba(107,114,128,.2)',
                                    }}>
                                        {listing._count.offers}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.roleBadge} style={
                                        listing.status === 'PENDING'
                                            ? { background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)' }
                                            : listing.isActive
                                            ? { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' }
                                            : { background: 'rgba(107,114,128,.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,.25)' }
                                    }>
                                        {listing.status === 'PENDING' ? '⏳ Bekliyor' : listing.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.82rem' }}>{formatDate(listing.createdAt)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {listing.status === 'PENDING' ? (
                                            <>
                                                <button
                                                    onClick={() => approveAction(listing.id, 'approve')}
                                                    className={styles.iconBtn}
                                                    style={{ color: '#10b981', fontSize: '0.75rem', padding: '2px 8px' }}
                                                    title="Onayla"
                                                >✅ Onayla</button>
                                                <button
                                                    onClick={() => approveAction(listing.id, 'reject')}
                                                    className={styles.iconBtn}
                                                    style={{ color: '#ef4444', fontSize: '0.75rem', padding: '2px 8px' }}
                                                    title="Reddet"
                                                >❌ Reddet</button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => toggleActive(listing.id, !listing.isActive)}
                                                title={listing.isActive ? 'Pasife Al' : 'Aktif Et'}
                                                className={styles.iconBtn}
                                                style={{ color: listing.isActive ? '#f59e0b' : '#10b981' }}
                                            >
                                                {listing.isActive ? '⏸️' : '▶️'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteListing(listing.id)}
                                            title="Sil"
                                            className={styles.iconBtn}
                                            style={{ color: '#ef4444' }}
                                        >🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </>
    );
}
