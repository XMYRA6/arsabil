import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

interface ProfileData {
    id: string
    name: string | null
    image: string | null
    bio: string | null
    linkedin: string | null
    website: string | null
    isVerified: boolean
    reports: { id: string; title: string; landShareRatio: number; createdAt: string }[]
    listings: { id: string; title: string | null; city: string | null; price: number | null; isActive: boolean }[]
}

async function getProfile(userId: string): Promise<ProfileData | null> {
    try {
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/user/profile/${userId}`, { cache: 'no-store' })
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

function getInitials(name: string | null) {
    if (!name) return 'US'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].substring(0, 2).toUpperCase()
}

export default async function PublicProfilePage(context: { params: Promise<{ userId: string }> }) {
    const { userId } = await context.params
    const profile = await getProfile(userId)
    if (!profile) notFound()

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {profile.image
                    ? <Image unoptimized src={profile.image} width={64} height={64} className={styles.avatarImg} alt="Profil fotoğrafı" />
                    : <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
                }
                <div>
                    <h1 className={styles.name}>
                        {profile.name || 'Kullanıcı'}
                        {profile.isVerified && <span className={styles.verifiedBadge}>✓ Doğrulandı</span>}
                    </h1>
                    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                    <div className={styles.links}>
                        {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>🔗 LinkedIn</a>}
                        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.link}>🌐 Website</a>}
                    </div>
                </div>
            </div>

            {profile.reports.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Portfolyo ({profile.reports.length} proje)</h2>
                    {profile.reports.map(r => (
                        <div key={r.id} className={styles.listRow}>
                            <span className={styles.listTitle}>{r.title}</span>
                            <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            )}

            {profile.listings.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Aktif İlanlar ({profile.listings.length})</h2>
                    {profile.listings.map(l => (
                        <Link key={l.id} href={`/listing/${l.id}`} className={styles.listRow}>
                            <span className={styles.listTitle}>{l.title || 'İsimsiz İlan'}</span>
                            <span className={styles.listMeta}>{l.city || '—'} · {l.price ? l.price.toLocaleString('tr-TR') + ' ₺' : ''}</span>
                        </Link>
                    ))}
                </div>
            )}

            <Link href="/marketplace" className={styles.ctaBtn}>Marketplace&apos;e Göz At →</Link>
        </div>
    )
}
