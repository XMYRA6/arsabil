import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { IlanKarti } from './IlanKarti'
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
        // Profil API'si oturum ister; sunucu tarafı fetch istemci çerezlerini kendiliğinden taşımaz,
        // aksi halde istek /login'e yönlenip HTML döner ve JSON ayrıştırma 500 verir.
        const cookieHeader = (await cookies()).toString()
        const res = await fetch(`${base}/api/user/profile/${userId}`, {
            cache: 'no-store',
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
            redirect: 'manual',
        })
        if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null
        return await res.json()
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
            <section className={styles.header}>
                {profile.image
                    ? <Image unoptimized src={profile.image} width={88} height={88} className={styles.avatarImg} alt="Profil fotoğrafı" />
                    : <div className={styles.avatarCircle}>{getInitials(profile.name)}</div>
                }
                <div className={styles.headerBody}>
                    <h1 className={styles.name}>{profile.name || 'Kullanıcı'}</h1>
                    {profile.isVerified && <span className={styles.verifiedBadge}>Doğrulanmış</span>}
                    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                    <div className={styles.links}>
                        {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>LinkedIn</a>}
                        {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.link}>Website</a>}
                    </div>
                </div>
                <Link href={`/inbox?with=${profile.id}`} className={styles.ctaBtn}>Mesaj gönder</Link>
            </section>

            {profile.listings.length > 0 && (
                <section>
                    <h2 className={styles.sectionTitle}>Yayındaki ilanları</h2>
                    <div className={styles.ilanGrid}>
                        {profile.listings.map(l => (
                            <IlanKarti key={l.id} id={l.id} baslik={l.title || l.city || 'İsimsiz İlan'} price={l.price} />
                        ))}
                    </div>
                </section>
            )}

            {profile.reports.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Portfolyo ({profile.reports.length} proje)</h2>
                    {profile.reports.map(r => (
                        <div key={r.id} className={styles.listRow}>
                            <span className={styles.listTitle}>{r.title}</span>
                            <span className={styles.listMeta}>Arsa payı: %{(r.landShareRatio * 100).toFixed(0)}</span>
                        </div>
                    ))}
                </section>
            )}
        </div>
    )
}
