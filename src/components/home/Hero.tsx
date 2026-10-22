'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DioramaStage } from './DioramaStage'
import { Chip } from '@/components/ui/Chip'
import { listTurler, listVarianlar, type SceneValue, type Tur } from '@/lib/dioramas/scene'
import { useThemeZaman } from './useThemeZaman'
import { LocationField, type LocationValue } from './LocationField'
import styles from './Hero.module.css'

type Weather = 'gunesli' | 'bulutlu' | 'yagmurlu' | 'karli'

/** Rastgele hava akışı: güneşli daha sık, diğerleri arada gelir. */
const WEATHER_POOL: Weather[] = ['gunesli', 'gunesli', 'gunesli', 'bulutlu', 'bulutlu', 'yagmurlu', 'karli']
const TUR_DONGUSU = 5000
const HAVA_DONGUSU = 9000

/** Türe göre örnek m² fiyatı (vitrin için; gerçek fiyat hesaptan gelir). */
const ORNEK_FIYAT: Record<Tur, number> = { arsa: 2450, tarla: 380, villa: 6200, ticari: 9800, bag: 720, kat: 4600 }

function azaltilmisHareket(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Hedef değere akıcı sayı geçişi; azaltılmış harekette doğrudan atlar. */
function useTween(hedef: number, ms = 700): number {
  const [deger, setDeger] = useState(hedef)
  const son = useRef(hedef)
  const [azalt] = useState(azaltilmisHareket)
  useEffect(() => {
    if (azalt) return
    const baslangic = son.current
    const t0 = performance.now()
    let raf = 0
    const adim = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const v = baslangic + (hedef - baslangic) * e
      son.current = v
      setDeger(v)
      if (k < 1) raf = requestAnimationFrame(adim)
    }
    raf = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(raf)
  }, [hedef, ms, azalt])
  return azalt ? hedef : deger
}

const COPY = {
  deger: {
    title: ['Arsanı bil.', 'Değerini gör.'],
    sub: 'Konumunu, arazi türünü ve metrekareni gir; gerçek fiyat, risk ve imar özeti saniyeler içinde karşında.',
    cta: 'Değerini hesapla',
    href: '/deger',
  },
  kat: {
    title: ['Arsanı bil.', 'Payını gör.'],
    sub: 'Konumunu ve metrekareni gir; arsa payı önerisi, müteahhit marjı ve maliyet saniyeler içinde karşında.',
    cta: 'Fizibiliteyi hesapla',
    href: '/hesapla',
  },
} as const

