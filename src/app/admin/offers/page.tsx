"use client";

import { useEffect, useState } from "react";
import styles from '../admin.module.css';
import { DataCard, CardList } from '@/components/mobile/DataCard';

interface OfferRow {
    id: string;
    offeredShare: number;
    message: string | null;
    status: string;
    createdAt: string;
    bidder: { name: string | null; email: string | null };
    listing: { id: string; city: string | null; district: string | null; report: { title: string } };
}

export default function AdminOffers() {
    const [offers, setOffers] = useState<OfferRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');

    useEffect(() => {
        fetch('/api/admin/offers')
            .then(r => r.json())
            .then(data => { setOffers(data.offers || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

    const filtered = statusFilter === 'ALL' ? offers : offers.filter(o => o.status === statusFilter);

    const statusStyle = (s: string) => {
        if (s === 'ACCEPTED') return { background: 'rgba(var(--green-rgb),.12)', color: 'var(--green)', border: '1px solid rgba(var(--green-rgb),.25)' };
        if (s === 'REJECTED') return { background: 'rgba(var(--red-rgb),.12)', color: 'var(--red)', border: '1px solid rgba(var(--red-rgb),.25)' };
        return { background: 'rgba(var(--orange-rgb),.12)', color: 'var(--orange)', border: '1px solid rgba(var(--orange-rgb),.25)' };
    };
    const statusLabel = (s: string) => s === 'ACCEPTED' ? '✅ Kabul' : s === 'REJECTED' ? '❌ Red' : '⏳ Bekliyor';

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>📩 Teklifler</h1>
                <p>Platformdaki tüm arsa payı tekliflerini izleyin</p>
            </div>

            <div className={styles.statsGrid}>
                {[
                    { icon: '📩', value: offers.length, label: 'Toplam' },
                    { icon: '⏳', value: offers.filter(o => o.status === 'PENDING').length, label: 'Bekleyen' },
                    { icon: '✅', value: offers.filter(o => o.status === 'ACCEPTED').length, label: 'Kabul' },
                    { icon: '❌', value: offers.filter(o => o.status === 'REJECTED').length, label: 'Red' },
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
                    {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={statusFilter === s ? styles.segmentTabActive : styles.segmentTab}
                        >
                            {s === 'ALL' ? 'Tümü' : statusLabel(s)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📩</div>
                    Henüz teklif bulunmuyor
                </div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Teklif Veren</th>
                                <th>İlan</th>
                                <th>Konum</th>
                                <th style={{ textAlign: 'center' }}>Arsa Payı</th>
                                <th>Mesaj</th>
                                <th>Durum</th>
                                <th>Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(offer => (
                                <tr key={offer.id}>
                                    <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{offer.bidder?.name || offer.bidder?.email || '—'}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{offer.listing?.report?.title || '—'}</td>
                                    <td style={{ fontSize: '0.82rem' }}>
                                        {offer.listing?.district ? `${offer.listing.district}, ${offer.listing.city}` : offer.listing?.city || '—'}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                                        %{Math.round(offer.offeredShare * 100)}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {offer.message || '—'}
                                    </td>
                                    <td>
                                        <span className={styles.roleBadge} style={statusStyle(offer.status)}>
                                            {statusLabel(offer.status)}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem' }}>{formatDate(offer.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>

                    <div className={styles.mobileCardList}>
                        <CardList>
                            {filtered.map(offer => (
                                <DataCard
                                    key={offer.id}
                                    className={styles.dataCardGlass}
                                    title={offer.bidder?.name || offer.bidder?.email || '—'}
                                    subtitle={offer.listing?.report?.title || '—'}
                                    fields={[
                                        {
                                            label: 'Konum',
                                            value: offer.listing?.district ? `${offer.listing.district}, ${offer.listing.city}` : offer.listing?.city || '—',
                                        },
                                        {
                                            label: 'Arsa Payı',
                                            value: <span className={styles.tabularNums}>%{Math.round(offer.offeredShare * 100)}</span>,
                                        },
                                        { label: 'Mesaj', value: offer.message || '—' },
                                        { label: 'Durum', value: statusLabel(offer.status) },
                                        { label: 'Tarih', value: formatDate(offer.createdAt) },
                                    ]}
                                />
                            ))}
                        </CardList>
                    </div>
                </>
            )}
        </>
    );
}
