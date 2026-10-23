'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './areaSeo.module.css'

export type IlKarti = { slug: string; ad: string; medyan: number | null; emsal: number }

type Sirala = 'fiyat' | 'emsal'

const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/** Türkçe-duyarlı sadeleştirme: "İ/ı/Ş…" ile yazılmış aramalar ASCII karşılıklarıyla da bulunur. */
function sadelestir(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
}

/**
 * İller listesi — Figma 08 (Arsa fiyatları · İller): arama + sıralama + il kartları.
 * "Değişim" sıralaması ve kart başına 12 aylık değişim, il bazında trend verisi
 * listeleme sorgusunda olmadığı için yok (her il için ayrı sorgu gerektirirdi).
 */
export function IllerListesi({ iller }: { iller: IlKarti[] }) {
  const [q, setQ] = useState('')
  const [sirala, setSirala] = useState<Sirala>('emsal')

  const gorunen = useMemo(() => {
    const aranan = sadelestir(q.trim())
    const f = aranan ? iller.filter(i => sadelestir(i.ad).includes(aranan)) : iller
    return [...f].sort((a, b) =>
      sirala === 'fiyat' ? (b.medyan ?? -1) - (a.medyan ?? -1) : b.emsal - a.emsal)
  }, [iller, q, sirala])

  return (
    <>
      <div className={styles.araSatir}>
        <div className={styles.arama}>
          <span className={styles.aramaIkon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            className={styles.aramaInput}
            type="search"
            placeholder="İl ara…"
            aria-label="İl ara"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className={styles.siralama} role="group" aria-label="Sıralama">
          {([['fiyat', '₺/m²'], ['emsal', 'İlan sayısı']] as const).map(([id, etiket]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sirala === id}
              className={`${styles.siralamaBtn} ${sirala === id ? styles.siralamaAktif : ''}`}
              onClick={() => setSirala(id)}
            >
              {etiket}
            </button>
          ))}
        </div>
      </div>

      {gorunen.length === 0 ? (
        <p className={styles.bosArama}>“{q}” ile eşleşen il yok.</p>
      ) : (
        <div className={styles.linkGrid}>
          {gorunen.map(i => (
            <Link key={i.slug} href={`/arsa-fiyatlari/${i.slug}`} className={styles.linkCard}>
              <span className={styles.linkUst}>
                {i.ad}
                <span className={styles.linkOk} aria-hidden="true">›</span>
              </span>
              {i.medyan != null && (
                <span className={styles.linkFiyat}>
                  ₺{trNum.format(Math.round(i.medyan))}
                  <span className={styles.linkBirim}>/m²</span>
                </span>
              )}
              <span className={styles.linkAlt}>{i.emsal} ilan</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
