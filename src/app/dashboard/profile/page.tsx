'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './profile.module.css'

type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'
type Theme = 'dark' | 'light'

interface Favorite {
    id: string;
    listingId: string;
    listing?: { title?: string; city?: string; district?: string; price?: number; report?: { title?: string } };
}

const PALETTES: { id: Theme; label: string; color: string; icon: string }[] = [
    { id: 'dark',  label: 'Gece',     color: '#1f6feb', icon: '🌙' },
    { id: 'light', label: 'Gündüz',   color: '#e0e8f4', icon: '☀️' },
]

interface ProfileData {
    id: string
    name: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    emailPrefs: string | null
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean; createdAt: string }[]
}

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const [tab, setTab] = useState<Tab>('portfolio')
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user?.image ?? null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [bio, setBio] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [website, setWebsite] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [theme, setTheme] = useState<Theme>('dark')
    const [emailPrefs, setEmailPrefs] = useState({ mesaj: true, teklif: true, ilan: true })
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [savedPrefs, setSavedPrefs] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [loadingFavs, setLoadingFavs] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hidrasyon + localStorage başlangıç teması
        setMounted(true)
        const saved = (localStorage.getItem('arsabil-theme') as Theme) || 'dark'
        setTheme(saved)
    }, [])

    useEffect(() => {
        if (tab !== 'favorites' || !session?.user) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sekme değişiminde favori listesi çekiliyor
        setLoadingFavs(true)
        fetch('/api/favorites')
            .then(r => r.json())
            .then(data => setFavorites(Array.isArray(data) ? data : []))
            .catch(() => setFavorites([]))
            .finally(() => setLoadingFavs(false))
    }, [tab, session?.user])

    useEffect(() => {
        if (!session?.user?.id) return
        fetch(`/api/user/profile/${session.user.id}`)
            .then(r => r.json())
            .then((data: ProfileData & { image?: string | null }) => {
                setProfile(data)
                setBio(data.bio ?? '')
                setLinkedin(data.linkedin ?? '')
                setWebsite(data.website ?? '')
                if (data.image) setAvatarUrl(data.image)
                if (data.emailPrefs) {
                    try {
                        setEmailPrefs(JSON.parse(data.emailPrefs))
                    } catch { /* keep defaults */ }
                }
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

    const saveEmailPrefs = async () => {
        setSavingPrefs(true)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailPrefs }),
            })
            if (res.ok) {
                setSavedPrefs(true)
                setTimeout(() => setSavedPrefs(false), 2000)
            }
        } finally {
            setSavingPrefs(false)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setUploadingAvatar(true)
        try {
            const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
            const data = await res.json()
            if (res.ok) {
                setAvatarUrl(data.imageUrl)
                await update({ image: data.imageUrl })
            }
        } finally {
            setUploadingAvatar(false)
        }
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
                    <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                        {avatarUrl
                            ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                            : <div className={styles.avatarCircle}>{getInitials()}</div>
                        }
                        <div className={styles.avatarOverlay}>
                            {uploadingAvatar ? '⏳' : '📷'}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleAvatarUpload}
                        />
                    </div>
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
                            { key: 'favorites', label: '❤️ Favorilerim' },
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

                        {tab === 'favorites' && (
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                    Favorilerim
                                </h3>
                                {loadingFavs ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Yükleniyor…</div>
                                ) : favorites.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>❤️</div>
                                        Henüz favori ilan eklemediniz
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {favorites.map((fav) => (
                                            <a
                                                key={fav.id}
                                                href={`/listing/${fav.listingId}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '12px 14px',
                                                    background: 'var(--bg)', borderRadius: 10,
                                                    border: '1.5px solid var(--border)',
                                                    textDecoration: 'none', color: 'inherit',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>🏗️</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--card-title)' }}>
                                                        {fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>→</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'settings' && (
                            <>
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

                                {/* E-posta Tercihleri */}
                                <div style={{ marginTop: 28 }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 16 }}>
                                        E-posta Bildirimleri
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {([
                                            { key: 'mesaj', label: 'Yeni mesaj bildirimleri' },
                                            { key: 'teklif', label: 'Yeni teklif bildirimleri' },
                                            { key: 'ilan', label: 'İlan durum bildirimleri' },
                                        ] as const).map(({ key, label }) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{label}</span>
                                                <div
                                                    onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                                                    style={{
                                                        width: 40, height: 22, borderRadius: 11,
                                                        background: emailPrefs[key] ? 'var(--primary)' : 'var(--border)',
                                                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 16, height: 16, background: 'white', borderRadius: '50%',
                                                        position: 'absolute', top: 3,
                                                        left: emailPrefs[key] ? 21 : 3,
                                                        transition: 'left 0.2s',
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={saveEmailPrefs}
                                        disabled={savingPrefs}
                                        style={{
                                            marginTop: 16, padding: '8px 20px',
                                            background: savedPrefs ? '#10b981' : 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: savingPrefs ? 0.6 : 1, transition: 'background 0.3s',
                                        }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
