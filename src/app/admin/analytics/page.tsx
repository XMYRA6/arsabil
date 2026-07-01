"use client";

import { useEffect, useState } from "react";
import styles from '../admin.module.css';

interface AnalyticsData {
    totalUsers: number;
    totalReports: number;
    totalListings: number;
    totalOffers: number;
    roleDistribution: { role: string; count: number }[];
    recentUsers: { name: string | null; email: string | null; createdAt: string }[];
    cityDistribution: { city: string; count: number }[];
}

const ROLE_LABELS: Record<string, string> = {
    USER: 'Kullanıcı',
    ARSA_SAHIBI: 'Arsa Sahibi',
    MUTEAHHIT: 'Müteahhit',
    DANISMAN: 'Danışman',
    ADMIN: 'Admin',
};

const ROLE_COLORS: Record<string, string> = {
    USER: 'var(--green)',
    ARSA_SAHIBI: 'var(--orange)',
    MUTEAHHIT: 'var(--info)',
    DANISMAN: 'var(--accent-violet-stat)',
    ADMIN: 'var(--red)',
};

export default function AdminAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Yükleniyor...</div>;
    if (!data) return null;

    const conversionRate = data.totalReports > 0 ? ((data.totalListings / data.totalReports) * 100).toFixed(1) : '0';
    const offerRate = data.totalListings > 0 ? ((data.totalOffers / data.totalListings) * 100).toFixed(1) : '0';

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>📈 Platform Analitiği</h1>
                <p>ArsaBil kullanım istatistikleri ve dönüşüm metrikleri</p>
            </div>

            {/* KPI Cards */}
            <div className={styles.statsGrid}>
                {[
                    { icon: '👥', value: data.totalUsers, label: 'Toplam Kullanıcı' },
                    { icon: '📄', value: data.totalReports, label: 'Hesaplama' },
                    { icon: '🏗️', value: data.totalListings, label: 'İlan' },
                    { icon: '📩', value: data.totalOffers, label: 'Teklif' },
                ].map(s => (
                    <div key={s.label} className={styles.statBox}>
                        <div className={styles.icon}>{s.icon}</div>
                        <div className={styles.value}>{s.value}</div>
                        <div className={styles.label}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Funnel */}
            <div className={styles.settingsCard}>
                <h3>📊 Dönüşüm Hunisi</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        { label: 'Hesaplama → İlan', value: `%${conversionRate}`, color: 'var(--info)', width: conversionRate },
                        { label: 'İlan → Teklif', value: `%${offerRate}`, color: 'var(--green)', width: offerRate },
                        { label: 'Ortalama Teklif/İlan', value: data.totalListings > 0 ? (data.totalOffers / data.totalListings).toFixed(1) : '0', color: 'var(--orange)', width: String(Math.min(100, data.totalListings > 0 ? (data.totalOffers / data.totalListings) * 20 : 0)) },
                    ].map(f => (
                        <div key={f.label} style={{
                            background: 'var(--bg)', borderRadius: 14, padding: '16px 18px',
                            border: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>{f.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: f.color, marginBottom: 8 }}>{f.value}</div>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, parseFloat(f.width as string))}%`, background: f.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Role Distribution */}
                <div className={styles.settingsCard}>
                    <h3>👥 Rol Dağılımı</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.roleDistribution || []).map(r => (
                            <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: 3,
                                    background: ROLE_COLORS[r.role] || '#6b7280',
                                }} />
                                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                                    {ROLE_LABELS[r.role] || r.role}
                                </span>
                                <span style={{ fontWeight: 800, color: 'var(--card-title)', fontSize: '0.9rem' }}>{r.count}</span>
                                <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${data.totalUsers > 0 ? (r.count / data.totalUsers) * 100 : 0}%`,
                                        background: ROLE_COLORS[r.role] || '#6b7280',
                                        borderRadius: 3,
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* City Distribution */}
                <div className={styles.settingsCard}>
                    <h3>🏙️ İl Dağılımı</h3>
                    {(data.cityDistribution || []).length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem 0' }}>Henüz ilan verisi yok</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(data.cityDistribution || []).slice(0, 8).map(c => (
                                <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{c.city || 'Belirtilmemiş'}</span>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{c.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Users */}
            <div className={styles.settingsCard} style={{ marginTop: 14 }}>
                <h3>🕐 Son Kayıtlar</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(data.recentUsers || []).map((u, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 10,
                            background: i % 2 === 0 ? 'var(--bg)' : 'transparent',
                        }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: `hsl(${(i * 67) % 360}, 45%, 35%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '0.7rem', fontWeight: 800,
                            }}>
                                {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{u.name || u.email || '—'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
