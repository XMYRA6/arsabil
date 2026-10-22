'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { DioramaStage } from './DioramaStage'
import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { listTurler, listVarianlar, type SceneValue, type Tur } from '@/lib/dioramas/scene'
import { useThemeZaman } from './useThemeZaman'
import styles from './Hero.module.css'

type Weather = 'gunesli' | 'bulutlu' | 'yagmurlu' | 'karli'

const WEATHER_ITEMS: { value: Weather; label: string }[] = [
  { value: 'gunesli', label: 'Güneşli' },
  { value: 'bulutlu', label: 'Bulutlu' },
  { value: 'yagmurlu', label: 'Yağmurlu' },
  { value: 'karli', label: 'Karlı' },
]

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
  const [weather, setWeather] = useState<Weather>('gunesli')
  const [konum, setKonum] = useState('')
  const [alan, setAlan] = useState('')
  const konumId = useId()
  const alanId = useId()

  const mode = tur === 'kat' ? 'kat' : 'deger'
  const copy = COPY[mode]
  const turler = listTurler()
  const scene: SceneValue = { tur, varyant: listVarianlar(tur)[0].key, egim: 'duz', zaman }

  const params = new URLSearchParams()
  if (konum.trim()) params.set('konum', konum.trim())
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
              onClick={() => setTur('arsa')}
            >
              Arsa Değerleme
            </button>
            <button
              type="button"
              aria-pressed={mode === 'kat'}
              className={mode === 'kat' ? `${styles.productBtn} ${styles.productOn}` : styles.productBtn}
              onClick={() => setTur('kat')}
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
              <label className={styles.field} htmlFor={konumId}>
                <span>İl · İlçe</span>
                <input id={konumId} value={konum} onChange={(e) => setKonum(e.target.value)} placeholder="Trabzon · Akçaabat" autoComplete="off" />
              </label>
              <label className={`${styles.field} ${styles.fieldSmall}`} htmlFor={alanId}>
                <span>Alan</span>
                <input id={alanId} value={alan} onChange={(e) => setAlan(e.target.value.replace(/[^0-9]/g, ''))} placeholder="1.250 m²" inputMode="numeric" autoComplete="off" />
              </label>
            </div>
            <div className={styles.quickTypes} role="group" aria-label="Hızlı hesap arazi türü">
              {turler.filter((t) => t.key !== 'kat').map((t) => (
                <Chip key={t.key} selected={t.key === tur} onClick={() => setTur(t.key)}>{t.label}</Chip>
              ))}
            </div>
            <Link href={href} className={styles.submit}>
              {copy.cta} <span aria-hidden="true">→</span>
            </Link>
          </form>
          <p className={styles.note}>Ücretsiz · kayıt gerekmez · yaklaşık 10 saniye</p>
        </div>

        <div className={styles.visual}>
          <div className={styles.stageWrap}>
            <div className={styles.weather}>
              <SegmentedControl ariaLabel="Hava durumu" items={WEATHER_ITEMS} value={weather} onChange={(v) => setWeather(v as Weather)} />
            </div>
            <DioramaStage scene={scene} weather={weather} />
            <div className={styles.priceTag} aria-label="Örnek fiyat etiketi">
              <span className={styles.dot} aria-hidden="true" />
              <strong>₺2.450</strong>
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
              <Chip key={t.key} selected={t.key === tur} onClick={() => setTur(t.key)}>{t.label}</Chip>
            ))}
          </div>
          <p className={styles.sample}>Gösterilen fiyat ve değerler örnektir.</p>
        </div>
      </div>
    </section>
  )
}
