'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ManualParcelEntryForm } from '@/components/listing-wizard/ManualParcelEntryForm'
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker'
import { DegerKarti } from '@/components/deger/DegerKarti'
import type { DegerCardDTO } from '@/lib/deger/card'
import styles from './page.module.css'

type Tab = 'adaParsel' | 'harita'

const ERR: Record<number, string> = {
  404: 'Parsel bulunamadı. Farklı bir nokta veya ada/parsel deneyin.',
  503: 'TKGM servisi şu an yanıt vermiyor. Biraz sonra tekrar deneyin.',
  429: 'Çok fazla sorgu yaptınız. Lütfen biraz bekleyin.',
}

function DegerPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<Tab>('adaParsel')
  const [card, setCard] = useState<DegerCardDTO | null>(null)
  const [parcelQuery, setParcelQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<ParcelPickerValue>({ lat: null, lng: null, parcel: null, status: 'idle' })
  const didInitFetch = useRef(false)

  const fetchCard = useCallback(
    async (lat: number, lng: number) => {
      setError(null)
      const qs = `lat=${lat}&lng=${lng}`
      const res = await fetch(`/api/deger/kart?${qs}`)
      if (!res.ok) {
        setCard(null)
        setError(ERR[res.status] ?? 'Beklenmeyen bir hata oluştu.')
        return
      }
      const json = (await res.json()) as DegerCardDTO
      setCard(json)
      setParcelQuery(qs)
      router.replace(`/deger?${qs}`)
    },
    [router],
  )

  // Paylaşılan URL ile ilk yükleme
  useEffect(() => {
    if (didInitFetch.current) return
    didInitFetch.current = true
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      void fetchCard(lat, lng)
    }
  }, [searchParams, fetchCard])

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Arsanın tahmini değerini öğren</h1>
      <p className={styles.subtitle}>Ada/parsel gir veya haritadan seç — tahmini değer, ₺/m² ve deprem/taşkın riski.</p>

      <div className={styles.tabs} role="tablist">
        <button role="tab" aria-selected={tab === 'adaParsel'} className={`${styles.tab} ${tab === 'adaParsel' ? styles.tabActive : ''}`} onClick={() => setTab('adaParsel')}>
          Ada / Parsel ile
        </button>
        <button role="tab" aria-selected={tab === 'harita'} className={`${styles.tab} ${tab === 'harita' ? styles.tabActive : ''}`} onClick={() => setTab('harita')}>
          Haritadan seç
        </button>
      </div>

      {tab === 'adaParsel' && (
        <ManualParcelEntryForm
          onLocationFound={(lat, lng, _ref, exactParcel) =>
            exactParcel
              ? void fetchCard(lat, lng)
              : setError('Bu ada/parsel için TKGM kaydı bulunamadı. Haritadan seçmeyi deneyin.')
          }
        />
      )}
      {tab === 'harita' && (
        <ParcelPicker
          value={picker}
          onChange={(patch) => {
            setPicker((prev) => {
              const next = { ...prev, ...patch }
              if (next.status === 'verified' && next.lat != null && next.lng != null) {
                void fetchCard(next.lat, next.lng)
              }
              return next
            })
          }}
          hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
          notFoundText="Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın."
          unavailableText="TKGM servisi şu an yanıt vermiyor, biraz sonra tekrar deneyin."
        />
      )}

      {error && <p className={styles.error}>{error}</p>}
      {card && <DegerKarti card={card} isLoggedIn={card.value.tier === 'member'} parcelQuery={parcelQuery} />}
    </div>
  )
}

export default function DegerPage() {
  return (
    <Suspense fallback={null}>
      <DegerPageContent />
    </Suspense>
  )
}
