import Link from 'next/link'
import type { ReactNode } from 'react'
import { PriceTrendChart } from '@/components/charts/PriceTrendChart'
import type { AreaSeoCardDTO } from '@/lib/areaSeo/areaSeoCard'
import styles from './areaSeo.module.css'

export const trNum = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
export const trPct = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "+%4,1" / "−%0,6" — işaretli yüzde. */
export function isaretliYuzde(n: number): string {
  return `${n >= 0 ? '+' : '−'}%${trPct.format(Math.abs(n))}`
}

export function SayfaBasligi({ baslik, aciklama }: { baslik: string; aciklama: string }) {
  return (
    <>
      <h1 className={styles.title}>{baslik}</h1>
      <p className={styles.subtitle}>{aciklama}</p>
    </>
  )
}

export function StatKarti({
  etiket,
  deger,
  birim,
  alt,
  ton,
}: {
  etiket: string
  deger: ReactNode
  birim?: string
  alt?: string
  ton?: 'iyi' | 'kotu'
}) {
  return (
    <div className={styles.statKart}>
      <span className={styles.statLabel}>{etiket}</span>
      <span className={`${styles.statValue} ${ton === 'iyi' ? styles.iyi : ton === 'kotu' ? styles.kotu : ''}`}>
        {deger}
        {birim && <span className={styles.statBirim}>{birim}</span>}
      </span>
      {alt && <span className={styles.statAlt}>{alt}</span>}
    </div>
  )
}

export function StatSatiri({ children }: { children: ReactNode }) {
  return <div className={styles.statSatir}>{children}</div>
}

/** 12 aylık fiyat trendi kartı — veri yetersizse hiç çizilmez. */
export function TrendKarti({ trend, ince }: { trend: AreaSeoCardDTO['priceTrend']; ince?: string }) {
  if (!trend) return null
  const kapsam = trend.basis === 'mahalle' ? 'Mahalle' : trend.basis === 'ilce' ? 'İlçe geneli' : 'İl geneli'
  return (
    <section className={styles.kart} aria-label="12 aylık fiyat trendi">
      <h2 className={styles.kartBaslik}>
        12 aylık fiyat trendi <span className={styles.kapsam}>· {kapsam}</span>
      </h2>
      <PriceTrendChart points={trend.points} changePct3m={trend.changePct3m} thinTrend={trend.thinTrend} />
      {trend.thinTrend && ince && <p className={styles.note}>{ince}</p>}
    </section>
  )
}

export type TabloSatiri = { ad: string; href: string; medyan: number | null; emsal: number }

/** İl → ilçe, ilçe → mahalle tablosu: ad | medyan ₺/m² | emsal sayısı. */
export function AlanTablosu({ baslik, ilkKolon, satirlar, bos }: { baslik: string; ilkKolon: string; satirlar: TabloSatiri[]; bos: string }) {
  return (
    <section aria-label={baslik}>
      <h2 className={styles.bolumBaslik}>{baslik}</h2>
      {satirlar.length === 0 ? (
        <p className={styles.note}>{bos}</p>
      ) : (
        <div className={styles.tabloKap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{ilkKolon}</th>
                <th className={styles.sayi}>Medyan ₺/m²</th>
                <th className={styles.sayi}>Emsal sayısı</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map(r => (
                <tr key={r.href}>
                  <td><Link href={r.href}>{r.ad}</Link></td>
                  <td className={styles.sayi}>{r.medyan != null ? trNum.format(Math.round(r.medyan)) : '—'}</td>
                  <td className={styles.sayi}>{r.emsal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** "Kendi arsanın değerini öğren" amber bandı. */
export function DegerBandi({ metin }: { metin?: string }) {
  return (
    <section className={styles.cta} aria-label="Kendi arsanın değerini öğren">
      <div>
        <h2 className={styles.ctaBaslik}>Kendi arsanın değerini öğren</h2>
        <p className={styles.ctaMetin}>{metin ?? 'Ada/parsel gir; bölge emsallerine göre tahmini değer aralığı ve risk özeti.'}</p>
      </div>
      <div className={styles.ctaRow}>
        <Link href="/deger" className={styles.ctaButton}>Değeri öğren →</Link>
        <Link href="/hesapla" className={styles.ctaButtonSecondary}>Fizibilite hesapla</Link>
      </div>
    </section>
  )
}
