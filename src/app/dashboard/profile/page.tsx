'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import styles from './profile.module.css'

type Tab = 'portfolio' | 'listings' | 'settings'
type Theme = 'dark' | 'light' | 'sky' | 'mint' | 'sand'

const PALETTES: { id: Theme; label: string; color: string; icon: string }[] = [
    { id: 'dark',  label: 'Gece',     color: '#1f6feb', icon: '🌙' },
    { id: 'light', label: 'Gündüz',   color: '#e0e8f4', icon: '☀️' },
    { id: 'sky',   label: 'Gökyüzü',  color: '#2b7cff', icon: '☁️' },
    { id: 'mint',  label: 'Nane',     color: '#1fbf9a', icon: '🍃' },
    { id: 'sand',  label: 'Kum',      color: '#f2a23a', icon: '🏜️' },
]

interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean; createdAt: string }[]
}

export default function ProfilePage() {
    const { data: session } = useSession()
    const [tab, setTab] = useState<Tab>('portfolio')
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [bio, setBio] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [website, setWebsite] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [theme, setTheme] = useState<Theme>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = (localStorage.getItem('arsabil-theme') as Theme) || 'dark'
        setTheme(saved)
    }, [])

    useEffect(() => {
        if (!session?.user?.id) return
        fetch(`/api/user/profile/${session.user.id}`)
            .then(r => r.json())
            .then((data: ProfileData) => {
                setProfile(data)
                setBio(data.bio ?? '')
                setLinkedin(data.linkedin ?? '')
                setWebsite(data.website ?? '')
            })
    }, [session?.user?.id])

    const applyTheme = (mode: Theme) => {
        setTheme(mode)
        document.documentElement.setAttribute('data-theme', mode)
        localStorage.setItem('arsabil-theme', mode)
    }

    const handleSave = async () => {
        setSaving(true)
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bio || null, linkedin: linkedin || null, website: website || null }),
        })
        if (res.ok) {
            const updated = await res.json()
            setProfile(prev => prev ? { ...prev, ...updated } : prev)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
        setSaving(false)
    }

    const getInitials = () => {
        if (!session?.user?.name) return 'US'
        const parts = session.user.name.trim().split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0].substring(0, 2).toUpperCase()
    }

    if (!session || !mounted) return null

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Profilim</h1>

            <div className={styles.layout}>
                {/* Sol: Profil kartı */}
                <div className={styles.profileCard}>
                    <div className={styles.avatarCircle}>{getInitials()}</div>
                    <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                    <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Hakkında</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Kendinizi tanıtın..."
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength={300}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>LinkedIn</label>
                        <input
                            className={styles.input}
                            placeholder="https://linkedin.com/in/..."
                            value={linkedin}
                            onChange={e => setLinkedin(e.target.value)}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Website</label>
                        <input
                            className={styles.input}
                            placeholder="https://..."
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                        />
                    </div>

                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>

                    <button
                        onClick={() => signOut()}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Çıkış Yap
                    </button>
                </div>

                {/* Sağ: Sekmeli panel */}
                <div className={styles.tabPanel}>
                    <div className={styles.tabs}>
                        {([
                            { key: 'portfolio', label: 'Portfolyo' },
                            { key: 'listings',  label: 'İlanlarım' },
                            { key: 'settings',  label: 'Tema & Ayarlar' },
                        ] as const).map(t => (
                            <button
                                key={t.key}
                                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                                onClick={() => setTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.tabContent}>
                        {tab === 'portfolio' && (
                            profile?.reports && profile.reports.length > 0 ? profile.reports.map(r => (
                                <Link key={r.id} href={`/hesapla?reportId=${r.id}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{r.title}</span>
                                    <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                                </Link>
                            )) : (
                                <p className={styles.emptyNote}>Henüz hesaplama yok. <Link href="/hesapla" style={{ color: 'var(--primary)' }}>Hesapla →</Link></p>
                            )
                        )}

                        {tab === 'listings' && (
                            profile?.listings && profile.listings.length > 0 ? profile.listings.map(l => (
                                <Link key={l.id} href={`/listing/${l.id}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{l.title || 'İsimsiz İlan'}</span>
                                    <span className={styles.listMeta}>{l.city || '—'} · {l.price ? l.price.toLocaleString('tr-TR') + ' ₺' : 'Fiyat yok'}</span>
                                </Link>
                            )) : (
                                <p className={styles.emptyNote}>Aktif ilan yok. <Link href="/listings/new" style={{ color: 'var(--primary)' }}>İlan Oluştur →</Link></p>
                            )
                        )}

                        {tab === 'settings' && (
                            <div className={styles.themeGrid}>
                                {PALETTES.map(p => (
                                    <button
                                        key={p.id}
                                        className={`${styles.themeBtn} ${theme === p.id ? styles.themeBtnActive : ''}`}
                                        onClick={() => applyTheme(p.id)}
                                    >
                                        <div className={styles.themeColor} style={{ background: p.color }} />
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
