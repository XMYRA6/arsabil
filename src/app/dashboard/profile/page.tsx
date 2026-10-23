'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './profile.module.css'

type Tab = 'portfolio' | 'listings' | 'favorites' | 'settings'
type Theme = 'dark' | 'light'

const TABS: { key: Tab; label: string }[] = [
    { key: 'portfolio', label: 'Portfolyo' },
    { key: 'listings',  label: 'İlanlarım' },
    { key: 'favorites', label: 'Favorilerim' },
    { key: 'settings',  label: 'Tema & ayarlar' },
]

interface Favorite {
    id: string;
    listingId: string;
    listing?: { title?: string; city?: string; district?: string; price?: number; report?: { title?: string } };
}

const PALETTES: { id: Theme; label: string; color: string }[] = [
    { id: 'light', label: 'Gündüz', color: '#f3efe7' },
    { id: 'dark',  label: 'Gece',   color: '#0f1a2e' },
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
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')

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

    const cancelEditingProfile = () => {
        setBio(profile?.bio ?? '')
        setLinkedin(profile?.linkedin ?? '')
        setWebsite(profile?.website ?? '')
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
        setExportError('')
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
            setExportError('Veri indirme sırasında bir hata oluştu.')
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
        <main className={styles.shell}>
            <h1 className={styles.pageTitle}>Profilim</h1>

            <section className={`${styles.card} ${styles.heroCard}`}>
                <button type="button" className={styles.avatarBtn} onClick={() => fileInputRef.current?.click()} aria-label="Profil fotoğrafını değiştir">
                    {avatarUrl
                        ? <Image fill unoptimized src={avatarUrl} alt="Profil fotoğrafı" style={{ objectFit: 'cover' }} />
                        : <span className={styles.avatarInitials}>{getInitials()}</span>}
                    {uploadingAvatar && <span className={styles.avatarBusy}>…</span>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                <div className={styles.identity}>
                    <h2 className={styles.displayName}>{session.user?.name || 'Kullanıcı'}</h2>
                    <div className={styles.badges}>
                        <span className={styles.roleTag}>{(session.user as { role?: string })?.role || 'USER'}</span>
                        {profile?.isVerified && <span className={styles.verifiedBadge}>E-posta doğrulandı</span>}
                    </div>
                </div>
                <div className={styles.completion}>
                    <span className={styles.completionTitle}>
                        {completionPct === 100 ? 'Profilin tamam' : `Profilin %${completionPct} tamamlandı`}
                    </span>
                    <div className={styles.completionTrack} role="progressbar" aria-valuenow={completionPct} aria-valuemin={0} aria-valuemax={100}>
                        <div className={styles.completionFill} style={{ width: `${completionPct}%` }} />
                    </div>
                    <Link href="/dashboard/profile/edit" className={styles.completionCta}>
                        {completionPct === 100 ? 'Profili düzenle' : 'Profili tamamla'} →
                    </Link>
                </div>
            </section>

            <div className={styles.tabs} role="tablist" aria-label="Profil bölümleri">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={tab === t.key ? styles.tabActive : styles.tab}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'portfolio' && (
                <>
                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>Hakkımda</h3>
                        <div className={styles.formStack}>
                            <label className={styles.field}>
                                <span>Kendinizi tanıtın</span>
                                <textarea
                                    placeholder="Trabzon’da arsa ve kat karşılığı projeleriyle ilgileniyorum…"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    maxLength={300}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>LinkedIn</span>
                                <input placeholder="https://linkedin.com/in/..." value={linkedin} onChange={e => setLinkedin(e.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>Website</span>
                                <input placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} />
                            </label>
                            <div className={styles.btnRow}>
                                <button type="button" className={styles.btn} onClick={handleSave} disabled={saving}>
                                    {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                                <button type="button" className={styles.btnSoft} onClick={cancelEditingProfile}>İptal</button>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>Portfolyo</h3>
                        {profile?.reports && profile.reports.length > 0 ? (
                            <div className={styles.rows}>
                                {profile.reports.map(r => (
                                    <Link key={r.id} href={`/hesapla?reportId=${r.id}`} className={styles.listRow}>
                                        <span className={styles.listTitle}>{r.title}</span>
                                        <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyNote}>Henüz hesaplama yok. <Link href="/hesapla" className={styles.emptyNoteLink}>Hesapla →</Link></p>
                        )}
                    </section>
                </>
            )}

            {tab === 'listings' && (
                <section className={styles.card}>
                    <h3 className={styles.cardTitle}>İlanlarım</h3>
                    {profile?.listings && profile.listings.length > 0 ? (
                        <div className={styles.rows}>
                            {profile.listings.map(l => (
                                <Link key={l.id} href={`/listing/${l.id}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{l.title || 'İsimsiz İlan'}</span>
                                    <span className={styles.listMeta}>{l.city || '—'} · {l.price ? l.price.toLocaleString('tr-TR') + ' ₺' : 'Fiyat yok'}</span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyNote}>Aktif ilan yok. <Link href="/listings/new" className={styles.emptyNoteLink}>İlan Oluştur →</Link></p>
                    )}
                </section>
            )}

            {tab === 'favorites' && (
                <section className={styles.card}>
                    <h3 className={styles.cardTitle}>Favorilerim</h3>
                    {loadingFavs ? (
                        <p className={styles.emptyNote}>Yükleniyor…</p>
                    ) : favorites.length === 0 ? (
                        <p className={styles.emptyNote}>Henüz favori ilan eklemediniz</p>
                    ) : (
                        <div className={styles.rows}>
                            {favorites.map(fav => (
                                <Link key={fav.id} href={`/listing/${fav.listingId}`} className={styles.listRow}>
                                    <span className={styles.listTitle}>{fav.listing?.title ?? fav.listing?.report?.title ?? 'İlan'}</span>
                                    <span className={styles.listMeta}>
                                        {fav.listing?.district && `${fav.listing.district}, `}{fav.listing?.city ?? '—'}
                                        {fav.listing?.price ? ` · ${fav.listing.price.toLocaleString('tr-TR')} TL` : ''}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {tab === 'settings' && (
                <>
                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>Tema</h3>
                        <div className={styles.themeGrid}>
                            {PALETTES.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    aria-pressed={theme === p.id}
                                    className={theme === p.id ? styles.themeBtnActive : styles.themeBtn}
                                    onClick={() => applyTheme(p.id)}
                                >
                                    <span className={styles.themeSwatch} style={{ background: p.color }} />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <p className={styles.hint}>Varsayılan tema gündüzdür; sistem ayarına göre otomatik seçilebilir.</p>
                    </section>

                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>E-posta bildirimleri</h3>
                        <div className={styles.toggleList}>
                            {([
                                { key: 'mesaj', label: 'Yeni mesaj bildirimleri' },
                                { key: 'teklif', label: 'Yeni teklif bildirimleri' },
                                { key: 'ilan', label: 'İlan durum bildirimleri' },
                            ] as const).map(({ key, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={emailPrefs[key]}
                                    className={styles.toggleRow}
                                    onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
                                >
                                    <span className={styles.toggleLabel}>{label}</span>
                                    <span className={`${styles.toggleSwitch} ${emailPrefs[key] ? styles.toggleSwitchOn : ''}`}>
                                        <span className={`${styles.toggleKnob} ${emailPrefs[key] ? styles.toggleKnobOn : ''}`} />
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.btnRow}>
                            <button type="button" onClick={saveEmailPrefs} disabled={savingPrefs} className={styles.btn}>
                                {savingPrefs ? 'Kaydediliyor…' : savedPrefs ? 'Kaydedildi ✓' : 'Kaydet'}
                            </button>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>Veri ve hesap</h3>
                        <div className={styles.btnRow}>
                            <button type="button" onClick={handleExportData} disabled={exporting} className={styles.btnSoft}>
                                {exporting ? 'Hazırlanıyor…' : 'Verilerimi indir'}
                            </button>
                            <button type="button" onClick={() => setShowDeleteModal(true)} className={styles.btnSoft}>
                                Hesabımı sil
                            </button>
                            <button type="button" onClick={() => signOut()} className={styles.btnSoft}>
                                Çıkış yap
                            </button>
                        </div>
                        {exportError && (
                            <div role="alert" className={styles.inlineError}>
                                {exportError}
                            </div>
                        )}
                        <p className={styles.hint}>Hesap silme geri alınamaz; şifreni onaylaman istenir.</p>
                    </section>
                </>
            )}

            {showDeleteModal && (
                <div
                    className={styles.deleteModalOverlay}
                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }}
                >
                    <div className={styles.deleteModalCard} role="dialog" aria-modal="true" aria-label="Hesabı sil" onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.deleteModalTitle}>Hesabını silmek istediğine emin misin?</h3>
                        <p className={styles.deleteModalBody}>
                            Bu işlem geri alınamaz. Tüm projelerin, ilanların, mesajların ve raporların kalıcı olarak silinecek.
                        </p>
                        {deleteError && <div className={styles.inlineError} role="alert">{deleteError}</div>}
                        <input
                            type="password"
                            placeholder="Şifreni gir"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className={styles.deleteModalInput}
                        />
                        <div className={styles.btnRow}>
                            <button type="button" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError('') }} className={styles.btnSoft}>
                                Vazgeç
                            </button>
                            <button type="button" onClick={handleDeleteAccount} disabled={deleting} className={styles.btnDanger}>
                                {deleting ? 'Siliniyor…' : 'Evet, Hesabımı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
