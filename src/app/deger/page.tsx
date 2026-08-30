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
  const [pending, setPending] = useState(false)
  const [picker, setPicker] = useState<ParcelPickerValue>({ lat: null, lng: null, parcel: null, status: 'idle' })
  const didInitFetch = useRef(false)

  const fetchCard = useCallback(
    async (lat: number, lng: number) => {
      setError(null)
      setPending(true)
      const qs = `lat=${lat}&lng=${lng}`
      try {
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
      } catch {
        setCard(null)
        setError('Bağlantı hatası, tekrar deneyin.')
      } finally {
        setPending(false)
      }
    },
    [router],
  )

  // Harita seçimi doğrulanınca kartı getir — yan etki setPicker updater'ının
  // İÇİNDE değil; updater saf kalır.
  useEffect(() => {
    if (picker.status === 'verified' && picker.lat != null && picker.lng != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- doğrulanmış harita seçiminden türetilen async kart getirme; setState promise içinde
      void fetchCard(picker.lat, picker.lng)
    }
  }, [picker.status, picker.lat, picker.lng, fetchCard])

  // Paylaşılan URL ile ilk yükleme
  useEffect(() => {
    if (didInitFetch.current) return
    didInitFetch.current = true
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paylaşılan URL'den ilk kart getirme (bir kez); setState promise içinde
      void fetchCard(lat, lng)
    }
  }, [searchParams, fetchCard])

  return (
    <>
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'adaParsel'} className={`${styles.tab} ${tab === 'adaParsel' ? styles.tabActive : ''}`} onClick={() => setTab('adaParsel')}>
          Ada / Parsel ile
        </button>
        <button type="button" role="tab" aria-selected={tab === 'harita'} className={`${styles.tab} ${tab === 'harita' ? styles.tabActive : ''}`} onClick={() => setTab('harita')}>
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
          onChange={(patch) => setPicker((prev) => ({ ...prev, ...patch }))}
          hint="Arsanızın bulunduğu noktaya haritadan tıklayın."
          notFoundText="Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşıyın."
          unavailableText="TKGM servisi şu an yanıt vermiyor, biraz sonra tekrar deneyin."
        />
      )}

      {pending && <p className={styles.loading}>Yükleniyor…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {card && <DegerKarti card={card} isLoggedIn={card.value.tier === 'member'} parcelQuery={parcelQuery} />}
    </>
  )
}

export default function DegerPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Arsanın tahmini değerini öğren</h1>
      <p className={styles.subtitle}>Ada/parsel gir veya haritadan seç — tahmini değer, ₺/m² ve deprem/taşkın riski.</p>
      <Suspense fallback={null}>
        <DegerPageContent />
      </Suspense>
    </div>
  )
}
