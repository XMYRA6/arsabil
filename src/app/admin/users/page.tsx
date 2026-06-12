"use client";

import { useEffect, useState } from "react";
import styles from '../admin.module.css';

interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    plan: string;
    isVerified: boolean;
    isBanned?: boolean;
    createdAt: string;
    _count: { reports: number; listings: number; offers: number };
}

const ROLES = [
    { value: 'USER', label: 'Kullanıcı', color: '#10b981' },
    { value: 'ARSA_SAHIBI', label: 'Arsa Sahibi', color: '#f59e0b' },
    { value: 'MUTEAHHIT', label: 'Müteahhit', color: '#3b82f6' },
    { value: 'DANISMAN', label: 'Danışman', color: '#8b5cf6' },
    { value: 'ADMIN', label: 'Admin', color: '#ef4444' },
];

function getRoleStyle(role: string) {
    const r = ROLES.find(x => x.value === role);
    const c = r?.color || '#6b7280';
    return { background: `${c}18`, color: c, border: `1px solid ${c}33` };
}

export default function AdminUsers() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchUsers = () => {
        setLoading(true);
        fetch('/api/admin/users')
            .then(r => r.json())
            .then(data => { setUsers(data.users || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- bileşen montajında veri çekme; setState fetchUsers içinde gerçekleşiyor
    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setMessage(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: '✅ Rol güncellendi.' });
                fetchUsers();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Hata oluştu.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const handleBan = async (userId: string, ban: boolean) => {
        if (!confirm(ban ? 'Bu kullanıcıyı askıya almak istediğinize emin misiniz?' : 'Askıyı kaldırmak istediğinize emin misiniz?')) return;
        setMessage(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isBanned: ban }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: ban ? '🚫 Kullanıcı askıya alındı.' : '✅ Askı kaldırıldı.' });
                fetchUsers();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const handleVerified = async (userId: string, isVerified: boolean) => {
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isVerified }),
            });
            fetchUsers();
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handlePlan = async (userId: string, plan: string) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, plan }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `✅ Plan güncellendi: ${plan}` });
                fetchUsers();
            }
        } catch {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

    const filteredUsers = users.filter(u => {
        const matchSearch = !search ||
            (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    return (
        <>
            <div className={styles.pageHeader}>
                <h1>👥 Kullanıcılar</h1>
                <p>Platformdaki tüm kullanıcıları yönetin, rollerini değiştirin ve hesapları askıya alın</p>
            </div>

            {/* Stats row */}
            <div className={styles.statsGrid}>
                {[
                    { icon: '👥', value: users.length, label: 'Toplam' },
                    { icon: '🏠', value: users.filter(u => u.role === 'ARSA_SAHIBI').length, label: 'Arsa Sahibi' },
                    { icon: '🏗️', value: users.filter(u => u.role === 'MUTEAHHIT').length, label: 'Müteahhit' },
                    { icon: '🚫', value: users.filter(u => u.isBanned).length, label: 'Askıda' },
                ].map(s => (
                    <div key={s.label} className={styles.statBox}>
                        <div className={styles.icon}>{s.icon}</div>
                        <div className={styles.value}>{s.value}</div>
                        <div className={styles.label}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Toolbar: Search + Filter */}
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="İsim veya e-posta ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className={styles.roleSelect}
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                >
                    <option value="ALL">Tüm Roller</option>
                    {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>
                    {filteredUsers.length} / {users.length} kullanıcı
                </div>
            </div>

            {message && (
                <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Yükleniyor...</div>
            ) : (
                <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Kullanıcı</th>
                            <th>E-posta</th>
                            <th>Rol</th>
                            <th>Durum</th>
                            <th>Doğrulandı</th>
                            <th>Plan</th>
                            <th style={{ textAlign: 'center' }}>Rapor</th>
                            <th style={{ textAlign: 'center' }}>İlan</th>
                            <th style={{ textAlign: 'center' }}>Teklif</th>
                            <th>Kayıt</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} style={user.isBanned ? { opacity: 0.5 } : undefined}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 10,
                                            background: `hsl(${user.id.charCodeAt(0) * 7 % 360}, 50%, 35%)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '0.75rem', fontWeight: 800,
                                        }}>
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span>{user.name || '—'}</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{user.email || '—'}</td>
                                <td>
                                    <span className={styles.roleBadge} style={getRoleStyle(user.role)}>
                                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.roleBadge} style={
                                        user.isBanned
                                            ? { background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.25)' }
                                            : { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' }
                                    }>
                                        {user.isBanned ? '🚫 Askıda' : '✅ Aktif'}
                                    </span>
                                </td>
                                <td>
                                    <div
                                        onClick={() => handleVerified(user.id, !user.isVerified)}
                                        title={user.isVerified ? 'Doğrulamayı Kaldır' : 'Doğrula'}
                                        style={{
                                            width: 36, height: 18, borderRadius: 9,
                                            background: user.isVerified ? '#10b981' : '#30363d',
                                            position: 'relative', cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: 14, height: 14, background: 'white', borderRadius: '50%',
                                            position: 'absolute',
                                            top: 2,
                                            left: user.isVerified ? 20 : 2,
                                            transition: 'left 0.2s',
                                        }} />
                                    </div>
                                </td>
                                <td>
                                    <select
                                        value={user.plan ?? 'FREE'}
                                        onChange={e => handlePlan(user.id, e.target.value)}
                                        className={styles.roleSelect}
                                        style={{
                                            fontSize: '0.78rem', height: 28,
                                            color: user.plan === 'PRO' ? '#f59e0b' : 'var(--muted)',
                                        }}
                                    >
                                        <option value="FREE">FREE</option>
                                        <option value="PRO">PRO</option>
                                    </select>
                                </td>
                                <td style={{ textAlign: 'center' }}>{user._count.reports}</td>
                                <td style={{ textAlign: 'center' }}>{user._count.listings}</td>
                                <td style={{ textAlign: 'center' }}>{user._count.offers}</td>
                                <td style={{ fontSize: '0.82rem' }}>{formatDate(user.createdAt)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <select
                                            className={styles.roleSelect}
                                            value={user.role}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            style={{ fontSize: '0.78rem', height: 32 }}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleBan(user.id, !user.isBanned)}
                                            title={user.isBanned ? 'Askıyı Kaldır' : 'Askıya Al'}
                                            style={{
                                                width: 32, height: 32, borderRadius: 8,
                                                border: '1px solid var(--border)',
                                                background: user.isBanned ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                                                color: user.isBanned ? '#10b981' : '#ef4444',
                                                cursor: 'pointer', fontSize: '0.85rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            {user.isBanned ? '✓' : '⛔'}
                                        </button>
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
