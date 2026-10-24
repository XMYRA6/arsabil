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

/**
 * Medyan fiyatın güven düzeyi emsal sayısından türetilir (PRODUCT.md ilke #4: şeffaflık).
 * Eşikler: 30+ yüksek, 10–29 orta, 10 altı düşük (az emsalde medyan tek ilandan etkilenir).
 */
export function guvenDuzeyi(emsal: number): 'yüksek' | 'orta' | 'düşük' {
  if (emsal >= 30) return 'yüksek'
  if (emsal >= 10) return 'orta'
  return 'düşük'
}

const GUVEN_NOKTA = { düşük: 1, orta: 2, yüksek: 3 } as const

/** Emsal sayısından türeyen 3 noktalı güven göstergesi (erişilebilir etiketli). */
export function Guven({ emsal }: { emsal: number }) {
  const d = guvenDuzeyi(emsal)
  return (
    <span className={styles.guven} role="img" aria-label={`Güven ${d}`} title={`Güven ${d} (${emsal} emsal)`}>
      {[1, 2, 3].map((n) => <i key={n} className={n <= GUVEN_NOKTA[d] ? styles.nokta : styles.noktaBos} />)}
    </span>
  )
}

export function emsalAlt(emsal: number, onEk?: string): string {
  return `${onEk ? `${onEk} · ` : ''}${emsal} emsal · güven ${guvenDuzeyi(emsal)}`
}

/** 3 aylık değişimin hangi kapsamdan hesaplandığı (mahalle verisi yetmezse ilçe/il verisi kullanılır). */
export function degisimAlt(trend: AreaSeoCardDTO['priceTrend']): string | undefined {
  if (!trend) return undefined
  const kapsam = trend.basis === 'mahalle' ? 'Mahalle verisi' : trend.basis === 'ilce' ? 'İlçe geneli verisi' : 'İl geneli verisi'
  return trend.thinTrend ? `${kapsam} · az örnek` : kapsam
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
  genis,
}: {
  etiket: string
  deger: ReactNode
  birim?: string
  alt?: string
  ton?: 'iyi' | 'kotu'
  /** Geniş değerler (örn. aralık) için iki sütun kaplar. */
  genis?: boolean
}) {
  return (
    <div className={`${styles.statKart} ${genis ? styles.statGenis : ''}`}>
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
      <AylikOrnekNotu points={trend.points} />
      {trend.thinTrend && ince && <p className={styles.note}>{ince}</p>}
    </section>
  )
}

/** Aylık örnek sayısı aralığı; bazı aylar çok azsa trendin oynak olabileceği söylenir. */
function AylikOrnekNotu({ points }: { points: NonNullable<AreaSeoCardDTO['priceTrend']>['points'] }) {
  if (points.length === 0) return null
  const sayilar = points.map(p => p.sampleCount)
  const min = Math.min(...sayilar)
  const max = Math.max(...sayilar)
  return (
    <p className={styles.note}>
      Aylık örnek sayısı: {min === max ? `${min}` : `${min}–${max}`} ilan.
      {min < 5 && ' Bazı aylarda 5 ilanın altında örnek olduğu için aylık değişimler oynak olabilir.'}
    </p>
  )
}

export type TabloSatiri = { ad: string; href: string; medyan: number | null; emsal: number }

/** İl → ilçe, ilçe → mahalle tablosu: ad | medyan ₺/m² | emsal sayısı. */
export function AlanTablosu({ baslik, ilkKolon, satirlar, bos }: { baslik: string; ilkKolon: string; satirlar: TabloSatiri[]; bos: string }) {
  const enYuksek = Math.max(1, ...satirlar.map(r => r.medyan ?? 0))
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
                <th className={styles.sayi}>₺/m²</th>
                <th className={styles.sayi}>Emsal</th>
                <th className={styles.sayi}>Güven</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map(r => (
                <tr key={r.href} className={r.emsal < 10 ? styles.soluk : undefined}>
                  <td><Link href={r.href}>{r.ad.replace(/ Mahallesi$/, '')}</Link></td>
                  <td className={styles.sayi}>
                    <span className={styles.fiyatHucre}>
                      {r.medyan != null && (
                        <span className={styles.fiyatCubukKap} aria-hidden="true">
                          <span className={styles.fiyatCubuk} style={{ width: `${Math.max(3, (r.medyan / enYuksek) * 100)}%` }} />
                        </span>
                      )}
                      <span>{r.medyan != null ? trNum.format(Math.round(r.medyan)) : '—'}</span>
                    </span>
                  </td>
                  <td className={styles.sayi}>{r.emsal}</td>
                  <td className={styles.sayi}><Guven emsal={r.emsal} /></td>
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
