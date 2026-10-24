'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import harita from '@/data/tr-il-harita.json'
import styles from './TurkiyeHaritasi.module.css'

export type IlFiyat = { slug: string; medyan: number | null; emsal: number }

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const KADEME = 5

/** Medyanları KADEME eşit sayıda gruba böler (kantil); veri yoksa 0 = "veri yok". */
export function kademeHesapla(fiyatlar: IlFiyat[]): (slug: string) => number {
  const degerler = fiyatlar.map((f) => f.medyan).filter((m): m is number => m != null && m > 0).sort((a, b) => a - b)
  const esikler = Array.from({ length: KADEME - 1 }, (_, i) => degerler[Math.floor(((i + 1) * degerler.length) / KADEME)])
  const harf = new Map(fiyatlar.map((f) => [f.slug, f.medyan]))
  return (slug) => {
    const m = harf.get(slug)
    if (m == null || m <= 0) return 0
    return 1 + esikler.filter((e) => e !== undefined && m >= e).length
  }
}

/**
 * Ana sayfa Türkiye arsa fiyat haritası: il sınırları (alpers/Turkey-Maps-GeoJSON, Apache-2.0),
 * medyan m² fiyatına göre 5 kademeli ton. İl tıklanınca il fiyat sayfasına gider.
 */
export function TurkiyeHaritasi() {
  const [fiyatlar, setFiyatlar] = useState<IlFiyat[]>([])
  const [aktif, setAktif] = useState<string | null>(null)

  useEffect(() => {
    let iptal = false
    fetch('/api/arsa-fiyatlari/iller')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!iptal && Array.isArray(d)) setFiyatlar(d) })
      .catch(() => {})
    return () => { iptal = true }
  }, [])

  const kademe = useMemo(() => kademeHesapla(fiyatlar), [fiyatlar])
  const bySlug = useMemo(() => new Map(fiyatlar.map((f) => [f.slug, f])), [fiyatlar])
  const secili = harita.iller.find((i) => i.slug === aktif) ?? null
  const seciliFiyat = secili ? bySlug.get(secili.slug) : undefined

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${harita.w} ${harita.h}`} className={styles.svg} role="group" aria-label="Türkiye il haritası">
        {harita.iller.map((il) => (
          <Link key={il.slug} href={`/arsa-fiyatlari/${il.slug}`} aria-label={`${il.ad} arsa fiyatları`}>
            <path
              d={il.d}
              className={`${styles.il} ${styles[`k${kademe(il.slug)}`]} ${aktif === il.slug ? styles.aktif : ''}`}
              onMouseEnter={() => setAktif(il.slug)}
              onMouseLeave={() => setAktif(null)}
              onFocus={() => setAktif(il.slug)}
              onBlur={() => setAktif(null)}
            />
          </Link>
        ))}
      </svg>

      <div className={styles.bilgi} aria-live="polite">
        {secili ? (
          <>
            <strong>{secili.ad}</strong>
            <span>
              {seciliFiyat?.medyan ? `₺${trNum.format(seciliFiyat.medyan)} / m² · ${trNum.format(seciliFiyat.emsal)} emsal` : 'Henüz yeterli emsal yok'}
            </span>
          </>
        ) : (
          <span>Bir ile dokun veya imleci getir</span>
        )}
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span>Düşük</span>
        {[1, 2, 3, 4, 5].map((k) => <i key={k} className={`${styles.sw} ${styles[`k${k}`]}`} />)}
        <span>Yüksek</span>
      </div>
    </div>
  )
}
