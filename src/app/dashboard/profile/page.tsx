'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { AppBar } from '@/components/mobile/AppBar'
import styles from './profile.module.css'

type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'
type Theme = 'dark' | 'light'

const SECTION_TITLES: Record<Tab, string> = {
    portfolio: 'Portfolyo',
    listings:  'İlanlarım',
    favorites: 'Favorilerim',
    settings:  'Tema & Ayarlar',
}

const ICON_PROPS = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const FolderIcon = () => (
    <svg {...ICON_PROPS}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
)
const BuildingIcon = () => (
    <svg {...ICON_PROPS}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1" /></svg>
)
const HeartIcon = () => (
    <svg {...ICON_PROPS} fill="white"><path d="M12 21s-7.5-4.7-10-9.3C.5 8 2 4.5 5.5 4c2.1-.3 4 .8 6.5 3.3C14.5 4.8 16.4 3.7 18.5 4 22 4.5 23.5 8 22 11.7 19.5 16.3 12 21 12 21Z" /></svg>
)
const GearIcon = () => (
    <svg {...ICON_PROPS}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
)

const MENU_ITEMS: { key: Tab; icon: ReactNode; colorClass: string; label: string; subtitle: string }[] = [
    { key: 'portfolio', icon: <FolderIcon />,   colorClass: styles.menuIconBoxBlue,   label: 'Portfolyo',       subtitle: 'Hesapladığın fizibilite raporları' },
    { key: 'listings',  icon: <BuildingIcon />, colorClass: styles.menuIconBoxOrange, label: 'İlanlarım',       subtitle: 'Yayınladığın ve taslak ilanların' },
    { key: 'favorites', icon: <HeartIcon />,    colorClass: styles.menuIconBoxRed,    label: 'Favorilerim',     subtitle: 'Kaydettiğin ilanlar' },
    { key: 'settings',  icon: <GearIcon />,     colorClass: styles.menuIconBoxGray,   label: 'Tema & Ayarlar',  subtitle: 'Görünüm, bildirimler ve hesap' },
]

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
    const [theme, setTheme] = useState<Theme>('light')
    const [emailPrefs, setEmailPrefs] = useState({ mesaj: true, teklif: true, ilan: true })
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [savedPrefs, setSavedPrefs] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [loadingFavs, setLoadingFavs] = useState(false)
    const [mobileSectionOpen, setMobileSectionOpen] = useState(false)
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hidrasyon + localStorage başlangıç teması
        setMounted(true)
        // ThemeToggle ile AYNI dogrulama: kaldirilmis `sky`/`mint`/`sand`
        // degerleri hala kullanicilarin tarayicisinda duruyor. Burada `!`
        // olmadigi icin cokmuyor ama dogrulanmamis deger yine de temaya
        // gecirilmemeli (A1 minor).
        const ham = localStorage.getItem('arsabil-theme')
        const saved: Theme = ham === 'dark' || ham === 'light' ? ham : 'light'
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

    const openSection = (key: Tab) => {
        setTab(key)
        setMobileSectionOpen(true)
    }

    const closeSection = () => setMobileSectionOpen(false)

    const menuCount = (key: Tab): number | null => {
        if (key === 'portfolio') return profile?.reports?.length ?? 0
        if (key === 'listings') return profile?.listings?.length ?? 0
        return null
    }

    const startEditingProfile = () => setIsEditingProfile(true)

    const cancelEditingProfile = () => {
        setBio(profile?.bio ?? '')
        setLinkedin(profile?.linkedin ?? '')
        setWebsite(profile?.website ?? '')
        setIsEditingProfile(false)
    }

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
            setIsEditingProfile(false)
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

    const handleExportData = async () => {
        setExporting(true)
        try {
            const res = await fetch('/api/user/export')
            if (!res.ok) throw new Error('export failed')
            const data = await res.json()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `arsabil-verilerim-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            alert('Veri indirme sırasında bir hata oluştu.')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError('Şifrenizi girmelisiniz.')
            return
        }
        setDeleting(true)
        setDeleteError('')
        try {
            const res = await fetch('/api/user/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            })
            const data = await res.json()
            if (res.ok) {
                await signOut({ callbackUrl: '/' })
            } else {
                setDeleteError(data.message || 'Hesap silinemedi.')
                setDeleting(false)
            }
        } catch {
            setDeleteError('Bağlantı hatası.')
            setDeleting(false)
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

    const completionChecks = [!!avatarUrl, !!profile?.bio, !!profile?.linkedin, !!profile?.website]
    const completionPct = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100)

    if (!session || !mounted) return null

    return (
        <>
            <AppBar
                title={mobileSectionOpen ? SECTION_TITLES[tab] : 'Profilim'}
                showBack={mobileSectionOpen}
                onBack={closeSection}
            />
            <div
                className={styles.container}
                data-mobile-section={mobileSectionOpen ? 'true' : 'false'}
                data-profile-edit={isEditingProfile ? 'true' : 'false'}
            >
                <h1 className={styles.pageTitle}>Profilim</h1>

            <div className={styles.layout}>
                {/* Sol: Profil kartı */}
                <div className={styles.profileCard}>
                    <div className={styles.avatarRing}>
                        <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                            {avatarUrl
                                ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                : <div className={styles.avatarCircle}>{getInitials()}</div>
                            }
                            <div className={styles.avatarOverlay}>
                                {uploadingAvatar ? '⏳' : '📷'}
                            </div>
                            <button
                                type="button"
                                className={styles.avatarEditBadge}
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                                aria-label="Profil fotoğrafını değiştir"
                            >
                                <span className={styles.avatarEditBadgeIcon}>
                                    {uploadingAvatar ? '⏳' : '✏️'}
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={handleAvatarUpload}
                            />
                        </div>
                    </div>
                    <div className={styles.nameRow}>
                        <div>
                            <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                            <p className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</p>
                        </div>
                    </div>

                    <div className={styles.heroName}>
                        <span className={styles.heroNameText}>{session.user?.name || 'Kullanıcı'}</span>
                        <span className={styles.heroSubline}>
                            {(session.user as { role?: string })?.role || 'USER'}
                        </span>
                    </div>

                    {profile?.isVerified && (
                        <div className={styles.verifiedBadge}>✓ Doğrulandı</div>
                    )}

                    <div className={styles.completionCard}>
                        <div className={styles.completionTop}>
                            <span className={styles.completionTitle}>
                                {completionPct === 100 ? 'Profilin tamam' : `Profilin %${completionPct} tamamlandı`}
                            </span>
                            {completionPct < 100 && <span className={styles.completionPct}>{completionPct}%</span>}
                        </div>
                        {completionPct < 100 && (
                            <div className={styles.completionTrack}>
                                <div className={styles.completionFill} style={{ width: `${completionPct}%` }} />
                            </div>
                        )}
                        <button type="button" className={styles.completionCta} onClick={startEditingProfile}>
                            {completionPct === 100 ? 'Profili düzenle' : 'Profili tamamla'} →
                        </button>
                    </div>

                    <div className={styles.profileEditForm}>
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
                        <button type="button" className={styles.cancelBtn} onClick={cancelEditingProfile}>
                            İptal
                        </button>
                    </div>
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

                    <div className={styles.menuList}>
                        <p className={styles.sectionLabel}>Hesabım</p>
                        {MENU_ITEMS.filter(item => item.key !== 'settings').map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={`${styles.menuIconBox} ${item.colorClass}`}>{item.icon}</span>
                                <span className={styles.menuRowBody}>
                                    <span className={styles.menuLabel}>{item.label}</span>
                                    <span className={styles.menuSubtitle}>{item.subtitle}</span>
                                </span>
                                {menuCount(item.key) !== null && <span className={styles.menuCount}>{menuCount(item.key)}</span>}
                                <span className={styles.menuChevron}>›</span>
                            </button>
                        ))}
                        <p className={styles.sectionLabel}>Tercihler</p>
                        {MENU_ITEMS.filter(item => item.key === 'settings').map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={styles.menuRow}
                                onClick={() => openSection(item.key)}
                            >
                                <span className={`${styles.menuIconBox} ${item.colorClass}`}>{item.icon}</span>
                                <span className={styles.menuRowBody}>
                                    <span className={styles.menuLabel}>{item.label}</span>
                                    <span className={styles.menuSubtitle}>{item.subtitle}</span>
                                </span>
                                <span className={styles.menuChevron}>›</span>
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
                                <h3 className={styles.favSectionTitle}>
                                    Favorilerim
                                </h3>
                                {loadingFavs ? (
                                    <div className={styles.favEmpty}>Yükleniyor…</div>
                                ) : favorites.length === 0 ? (
                                    <div className={styles.favEmpty}>
                                        <div className={styles.favEmptyIcon}>❤️</div>
                                        Henüz favori ilan eklemediniz
                                    </div>
                                ) : (
                                    <div className={styles.favList}>
                                        {favorites.map((fav) => (
                                            <a
                                                key={fav.id}
                                                href={`/listing/${fav.listingId}`}
                                                className={styles.favRow}
                                            >
                                                <span className={styles.favIcon}>🏗️</span>
                                                <div className={styles.favBody}>
                                                    <div className={styles.favTitle}>
                                                        {fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}
                                                    </div>
                                                    <div className={styles.favMeta}>
                                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                                    </div>
                                                </div>
                                                <span className={styles.favArrow}>→</span>
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
                                            background: savedPrefs ? 'var(--green)' : 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: savingPrefs ? 0.6 : 1, transition: 'background 0.3s',
                                        }}
                                    >
                                        {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                                    </button>
                                </div>

                                {/* Hesap Yönetimi */}
                                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 12 }}>
                                        Hesap
                                    </h3>
                                    <button
                                        onClick={handleExportData}
                                        disabled={exporting}
                                        style={{
                                            padding: '8px 20px', background: 'var(--panel)', color: 'var(--text)',
                                            border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                            opacity: exporting ? 0.6 : 1, marginRight: 10,
                                        }}
                                    >
                                        {exporting ? 'Hazırlanıyor…' : '📥 Verilerimi İndir'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        style={{
                                            padding: '8px 20px', background: 'transparent', color: '#ef4444',
                                            border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                        }}
                                    >
                                        Hesabımı Sil
                                    </button>
                                </div>

                                <button onClick={() => signOut()} className={styles.settingsSignOutBtn}>
                                    Çıkış Yap
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showDeleteModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    }}
                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                >
                    <div
                        style={{
                            background: 'var(--panel)', borderRadius: 16, padding: 24,
                            maxWidth: 400, width: '90%', border: '1px solid var(--border)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--card-title)', marginBottom: 8 }}>
                            Hesabını silmek istediğine emin misin?
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 16 }}>
                            Bu işlem geri alınamaz. Tüm projelerin, ilanların, mesajların ve raporların kalıcı olarak silinecek.
                        </p>
                        {deleteError && (
                            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12 }}>
                                {deleteError}
                            </div>
                        )}
                        <input
                            type="password"
                            placeholder="Şifreni gir"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: 8,
                                border: '1px solid var(--border)', background: 'var(--bg)',
                                color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.85rem', marginBottom: 16,
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                                    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                                    background: '#ef4444', color: 'white', cursor: 'pointer',
                                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
                                    opacity: deleting ? 0.6 : 1,
                                }}
                            >
                                {deleting ? 'Siliniyor…' : 'Evet, Hesabımı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.mobileSignOut}>
                <button type="button" className={styles.mobileSignOutBtn} onClick={() => signOut()}>
                    Çıkış Yap
                </button>
            </div>
            </div>
        </>
    )
}
