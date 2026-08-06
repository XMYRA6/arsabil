'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

export interface DashboardData {
  stats: {
    reportCount: number
    activeListingCount: number
    offerCount: number
    unreadMessageCount: number
  }
  recentReports: Array<{
    id: string
    title: string
    createdAt: string
    landShareRatio: number
    minApartmentPrice: number
  }>
  recentMessages: Array<{
    id: string
    content: string
    createdAt: string
    sender: { id: string; name: string | null; image: string | null }
  }>
  recentOffers: Array<{
    id: string
    offeredShare: number
    status: string
    createdAt: string
    listing: { id: string; title: string | null; city: string | null }
    bidder: { id: string; name: string | null }
  }>
}

const STAT_CONFIG = [
  { key: 'reportCount',        label: 'Hesaplama',       rgb: '59, 130, 246' },   // --info
  { key: 'activeListingCount', label: 'Aktif İlan',       rgb: '16, 185, 129' },  // --green
  { key: 'offerCount',         label: 'Teklif',          rgb: '245, 158, 11' },  // --orange
  { key: 'unreadMessageCount', label: 'Okunmamış Mesaj', rgb: '139, 92, 246' },  // --accent-violet-stat
] as const

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/user/dashboard')
      .then(r => {
        if (!r.ok) throw new Error('dashboard fetch failed')
        return r.json()
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [status])

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Yükleniyor...</div></div>
  }

  if (error || !data) {
    return <div className={styles.container}><div className={styles.loading}>Veriler yüklenemedi. Lütfen sayfayı yenileyin.</div></div>
  }

  const { stats, recentReports, recentMessages, recentOffers } = data
  const statValues: Record<string, number> = stats

  const offerStatusClass = (s: string) => {
    if (s === 'PENDING') return styles.statusPending
    if (s === 'ACCEPTED') return styles.statusAccepted
    return styles.statusRejected
  }

  const offerStatusLabel = (s: string) => {
    if (s === 'PENDING') return 'Bekliyor'
    if (s === 'ACCEPTED') return 'Kabul'
    return 'Reddedildi'
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.welcome}>Hoş geldin, {(session?.user as { name?: string })?.name || 'Kullanıcı'}</p>

      {/* Stat kartları */}
      <div className={styles.statsGrid}>
        {STAT_CONFIG.map(({ key, label, rgb }) => (
          <div key={key} className={styles.statCard} style={{ '--card-accent-rgb': rgb } as React.CSSProperties}>
            <div className={styles.statValue}>{statValues[key] ?? 0}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* İki kolon */}
      <div className={styles.twoCol}>
        {/* Sol: Son raporlar */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Son Projeler & Raporlar</h2>
            <Link href="/dashboard/reports" className={styles.sectionLink}>Tümü →</Link>
          </div>
          {recentReports.length === 0 ? (
            <p className={styles.empty}>Henüz hesaplama yok. <Link href="/hesapla">Hesapla →</Link></p>
          ) : (
            <div className={styles.reportList}>
              {recentReports.map(r => (
                <div key={r.id} className={styles.reportRow}>
                  <div className={styles.reportInfo}>
                    <span className={styles.reportTitle}>{r.title}</span>
                    <span className={styles.reportMeta}>
                      Arsa payı: %{(r.landShareRatio * 100).toFixed(0)} · Min. daire: {r.minApartmentPrice.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className={styles.reportActions}>
                    <Link href={`/hesapla?reportId=${r.id}`} className={styles.actionLink}>Aç</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sağ: Mesajlar + Teklifler */}
        <div className={styles.rightCol}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Son Mesajlar</h2>
              <Link href="/inbox" className={styles.sectionLink}>Tümü →</Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className={styles.empty}>Mesaj yok.</p>
            ) : (
              <div className={styles.messageList}>
                {recentMessages.map(m => (
                  <Link key={m.id} href={`/inbox?with=${m.sender.id}`} className={styles.messageRow}>
                    <span className={styles.messageSender}>{m.sender.name || 'Kullanıcı'}</span>
                    <span className={styles.messagePreview}>
                      {m.content.length > 55 ? m.content.slice(0, 55) + '…' : m.content}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Son Teklifler</h2>
              <Link href="/dashboard/projects" className={styles.sectionLink}>Tümü →</Link>
            </div>
            {recentOffers.length === 0 ? (
              <p className={styles.empty}>Teklif yok.</p>
            ) : (
              <div className={styles.offerList}>
                {recentOffers.map(o => (
                  <Link key={o.id} href={`/listing/${o.listing.id}`} className={styles.offerRow}>
                    <span className={styles.offerAmount}>%{o.offeredShare} pay</span>
                    <span className={styles.offerListing}>{o.listing.title || o.listing.city || 'İlan'}</span>
                    <span className={`${styles.offerStatus} ${offerStatusClass(o.status)}`}>
                      {offerStatusLabel(o.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Hızlı aksiyonlar */}
      <div className={styles.quickActions}>
        <Link href="/hesapla" className={styles.qaBtn}>+ Yeni Hesaplama</Link>
        <Link href="/listings/new" className={styles.qaBtn}>+ Yeni İlan</Link>
        <Link href="/inbox" className={styles.qaBtn}>Mesajlar</Link>
        <Link href="/marketplace" className={styles.qaBtn}>Pazar Yeri</Link>
      </div>
    </div>
  )
}
