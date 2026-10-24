'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ManualParcelEntryForm } from '@/components/listing-wizard/ManualParcelEntryForm'
import { ParcelPicker, type ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker'
import { DegerKarti } from '@/components/deger/DegerKarti'
import { DegerMiniMap } from '@/components/deger/DegerMiniMap'
import type { DegerCardDTO } from '@/lib/deger/card'
import styles from './page.module.css'

type Tab = 'adaParsel' | 'harita'

const ERR: Record<number, string> = {
  404: 'Parsel bulunamadı. Farklı bir nokta veya ada/parsel dene.',
  503: 'TKGM servisi şu an yanıt vermiyor. Biraz sonra tekrar dene.',
  429: 'Çok fazla sorgu yaptın. Lütfen biraz bekle.',
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

  const fetchCardQs = useCallback(
    async (qs: string) => {
      setError(null)
      setPending(true)
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
        setError('Bağlantı hatası, tekrar dene.')
      } finally {
        setPending(false)
      }
    },
    [router],
  )

  const fetchCard = useCallback(
    (lat: number, lng: number) => fetchCardQs(`lat=${lat}&lng=${lng}`),
    [fetchCardQs],
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
    const mahalleId = searchParams.get('mahalleId')
    const ada = searchParams.get('ada')
    const parsel = searchParams.get('parsel')
    if (mahalleId && ada && parsel && /^\d+$/.test(mahalleId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paylaşılan/deep-link URL'den ilk kart getirme (bir kez); setState promise içinde
      void fetchCardQs(
        `mahalleId=${mahalleId}&ada=${encodeURIComponent(ada)}&parsel=${encodeURIComponent(parsel)}`,
      )
      return
    }
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paylaşılan URL'den ilk kart getirme (bir kez); setState promise içinde
      void fetchCard(lat, lng)
    }
  }, [searchParams, fetchCard, fetchCardQs])

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

      <div className={styles.grid}>
        <section className={styles.formCard} aria-label="Parsel bilgisi">
          <h2 className={styles.formTitle}>Parsel bilgisi</h2>
          {tab === 'adaParsel' && (
            <ManualParcelEntryForm
              submitLabel="Değeri göster →"
              onLocationFound={(lat, lng, _ref, exactParcel) =>
                exactParcel
                  ? void fetchCard(lat, lng)
                  : setError('Bu ada/parsel için TKGM kaydı bulunamadı. Haritadan seçmeyi dene.')
              }
            />
          )}
          {tab === 'harita' && (
            <ParcelPicker
              value={picker}
              onChange={(patch) => setPicker((prev) => ({ ...prev, ...patch }))}
              hint="Arsanın bulunduğu noktaya haritadan tıkla."
              notFoundText="Bu noktada kayıtlı parsel bulunamadı. Pini parselin içine taşı."
              unavailableText="TKGM servisi şu an yanıt vermiyor, biraz sonra tekrar dene."
            />
          )}
          {card?.neighborhood.geojson ? (
            <div className={styles.miniMap}>
              <DegerMiniMap parcelGeometry={card.parcel.geometry} neighborhoodGeojson={card.neighborhood.geojson} />
            </div>
          ) : null}
        </section>

        <div className={styles.resultCol}>
          {pending && <p className={styles.loading}>Yükleniyor…</p>}
          {error && <p className={styles.error}>{error}</p>}
          {card && (
            <DegerKarti
              key={parcelQuery}
              card={card}
              isLoggedIn={card.value.tier === 'member'}
              parcelQuery={parcelQuery}
              showMiniMap={false}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default function DegerPage() {
  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Arsa değerleme</p>
      <h1 className={styles.title}>Arsanın tahmini değerini öğren</h1>
      <p className={styles.subtitle}>Ada/parsel gir veya haritadan seç — tahmini değer, ₺/m² ve deprem/taşkın riski.</p>
      <Suspense fallback={null}>
        <DegerPageContent />
      </Suspense>
    </div>
  )
}
