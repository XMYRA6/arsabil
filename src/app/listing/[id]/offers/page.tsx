'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import styles from './page.module.css'

type Listing = {
    id: string
    title: string | null
    address: string | null
    city: string | null
    district: string | null
    neighborhood?: string | null
    _count?: { offers: number }
}

type Offer = {
    id: string
    offeredShare: number
    message: string | null
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    createdAt: string
    bidder?: { name: string | null; isVerified?: boolean }
}

const statusLabel = {
    PENDING: 'Bekliyor',
    ACCEPTED: 'Kabul edildi',
    REJECTED: 'Reddedildi',
}

/** "2 gün önce" biçiminde göreli zaman; bir aydan eskisi tarih olarak yazılır. */
function goreliZaman(iso: string): string {
    const fark = Date.now() - new Date(iso).getTime()
    const dk = Math.floor(fark / 60000)
    if (dk < 1) return 'az önce'
    if (dk < 60) return `${dk} dk önce`
    const sa = Math.floor(dk / 60)
    if (sa < 24) return `${sa} saat önce`
    const gun = Math.floor(sa / 24)
    if (gun < 7) return `${gun} gün önce`
    if (gun < 30) return `${Math.floor(gun / 7)} hafta önce`
    return new Date(iso).toLocaleDateString('tr-TR')
}

function bas(isim: string | null | undefined): string {
    const parcalar = (isim ?? '').trim().split(/\s+/).filter(Boolean)
    if (parcalar.length === 0) return '?'
    return parcalar.slice(0, 2).map(p => p[0]).join('').toLocaleUpperCase('tr-TR')
}

export default function ListingOffersPage() {
    const params = useParams<{ id: string }>()
    const listingId = params.id
    const [listing, setListing] = useState<Listing | null>(null)
    const [offers, setOffers] = useState<Offer[]>([])
    const [offeredShare, setOfferedShare] = useState(33)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    const loadData = async () => {
        setLoading(true)
        const [listingRes, offersRes] = await Promise.all([
            fetch(`/api/listings/${listingId}`),
            fetch(`/api/offers?listingId=${listingId}`),
        ])
        if (listingRes.ok) setListing(await listingRes.json())
        if (offersRes.ok) {
            const data = await offersRes.json()
            setOffers(data.offers ?? [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData().catch(() => {
            setLoading(false)
            toast.error('Teklifler yüklenemedi')
        })
    }, [listingId])

    const createOffer = async () => {
        setSending(true)
        const res = await fetch('/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId, offeredShare, message }),
        })
        if (res.ok) {
            setMessage('')
            toast.success('Teklif gönderildi')
            await loadData()
        } else {
            const data = await res.json().catch(() => ({}))
            toast.error(data.message || 'Teklif gönderilemedi')
        }
        setSending(false)
    }

    const konum = [listing?.district, listing?.neighborhood].filter(Boolean).join(' · ') || listing?.title || 'İlan'
    const adet = offers.length || listing?._count?.offers || 0

    return (
        <main className={styles.offersShell}>
            <nav className={styles.breadcrumb} aria-label="Konum">
                <Link href={`/listing/${listingId}`} className={styles.backLink}>İlana dön</Link>
                <span aria-hidden="true">/</span>
                <span>{konum}</span>
            </nav>

            <header className={styles.topbar}>
                <h1 className={styles.title}>Gelen teklifler</h1>
                <p className={styles.sub}>
                    Arsa payı teklifleri. Kabul etmeden önce senaryoda karşılaştır.
                    {adet > 0 && <strong className={styles.count}> {adet} teklif</strong>}
                </p>
            </header>

            <div className={styles.layout}>
                <section className={styles.offerList} aria-label="Teklifler">
                    {loading ? <p className={styles.emptyState}>Teklifler yükleniyor...</p> : offers.length === 0 ? (
                        <p className={styles.emptyState}>Bu ilana henüz teklif verilmemiş.</p>
                    ) : offers.map(offer => (
                        <article className={styles.offerCard} key={offer.id}>
                            <div className={styles.offerHead}>
                                <span className={styles.avatar} aria-hidden="true">{bas(offer.bidder?.name)}</span>
                                <div className={styles.offerWho}>
                                    <h2>{offer.bidder?.name || 'Teklif veren'}</h2>
                                    <time dateTime={offer.createdAt}>{goreliZaman(offer.createdAt)}</time>
                                </div>
                                <div className={styles.shareValue}>%{Number(offer.offeredShare).toFixed(0)} arsa payı</div>
                                <span className={`${styles.statusBadge} ${styles[`status${offer.status}`]}`}>
                                    {statusLabel[offer.status]}
                                </span>
                            </div>
                            {offer.message && <p className={styles.offerMessage}>{offer.message}</p>}
                        </article>
                    ))}
                </section>

                <section className={styles.createPanel} aria-label="Teklif gönder">
                    <h2 className={styles.panelTitle}>Teklif gönder</h2>
                    <p className={styles.panelSub}>Bu ilana kendi payını öner.</p>

                    <label className={styles.rangeLabel}>
                        <span>Teklif oranı</span>
                        <span className={styles.rangeValue}>
                            %
                            <input
                                type="number"
                                inputMode="numeric"
                                min={10}
                                max={60}
                                aria-label="Teklif oranı, sayı ile"
                                className={styles.rangeValueInput}
                                value={offeredShare}
                                onChange={event => { if (event.target.value !== '') setOfferedShare(Number(event.target.value)); }}
                            />
                        </span>
                    </label>
                    <input
                        className={styles.range}
                        type="range"
                        min="10"
                        max="60"
                        value={offeredShare}
                        aria-label="Teklif oranı"
                        style={{ '--progress': `${((offeredShare - 10) / 50) * 100}%` } as React.CSSProperties}
                        onChange={event => setOfferedShare(Number(event.target.value))}
                    />
                    <div className={styles.rangeTicks} aria-hidden="true"><span>%10</span><span>%60</span></div>

                    <label className={styles.noteLabel} htmlFor="offer-note">Not (isteğe bağlı)</label>
                    <textarea
                        id="offer-note"
                        className={styles.textarea}
                        placeholder="Teklif notu ekleyin"
                        value={message}
                        onChange={event => setMessage(event.target.value)}
                    />
                    <button className={styles.submitButton} onClick={createOffer} disabled={sending}>
                        {sending ? 'Gönderiliyor...' : 'Teklif gönder'}
                    </button>
                    <p className={styles.panelNote}>Teklif ilan sahibine bildirim olarak gider.</p>
                </section>
            </div>
        </main>
    )
}
