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

    return (
        <main className={styles.offersShell}>
            <header className={styles.topbar}>
                <Link href={`/listing/${listingId}`} className={styles.backLink}>‹</Link>
                <div>
                    <p className={styles.kicker}>İlan teklifleri</p>
                    <h1 className={styles.title}>{listing?.title || 'Teklifler'}</h1>
                </div>
            </header>

            <section className={styles.summaryCard}>
                <p>{listing?.city || 'Konum'} / {listing?.district || 'İlçe'}</p>
                <strong>{offers.length || listing?._count?.offers || 0} teklif</strong>
            </section>

            <section className={styles.offerList}>
                {loading ? <p className={styles.emptyState}>Teklifler yükleniyor...</p> : offers.length === 0 ? (
                    <p className={styles.emptyState}>Bu ilana henüz teklif verilmemiş.</p>
                ) : offers.map(offer => (
                    <article className={styles.offerCard} key={offer.id}>
                        <div className={styles.offerHead}>
                            <div>
                                <h2>{offer.bidder?.name || 'Teklif veren'}</h2>
                                <time>{new Date(offer.createdAt).toLocaleDateString('tr-TR')}</time>
                            </div>
                            <span className={`${styles.statusBadge} ${styles[`status${offer.status}`]}`}>
                                {statusLabel[offer.status]}
                            </span>
                        </div>
                        <div className={styles.shareValue}>%{Number(offer.offeredShare).toFixed(0)} arsa payı</div>
                        {offer.message && <p className={styles.offerMessage}>{offer.message}</p>}
                    </article>
                ))}
            </section>

            <section className={styles.createPanel}>
                <label className={styles.rangeLabel}>
                    <span>Teklif oranı</span>
                    <strong>%{offeredShare}</strong>
                </label>
                <input
                    className={styles.range}
                    type="range"
                    min="10"
                    max="70"
                    value={offeredShare}
                    onChange={event => setOfferedShare(Number(event.target.value))}
                />
                <textarea
                    className={styles.textarea}
                    placeholder="Teklif notu ekleyin"
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                />
                <button className={styles.submitButton} onClick={createOffer} disabled={sending}>
                    {sending ? 'Gönderiliyor...' : 'Teklif gönder'}
                </button>
            </section>
        </main>
    )
}
