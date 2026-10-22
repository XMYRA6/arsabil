'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { DioramaStage } from './DioramaStage'
import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { listTurler, listVarianlar, type SceneValue, type Tur, type Zaman } from '@/lib/dioramas/scene'
import styles from './Hero.module.css'

type Weather = 'gunesli' | 'bulutlu' | 'yagmurlu' | 'karli'

const WEATHER_ITEMS: { value: Weather; label: string }[] = [
  { value: 'gunesli', label: 'Güneşli' },
  { value: 'bulutlu', label: 'Bulutlu' },
  { value: 'yagmurlu', label: 'Yağmurlu' },
  { value: 'karli', label: 'Karlı' },
]

/** Tema (`data-theme`) → zaman: açık = gündüz, koyu = gece. Sunucuda ve ilk boyamada gündüz. */
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => mo.disconnect()
}
function useThemeZaman(): Zaman {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'gece' : 'gunduz'),
    () => 'gunduz',
  )
}

export function Hero() {
  const zaman = useThemeZaman()
  const [tur, setTur] = useState<Tur>('villa')
  const [weather, setWeather] = useState<Weather>('gunesli')

  const scene: SceneValue = { tur, varyant: listVarianlar(tur)[0].key, egim: 'duz', zaman }

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>Arsa değerleme · Kat karşılığı fizibilite</p>
        <h1 id="hero-title" className={styles.title}>
          Arsanın gerçek değerini <span>tahmin etme, hesapla.</span>
        </h1>
        <p className={styles.sub}>
          Arsa payını, maliyeti ve kârı saniyeler içinde, bölge verileriyle hesapla. Sayılar deterministik motordan gelir.
        </p>
        <div className={styles.cta}>
          <Link href="/hesapla" className={styles.primary}>Hemen hesapla</Link>
          <Link href="/deger" className={styles.secondary}>Arsamın değerini öğren</Link>
        </div>
      </div>

      <div className={styles.visual}>
        <div className={styles.stageWrap}>
          <DioramaStage scene={scene} weather={weather} />
          <div className={styles.priceTag} aria-label="Örnek fiyat etiketi">
            <span className={styles.dot} aria-hidden="true" />
            <strong>₺2.450</strong>
            <small>/ m² · örnek</small>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.types} role="group" aria-label="Arazi türü">
            {listTurler().map((t) => (
              <Chip key={t.key} selected={t.key === tur} onClick={() => setTur(t.key)}>
                {t.label}
              </Chip>
            ))}
          </div>
          <SegmentedControl
            ariaLabel="Hava durumu"
            items={WEATHER_ITEMS}
            value={weather}
            onChange={(v) => setWeather(v as Weather)}
          />
        </div>
      </div>
    </section>
  )
}