export function Hero() {
  const zaman = useThemeZaman()
  const [tur, setTur] = useState<Tur>('arsa')
  const [secildi, setSecildi] = useState(false)
  const [weather, setWeather] = useState<Weather>('gunesli')
  const [fiyatHedef, setFiyatHedef] = useState(ORNEK_FIYAT.arsa)
  const [konum, setKonum] = useState<LocationValue>({ il: '', ilce: '' })
  const [alan, setAlan] = useState('')
  const alanId = 'hero-alan'
  const fiyat = useTween(fiyatHedef)

  const sec = (t: Tur) => { setSecildi(true); setTur(t) }

  // Seçilmediyse türler 5 sn'de bir kendiliğinden döner.
  useEffect(() => {
    if (secildi || azaltilmisHareket()) return
    const sira = listTurler().map((t) => t.key)
    const id = setInterval(() => setTur((t) => sira[(sira.indexOf(t) + 1) % sira.length]), TUR_DONGUSU)
    return () => clearInterval(id)
  }, [secildi])

  // Hava rastgele akar (düğme yok).
  useEffect(() => {
    if (azaltilmisHareket()) return
    const id = setInterval(() => {
      setWeather((w) => {
        const adaylar = WEATHER_POOL.filter((x) => x !== w)
        return adaylar[Math.floor(Math.random() * adaylar.length)]
      })
    }, HAVA_DONGUSU)
    return () => clearInterval(id)
  }, [])

  // Fiyat: tür değişince yeni örnek, arada küçük oynamalar.
  useEffect(() => {
    const taban = ORNEK_FIYAT[tur]
    const yeni = () => Math.round((taban * (0.92 + Math.random() * 0.16)) / 10) * 10
    const ilk = setTimeout(() => setFiyatHedef(yeni()), 0)
    if (azaltilmisHareket()) return () => clearTimeout(ilk)
    const id = setInterval(() => setFiyatHedef(yeni()), 2600)
    return () => { clearTimeout(ilk); clearInterval(id) }
  }, [tur])

  const mode = tur === 'kat' ? 'kat' : 'deger'
  const copy = COPY[mode]
  const turler = listTurler()
  const scene: SceneValue = { tur, varyant: listVarianlar(tur)[0].key, egim: 'duz', zaman }

  const params = new URLSearchParams()
  if (konum.il) params.set('il', konum.il)
  if (konum.ilce) params.set('ilce', konum.ilce)
  if (alan.trim()) params.set('alan', alan.trim())
  params.set('tur', tur)
  const href = `${copy.href}?${params.toString()}`

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.product} role="group" aria-label="Ürün">
            <button
              type="button"
              aria-pressed={mode === 'deger'}
              className={mode === 'deger' ? `${styles.productBtn} ${styles.productOn}` : styles.productBtn}
              onClick={() => sec('arsa')}
            >
              Arsa Değerleme
            </button>
            <button
              type="button"
              aria-pressed={mode === 'kat'}
              className={mode === 'kat' ? `${styles.productBtn} ${styles.productOn}` : styles.productBtn}
              onClick={() => sec('kat')}
            >
              Kat Karşılığı Fizibilite
            </button>
          </div>

          <h1 id="hero-title" className={styles.title}>
            {copy.title[0]} <span>{copy.title[1]}</span>
          </h1>
          <p className={styles.sub}>{copy.sub}</p>

          <form className={styles.quick} action={copy.href} aria-label="Hızlı hesap" onSubmit={(e) => e.preventDefault()}>
            <div className={styles.fields}>
              <LocationField value={konum} onChange={setKonum} />
              <label className={`${styles.field} ${styles.fieldSmall}`} htmlFor={alanId}>
                <span>Alan</span>
                <input id={alanId} value={alan} onChange={(e) => setAlan(e.target.value.replace(/[^0-9]/g, ''))} placeholder="1.250 m²" inputMode="numeric" autoComplete="off" />
              </label>
            </div>
            <Link href={href} className={styles.submit}>
              {copy.cta} <span aria-hidden="true">→</span>
            </Link>
          </form>
          <p className={styles.note}>Ücretsiz · kayıt gerekmez · yaklaşık 10 saniye</p>
        </div>

        <div className={styles.visual}>
          <div className={styles.stageWrap}>
            <DioramaStage scene={scene} weather={weather} />
            <div className={styles.priceTag} aria-label="Örnek fiyat etiketi">
              <span className={styles.dot} aria-hidden="true" />
              <strong>₺{Math.round(fiyat).toLocaleString('tr-TR')}</strong>
              <small>/ m²</small>
            </div>
            <span className={styles.leader} aria-hidden="true" />
            <div className={`${styles.floatChip} ${styles.chipArea}`}>
              <span className={styles.dot} aria-hidden="true" />
              <strong>1.250 m²</strong>
              <small>imarlı arsa</small>
            </div>
            <div className={`${styles.floatChip} ${styles.chipRisk}`}>
              <span className={`${styles.dot} ${styles.dotSage}`} aria-hidden="true" />
              <strong>Fay</strong>
              <small>düşük risk</small>
            </div>
          </div>

          <div className={styles.types} role="group" aria-label="Arazi türü">
            {turler.map((t) => (
              <Chip key={t.key} selected={t.key === tur} onClick={() => sec(t.key)}>{t.label}</Chip>
            ))}
          </div>
          <p className={styles.sample}>Gösterilen fiyat ve değerler örnektir.</p>
        </div>
      </div>
    </section>
  )
}
